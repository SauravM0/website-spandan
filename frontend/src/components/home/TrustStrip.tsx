import React from 'react';
import { BadgeCheck, Languages, MapPin, ShieldCheck, Stethoscope } from 'lucide-react';

export default function TrustStrip() {
  const facts = [
    { icon: <Stethoscope size={22} />, label: 'Specialist doctors', text: 'Cardiology and endocrinology consultations' },
    { icon: <MapPin size={22} />, label: 'Clinic location', text: 'Garkheda, Chhatrapati Sambhajinagar' },
    { icon: <BadgeCheck size={22} />, label: 'Diagnostics', text: 'InBody, CGMS, ABPM, Holter, sleep study' },
    { icon: <Languages size={22} />, label: 'Languages', text: 'English, Hindi, and Marathi support' },
    { icon: <ShieldCheck size={22} />, label: 'Secure payment', text: 'Online payment flow with receipt status' },
  ];

  return (
    <section className="section-alt py-10">
      <div className="container">
        <div className="grid gap-3 md:grid-cols-5">
          {facts.map((fact) => (
            <div key={fact.label} className="soft-card trust-card p-4">
              <div className="mb-3 text-accent">{fact.icon}</div>
              <p className="font-semibold text-navy">{fact.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-text-light">{fact.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
