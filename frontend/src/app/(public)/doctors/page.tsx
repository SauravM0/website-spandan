import React from 'react';
import type { Metadata } from 'next';
import { HelpCircle, MapPin, Phone } from 'lucide-react';
import DoctorCard from '@/components/doctors/DoctorCard';
import { clinicSettings } from '@/lib/settings';
import { serverApiGet } from '@/lib/serverApi';
import type { PublicDoctorSummary } from '@/lib/home';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Doctors at Spandan Clinic | Cardiology & Endocrinology Specialists',
  description: 'Meet the cardiology and endocrinology specialists at Spandan Clinic in Chhatrapati Sambhajinagar.',
  openGraph: {
    title: 'Doctors at Spandan Super Speciality Clinic',
    description: 'Published specialist profiles for cardiology and endocrinology care.',
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
              verified profile, then call or WhatsApp the clinic for assistance.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
            <Button href={`tel:${clinicSettings.phone}`} variant="outline">
              <Phone size={18} aria-hidden="true" />
              Call Clinic
            </Button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="mb-10 max-w-3xl">
            <h2 className="heading-section mb-2 text-ink">Published specialists</h2>
            <p className="text-text-light">
              Public cards show verified professional information. Call the clinic for current
              availability and visit guidance.
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
              <h2 className="text-xl font-bold text-ink">Doctor summaries unavailable</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                Published doctor summaries could not be loaded right now. You can still contact the
                clinic for guidance.
              </p>
              <div className="mt-5 flex flex-col gap-3 min-[420px]:flex-row">
                <Button href={`tel:${clinicSettings.phone}`} variant="outline">
                  Call Clinic
                </Button>
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
              <h2 className="text-2xl font-bold text-ink">Not sure which doctor to choose?</h2>
              <p className="mt-3 text-sm leading-relaxed text-text-light">
                Call the clinic or use the contact page. The team can guide you to the relevant
                specialist path without collecting personal medical history on this page.
              </p>
            </div>
            <div className="grid gap-3 min-[420px]:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
              <Button href={`tel:${clinicSettings.phone}`} variant="accent">
                <Phone size={18} aria-hidden="true" />
                Call
              </Button>
              <Button href="/contact" variant="outline">
                Contact
              </Button>
              <Button href={clinicSettings.googleMapsUrl} target="_blank" rel="noopener noreferrer" variant="outline">
                <MapPin size={18} aria-hidden="true" />
                Map
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
