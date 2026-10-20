import React from 'react';
import { Activity, Clock, HeartPulse, MapPin, MessageCircle, Microscope, Phone, ShieldAlert, Stethoscope, Syringe, UsersRound } from 'lucide-react';
import { whatsappLink, type ClinicSettings } from '@/lib/settings';
import PulseLine from '@/components/brand/PulseLine';
import type { PublicDoctorSummary } from '@/lib/home';
import HeroVideo from './HeroVideo';
import Button from '@/components/ui/Button';

type HeroSectionProps = {
  settings: ClinicSettings;
  doctors: PublicDoctorSummary[];
};

export default function HeroSection({ settings, doctors }: HeroSectionProps) {
  const heroDoctorOrder = ['dr-tukaram-aute', 'dr-pratibha-aute'];
  const heroDoctors = [...doctors].sort((left, right) => {
    const leftPosition = heroDoctorOrder.indexOf(left.slug);
    const rightPosition = heroDoctorOrder.indexOf(right.slug);
    return (leftPosition === -1 ? heroDoctorOrder.length : leftPosition) -
      (rightPosition === -1 ? heroDoctorOrder.length : rightPosition);
  });

  return (
    <section className="soft-page-hero relative text-ink">
      {/* Signature motif: the cardiac trace runs along the base of the hero. */}
      <PulseLine
        variant="cardiac"
        animate
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full text-accent/20"
      />

      {/*
        A patient arriving here needs four things before they scroll: who the
        clinic is, what the doctors look like, where it is, and when it is open.
        On a phone the blocks below are ordered so exactly those land on the
        first screen, and the supporting copy and service pills follow after.
        From `lg` up the explicit row/column placement restores the familiar
        two-column hero, with the video and the visit details stacked together.
      */}
      <div className="container relative py-6 sm:py-12 lg:py-16">
        <div className="flex flex-col gap-4 sm:gap-5 md:grid md:grid-cols-[1.02fr_0.98fr] md:grid-rows-[auto_auto_auto] md:items-start md:gap-x-10 md:gap-y-6 lg:gap-x-12">
          <div className="order-1 md:order-none md:col-start-1 md:row-start-1">
            <p className="mb-3 hidden items-center gap-2 rounded-pill min-[375px]:inline-flex border border-border bg-white/70 px-3 py-1.5 shadow-xs backdrop-blur-sm sm:mb-4 sm:px-4 sm:py-2">
              <Stethoscope size={15} className="text-accent" aria-hidden="true" />
              <span className="eyebrow">Cardiology · Endocrinology · Diagnostics</span>
            </p>

            <h1 className="heading-display heading-display-hero max-w-[720px] text-ink">
              Specialist heart, diabetes and hormone care, centred around you
            </h1>
          </div>

          <div className="order-2 md:order-none md:col-start-2 md:row-span-3 md:row-start-1">
            <div className="soft-card trust-card relative overflow-hidden p-3 sm:p-4 md:p-5">
              <div className="aspect-video overflow-hidden rounded-2xl bg-bg-alt md:aspect-[4/3]">
                <HeroVideo />
              </div>
              <div className="grid grid-cols-2 gap-2 px-2 pb-1 pt-3 text-ink sm:gap-3 md:px-3 md:pt-5">
                {heroDoctors.length ? heroDoctors.map((doctor) => (
                  <div key={doctor.slug} className="border-t border-border pt-2 md:pt-3">
                    <p className="text-sm font-semibold text-ink">{doctor.name}</p>
                    {doctor.speciality ? (
                      <p className="mt-0.5 text-xs text-text-light">{doctor.speciality}</p>
                    ) : null}
                  </div>
                )) : (
                  <div className="rounded-2xl border border-primary/10 bg-wash-sage/70 p-3 shadow-md sm:col-span-2">
                    <span className="block text-sm font-bold">{settings.name}</span>
                    <span className="mt-1 block text-xs text-text-light">{settings.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/*
              Location, timings and the emergency note sit directly under the
              video on every size. Two columns on a phone keeps the block to a
              few lines so it clears the fold alongside everything above it.
            */}
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 rounded-2xl border border-border bg-white/60 p-3 text-sm backdrop-blur-sm sm:gap-y-3 sm:p-4 md:mt-5">
              <div>
                <dt className="eyebrow flex items-center gap-1.5">
                  <MapPin size={13} className="text-accent" aria-hidden="true" />
                  Location
                </dt>
                <dd className="mt-1 font-semibold text-ink">{settings.city}</dd>
              </div>
              <div>
                <dt className="eyebrow flex items-center gap-1.5">
                  <Clock size={13} className="text-accent" aria-hidden="true" />
                  Timings
                </dt>
                <dd className="mt-1 font-semibold text-ink">{settings.timings}</dd>
              </div>
              <div className="col-span-2 border-t border-border pt-2 sm:pt-3">
                <dt className="eyebrow flex items-center gap-1.5">
                  <ShieldAlert size={13} className="text-blush-deep" aria-hidden="true" />
                  In an emergency
                </dt>
                <dd className="mt-1 text-text-light">{settings.emergencyNote}</dd>
              </div>
            </dl>
          </div>

          <div className="order-3 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap md:order-none md:col-start-1 md:row-start-2">
            <Button href={`tel:${settings.phone}`} variant="accent">
              <Phone size={18} aria-hidden="true" />
              Call {settings.phone}
            </Button>
            <Button
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
            >
              <MessageCircle size={18} aria-hidden="true" />
              WhatsApp
            </Button>
            <Button href="/doctors" variant="ghost">
              <UsersRound size={18} aria-hidden="true" />
              Meet the doctors
            </Button>
          </div>

          <div className="order-4 md:order-none md:col-start-1 md:row-start-3">
            <p className="lede measure">
              Personalised cardiology, diabetes, thyroid, and diagnostic care from experienced
              specialists in a calm, modern clinic setting.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
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
          </div>
        </div>
      </div>
    </section>
  );
}
