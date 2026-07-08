import React from 'react';
import Link from 'next/link';
import { BookOpen, CalendarDays, Clock, FileText, Image as ImageIcon, Languages, Search, UserCheck, Video } from 'lucide-react';
import ResourceGallery from './ResourceGallery';

type TabKey = 'blog' | 'images' | 'events';

export type ResourceFilters = {
  tab: TabKey;
  q: string;
  category: string;
  language: string;
  format: string;
};

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

const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'blog', label: 'Articles', icon: FileText },
  { key: 'images', label: 'Images', icon: ImageIcon },
  { key: 'events', label: 'Events', icon: CalendarDays },
];

const languageOptions = [
  { value: '', label: 'All languages' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'mr', label: 'Marathi' },
];

const formatOptions = [
  { value: '', label: 'All formats' },
  { value: 'article', label: 'Articles' },
  { value: 'video', label: 'Videos' },
  { value: 'tool', label: 'Tools' },
  { value: 'download', label: 'Downloads' },
];

function formatDoctorName(name?: string | null): string | null {
  if (!name) return null;
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function languageLabel(value?: string | null): string {
  return languageOptions.find((option) => option.value === value)?.label || 'English';
}

function formatLabel(value?: string | null): string {
  return formatOptions.find((option) => option.value === value)?.label.replace(/s$/, '') || 'Article';
}

function makeTabHref(tab: TabKey, filters: ResourceFilters): string {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (tab === 'blog') {
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);
    if (filters.language) params.set('lang', filters.language);
    if (filters.format) params.set('format', filters.format);
  }
  return `/health-resources?${params.toString()}`;
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
          <span className="badge bg-teal-50 text-teal-700">{format}</span>
          <span className="badge bg-pink-100 text-pink-700">{languageLabel(article.language)}</span>
        </div>

        <h3 className="mt-4 text-lg font-bold leading-snug text-navy">{article.title}</h3>
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

export default function ResourceHub({
  articles,
  filters,
  categories,
}: {
  articles: HealthResourceArticle[];
  filters: ResourceFilters;
  categories: string[];
}) {
  return (
    <>
      <section className="border-b border-border bg-white">
        <div className="container">
          <nav className="flex gap-2 overflow-x-auto py-4" aria-label="Health resource sections">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.key === filters.tab;
              return (
                <Link
                  key={tab.key}
                  href={makeTabHref(tab.key, filters)}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-accent to-primary text-white shadow-[0_10px_24px_rgba(43,138,198,0.16)]'
                      : 'bg-white/80 text-text shadow-[inset_0_0_0_1px_rgba(74,144,226,0.16)] hover:-translate-y-0.5 hover:bg-blue-50'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {filters.tab === 'blog' && (
            <>
              <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
                <div className="max-w-[760px]">
                  <p className="text-sm font-semibold uppercase tracking-[0.08em] text-accent">Reviewed education</p>
                  <h2 className="mt-2 text-2xl font-bold text-navy">Find resources by topic, language, or format</h2>
                  <p className="mt-3 leading-relaxed text-text-light">
                    These resources are for general education. They do not replace a consultation or advice based on your medical history.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <Link href="/videos" className="btn btn-outline">
                    <Video className="h-4 w-4" aria-hidden="true" />
                    Videos
                  </Link>
                  <Link href="/tools" className="btn btn-outline">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    Tools
                  </Link>
                </div>
              </div>

              <form action="/health-resources" className="soft-card mb-8 p-4 md:p-5">
                <input type="hidden" name="tab" value="blog" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_1fr_1fr_1fr_auto]">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">Search</span>
                    <span className="relative block">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light" aria-hidden="true" />
                      <input
                        name="q"
                        defaultValue={filters.q}
                        className="min-h-[44px] w-full rounded-2xl border border-border bg-white py-2 pl-10 pr-3"
                        placeholder="Search topics"
                      />
                    </span>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">Topic</span>
                    <select name="category" defaultValue={filters.category} className="min-h-[44px] w-full rounded-2xl border border-border bg-white px-3 py-2">
                      <option value="">All topics</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">Language</span>
                    <select name="lang" defaultValue={filters.language} className="min-h-[44px] w-full rounded-2xl border border-border bg-white px-3 py-2">
                      {languageOptions.map((option) => (
                        <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">Format</span>
                    <select name="format" defaultValue={filters.format} className="min-h-[44px] w-full rounded-2xl border border-border bg-white px-3 py-2">
                      {formatOptions.map((option) => (
                        <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-end gap-3">
                    <button type="submit" className="btn btn-primary w-full md:w-auto">Apply</button>
                    <Link href="/health-resources?tab=blog" className="btn btn-outline">Reset</Link>
                  </div>
                </div>
              </form>

              <p className="sr-only" role="status">{articles.length} resources found.</p>
              {articles.length > 0 ? (
                <div className="grid-3">
                  {articles.map((article) => (
                    <ResourceCard key={article.slug} article={article} />
                  ))}
                </div>
              ) : (
                <div className="soft-card p-8 text-center">
                  <h3 className="text-xl font-bold text-navy">No resources match these filters</h3>
                  <p className="mx-auto mt-3 max-w-[560px] text-text-light">
                    Try a broader topic, language, or format. For personal symptoms or treatment decisions, contact the clinic directly.
                  </p>
                  <Link href="/contact" className="btn btn-primary mt-6">Contact Clinic</Link>
                </div>
              )}
            </>
          )}

          {filters.tab === 'images' && (
            <div>
              <div className="mb-8 max-w-[720px]">
                <h2 className="text-2xl font-bold text-navy">Resource Images</h2>
                <p className="mt-2 text-text-light">
                  Clinic education and patient support visuals. Image failures leave the captions available.
                </p>
              </div>
              <ResourceGallery />
            </div>
          )}

          {filters.tab === 'events' && (
            <div className="soft-card mx-auto max-w-[720px] p-8 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-navy" aria-hidden="true" />
              <h2 className="mt-4 text-2xl font-bold text-navy">Events</h2>
              <p className="mt-3 text-text-light">
                No public events are scheduled at this time. Check back for future clinic updates.
              </p>
              <Link href="/contact" className="btn btn-primary mt-6">
                Contact Clinic
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
