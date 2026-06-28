import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Video } from 'lucide-react';
import ResourceHub, { type HealthResourceArticle } from '../../components/health-resources/resource-gallery/ResourceHub';
import { serverApiGet } from '../../lib/serverApi';

export const metadata: Metadata = {
  title: 'Health Resources & Articles | Spandan Super Speciality Clinic',
  description: 'Health articles, clinic resource images, and event updates from Spandan Clinic.',
  openGraph: {
    title: 'Health Resources | Spandan Clinic',
    description: 'Articles, resource images, and event updates from Spandan Clinic.',
  },
};

async function getArticles(): Promise<{ articles: HealthResourceArticle[] }> {
  return serverApiGet<{ articles: HealthResourceArticle[] }>(
    '/articles',
    { articles: [] },
    { next: { revalidate: 3600 } }
  );
}

export default async function HealthResourcesPage() {
  const data = await getArticles();
  const articles = data.articles || [];

  return (
    <>
      <section className="bg-navy text-white py-16">
        <div className="container">
          <div className="max-w-[760px]">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Health Resources</h1>
            <p className="opacity-85 text-lg leading-relaxed">
              Browse health articles, clinic resource images, and event updates from Spandan Clinic.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/videos" className="btn bg-white text-navy hover:bg-bg-alt">
              <Video className="h-4 w-4" aria-hidden="true" />
              Videos
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/contact" className="btn border border-white/35 text-white hover:bg-white/10">
              Contact Clinic
            </Link>
          </div>
        </div>
      </section>

      <Suspense fallback={<section className="section"><div className="container">Loading resources...</div></section>}>
        <ResourceHub articles={articles} />
      </Suspense>
    </>
  );
}
