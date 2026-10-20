import { Request, Response } from 'express';
import type { Package, PackageTest } from '../domain/entities';
import {
  getPublicPackageBySlug,
  getPublicPackages,
  getTestsForPackage,
  getTestsForPackages,
} from '../repositories/packageRepository';
import { isValidSlug } from '../utils/slug';
import { notFound } from '../utils/errors';

/** Number of inclusions previewed on a package card before "+ N more". */
const KEY_INCLUSION_LIMIT = 3;

export type PublicPackageTest = {
  id: string;
  test_name: string;
  test_category: string | null;
  description: string | null;
  sort_order: number;
};

export type PublicPackageSummary = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  category: string;
  test_category: string | null;
  suitability: string | null;
  key_inclusions: string[];
  inclusion_count: number;
  base_price: number | null;
  current_price: number | null;
  original_price: number | null;
  discount_label: string | null;
  offer_valid_until: string | null;
  prep_instructions: string | null;
  fasting_required: boolean;
  fasting_duration: string | null;
  consultation_included: boolean;
  report_turnaround: string | null;
  bookable: boolean;
  published: boolean;
  reviewed_at: string | null;
  purchase_status: string;
  purchase_enabled: boolean;
};

export type PublicPackageDetail = PublicPackageSummary & {
  description: string | null;
  exclusions: string | null;
  medical_disclaimer: string | null;
  terms_text: string | null;
  tests: PublicPackageTest[];
};

/** Postgres returns NUMERIC as a string, so money needs an explicit cast. */
function toAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function publicPackageTest(test: PackageTest): PublicPackageTest {
  return {
    id: test.id,
    test_name: test.test_name,
    test_category: test.test_category ?? null,
    description: test.description ?? null,
    sort_order: test.sort_order ?? 0,
  };
}

/**
 * Maps a package row to the public shape the website renders.
 *
 * Pricing honours `show_price_publicly`: when the clinic has not cleared a
 * package for public pricing every amount is withheld and the site falls back
 * to "Price on request" rather than guessing. A discount is only presented as
 * one when the discounted price is genuinely lower than the base price.
 */
export function publicPackageSummary(pkg: Package, tests: PackageTest[]): PublicPackageSummary {
  const ordered = [...tests].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const basePrice = toAmount(pkg.base_price);
  const discountedPrice = toAmount(pkg.discounted_price);
  const hasDiscount =
    basePrice !== null && discountedPrice !== null && discountedPrice < basePrice;
  const showPrices = pkg.show_price_publicly === true;

  return {
    id: pkg.id,
    slug: pkg.slug,
    name: pkg.name,
    short_description: pkg.short_description ?? null,
    category: pkg.category,
    test_category: pkg.test_category ?? null,
    suitability: pkg.age_sex_applicability ?? null,
    key_inclusions: ordered.slice(0, KEY_INCLUSION_LIMIT).map((test) => test.test_name),
    inclusion_count: ordered.length,
    base_price: showPrices ? basePrice : null,
    current_price: showPrices ? (hasDiscount ? discountedPrice : basePrice) : null,
    original_price: showPrices && hasDiscount ? basePrice : null,
    discount_label: hasDiscount ? pkg.discount_label ?? null : null,
    offer_valid_until: toIsoDate(pkg.effective_until ?? pkg.effective_end ?? null),
    prep_instructions: pkg.prep_instructions ?? null,
    fasting_required: pkg.fasting_required === true,
    fasting_duration: pkg.fasting_duration ?? null,
    consultation_included: pkg.consultation_included === true,
    report_turnaround: pkg.report_turnaround ?? null,
    bookable: pkg.purchase_enabled !== false && pkg.purchase_status !== 'unavailable',
    published: true,
    reviewed_at: toIsoDate(pkg.updated_at),
    purchase_status: pkg.purchase_status ?? 'available',
    purchase_enabled: pkg.purchase_enabled !== false,
  };
}

export function publicPackageDetail(pkg: Package, tests: PackageTest[]): PublicPackageDetail {
  const ordered = [...tests].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return {
    ...publicPackageSummary(pkg, ordered),
    description: pkg.description ?? null,
    exclusions: pkg.exclusions ?? null,
    medical_disclaimer: pkg.medical_disclaimer ?? null,
    terms_text: pkg.terms_text ?? null,
    tests: ordered.map(publicPackageTest),
  };
}

export async function listPackages(_req: Request, res: Response): Promise<void> {
  const packages = await getPublicPackages();
  const testsByPackage = await getTestsForPackages(packages.map((pkg) => pkg.id));
  res.json({
    packages: packages.map((pkg) => publicPackageSummary(pkg, testsByPackage.get(pkg.id) || [])),
  });
}

export async function getPackageDetail(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  if (!isValidSlug(slug)) {
    notFound(res, 'Package not found');
    return;
  }

  const pkg = await getPublicPackageBySlug(slug);
  if (!pkg) {
    notFound(res, 'Package not found');
    return;
  }

  const tests = await getTestsForPackage(pkg.id);
  res.json({ package: publicPackageDetail(pkg, tests) });
}
