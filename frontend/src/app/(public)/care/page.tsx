import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { CalendarCheck, Clock, HelpCircle, Info, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { fallbackPackageSummaries } from '@/lib/packageCatalog';
import { clinicSettings } from '@/lib/settings';
import { facilityReview, publishedFacilities, type FacilityCategory } from '@/lib/facilities';
import { serverApiGet } from '@/lib/serverApi';
import PackageCatalog from '@/components/packages/PackageCatalog';
import { formatPackageMoney, type PublicPackageSummary } from '@/components/packages/PackageCard';
import FacilityFilter from '@/components/facilities/FacilityFilter';
import FacilityGrid from '@/components/facilities/FacilityGrid';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: `Care & Facilities | ${clinicSettings.name}`,
  description:
    'Health checkup packages, diagnostic equipment, preparation guidance, and visit information at Spandan Super Speciality Clinic.',
  openGraph: {
    title: `Care & Facilities at ${clinicSettings.name}`,
    description: 'Packages, diagnostics, preparation, and visit guidance in one place.',
  },
};

const categoryOrder: FacilityCategory[] = [
  'Environment',
  'Laboratory diagnostics',
  'Cardiac diagnostics',
  'Diabetes and endocrine diagnostics',
  'Sleep and therapy support',
];

const galleryItems = [
  { src: '/Services/ecg-machine.png', label: 'Cardiac diagnostics', alt: 'ECG machine in the clinic' },
  { src: '/Services/cgms.png', label: 'Diabetes technology', alt: 'Continuous glucose monitoring equipment' },
  { src: '/equipment/roche-cobas-e-411.png', label: 'Laboratory analysis', alt: 'Roche Cobas e411 laboratory analyser' },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function getPackages() {
  return serverApiGet<{ packages: PublicPackageSummary[] }>(
    '/packages',
    { packages: [] },
    { cache: 'no-store' }
  );
}

function careJsonLd(packages: PublicPackageSummary[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    name: clinicSettings.name,
    telephone: clinicSettings.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: clinicSettings.address,
      addressLocality: clinicSettings.city,
      addressRegion: clinicSettings.state,
      postalCode: clinicSettings.pincode,
      addressCountry: 'IN',
    },
    // The per-facility detail now lives behind a dialog rather than in the
    // initial markup, so the same text is published here as structured data and
    // stays available to crawlers and assistive tooling.
    availableService: publishedFacilities().map((facility) => ({
      '@type': 'MedicalProcedure',
      name: facility.name,
      category: facility.category,
      description: facility.publicDescription,
      howPerformed: facility.process,
      preparation: facility.preparation,
    })),
    makesOffer: packages.map((pkg) => ({
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: Number(pkg.current_price ?? pkg.base_price ?? 0),
      itemOffered: { '@type': 'Product', name: pkg.name, url: `/packages/${pkg.slug}` },
    })),
  };
}

export default async function CarePage() {
  const packageData = await getPackages();
  const packages = packageData.packages?.length
    ? packageData.packages
    : fallbackPackageSummaries();
  const records = publishedFacilities();

  const lowestPrice = packages
    .map((pkg) => Number(pkg.current_price ?? pkg.base_price ?? 0))
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b)[0];

  // Only offer a filter chip for a category that actually has facilities.
  const activeCategories = categoryOrder.filter((category) =>
    records.some((facility) => facility.category === category)
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(careJsonLd(packages)) }}
      />

      <section className="soft-page-hero">
        <div className="container py-14 md:py-20">
          <div className="measure">
            <p className="eyebrow">Care and facilities</p>
            <h1 className="heading-display mt-3 text-ink">
              Everything the clinic can test, treat and check
            </h1>
            <p className="lede mt-4">
              Health checkup packages, the diagnostic equipment behind them, how to prepare, and
              what to confirm before you travel, all on one page.
            </p>
          </div>

          <dl className="mt-10 grid gap-x-8 gap-y-4 border-t border-border pt-6 text-sm sm:grid-cols-3">
            <div>
              <dt className="eyebrow">Published packages</dt>
              <dd className="mt-1 font-semibold text-ink">
                {packages.length || 'Call for current list'}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Starting price</dt>
              <dd className="mt-1 font-semibold text-ink">
                {lowestPrice ? formatPackageMoney(lowestPrice) : 'Confirmed by the clinic'}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Diagnostic records</dt>
              <dd className="mt-1 font-semibold text-ink">
                {records.length} verified {formatDate(facilityReview.reviewedAt)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="section section-paper" aria-labelledby="packages-title">
        <div className="container">
          <div className="reveal measure mb-10">
            <p className="eyebrow">Health packages</p>
            <h2 id="packages-title" className="heading-section mt-3 text-ink">
              Checkup packages and what they include
            </h2>
            <p className="lede mt-4">
              Open any package for the full test list, preparation, and current price.
            </p>
          </div>
          <Suspense fallback={<div className="card min-h-[280px]" />}>
            <PackageCatalog packages={packages} />
          </Suspense>
        </div>
      </section>

      <section className="section" aria-labelledby="inside-title">
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="reveal measure">
              <p className="eyebrow">Inside the clinic</p>
              <h2 id="inside-title" className="heading-section mt-3 text-ink">
                The equipment behind your results
              </h2>
              <p className="lede mt-4">
                Photographed in the clinic. Each machine has a full record below, with what it
                measures and how to prepare.
              </p>
              <p className="mt-4 text-sm font-semibold text-text-light">
                Content owner: {facilityReview.owner}. Reviewed {formatDate(facilityReview.reviewedAt)}.
              </p>
            </div>
            <div className="stagger grid gap-4 sm:grid-cols-3">
              {galleryItems.map((item) => (
                <figure key={item.src} className="card overflow-hidden">
                  <div className="relative aspect-[4/3] bg-wash-sage">
                    <Image
                      src={item.src}
                      alt={item.alt}
                      fill
                      sizes="(min-width: 640px) 22vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="p-4 text-sm font-semibold text-ink">{item.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt" aria-labelledby="diagnostics-title">
        <div className="container">
          <div className="measure mb-10">
            <p className="eyebrow">Diagnostics</p>
            <h2 id="diagnostics-title" className="heading-section mt-3 text-ink">
              Everything in the clinic, at a glance
            </h2>
            <p className="lede mt-4">
              Best-in-class machines for blood tests, cardiac and endocrine diagnostics, run in
              clinic so reports can be discussed during the same consultation. Filter by category,
              and tap any facility for its purpose, process, preparation, and what to confirm
              before you travel.
            </p>
          </div>

          {/*
            One flat grid rather than a stack of per-category sections: the
            filter chips above already narrow by category, and each tile carries
            its own category label, so the headings only added height to a page
            whose whole point was to stop being a long scroll.
          */}
          <FacilityFilter categories={activeCategories} />

          <FacilityGrid facilities={records} />
        </div>
      </section>

      <section className="section" aria-labelledby="visit-title">
        <div className="container">
          <div className="measure mb-10">
            <p className="eyebrow">Before you travel</p>
            <h2 id="visit-title" className="heading-section mt-3 text-ink">
              Visit information
            </h2>
            <p className="lede mt-4">
              Confirm test suitability and device availability before making the trip.
            </p>
          </div>

          <div className="stagger grid-3">
            <article className="card p-6">
              <Clock className="mb-4 text-accent" size={24} aria-hidden="true" />
              <h3 className="heading-card text-ink">Timings</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">{clinicSettings.timings}</p>
              <p className="mt-1 text-sm leading-relaxed text-text-light">
                {clinicSettings.consultingHours}. {clinicSettings.closedDay}.
              </p>
            </article>
            <article className="card p-6">
              <MapPin className="mb-4 text-accent" size={24} aria-hidden="true" />
              <h3 className="heading-card text-ink">Location</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                {clinicSettings.address}, {clinicSettings.city}, {clinicSettings.state}{' '}
                {clinicSettings.pincode}
              </p>
            </article>
            <article className="card p-6">
              <CalendarCheck className="mb-4 text-accent" size={24} aria-hidden="true" />
              <h3 className="heading-card text-ink">Before you come</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                {clinicSettings.appointmentNote}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                {clinicSettings.holidayNote}
              </p>
            </article>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="card p-6">
              <div className="flex items-start gap-3">
                <HelpCircle className="mt-1 shrink-0 text-accent" size={22} aria-hidden="true" />
                <div>
                  <h3 className="heading-card text-ink">Not sure which package?</h3>
                  <p className="mt-2 text-text-light">
                    Tell the clinic your reason for testing, age group, and any medicines or doctor
                    advice. The team will point you to a suitable package, or to a consultation first.
                  </p>
                  <div className="mt-5 flex flex-col gap-2 min-[420px]:flex-row">
                    <Button href={`tel:${clinicSettings.phone}`} variant="accent">
                      <Phone size={18} aria-hidden="true" />
                      Call {clinicSettings.phone}
                    </Button>
                    <Button href="/contact" variant="outline">
                      Contact options
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 shrink-0 text-accent" size={22} aria-hidden="true" />
                <div>
                  <h3 className="heading-card text-ink">Policies and limits</h3>
                  <p className="mt-2 text-text-light">
                    Package prices may exclude external charges unless listed. Preparation and
                    rescheduling are confirmed by the clinic.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button href="/legal" variant="outline" size="sm">
                      Terms and privacy
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card mt-8 p-5">
            <p className="flex items-start gap-3 text-sm leading-relaxed text-text-light">
              <Info className="mt-0.5 shrink-0 text-accent" size={20} aria-hidden="true" />
              Facility information helps you plan a visit. It does not replace doctor advice, and
              diagnostic suitability depends on symptoms, history, medicines, and clinical review.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
