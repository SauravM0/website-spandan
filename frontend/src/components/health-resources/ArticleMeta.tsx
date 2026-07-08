import React from 'react';
import Link from 'next/link';
import { CalendarDays, Clock, Languages, UserCheck } from 'lucide-react';
import type { HealthResourceArticle } from '@/components/health-resources/resource-gallery/ResourceHub';

const languageLabels: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
};

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatDoctorName(name?: string | null): string | null {
  if (!name) return null;
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
}

export default function ArticleMeta({ article }: { article: HealthResourceArticle }) {
  const authorName = formatDoctorName(article.author_doctor_name);
  const reviewedDate = formatDate(article.reviewed_at || article.updated_at || article.published_at);
  const publishedDate = formatDate(article.published_at);

  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-light">
      {authorName && (
        <div className="inline-flex items-center gap-1.5">
          <dt className="sr-only">Author</dt>
          <dd>
            {article.author_doctor_slug ? (
              <Link href={`/doctors/${article.author_doctor_slug}`} className="font-medium text-accent transition-colors hover:text-accent-light">
                By {authorName}
              </Link>
            ) : (
              <span>By {authorName}</span>
            )}
            {article.author_doctor_speciality ? `, ${article.author_doctor_speciality}` : ''}
          </dd>
        </div>
      )}
      <div className="inline-flex items-center gap-1.5">
        <UserCheck className="h-4 w-4 flex-none text-accent" aria-hidden="true" />
        <dt className="sr-only">Reviewer</dt>
        <dd>
          Reviewed by {article.reviewer_display_name || 'Spandan clinical review team'}
          {reviewedDate ? ` on ${reviewedDate}` : ''}
        </dd>
      </div>
      {publishedDate && (
        <div className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 flex-none text-accent" aria-hidden="true" />
          <dt className="sr-only">Published</dt>
          <dd>{publishedDate}</dd>
        </div>
      )}
      <div className="inline-flex items-center gap-1.5">
        <Clock className="h-4 w-4 flex-none text-accent" aria-hidden="true" />
        <dt className="sr-only">Read time</dt>
        <dd>{article.read_time_minutes || 3} min read</dd>
      </div>
      {article.language && (
        <div className="inline-flex items-center gap-1.5">
          <Languages className="h-4 w-4 flex-none text-accent" aria-hidden="true" />
          <dt className="sr-only">Language</dt>
          <dd>{languageLabels[article.language] || article.language}</dd>
        </div>
      )}
    </dl>
  );
}
