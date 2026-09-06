import React from 'react';
import { Languages, MapPin, Phone, ShieldCheck, type LucideIcon } from 'lucide-react';
import { clinicSettings } from '@/lib/settings';
import Button from '@/components/ui/Button';

// Governance metadata carried over from the retired About page, so the review
// trail stays visible on whichever page holds this content.
const clinicReview = {
  owner: 'Clinic administration',
  reviewedAt: '2026-07-07',
};

const verifiedFacts: { label: string; value: string; icon: LucideIcon }[] = [
  { label: 'Clinic', value: clinicSettings.name, icon: ShieldCheck },
  { label: 'Location', value: `${clinicSettings.city}, ${clinicSettings.state}`, icon: MapPin },
  { label: 'Public contact', value: clinicSettings.phone, icon: Phone },
  { label: 'Languages', value: 'English, Hindi, and Marathi', icon: Languages },
];

const principles = [
  {
    title: 'Two specialities, one clinic',
    text: 'Cardiology and endocrinology sit under the same roof, so heart, hormone, diabetes, thyroid and metabolic concerns can be reviewed together rather than across separate visits.',
  },
  {
    title: 'Diagnostics on site',
    text: 'ECG, 2D echo, TMT, Holter, ABPM, CGMS, body composition and laboratory analysis are run in the clinic, which keeps the loop between test and consultation short.',
  },
  {
    title: 'Education, kept separate from advice',
    text: 'Articles, videos and health calculators are public education. They are deliberately kept apart from personal medical history, and never replace a consultation.',
  },
];

function formatReviewDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ClinicStory() {
  return (
    <section className="section section-alt" aria-labelledby="about-clinic-title">
      <div className="container">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="reveal measure">
            <p className="eyebrow">About the clinic</p>
            <h2 id="about-clinic-title" className="heading-section mt-3 text-ink">
              A super speciality clinic for heart and metabolic care
            </h2>
            <p className="lede mt-4">
              Spandan brings cardiology and endocrinology together in {clinicSettings.city}, with the
              diagnostics that support both running in the same building.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-text-light">
              {clinicSettings.emergencyNote} For anything else, the clinic team confirms
              availability, preparation and next steps by phone or WhatsApp before you travel.
            </p>

            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              {verifiedFacts.map((fact) => {
                const Icon = fact.icon;
                return (
                  <div key={fact.label} className="card p-4">
                    <dt className="flex items-center gap-2">
                      <Icon size={15} className="text-accent" aria-hidden="true" />
                      <span className="eyebrow">{fact.label}</span>
                    </dt>
                    <dd className="mt-2 text-sm font-semibold text-ink">{fact.value}</dd>
                  </div>
                );
              })}
            </dl>

            <p className="mt-6 text-xs text-text-light">
              Content owner: {clinicReview.owner}. Reviewed {formatReviewDate(clinicReview.reviewedAt)}.
            </p>
          </div>

          <div className="stagger grid gap-4">
            {principles.map((principle) => (
              <article key={principle.title} className="card p-6">
                <h3 className="heading-card text-ink">{principle.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-light">{principle.text}</p>
              </article>
            ))}
            <div className="flex flex-wrap gap-3">
              <Button href="/doctors" variant="outline">
                Meet the specialists
              </Button>
              <Button href="/care" variant="ghost">
                See what we test
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
