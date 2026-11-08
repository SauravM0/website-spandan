import { BadgePercent, CheckCircle2, HeartPulse, MessageCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { whatsappLink } from '@/lib/settings';

export type PublicPackageSummary = {
  id: string;
  slug: string;
  name: string;
  short_description?: string | null;
  category?: string | null;
  test_category?: string | null;
  suitability?: string | null;
  key_inclusions?: string[] | null;
  inclusion_count?: number | null;
  base_price?: number | string | null;
  current_price?: number | string | null;
  original_price?: number | string | null;
  discount_label?: string | null;
  offer_valid_until?: string | null;
  prep_instructions?: string | null;
  fasting_required?: boolean | null;
  fasting_duration?: string | null;
  consultation_included?: boolean | null;
  report_turnaround?: string | null;
  bookable?: boolean | null;
  published?: boolean | null;
  reviewed_at?: string | null;
  purchase_status?: string | null;
  purchase_enabled?: boolean | null;
};

type PackageCardProps = {
  pkg: PublicPackageSummary;
  variant?: 'list' | 'home';
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatPackageMoney(value: number | string | null | undefined) {
  const amount = toNumber(value);
  if (amount === null) return 'Price on request';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function packageCategoryLabel(pkg: PublicPackageSummary) {
  return (pkg.test_category || pkg.category || 'General').replace(/[-_]/g, ' ');
}

export function packageSuitability(pkg: PublicPackageSummary) {
  if (pkg.short_description) return pkg.short_description;
  return `Review all ${pkg.inclusion_count || pkg.key_inclusions?.length || ''} included tests and services.`.replace(
    'all  included',
    'all included'
  );
}

export default function PackageCard({ pkg, variant = 'list' }: PackageCardProps) {
  const inclusions = (pkg.key_inclusions || []).filter(Boolean);
  const inclusionCount = Number(pkg.inclusion_count ?? inclusions.length);
  const previewInclusions = inclusions.slice(0, 3);
  const remainingCount = Math.max(0, inclusionCount - previewInclusions.length);
  const originalPrice = toNumber(pkg.original_price);
  const currentPrice = toNumber(pkg.current_price ?? pkg.base_price);
  const hasDiscount = originalPrice !== null && currentPrice !== null && originalPrice > currentPrice;
  const bookable = pkg.bookable !== false && pkg.purchase_enabled !== false && pkg.purchase_status !== 'unavailable';

  return (
    <article className="card trust-card flex h-full flex-col overflow-hidden p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-wash-pink text-accent">
            <HeartPulse size={22} aria-hidden="true" />
          </span>
          <span className="badge badge-featured capitalize">{packageCategoryLabel(pkg)}</span>
        </div>
        {hasDiscount && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blush/15 px-2.5 py-1 text-xs font-bold text-blush-deep">
            <BadgePercent size={14} aria-hidden="true" />
            {pkg.discount_label || 'Offer'}
          </span>
        )}
      </div>

      <h2
        className={`${variant === 'home' ? 'text-lg' : 'text-xl'} min-h-[3.5rem] font-extrabold leading-snug text-ink`}
      >
        {pkg.name}
      </h2>

      <div className="mt-4 border-b border-primary/10 pb-5">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
          <p className="text-3xl font-extrabold text-accent">
            {formatPackageMoney(pkg.current_price ?? pkg.base_price)}
          </p>
          {hasDiscount && (
            <p className="pb-1 text-sm font-medium text-text-light line-through">
              {formatPackageMoney(pkg.original_price)}
            </p>
          )}
        </div>
        <p className="mt-2 text-sm font-semibold text-text-light">
          {inclusionCount} {inclusionCount === 1 ? 'inclusion' : 'inclusions'}
        </p>
      </div>

      <div className="mt-5">
        <p className="text-sm font-bold text-ink">Package highlights</p>
        {previewInclusions.length ? (
          <ul className="mt-3 grid gap-2.5 text-sm text-text-light">
            {previewInclusions.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 shrink-0 text-accent" size={16} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-text-light">Open the package to review every included item.</p>
        )}
        {remainingCount > 0 && (
          <p className="mt-3 text-sm font-bold text-accent">+ {remainingCount} more inclusions</p>
        )}
      </div>

      <div className="mt-auto pt-6">
        <div className="flex flex-col gap-2 min-[420px]:flex-row">
          <Button href={`/packages/${pkg.slug}`} variant="outline" size="sm" className="flex-1">
            View details
          </Button>
          {bookable ? (
            <Button
              href={whatsappLink(`Hello, I would like to know more about the ${pkg.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
              variant="accent"
              size="sm"
              className="flex-1"
            >
              <MessageCircle size={16} aria-hidden="true" />
              Enquire on WhatsApp
            </Button>
          ) : (
            <span className="btn btn-sm flex-1 cursor-not-allowed bg-wash-pink text-text-light shadow-none">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
