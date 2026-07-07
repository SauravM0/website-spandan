'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, UserRound } from 'lucide-react';
import { getDoctors } from '../../lib/api';
import { SpecialityBadge } from '../icons/SpecialityBadge';

interface Doctor {
  id?: string;
  slug: string;
  name: string;
  speciality: string;
  qualifications: string;
  bio?: string;
  image_url?: string;
  available_days?: string;
  available_time?: string;
}

function getFocusAreas(doc: Doctor) {
  const source = `${doc.speciality} ${doc.bio || ''}`.toLowerCase();
  if (source.includes('cardio') || doc.slug?.includes('aute')) {
    return ['Chest pain evaluation', 'Blood pressure review', 'ECG and Holter guidance', 'Preventive heart care'];
  }
  if (source.includes('endo') || source.includes('diabetes') || doc.slug?.includes('pawal')) {
    return ['Diabetes care', 'Thyroid disorders', 'Hormone health', 'Metabolic review'];
  }
  return ['Specialist consultation', 'Report review', 'Follow-up planning'];
}

function DoctorCard({ doc }: { doc: Doctor }) {
  const isCardiology = doc.slug === 'dr-aute' || (doc.slug?.includes('aute') && !doc.slug?.includes('pawal'));
  const isEndocrinology = doc.slug === 'dr-pawal-aute' || doc.slug?.includes('pawal');
  const availability = [doc.available_days, doc.available_time].filter(Boolean).join(', ') || 'Next availability shown while booking';

  return (
    <article className="card flex h-full flex-col p-6">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-alt text-xl font-bold text-navy">
          {doc.image_url ? (
            <img src={doc.image_url} alt={doc.name} className="h-full w-full object-cover" />
          ) : (
            <UserRound size={34} />
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold text-navy">{doc.name}</h3>
          <p className="mt-1 text-sm font-semibold text-accent">{doc.speciality}</p>
          <p className="mt-1 text-xs text-text-light">{doc.qualifications}</p>
          {(isCardiology || isEndocrinology) && (
            <div className="mt-2">
              <SpecialityBadge type={isCardiology ? 'cardiology' : 'endocrinology'} />
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 grid gap-2">
        {getFocusAreas(doc).map((area) => (
          <span key={area} className="rounded-md bg-bg-alt px-3 py-2 text-sm text-text-light">
            {area}
          </span>
        ))}
      </div>

      <div className="mt-auto rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
        <p className="font-semibold">Next availability</p>
        <p className="mt-1">{availability}</p>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link href={`/doctors/${doc.slug}`} className="btn btn-outline btn-sm flex-1">
          View Profile
        </Link>
        <Link href="/book-appointment" className="btn btn-accent btn-sm flex-1">
          <CalendarCheck size={16} />
          Book
        </Link>
      </div>
    </article>
  );
}

export default function DoctorCardsSection() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDoctors()
      .then((d) => setDoctors(d.doctors || []))
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="section">
      <div className="container">
        <div className="mb-12 text-center">
          <h2 className="heading-section mb-2 text-navy">Our Specialist Doctors</h2>
          <p className="text-lg text-text-light">Choose the right specialist and continue into confirmed slot booking.</p>
        </div>

        {loading && <p className="text-center text-text-light">Loading doctors...</p>}
        {!loading && doctors.length === 0 && <p className="text-center text-text-light">No doctors available.</p>}
        {!loading && doctors.length > 0 && (
          <div className="grid-3">
            {doctors.map((doc) => (
              <DoctorCard key={doc.slug} doc={doc} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
