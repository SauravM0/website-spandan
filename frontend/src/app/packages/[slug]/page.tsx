import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import EnquiryForm from '../../../components/forms/EnquiryForm';
import TestListCard from '../../../components/packages/TestListCard';
import PrepInstructions from '../../../components/packages/PrepInstructions';
import CardioBackground from '../../../components/animations/CardioBackground';
import EndoBackground from '../../../components/animations/EndoBackground';
import { SpecialityBadge } from '../../../components/icons/SpecialityBadge';
import { ECGLine } from '../../../components/icons/ECGLine';
import { serverApiGet } from '../../../lib/serverApi';

function getPackageType(slug: string, pkg: any): 'cardiology' | 'endocrinology' | 'both' {
  const s = slug.toLowerCase();
  const name = (pkg?.name || '').toLowerCase();
  const isCardio = s.includes('cardiac') || s.includes('cardio') || s.includes('heart') ||
    name.includes('cardiac') || name.includes('cardio') || name.includes('heart');
  const isEndo = s.includes('diabetic') || s.includes('diabetes') || s.includes('endo') ||
    name.includes('diabetic') || name.includes('diabetes') || name.includes('endocrine');
  if (isCardio && isEndo) return 'both';
  if (isEndo && s.includes('both')) return 'both';
  if (s.includes('combo') || s.includes('combined') || name.includes('combo') || name.includes('combined')) return 'both';
  if (isCardio) return 'cardiology';
  if (isEndo) return 'endocrinology';
  return 'both';
}

async function getPackage(slug: string) {
  return serverApiGet<{ package: any | null; tests: any[] }>(`/packages/${slug}`, {
    package: null,
    tests: [],
  });
}

export async function generateStaticParams() {
  const data = await serverApiGet('/packages', { packages: [] });
  const slugs = (data.packages || []).map((pkg: any) => ({ slug: pkg.slug }));
  return slugs.length > 0 ? slugs : [{ slug: 'placeholder' }];
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getPackage(params.slug);
  const pkg = data.package;
  if (!pkg) return { title: 'Package Not Found | Spandan Clinic' };
  return {
    title: `${pkg.name} | Health Packages | Spandan Super Speciality Clinic`,
    description: pkg.short_description || `Learn about the ${pkg.name} at Spandan Clinic in Chhatrapati Sambhajinagar.`,
    openGraph: {
      title: `${pkg.name} | Spandan Clinic`,
      description: pkg.short_description,
    },
  };
}

export default async function PackageDetail({ params }: { params: { slug: string } }) {
  const data = await getPackage(params.slug);
  const pkg = data.package;
  const tests = data.tests || [];

  if (!pkg) {
    return (
      <section className="section text-center py-24">
        <div className="container">
          <h2 className="text-2xl font-bold text-navy mb-4">Package Not Found</h2>
          <p className="text-text-light mb-6">The package you are looking for is not available.</p>
          <Link href="/packages" className="btn bg-navy text-white hover:bg-navy-light">Browse Packages</Link>
        </div>
      </section>
    );
  }

  const pkgType = getPackageType(params.slug, pkg);

  return (
    <>
      <section className="bg-navy text-white py-16 relative overflow-hidden">
        {pkgType === 'cardiology' && <CardioBackground />}
        {pkgType === 'endocrinology' && <EndoBackground />}
        {pkgType === 'both' && (
          <>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" aria-hidden="true">
              <CardioBackground />
            </div>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" aria-hidden="true">
              <EndoBackground />
            </div>
          </>
        )}
        <div className="container relative z-10">
          <Link href="/packages" className="opacity-70 text-sm hover:opacity-100 transition-opacity">← Back to Packages</Link>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{pkg.name}</h1>
              <SpecialityBadge type={pkgType} />
            </div>
            {pkg.discounted_price && (
              <div className="text-right">
                <div className="text-2xl font-bold">₹{pkg.discounted_price}</div>
                <div className="text-sm line-through opacity-70">₹{pkg.base_price}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section relative overflow-hidden">
        {(pkgType === 'cardiology' || pkgType === 'both') && (
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" aria-hidden="true">
            <CardioBackground />
          </div>
        )}
        {pkgType === 'endocrinology' && (
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" aria-hidden="true">
            <EndoBackground />
          </div>
        )}
        <div className="container relative z-10">
          <div className="grid-2 gap-12">
            <div>
              {pkg.description && (
                <p className="text-lg leading-relaxed text-text-light mb-8">{pkg.description}</p>
              )}

              {(pkgType === 'cardiology' || pkgType === 'both') && (
                <div className="mb-6">
                  <ECGLine width={300} color="#D6336C" />
                </div>
              )}

              <TestListCard tests={tests} />

              <PrepInstructions instructions={pkg.prep_instructions} />

              <div className="bg-[#E8A33D]/10 border-l-4 border-[#E8A33D] p-5 rounded-r-lg">
                <p className="text-sm text-text-light">
                  <strong className="text-navy">Preparation Tips:</strong> Please arrive on an empty stomach (8-10 hours fasting). Carry any previous medical reports. The clinic is closed on Sundays.
                </p>
              </div>
            </div>

            <div id="enquire" className="scroll-mt-20">
              <h3 className="text-xl font-bold mb-6 text-center">Enquire About This Package</h3>
              <EnquiryForm packageId={params.slug} />
            </div>
          </div>

          <div className="fixed bottom-6 right-6 z-40 md:hidden">
            <a
              href="#enquire"
              className="btn bg-accent text-white hover:bg-accent-light shadow-lg rounded-full px-6"
            >
              Enquire Now
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
