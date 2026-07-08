import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  Clock,
  FileText,
  HeartPulse,
  HelpCircle,
  IndianRupee,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import EnquiryForm from '@/components/forms/EnquiryForm';
import TestListCard, { type PackageTestItem } from '@/components/packages/TestListCard';
import PrepInstructions from '@/components/packages/PrepInstructions';
import {
  formatPackageMoney,
  packageCategoryLabel,
  packageSuitability,
  type PublicPackageSummary,
} from '@/components/packages/PackageCard';
import { clinicSettings } from '@/lib/settings';
import { serverApiGet } from '@/lib/serverApi';

type PackageDoctor = {
  id: string;
  name: string;
  speciality: string;
  slug: string;
};

type PublicPackageDetail = PublicPackageSummary & {
  description?: string | null;
  image_url?: string | null;
  gallery_urls?: string[] | null;
  tests?: PackageTestItem[] | null;
  exclusions?: string | null;
  medical_disclaimer?: string | null;
  terms_text?: string | null;
  no_refund_text?: string | null;
  primary_doctor?: PackageDoctor | null;
};

async function getPackage(slug: string) {
  return serverApiGet<{ package: PublicPackageDetail | null }>(
    `/packages/${slug}`,
    { package: null },
    { next: { revalidate: 3600, tags: ['public-packages'] } }
  );
}

export async function generateStaticParams() {
  const data = await serverApiGet<{ packages: { slug: string }[] }>(
    '/packages',
    { packages: [] },
    { next: { revalidate: 3600, tags: ['public-packages'] } }
  );
  return (data.packages || []).map((pkg) => ({ slug: pkg.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getPackage(params.slug);
  const pkg = data.package;
  if (!pkg) return { title: 'Package Not Found | Spandan Clinic' };

  return {
    title: `${pkg.name} | Health Package | Spandan Super Speciality Clinic`,
    description: pkg.short_description || `Review current price, inclusions, preparation, and booking details for ${pkg.name}.`,
    alternates: {
      canonical: `/packages/${pkg.slug}`,
    },
    openGraph: {
      title: `${pkg.name} | Spandan Clinic`,
      description: pkg.short_description || undefined,
      images: pkg.image_url ? [{ url: pkg.image_url, alt: pkg.name }] : [{ url: '/logo.png', alt: clinicSettings.name }],
    },
  };
}

function formatOfferDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatReviewDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function packageJsonLd(pkg: PublicPackageDetail) {
  const price = Number(pkg.current_price ?? pkg.base_price ?? 0);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: pkg.name,
    description: pkg.short_description || packageSuitability(pkg),
    category: packageCategoryLabel(pkg),
    image: pkg.image_url || '/logo.png',
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price,
      availability: pkg.bookable === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: `/book-package?package=${pkg.id}`,
      seller: {
        '@type': 'MedicalClinic',
        name: clinicSettings.name,
      },
    },
  };
}

function PricePanel({ pkg }: { pkg: PublicPackageDetail }) {
  const currentPrice = pkg.current_price ?? pkg.base_price;
  const hasOffer = Number(pkg.original_price || 0) > Number(currentPrice || 0);
  const offerDate = formatOfferDate(pkg.offer_valid_until);
  const reviewedDate = formatReviewDate(pkg.reviewed_at);
  const bookable = pkg.bookable !== false;

  return (
    <aside className="soft-card p-5 lg:sticky lg:top-28">
      <p className="flex items-center gap-1 text-xs font-bold uppercase text-text-light">
        <IndianRupee size={14} aria-hidden="true" />
        Current package price
      </p>
      <p className="mt-2 text-3xl font-bold text-navy">{formatPackageMoney(currentPrice)}</p>
      {hasOffer && (
        <div className="mt-2 text-sm">
          <p className="text-text-light line-through">{formatPackageMoney(pkg.original_price)}</p>
          <p className="font-semibold text-amber-900">{pkg.discount_label || 'Offer price'}</p>
          {offerDate && <p className="text-xs text-amber-900">Valid until {offerDate}</p>}
        </div>
      )}
      {reviewedDate && <p className="mt-3 text-xs text-text-light">Price reviewed {reviewedDate}</p>}

      {bookable ? (
        <Link href={`/book-package?package=${pkg.id}`} className="btn btn-accent mt-5 w-full">
          <CalendarCheck size={18} aria-hidden="true" />
          Book Package
        </Link>
      ) : (
        <span className="btn mt-5 w-full cursor-not-allowed bg-blue-50 text-text-light shadow-none">
          Currently unavailable
        </span>
      )}

      <Link href="#package-enquiry" className="btn btn-outline mt-3 w-full">
        Ask Before Booking
      </Link>

      <div className="mt-5 rounded-2xl bg-blue-50/70 p-3 text-sm text-text-light">
        Checkout refetches current package price, tax, fees, and availability before payment.
      </div>
    </aside>
  );
}

export default async function PackageDetail({ params }: { params: { slug: string } }) {
  const data = await getPackage(params.slug);
  const pkg = data.package;

  if (!pkg) notFound();

  const tests = pkg.tests || [];
  const category = packageCategoryLabel(pkg);
  const reviewedDate = formatReviewDate(pkg.reviewed_at);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(packageJsonLd(pkg)) }}
      />

      <section className="soft-page-hero py-14">
        <div className="container">
          <Link href="/packages" className="inline-flex items-center gap-2 text-sm text-accent transition hover:text-primary">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to packages
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
            <div>
              <p className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold capitalize text-pink-700 shadow-[0_8px_20px_rgba(236,72,153,0.12)]">
                {category}
              </p>
              <h1 className="text-3xl font-bold sm:text-4xl">{pkg.name}</h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-text-light sm:text-lg">
                {pkg.short_description || packageSuitability(pkg)}
              </p>
              {reviewedDate && <p className="mt-4 text-sm text-text-light">Package reviewed {reviewedDate}</p>}
            </div>
            <div className="soft-card p-5 text-navy">
              <p className="text-sm font-bold uppercase text-text-light">Current price</p>
              <p className="mt-2 text-3xl font-bold">{formatPackageMoney(pkg.current_price ?? pkg.base_price)}</p>
              <Link href={`/book-package?package=${pkg.id}`} className="btn btn-accent mt-5 w-full">
                <CalendarCheck size={18} aria-hidden="true" />
                Book Package
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
          <div className="grid gap-8">
            <section className="soft-card p-6">
              <div className="mb-4 flex items-start gap-3">
                <HeartPulse className="mt-1 shrink-0 text-accent" size={24} aria-hidden="true" />
                <div>
                  <h2 className="text-2xl font-bold text-navy">Suitability and limits</h2>
                  <p className="mt-2 text-sm leading-relaxed text-text-light">{packageSuitability(pkg)}</p>
                </div>
              </div>
              {pkg.description && <p className="mt-4 text-sm leading-relaxed text-text-light">{pkg.description}</p>}
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-blue-50/70 p-4">
                  <h3 className="text-sm font-bold uppercase text-text-light">Exclusions</h3>
                  <p className="mt-2 text-sm text-navy">{pkg.exclusions || 'No additional exclusions are published for this package.'}</p>
                </div>
                <div className="rounded-2xl bg-blue-50/70 p-4">
                  <h3 className="text-sm font-bold uppercase text-text-light">Clinical note</h3>
                  <p className="mt-2 text-sm text-navy">
                    {pkg.medical_disclaimer || 'This package supports screening or follow-up planning and does not guarantee diagnosis or treatment outcome.'}
                  </p>
                </div>
              </div>
            </section>

            <TestListCard tests={tests} />

            <PrepInstructions
              instructions={pkg.prep_instructions}
              fastingRequired={pkg.fasting_required}
              fastingDuration={pkg.fasting_duration}
            />

            <section className="grid gap-4 md:grid-cols-3">
              <article className="soft-card p-5">
                <Clock className="mb-4 text-accent" size={22} aria-hidden="true" />
                <h2 className="text-lg font-bold text-navy">Visit process</h2>
                <p className="mt-2 text-sm leading-relaxed text-text-light">
                  Select a package, assign patient details, choose a preferred date if requested, then review price and terms before payment.
                </p>
              </article>
              <article className="soft-card p-5">
                <FileText className="mb-4 text-accent" size={22} aria-hidden="true" />
                <h2 className="text-lg font-bold text-navy">Reports</h2>
                <p className="mt-2 text-sm leading-relaxed text-text-light">
                  {pkg.report_turnaround || 'Report timing is confirmed by the clinic based on package tests and lab workflow.'}
                </p>
              </article>
              <article className="soft-card p-5">
                <Stethoscope className="mb-4 text-accent" size={22} aria-hidden="true" />
                <h2 className="text-lg font-bold text-navy">Follow-up</h2>
                <p className="mt-2 text-sm leading-relaxed text-text-light">
                  {pkg.consultation_included ? 'Doctor consultation is listed as included for this package.' : 'Consultation, if needed, is booked separately unless listed by the clinic.'}
                </p>
              </article>
            </section>

            <section className="soft-card p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 shrink-0 text-accent" size={24} aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-bold text-navy">Policy summary</h2>
                  <p className="mt-2 text-sm leading-relaxed text-text-light">
                    {pkg.terms_text || 'Package booking, payment, date changes, and refunds follow clinic policy shown before payment.'}
                  </p>
                  {pkg.no_refund_text && <p className="mt-2 text-sm leading-relaxed text-text-light">{pkg.no_refund_text}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href="/terms" className="btn btn-outline btn-sm">Terms</Link>
                    <Link href="/privacy" className="btn btn-outline btn-sm">Privacy</Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="soft-card p-6">
              <div className="flex items-start gap-3">
                <BookOpen className="mt-1 shrink-0 text-accent" size={24} aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-bold text-navy">Related doctor or resource</h2>
                  {pkg.primary_doctor ? (
                    <p className="mt-2 text-sm leading-relaxed text-text-light">
                      Related specialist: <Link href={`/doctors/${pkg.primary_doctor.slug}`} className="font-semibold text-accent hover:underline">{pkg.primary_doctor.name}</Link>, {pkg.primary_doctor.speciality}.
                    </p>
                  ) : (
                    <p className="mt-2 text-sm leading-relaxed text-text-light">
                      Ask the clinic whether a doctor consultation is recommended before or after this package.
                    </p>
                  )}
                  <Link href="/health-resources" className="btn btn-outline mt-4">Browse Health Resources</Link>
                </div>
              </div>
            </section>

            <section id="package-enquiry" className="soft-card scroll-mt-24 p-4 sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <HelpCircle className="mt-1 shrink-0 text-accent" size={24} aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-bold text-navy">Need help before booking?</h2>
                  <p className="mt-2 text-sm leading-relaxed text-text-light">
                    Use enquiry for guidance. Use booking when you are ready to select patients, review terms, and pay.
                  </p>
                </div>
              </div>
              <EnquiryForm packageId={pkg.id} packageName={pkg.name} enquiryType="package" />
            </section>
          </div>

          <PricePanel pkg={pkg} />
        </div>
      </section>
    </>
  );
}
