import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import {
  publicationAuthors,
  publicationsForDoctor,
  researchPublications,
  type ResearchPublication,
} from '@/lib/publications';

/**
 * Picks the newest paper from each doctor, then fills the remaining slot with the
 * next-newest overall, so the strip always represents both specialities.
 */
function featuredPublications(limit = 3): ResearchPublication[] {
  const byDate = (a: ResearchPublication, b: ResearchPublication) =>
    (b.publishedOn || '').localeCompare(a.publishedOn || '');

  const picks: ResearchPublication[] = [];
  Object.keys(publicationAuthors).forEach((slug) => {
    const newest = [...publicationsForDoctor(slug)].sort(byDate).find((item) => !picks.includes(item));
    if (newest) picks.push(newest);
  });
  [...researchPublications].sort(byDate).forEach((item) => {
    if (picks.length < limit && !picks.includes(item)) picks.push(item);
  });
  return picks.slice(0, limit).sort(byDate);
}

export default function ResearchHighlight() {
  const papers = featuredPublications();

  return (
    <section className="section section-paper" aria-labelledby="research-highlight-title">
      <div className="container">
        <div className="flex flex-col gap-6 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">Published research</p>
            <h2 id="research-highlight-title" className="heading-section mt-3 text-ink">
              The doctors who treat you also write the literature
            </h2>
          </div>
          <Link
            href="/health#research"
            className="inline-flex min-h-[44px] items-center gap-2 self-start text-sm font-semibold text-accent underline decoration-accent/30 underline-offset-[6px] transition hover:decoration-accent md:self-auto"
          >
            All {researchPublications.length} publications
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <ol className="divide-y divide-border">
          {papers.map((paper) => (
            <li key={paper.id} className="grid gap-3 py-8 md:grid-cols-[120px_1fr_auto] md:gap-10">
              <p className="font-display text-2xl font-semibold text-ink/80 tabular-nums">
                {paper.year ?? '—'}
              </p>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold leading-snug text-ink text-balance">{paper.title}</h3>
                <p className="mt-2 text-sm text-text-light">
                  {paper.journal && <span className="italic">{paper.journal}</span>}
                  {paper.journal && ' · '}
                  {paper.authorSlugs.map((slug) => publicationAuthors[slug].name).join(' & ')}
                </p>
              </div>
              {paper.externalUrl ? (
                <a
                  href={paper.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-1.5 self-start text-sm font-semibold text-accent hover:text-primary"
                >
                  Read paper
                  <ArrowUpRight size={16} aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <span aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
