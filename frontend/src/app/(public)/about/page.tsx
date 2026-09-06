import React from 'react';
import Image from 'next/image';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Accessibility, BookOpenCheck, ClipboardCheck, Languages, MapPin, MessageCircle, Microscope, Phone, ShieldCheck, Stethoscope, UsersRound } from 'lucide-react';
import { clinicSettings, whatsappLink } from '@/lib/settings';
import { serverApiGet } from '@/lib/serverApi';
import type { PublicDoctorSummary } from '@/lib/home';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'About Spandan Super Speciality Clinic | Specialist Care in Chhatrapati Sambhajinagar',
  description: 'Learn about Spandan Clinic, its specialist-led care model, patient journey, counselling approach, languages, facilities, and public doctor information.',
  openGraph: {
    title: 'About Spandan Super Speciality Clinic',
    description: 'Specialist cardiology, endocrinology, diagnostics, and patient education in Chhatrapati Sambhajinagar.',
  },
};

const aboutReview = {
  owner: 'Clinic administration',
  reviewedAt: '2026-07-07',
};

const principles = [
  {
    title: 'Specialist-led decisions',
    text: 'Patients are directed to cardiology, endocrinology, diabetes, thyroid, diagnostics, or package booking based on the care need they choose.',
  },
  {
    title: 'Clear next steps',
    text: 'Booking and package flows show fees, contact details, clinic location, and confirmation steps before payment or visit preparation.',
  },
  {
    title: 'Education with boundaries',
    text: 'Articles, videos, and health tools are public education resources and are kept separate from personal medical-history collection.',
  },
];

const processSteps = [
  {
    title: 'Start with the right route',
    text: 'Choose doctor consultation, health package, facility information, article, video, tool, or contact from public pages.',
    icon: ClipboardCheck,
  },
  {
    title: 'Review public details',
    text: 'Read specialist summaries, package details, facility availability, preparation guidance, and clinic timings.',
    icon: BookOpenCheck,
  },
  {
    title: 'Call or message',
    text: 'Use phone, WhatsApp, or map directions depending on the next step you need.',
    icon: Phone,
  },
];

const verifiedFacts = [
  {
    label: 'Clinic name',
    value: clinicSettings.name,
    icon: ShieldCheck,
  },
  {
    label: 'Location',
    value: `${clinicSettings.city}, ${clinicSettings.state}`,
    icon: MapPin,
  },
  {
    label: 'Public contact',
    value: clinicSettings.phone,
    icon: Phone,
  },
  {
    label: 'Languages',
    value: 'English, Hindi, and Marathi support',
    icon: Languages,
  },
];

const facilities = [
  'InBody body composition analysis',
  'Continuous glucose monitoring system',
  'Ambulatory blood pressure monitoring',
  'Holter monitoring',
  'Sleep study diagnostics',
  'Insulin pump therapy support',
];

function formatReviewDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function VerifiedFact({ label, value, icon: Icon }: { label: string; value: string; icon: typeof ShieldCheck }) {
  return (
    <article className="soft-card p-5">
      <span className="icon-chip mb-4 flex h-11 w-11">
        <Icon size={22} aria-hidden="true" />
      </span>
      <h3 className="text-sm font-bold uppercase text-text-light">{label}</h3>
      <p className="mt-2 font-semibold text-ink">{value}</p>
    </article>
  );
}

function CareProcess() {
  return (
    <div className="grid-3">
      {processSteps.map((step, index) => {
        const Icon = step.icon;
        return (
          <article key={step.title} className="soft-card p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="icon-chip flex h-10 w-10">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="text-sm font-bold text-accent">Step {index + 1}</span>
            </div>
            <h3 className="text-lg font-bold text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-light">{step.text}</p>
          </article>
        );
      })}
    </div>
  );
}

function MediaBlock() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="soft-card overflow-hidden">
        <div className="aspect-[4/3] bg-bg-alt p-8">
          <Image
            src="/logo.png"
            alt={`${clinicSettings.name} logo`}
            width={320}
            height={160}
            sizes="320px"
            className="h-full w-full object-contain"
          />
        </div>
        <div className="p-5">
          <h3 className="font-bold text-ink">Clinic identity</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-light">
            Public clinic information is governed from shared settings used across the site.
          </p>
        </div>
      </div>
      <div className="soft-card p-5">
        <span className="icon-chip mb-4 flex h-11 w-11">
          <Microscope size={22} aria-hidden="true" />
        </span>
        <h3 className="font-bold text-ink">Facility preview</h3>
        <ul className="mt-4 grid gap-2 text-sm text-text-light">
          {facilities.map((facility) => (
            <li key={facility} className="rounded-2xl bg-bg-alt px-3 py-2">
              {facility}
            </li>
          ))}
        </ul>
        <Button href="/facilities" variant="outline" className="mt-5">
          View Facilities
        </Button>
      </div>
    </div>
  );
}

async function getAboutDoctors() {
  const data = await serverApiGet<{ doctors: PublicDoctorSummary[] }>(
    '/doctors',
    { doctors: [] },
    { next: { revalidate: 3600, tags: ['public-doctors'] } }
  );
  return data.doctors || [];
}

function aboutStructuredData(doctors: PublicDoctorSummary[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `About ${clinicSettings.name}`,
    dateReviewed: aboutReview.reviewedAt,
    mainEntity: {
      '@type': 'MedicalClinic',
      name: clinicSettings.name,
      telephone: clinicSettings.phone,
      email: clinicSettings.email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: clinicSettings.address,
        addressLocality: clinicSettings.city,
        addressRegion: clinicSettings.state,
        postalCode: clinicSettings.pincode,
        addressCountry: 'IN',
      },
      physician: doctors.map((doctor) => ({
        '@type': 'Physician',
        name: doctor.name,
        medicalSpecialty: doctor.speciality,
        url: `/doctors/${doctor.slug}`,
      })),
    },
  };
}

export default async function AboutPage() {
  const doctors = await getAboutDoctors();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutStructuredData(doctors)) }}
      />

      <section className="soft-page-hero py-16">
        <div className="container">
          <div className="max-w-[760px]">
            <p className="mb-4 inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-blush-deep shadow-md">
              Last reviewed {formatReviewDate(aboutReview.reviewedAt)}
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">About {clinicSettings.name}</h1>
            <p className="mt-4 text-base leading-relaxed text-text-light sm:text-lg">
              Spandan Clinic brings cardiology, endocrinology, diabetes, thyroid, diagnostic,
              education, booking, and location paths together for patients in {clinicSettings.city}.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <h2 className="heading-section mb-3 text-ink">Clinic story and purpose</h2>
              <p className="leading-relaxed text-text-light">
                The public website is organised around practical patient decisions: finding the
                right specialist, understanding available diagnostics, comparing health packages,
                and contacting or booking the clinic with clear next steps.
              </p>
              <p className="mt-4 text-sm font-semibold text-text-light">
                Content owner: {aboutReview.owner}. Review date: {formatReviewDate(aboutReview.reviewedAt)}.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {verifiedFacts.map((fact) => (
                <VerifiedFact key={fact.label} {...fact} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-bg-alt">
        <div className="container">
          <div className="mb-10 max-w-3xl">
            <h2 className="heading-section mb-2 text-ink">Care principles</h2>
            <p className="text-text-light">
              These principles describe how the public care journey is structured on the website.
            </p>
          </div>
          <div className="grid-3">
            {principles.map((principle) => (
              <article key={principle.title} className="soft-card p-6">
                <h3 className="text-lg font-bold text-ink">{principle.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-light">{principle.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="mb-10 max-w-3xl">
            <h2 className="heading-section mb-2 text-ink">Cardiology and endocrinology collaboration</h2>
            <p className="text-text-light">
              Heart, hormone, diabetes, thyroid, weight, and metabolic concerns can overlap. The
              site keeps specialist paths distinct while linking related diagnostics and packages.
            </p>
          </div>

          {doctors.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {doctors.slice(0, 2).map((doctor) => (
                <Link key={doctor.slug} href={`/doctors/${doctor.slug}`} className="soft-card block p-6">
                  <div className="flex items-start gap-4">
                    <span className="flex aspect-[4/5] w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-bg-alt text-accent">
                      {doctor.photo_url || doctor.image_url ? (
                        <img
                          src={doctor.photo_url || doctor.image_url || undefined}
                          alt={`${doctor.name} portrait`}
                          className="h-full w-full object-cover object-top"
                        />
                      ) : (
                        <UsersRound size={24} aria-hidden="true" />
                      )}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-ink">{doctor.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-accent">{doctor.speciality}</p>
                      <p className="mt-1 text-sm text-text-light">{doctor.qualifications}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="soft-card p-6">
              <p className="text-text-light">
                Public doctor summaries are temporarily unavailable. You can still contact the clinic
                or book from the public booking page.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="section bg-bg-alt">
        <div className="container">
          <div className="mb-10 max-w-3xl">
            <h2 className="heading-section mb-2 text-ink">Patient journey</h2>
            <p className="text-text-light">
              The journey is designed to be useful even before a patient shares personal details.
            </p>
          </div>
          <CareProcess />
        </div>
      </section>

      <section className="section">
        <div className="container grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <h2 className="heading-section mb-3 text-ink">Counselling, education, and access</h2>
            <p className="leading-relaxed text-text-light">
              The site supports patient education through articles, videos, and tools while keeping
              personal health information inside booking or enquiry workflows.
            </p>
            <div className="mt-6 grid gap-3">
              <p className="soft-card flex items-start gap-3 p-4 text-sm text-text-light">
                <Languages className="mt-0.5 shrink-0 text-accent" size={20} aria-hidden="true" />
                English, Hindi, and Marathi support are listed as public access information.
              </p>
              <p className="soft-card flex items-start gap-3 p-4 text-sm text-text-light">
                <Accessibility className="mt-0.5 shrink-0 text-accent" size={20} aria-hidden="true" />
                Public pages use semantic headings, descriptive links, and 44 px minimum controls.
              </p>
              <p className="soft-card flex items-start gap-3 p-4 text-sm text-text-light">
                <Stethoscope className="mt-0.5 shrink-0 text-accent" size={20} aria-hidden="true" />
                Educational content does not promise outcomes or replace a medical consultation.
              </p>
            </div>
          </div>
          <MediaBlock />
        </div>
      </section>

      <section className="soft-cta py-12">
        <div className="container grid gap-8 md:grid-cols-[1fr_0.8fr] md:items-center">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Plan your visit</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-light sm:text-base">
              {clinicSettings.address}, {clinicSettings.city}, {clinicSettings.state} {clinicSettings.pincode}
            </p>
            <p className="mt-3 text-sm font-semibold text-blush-deep">{clinicSettings.timings}</p>
          </div>
          <div className="grid gap-3 min-[420px]:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
            <Button href={whatsappLink()} target="_blank" rel="noopener noreferrer" variant="accent">
              <MessageCircle size={18} aria-hidden="true" />
              WhatsApp
            </Button>
            <Button href={`tel:${clinicSettings.phone}`} variant="outline">
              <Phone size={18} aria-hidden="true" />
              Call
            </Button>
            <Button href={clinicSettings.googleMapsUrl} target="_blank" rel="noopener noreferrer" variant="outline">
              <MapPin size={18} aria-hidden="true" />
              Map
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
