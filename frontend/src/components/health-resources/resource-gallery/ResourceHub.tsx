import React from 'react';
import Link from 'next/link';
import { BookOpen, CalendarDays, Clock, Languages, UserCheck } from 'lucide-react';

export type HealthResourceArticle = {
  slug: string;
  title: string;
  excerpt?: string | null;
  category?: string | null;
  language?: string | null;
  content_format?: string | null;
  read_time_minutes?: number | null;
  published_at?: string | null;
  updated_at?: string | null;
  reviewed_at?: string | null;
  reviewer_display_name?: string | null;
  author_doctor_name?: string | null;
  author_doctor_slug?: string | null;
  author_doctor_speciality?: string | null;
  youtube_video_url?: string | null;
};

const languageLabels: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
};

const formatLabels: Record<string, string> = {
  article: 'Article',
  video: 'Video',
  tool: 'Tool',
  download: 'Download',
};

function formatDoctorName(name?: string | null): string | null {
  if (!name) return null;
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function languageLabel(value?: string | null): string {
  return (value && languageLabels[value]) || 'English';
}

function formatLabel(value?: string | null): string {
  return (value && formatLabels[value]) || 'Article';
}

function ResourceCard({ article }: { article: HealthResourceArticle }) {
  const authorName = formatDoctorName(article.author_doctor_name);
  const reviewedDate = formatDate(article.reviewed_at || article.updated_at || article.published_at);
  const publishedDate = formatDate(article.published_at);
  const format = formatLabel(article.content_format);

  return (
    <article className="card flex h-full flex-col border border-border">
      <Link href={`/health-resources/${article.slug}`} className="block flex-1 p-6 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">
        <div className="flex flex-wrap items-start gap-2">
          {article.category && <span className="badge badge-new">{article.category}</span>}
          <span className="badge bg-wash-sage text-accent">{format}</span>
          <span className="badge bg-blush/15 text-blush-deep">{languageLabel(article.language)}</span>
        </div>

        <h3 className="mt-4 text-lg font-bold leading-snug text-ink">{article.title}</h3>
        {article.excerpt && (
          <p className="mt-3 text-sm leading-relaxed text-text-light">{article.excerpt}</p>
        )}

        <dl className="mt-5 space-y-2 text-xs text-text-light">
          {authorName && (
            <div className="flex gap-2">
              <BookOpen className="mt-0.5 h-4 w-4 flex-none text-accent" aria-hidden="true" />
              <div>
                <dt className="sr-only">Author</dt>
                <dd>By {authorName}{article.author_doctor_speciality ? `, ${article.author_doctor_speciality}` : ''}</dd>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <UserCheck className="mt-0.5 h-4 w-4 flex-none text-accent" aria-hidden="true" />
            <div>
              <dt className="sr-only">Reviewer</dt>
              <dd>Reviewed by {article.reviewer_display_name || 'Spandan clinical review team'}{reviewedDate ? ` on ${reviewedDate}` : ''}</dd>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {publishedDate && (
              <div className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-accent" aria-hidden="true" />
                <dt className="sr-only">Published</dt>
                <dd>Published {publishedDate}</dd>
              </div>
            )}
            <div className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-accent" aria-hidden="true" />
              <dt className="sr-only">Read time</dt>
              <dd>{article.read_time_minutes || 3} min</dd>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <Languages className="h-4 w-4 text-accent" aria-hidden="true" />
              <dt className="sr-only">Language</dt>
              <dd>{languageLabel(article.language)}</dd>
            </div>
          </div>
        </dl>
      </Link>
    </article>
  );
}

/**
 * The article cards, and nothing else.
 *
 * This used to carry an Articles/Images/Events tab bar and a search form with
 * topic, language, and format filters. Both posted to /health-resources, which
 * is a permanent redirect back to /health, and the cards below already carry
 * the same topic, format, and language on every badge, so the controls were
 * removed in favour of the list itself.
 */
export default function ResourceHub({ articles }: { articles: HealthResourceArticle[] }) {
  // Nothing published means nothing rendered. An empty-state card here only told
  // the reader the clinic had no articles, which is noise on a page that already
  // carries calculators, videos, and research.
  if (articles.length === 0) return null;

  return (
    <section className="section">
      <div className="container">
        <p className="sr-only" role="status">{articles.length} resources found.</p>
        <div className="grid-3">
          {articles.map((article) => (
            <ResourceCard key={article.slug} article={article} />
          ))}
        </div>
      </div>
    </section>
  );
}
