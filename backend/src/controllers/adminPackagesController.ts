import { Response } from 'express';
import {
  getPackages, getPackageById, getPackageTests,
  updatePackageAdmin,
} from '../models';
import { query } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { notFound, serverError } from '../utils/errors';

function numberFrom(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validatePackageCommerceInput(body: Record<string, unknown>, current?: Record<string, unknown> | null): string | null {
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
  try {
    const packages = await getPackages(false); // All packages including inactive
    const result = await Promise.all(packages.map(async (pkg) => {
      const tests = await getPackageTests(pkg.id);
      return { ...pkg, tests };
    }));
    res.json({ packages: result });
  } catch (err) {
    console.error('Failed to fetch packages:', err);
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
  try {
    const before = await getPackageById(req.params.id);
    if (!before) {
      notFound(res, 'Package not found');
      return;
    }
    const validationError = validatePackageCommerceInput(req.body, before as unknown as Record<string, unknown>);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }
    const pkg = await updatePackageAdmin(req.params.id, req.body);
    if (!pkg) {
      notFound(res, 'Package not found');
      return;
    }
    await query(
      `INSERT INTO audit_log (actor_staff_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'package.updated', 'package', $2, $3)`,
      [
        req.user?.id || null,
        pkg.id,
        JSON.stringify({
          before,
          after: pkg,
          changed_fields: Object.keys(req.body || {}),
        }),
      ]
    );
    const tests = await getPackageTests(pkg.id);
    res.json({ package: { ...pkg, tests } });
  } catch (err) {
    console.error('Failed to update package:', err);
    serverError(res);
  }
}
