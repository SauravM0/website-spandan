import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import VideoCard from '@/components/videos/VideoCard';
import VideoFilters from '@/components/videos/VideoFilters';
import VideoPagination from '@/components/videos/VideoPagination';
import { serverApiGet } from '@/lib/serverApi';
import { filterVideos, paginateVideos, extractTopics, extractLanguages } from '@/lib/videos';
import type { Video, VideosResponse } from '@/lib/videos';

function YoutubeIcon({ size, className }: { size?: number; className?: string }) {
  return (
    <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.5 6.2c-.3-1.1-1.1-1.9-2.2-2.2C19.7 3.5 12 3.5 12 3.5s-7.7 0-9.3.5c-1.1.3-1.9 1.1-2.2 2.2C0 7.8 0 12 0 12s0 4.2.5 5.8c.3 1.1 1.1 1.9 2.2 2.2 1.6.5 9.3.5 9.3.5s7.7 0 9.3-.5c1.1-.3 1.9-1.1 2.2-2.2.5-1.6.5-5.8.5-5.8s0-4.2-.5-5.8zM9.5 15.5V8.5l6.2 3.5-6.2 3.5z" />
    </svg>
  );
}

type SearchParams = Record<string, string | string[] | undefined>;

function singleValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

async function getVideos() {
  return serverApiGet<VideosResponse>(
    '/youtube',
    { videos: [], channel: null },
    { next: { revalidate: 3600 } }
  );
}

export const metadata: Metadata = {
  title: 'Videos | Spandan Super Speciality Clinic',
  description: 'Watch health education videos from Dr. Pratibha Pawal-Aute on diabetes, thyroid, heart health, and more from Spandan Clinic, Chhatrapati Sambhajinagar.',
  openGraph: {
    title: 'Health Videos | Spandan Clinic',
    description: 'Expert health education videos from our specialists.',
  },
};

export default async function VideosPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const [data, params] = await Promise.all([getVideos(), searchParams]);
  const allVideos: Video[] = data.videos || [];
  const channel = data.channel;

  const currentTopic = singleValue(params?.topic);
  const currentLang = singleValue(params?.lang);
  const currentPage = Math.max(1, parseInt(singleValue(params?.page), 10) || 1);

  const topics = extractTopics(allVideos);
  const languages = extractLanguages(allVideos);
  const filtered = filterVideos(allVideos, { topic: currentTopic, lang: currentLang });
  const { items: pagedVideos, page, totalPages, total } = paginateVideos(filtered, currentPage, 12);

  const featured = allVideos.find((v) => v.isReviewed) || pagedVideos[0] || null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Health Videos',
    description: 'Expert health education videos from Spandan Clinic specialists.',
    url: 'https://spandanclinic.com/videos',
    ...(featured
      ? {
          mainEntity: {
            '@type': 'VideoObject',
            name: featured.title,
            description: featured.description || undefined,
            thumbnailUrl: featured.thumbnail || undefined,
            uploadDate: featured.publishedAt || undefined,
            duration: featured.duration || undefined,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="soft-page-hero py-16 text-center">
        <div className="container">
          <h1 className="mb-3 text-3xl font-bold md:text-4xl">Health Videos</h1>
          <p className="text-lg text-text-light">Expert health education from our specialists</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="mb-8 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">Educational purposes only</p>
            <p className="mt-0.5">
              These videos are for general education and are not a substitute for professional medical advice.
            </p>
          </div>

          {(topics.length > 0 || languages.length > 0) && (
            <VideoFilters
              topics={topics}
              languages={languages}
              currentTopic={currentTopic}
              currentLang={currentLang}
              basePath="/videos"
            />
          )}

          {pagedVideos.length > 0 ? (
            <>
              <div className="grid-3">
                {pagedVideos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>

              <VideoPagination
                currentPage={page}
                totalPages={totalPages}
                total={total}
                basePath="/videos"
                topic={currentTopic}
                lang={currentLang}
              />
            </>
          ) : (
            <div className="soft-card p-10 text-center">
              <YoutubeIcon size={48} className="mx-auto mb-4 text-text-light" />
              <h2 className="mb-2 text-xl font-bold text-navy">
                {allVideos.length === 0 ? 'Videos being updated' : 'No videos match these filters'}
              </h2>
              <p className="mx-auto mb-6 max-w-[520px] text-text-light">
                {allVideos.length === 0
                  ? 'Health education videos are being prepared. Please check back later or visit our YouTube channel.'
                  : 'Try a different topic or language filter.'}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {allVideos.length > 0 && (
                  <Link href="/videos" className="btn btn-outline">
                    Clear filters
                  </Link>
                )}
                {channel && (
                  <a
                    href={channel.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-accent inline-flex items-center gap-2"
                  >
                    <YoutubeIcon size={20} />
                    Visit YouTube Channel
                  </a>
                )}
                <Link href="/health-resources" className="btn btn-outline inline-flex items-center gap-2">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Browse articles
                </Link>
              </div>
            </div>
          )}

          {pagedVideos.length > 0 && channel && (
            <div className="mt-12 text-center">
              <a
                href={channel.channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-accent inline-flex items-center gap-2"
              >
                <YoutubeIcon size={20} />
                Subscribe on YouTube
              </a>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
