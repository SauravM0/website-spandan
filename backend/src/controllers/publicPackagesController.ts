import { Request, Response } from 'express';
import {
  getPackagesPublic, getPackageBySlug, getPackageTests,
  getFeaturedPackagesPublic, getDoctorBriefById,
} from '../models';
import { isValidSlug } from '../utils/slug';
import { notFound } from '../utils/errors';

export async function featured(_req: Request, res: Response): Promise<void> {
  const packages = await getFeaturedPackagesPublic();
  res.json({ packages });
}

export async function listPackages(_req: Request, res: Response): Promise<void> {
  // Reads from packages_public view - no pricing data by construction
  const packages = await getPackagesPublic();
  res.json({ packages });
}

export async function getPackageDetail(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;

  // Validate slug pattern before querying
  if (!isValidSlug(slug)) {
    notFound(res, 'Package not found');
    return;
  }

  const pkg = await getPackageBySlug(slug);
  if (!pkg || !pkg.is_active) {
    notFound(res, 'Package not found');
    return;
  }

  const tests = await getPackageTests(pkg.id);

  // Return full detail with test list; pricing is NEVER in this response
  res.json({
    package: {
      id: pkg.id,
      slug: pkg.slug,
      name: pkg.name,
      short_description: pkg.short_description,
      description: pkg.description,
      prep_instructions: pkg.prep_instructions,
      image_url: pkg.image_url,
      category: pkg.category,
      tests: tests.map(t => t.test_name),
      primary_doctor: pkg.primary_doctor_id ? await getDoctorBriefById(pkg.primary_doctor_id) : null,
    },
  });
}
