import Link from 'next/link';
import {
  BadgePercent,
  CalendarCheck,
  ClipboardList,
  HeartPulse,
  IndianRupee,
  Utensils,
} from 'lucide-react';

export type PublicPackageSummary = {
  id: string;
  slug: string;
  name: string;
  short_description?: string | null;
  category?: string | null;
  test_category?: string | null;
  suitability?: string | null;
  key_inclusions?: string[] | null;
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
  return `Rs. ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function packageCategoryLabel(pkg: PublicPackageSummary) {
  return (pkg.test_category || pkg.category || 'General').replace(/[-_]/g, ' ');
}

export function packageSuitability(pkg: PublicPackageSummary) {
  if (pkg.suitability) return pkg.suitability;

  const source = `${pkg.name || ''} ${pkg.category || ''} ${pkg.short_description || ''}`.toLowerCase();
  if (source.includes('cardiac') || source.includes('heart')) return 'Suitable for heart risk screening and follow-up planning.';
  if (source.includes('diabetes') || source.includes('sugar')) return 'Suitable for diabetes monitoring and metabolic review.';
  if (source.includes('thyroid')) return 'Suitable for thyroid symptom or follow-up evaluation.';
  if (source.includes('full')) return 'Suitable for a broad preventive health review.';
  return 'Suitable when your doctor advises a focused diagnostic review.';
}

function prepLabel(pkg: PublicPackageSummary) {
  if (pkg.fasting_required) {
    return pkg.fasting_duration ? `Fasting required: ${pkg.fasting_duration}` : 'Fasting required';
  }
  if (pkg.prep_instructions) return 'Preparation guidance included';
  return 'No special preparation listed';
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
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PackageCard({ pkg, variant = 'list' }: PackageCardProps) {
  const inclusions = (pkg.key_inclusions || []).filter(Boolean).slice(0, variant === 'home' ? 3 : 5);
  const originalPrice = toNumber(pkg.original_price);
  const currentPrice = toNumber(pkg.current_price ?? pkg.base_price);
  const hasDiscount = originalPrice !== null && currentPrice !== null && originalPrice > currentPrice;
  const offerDate = formatOfferDate(pkg.offer_valid_until);
  const reviewedDate = formatReviewDate(pkg.reviewed_at);
  const bookable = pkg.bookable !== false && pkg.purchase_enabled !== false && pkg.purchase_status !== 'unavailable';

  return (
    <article className="card trust-card flex h-full flex-col p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-accent">
            <HeartPulse size={22} aria-hidden="true" />
          </span>
          <span className="badge badge-featured capitalize">{packageCategoryLabel(pkg)}</span>
        </div>
        {hasDiscount && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-pink-100 px-2.5 py-1 text-xs font-semibold text-pink-800">
            <BadgePercent size={14} aria-hidden="true" />
            {pkg.discount_label || 'Offer'}
          </span>
        )}
      </div>

      <h2 className={variant === 'home' ? 'mb-2 text-lg font-bold text-navy' : 'mb-2 text-xl font-bold text-navy'}>
        {pkg.name}
      </h2>
      <p className="text-sm leading-relaxed text-text-light">
        {pkg.short_description || packageSuitability(pkg)}
      </p>

      <div className="mt-5 rounded-2xl bg-blue-50/70 p-4 shadow-[0_8px_22px_rgba(43,138,198,0.06)]">
        <p className="flex items-center gap-1 text-xs font-bold uppercase text-accent">
          <IndianRupee size={14} aria-hidden="true" />
          Current package price
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <p className="text-3xl font-bold text-navy">
            {formatPackageMoney(pkg.current_price ?? pkg.base_price)}
          </p>
          {hasDiscount && (
            <div className="text-right text-sm">
              <p className="text-text-light line-through">{formatPackageMoney(pkg.original_price)}</p>
              <p className="font-semibold text-pink-800">{pkg.discount_label || 'Offer price'}</p>
              {offerDate && <p className="text-xs text-pink-800">Valid until {offerDate}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-white p-4 shadow-[0_8px_22px_rgba(43,138,198,0.05)]">
        <p className="text-xs font-semibold uppercase text-text-light">Best for</p>
        <p className="mt-1 text-sm font-medium text-navy">{packageSuitability(pkg)}</p>
      </div>

      <div className="mt-5">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy">
          <ClipboardList size={16} aria-hidden="true" />
          Key inclusions
        </p>
        {inclusions.length ? (
          <ul className="grid gap-2 text-sm text-text-light">
            {inclusions.map((item) => (
              <li key={item} className="rounded-2xl bg-white px-3 py-2 shadow-[0_6px_16px_rgba(23,58,94,0.04)]">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-white px-3 py-2 text-sm text-text-light shadow-[0_6px_16px_rgba(23,58,94,0.04)]">
            Included tests are reviewed with you before confirmation.
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-2 text-sm text-text-light">
        <p className="flex items-start gap-2 rounded-2xl bg-blue-50/60 px-3 py-2">
          <Utensils size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
          <span>{prepLabel(pkg)}</span>
        </p>
        {pkg.report_turnaround && (
          <p className="flex items-start gap-2 rounded-2xl bg-blue-50/60 px-3 py-2">
            <CalendarCheck size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <span>{pkg.report_turnaround}</span>
          </p>
        )}
      </div>

      <div className="mt-auto pt-6">
        {reviewedDate && (
          <p className="mb-4 text-xs font-semibold text-text-light">Price and package record reviewed {reviewedDate}</p>
        )}

        <div className="flex flex-col gap-2 min-[420px]:flex-row">
          <Link href={`/packages/${pkg.slug}`} className="btn btn-outline btn-sm flex-1">
            Details
          </Link>
          {bookable ? (
            <Link href={`/book-package?package=${pkg.id}`} className="btn btn-accent btn-sm flex-1">
              Book Package
            </Link>
          ) : (
            <span className="btn btn-sm flex-1 cursor-not-allowed bg-blue-50 text-text-light shadow-none">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
