import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import EnquiryForm from '../../../components/forms/EnquiryForm';
import { serverApiGet } from '../../../lib/serverApi';

async function getDoctor(slug: string) {
  return serverApiGet<{ doctor: any | null }>(`/doctors/${slug}`, { doctor: null });
}

export async function generateStaticParams() {
  const data = await serverApiGet('/doctors', { doctors: [] });
  const slugs = (data.doctors || []).map((doc: any) => ({ slug: doc.slug }));
  return slugs.length > 0 ? slugs : [{ slug: 'placeholder' }];
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getDoctor(params.slug);
  const doc = data.doctor;
  if (!doc) return { title: 'Doctor Not Found | Spandan Clinic' };
  return {
    title: `${doc.name} | ${doc.speciality} | Spandan Super Speciality Clinic`,
    description: `Learn about Dr. ${doc.name}, ${doc.speciality} specialist at Spandan Clinic in Chhatrapati Sambhajinagar. ${doc.qualifications || ''}`,
    openGraph: {
      title: `${doc.name} | Spandan Clinic`,
      description: `${doc.speciality} specialist with ${doc.qualifications}`,
    },
  };
}

export default async function DoctorDetail({ params }: { params: { slug: string } }) {
  const data = await getDoctor(params.slug);
  const doc = data.doctor;

  if (!doc) {
    return (
      <section className="section text-center py-24">
        <div className="container">
          <h2 className="text-2xl font-bold text-navy mb-4">Doctor Not Found</h2>
          <p className="text-text-light mb-6">The doctor you are looking for is not available. Please check back later or browse our doctors list.</p>
          <Link href="/doctors" className="btn bg-navy text-white hover:bg-navy-light">Browse Doctors</Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-navy text-white py-16">
        <div className="container">
          <Link href="/doctors" className="opacity-70 text-sm hover:opacity-100 transition-opacity">← Back to Doctors</Link>
          <div className="flex items-center gap-6 mt-4">
            <div className="w-[90px] h-[90px] rounded-full bg-accent flex-shrink-0 flex items-center justify-center text-white text-3xl font-bold">
              {doc.name.split(' ').map((w: string) => w[0]).join('')}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{doc.name}</h1>
              <p className="text-lg opacity-85 mt-1">{doc.speciality}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid-2 gap-12">
            <div>
              {doc.qualifications && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold mb-3">Qualifications</h3>
                  <p className="text-sm text-text-light">{doc.qualifications}</p>
                </div>
              )}
              {doc.bio && (
                <div className="mb-8">
                  {doc.bio.split('\n').map((line: string, i: number) => {
                    const trimmed = line.trim();
                    if (!trimmed) return null;
                    if (trimmed.includes('[NEEDS CONFIRMATION]')) return null;
                    if (/^(Education|Registration|Teaching Role|Notable Achievement|Media \/ Recognition):/.test(trimmed)) {
                      const [label, ...rest] = trimmed.split(':');
                      return (
                        <p key={i} className="text-sm text-text-light mb-2">
                          <span className="font-semibold text-navy">{label}:</span>
                          {rest.join(':')}
                        </p>
                      );
                    }
                    return <p key={i} className="text-base leading-relaxed text-text-light mb-3">{trimmed}</p>;
                  })}
                </div>
              )}
              {doc.bio && doc.bio.includes('Notable Achievement') && (
                <div className="mb-8 p-5 bg-bg-alt rounded-xl border border-border">
                  <h3 className="text-lg font-bold text-navy mb-3">Publications & Recognition</h3>
                  {doc.bio.split('\n').map((line: string, i: number) => {
                    const trimmed = line.trim();
                    if (!trimmed) return null;
                    if (/^(Notable Achievement|Media \/ Recognition):/.test(trimmed)) {
                      const content = trimmed.replace(/^(Notable Achievement|Media \/ Recognition):\s*/, '').replace(/\s*\[NEEDS CONFIRMATION[^\]]*\]/g, '');
                      if (content) {
                        return <p key={i} className="text-sm text-text-light mb-2 flex items-start gap-2"><span className="text-accent mt-1">●</span>{content}</p>;
                      }
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold mb-6 text-center">Enquire Now</h3>
              <EnquiryForm doctorId={params.slug} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
