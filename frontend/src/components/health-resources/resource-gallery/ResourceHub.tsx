'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CalendarDays, FileText, Image as ImageIcon } from 'lucide-react';
import ResourceGallery from './ResourceGallery';

type TabKey = 'blog' | 'images' | 'events';

export type HealthResourceArticle = {
  slug: string;
  title: string;
  excerpt?: string | null;
  category?: string | null;
  published_at?: string | null;
  author_doctor_name?: string | null;
};

const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'blog', label: 'Blog', icon: FileText },
  { key: 'images', label: 'Images', icon: ImageIcon },
  { key: 'events', label: 'Events', icon: CalendarDays },
];

function getActiveTab(tab?: string | null): TabKey {
  return tab === 'images' || tab === 'events' ? tab : 'blog';
}

function formatAuthorName(name?: string | null): string | null {
  if (!name) return null;
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
}

export default function ResourceHub({ articles }: { articles: HealthResourceArticle[] }) {
  const searchParams = useSearchParams();
  const activeTab = getActiveTab(searchParams.get('tab'));

  return (
    <>
      <section className="border-b border-border bg-white">
        <div className="container">
          <nav className="flex gap-2 overflow-x-auto py-4" aria-label="Health resource sections">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.key === activeTab;
              return (
                <Link
                  key={tab.key}
                  href={`/health-resources?tab=${tab.key}`}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-navy text-white'
                      : 'border border-border bg-white text-text hover:bg-bg-alt'
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
          {activeTab === 'blog' && (
            articles.length > 0 ? (
              <div className="grid-3">
                {articles.map((article) => {
                  const authorName = formatAuthorName(article.author_doctor_name);
                  return (
                    <Link key={article.slug} href={`/health-resources/${article.slug}`} className="card p-6 block">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        {article.category && <span className="badge badge-new">{article.category}</span>}
                        <span className="text-xs text-text-light">
                          {article.published_at ? new Date(article.published_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold mb-2 leading-snug">{article.title}</h3>
                      {article.excerpt && (
                        <p className="text-sm text-text-light leading-relaxed mb-3">{article.excerpt}</p>
                      )}
                      {authorName && (
                        <div className="text-xs font-medium text-text-light">By {authorName}</div>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-text-light">No articles available.</p>
            )
          )}

          {activeTab === 'images' && (
            <div>
              <div className="mb-8 max-w-[720px]">
                <h2 className="text-2xl font-bold text-navy">Resource Images</h2>
                <p className="mt-2 text-text-light">
                  A small collection of clinic resource visuals. More clinic photos can be added here when available.
                </p>
              </div>
              <ResourceGallery />
            </div>
          )}

          {activeTab === 'events' && (
            <div className="mx-auto max-w-[720px] rounded-lg border border-border bg-bg-alt p-8 text-center">
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
