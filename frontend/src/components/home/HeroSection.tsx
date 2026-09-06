import React from 'react';
import { Activity, HeartPulse, MessageCircle, Microscope, Phone, Stethoscope, Syringe, UsersRound } from 'lucide-react';
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
      <div className="container relative grid min-h-[620px] items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-pill border border-border bg-white/70 px-4 py-2 shadow-xs backdrop-blur-sm">
            <Stethoscope size={15} className="text-accent" aria-hidden="true" />
            <span className="eyebrow">Cardiology · Endocrinology · Diagnostics</span>
          </p>

          <h1 className="heading-display mb-5 max-w-[720px] text-ink">
            Specialist heart and diabetes care, centred around you
          </h1>

          <p className="lede measure mb-8">
            Personalised cardiology, diabetes, thyroid, and diagnostic care from experienced
            specialists in a calm, modern clinic setting.
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

          <dl className="mt-10 grid gap-x-8 gap-y-4 border-t border-border pt-6 text-sm sm:grid-cols-3">
            <div>
              <dt className="eyebrow">Location</dt>
              <dd className="mt-1 font-semibold text-ink">{settings.city}</dd>
            </div>
            <div>
              <dt className="eyebrow">Timings</dt>
              <dd className="mt-1 font-semibold text-ink">{settings.timings}</dd>
            </div>
            <div>
              <dt className="eyebrow">In an emergency</dt>
              <dd className="mt-1 text-text-light">{settings.emergencyNote}</dd>
            </div>
          </dl>
        </div>

        <div>
          <div className="soft-card trust-card relative overflow-hidden p-4 sm:p-5">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-bg-alt">
              <HeroVideo />
            </div>
            <div className="grid gap-3 p-5 pt-6 text-ink sm:grid-cols-2">
              {heroDoctors.length ? heroDoctors.map((doctor) => (
                <div key={doctor.slug} className="border-t border-border pt-3">
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
        </div>
      </div>
    </section>
  );
}
