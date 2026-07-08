import React from 'react';
import type { PublicDoctorSummary } from '@/lib/home';
import DoctorCard from '@/components/doctors/DoctorCard';

type Doctor = PublicDoctorSummary;

export default function DoctorCardsSection({ doctors }: { doctors: Doctor[] }) {
  if (doctors.length === 0) return null;

  return (
    <section className="section">
      <div className="container">
        <div className="mb-12 text-center">
          <h2 className="heading-section mb-2 text-navy">Our Specialist Doctors</h2>
          <p className="text-lg text-text-light">Choose the right specialist and continue into confirmed slot booking.</p>
        </div>

        {doctors.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {doctors.slice(0, 2).map((doc) => (
              <DoctorCard key={doc.slug} doctor={doc} variant="home" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
