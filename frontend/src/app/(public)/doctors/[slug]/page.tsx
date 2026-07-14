import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Languages,
  Microscope,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import EnquiryForm from '@/components/forms/EnquiryForm';
import { clinicSettings } from '@/lib/settings';
import { serverApiGet } from '@/lib/serverApi';
import type { PublicPackageSummary } from '@/components/packages/PackageCard';
import type { PublicArticleSummary, PublicDoctorSummary } from '@/lib/home';
import { publicationAuthor, researchPublications } from '@/lib/publications';

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
  return serverApiGet<{ doctor: PublicDoctorDetail | null }>(
    `/public/doctors/${slug}`,
    { doctor: null },
    { next: { revalidate: 3600, tags: ['public-doctors'] } }
  );
}

async function getRelatedContent(doctor: PublicDoctorDetail) {
  const [packageData, articleData] = await Promise.all([
    serverApiGet<{ packages: PublicPackageSummary[] }>(
      '/packages',
      { packages: [] },
      { next: { revalidate: 3600, tags: ['public-packages'] } }
    ),
    serverApiGet<{ articles: PublicArticleSummary[] }>(
      '/articles',
      { articles: [] },
      { next: { revalidate: 3600, tags: ['public-articles'] } }
    ),
  ]);

  const source = `${doctor.id || ''} ${doctor.slug} ${doctor.speciality}`.toLowerCase();
  const relatedPackages = (packageData.packages || [])
    .filter((pkg) => {
      const pkgSource = `${pkg.name} ${pkg.category || ''} ${pkg.test_category || ''} ${pkg.short_description || ''}`.toLowerCase();
      return source.includes('cardio')
        ? pkgSource.includes('cardiac') || pkgSource.includes('heart')
        : pkgSource.includes('diabetes') || pkgSource.includes('thyroid') || pkgSource.includes('hormone');
    })
    .slice(0, 3);

  const relatedArticles = (articleData.articles || [])
    .filter((article) => article.author_doctor_slug === doctor.slug || `${article.title} ${article.category || ''} ${article.excerpt || ''}`.toLowerCase().includes(source.includes('cardio') ? 'heart' : 'diabetes'))
    .slice(0, 2);

  return { relatedPackages, relatedArticles };
}

export async function generateStaticParams() {
  const data = await serverApiGet<{ doctors: PublicDoctorSummary[] }>(
    '/public/doctors',
    { doctors: [] },
    { next: { revalidate: 3600, tags: ['public-doctors'] } }
  );
  return (data.doctors || []).map((doctor) => ({ slug: doctor.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getDoctor(params.slug);
  const doctor = data.doctor;
  if (!doctor) return { title: 'Doctor Not Found | Spandan Clinic' };

  const titleName = cleanDoctorTitle(doctor.name);
  return {
    title: `${titleName} | ${doctor.speciality} | Spandan Super Speciality Clinic`,
    description: `${titleName} is listed as a ${doctor.speciality} specialist at Spandan Clinic in Chhatrapati Sambhajinagar. View credentials, care focus, and booking options.`,
    alternates: {
      canonical: `/doctors/${doctor.slug}`,
    },
    openGraph: {
      title: `${titleName} | Spandan Clinic`,
      description: `${doctor.speciality} specialist profile and booking link.`,
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
        <dd className="mt-2 font-semibold text-navy">{doctor.role || `${doctor.speciality} specialist`}</dd>
      </div>
      <div className="soft-card p-5">
        <dt className="text-sm font-bold uppercase text-text-light">Registration</dt>
        <dd className="mt-2 font-semibold text-navy">{doctor.registration || 'Not published on this profile'}</dd>
      </div>
      <div className="soft-card p-5 sm:col-span-2">
        <dt className="text-sm font-bold uppercase text-text-light">Education and qualifications</dt>
        <dd className="mt-3">
          <ul className="grid gap-2 text-sm text-text-light sm:grid-cols-2">
            {qualifications.length ? qualifications.map((item) => (
              <li key={item} className="rounded-2xl bg-blue-50/70 px-3 py-2">{item}</li>
            )) : (
              <li className="rounded-2xl bg-blue-50/70 px-3 py-2">Not published on this profile</li>
            )}
          </ul>
        </dd>
      </div>
      <div className="soft-card p-5">
        <dt className="text-sm font-bold uppercase text-text-light">Languages</dt>
        <dd className="mt-2 font-semibold text-navy">{doctor.languages?.join(', ') || 'English, Hindi, Marathi'}</dd>
      </div>
      <div className="soft-card p-5">
        <dt className="text-sm font-bold uppercase text-text-light">Profile review</dt>
        <dd className="mt-2 font-semibold text-navy">{reviewDate || 'Review date unavailable'}</dd>
      </div>
    </dl>
  );
}

export default async function DoctorDetail({ params }: { params: { slug: string } }) {
  const data = await getDoctor(params.slug);
  const doctor = data.doctor;

  if (!doctor) notFound();

  const { relatedPackages, relatedArticles } = await getRelatedContent(doctor);
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
              <div className="aspect-[4/5] bg-blue-50/70">
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
                <p className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-pink-700 shadow-[0_8px_20px_rgba(236,72,153,0.12)]">
                  Profile reviewed {reviewed}
                </p>
              )}
              <h1 className="text-3xl font-bold sm:text-4xl">{cleanDoctorTitle(doctor.name)}</h1>
              <p className="mt-3 text-lg text-accent">{doctor.speciality}</p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-light sm:text-base">
                {doctor.qualifications}
              </p>
              <div className="mt-7 flex flex-col gap-3 min-[420px]:flex-row">
                {doctor.booking_enabled !== false && doctor.id ? (
                  <Link href={`/book-appointment?doctor=${doctor.id}`} className="btn btn-accent">
                    <CalendarCheck size={18} aria-hidden="true" />
                    Book with {cleanDoctorTitle(doctor.name)}
                  </Link>
                ) : (
                  <Link href="/contact" className="btn btn-accent">
                    Contact Clinic
                  </Link>
                )}
                <a href="#doctor-enquiry" className="btn btn-outline">
                  Send Enquiry
                </a>
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
              <h2 className="heading-section text-navy">Verified profile facts</h2>
            </div>
            <CredentialList doctor={doctor} />
          </div>

          <aside className="soft-card p-5">
            <h2 className="text-xl font-bold text-navy">Availability and booking</h2>
            <p className="mt-3 text-sm leading-relaxed text-text-light">
              Availability is confirmed in the appointment booking flow. Select a date and slot before payment.
            </p>
            <Link href={`/book-appointment?doctor=${doctor.id || doctor.slug}`} className="btn btn-accent mt-5 w-full">
              <CalendarCheck size={18} aria-hidden="true" />
              Book Appointment
            </Link>
          </aside>
        </div>
      </section>

      <section className="section bg-bg-alt">
        <div className="container">
          <div className="mb-10 max-w-3xl">
            <h2 className="heading-section mb-2 text-navy">Conditions commonly evaluated</h2>
            <p className="text-text-light">
              These are common consultation paths for this specialty. They are not a diagnosis or a guaranteed treatment outcome.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {expertise.map((item) => (
              <article key={item} className="soft-card p-5">
                <Stethoscope className="mb-4 text-accent" size={22} aria-hidden="true" />
                <h3 className="font-bold text-navy">{item}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      {sections.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="mb-10 max-w-3xl">
              <h2 className="heading-section mb-2 text-navy">Care approach</h2>
              <p className="text-text-light">
                Public profile text is limited to approved professional information.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {sections.map((section) => (
                <article key={section.heading} className="soft-card p-6">
                  <h3 className="text-lg font-bold text-navy">{section.heading}</h3>
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
            <h2 className="heading-section mb-2 text-navy">Related diagnostics, packages, and resources</h2>
            <p className="text-text-light">
              Related links are informational and may still need doctor advice before booking.
            </p>
          </div>
          <div className={`grid gap-6 ${hasResearchPublications ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            <article className="soft-card p-6">
              <Microscope className="mb-4 text-accent" size={24} aria-hidden="true" />
              <h3 className="text-lg font-bold text-navy">Diagnostics</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                View clinic diagnostic facilities such as ECG-related monitoring, CGMS, ABPM, Holter, sleep study, and InBody.
              </p>
              <Link href="/facilities" className="btn btn-outline mt-5">View Facilities</Link>
            </article>

            {hasResearchPublications && (
              <article className="soft-card p-6">
                <BookOpen className="mb-4 text-accent" size={24} aria-hidden="true" />
                <h3 className="text-lg font-bold text-navy">Research publications</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-light">
                  Browse {researchPublications.length} endocrinology publications and case reports associated with this profile.
                </p>
                <Link href="/publications" className="btn btn-outline mt-5">View Publications</Link>
              </article>
            )}

            <article className="soft-card p-6">
              <ClipboardList className="mb-4 text-accent" size={24} aria-hidden="true" />
              <h3 className="text-lg font-bold text-navy">Packages</h3>
              <div className="mt-3 grid gap-2">
                {relatedPackages.length ? relatedPackages.map((pkg) => (
                  <Link key={pkg.slug || pkg.id} href={`/packages/${pkg.slug}`} className="rounded-2xl bg-blue-50/70 px-3 py-2 text-sm font-semibold text-navy hover:text-accent">
                    {pkg.name}
                  </Link>
                )) : (
                  <Link href="/packages" className="rounded-2xl bg-blue-50/70 px-3 py-2 text-sm font-semibold text-navy hover:text-accent">
                    Browse health packages
                  </Link>
                )}
              </div>
            </article>

            <article className="soft-card p-6">
              <BookOpen className="mb-4 text-accent" size={24} aria-hidden="true" />
              <h3 className="text-lg font-bold text-navy">Resources</h3>
              <div className="mt-3 grid gap-2">
                {relatedArticles.length ? relatedArticles.map((article) => (
                  <Link key={article.slug} href={`/health-resources/${article.slug}`} className="rounded-2xl bg-blue-50/70 px-3 py-2 text-sm font-semibold text-navy hover:text-accent">
                    {article.title}
                  </Link>
                )) : (
                  <Link href="/health-resources" className="rounded-2xl bg-blue-50/70 px-3 py-2 text-sm font-semibold text-navy hover:text-accent">
                    Browse health resources
                  </Link>
                )}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section bg-bg-alt">
        <div className="container grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <h2 className="heading-section mb-3 text-navy">Secondary enquiry</h2>
            <p className="leading-relaxed text-text-light">
              Use this form when you need the clinic team to call back. For confirmed slot booking,
              use the appointment booking action above.
            </p>
            <div className="soft-card mt-5 p-4 text-sm text-text-light">
              <p className="flex items-start gap-2">
                <Languages className="mt-0.5 shrink-0 text-accent" size={18} aria-hidden="true" />
                Enquiries can be submitted in English, Hindi, or Marathi site contexts.
              </p>
            </div>
          </div>
          <div id="doctor-enquiry" className="scroll-mt-24">
            <EnquiryForm doctorId={doctor.id} doctorName={doctor.name} enquiryType="doctor" />
          </div>
        </div>
      </section>
    </>
  );
}
