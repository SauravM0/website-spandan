import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us | Spandan Super Speciality Clinic',
  description: 'Learn about Spandan Clinic\'s mission, specialist care, and commitment to advanced diagnostic healthcare in Chhatrapati Sambhajinagar.',
  openGraph: {
    title: 'About Spandan Super Speciality Clinic',
    description: 'Advanced diagnostics and specialist care in Chhatrapati Sambhajinagar.',
  },
};

const carePillars = [
  { value: '2', label: 'Core Specialist Areas' },
  { value: '3', label: 'Languages Supported' },
  { value: '4', label: 'Health Package Types' },
  { value: '6', label: 'Days Open Weekly' },
];

const milestones = [
  { year: 'Care', title: 'Specialist Consultations', desc: 'Focused cardiology, endocrinology, and general health guidance with a patient-first consultation experience.' },
  { year: 'Tests', title: 'Advanced Diagnostics', desc: 'Health packages and diagnostic services designed to help patients understand risk early and act with confidence.' },
  { year: 'Follow-up', title: 'Continuity of Care', desc: 'Enquiry tracking, staff follow-up, and clear next steps after each package or consultation request.' },
  { year: 'Access', title: 'Local Convenience', desc: 'A conveniently located clinic serving families across Chhatrapati Sambhajinagar and nearby areas.' },
];

export default function AboutPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-navy to-navy-light text-white py-16 text-center">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">About Us</h1>
          <p className="opacity-85 text-lg max-w-[650px] mx-auto">
            Spandan Super Speciality Clinic brings specialist care, diagnostics, and practical follow-up support together for local families.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid-4 gap-6 mb-16">
            {carePillars.map((stat) => (
              <div key={stat.label} className="text-center p-8 bg-bg-alt rounded-lg">
                <div className="text-4xl font-extrabold text-accent mb-1">{stat.value}</div>
                <div className="text-sm text-text-light">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="max-w-[800px] mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">How We Care</h2>
            <p className="text-text-light leading-relaxed text-center mb-12">
              Our work is built around clear diagnosis, careful counselling, and a clinic experience that respects each patient's time and trust.
            </p>

            {milestones.map((m) => (
              <div key={m.year} className="flex gap-6 mb-6">
                <div className="text-center flex-shrink-0 w-20">
                  <div className="text-lg font-bold text-accent">{m.year}</div>
                </div>
                <div className="p-5 bg-bg-alt rounded-lg flex-1 border-l-4 border-accent">
                  <h3 className="font-semibold mb-1">{m.title}</h3>
                  <p className="text-sm text-text-light">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="mb-6 text-lg text-text-light">Ready to experience the Spandan difference?</p>
            <Link href="/contact" className="btn bg-accent text-white hover:bg-accent-light">Contact Us</Link>
          </div>
        </div>
      </section>
    </>
  );
}
