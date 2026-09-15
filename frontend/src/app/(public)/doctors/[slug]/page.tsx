import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  UserRound,
} from 'lucide-react';
import ContentUnavailable from '@/components/ui/ContentUnavailable';
import Button from '@/components/ui/Button';
import { clinicSettings, whatsappLink } from '@/lib/settings';
import { serverApiGet, serverApiTry } from '@/lib/serverApi';
import type { PublicArticleSummary, PublicDoctorSummary } from '@/lib/home';
import { publicationsForDoctor, type ResearchPublication } from '@/lib/publications';
import { getDoctorProfile, type DoctorProfile } from '@/lib/doctorProfiles';

type BiographySection = {
  heading: string;
  body: string;
};

type PublicDoctorDetail = PublicDoctorSummary & {
  qualification_list?: string[] | null;
  registration?: string | null;
  education?: string[] | null;
  role?: string | null;
  biography_sections?: BiographySection[] | null;
};

function cleanDoctorTitle(name: string) {
  return name.trim().replace(/^Dr\.\s+Dr\.\s+/i, 'Dr. ');
}

function formatReviewDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isLocalAsset(src?: string | null): src is string {
  return typeof src === 'string' && src.startsWith('/') && !src.startsWith('//');
}

async function getDoctor(slug: string) {
  // serverApiTry keeps "backend unreachable" distinct from "no such doctor", so
  // an outage renders an explanatory page instead of a 404.
  return serverApiTry<{ doctor: PublicDoctorDetail | null }>(
    `/public/doctors/${slug}`,
    { doctor: null },
    { next: { revalidate: 3600, tags: ['public-doctors'] } }
  );
}

/**
 * Resolve the doctor to render. A curated profile can stand in for the API
 * during an outage, so a profile with a CV on file never shows "unavailable".
 */
async function resolveDoctor(slug: string) {
  const result = await getDoctor(slug);
  const profile = getDoctorProfile(slug);
  if (result.data.doctor) return { doctor: result.data.doctor, profile, ok: true };
  if (!result.ok && profile) {
    const doctor: PublicDoctorDetail = {
      slug: profile.slug,
      name: profile.name,
      speciality: profile.speciality,
      qualifications: profile.qualifications,
      languages: profile.languages,
    };
    return { doctor, profile, ok: true };
  }
  return { doctor: null, profile, ok: result.ok };
}

async function getRelatedArticles(doctor: PublicDoctorDetail) {
  const articleData = await serverApiGet<{ articles: PublicArticleSummary[] }>(
    '/articles',
    { articles: [] },
    { next: { revalidate: 3600, tags: ['public-articles'] } }
  );

  const keyword = doctor.speciality.toLowerCase().includes('cardio') ? 'heart' : 'diabetes';
  return (articleData.articles || [])
    .filter(
      (article) =>
        article.author_doctor_slug === doctor.slug ||
        `${article.title} ${article.category || ''} ${article.excerpt || ''}`.toLowerCase().includes(keyword)
    )
    .slice(0, 3);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { doctor, profile } = await resolveDoctor(slug);
  if (!doctor) return { title: 'Doctor Not Found | Spandan Clinic' };

  const titleName = cleanDoctorTitle(profile?.name || doctor.name);
  const role = profile?.role || `${doctor.speciality} specialist`;
  const description = profile
    ? `${titleName}, ${role} (${profile.qualifications}) at Spandan Super Speciality Clinic, Chhatrapati Sambhajinagar. MMC Reg. ${profile.registration}.`
    : `${titleName} is a ${doctor.speciality} specialist at Spandan Clinic in Chhatrapati Sambhajinagar.`;
  const image = doctor.photo_url || profile?.photo;

  return {
    title: `${titleName} — ${role} | Spandan Super Speciality Clinic`,
    description,
    alternates: { canonical: `/doctors/${doctor.slug}` },
    openGraph: {
      title: `${titleName} | Spandan Clinic`,
      description,
      type: 'profile',
      images: image ? [{ url: image, alt: titleName }] : [{ url: '/logo.png', alt: clinicSettings.name }],
    },
  };
}

/**
 * Physician structured data. With a curated profile this carries the verifiable
 * credentials search engines use for doctor knowledge panels: registration,
 * alma maters, memberships, awards, and areas of practice.
 */
function profileJsonLd(doctor: PublicDoctorDetail, profile: DoctorProfile | undefined, publications: ResearchPublication[]) {
  const clinic = {
    '@type': 'MedicalClinic',
    name: clinicSettings.name,
    telephone: clinicSettings.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: clinicSettings.address,
      addressLocality: clinicSettings.city,
      addressRegion: clinicSettings.state,
      postalCode: clinicSettings.pincode,
      addressCountry: 'IN',
    },
  };

  const base = {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: profile?.name || doctor.name,
    image: doctor.photo_url || profile?.photo || '/logo.png',
    medicalSpecialty: doctor.speciality,
    url: `/doctors/${doctor.slug}`,
    worksFor: clinic,
    address: clinic.address,
    telephone: clinicSettings.phone,
  };
  if (!profile) return { ...base, description: `${doctor.speciality} specialist at ${clinicSettings.name}` };

  return {
    ...base,
    jobTitle: profile.role,
    description: profile.summary,
    identifier: {
      '@type': 'PropertyValue',
      propertyID: profile.registrationCouncil,
      value: profile.registration,
    },
    hasCredential: profile.education.map((entry) => ({
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'degree',
      name: entry.degree,
      recognizedBy: { '@type': 'CollegeOrUniversity', name: entry.university || entry.institution },
    })),
    alumniOf: profile.education.map((entry) => ({ '@type': 'CollegeOrUniversity', name: entry.institution })),
    memberOf: profile.memberships.map((membership) => ({
      '@type': 'Organization',
      name: membership.replace(/^Life Member,\s*/i, ''),
    })),
    award: profile.awards.map((award) => `${award.title} (${award.year})`),
    knowsAbout: profile.clinicalFocus,
    knowsLanguage: profile.languages,
    subjectOf: publications.map((publication) => ({
      '@type': 'ScholarlyArticle',
      headline: publication.title,
      ...(publication.journal ? { isPartOf: { '@type': 'Periodical', name: publication.journal } } : {}),
      ...(publication.publishedOn ? { datePublished: publication.publishedOn } : {}),
      ...(publication.externalUrl ? { url: publication.externalUrl } : {}),
    })),
  };
}

/* ------------------------------------------------------------------------- */
/* Layout primitives                                                          */
/* ------------------------------------------------------------------------- */

function ProfileSection({
  id,
  eyebrow,
  title,
  intro,
  tone = 'paper',
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  tone?: 'paper' | 'alt';
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`scroll-mt-36 py-16 sm:py-20 ${tone === 'alt' ? 'bg-[#f7f3ec]' : 'bg-white'}`}
    >
      <div className="container grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-16">
        <header className="lg:sticky lg:top-40 lg:self-start">
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={`${id}-title`} className="heading-section mt-3 text-ink">
            {title}
          </h2>
          {intro && <p className="mt-4 text-sm leading-relaxed text-text-light">{intro}</p>}
        </header>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

/** A labelled row with a hairline rule — the building block of the CV sections. */
function Row({
  lead,
  title,
  detail,
  aside,
}: {
  lead?: React.ReactNode;
  title: React.ReactNode;
  detail?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <li className="grid gap-1 border-t border-border py-5 first:border-t-0 first:pt-0 sm:grid-cols-[96px_1fr_auto] sm:gap-6">
      <span className="text-sm font-semibold text-text-light tabular-nums">{lead}</span>
      <span className="min-w-0">
        <span className="block font-semibold leading-snug text-ink">{title}</span>
        {detail && <span className="mt-1 block text-sm leading-relaxed text-text-light">{detail}</span>}
      </span>
      {aside && <span className="self-start text-xs font-semibold uppercase tracking-wide text-text-light">{aside}</span>}
    </li>
  );
}

/* ------------------------------------------------------------------------- */
/* Page                                                                       */
/* ------------------------------------------------------------------------- */

export default async function DoctorDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { doctor, profile, ok } = await resolveDoctor(slug);

  // Only a genuine "the backend answered and has no such doctor" is a 404.
  if (!doctor) {
    if (!ok) {
      return (
        <ContentUnavailable
          title="This doctor's profile is temporarily unavailable"
          backHref="/doctors"
          backLabel="All doctors"
        />
      );
    }
    notFound();
  }

  const relatedArticles = await getRelatedArticles(doctor);
  const publications = publicationsForDoctor(doctor.slug);
  const name = cleanDoctorTitle(profile?.name || doctor.name);
  const shortName = name.replace(/^Dr\.\s*/, 'Dr ').split(' ').slice(0, 2).join(' ');
  const imageSrc = doctor.photo_url || doctor.image_url || profile?.photo;
  const reviewed = formatReviewDate(doctor.reviewed_at);
  const isEndocrinology = doctor.speciality.toLowerCase().includes('endo');
  const specialityTone = isEndocrinology ? 'text-blush-deep' : 'text-accent';
  const focus = profile?.clinicalFocus.length
    ? profile.clinicalFocus
    : doctor.expertise?.length
      ? doctor.expertise
      : ['Specialist consultation', 'Report review', 'Follow-up planning'];
  const legacySections = doctor.biography_sections?.length ? doctor.biography_sections : [];
  const enquiry = whatsappLink(`Hello, I would like to arrange a consultation with ${name}.`);

  const navItems = [
    { id: 'focus', label: 'Clinical focus', show: true },
    { id: 'training', label: 'Training', show: Boolean(profile) },
    { id: 'appointments', label: 'Appointments', show: Boolean(profile) },
    { id: 'research', label: 'Research', show: publications.length > 0 },
    { id: 'teaching', label: 'Talks & teaching', show: Boolean(profile?.selectedTalks.length) },
    { id: 'visit', label: 'Visit', show: true },
  ].filter((item) => item.show);

  const credentialFacts = profile
    ? [
        { label: 'Registration', value: `MMC ${profile.registration}` },
        { label: 'DM completed', value: String(profile.practisingSince) },
        ...(publications.length ? [{ label: 'Publications', value: String(publications.length) }] : []),
        { label: 'Languages', value: profile.languages.join(' · ') },
      ]
    : [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd(doctor, profile, publications)) }}
      />

      {/* ---------------------------------------------------------------- hero */}
      <section className="soft-page-hero pb-14 pt-10 sm:pb-20">
        <div className="container">
          <Link
            href="/doctors"
            className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-accent transition hover:text-primary"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            All doctors
          </Link>

          <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(280px,400px)_1fr] lg:items-center lg:gap-16">
            <div className="relative mx-auto w-full max-w-[360px] lg:mx-0 lg:max-w-none">
              <div
                className={`absolute -inset-3 -z-10 rounded-[32px] ${
                  isEndocrinology ? 'bg-[#f6e7e4]' : 'bg-[#e3ede6]'
                }`}
                aria-hidden="true"
              />
              <div className="relative aspect-[4/5] overflow-hidden rounded-[26px] bg-[#eef4ef] shadow-[0_30px_60px_-30px_rgba(43,38,33,0.45)]">
                {imageSrc && isLocalAsset(imageSrc) ? (
                  <Image
                    src={imageSrc}
                    alt={`Portrait of ${name}`}
                    fill
                    priority
                    sizes="(min-width: 1024px) 400px, 360px"
                    className="object-cover object-top"
                  />
                ) : imageSrc ? (
                  <img src={imageSrc} alt={`Portrait of ${name}`} className="h-full w-full object-cover object-top" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-accent">
                    <UserRound size={72} aria-hidden="true" />
                  </span>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <p className={`text-xs font-bold uppercase tracking-[0.16em] ${specialityTone}`}>
                {doctor.speciality}
              </p>
              <h1 className="heading-display mt-4 text-ink">{name}</h1>
              <p className="mt-4 text-lg font-semibold text-ink sm:text-xl">
                {profile?.role || `${doctor.speciality} specialist`}
              </p>
              <p className="mt-1 text-base text-text-light">{profile?.qualifications || doctor.qualifications}</p>

              {profile && <p className="lede mt-6 max-w-[62ch]">{profile.summary}</p>}

              {credentialFacts.length > 0 && (
                <dl className="mt-8 grid grid-cols-2 gap-y-5 border-y border-border py-5 sm:grid-cols-4">
                  {credentialFacts.map((fact, index) => (
                    <div
                      key={fact.label}
                      className={`flex flex-col pr-4 ${index > 0 ? 'sm:border-l sm:border-border sm:pl-5' : ''} ${
                        index % 2 === 1 ? 'border-l border-border pl-5' : ''
                      }`}
                    >
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-light">
                        {fact.label}
                      </dt>
                      <dd className="mt-1.5 text-sm font-semibold text-ink tabular-nums">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
                <Button href={`tel:${clinicSettings.phone}`} variant="accent">
                  <Phone size={18} aria-hidden="true" />
                  Call to book
                </Button>
                <Button href={enquiry} target="_blank" rel="noopener noreferrer" variant="outline">
                  <MessageCircle size={18} aria-hidden="true" />
                  WhatsApp the clinic
                </Button>
              </div>
              {reviewed && (
                <p className="mt-5 text-xs text-text-light">Profile last reviewed {reviewed}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- section nav */}
      <nav
        aria-label="Profile sections"
        className="sticky top-[72px] z-30 border-y border-border bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75"
      >
        <div className="container">
          <ul className="-mx-2 flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
            {navItems.map((item) => (
              <li key={item.id} className="shrink-0">
                <a
                  href={`#${item.id}`}
                  className="inline-flex min-h-[40px] items-center rounded-full px-4 text-sm font-semibold text-text-light transition hover:bg-[#eef4ef] hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* ------------------------------------------------------ clinical focus */}
      <ProfileSection
        id="focus"
        eyebrow="Clinical focus"
        title={profile ? 'Areas of practice' : 'Common reasons to visit'}
        intro="Drawn from this specialist's curriculum vitae. A listing here is not a diagnosis or a guaranteed treatment outcome."
      >
        <ul className="grid gap-x-10 sm:grid-cols-2">
          {focus.map((item) => (
            <li key={item} className="flex items-start gap-3 border-b border-border py-4 text-[15px] leading-relaxed text-ink">
              <Check size={18} className={`mt-1 shrink-0 ${specialityTone}`} aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </ProfileSection>

      {profile ? (
        <>
          {/* ------------------------------------------------------ training */}
          <ProfileSection
            id="training"
            eyebrow="Education"
            title="Training"
            intro="Degrees in the order they were earned, most recent first."
            tone="alt"
          >
            <ol className="relative grid gap-8 border-l border-[#c9d8cd] pl-8">
              {profile.education.map((entry) => (
                <li key={`${entry.year}-${entry.degree}`} className="relative">
                  <span
                    className={`absolute -left-[37px] top-1.5 h-[9px] w-[9px] rounded-full ring-4 ring-[#f7f3ec] ${
                      isEndocrinology ? 'bg-blush-deep' : 'bg-accent'
                    }`}
                    aria-hidden="true"
                  />
                  <p className="text-sm font-semibold text-text-light tabular-nums">{entry.year}</p>
                  <h3 className="mt-1 font-display text-2xl font-semibold text-ink">{entry.degree}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink/80">{entry.institution}</p>
                  {entry.university && <p className="mt-0.5 text-sm text-text-light">{entry.university}</p>}
                </li>
              ))}
            </ol>

            {profile.courses.length > 0 && (
              <div className="mt-14">
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-text-light">
                  Further training, fellowships &amp; committees
                </h3>
                <ul className="mt-5">
                  {profile.courses.map((course) => (
                    <Row
                      key={`${course.year}-${course.title}`}
                      lead={course.year}
                      title={course.title}
                      detail={course.organisation}
                    />
                  ))}
                </ul>
              </div>
            )}
          </ProfileSection>

          {/* -------------------------------------------------- appointments */}
          <ProfileSection
            id="appointments"
            eyebrow="Experience"
            title="Appointments & memberships"
            intro="Where this specialist practises and teaches, and the professional bodies they belong to."
          >
            <div className="grid gap-12">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-text-light">Current</h3>
                <ul className="mt-5">
                  {profile.appointments.map((entry) => (
                    <Row
                      key={`${entry.role}-${entry.organisation}`}
                      lead={entry.period.replace(/^Since\s+/i, '')}
                      title={entry.organisation}
                      detail={entry.role}
                    />
                  ))}
                </ul>
              </div>

              {profile.pastAppointments.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-text-light">Earlier</h3>
                  <ul className="mt-5">
                    {profile.pastAppointments.map((entry) => (
                      <Row
                        key={`${entry.role}-${entry.organisation}`}
                        lead={entry.period}
                        title={entry.role}
                        detail={entry.organisation}
                      />
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid gap-12 md:grid-cols-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-text-light">Memberships</h3>
                  <ul className="mt-5 grid gap-3">
                    {profile.memberships.map((membership) => (
                      <li key={membership} className="text-[15px] leading-relaxed text-ink">
                        {membership}
                      </li>
                    ))}
                  </ul>
                </div>

                {(profile.awards.length > 0 || profile.books.length > 0) && (
                  <div className="grid gap-10">
                    {profile.awards.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-text-light">
                          Awards &amp; recognition
                        </h3>
                        <ul className="mt-5 grid gap-5">
                          {profile.awards.map((award) => (
                            <li key={award.title}>
                              <p className="text-sm font-semibold text-text-light tabular-nums">{award.year}</p>
                              <p className="mt-1 text-[15px] leading-relaxed text-ink">{award.title}</p>
                              <p className="mt-1 text-sm text-text-light">{award.awardedBy}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {profile.books.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-text-light">Author</h3>
                        <ul className="mt-5 grid gap-3">
                          {profile.books.map((book) => (
                            <li key={book} className="font-display text-xl font-semibold italic text-ink">
                              {book}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ProfileSection>
        </>
      ) : (
        legacySections.length > 0 && (
          <ProfileSection id="about" eyebrow="About" title="Care approach" tone="alt">
            <div className="grid gap-6">
              {legacySections.map((section) => (
                <div key={section.heading}>
                  <h3 className="font-semibold text-ink">{section.heading}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-text-light">{section.body}</p>
                </div>
              ))}
            </div>
          </ProfileSection>
        )
      )}

      {/* ------------------------------------------------------------ research */}
      {publications.length > 0 && (
        <ProfileSection
          id="research"
          eyebrow="Research"
          title={`${publications.length} publications`}
          intro="Peer-reviewed papers and case reports. External links open the journal or index page."
          tone="alt"
        >
          <ul>
            {publications.map((publication) => (
              <li
                key={publication.id}
                className="grid gap-2 border-t border-[#e2dbcf] py-6 first:border-t-0 first:pt-0 sm:grid-cols-[72px_1fr_auto] sm:gap-6"
              >
                <span className="text-sm font-semibold text-text-light tabular-nums">{publication.year ?? '—'}</span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-snug text-ink">{publication.title}</span>
                  {publication.journal && (
                    <span className="mt-1 block text-sm italic text-text-light">{publication.journal}</span>
                  )}
                </span>
                {publication.externalUrl && (
                  <a
                    href={publication.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-1 self-start text-sm font-semibold text-accent hover:text-primary sm:min-h-0"
                  >
                    Read
                    <ArrowUpRight size={15} aria-hidden="true" />
                    <span className="sr-only">{publication.title} (opens in a new tab)</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
          <Link
            href={`/health?doctor=${doctor.slug}#research`}
            className="mt-8 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-accent underline decoration-accent/30 underline-offset-[6px] hover:decoration-accent"
          >
            Search and filter in the research library
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </ProfileSection>
      )}

      {/* ---------------------------------------------------------- teaching */}
      {profile && profile.selectedTalks.length > 0 && (
        <ProfileSection
          id="teaching"
          eyebrow="Teaching"
          title="Invited talks & faculty lectures"
          intro="Selected sessions at national conferences, CMEs, and medical colleges."
        >
          <ul>
            {profile.selectedTalks.map((talk) => (
              <Row key={`${talk.year}-${talk.topic}`} lead={talk.year} title={talk.topic} detail={talk.forum} />
            ))}
          </ul>
        </ProfileSection>
      )}

      {/* -------------------------------------------------------------- visit */}
      <section id="visit" aria-labelledby="visit-title" className="scroll-mt-36 bg-[#1f3529] py-16 text-[#f3efe6] sm:py-20">
        <div className="container grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b9d3c2]">Consult</p>
            <h2 id="visit-title" className="heading-section mt-3 text-[#fbf8f2]">
              See {shortName} at Spandan
            </h2>
            <p className="mt-4 max-w-xl leading-relaxed text-[#d7d0c3]">
              The clinic team confirms consulting times, helps with test preparation, and books your visit.
            </p>
            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
              <Button href={`tel:${clinicSettings.phone}`} variant="accent">
                <Phone size={18} aria-hidden="true" />
                Call {clinicSettings.phone.replace(/^\+91/, '+91 ')}
              </Button>
              <Button
                href={enquiry}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                className="border-white/40 bg-transparent text-[#fbf8f2] hover:bg-white/10"
              >
                <MessageCircle size={18} aria-hidden="true" />
                WhatsApp
              </Button>
            </div>
          </div>

          <dl className="grid gap-6 border-t border-white/15 pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <div className="flex gap-4">
              <MapPin size={20} className="mt-0.5 shrink-0 text-[#b9d3c2]" aria-hidden="true" />
              <div>
                <dt className="text-sm font-semibold text-[#fbf8f2]">Address</dt>
                <dd className="mt-1 text-sm leading-relaxed text-[#d7d0c3]">
                  {clinicSettings.address}, {clinicSettings.city} {clinicSettings.pincode}
                </dd>
                <a
                  href={clinicSettings.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-[#e7b7b1] hover:text-[#fbf8f2]"
                >
                  Get directions <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="flex gap-4">
              <Clock size={20} className="mt-0.5 shrink-0 text-[#b9d3c2]" aria-hidden="true" />
              <div>
                <dt className="text-sm font-semibold text-[#fbf8f2]">Clinic hours</dt>
                <dd className="mt-1 text-sm leading-relaxed text-[#d7d0c3]">{clinicSettings.timings}</dd>
              </div>
            </div>
          </dl>
        </div>
      </section>

      {relatedArticles.length > 0 && (
        <section className="section bg-white" aria-labelledby="reading-title">
          <div className="container">
            <p className="eyebrow">Further reading</p>
            <h2 id="reading-title" className="heading-section mt-3 text-ink">
              Patient resources
            </h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {relatedArticles.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/health-resources/${article.slug}`}
                    className="group block h-full rounded-2xl border border-border p-6 transition hover:border-border-strong"
                  >
                    <span className="block font-semibold leading-snug text-ink group-hover:text-accent">
                      {article.title}
                    </span>
                    {article.excerpt && (
                      <span className="mt-2 block text-sm leading-relaxed text-text-light">{article.excerpt}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
