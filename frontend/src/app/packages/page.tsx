import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { serverApiGet } from '../../lib/serverApi';

export const metadata: Metadata = {
  title: 'Health Checkup Packages | Spandan Super Speciality Clinic',
  description: 'View Spandan Clinic\'s comprehensive health checkup packages — cardiac, diabetes, thyroid, and full body checkup packages in Chhatrapati Sambhajinagar.',
  openGraph: {
    title: 'Health Packages at Spandan Super Speciality Clinic',
    description: 'Comprehensive diagnostic packages for every health need.',
  },
};

async function getPackages() {
  return serverApiGet<{ packages: any[] }>(
    '/packages',
    { packages: [] },
    { next: { revalidate: 3600 } }
  );
}

export default async function PackagesPage() {
  const data = await getPackages();
  const packages = data.packages || [];

  return (
    <>
      <section className="bg-navy text-white py-16 text-center">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Health Packages</h1>
          <p className="opacity-85 text-lg">Comprehensive diagnostic packages for every need</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {packages.length > 0 ? (
            <div className="grid-3">
              {packages.map((pkg: any) => (
                <div key={pkg.slug} className="card p-6 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold">{pkg.name}</h3>
                    <span className="badge badge-featured capitalize">{pkg.category}</span>
                  </div>
                  <p className="text-sm text-text-light mb-4 flex-1">{pkg.short_description}</p>
                  <div className="mb-5 grid gap-2 text-xs text-text-light">
                    <div className="rounded-md bg-bg-alt px-3 py-2">Fasting guidance included where required</div>
                    <div className="rounded-md bg-bg-alt px-3 py-2">Clinic callback for date and preparation</div>
                    <div className="rounded-md bg-bg-alt px-3 py-2">Suitable tests explained before confirmation</div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/packages/${pkg.slug}`} className="btn btn-outline btn-sm flex-1 justify-center">View Details</Link>
                    <Link href={`/book-package?package=${pkg.id}`} className="btn bg-accent text-white btn-sm flex-1 justify-center hover:bg-accent-light">Book Package</Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-text-light">No packages available.</p>
          )}
        </div>
      </section>
    </>
  );
}
