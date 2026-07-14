import React from 'react';
import { Activity, Languages, MapPin, ShieldCheck, Stethoscope } from 'lucide-react';

export default function TrustStrip() {
  const facts = [
    { icon: <Stethoscope size={22} />, label: 'Specialist doctors', text: 'Cardiology and endocrinology consultations' },
    { icon: <MapPin size={22} />, label: 'Clinic location', text: 'Garkheda, Chhatrapati Sambhajinagar' },
    { icon: <Activity size={25} />, label: 'Advanced diagnostics', text: 'CGMS, ABPM, Holter, sleep study and more' },
    { icon: <Languages size={25} />, label: '3 languages', text: 'English, Hindi, and Marathi support' },
    { icon: <ShieldCheck size={25} />, label: 'Secure payments', text: 'Online payment flow with receipt status' },
  ];

  return (
    <section className="section-alt py-14 sm:py-16" aria-labelledby="why-spandan-title">
      <div className="container">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-pink-600">Why Spandan</p>
          <h2 id="why-spandan-title" className="text-2xl font-extrabold text-navy sm:text-3xl">
            Everything you need for a confident clinic visit
          </h2>
          <p className="mt-3 text-text-light">
            Specialist care, diagnostic support, and practical help—all in one place.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {facts.map((fact) => (
            <article key={fact.label} className="min-h-[180px] rounded-[20px] border border-primary/25 bg-white p-5 shadow-[0_12px_30px_rgba(23,58,94,0.07)] transition duration-300 hover:-translate-y-1 hover:border-accent/45 hover:shadow-[0_18px_38px_rgba(43,138,198,0.12)]">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-accent">{fact.icon}</div>
              <h3 className="font-extrabold leading-snug text-navy">{fact.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">{fact.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
