import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BookOpen, GraduationCap, Microscope, UserRound } from 'lucide-react';
import PublicationLibrary from '@/components/publications/PublicationLibrary';
import { publicationAuthor, researchPublications } from '@/lib/publications';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: `Research Publications | ${publicationAuthor.name} | Spandan Clinic`,
  description: `Browse ${researchPublications.length} endocrinology research publications and case reports associated with ${publicationAuthor.name}, for clinicians, medical students, and researchers.`,
  alternates: { canonical: '/publications' },
  openGraph: {
    title: `${publicationAuthor.name} — Research Publications`,
    description: 'Endocrinology research, case reports, genetics, thyroid, metabolic health, and pediatric endocrinology publications.',
  },
};

export default function PublicationsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${publicationAuthor.name} Research Publications`,
    description: metadata.description,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: researchPublications.length,
      itemListElement: researchPublications.map((publication, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'ScholarlyArticle',
          headline: publication.title,
          datePublished: publication.publishedOn,
          isPartOf: publication.journal ? { '@type': 'Periodical', name: publication.journal } : undefined,
          author: { '@type': 'Person', name: publicationAuthor.name },
          url: publication.externalUrl,
        },
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="soft-page-hero py-16 sm:py-20">
        <div className="container">
          <Link href="/explore#research" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
            <ArrowLeft size={16} aria-hidden="true" /> Back to Explore
          </Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-blush-deep shadow-sm">
                <Microscope size={16} aria-hidden="true" /> Research and academic work
              </p>
              <h1 className="mt-5 max-w-4xl text-3xl font-bold leading-tight text-ink sm:text-4xl lg:text-5xl">
                Publications associated with {publicationAuthor.name}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-text-light sm:text-lg">
                A searchable collection of endocrinology research and case reports for clinicians, medical students, researchers, and interested readers.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="soft-card p-5"><BookOpen className="text-accent" size={22} /><p className="mt-3 text-3xl font-bold text-ink">{researchPublications.length}</p><p className="text-sm text-text-light">Publication records</p></div>
              <div className="soft-card p-5"><GraduationCap className="text-accent" size={22} /><p className="mt-3 text-lg font-bold text-ink">Academic</p><p className="text-sm text-text-light">Student and researcher friendly</p></div>
            </div>
          </div>
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
            Publication summaries are provided for discovery and education. Follow the journal link for the authoritative abstract, author list, citation, access terms, and full text when available.
          </div>
          <Button href={`/doctors/${publicationAuthor.slug}`} variant="outline" className="mt-6">
            <UserRound size={17} aria-hidden="true" /> View doctor profile
          </Button>
        </div>
      </section>
      <PublicationLibrary publications={researchPublications} />
    </>
  );
}
