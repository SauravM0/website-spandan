import React from 'react';
import Link from 'next/link';
import { CalendarCheck, Clock, Languages, Stethoscope, UserRound } from 'lucide-react';
import type { PublicDoctorSummary } from '@/lib/home';
import { SpecialityBadge } from '@/components/icons/SpecialityBadge';

type DoctorCardProps = {
  doctor: PublicDoctorSummary;
  variant?: 'home' | 'list';
};

function patientPaths(doctor: PublicDoctorSummary) {
  if (doctor.expertise?.length) return doctor.expertise;

  const source = `${doctor.speciality} ${doctor.bio || ''}`.toLowerCase();
  if (source.includes('cardio') || source.includes('heart')) {
    return ['Chest pain or breathlessness review', 'Blood pressure and ECG follow-up', 'Holter or ABPM discussion'];
  }
  if (source.includes('endo') || source.includes('diabetes') || source.includes('thyroid')) {
    return ['Diabetes and CGMS review', 'Thyroid and hormone concerns', 'Weight or metabolic health discussion'];
  }
  return ['Specialist consultation', 'Report review', 'Follow-up planning'];
}

function availabilityText(doctor: PublicDoctorSummary) {
  return [doctor.available_days, doctor.available_time].filter(Boolean).join(', ') || 'Availability is confirmed during booking';
}

function doctorType(doctor: PublicDoctorSummary) {
  const source = `${doctor.slug} ${doctor.speciality}`.toLowerCase();
  if (source.includes('cardio') || source.includes('heart')) return 'cardiology';
  if (source.includes('endo') || source.includes('diabetes') || source.includes('thyroid')) return 'endocrinology';
  return null;
}

export default function DoctorCard({ doctor, variant = 'list' }: DoctorCardProps) {
  const imageSrc = doctor.photo_url || doctor.image_url || undefined;
  const paths = patientPaths(doctor).slice(0, variant === 'home' ? 4 : 5);
  const languages = doctor.languages?.length ? doctor.languages.join(', ') : 'English, Hindi, Marathi';
  const canBook = doctor.booking_enabled !== false && Boolean(doctor.id);
  const badgeType = doctorType(doctor);

  return (
    <article className="card trust-card flex h-full flex-col p-5 sm:p-6">
      <div className="flex gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[34%_66%_47%_53%/48%_36%_64%_52%] bg-bg-alt text-accent">
          {imageSrc ? (
            <img src={imageSrc} alt={doctor.name} className="h-full w-full object-cover" />
          ) : (
            <UserRound size={36} aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <h2 className={variant === 'home' ? 'text-lg font-bold text-navy' : 'text-xl font-bold text-navy'}>
            {doctor.name}
          </h2>
          <p className="mt-1 text-sm font-semibold text-accent">{doctor.speciality}</p>
          <p className="mt-1 text-sm leading-relaxed text-text-light">{doctor.qualifications}</p>
          {badgeType && (
            <div className="mt-3">
              <SpecialityBadge type={badgeType} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-navy">
          <Stethoscope size={16} aria-hidden="true" />
          Patient paths
        </p>
        <ul className="grid gap-2 text-sm text-text-light">
          {paths.map((path) => (
            <li key={path} className="rounded-2xl bg-white px-3 py-2 shadow-[0_6px_16px_rgba(23,58,94,0.04)]">
              {path}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 grid gap-2 text-sm text-text-light">
        <p className="flex items-start gap-2 rounded-2xl bg-blue-50/60 px-3 py-2">
          <Languages size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
          <span>{languages}</span>
        </p>
        <p className="flex items-start gap-2 rounded-2xl bg-blue-50/60 px-3 py-2">
          <Clock size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
          <span>{availabilityText(doctor)}</span>
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-5 min-[420px]:flex-row">
        <Link href={`/doctors/${doctor.slug}`} className="btn btn-outline btn-sm flex-1">
          View Profile
        </Link>
        {canBook ? (
          <Link href={`/book-appointment?doctor=${doctor.id}`} className="btn btn-accent btn-sm flex-1" aria-label={`Book with ${doctor.name}`}>
            <CalendarCheck size={16} aria-hidden="true" />
            Book
          </Link>
        ) : (
          <Link href="/contact" className="btn btn-outline btn-sm flex-1">
            Contact
          </Link>
        )}
      </div>
    </article>
  );
}
