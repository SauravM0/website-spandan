import React from 'react';
import Link from 'next/link';
import { ArrowRight, GraduationCap } from 'lucide-react';
import {
  earliestYearAtClinic,
  membershipCount,
  trainingInstitutions,
  doctorProfileList,
} from '@/lib/doctorProfiles';
import { researchPublications } from '@/lib/publications';

/**
 * The clinic's strongest trust signal is verifiable training and academic work,
 * so this band states those facts plainly. Every figure is computed from the
 * CV-derived profile and publication data rather than typed in, which keeps the
 * home page honest as the profiles change.
 */
export default function CredentialsBand() {
  const stats = [
    { value: String(doctorProfileList.length), label: 'DM super-specialists', detail: 'Cardiology and endocrinology' },
    { value: String(researchPublications.length), label: 'Peer-reviewed papers', detail: 'Case reports and clinical studies' },
    { value: String(earliestYearAtClinic()), label: 'Consulting at Spandan since', detail: 'Chhatrapati Sambhajinagar' },
    { value: String(membershipCount()), label: 'Professional society memberships', detail: 'Including ESI, RSSDI, and CSI' },
  ];
  const institutions = trainingInstitutions();

  return (
    <section
      className="relative overflow-hidden bg-[#1f3529] py-20 text-[#f3efe6] sm:py-24"
      aria-labelledby="credentials-title"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 20%, #f6e7e4 0, transparent 38%), radial-gradient(circle at 85% 90%, #8db29b 0, transparent 42%)',
        }}
        aria-hidden="true"
      />

      <div className="container relative">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-end">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b9d3c2]">
              Credentials, not claims
            </p>
            <h2
              id="credentials-title"
              className="heading-section mt-4 text-[#fbf8f2]"
            >
              Trained at Mumbai&rsquo;s leading teaching hospitals. Teaching the next generation here.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-relaxed text-[#d7d0c3] sm:text-lg lg:justify-self-end">
            Both consultants hold DM super-speciality degrees, teach at MGM Medical College, and
            publish in national and international journals. Every figure on this page can be checked
            against their published profiles.
          </p>
        </div>

        <dl className="mt-14 grid grid-cols-2 border-t border-white/15 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={[
                'flex flex-col border-b border-white/15 py-8 pr-4 lg:border-b-0',
                index % 2 === 1 ? 'border-l pl-5 sm:pl-8' : '',
                index === 2 ? 'lg:border-l lg:pl-8' : '',
              ].join(' ')}
            >
              {/* dt precedes dd in the DOM for screen readers; order puts the figure first visually. */}
              <dt className="order-2 mt-4 text-sm font-semibold text-[#fbf8f2]">{stat.label}</dt>
              <dd
                className="order-1 font-display text-5xl font-semibold leading-none tracking-tight text-[#fbf8f2] tabular-nums sm:text-6xl"
                style={{ fontVariationSettings: "'SOFT' 40, 'WONK' 0, 'opsz' 144" }}
              >
                {stat.value}
              </dd>
              <dd className="order-3 mt-1 text-xs leading-relaxed text-[#b8b0a2]">{stat.detail}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 grid gap-8 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-14">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#b9d3c2]">
            <GraduationCap size={16} aria-hidden="true" />
            Post-graduate training
          </p>
          <ul className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {institutions.map((institution) => (
              <li key={institution} className="border-l border-[#8db29b]/50 pl-4 text-sm leading-relaxed text-[#e9e3d8]">
                {institution}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3">
          {doctorProfileList.map((profile) => (
            <Link
              key={profile.slug}
              href={`/doctors/${profile.slug}`}
              className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[#fbf8f2] underline decoration-white/30 underline-offset-[6px] transition hover:decoration-[#e7b7b1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e7b7b1]"
            >
              Full credentials &mdash; {profile.name}
              <ArrowRight size={16} className="transition group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
