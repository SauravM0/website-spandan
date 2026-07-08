import React from 'react';
import Link from 'next/link';
import { Activity, Baby, Bone, HeartPulse, Microscope, Scale, ShieldPlus, Sparkles } from 'lucide-react';
import type { PublicDoctorSummary } from '@/lib/home';

type ServiceCardsProps = {
  doctors: PublicDoctorSummary[];
};

const intentConfig = [
  { title: 'Diabetes', text: 'Sugar patterns, CGMS, medicines, and follow-up planning.', icon: Activity, match: ['diabetes', 'endo'] },
  { title: 'Thyroid', text: 'Thyroid symptoms, reports, and long-term monitoring.', icon: ShieldPlus, match: ['thyroid', 'endo'] },
  { title: 'Heart', text: 'Chest pain, BP, ECG, Holter, and cardiac risk review.', icon: HeartPulse, match: ['cardio', 'heart'] },
  { title: 'Child Growth / Puberty', text: 'Growth, puberty, and hormone concerns.', icon: Baby, match: ['endo', 'hormone'] },
  { title: 'Weight', text: 'Body composition and metabolic risk assessment.', icon: Scale, match: ['diabetes', 'endo'] },
  { title: 'PCOS', text: 'Cycle, hormone, weight, and metabolic evaluation.', icon: Sparkles, match: ['endo', 'hormone'] },
  { title: 'Bone', text: 'Vitamin D, calcium, bone health, and endocrine review.', icon: Bone, match: ['endo'] },
  { title: 'Diagnostics', text: 'InBody, CGMS, ABPM, Holter, and sleep study support.', icon: Microscope, href: '/facilities' },
];

function doctorHref(doctors: PublicDoctorSummary[], matches: string[] = []) {
  const doctor = doctors.find((item) => {
    const source = `${item.slug} ${item.name} ${item.speciality} ${item.bio || ''}`.toLowerCase();
    return matches.some((match) => source.includes(match));
  });
  return doctor ? `/doctors/${doctor.slug}` : '/doctors';
}

export default function ServiceCards({ doctors }: ServiceCardsProps) {
  return (
    <section className="section">
      <div className="container">
        <div className="mb-10 max-w-3xl">
          <h2 className="heading-section mb-2 text-navy">Start with what you need care for</h2>
          <p className="text-text-light">
            Choose a common patient path and continue to the relevant specialist, facility, or booking flow.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {intentConfig.map((service, index) => {
            const Icon = service.icon;
            const href = service.href || doctorHref(doctors, service.match);
            return (
              <Link
                key={service.title}
                href={href}
                className={`soft-card trust-card p-5 transition-all duration-300 hover:-translate-y-1 ${
                  index === 0 || index === 2 ? 'lg:col-span-2' : ''
                }`}
              >
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-accent">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="text-lg font-bold text-navy">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-light">{service.text}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
