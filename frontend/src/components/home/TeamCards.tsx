import React from 'react';
import Link from 'next/link';
import { CalendarDays, ClipboardCheck, CreditCard } from 'lucide-react';

const steps = [
  {
    title: 'Choose a path',
    text: 'Start with a doctor, health package, or facility and review the public details.',
    icon: ClipboardCheck,
  },
  {
    title: 'Share visit details',
    text: 'Enter patient and contact details only in the booking flow.',
    icon: CalendarDays,
  },
  {
    title: 'Confirm and pay',
    text: 'Review fees and payment status before the clinic prepares your visit.',
    icon: CreditCard,
  },
];

export default function TeamCardsSection() {
  return (
    <section className="section">
      <div className="container">
        <div className="mb-10 max-w-3xl">
          <h2 className="heading-section mb-2 text-navy">Booking in three steps</h2>
          <p className="text-text-light">
            The booking journey keeps fees, location, and next steps visible before confirmation.
          </p>
        </div>

        <div className="grid-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="soft-card trust-card p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-accent">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span className="text-sm font-bold text-accent">Step {index + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-navy">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-light">{step.text}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
          <Link href="/book-appointment" className="btn btn-accent">
            Book Appointment
          </Link>
          <Link href="/book-package" className="btn btn-outline">
            Book Package
          </Link>
        </div>
      </div>
    </section>
  );
}
