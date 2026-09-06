import { BadgePercent, MessageCircle } from 'lucide-react';
import {
  formatPackageMoney,
  packageCategoryLabel,
  type PublicPackageSummary,
} from './PackageCard';
import TestListCard, { type PackageTestItem } from './TestListCard';
import Button from '@/components/ui/Button';
import { whatsappLink } from '@/lib/settings';

export type PublicPackageDetail = PublicPackageSummary & {
  description?: string | null;
  tests?: PackageTestItem[] | null;
};

export function packageInclusionCount(pkg: PublicPackageDetail) {
  return pkg.tests?.length || pkg.inclusion_count || 0;
}

export function orderPackagesSelectedFirst(
  packages: PublicPackageDetail[],
  selected: PublicPackageDetail
) {
  return [selected, ...packages.filter((pkg) => pkg.slug !== selected.slug)];
}

export default function PackageDetailSection({
  pkg,
  selected = false,
}: {
  pkg: PublicPackageDetail;
  selected?: boolean;
}) {
  const currentPrice = pkg.current_price ?? pkg.base_price;
  const hasOffer = Number(pkg.original_price || 0) > Number(currentPrice || 0);
  const inclusionCount = packageInclusionCount(pkg);
  const bookable = pkg.bookable !== false && pkg.purchase_enabled !== false && pkg.purchase_status !== 'unavailable';

  return (
    <article
      id={`package-${pkg.slug}`}
      className={`scroll-mt-48 rounded-[28px] border bg-white p-5 shadow-xl sm:p-7 ${
        selected ? 'border-accent/50 ring-4 ring-wash-sage' : 'border-primary/15'
      }`}
    >
      <div className="grid gap-6 border-b border-primary/10 pb-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-featured capitalize">{packageCategoryLabel(pkg)}</span>
            {selected && (
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-accent">
                Selected package
              </span>
            )}
          </div>
          <h2 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">{pkg.name}</h2>
          <p className="mt-2 text-sm font-semibold text-text-light">
            {inclusionCount} {inclusionCount === 1 ? 'inclusion' : 'inclusions'}
          </p>
        </div>

        <div className="min-w-[250px] rounded-2xl bg-wash-sage/70 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <p className="text-3xl font-extrabold text-ink">{formatPackageMoney(currentPrice)}</p>
            {hasOffer && (
              <p className="pb-1 text-sm text-text-light line-through">
                {formatPackageMoney(pkg.original_price)}
              </p>
            )}
          </div>
          {hasOffer && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-blush/15 px-2.5 py-1 text-xs font-bold text-blush-deep">
              <BadgePercent size={14} aria-hidden="true" />
              {pkg.discount_label || 'Offer'}
            </p>
          )}
          {bookable && (
            <Button
              href={whatsappLink(`Hello, I would like to know more about the ${pkg.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
              variant="accent"
              size="sm"
              className="mt-4 w-full"
            >
              <MessageCircle size={16} aria-hidden="true" />
              Enquire on WhatsApp
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6">
        <TestListCard tests={pkg.tests || []} />
      </div>
    </article>
  );
}
