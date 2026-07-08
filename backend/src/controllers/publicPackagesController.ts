import { Request, Response } from 'express';
import {
  getPublicPackageSummaries, getPackageBySlug, getPackageTests,
  getDoctorBriefById,
} from '../models';
import { isValidSlug } from '../utils/slug';
import { notFound } from '../utils/errors';

export async function featured(_req: Request, res: Response): Promise<void> {
  const packages = await getPublicPackageSummaries({ featuredOnly: true, limit: 6 });
  res.json({ packages });
}

export async function listPackages(_req: Request, res: Response): Promise<void> {
  // Server-side catalog rules keep public pricing and checkout availability aligned.
  const packages = await getPublicPackageSummaries();
  res.json({ packages });
}

export async function getPackageDetail(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;

  // Validate slug pattern before querying
  if (!isValidSlug(slug)) {
    notFound(res, 'Package not found');
    return;
  }

  const summaries = await getPublicPackageSummaries();
  const summary = summaries.find((item) => item.slug === slug);
  if (!summary) {
    notFound(res, 'Package not found');
    return;
  }

  const pkg = await getPackageBySlug(slug);
  if (!pkg || !pkg.is_active) {
    notFound(res, 'Package not found');
    return;
  }
  const tests = await getPackageTests(pkg.id);

  // Detail and checkout use the same current-price summary rules.
  res.json({
    package: {
      ...summary,
      short_description: pkg.short_description,
      description: pkg.description,
      prep_instructions: pkg.prep_instructions,
      image_url: pkg.image_url,
      gallery_urls: pkg.gallery_urls,
      exclusions: pkg.exclusions,
      report_turnaround: pkg.report_turnaround,
      medical_disclaimer: pkg.medical_disclaimer,
      terms_text: pkg.terms_text,
      no_refund_text: pkg.no_refund_text,
      tests,
      primary_doctor: pkg.primary_doctor_id ? await getDoctorBriefById(pkg.primary_doctor_id) : null,
    },
  });
}
