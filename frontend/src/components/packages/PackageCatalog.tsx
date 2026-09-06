'use client';

import { useSearchParams } from 'next/navigation';
import { ClipboardPlus, MessageCircle, Sparkles } from 'lucide-react';
import PackageCard, { packageCategoryLabel, type PublicPackageSummary } from './PackageCard';
import { whatsappLink } from '@/lib/settings';
import Button, { buttonClass } from '@/components/ui/Button';

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
          <h2 className="heading-section text-ink">Choose How You Want to Test</h2>
          <p className="mt-2 max-w-2xl text-text-light">
            Create your own diagnostic package or compare our clinic-curated health packages.
          </p>
        </div>

        {showFilters && (
          <nav className="flex flex-wrap gap-2" aria-label="Package categories">
            <Button
              href="/care"
              size="sm"
              variant={selectedCategory ? 'outline' : 'primary'}
              aria-current={!selectedCategory ? 'page' : undefined}
            >
              All
            </Button>
            {categories.map(([key, label]) => (
              <Button
                key={key}
                href={`/packages?category=${encodeURIComponent(key)}`}
                size="sm"
                variant={selectedCategory === key ? 'primary' : 'outline'}
                className="capitalize"
                aria-current={selectedCategory === key ? 'page' : undefined}
              >
                {label}
              </Button>
            ))}
          </nav>
        )}
      </div>

      {packages.length === 0 ? (
        <div className="soft-card p-8 text-center">
          <h2 className="text-xl font-bold text-ink">No packages are currently published</h2>
          <p className="mx-auto mt-2 max-w-2xl text-text-light">
            The clinic may still help you choose individual tests or appointments. Published packages
            will appear here when availability and pricing are ready.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button
              href={whatsappLink('Hello, I would like help choosing the right tests.')}
              target="_blank"
              rel="noopener noreferrer"
              variant="accent"
            >
              Ask on WhatsApp
            </Button>
            <Button href="/contact" variant="outline">
              Ask the Clinic
            </Button>
          </div>
        </div>
      ) : visiblePackages.length === 0 ? (
        <div className="soft-card p-8 text-center">
          <h2 className="text-xl font-bold text-ink">
            No packages found{selectedLabel ? ` for ${selectedLabel}` : ''}
          </h2>
          <p className="mt-2 text-text-light">Try another category or view all active packages.</p>
          <Button href="/care" variant="outline" className="mt-5">
            View All Packages
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <a
            href={whatsappLink('Hello, I would like help choosing the right tests for me.')}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex min-h-[390px] flex-col overflow-hidden rounded-3xl border border-accent/50 bg-gradient-to-br from-wash-sage via-white to-wash-blush p-7 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <div className="absolute right-5 top-5 flex items-center gap-1 rounded-full bg-wash-sage px-3 py-1 text-xs font-bold text-accent">
              <Sparkles size={13} aria-hidden="true" /> Flexible
            </div>
            <p className="text-xs font-bold uppercase tracking-wide text-accent">Personalised testing</p>
            <div className="mt-9 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-accent shadow-md">
              <ClipboardPlus size={34} aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-2xl font-bold text-ink">Create Your Own Package</h3>
            <p className="mt-3 leading-relaxed text-text-light">
              Tell the clinic what the patient needs and the team will put together a personalised
              set of tests over WhatsApp or a phone call.
            </p>
            <p className="mt-5 text-sm font-semibold text-accent">109 unique tests available</p>
            <span className={`${buttonClass({ variant: 'accent' })} mt-auto w-full justify-center`}>
              <MessageCircle size={16} aria-hidden="true" />
              Ask About Tests
            </span>
          </a>
          {visiblePackages.map((pkg) => (
            <PackageCard key={pkg.slug || pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </>
  );
}
