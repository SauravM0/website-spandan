import React from 'react';
import Link from 'next/link';
import { BadgePercent, ClipboardList, HeartPulse } from 'lucide-react';
import { serverApiGet } from '../../lib/serverApi';

async function getFeaturedPackages() {
  const featured = await serverApiGet<{ packages: any[] }>(
    '/packages/featured',
    { packages: [] },
    { next: { revalidate: 3600 } }
  );

  if (featured.packages?.length) return featured.packages.slice(0, 6);

  const all = await serverApiGet<{ packages: any[] }>(
    '/packages',
    { packages: [] },
    { next: { revalidate: 3600 } }
  );

  return (all.packages || []).slice(0, 6);
}

function packageSuitability(pkg: any) {
  const source = `${pkg.name || ''} ${pkg.category || ''} ${pkg.short_description || ''}`.toLowerCase();
  if (source.includes('cardiac') || source.includes('heart')) return 'Suitable for heart risk screening and follow-up planning.';
  if (source.includes('diabetes') || source.includes('sugar')) return 'Suitable for diabetes monitoring and metabolic review.';
  if (source.includes('thyroid')) return 'Suitable for thyroid symptom or follow-up evaluation.';
  if (source.includes('full')) return 'Suitable for a broad preventive health review.';
  return 'Suitable when your doctor advises a focused diagnostic review.';
}

export default async function FeaturedPackages() {
  const packages = await getFeaturedPackages();

  if (!packages.length) return null;

  return (
    <section className="section bg-bg-alt">
      <div className="container">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="heading-section mb-2 text-navy">Featured Health Packages</h2>
            <p className="max-w-2xl text-text-light">
              Compare common health packages without sorting through every test name on the card.
            </p>
          </div>
          <Link href="/packages" className="btn btn-outline self-start md:self-auto">
            View All Packages
          </Link>
        </div>

        <div className="grid-3">
          {packages.map((pkg: any) => {
            const hasDiscount = Number(pkg.discount_percent || 0) > 0;

            return (
              <article key={pkg.slug || pkg.id} className="card flex h-full flex-col p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-accent">
                    <HeartPulse size={22} />
                  </div>
                  {hasDiscount && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                      <BadgePercent size={14} />
                      {pkg.discount_percent}% off
                    </span>
                  )}
                </div>

                <h3 className="mb-2 text-lg font-bold text-navy">{pkg.name}</h3>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-text-light">
                  {pkg.short_description || packageSuitability(pkg)}
                </p>

                <div className="mb-5 rounded-md border border-border bg-bg-alt p-3 text-sm text-text-light">
                  <p className="font-semibold text-navy">Best for</p>
                  <p className="mt-1">{packageSuitability(pkg)}</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link href={`/packages/${pkg.slug}`} className="btn btn-outline btn-sm flex-1">
                    <ClipboardList size={16} />
                    See included tests
                  </Link>
                  <Link href={`/book-package?package=${pkg.id}`} className="btn btn-accent btn-sm flex-1">
                    Book Package
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
