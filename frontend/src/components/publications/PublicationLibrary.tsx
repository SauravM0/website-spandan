'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ExternalLink, FileText, Search, UserRound, X } from 'lucide-react';
import {
  publicationAuthors,
  publicationTopics,
  publicationYears,
  type ResearchPublication,
} from '@/lib/publications';
import Button from '@/components/ui/Button';

const authorOptions = Object.values(publicationAuthors);

function PublicationCard({ publication }: { publication: ResearchPublication }) {
  return (
    <article id={publication.id} className="soft-card flex h-full scroll-mt-28 flex-col p-5 sm:p-6">
      <div className="flex flex-wrap gap-2">
        {publication.topics.slice(0, 2).map((topic) => (
          <span key={topic} className="rounded-full bg-wash-sage px-3 py-1 text-xs font-semibold text-accent">
            {topic}
          </span>
        ))}
      </div>
      <h2 className="mt-4 text-lg font-bold leading-snug text-ink">{publication.title}</h2>
      <dl className="mt-4 grid gap-2 text-sm text-text-light">
        {publication.journal && (
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 shrink-0 text-accent" size={16} aria-hidden="true" />
            <div><dt className="sr-only">Journal</dt><dd>{publication.journal}</dd></div>
          </div>
        )}
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 shrink-0 text-accent" size={16} aria-hidden="true" />
          <div><dt className="sr-only">Publication date</dt><dd>{publication.dateLabel}</dd></div>
        </div>
      </dl>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-text-light">{publication.description}</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {publication.authorSlugs.map((slug) => (
          <li key={slug}>
            <Link
              href={`/doctors/${slug}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-bg-alt px-3 py-1 text-xs font-semibold text-ink transition hover:text-accent"
            >
              <UserRound size={13} aria-hidden="true" />
              {publicationAuthors[slug].name}
            </Link>
          </li>
        ))}
      </ul>
      {publication.externalUrl ? (
        <Button
          href={publication.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          className="mt-5 self-start"
        >
          View publication <ExternalLink size={15} aria-hidden="true" />
        </Button>
      ) : (
        <p className="mt-5 rounded-2xl bg-bg-alt px-4 py-3 text-xs font-semibold text-text-light">
          External publication link not currently available.
        </p>
      )}
    </article>
  );
}

export default function PublicationLibrary({ publications }: { publications: ResearchPublication[] }) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('');
  const [year, setYear] = useState('');
  const [author, setAuthor] = useState('');

  // Doctor profiles deep-link here as /health?doctor=<slug>#research. Read it after
  // mount so the server render stays unfiltered and hydration matches.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('doctor');
    if (requested && requested in publicationAuthors) setAuthor(requested);
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return publications.filter((publication) => {
      const searchable = [publication.title, publication.journal, publication.description, ...publication.topics]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
      if (topic && !publication.topics.includes(topic as ResearchPublication['topics'][number])) return false;
      if (year && publication.year !== Number(year)) return false;
      if (author && !(publication.authorSlugs as readonly string[]).includes(author)) return false;
      return true;
    });
  }, [publications, query, topic, year, author]);

  const clearFilters = () => {
    setQuery('');
    setTopic('');
    setYear('');
    setAuthor('');
  };

  return (
    <>
      <section className="border-b border-primary/10 bg-white py-8">
        <div className="container">
          <div className="soft-card grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.3fr)_1fr_1fr_0.7fr_auto] lg:items-end">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Search publications</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-light" size={17} aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Title, journal, topic, or keyword"
                  className="min-h-[44px] w-full rounded-2xl border border-border bg-white py-2 pl-10 pr-3"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Research topic</span>
              <select value={topic} onChange={(event) => setTopic(event.target.value)} className="min-h-[44px] w-full rounded-2xl border border-border bg-white px-3 py-2">
                <option value="">All topics</option>
                {publicationTopics.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Doctor</span>
              <select value={author} onChange={(event) => setAuthor(event.target.value)} className="min-h-[44px] w-full rounded-2xl border border-border bg-white px-3 py-2">
                <option value="">All doctors</option>
                {authorOptions.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Year</span>
              <select value={year} onChange={(event) => setYear(event.target.value)} className="min-h-[44px] w-full rounded-2xl border border-border bg-white px-3 py-2">
                <option value="">All years</option>
                {publicationYears.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <Button onClick={clearFilters} variant="outline" disabled={!query && !topic && !year && !author}>
              <X size={16} aria-hidden="true" /> Clear
            </Button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-sm font-semibold text-text-light" role="status" aria-live="polite">
              Showing {filtered.length} of {publications.length} publications
            </p>
            <Link href="/doctors" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              <UserRound size={16} aria-hidden="true" /> View doctor profiles
            </Link>
          </div>

          {filtered.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((publication) => <PublicationCard key={publication.id} publication={publication} />)}
            </div>
          ) : (
            <div className="soft-card p-10 text-center">
              <h2 className="text-xl font-bold text-ink">No publications match these filters</h2>
              <p className="mt-3 text-text-light">Try a broader keyword, topic, or year.</p>
              <Button onClick={clearFilters} variant="primary" className="mt-6">Clear filters</Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
