import React from 'react';
import Link from 'next/link';
import { CalendarCheck, CheckCircle2, Clock, Languages, Stethoscope, UserRound } from 'lucide-react';
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

function localDoctorPhoto(doctor: PublicDoctorSummary) {
  const source = `${doctor.slug} ${doctor.name}`.toLowerCase();
  if (source.includes('pratibha')) return '/doctors/dr-pratibha-pawal-aute.png';
  if (source.includes('tukaram')) return '/doctors/dr-tukaram-sonaji-aute.png';
  return undefined;
}

function HomeDoctorCard({ doctor }: { doctor: PublicDoctorSummary }) {
  const imageSrc = doctor.photo_url || doctor.image_url || localDoctorPhoto(doctor);
  const paths = patientPaths(doctor).slice(0, 3);
  const languages = doctor.languages?.length ? doctor.languages.join(', ') : 'English, Hindi, Marathi';
  const doctorReference = doctor.id || doctor.slug;
  const canBook = doctor.booking_enabled !== false && Boolean(doctorReference);
  const badgeType = doctorType(doctor);
  const isEndocrinology = badgeType === 'endocrinology';

  return (
    <article
      className={`group relative grid h-full overflow-hidden rounded-[28px] border bg-white shadow-[0_18px_48px_rgba(23,58,94,0.09)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_58px_rgba(43,138,198,0.15)] ${
        isEndocrinology ? 'border-pink-200/80' : 'border-primary/30'
      } sm:grid-cols-[minmax(260px,44%)_minmax(0,1fr)]`}
    >
      <div
        className={`relative min-h-[320px] overflow-hidden sm:h-full sm:min-h-[520px] ${
          isEndocrinology
            ? 'bg-gradient-to-br from-pink-50 via-white to-blue-50'
            : 'bg-gradient-to-br from-blue-50 via-white to-slate-50'
        }`}
      >
        <div className="absolute inset-3 flex items-center justify-center overflow-hidden rounded-[22px]">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={`${doctor.name} portrait`}
              className="h-auto max-h-full w-auto max-w-full rounded-[22px] object-contain object-center transition duration-500 group-hover:scale-[1.01]"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <UserRound size={72} className="text-accent" aria-hidden="true" />
            </span>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-col p-6 sm:p-7">
        <div>
          <p className={`text-sm font-bold ${isEndocrinology ? 'text-pink-600' : 'text-accent'}`}>
            {doctor.speciality}
          </p>
          <h3 className="mt-2 text-2xl font-extrabold leading-tight text-navy">{doctor.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-light">{doctor.qualifications}</p>
        </div>

        <div className="mt-6 border-t border-primary/10 pt-5">
          <h4 className="text-sm font-extrabold text-navy">Common reasons to visit</h4>
          <ul className="mt-4 grid gap-3.5">
            {paths.map((path) => (
              <li key={path} className="flex items-start gap-3 text-sm leading-relaxed text-text-light">
                <CheckCircle2
                  size={18}
                  className={`mt-0.5 shrink-0 ${isEndocrinology ? 'text-pink-500' : 'text-accent'}`}
                  aria-hidden="true"
                />
                <span>{path}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 grid gap-3 border-t border-primary/10 pt-5 text-xs leading-relaxed text-text-light xl:grid-cols-2">
          <p className="flex items-start gap-2">
            <Languages size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <span>{languages}</span>
          </p>
          <p className="flex items-start gap-2">
            <Clock size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <span>{availabilityText(doctor)}</span>
          </p>
        </div>

        <div className="mt-auto grid gap-3 pt-6 min-[440px]:grid-cols-2">
          <Link href={`/doctors/${doctor.slug}`} className="btn btn-outline btn-sm w-full">
            View profile
          </Link>
          {canBook ? (
            <Link
              href={`/book-appointment?doctor=${encodeURIComponent(doctorReference)}`}
              className="btn btn-accent btn-sm w-full"
              aria-label={`Book an appointment with ${doctor.name}`}
            >
              <CalendarCheck size={16} aria-hidden="true" />
              Book appointment
            </Link>
          ) : (
            <Link href="/contact" className="btn btn-outline btn-sm w-full">
              Contact clinic
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default function DoctorCard({ doctor, variant = 'list' }: DoctorCardProps) {
  if (variant === 'home') return <HomeDoctorCard doctor={doctor} />;

  const imageSrc = doctor.photo_url || doctor.image_url || localDoctorPhoto(doctor);
  const paths = patientPaths(doctor).slice(0, 5);
  const languages = doctor.languages?.length ? doctor.languages.join(', ') : 'English, Hindi, Marathi';
  const canBook = doctor.booking_enabled !== false && Boolean(doctor.id);
  const badgeType = doctorType(doctor);
  const portraitSize = 'w-40 sm:w-52 xl:w-60';

  return (
    <article className="card trust-card flex h-full flex-col p-5 sm:p-6">
      <div className="flex gap-4">
        <div className={`flex aspect-[4/5] ${portraitSize} shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-bg-alt text-accent`}>
          {imageSrc ? (
            <img src={imageSrc} alt={`${doctor.name} portrait`} className="h-full w-full object-cover object-top" />
          ) : (
            <UserRound size={36} aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-navy">
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
        <Link href="/doctors" className="btn btn-outline btn-sm flex-1">
          Our Doctors
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
