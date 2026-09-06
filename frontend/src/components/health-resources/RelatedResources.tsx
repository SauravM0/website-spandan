import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { serverApiGet } from '@/lib/serverApi';
import type { HealthResourceArticle } from '@/components/health-resources/resource-gallery/ResourceHub';
import Button from '@/components/ui/Button';

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatDoctorName(name?: string | null): string | null {
  if (!name) return null;
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
}

export default async function RelatedResources({
  currentSlug,
  category,
  limit = 3,
}: {
  currentSlug: string;
  category?: string | null;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  params.set('limit', String(limit + 1));
  const query = params.toString();

  const data = await serverApiGet<{ articles: HealthResourceArticle[] }>(
    `/articles${query ? `?${query}` : ''}`,
    { articles: [] },
    { next: { revalidate: 3600, tags: ['public-articles'] } }
  );

  const related = (data.articles || []).filter((a) => a.slug !== currentSlug).slice(0, limit);

  if (related.length === 0) return null;

  return (
    <section className="mt-14 border-t border-border pt-10">
      <h2 className="mb-6 text-xl font-bold text-ink">Related Resources</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((article) => {
          const authorName = formatDoctorName(article.author_doctor_name);
          const reviewedDate = formatDate(article.reviewed_at || article.updated_at || article.published_at);
          return (
            <article key={article.slug} className="soft-card flex flex-col">
              <Link
                href={`/health-resources/${article.slug}`}
                className="flex flex-1 flex-col p-5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {article.category && <span className="badge badge-new text-xs">{article.category}</span>}
                </div>
                <h3 className="mt-2 font-semibold leading-snug text-ink">{article.title}</h3>
                {article.excerpt && (
                  <p className="mt-1.5 text-sm leading-relaxed text-text-light line-clamp-2">{article.excerpt}</p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs text-text-light">
                  {authorName && <span>By {authorName}</span>}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {article.read_time_minutes || 3} min
                  </span>
                  {reviewedDate && <span>Reviewed {reviewedDate}</span>}
                </div>
              </Link>
            </article>
          );
        })}
      </div>
      <div className="mt-6 text-center">
        <Button
          href={`/health-resources${category ? `?tab=blog&category=${encodeURIComponent(category)}` : '?tab=blog'}`}
          variant="outline"
          className="inline-flex items-center gap-2"
        >
          View all resources
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
