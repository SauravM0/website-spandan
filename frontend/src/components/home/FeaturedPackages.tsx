import React from 'react';
import Link from 'next/link';
import PackageCard, { type PublicPackageSummary } from '../packages/PackageCard';

export default function FeaturedPackages({ packages }: { packages: PublicPackageSummary[] }) {
  if (!packages.length) return null;

  return (
    <section className="section section-alt">
      <div className="container">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="heading-section mb-2 text-navy">Featured Health Packages</h2>
            <p className="max-w-2xl text-text-light">
              Compare common health packages by price, preparation, and key included tests.
            </p>
          </div>
          <Link href="/packages" className="btn btn-outline self-start md:self-auto">
            View All Packages
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {packages.slice(0, 3).map((pkg) => (
            <PackageCard key={pkg.slug || pkg.id} pkg={pkg} variant="home" />
          ))}
        </div>
      </div>
    </section>
  );
}
