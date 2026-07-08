import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarCheck, HelpCircle, MapPin, Phone } from 'lucide-react';
import DoctorCard from '@/components/doctors/DoctorCard';
import { clinicSettings } from '@/lib/settings';
import { serverApiGet } from '@/lib/serverApi';
import type { PublicDoctorSummary } from '@/lib/home';

export const metadata: Metadata = {
  title: 'Doctors at Spandan Clinic | Cardiology & Endocrinology Specialists',
  description: 'Compare published specialists at Spandan Clinic and book directly with the relevant cardiology or endocrinology doctor in Chhatrapati Sambhajinagar.',
  openGraph: {
    title: 'Doctors at Spandan Super Speciality Clinic',
    description: 'Published specialist profiles with direct profile and booking links.',
  },
};

async function getDoctors() {
  const data = await serverApiGet<{ doctors: PublicDoctorSummary[] }>(
    '/doctors',
    { doctors: [] },
    { next: { revalidate: 3600, tags: ['public-doctors'] } }
  );
  return data.doctors || [];
}

function doctorsStructuredData(doctors: PublicDoctorSummary[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Doctors at ${clinicSettings.name}`,
    itemListElement: doctors.map((doctor, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Physician',
        name: doctor.name,
        medicalSpecialty: doctor.speciality,
        url: `/doctors/${doctor.slug}`,
        affiliation: {
          '@type': 'MedicalClinic',
          name: clinicSettings.name,
        },
      },
    })),
  };
}

export default async function DoctorsPage() {
  const doctors = await getDoctors();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(doctorsStructuredData(doctors)) }}
      />

      <section className="soft-page-hero py-16">
        <div className="container">
          <div className="max-w-[760px]">
            <h1 className="text-3xl font-bold sm:text-4xl">Choose a specialist</h1>
            <p className="mt-4 text-base leading-relaxed text-text-light sm:text-lg">
              Compare the currently published doctors at {clinicSettings.name}, then open a
              verified profile or start booking with that doctor preselected.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
            <Link href="/book-appointment" className="btn btn-accent">
              <CalendarCheck size={18} aria-hidden="true" />
              Book Appointment
            </Link>
            <a href={`tel:${clinicSettings.phone}`} className="btn btn-outline">
              <Phone size={18} aria-hidden="true" />
              Call Clinic
            </a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="mb-10 max-w-3xl">
            <h2 className="heading-section mb-2 text-navy">Published specialists</h2>
            <p className="text-text-light">
              Public cards show professional information returned by the clinic API. Availability is
              confirmed during booking, and unpublished doctors are not listed.
            </p>
          </div>

          {doctors.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {doctors.map((doctor) => (
                <DoctorCard key={doctor.slug} doctor={doctor} variant="list" />
              ))}
            </div>
          ) : (
            <div className="soft-card p-6">
              <h2 className="text-xl font-bold text-navy">Doctor summaries unavailable</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                Published doctor summaries could not be loaded right now. You can still contact the
                clinic for guidance or continue to booking.
              </p>
              <div className="mt-5 flex flex-col gap-3 min-[420px]:flex-row">
                <Link href="/book-appointment" className="btn btn-accent">
                  Book Appointment
                </Link>
                <a href={`tel:${clinicSettings.phone}`} className="btn btn-outline">
                  Call Clinic
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section bg-bg-alt">
        <div className="container">
          <div className="soft-card grid gap-6 p-6 md:grid-cols-[0.9fr_1.1fr] md:items-center md:p-8">
            <div>
              <span className="icon-chip mb-4 flex h-11 w-11">
                <HelpCircle size={22} aria-hidden="true" />
              </span>
              <h2 className="text-2xl font-bold text-navy">Not sure which doctor to choose?</h2>
              <p className="mt-3 text-sm leading-relaxed text-text-light">
                Call the clinic or use the contact page. The team can guide you to the relevant
                specialist path without collecting personal medical history on this page.
              </p>
            </div>
            <div className="grid gap-3 min-[420px]:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
              <a href={`tel:${clinicSettings.phone}`} className="btn btn-accent">
                <Phone size={18} aria-hidden="true" />
                Call
              </a>
              <Link href="/contact" className="btn btn-outline">
                Contact
              </Link>
              <a href={clinicSettings.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                <MapPin size={18} aria-hidden="true" />
                Map
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
