import React from 'react';
import Link from 'next/link';
import { Activity, HeartPulse, Monitor, Moon, Scale, Syringe, type LucideIcon } from 'lucide-react';
import { publishedFacilities } from '@/lib/facilities';

const iconMap: Record<string, LucideIcon> = {
  inbody: Scale,
  cgms: Activity,
  abpm: HeartPulse,
  holter: Monitor,
  'sleep-study': Moon,
  'insulin-pump': Syringe,
};

export default function EquipmentShowcase() {
  const equipment = publishedFacilities().filter((facility) => facility.category !== 'Environment').slice(0, 6);

  return (
    <section className="section section-alt">
      <div className="container">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="heading-section mb-2 text-navy">Facilities and diagnostics</h2>
            <p className="max-w-2xl text-text-light">
              Clinic diagnostics are shown as availability information, not as a substitute for medical advice.
            </p>
          </div>
          <Link href="/facilities" className="btn btn-outline self-start md:self-auto">
            View Facilities
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {equipment.map((item) => {
            const Icon = iconMap[item.id] || Activity;
            return (
              <article key={item.id} className="soft-card trust-card p-5">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-accent">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="font-bold text-navy">{item.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-text-light">{item.publicDescription}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
