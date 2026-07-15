import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BadgePercent, CalendarCheck, HelpCircle } from 'lucide-react';
import PackageDetailSection, {
  orderPackagesSelectedFirst,
  packageInclusionCount,
  type PublicPackageDetail,
} from '@/components/packages/PackageDetailSection';
import {
  formatPackageMoney,
  packageCategoryLabel,
  type PublicPackageSummary,
} from '@/components/packages/PackageCard';
import { clinicSettings } from '@/lib/settings';
import { serverApiGet } from '@/lib/serverApi';

async function getPackage(slug: string) {
  return serverApiGet<{ package: PublicPackageDetail | null }>(
    `/packages/${slug}`,
    { package: null },
    { cache: 'no-store' }
  );
}

async function getPackageCatalog() {
  return serverApiGet<{ packages: PublicPackageSummary[] }>(
    '/packages',
    { packages: [] },
    { cache: 'no-store' }
  );
}

async function getAllPackageDetails() {
  const catalog = await getPackageCatalog();
  const results = await Promise.all(
    (catalog.packages || []).map((pkg) => getPackage(pkg.slug))
  );
  return results.map((result) => result.package).filter(Boolean) as PublicPackageDetail[];
}

export async function generateStaticParams() {
  const data = await getPackageCatalog();
  return (data.packages || []).map((pkg) => ({ slug: pkg.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPackage(slug);
  const pkg = data.package;
  if (!pkg) return { title: 'Package Not Found | Spandan Clinic' };

  return {
    title: `${pkg.name} | Health Package | Spandan Super Speciality Clinic`,
    description: `Review the current offer price and all ${packageInclusionCount(pkg)} inclusions in the ${pkg.name}.`,
    alternates: { canonical: `/packages/${pkg.slug}` },
    openGraph: {
      title: `${pkg.name} | Spandan Clinic`,
      description: `View package pricing and every included test and service.`,
    },
  };
}

function packageJsonLd(pkg: PublicPackageDetail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: pkg.name,
    category: packageCategoryLabel(pkg),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: Number(pkg.current_price ?? pkg.base_price ?? 0),
      availability: pkg.bookable === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: `/book-package?package=${pkg.id}`,
      seller: { '@type': 'MedicalClinic', name: clinicSettings.name },
    },
  };
}

function shortJumpLabel(name: string) {
  return name
    .replace('Diabetic and Cardiac Package', 'Diabetic + Cardiac')
    .replace('Advanced Cardiac Package', 'Advanced Cardiac')
    .replace('Full Body Check-up Package', 'Full Body')
    .replace(' Package', '');
}

export default async function PackageDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [selectedResult, allPackages] = await Promise.all([
    getPackage(slug),
    getAllPackageDetails(),
  ]);
  const selected = selectedResult.package;

  if (!selected) notFound();

  const orderedPackages = orderPackagesSelectedFirst(allPackages, selected);
  const currentPrice = selected.current_price ?? selected.base_price;
  const hasOffer = Number(selected.original_price || 0) > Number(currentPrice || 0);
  const selectedCount = packageInclusionCount(selected);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(packageJsonLd(selected)) }}
      />

      <section className="soft-page-hero py-12 sm:py-14">
        <div className="container">
          <Link href="/packages" className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-primary">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to health packages
          </Link>

          <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-pink-700">
                {packageCategoryLabel(selected)} package
              </p>
              <h1 className="heading-display text-navy">{selected.name}</h1>
              <p className="mt-4 text-base font-medium text-text-light sm:text-lg">
                Review all {selectedCount} included tests and services, then continue down the page to compare every other package.
              </p>
            </div>

            <aside className="soft-card p-5 sm:p-6">
              <div className="flex flex-wrap items-end gap-3">
                <p className="text-4xl font-extrabold text-navy">{formatPackageMoney(currentPrice)}</p>
                {hasOffer && (
                  <p className="pb-1 text-sm text-text-light line-through">
                    {formatPackageMoney(selected.original_price)}
                  </p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {hasOffer && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 text-sm font-bold text-pink-800">
                    <BadgePercent size={15} aria-hidden="true" />
                    {selected.discount_label || 'Offer'}
                  </span>
                )}
                <span className="text-sm font-semibold text-text-light">{selectedCount} inclusions</span>
              </div>
              <Link href={`/book-package?package=${selected.id}`} className="btn btn-accent mt-5 w-full">
                <CalendarCheck size={18} aria-hidden="true" />
                Book package
              </Link>
            </aside>
          </div>
        </div>
      </section>

      <nav className="sticky top-20 z-30 border-y border-primary/10 bg-white/95 py-3 shadow-[0_8px_24px_rgba(23,58,94,0.08)] backdrop-blur" aria-label="Jump to package">
        <div className="container flex items-center gap-3 overflow-x-auto pb-1">
          <span className="shrink-0 text-sm font-extrabold text-navy">Jump to package</span>
          {orderedPackages.map((pkg) => (
            <Link
              key={pkg.slug}
              href={`#package-${pkg.slug}`}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent ${
                pkg.slug === selected.slug
                  ? 'border-accent bg-blue-50 text-accent'
                  : 'border-primary/20 bg-white text-navy'
              }`}
            >
              {shortJumpLabel(pkg.name)}
            </Link>
          ))}
        </div>
      </nav>

      <section className="section bg-bg-alt">
        <div className="container">
          <div className="grid gap-8">
            {orderedPackages.map((pkg, index) => (
              <div key={pkg.slug}>
                {index === 1 && (
                  <div className="mb-8 flex items-center gap-4" aria-hidden="true">
                    <span className="h-px flex-1 bg-primary/20" />
                    <span className="text-center text-lg font-extrabold text-navy">Continue comparing all packages</span>
                    <span className="h-px flex-1 bg-primary/20" />
                  </div>
                )}
                <PackageDetailSection pkg={pkg} selected={index === 0} />
              </div>
            ))}
          </div>

          <div className="soft-card mx-auto mt-10 max-w-3xl p-6 text-center">
            <HelpCircle className="mx-auto text-accent" size={28} aria-hidden="true" />
            <h2 className="mt-3 text-xl font-extrabold text-navy">Need help choosing a package?</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-light">
              Ask the clinic team for guidance before booking if you are unsure which package matches your needs.
            </p>
            <Link href="/contact" className="btn btn-outline mt-5">Ask the clinic</Link>
          </div>
        </div>
      </section>
    </>
  );
}
