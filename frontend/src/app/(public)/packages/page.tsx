import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { CalendarCheck, Clock, MessageCircle, Phone } from 'lucide-react';
import PackageCatalog from '@/components/packages/PackageCatalog';
import { formatPackageMoney, type PublicPackageSummary } from '@/components/packages/PackageCard';
import { PACKAGE_CACHE } from '@/lib/cache';
import { fallbackPackageSummaries } from '@/lib/packageCatalog';
import { clinicSettings, whatsappLink } from '@/lib/settings';
import { serverApiGet } from '@/lib/serverApi';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: `Health Packages | ${clinicSettings.name}`,
  description:
    'Diabetic, cardiac, combined, and full-body health checkup packages at Spandan Super Speciality Clinic, with every included test listed.',
  alternates: { canonical: '/packages' },
  openGraph: {
    title: `Health Packages at ${clinicSettings.name}`,
    description: 'Compare clinic-curated checkup packages and what each one includes.',
  },
};

async function getPackages() {
  return serverApiGet<{ packages: PublicPackageSummary[] }>(
    '/packages',
    { packages: [] },
    PACKAGE_CACHE
  );
}

function packagesJsonLd(packages: PublicPackageSummary[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Health packages at ${clinicSettings.name}`,
    itemListElement: packages.map((pkg, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: pkg.name,
      url: `/packages/${pkg.slug}`,
    })),
  };
}

export default async function PackagesPage() {
  const { packages } = await getPackages();
  // The curated catalogue keeps the packages on the page when the API or the
  // database is unreachable; live data always wins when it arrives.
  const list = packages?.length ? packages : fallbackPackageSummaries();

  const lowestPrice = list
    .map((pkg) => Number(pkg.current_price ?? pkg.base_price ?? 0))
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b)[0];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(packagesJsonLd(list)) }}
      />

      <section className="soft-page-hero">
        <div className="container py-14 md:py-20">
          <div className="measure">
            <p className="eyebrow">Health packages</p>
            <h1 className="heading-display mt-3 text-ink">
              Checkup packages built around what you need tested
            </h1>
            <p className="lede mt-4">
              Diabetes, cardiac, combined, and full-body screening packages, each listing every
              test it includes. Ask the clinic if you are not sure which one fits.
            </p>
          </div>

          <dl className="mt-10 grid gap-x-8 gap-y-4 border-t border-border pt-6 text-sm sm:grid-cols-3">
            <div>
              <dt className="eyebrow">Published packages</dt>
              <dd className="mt-1 font-semibold text-ink">
                {list.length || 'Call for current list'}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Starting price</dt>
              <dd className="mt-1 font-semibold text-ink">
                {lowestPrice ? formatPackageMoney(lowestPrice) : 'Price on request'}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Sample collection</dt>
              <dd className="mt-1 font-semibold text-ink">{clinicSettings.timings}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="section bg-white" aria-labelledby="package-catalog-title">
        <div className="container">
          <h2 id="package-catalog-title" className="sr-only">
            Published health packages
          </h2>
          <Suspense
            fallback={<p className="text-text-light">Loading the current package list…</p>}
          >
            <PackageCatalog packages={list} />
          </Suspense>
        </div>
      </section>

      <section className="section section-alt" aria-labelledby="package-visit-title">
        <div className="container">
          <div className="measure">
            <p className="eyebrow">Before you book</p>
            <h2 id="package-visit-title" className="heading-section mt-3 text-ink">
              What to confirm before you travel
            </h2>
          </div>

          <div className="stagger grid-3 mt-8">
            <article className="card p-6">
              <Clock className="mb-4 text-accent" size={24} aria-hidden="true" />
              <h3 className="heading-card text-ink">Timings</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">{clinicSettings.timings}</p>
              <p className="mt-1 text-sm leading-relaxed text-text-light">
                {clinicSettings.consultingHours}. {clinicSettings.closedDay}.
              </p>
            </article>
            <article className="card p-6">
              <CalendarCheck className="mb-4 text-accent" size={24} aria-hidden="true" />
              <h3 className="heading-card text-ink">Appointments</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                {clinicSettings.appointmentNote}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                {clinicSettings.holidayNote}
              </p>
            </article>
            <article className="card p-6">
              <Phone className="mb-4 text-accent" size={24} aria-hidden="true" />
              <h3 className="heading-card text-ink">Ask the clinic</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                Fasting, sample timing, and report turnaround vary by package. Confirm them before
                you come.
              </p>
              <div className="mt-5 flex flex-col gap-2 min-[420px]:flex-row">
                <Button href={`tel:${clinicSettings.phone}`} variant="accent" size="sm">
                  <Phone size={16} aria-hidden="true" />
                  Call
                </Button>
                <Button
                  href={whatsappLink('Hello, I would like to know more about your health packages.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  size="sm"
                >
                  <MessageCircle size={16} aria-hidden="true" />
                  WhatsApp
                </Button>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
