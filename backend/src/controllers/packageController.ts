import { Request, Response } from 'express';
import {
  getPackages, getPackagesPublic, getPackageBySlug, getPackageById,
  getFeaturedPackages, createPackage, updatePackage, deletePackage,
  getPackageTests,
} from '../models';
import { AuthenticatedRequest } from '../middleware/auth';

export async function list(req: Request, res: Response): Promise<void> {
  const activeOnly = req.query.all !== 'true';
  const packages = activeOnly ? await getPackagesPublic() : await getPackages(false);
  res.json({ packages });
}

export async function getBySlug(req: Request, res: Response): Promise<void> {
  const pkg = await getPackageBySlug(req.params.slug);
  if (!pkg) {
    res.status(404).json({ error: 'Package not found' });
    return;
  }

  const showPrice = pkg.show_price_publicly;
  const tests = await getPackageTests(pkg.id);

  res.json({
    package: {
      ...pkg,
      base_price: showPrice ? pkg.base_price : undefined,
      discounted_price: showPrice ? pkg.discounted_price : undefined,
      show_price_publicly: undefined,
    },
    tests,
  });
}

export async function getById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const pkg = await getPackageById(req.params.id);
  if (!pkg) {
    res.status(404).json({ error: 'Package not found' });
    return;
  }
  const tests = await getPackageTests(pkg.id);
  res.json({ package: pkg, tests });
}

export async function featured(req: Request, res: Response): Promise<void> {
  const packages = await getFeaturedPackages();
  const result = await Promise.all(packages.map(async (pkg) => {
    const tests = await getPackageTests(pkg.id);
    return {
      ...pkg,
      base_price: pkg.show_price_publicly ? pkg.base_price : undefined,
      discounted_price: pkg.show_price_publicly ? pkg.discounted_price : undefined,
      tests,
    };
  }));
  res.json({ packages: result });
}

export async function create(req: AuthenticatedRequest, res: Response): Promise<void> {
  const pkg = await createPackage(req.body);
  res.status(201).json({ package: pkg });
}

export async function update(req: AuthenticatedRequest, res: Response): Promise<void> {
  const pkg = await updatePackage(req.params.id, req.body);
  if (!pkg) {
    res.status(404).json({ error: 'Package not found' });
    return;
  }
  res.json({ package: pkg });
}

export async function remove(req: AuthenticatedRequest, res: Response): Promise<void> {
  const deleted = await deletePackage(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Package not found' });
    return;
  }
  res.json({ message: 'Package deleted' });
}
