import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { HelpCircle, ShieldCheck } from 'lucide-react';
import PackageCatalog from '@/components/packages/PackageCatalog';
import { formatPackageMoney, type PublicPackageSummary } from '@/components/packages/PackageCard';
import { serverApiGet } from '@/lib/serverApi';
import { clinicSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Health Checkup Packages | Spandan Super Speciality Clinic',
  description:
    'Compare five health checkup packages by offer price and included tests and services at Spandan Clinic.',
  alternates: {
    canonical: '/packages',
  },
  openGraph: {
    title: 'Health Packages at Spandan Super Speciality Clinic',
    description: 'Compare five clinic health packages with current offer prices and complete inclusion details.',
  },
};

async function getPackages() {
  return serverApiGet<{ packages: PublicPackageSummary[] }>(
    '/packages',
    { packages: [] },
    { cache: 'no-store' }
  );
}

function packageListJsonLd(packages: PublicPackageSummary[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Health checkup packages at ${clinicSettings.name}`,
    itemListElement: packages.map((pkg, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: pkg.name,
        description: pkg.short_description || pkg.suitability || 'Health checkup package',
        url: `/packages/${pkg.slug}`,
        category: pkg.test_category || pkg.category || 'Health package',
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: Number(pkg.current_price ?? pkg.base_price ?? 0),
          availability: pkg.bookable === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          seller: {
            '@type': 'MedicalClinic',
            name: clinicSettings.name,
          },
        },
      },
    })),
  };
}

export default async function PackagesPage() {
  const data = await getPackages();
  const packages = data.packages || [];
  const lowestPrice = packages
    .map((pkg) => Number(pkg.current_price ?? pkg.base_price ?? 0))
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b)[0];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(packageListJsonLd(packages)) }}
      />
      <section className="soft-page-hero">
        <div className="container py-14 md:py-16">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase text-pink-700">
              Diagnostic packages
            </p>
            <h1 className="heading-display">Health Packages</h1>
            <p className="mt-4 text-base leading-relaxed text-text-light md:text-lg">
              Compare current offer prices and package highlights. Open any package to review every
              included test and service, then continue scrolling to compare all five packages.
            </p>
            <div className="mt-7 grid gap-3 text-sm sm:grid-cols-3">
              <p className="soft-card p-3">
                <span className="block font-semibold text-navy">Published packages</span>
                {packages.length || 'Currently unavailable'}
              </p>
              <p className="soft-card p-3">
                <span className="block font-semibold text-navy">Starting price</span>
                {lowestPrice ? formatPackageMoney(lowestPrice) : 'Shown when published'}
              </p>
              <p className="soft-card p-3">
                <span className="block font-semibold text-navy">Booking</span>
                Active packages only
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-bg-alt">
        <div className="container">
          <Suspense fallback={<div className="soft-card min-h-[280px]" />}>
            <PackageCatalog packages={packages} />
          </Suspense>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="soft-card p-6">
              <div className="flex items-start gap-3">
                <HelpCircle className="mt-1 shrink-0 text-accent" size={22} aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-bold text-navy">Need help choosing?</h2>
                  <p className="mt-2 text-text-light">
                    Share your reason for testing, age group, medicines, and any doctor advice. The
                    clinic team can guide you toward a suitable package or suggest an appointment first.
                  </p>
                  <div className="mt-5 flex flex-col gap-2 min-[420px]:flex-row">
                    <Link href="/contact" className="btn btn-accent">
                      Contact Clinic
                    </Link>
                    <Link href="/book-appointment" className="btn btn-outline">
                      Book Appointment
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="soft-card p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 shrink-0 text-accent" size={22} aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-bold text-navy">Policies and limits</h2>
                  <p className="mt-2 text-text-light">
                    Package prices may exclude external charges unless listed. Preparation, refund, and
                    rescheduling policies are confirmed before payment.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link href="/terms" className="btn btn-outline btn-sm">
                      Terms
                    </Link>
                    <Link href="/privacy" className="btn btn-outline btn-sm">
                      Privacy
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
