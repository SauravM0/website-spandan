'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
          <h2 className="heading-section text-navy">Compare Packages</h2>
          <p className="mt-2 max-w-2xl text-text-light">
            Prices and booking availability are loaded from the same active package rules used by
            checkout.
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
          <Link href="/contact" className="btn btn-accent mt-5">
            Ask the Clinic
          </Link>
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
          {visiblePackages.map((pkg) => (
            <PackageCard key={pkg.slug || pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </>
  );
}
