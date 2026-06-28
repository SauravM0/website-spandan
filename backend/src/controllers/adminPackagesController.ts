import { Response } from 'express';
import {
  getPackages, getPackageById, getPackageTests,
  updatePackageAdmin,
} from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { notFound, serverError } from '../utils/errors';

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
    const pkg = await updatePackageAdmin(req.params.id, req.body);
    if (!pkg) {
      notFound(res, 'Package not found');
      return;
    }
    const tests = await getPackageTests(pkg.id);
    res.json({ package: { ...pkg, tests } });
  } catch (err) {
    console.error('Failed to update package:', err);
    serverError(res);
  }
}
