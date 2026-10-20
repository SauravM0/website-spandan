/**
 * The clinic's published health packages, mirrored from the database.
 *
 * Source of truth: backend/migrations/030_health_package_catalog.sql, which
 * seeds these five packages and their 69 tests. The public API serves the same
 * rows; this module exists so the catalogue still renders when the backend or
 * database is unreachable, exactly as `doctorProfiles.ts` keeps the specialists
 * on the page during an outage.
 *
 * Prices are the clinic's own and are published deliberately: every row in that
 * migration sets `show_price_publicly = true`. When the API answers, its data
 * wins; this is only the floor.
 */
import type { PublicPackageSummary } from '@/components/packages/PackageCard';
import type { PublicPackageDetail } from '@/components/packages/PackageDetailSection';
import type { PackageTestItem } from '@/components/packages/TestListCard';

type CatalogEntry = {
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  basePrice: number;
  currentPrice: number;
  discountLabel: string;
  tests: string[];
};

const catalog: CatalogEntry[] = [
  {
    slug: 'diabetic-package',
    name: 'Diabetic Package',
    category: 'diabetes',
    shortDescription:
      'Blood sugar control, kidney and eye screening, and specialist guidance for people living with diabetes.',
    basePrice: 4240,
    currentPrice: 3000,
    discountLabel: '29% OFF',
    tests: [
      'Body Composition Analysis',
      'Complete Blood Count',
      'HbA1c',
      'Lipid Profile',
      'Serum Creatinine',
      'Urine Microalbumin',
      'SGPT and SGOT',
      'TSH',
      'Total Calcium',
      'Retina/Fundus Examination',
      'Dietitian Guidance',
      'Diabetes Specialist Guidance',
    ],
  },
  {
    slug: 'cardiac-package',
    name: 'Cardiac Package',
    category: 'cardiac',
    shortDescription:
      'Core heart assessment with ECG, echocardiography, and a treadmill test, reviewed by the cardiologist.',
    basePrice: 5300,
    currentPrice: 2500,
    discountLabel: '53% OFF',
    tests: [
      'Complete Blood Count',
      'HbA1c',
      'Lipid Profile',
      'Serum Creatinine',
      'ECG',
      '2D Echocardiography',
      'TMT/Treadmill Test',
      'TSH',
      'Dietitian Guidance',
      'Cardiologist Guidance',
    ],
  },
  {
    slug: 'advanced-cardiac-package',
    name: 'Advanced Cardiac Package',
    category: 'cardiac',
    shortDescription:
      'Extended cardiac evaluation with added metabolic and liver investigations alongside specialist review.',
    basePrice: 5620,
    currentPrice: 3400,
    discountLabel: '40% OFF',
    tests: [
      'Body Composition Analysis',
      'Complete Blood Count',
      'HbA1c',
      'Lipid Profile',
      'Serum Creatinine',
      'SGPT and SGOT',
      'TSH',
      'Total Calcium',
      'ECG',
      '2D Echocardiography',
      'TMT/Treadmill Test',
      'Dietitian Guidance',
      'Diabetes Specialist Guidance',
      'Cardiologist Guidance',
    ],
  },
  {
    slug: 'diabetic-and-cardiac-package',
    name: 'Diabetic and Cardiac Package',
    category: 'combined',
    shortDescription:
      'Diabetes and heart screening together, with both specialists reviewing the same set of reports.',
    basePrice: 6540,
    currentPrice: 5200,
    discountLabel: '20% OFF',
    tests: [
      'Body Composition Analysis',
      'Complete Blood Count',
      'HbA1c',
      'Lipid Profile',
      'Serum Creatinine',
      'Urine Microalbumin',
      'SGPT and SGOT',
      'TSH',
      'Total Calcium',
      'Retina/Fundus Examination',
      'ECG',
      '2D Echocardiography',
      'TMT/Treadmill Test',
      'Dietitian Guidance',
      'Diabetes Specialist Guidance',
      'Cardiologist Guidance',
    ],
  },
  {
    slug: 'full-body-check-up-package',
    name: 'Full Body Check-up Package',
    category: 'preventive',
    shortDescription:
      'Whole-body preventive screening across heart, metabolism, thyroid, liver, vitamins, and abdominal imaging.',
    basePrice: 10000,
    currentPrice: 6000,
    discountLabel: '40% OFF',
    tests: [
      'Body Composition Analysis',
      'Complete Blood Count',
      'HbA1c',
      'Lipid Profile',
      'Serum Creatinine',
      'TSH and Free T4',
      'Liver Function Test',
      'Total Calcium',
      '25-OH Vitamin D3',
      'Vitamin B12',
      'ECG',
      '2D Echocardiography',
      'TMT/Treadmill Test',
      'Ultrasound of the Abdomen',
      'Dietitian Guidance',
      'Diabetes Specialist Guidance',
      'Cardiologist Guidance',
    ],
  },
];

/**
 * Tests that are a consultation rather than a laboratory investigation, grouped
 * separately so the detail page does not list a dietitian under "Blood tests".
 */
const GUIDANCE_SUFFIX = 'Guidance';

function testCategory(testName: string): string {
  if (testName.endsWith(GUIDANCE_SUFFIX)) return 'Specialist guidance';
  if (/ECG|Echocardiography|TMT|Treadmill/i.test(testName)) return 'Cardiac tests';
  if (/Ultrasound|Retina|Fundus|Body Composition/i.test(testName)) return 'Scans and measurements';
  return 'Laboratory tests';
}

function catalogTests(entry: CatalogEntry): PackageTestItem[] {
  return entry.tests.map((testName, index) => ({
    id: `${entry.slug}-${index + 1}`,
    test_name: testName,
    test_category: testCategory(testName),
    description: null,
    sort_order: index + 1,
  }));
}

function catalogSummary(entry: CatalogEntry): PublicPackageSummary {
  return {
    id: entry.slug,
    slug: entry.slug,
    name: entry.name,
    short_description: entry.shortDescription,
    category: entry.category,
    test_category: entry.category,
    key_inclusions: entry.tests.slice(0, 3),
    inclusion_count: entry.tests.length,
    base_price: entry.basePrice,
    current_price: entry.currentPrice,
    original_price: entry.basePrice,
    discount_label: entry.discountLabel,
    bookable: true,
    published: true,
    purchase_status: 'available',
    purchase_enabled: true,
  };
}

export function fallbackPackageSummaries(): PublicPackageSummary[] {
  return catalog.map(catalogSummary);
}

export function fallbackPackageDetails(): PublicPackageDetail[] {
  return catalog.map((entry) => ({
    ...catalogSummary(entry),
    tests: catalogTests(entry),
  }));
}

export function fallbackPackageDetail(slug: string): PublicPackageDetail | null {
  const entry = catalog.find((item) => item.slug === slug);
  if (!entry) return null;
  return { ...catalogSummary(entry), tests: catalogTests(entry) };
}

/** Slugs the catalogue knows about, for static params and link checks. */
export const fallbackPackageSlugs = catalog.map((entry) => entry.slug);

/** Total distinct tests across the published packages. */
export const fallbackPackageTestCount = new Set(catalog.flatMap((entry) => entry.tests)).size;
