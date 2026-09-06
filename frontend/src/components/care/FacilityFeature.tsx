import React from 'react';
import Image from 'next/image';
import {
  Activity,
  HeartPulse,
  Microscope,
  Moon,
  Scale,
  ShieldCheck,
  Syringe,
  type LucideIcon,
} from 'lucide-react';
import type { FacilityRecord } from '@/lib/facilities';

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
      <Image
        src={facility.media.src}
        alt={facility.media.alt}
        width={facility.media.width}
        height={facility.media.height}
        sizes="(min-width: 1024px) 45vw, 100vw"
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center bg-bg-alt p-6 text-center">
      <ShieldCheck className="text-accent" size={34} aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-ink">Approved facility photo pending</p>
      <p className="mt-1 text-xs leading-relaxed text-text-light">
        This page shows verified text records until approved, patient-safe media is published.
      </p>
    </div>
  );
}

export default function FacilityFeature({ facility }: { facility: FacilityRecord }) {
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
              <h3 className="mt-1 text-xl font-bold text-ink">{facility.name}</h3>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-text-light">{facility.publicDescription}</p>

          <dl className="mt-5 grid gap-3">
            <div className="rounded-2xl bg-wash-sage/60 p-3">
              <dt className="text-xs font-bold uppercase text-text-light">Purpose</dt>
              <dd className="mt-1 text-sm text-ink">{facility.purpose}</dd>
            </div>
            <div className="rounded-2xl bg-wash-sage/60 p-3">
              <dt className="text-xs font-bold uppercase text-text-light">Process</dt>
              <dd className="mt-1 text-sm text-ink">{facility.process}</dd>
            </div>
            <div className="rounded-2xl bg-wash-sage/60 p-3">
              <dt className="text-xs font-bold uppercase text-text-light">Preparation</dt>
              <dd className="mt-1 text-sm text-ink">{facility.preparation}</dd>
            </div>
            <div className="rounded-2xl bg-wash-blush p-3 shadow-md">
              <dt className="text-xs font-bold uppercase text-blush-deep">Before your visit</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">{facility.visitRequirement}</dd>
            </div>
          </dl>

          <p className="mt-4 text-xs text-text-light">Verified {formatDate(facility.verifiedAt)}</p>
        </div>
      </div>
    </article>
  );
}
