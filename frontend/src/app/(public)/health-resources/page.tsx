import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Video } from 'lucide-react';
import ResourceHub, { type HealthResourceArticle, type ResourceFilters } from '@/components/health-resources/resource-gallery/ResourceHub';
import { serverApiGet } from '@/lib/serverApi';

export const metadata: Metadata = {
  title: 'Health Resources & Articles | Spandan Super Speciality Clinic',
  description: 'Health articles, clinic resource images, and event updates from Spandan Clinic.',
  openGraph: {
    title: 'Health Resources | Spandan Clinic',
    description: 'Articles, resource images, and event updates from Spandan Clinic.',
  },
};

type SearchParams = Record<string, string | string[] | undefined>;

function singleValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function getFilters(searchParams?: SearchParams): ResourceFilters {
  const tab = singleValue(searchParams?.tab);
  return {
    tab: tab === 'images' || tab === 'events' ? tab : 'blog',
    q: singleValue(searchParams?.q).trim(),
    category: singleValue(searchParams?.category).trim(),
    language: singleValue(searchParams?.lang).trim(),
    format: singleValue(searchParams?.format).trim(),
  };
}

function buildArticleEndpoint(filters: ResourceFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.language) params.set('lang', filters.language);
  if (filters.format) params.set('format', filters.format);
  const query = params.toString();
  return `/articles${query ? `?${query}` : ''}`;
}

async function getArticles(filters: ResourceFilters): Promise<{ articles: HealthResourceArticle[] }> {
  return serverApiGet<{ articles: HealthResourceArticle[] }>(
    buildArticleEndpoint(filters),
    { articles: [] },
    { next: { revalidate: 3600, tags: ['public-articles'] } }
  );
}

async function getCategories(): Promise<string[]> {
  const data = await serverApiGet<{ articles: HealthResourceArticle[] }>(
    '/articles',
    { articles: [] },
    { next: { revalidate: 3600, tags: ['public-articles'] } }
  );
  return Array.from(new Set((data.articles || []).map((article) => article.category).filter(Boolean) as string[])).sort();
}

export default async function HealthResourcesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const filters = getFilters(await searchParams);
  const [data, categories] = await Promise.all([getArticles(filters), getCategories()]);
  const articles = data.articles || [];

  return (
    <>
      <section className="soft-page-hero py-16">
        <div className="container">
          <div className="max-w-[760px]">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Health Resources</h1>
            <p className="text-lg leading-relaxed text-text-light">
              Browse reviewed health education by topic, language, and format. For symptoms or treatment decisions, please book a consultation.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/videos" className="btn btn-accent">
              <Video className="h-4 w-4" aria-hidden="true" />
              Videos
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/contact" className="btn btn-outline">
              Contact Clinic
            </Link>
          </div>
        </div>
      </section>

      <ResourceHub articles={articles} filters={filters} categories={categories} />
    </>
  );
}
