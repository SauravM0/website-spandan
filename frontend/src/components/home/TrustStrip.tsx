import React from 'react';
import { Activity, HeartPulse, Languages, MapPin, Stethoscope } from 'lucide-react';

export default function TrustStrip() {
  const facts = [
    { icon: <Stethoscope size={22} />, label: 'Specialist doctors', text: 'Cardiology and endocrinology consultations' },
    { icon: <MapPin size={22} />, label: 'Clinic location', text: 'Garkheda, Chhatrapati Sambhajinagar' },
    { icon: <Activity size={25} />, label: 'Advanced diagnostics', text: 'CGMS, ABPM, Holter, sleep study and more' },
    { icon: <Languages size={25} />, label: '3 languages', text: 'English, Hindi, and Marathi support' },
    { icon: <HeartPulse size={25} />, label: 'Focused care', text: 'Heart, diabetes, thyroid, and metabolic health' },
  ];

  return (
    <section className="section-alt py-14 sm:py-16" aria-labelledby="why-spandan-title">
      <div className="container">
        <div className="reveal mb-8 max-w-3xl measure">
          <p className="eyebrow mb-3">Why Spandan</p>
          <h2 id="why-spandan-title" className="heading-section text-ink">
            Everything you need for a confident clinic visit
          </h2>
          <p className="mt-3 text-text-light">
            Specialist care, diagnostic support, and practical help—all in one place.
          </p>
        </div>

        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {facts.map((fact) => (
            <article key={fact.label} className="min-h-[180px] rounded-lg border border-border bg-white p-5 shadow-sm transition duration-300 ease-out hover:-translate-y-1 hover:border-border-strong hover:shadow-lg">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-wash-sage text-accent">{fact.icon}</div>
              <h3 className="font-extrabold leading-snug text-ink">{fact.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">{fact.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
