import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ContentUnavailable from '@/components/ui/ContentUnavailable';
import {
  ArrowLeft,
  BookOpen,
  Microscope,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { clinicSettings } from '@/lib/settings';
import { serverApiGet, serverApiTry } from '@/lib/serverApi';
import type { PublicArticleSummary, PublicDoctorSummary } from '@/lib/home';
import { publicationAuthor, researchPublications } from '@/lib/publications';
import Button from '@/components/ui/Button';

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

async function getDoctor(slug: string) {
  // serverApiTry keeps "backend unreachable" distinct from "no such doctor", so
  // an outage renders an explanatory page instead of a 404.
  return serverApiTry<{ doctor: PublicDoctorDetail | null }>(
    `/public/doctors/${slug}`,
    { doctor: null },
    { next: { revalidate: 3600, tags: ['public-doctors'] } }
  );
}

async function getRelatedContent(doctor: PublicDoctorDetail) {
  const articleData = await serverApiGet<{ articles: PublicArticleSummary[] }>(
      '/articles',
      { articles: [] },
      { next: { revalidate: 3600, tags: ['public-articles'] } }
    );

  const source = `${doctor.id || ''} ${doctor.slug} ${doctor.speciality}`.toLowerCase();
  const relatedArticles = (articleData.articles || [])
    .filter((article) => article.author_doctor_slug === doctor.slug || `${article.title} ${article.category || ''} ${article.excerpt || ''}`.toLowerCase().includes(source.includes('cardio') ? 'heart' : 'diabetes'))
    .slice(0, 2);

  return { relatedArticles };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const result = await getDoctor(params.slug);
  const doctor = result.data.doctor;
  if (!doctor) return { title: 'Doctor Not Found | Spandan Clinic' };

  const titleName = cleanDoctorTitle(doctor.name);
  return {
    title: `${titleName} | ${doctor.speciality} | Spandan Super Speciality Clinic`,
    description: `${titleName} is listed as a ${doctor.speciality} specialist at Spandan Clinic in Chhatrapati Sambhajinagar. View credentials and care focus.`,
    alternates: {
      canonical: `/doctors/${doctor.slug}`,
    },
    openGraph: {
      title: `${titleName} | Spandan Clinic`,
      description: `${doctor.speciality} specialist profile and care information.`,
      images: doctor.photo_url ? [{ url: doctor.photo_url, alt: titleName }] : [{ url: '/logo.png', alt: clinicSettings.name }],
    },
  };
}

function profileJsonLd(doctor: PublicDoctorDetail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: doctor.name,
    image: doctor.photo_url || '/logo.png',
    medicalSpecialty: doctor.speciality,
    description: `${doctor.speciality} specialist at ${clinicSettings.name}`,
    url: `/doctors/${doctor.slug}`,
    affiliation: {
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
    },
  };
}

function CredentialList({ doctor }: { doctor: PublicDoctorDetail }) {
  const qualifications = doctor.qualification_list?.length
    ? doctor.qualification_list
    : doctor.qualifications.split(',').map((item) => item.trim()).filter(Boolean);
  const reviewDate = formatReviewDate(doctor.reviewed_at);

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <div className="soft-card p-5">
        <dt className="text-sm font-bold uppercase text-text-light">Role</dt>
        <dd className="mt-2 font-semibold text-ink">{doctor.role || `${doctor.speciality} specialist`}</dd>
      </div>
      <div className="soft-card p-5">
        <dt className="text-sm font-bold uppercase text-text-light">Registration</dt>
        <dd className="mt-2 font-semibold text-ink">{doctor.registration || 'Not published on this profile'}</dd>
      </div>
      <div className="soft-card p-5 sm:col-span-2">
        <dt className="text-sm font-bold uppercase text-text-light">Education and qualifications</dt>
        <dd className="mt-3">
          <ul className="grid gap-2 text-sm text-text-light sm:grid-cols-2">
            {qualifications.length ? qualifications.map((item) => (
              <li key={item} className="rounded-2xl bg-wash-sage/70 px-3 py-2">{item}</li>
            )) : (
              <li className="rounded-2xl bg-wash-sage/70 px-3 py-2">Not published on this profile</li>
            )}
          </ul>
        </dd>
      </div>
      <div className="soft-card p-5">
        <dt className="text-sm font-bold uppercase text-text-light">Languages</dt>
        <dd className="mt-2 font-semibold text-ink">{doctor.languages?.join(', ') || 'English, Hindi, Marathi'}</dd>
      </div>
      <div className="soft-card p-5">
        <dt className="text-sm font-bold uppercase text-text-light">Profile review</dt>
        <dd className="mt-2 font-semibold text-ink">{reviewDate || 'Review date unavailable'}</dd>
      </div>
    </dl>
  );
}

export default async function DoctorDetail({ params }: { params: { slug: string } }) {
  const result = await getDoctor(params.slug);
  const doctor = result.data.doctor;

  // Only a genuine "the backend answered and has no such doctor" is a 404.
  if (!doctor) {
    if (!result.ok) {
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

  const { relatedArticles } = await getRelatedContent(doctor);
  const imageSrc = doctor.photo_url || doctor.image_url || undefined;
  const expertise = doctor.expertise?.length ? doctor.expertise : ['Specialist consultation', 'Report review', 'Follow-up planning'];
  const sections = doctor.biography_sections?.length ? doctor.biography_sections : [];
  const reviewed = formatReviewDate(doctor.reviewed_at);
  const hasResearchPublications = doctor.slug === publicationAuthor.slug;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd(doctor)) }}
      />

      <section className="soft-page-hero py-14">
        <div className="container">
          <Link href="/doctors" className="inline-flex items-center gap-2 text-sm text-accent transition hover:text-primary">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to doctors
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
            <div className="soft-card w-full max-w-[320px] overflow-hidden">
              <div className="aspect-[4/5] bg-wash-sage/70">
                {imageSrc ? (
                  <img src={imageSrc} alt={`${doctor.name} portrait`} className="h-full w-full object-cover object-top" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-accent">
                    <UserRound size={72} aria-hidden="true" />
                  </div>
                )}
              </div>
            </div>

            <div>
              {reviewed && (
                <p className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-blush-deep shadow-md">
                  Profile reviewed {reviewed}
                </p>
              )}
              <h1 className="text-3xl font-bold sm:text-4xl">{cleanDoctorTitle(doctor.name)}</h1>
              <p className="mt-3 text-lg text-accent">{doctor.speciality}</p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-light sm:text-base">
                {doctor.qualifications}
              </p>
              <div className="mt-7 flex flex-col gap-3 min-[420px]:flex-row">
                <Button href={`tel:${clinicSettings.phone}`} variant="accent">Call Clinic</Button>
                <Button href={clinicSettings.social.whatsapp} target="_blank" rel="noopener noreferrer" variant="outline">WhatsApp</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <div className="mb-8 flex items-center gap-3">
              <ShieldCheck className="text-accent" size={24} aria-hidden="true" />
              <h2 className="heading-section text-ink">Verified profile facts</h2>
            </div>
            <CredentialList doctor={doctor} />
          </div>

          <aside className="soft-card p-5">
            <h2 className="text-xl font-bold text-ink">Visit guidance</h2>
            <p className="mt-3 text-sm leading-relaxed text-text-light">
              Call our clinic team for current availability, preparation guidance, and directions.
            </p>
            <Button href={`tel:${clinicSettings.phone}`} variant="accent" className="mt-5 w-full">Call Clinic</Button>
          </aside>
        </div>
      </section>

      <section className="section bg-bg-alt">
        <div className="container">
          <div className="mb-10 max-w-3xl">
            <h2 className="heading-section mb-2 text-ink">Conditions commonly evaluated</h2>
            <p className="text-text-light">
              These are common consultation paths for this specialty. They are not a diagnosis or a guaranteed treatment outcome.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {expertise.map((item) => (
              <article key={item} className="soft-card p-5">
                <Stethoscope className="mb-4 text-accent" size={22} aria-hidden="true" />
                <h3 className="font-bold text-ink">{item}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      {sections.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="mb-10 max-w-3xl">
              <h2 className="heading-section mb-2 text-ink">Care approach</h2>
              <p className="text-text-light">
                Public profile text is limited to approved professional information.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {sections.map((section) => (
                <article key={section.heading} className="soft-card p-6">
                  <h3 className="text-lg font-bold text-ink">{section.heading}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-light">{section.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="mb-10 max-w-3xl">
            <h2 className="heading-section mb-2 text-ink">Related diagnostics and resources</h2>
            <p className="text-text-light">
              Related links are informational and do not replace individual medical advice.
            </p>
          </div>
          <div className={`grid gap-6 ${hasResearchPublications ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
            <article className="soft-card p-6">
              <Microscope className="mb-4 text-accent" size={24} aria-hidden="true" />
              <h3 className="text-lg font-bold text-ink">Diagnostics</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                View clinic diagnostic facilities such as ECG-related monitoring, CGMS, ABPM, Holter, sleep study, and InBody.
              </p>
              <Button href="/care" variant="outline" className="mt-5">View Facilities</Button>
            </article>

            {hasResearchPublications && (
              <article className="soft-card p-6">
                <BookOpen className="mb-4 text-accent" size={24} aria-hidden="true" />
                <h3 className="text-lg font-bold text-ink">Research publications</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-light">
                  Browse {researchPublications.length} endocrinology publications and case reports associated with this profile.
                </p>
                <Button href="/health#research" variant="outline" className="mt-5">View Publications</Button>
              </article>
            )}

            <article className="soft-card p-6">
              <BookOpen className="mb-4 text-accent" size={24} aria-hidden="true" />
              <h3 className="text-lg font-bold text-ink">Resources</h3>
              <div className="mt-3 grid gap-2">
                {relatedArticles.length ? relatedArticles.map((article) => (
                  <Link key={article.slug} href={`/health-resources/${article.slug}`} className="rounded-2xl bg-wash-sage/70 px-3 py-2 text-sm font-semibold text-ink hover:text-accent">
                    {article.title}
                  </Link>
                )) : (
                  <Link href="/health" className="rounded-2xl bg-wash-sage/70 px-3 py-2 text-sm font-semibold text-ink hover:text-accent">
                    Browse health resources
                  </Link>
                )}
              </div>
            </article>
          </div>
        </div>
      </section>

    </>
  );
}
