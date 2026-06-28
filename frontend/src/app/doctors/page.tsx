import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { serverApiGet } from '../../lib/serverApi';

export const metadata: Metadata = {
  title: 'Our Doctors | Spandan Super Speciality Clinic',
  description: 'Meet our expert specialists at Spandan Clinic — Dr. Tukaram Aute (Cardiology) and Dr. Pratibha Pawal-Aute (Endocrinology) in Chhatrapati Sambhajinagar.',
  openGraph: {
    title: 'Doctors at Spandan Super Speciality Clinic',
    description: 'Expert specialists dedicated to your health.',
  },
};

async function getDoctors() {
  return serverApiGet<{ doctors: any[] }>(
    '/doctors',
    { doctors: [] },
    { next: { revalidate: 3600 } }
  );
}

export default async function DoctorsPage() {
  const data = await getDoctors();
  const doctors = data.doctors || [];

  return (
    <>
      <section className="bg-navy text-white py-16 text-center">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Meet Our Doctors</h1>
          <p className="opacity-85 text-lg">Expert specialists dedicated to your health</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {doctors.length > 0 ? (
            <div className="grid-3">
              {doctors.map((doc: any) => (
                <Link key={doc.slug} href={`/doctors/${doc.slug}`} className="card p-6 block hover:shadow-lg transition-shadow">
                  <div className="w-[70px] h-[70px] rounded-full bg-accent mb-4 flex items-center justify-center text-white text-xl font-bold">
                    {doc.name.split(' ').map((w: string) => w[0]).join('')}
                  </div>
                  <h3 className="text-lg font-bold mb-1">{doc.name}</h3>
                  <p className="text-sm font-semibold text-accent mb-2">{doc.speciality}</p>
                  <p className="text-xs text-text-light">{doc.qualifications}</p>
                  {doc.bio && (
                    <p className="text-xs text-primary mt-1.5 font-medium">
                      {doc.bio.split('\n').find((l: string) => l.includes('Registration:'))?.replace('Registration:', '').trim() ||
                       doc.bio.split('\n').find((l: string) => l.includes('Notable Achievement:'))?.replace('Notable Achievement:', '').replace(/\[NEEDS CONFIRMATION[^\]]*\]/g, '').trim()}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-text-light">No doctors available.</p>
          )}
        </div>
      </section>
    </>
  );
}
