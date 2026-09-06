import React from 'react';
import type { PublicDoctorSummary } from '@/lib/home';
import DoctorCard from '@/components/doctors/DoctorCard';

type Doctor = PublicDoctorSummary;

export default function DoctorCardsSection({ doctors }: { doctors: Doctor[] }) {
  if (doctors.length === 0) return null;

  return (
    <section className="section section-paper">
      <div className="mx-auto max-w-[1320px] px-6">
        <div className="reveal mx-auto mb-12 max-w-2xl text-center sm:mb-14">
          <p className="eyebrow">The specialists</p>
          <h2 className="heading-section mt-3 text-ink">Two consultants, one clinic</h2>
          <p className="lede mt-4">
            Cardiology and endocrinology under one roof — read each profile, then call or
            message the clinic to arrange a visit.
          </p>
        </div>

        {doctors.length > 0 && (
          <div className="stagger grid gap-6 xl:grid-cols-2">
            {doctors.slice(0, 2).map((doc) => (
              <DoctorCard key={doc.slug} doctor={doc} variant="home" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
