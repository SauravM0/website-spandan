import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ContentUnavailable from '@/components/ui/ContentUnavailable';
import { ArrowLeft, BadgePercent, HelpCircle, MessageCircle, Phone } from 'lucide-react';
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
import { fallbackPackageDetail, fallbackPackageDetails } from '@/lib/packageCatalog';
import { clinicSettings, whatsappLink } from '@/lib/settings';
import { serverApiGet, serverApiTry } from '@/lib/serverApi';
import Button from '@/components/ui/Button';

async function getPackage(slug: string) {
  return serverApiTry<{ package: PublicPackageDetail | null }>(
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

async function getAllPackageDetails(): Promise<PublicPackageDetail[]> {
  const catalog = await getPackageCatalog();
  const results = await Promise.all(
    (catalog.packages || []).map((pkg) => getPackage(pkg.slug))
  );
  const live = results.map((result) => result.data.package).filter(Boolean) as PublicPackageDetail[];
  return live.length ? live : fallbackPackageDetails();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pkg = (await getPackage(slug)).data.package ?? fallbackPackageDetail(slug);
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
      url: `/packages/${pkg.slug}`,
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
  // A package the API cannot serve still has a published record in the curated
  // catalogue, so fall back to that before treating the page as unavailable.
  const selected = selectedResult.data.package ?? fallbackPackageDetail(slug);

  if (!selected) {
    if (!selectedResult.ok) {
      return (
        <ContentUnavailable
          title="This health package is temporarily unavailable"
          backHref="/packages"
          backLabel="All packages"
        />
      );
    }
    notFound();
  }

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
          <Link href="/care" className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-primary">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to health packages
          </Link>

          <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-blush-deep">
                {packageCategoryLabel(selected)} package
              </p>
              <h1 className="heading-display text-ink">{selected.name}</h1>
              <p className="mt-4 text-base font-medium text-text-light sm:text-lg">
                Review all {selectedCount} included tests and services, then continue down the page to compare every other package.
              </p>
            </div>

            <aside className="soft-card p-5 sm:p-6">
              <div className="flex flex-wrap items-end gap-3">
                <p className="text-4xl font-extrabold text-ink">{formatPackageMoney(currentPrice)}</p>
                {hasOffer && (
                  <p className="pb-1 text-sm text-text-light line-through">
                    {formatPackageMoney(selected.original_price)}
                  </p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {hasOffer && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blush/15 px-3 py-1 text-sm font-bold text-blush-deep">
                    <BadgePercent size={15} aria-hidden="true" />
                    {selected.discount_label || 'Offer'}
                  </span>
                )}
                <span className="text-sm font-semibold text-text-light">{selectedCount} inclusions</span>
              </div>
              <Button
                href={whatsappLink(`Hello, I would like to know more about the ${selected.name}.`)}
                target="_blank"
                rel="noopener noreferrer"
                variant="accent"
                className="mt-5 w-full"
              >
                <MessageCircle size={18} aria-hidden="true" />
                Enquire on WhatsApp
              </Button>
              <Button href={`tel:${clinicSettings.phone}`} variant="outline" className="mt-3 w-full">
                <Phone size={18} aria-hidden="true" />
                Call {clinicSettings.phone}
              </Button>
            </aside>
          </div>
        </div>
      </section>

      <nav className="sticky top-20 z-30 border-y border-primary/10 bg-white/95 py-3 shadow-md backdrop-blur" aria-label="Jump to package">
        <div className="container flex items-center gap-3 overflow-x-auto pb-1">
          <span className="shrink-0 text-sm font-extrabold text-ink">Jump to package</span>
          {orderedPackages.map((pkg) => (
            <Link
              key={pkg.slug}
              href={`#package-${pkg.slug}`}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent ${
                pkg.slug === selected.slug
                  ? 'border-accent bg-wash-sage text-accent'
                  : 'border-primary/20 bg-white text-ink'
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
                    <span className="text-center text-lg font-extrabold text-ink">Continue comparing all packages</span>
                    <span className="h-px flex-1 bg-primary/20" />
                  </div>
                )}
                <PackageDetailSection pkg={pkg} selected={index === 0} />
              </div>
            ))}
          </div>

          <div className="soft-card mx-auto mt-10 max-w-3xl p-6 text-center">
            <HelpCircle className="mx-auto text-accent" size={28} aria-hidden="true" />
            <h2 className="mt-3 text-xl font-extrabold text-ink">Need help choosing a package?</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-light">
              Ask the clinic team for guidance before booking if you are unsure which package matches your needs.
            </p>
            <Button href="/contact" variant="outline" className="mt-5">Ask the clinic</Button>
          </div>
        </div>
      </section>
    </>
  );
}
