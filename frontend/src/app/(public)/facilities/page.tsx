import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  CalendarCheck,
  Car,
  CheckCircle2,
  Clock,
  HeartPulse,
  Info,
  MapPin,
  Microscope,
  Moon,
  Phone,
  Scale,
  ShieldCheck,
  Syringe,
  type LucideIcon,
} from 'lucide-react';
import { clinicSettings } from '@/lib/settings';
import { facilityReview, publishedFacilities, type FacilityCategory, type FacilityRecord } from '@/lib/facilities';

export const metadata: Metadata = {
  title: 'Facilities & Diagnostics | Spandan Super Speciality Clinic',
  description: 'Verified public information about Spandan Clinic facilities, diagnostic support, preparation, booking requirements, location, and visit expectations.',
  openGraph: {
    title: 'Facilities at Spandan Super Speciality Clinic',
    description: 'Diagnostic facility information with preparation, booking, and visit guidance.',
  },
};

const categoryOrder: FacilityCategory[] = [
  'Environment',
  'Laboratory diagnostics',
  'Cardiac diagnostics',
  'Diabetes and endocrine diagnostics',
  'Sleep and therapy support',
];

const facilityIcons: Record<string, LucideIcon> = {
  'clinic-environment': ShieldCheck,
  inbody: Scale,
  cgms: Activity,
  abpm: HeartPulse,
  holter: Microscope,
  'sleep-study': Moon,
  'insulin-pump': Syringe,
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function FacilityMediaBlock({ facility }: { facility: FacilityRecord }) {
  if (facility.media) {
    return (
      <img
        src={facility.media.src}
        alt={facility.media.alt}
        width={facility.media.width}
        height={facility.media.height}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center bg-bg-alt p-6 text-center">
      <ShieldCheck className="text-accent" size={34} aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-navy">Approved facility photo pending</p>
      <p className="mt-1 text-xs leading-relaxed text-text-light">
        This page shows verified text records until approved, patient-safe media is published.
      </p>
    </div>
  );
}

function FacilityFeature({ facility }: { facility: FacilityRecord }) {
  const Icon = facilityIcons[facility.id] || Microscope;

  return (
    <article id={facility.id} className="soft-card scroll-mt-28 overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="aspect-[4/3] lg:aspect-auto">
          <FacilityMediaBlock facility={facility} />
        </div>
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="icon-chip flex h-11 w-11 shrink-0">
              <Icon size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-text-light">{facility.category}</p>
              <h3 className="mt-1 text-xl font-bold text-navy">{facility.name}</h3>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-text-light">{facility.publicDescription}</p>

          <dl className="mt-5 grid gap-3">
            <div className="rounded-2xl bg-blue-50/60 p-3">
              <dt className="text-xs font-bold uppercase text-text-light">Purpose</dt>
              <dd className="mt-1 text-sm text-navy">{facility.purpose}</dd>
            </div>
            <div className="rounded-2xl bg-blue-50/60 p-3">
              <dt className="text-xs font-bold uppercase text-text-light">Process</dt>
              <dd className="mt-1 text-sm text-navy">{facility.process}</dd>
            </div>
            <div className="rounded-2xl bg-blue-50/60 p-3">
              <dt className="text-xs font-bold uppercase text-text-light">Preparation</dt>
              <dd className="mt-1 text-sm text-navy">{facility.preparation}</dd>
            </div>
            <div className="rounded-2xl bg-pink-50 p-3 shadow-[0_8px_22px_rgba(236,72,153,0.08)]">
              <dt className="text-xs font-bold uppercase text-pink-800">Booking requirement</dt>
              <dd className="mt-1 text-sm font-semibold text-navy">{facility.bookingRequirement}</dd>
            </div>
          </dl>

          <p className="mt-4 text-xs text-text-light">Verified {formatDate(facility.verifiedAt)}</p>
        </div>
      </div>
    </article>
  );
}

function facilitiesJsonLd(records: FacilityRecord[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    name: clinicSettings.name,
    telephone: clinicSettings.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: clinicSettings.address,
      addressLocality: clinicSettings.city,
      addressRegion: clinicSettings.state,
      postalCode: clinicSettings.pincode,
      addressCountry: 'IN',
    },
    availableService: records.map((facility) => ({
      '@type': 'MedicalProcedure',
      name: facility.name,
      description: facility.publicDescription,
    })),
  };
}

export default function FacilitiesPage() {
  const records = publishedFacilities();
  const grouped = categoryOrder
    .map((category) => ({
      category,
      records: records.filter((facility) => facility.category === category),
    }))
    .filter((group) => group.records.length > 0);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(facilitiesJsonLd(records)) }}
      />

      <section className="soft-page-hero py-16">
        <div className="container">
          <div className="max-w-[780px]">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-pink-700 shadow-[0_8px_20px_rgba(236,72,153,0.12)]">
              <ShieldCheck size={16} aria-hidden="true" />
              Verified {formatDate(facilityReview.reviewedAt)}
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">Facilities and diagnostic support</h1>
            <p className="mt-4 text-base leading-relaxed text-text-light sm:text-lg">
              Review clinic environment information, diagnostic purposes, preparation guidance,
              and booking requirements before planning a visit.
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
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <h2 className="heading-section mb-3 text-navy">Environment gallery</h2>
              <p className="leading-relaxed text-text-light">
                Approved facility photographs are not yet published in this repository. Until
                patient-safe media is approved, this page uses layout-stable placeholders and
                verified text records.
              </p>
              <p className="mt-4 text-sm font-semibold text-text-light">
                Content owner: {facilityReview.owner}. Review date: {formatDate(facilityReview.reviewedAt)}.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {['Clinic location', 'Diagnostic support', 'Visit guidance'].map((item) => (
                <div key={item} className="soft-card overflow-hidden">
                  <div className="aspect-[4/3] bg-bg-alt p-6">
                    <div className="flex h-full items-center justify-center rounded-2xl bg-white text-center text-sm font-semibold text-text-light shadow-[0_8px_22px_rgba(23,58,94,0.06)]">
                      Media pending
                    </div>
                  </div>
                  <p className="p-4 text-sm font-bold text-navy">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-bg-alt">
        <div className="container">
          <div className="mb-10 max-w-3xl">
            <h2 className="heading-section mb-2 text-navy">Diagnostic facilities by category</h2>
            <p className="text-text-light">
              Each record lists purpose, process, preparation, and whether booking or doctor advice is needed.
            </p>
          </div>

          <div className="grid gap-10">
            {grouped.map((group) => (
              <div key={group.category} id={group.category.toLowerCase().replace(/\s+/g, '-')} className="scroll-mt-28">
                <h3 className="mb-4 text-xl font-bold text-navy">{group.category}</h3>
                <div className="grid gap-6">
                  {group.records.map((facility) => (
                    <FacilityFeature key={facility.id} facility={facility} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="mb-10 max-w-3xl">
            <h2 className="heading-section mb-2 text-navy">Visit information</h2>
            <p className="text-text-light">
              Confirm test suitability and device availability before travelling for diagnostics.
            </p>
          </div>

          <div className="grid-3">
            <article className="soft-card p-6">
              <Clock className="mb-4 text-accent" size={24} aria-hidden="true" />
              <h3 className="text-lg font-bold text-navy">Timings</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">{clinicSettings.timings}</p>
            </article>
            <article className="soft-card p-6">
              <MapPin className="mb-4 text-accent" size={24} aria-hidden="true" />
              <h3 className="text-lg font-bold text-navy">Location</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                {clinicSettings.address}, {clinicSettings.city}, {clinicSettings.state} {clinicSettings.pincode}
              </p>
            </article>
            <article className="soft-card p-6">
              <Car className="mb-4 text-accent" size={24} aria-hidden="true" />
              <h3 className="text-lg font-bold text-navy">Parking and accessibility</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                Call the clinic before arrival to confirm current parking, lift, or accessibility support.
              </p>
            </article>
          </div>

          <div className="soft-card mt-8 p-5">
            <p className="flex items-start gap-3 text-sm leading-relaxed text-text-light">
              <Info className="mt-0.5 shrink-0 text-accent" size={20} aria-hidden="true" />
              Facility information helps patients plan a visit. It does not replace doctor advice,
              and diagnostic suitability depends on symptoms, history, medicines, and clinical review.
            </p>
          </div>
        </div>
      </section>

      <section className="soft-cta py-12">
        <div className="container grid gap-8 md:grid-cols-[1fr_0.8fr] md:items-center">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Confirm availability before your visit</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-light sm:text-base">
              Call or book so the clinic can confirm appointment timing, diagnostic availability, and preparation.
            </p>
          </div>
          <div className="grid gap-3 min-[420px]:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
            <Link href="/book-appointment" className="btn btn-accent">
              <CalendarCheck size={18} aria-hidden="true" />
              Book
            </Link>
            <a href={`tel:${clinicSettings.phone}`} className="btn btn-outline">
              <Phone size={18} aria-hidden="true" />
              Call
            </a>
            <a href={clinicSettings.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              <MapPin size={18} aria-hidden="true" />
              Map
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
