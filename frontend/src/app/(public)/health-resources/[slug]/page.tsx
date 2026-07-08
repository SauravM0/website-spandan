import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MedicalDisclaimer from '@/components/health-resources/MedicalDisclaimer';
import YouTubeEmbed from '@/components/health-resources/YouTubeEmbed';
import BreadcrumbNav from '@/components/health-resources/BreadcrumbNav';
import ArticleMeta from '@/components/health-resources/ArticleMeta';
import TableOfContents from '@/components/health-resources/TableOfContents';
import MarkdownRenderer from '@/components/health-resources/MarkdownRenderer';
import RelatedResources from '@/components/health-resources/RelatedResources';
import { serverApiGet } from '@/lib/serverApi';
import { extractToc } from '@/lib/markdown';
import type { HealthResourceArticle } from '@/components/health-resources/resource-gallery/ResourceHub';

type ArticleDetailPayload = HealthResourceArticle & {
  body_md?: string | null;
  references?: Array<{ text: string; url?: string }> | null;
  version?: string | null;
  cover_image_url?: string | null;
};

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export async function generateStaticParams() {
  const data = await serverApiGet('/articles', { articles: [] });
  const slugs = (data.articles || []).map((article: any) => ({ slug: article.slug }));
  return slugs.length > 0 ? slugs : [{ slug: 'placeholder' }];
}

async function getArticle(slug: string) {
  return serverApiGet<{ article: ArticleDetailPayload | null }>(
    `/articles/${slug}`,
    { article: null },
    { next: { revalidate: 3600, tags: ['public-articles'] } }
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
      description: article.excerpt || undefined,
      type: 'article',
      publishedTime: article.published_at || undefined,
      modifiedTime: article.updated_at || undefined,
      images: article.cover_image_url ? [{ url: article.cover_image_url }] : undefined,
    },
  };
}

export default async function ArticleDetail({ params }: { params: { slug: string } }) {
  const data = await getArticle(params.slug);
  const article = data.article;

  if (!article) notFound();

  const tocEntries = extractToc(article.body_md || '');
  const versionDate = formatDate(article.updated_at || article.published_at);
  const reviewedDate = formatDate(article.reviewed_at || article.updated_at || article.published_at);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    headline: article.title,
    description: article.excerpt || undefined,
    url: `https://spandanclinic.com/health-resources/${article.slug}`,
    datePublished: article.published_at || undefined,
    dateModified: article.updated_at || article.published_at || undefined,
    author: article.author_doctor_name ? {
      '@type': 'Person',
      name: article.author_doctor_name,
    } : undefined,
    reviewer: {
      '@type': 'Person',
      name: article.reviewer_display_name || 'Spandan clinical review team',
    },
    reviewDate: article.reviewed_at || undefined,
    ...(article.cover_image_url ? { image: article.cover_image_url } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BreadcrumbNav title={article.title} />

      <section className="soft-page-hero py-16">
        <div className="container">
          <div className="flex flex-wrap items-center gap-3">
            {article.category && (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase text-pink-700 shadow-[0_8px_20px_rgba(236,72,153,0.12)]">
                {article.category}
              </span>
            )}
          </div>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">{article.title}</h1>
          <div className="mt-4">
            <ArticleMeta article={article} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-[800px]">
          <MedicalDisclaimer />

          {article.youtube_video_url && (
            <div className="mb-8">
              <YouTubeEmbed url={article.youtube_video_url} />
            </div>
          )}

          {tocEntries.length > 0 && <TableOfContents entries={tocEntries} />}

          {article.body_md ? (
            <MarkdownRenderer content={article.body_md} />
          ) : (
            <p className="py-8 text-center text-text-light">Content is being prepared. Please check back later.</p>
          )}

          {article.references && article.references.length > 0 && (
            <section className="soft-card mt-10 p-6">
              <h2 className="mb-4 text-lg font-bold text-navy">References</h2>
              <ol className="space-y-2 text-sm text-text-light">
                {article.references.map((ref, i) => (
                  <li key={i}>
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent"
                      >
                        {ref.text}
                        <span className="sr-only"> (opens in new tab)</span>
                      </a>
                    ) : (
                      <span>{ref.text}</span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {versionDate && (
            <p className="mt-8 text-xs text-text-light">
              Version updated: {versionDate}
              {article.version ? ` (v${article.version})` : ''}
            </p>
          )}

          <RelatedResources currentSlug={article.slug} category={article.category} />

          <div className="soft-card mt-12 p-8 text-center">
            <h3 className="mb-3 text-lg font-semibold">Have questions about this topic?</h3>
            <p className="mb-5 text-text-light">Our specialists are here to help. Schedule a consultation today.</p>
            <Link href="/contact" className="btn btn-accent">Contact Us</Link>
          </div>
        </div>
      </section>
    </>
  );
}
