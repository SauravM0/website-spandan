import React from 'react';
import Link from 'next/link';
import { Activity, CalendarCheck, HeartPulse, Microscope, Phone, Stethoscope, Syringe, UsersRound } from 'lucide-react';
import type { ClinicSettings } from '@/lib/settings';
import type { PublicDoctorSummary } from '@/lib/home';
import HeroVideo from './HeroVideo';

type HeroSectionProps = {
  settings: ClinicSettings;
  doctors: PublicDoctorSummary[];
};

export default function HeroSection({ settings, doctors }: HeroSectionProps) {
  return (
    <section className="soft-page-hero text-navy">
      <div className="container grid min-h-[620px] items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
        <div className="max-w-3xl">
          <p className="soft-card trust-card mb-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-accent">
            <Stethoscope size={16} aria-hidden="true" />
            Cardiology, endocrinology, diabetes, thyroid, and diagnostics
          </p>

          <h1 className="heading-display mb-5 max-w-[720px] text-navy">
            Find the right specialist path at Spandan Clinic
          </h1>

          <p className="mb-7 max-w-[620px] text-base leading-relaxed text-text-light sm:text-lg">
            Book a consultation, compare health packages, or call the clinic with clear location,
            timings, and payment steps before you visit.
          </p>

          <div className="mb-7 flex flex-wrap gap-2">
            <span className="clinical-pill">
              <HeartPulse size={15} aria-hidden="true" />
              ECG, BP and cardiac review
            </span>
            <span className="clinical-pill">
              <Activity size={15} aria-hidden="true" />
              Diabetes and CGMS
            </span>
            <span className="clinical-pill">
              <Syringe size={15} aria-hidden="true" />
              Insulin therapy support
            </span>
            <span className="clinical-pill">
              <Microscope size={15} aria-hidden="true" />
              Diagnostics
            </span>
          </div>

          <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
            <Link href="/book-appointment" className="btn btn-accent">
              <CalendarCheck size={18} aria-hidden="true" />
              Book Appointment
            </Link>
            <Link href="/doctors" className="btn btn-outline">
              <UsersRound size={18} aria-hidden="true" />
              View Doctors
            </Link>
            <a href={`tel:${settings.phone}`} className="btn btn-outline">
              <Phone size={18} aria-hidden="true" />
              Call Clinic
            </a>
          </div>

          <div className="mt-8 grid gap-3 text-sm text-text-light sm:grid-cols-3">
            <p className="soft-card trust-card p-4">
              <span className="block font-semibold text-navy">Location</span>
              {settings.city}
            </p>
            <p className="soft-card trust-card p-4">
              <span className="block font-semibold text-navy">Timings</span>
              {settings.timings}
            </p>
            <p className="soft-card trust-card p-4">
              <span className="block font-semibold text-navy">Emergency note</span>
              {settings.emergencyNote}
            </p>
          </div>
        </div>

        <div>
          <div className="soft-card trust-card relative overflow-hidden p-4 sm:p-5">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-bg-alt">
              <HeroVideo />
            </div>
            <div className="grid gap-3 p-5 text-navy sm:grid-cols-2">
              {doctors.length ? doctors.map((doctor) => (
                <Link key={doctor.slug} href={`/doctors/${doctor.slug}`} className="rounded-2xl border border-primary/10 bg-blue-50/70 p-3 shadow-[0_8px_22px_rgba(43,138,198,0.07)] transition-all duration-300 hover:-translate-y-0.5 hover:border-pink-300/40 hover:bg-white hover:shadow-[0_12px_28px_rgba(43,138,198,0.12)]">
                  <span className="block text-sm font-bold">{doctor.name}</span>
                  <span className="mt-1 block text-xs text-text-light">{doctor.speciality}</span>
                </Link>
              )) : (
                <div className="rounded-2xl border border-primary/10 bg-blue-50/70 p-3 shadow-[0_8px_22px_rgba(43,138,198,0.07)] sm:col-span-2">
                  <span className="block text-sm font-bold">{settings.name}</span>
                  <span className="mt-1 block text-xs text-text-light">{settings.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
