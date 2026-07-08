import { Response } from 'express';
import {
  getPackagesAdminFiltered,
  getPackageById,
  getPackageTests,
  updatePackageAdminWithVersion,
} from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { badRequest, notFound, serverError, sendApiError } from '../utils/errors';

function numberFrom(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validatePackageInput(body: Record<string, unknown>, current?: Record<string, unknown> | null): string | null {
  const basePrice = numberFrom(body.base_price ?? current?.base_price);
  const discountedPrice = numberFrom(body.discounted_price ?? current?.discounted_price);
  const taxRate = numberFrom(body.tax_rate ?? current?.tax_rate);
  const convenienceFee = numberFrom(body.convenience_fee ?? current?.convenience_fee);
  const maxBookings = numberFrom(body.max_bookings_per_day ?? current?.max_bookings_per_day);

  if (basePrice !== null && basePrice < 0) return 'Base price cannot be negative';
  if (discountedPrice !== null && discountedPrice < 0) return 'Discounted price cannot be negative';
  if (basePrice !== null && discountedPrice !== null && discountedPrice > basePrice) {
    return 'Discounted price cannot exceed base price';
  }
  if (taxRate !== null && (taxRate < 0 || taxRate > 100)) {
    return 'Tax percentage must be between 0 and 100';
  }
  if (convenienceFee !== null && convenienceFee < 0) return 'Convenience fee cannot be negative';
  if (maxBookings !== null && maxBookings <= 0) return 'Maximum bookings per day must be greater than zero';
  if (
    (body.effective_start ?? current?.effective_start)
    && (body.effective_end ?? current?.effective_end)
    && String(body.effective_end ?? current?.effective_end) < String(body.effective_start ?? current?.effective_start)
  ) {
    return 'Effective end date cannot be before start date';
  }
  return null;
}

export async function listPackages(req: AuthenticatedRequest, res: Response): Promise<void> {
  const search = req.query.search as string | undefined;
  const category = req.query.category as string | undefined;
  const status = req.query.status as string | undefined;
  const sort = (req.query.sort as string) || 'order';
  let page = parseInt(req.query.page as string, 10) || 1;
  let pageSize = parseInt((req.query.pageSize || req.query.page_size) as string, 10) || 25;

  if (pageSize > 100) pageSize = 100;
  if (page < 1) page = 1;
  if (pageSize < 1) pageSize = 25;

  const validSorts = ['order', 'name_asc', 'name_desc', 'updated_desc', 'updated_asc', 'price_asc', 'price_desc'];
  if (sort && !validSorts.includes(sort)) {
    badRequest(res, `Invalid sort. Must be one of: ${validSorts.join(', ')}`);
    return;
  }

  try {
    const result = await getPackagesAdminFiltered({
      search,
      category,
      status,
      sort,
      page,
      pageSize,
    });
    res.json(result);
  } catch (err) {
    console.error('Failed to list packages:', err);
    serverError(res);
  }
}

export async function getPackageDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const pkg = await getPackageById(req.params.id);
    if (!pkg) {
      notFound(res, 'Package not found');
      return;
    }
    const tests = await getPackageTests(pkg.id);
    res.json({ package: { ...pkg, tests } });
  } catch (err) {
    console.error('Failed to fetch package:', err);
    serverError(res);
  }
}

export async function updatePackage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { expected_version, ...body } = req.body;

  if (!expected_version || typeof expected_version !== 'number') {
    badRequest(res, 'expected_version is required');
    return;
  }

  try {
    const before = await getPackageById(req.params.id);
    if (!before) {
      notFound(res, 'Package not found');
      return;
    }

    const validationError = validatePackageInput(body, before as unknown as Record<string, unknown>);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const result = await updatePackageAdminWithVersion(
      req.params.id,
      body,
      expected_version,
      req.user?.id
    );

    if (!result.pkg) {
      if (result.tests === undefined) {
        sendApiError(res, 409, 'CONFLICT', 'This package was modified by another user. Please refresh and try again.');
        return;
      }
      notFound(res, 'Package not found');
      return;
    }

    res.json({
      package: { ...result.pkg, tests: result.tests || [] },
    });
  } catch (err) {
    console.error('Failed to update package:', err);
    serverError(res);
  }
}
