'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ClipboardPlus, Sparkles } from 'lucide-react';
import PackageCard, { packageCategoryLabel, type PublicPackageSummary } from './PackageCard';

type PackageCatalogProps = {
  packages: PublicPackageSummary[];
};

function normalizeCategory(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

export default function PackageCatalog({ packages }: PackageCatalogProps) {
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get('category')
    ? normalizeCategory(searchParams.get('category') || '')
    : null;
  const categories = Array.from(
    new Map(
      packages.map((pkg) => {
        const label = packageCategoryLabel(pkg);
        return [normalizeCategory(label), label] as const;
      })
    ).entries()
  );
  const visiblePackages = selectedCategory
    ? packages.filter((pkg) => normalizeCategory(packageCategoryLabel(pkg)) === selectedCategory)
    : packages;
  const selectedLabel = categories.find(([key]) => key === selectedCategory)?.[1];
  const showFilters = categories.length > 1;

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <h2 className="heading-section text-navy">Choose How You Want to Test</h2>
          <p className="mt-2 max-w-2xl text-text-light">
            Create your own diagnostic package or compare our clinic-curated health packages.
          </p>
        </div>

        {showFilters && (
          <nav className="flex flex-wrap gap-2" aria-label="Package categories">
            <Link
              href="/packages"
              className={`btn btn-sm ${selectedCategory ? 'btn-outline' : 'btn-primary'}`}
              aria-current={!selectedCategory ? 'page' : undefined}
            >
              All
            </Link>
            {categories.map(([key, label]) => (
              <Link
                key={key}
                href={`/packages?category=${encodeURIComponent(key)}`}
                className={`btn btn-sm capitalize ${selectedCategory === key ? 'btn-primary' : 'btn-outline'}`}
                aria-current={selectedCategory === key ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {packages.length === 0 ? (
        <div className="soft-card p-8 text-center">
          <h2 className="text-xl font-bold text-navy">No packages are currently published</h2>
          <p className="mx-auto mt-2 max-w-2xl text-text-light">
            The clinic may still help you choose individual tests or appointments. Published packages
            will appear here when availability and pricing are ready.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/build-package" className="btn btn-accent">
              Create Your Own Package
            </Link>
            <Link href="/contact" className="btn btn-outline">
              Ask the Clinic
            </Link>
          </div>
        </div>
      ) : visiblePackages.length === 0 ? (
        <div className="soft-card p-8 text-center">
          <h2 className="text-xl font-bold text-navy">
            No packages found{selectedLabel ? ` for ${selectedLabel}` : ''}
          </h2>
          <p className="mt-2 text-text-light">Try another category or view all active packages.</p>
          <Link href="/packages" className="btn btn-outline mt-5">
            View All Packages
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/build-package"
            className="group relative flex min-h-[390px] flex-col overflow-hidden rounded-3xl border border-accent/50 bg-gradient-to-br from-blue-50 via-white to-pink-50 p-7 shadow-[0_12px_34px_rgba(43,138,198,0.12)] transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-[0_20px_44px_rgba(43,138,198,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <div className="absolute right-5 top-5 flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
              <Sparkles size={13} aria-hidden="true" /> Flexible
            </div>
            <p className="text-xs font-bold uppercase tracking-wide text-accent">Personalised testing</p>
            <div className="mt-9 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-accent shadow-[0_8px_20px_rgba(43,138,198,0.12)]">
              <ClipboardPlus size={34} aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-2xl font-bold text-navy">Create Your Own Package</h3>
            <p className="mt-3 leading-relaxed text-text-light">
              Choose individual tests based on the patient&apos;s needs and build a personalised diagnostic package.
            </p>
            <p className="mt-5 text-sm font-semibold text-accent">109 unique tests available</p>
            <span className="btn btn-accent mt-auto w-full justify-center">
              Choose My Tests
            </span>
          </Link>
          {visiblePackages.map((pkg) => (
            <PackageCard key={pkg.slug || pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </>
  );
}
