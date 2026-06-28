import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import MedicalDisclaimer from '../../../components/health-resources/MedicalDisclaimer';
import YouTubeEmbed from '../../../components/health-resources/YouTubeEmbed';
import { serverApiGet } from '../../../lib/serverApi';

export async function generateStaticParams() {
  const data = await serverApiGet('/articles', { articles: [] });
  const slugs = (data.articles || []).map((article: any) => ({ slug: article.slug }));
  return slugs.length > 0 ? slugs : [{ slug: 'placeholder' }];
}

async function getArticle(slug: string) {
  return serverApiGet<{ article: any | null }>(
    `/articles/${slug}`,
    { article: null },
    { next: { revalidate: 3600 } }
  );
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getArticle(params.slug);
  const article = data.article;
  if (!article) return { title: 'Article Not Found | Spandan Clinic' };
  return {
    title: `${article.title} | Health Resources | Spandan Super Speciality Clinic`,
    description: article.excerpt || `Read about ${article.title} from Spandan Clinic's specialists.`,
    openGraph: {
      title: article.title,
      description: article.excerpt,
    },
  };
}

export default async function ArticleDetail({ params }: { params: { slug: string } }) {
  const data = await getArticle(params.slug);
  const article = data.article;

  if (!article) {
    return (
      <section className="section text-center py-24">
        <div className="container">
          <h2 className="text-2xl font-bold text-navy mb-4">Article Not Found</h2>
          <p className="text-text-light mb-6">The article you are looking for is not available. Please check back later or browse our health resources.</p>
          <Link href="/health-resources" className="btn bg-navy text-white hover:bg-navy-light">Browse Resources</Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-navy text-white py-16">
        <div className="container">
          <Link href="/health-resources" className="opacity-70 text-sm hover:opacity-100 transition-opacity">← Back to Resources</Link>
          <h1 className="text-3xl font-bold mt-4">{article.title}</h1>
          <div className="flex gap-3 mt-3 opacity-80 text-sm">
            <span>{article.category}</span>
            {article.published_at && (
              <>
                <span>•</span>
                <span>{new Date(article.published_at).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-[800px]">
          <MedicalDisclaimer />
          {article.youtube_video_url && <YouTubeEmbed url={article.youtube_video_url} />}
          <div className="text-base leading-relaxed whitespace-pre-wrap">{article.body_md}</div>

          <div className="mt-12 p-8 bg-bg-alt rounded-xl text-center">
            <h3 className="text-lg font-semibold mb-3">Have questions about this topic?</h3>
            <p className="text-text-light mb-5">Our specialists are here to help. Schedule a consultation today.</p>
            <Link href="/contact" className="btn bg-accent text-white hover:bg-accent-light">Contact Us</Link>
          </div>
        </div>
      </section>
    </>
  );
}
