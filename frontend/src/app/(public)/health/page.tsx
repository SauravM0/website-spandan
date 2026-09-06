import React from 'react';
import type { Metadata } from 'next';
import { Activity, BookOpen, GraduationCap, Video } from 'lucide-react';
import ResourceHub, {
  type HealthResourceArticle,
  type ResourceFilters,
} from '@/components/health-resources/resource-gallery/ResourceHub';
import MedicalCalculators from '@/components/tools/MedicalCalculators';
import VideoCard from '@/components/videos/VideoCard';
import VideoFilters from '@/components/videos/VideoFilters';
import VideoPagination from '@/components/videos/VideoPagination';
import PublicationLibrary from '@/components/publications/PublicationLibrary';
import { serverApiGet } from '@/lib/serverApi';
import { clinicSettings } from '@/lib/settings';
import { publicationAuthor, researchPublications } from '@/lib/publications';
import { filterVideos, paginateVideos, extractTopics, extractLanguages } from '@/lib/videos';
import type { VideosResponse } from '@/lib/videos';
import { bmiMeta } from '@/lib/tools/bmi';
import { bpMeta } from '@/lib/tools/blood-pressure';
import { diabetesMeta } from '@/lib/tools/diabetes-risk';
import Button from '@/components/ui/Button';

const toolList = [bmiMeta, bpMeta, diabetesMeta];

export const metadata: Metadata = {
  title: `Health Hub | ${clinicSettings.name}`,
  description:
    'Health articles, education videos, cardiometabolic calculators, and published research from the specialists at Spandan Super Speciality Clinic.',
  alternates: { canonical: '/health' },
  openGraph: {
    title: `Health Hub | ${clinicSettings.name}`,
    description: 'Articles, videos, calculators, and research in one place.',
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

async function getArticles(filters: ResourceFilters) {
  return serverApiGet<{ articles: HealthResourceArticle[] }>(
    buildArticleEndpoint(filters),
    { articles: [] },
    { next: { revalidate: 3600, tags: ['public-articles'] } }
  );
}

async function getAllArticles() {
  return serverApiGet<{ articles: HealthResourceArticle[] }>(
    '/articles',
    { articles: [] },
    { next: { revalidate: 3600, tags: ['public-articles'] } }
  );
}

async function getVideos() {
  return serverApiGet<VideosResponse>(
    '/youtube',
    { videos: [], channel: null },
    { next: { revalidate: 3600 } }
  );
}

function healthJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Health Hub | ${clinicSettings.name}`,
    description:
      'Health articles, education videos, health calculators, and published research from Spandan Super Speciality Clinic.',
    hasPart: [
      ...toolList.map((tool) => ({
        '@type': 'SoftwareApplication',
        name: tool.title,
        description: tool.description,
        applicationCategory: 'HealthApplication',
        author: { '@type': 'MedicalClinic', name: clinicSettings.name },
      })),
      {
        '@type': 'ItemList',
        name: `${publicationAuthor.name} research publications`,
        numberOfItems: researchPublications.length,
      },
    ],
  };
}

export default async function HealthPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = getFilters(params);

  const [articleData, allArticles, videoData] = await Promise.all([
    getArticles(filters),
    getAllArticles(),
    getVideos(),
  ]);

  const articles = articleData.articles || [];
  const categories = Array.from(
    new Set((allArticles.articles || []).map((article) => article.category).filter(Boolean) as string[])
  ).sort();

  const videoTopic = singleValue(params?.topic).trim();
  const videoLang = singleValue(params?.vlang).trim();
  const videoPage = Math.max(1, Number(singleValue(params?.page)) || 1);

  const allVideos = videoData.videos || [];
  const filteredVideos = filterVideos(allVideos, { topic: videoTopic, lang: videoLang });
  const paged = paginateVideos(filteredVideos, videoPage, 12);
  const topics = extractTopics(allVideos);
  const languages = extractLanguages(allVideos);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(healthJsonLd()) }}
      />

      <section className="soft-page-hero">
        <div className="container py-14 md:py-20">
          <div className="measure">
            <p className="eyebrow">Health hub</p>
            <h1 className="heading-display mt-3 text-ink">
              Learn, check, and understand your health
            </h1>
            <p className="lede mt-4">
              Reviewed articles, education videos from the clinic, quick health calculators, and the
              research our specialists have published. For symptoms or treatment decisions, please
              speak to a doctor.
            </p>
          </div>

          <nav aria-label="Health hub sections" className="mt-8 flex flex-wrap gap-2">
            <Button href="#calculators" variant="outline" size="sm">
              <Activity size={15} aria-hidden="true" />
              Calculators
            </Button>
            <Button href="#articles" variant="outline" size="sm">
              <BookOpen size={15} aria-hidden="true" />
              Articles
            </Button>
            <Button href="#videos" variant="outline" size="sm">
              <Video size={15} aria-hidden="true" />
              Videos
            </Button>
            <Button href="#research" variant="outline" size="sm">
              <GraduationCap size={15} aria-hidden="true" />
              Research
            </Button>
          </nav>
        </div>
      </section>

      <div id="calculators" className="scroll-mt-24">
        <section className="section section-paper">
          <div className="container">
            <div className="reveal measure">
              <p className="eyebrow">Check yourself</p>
              <h2 className="heading-section mt-3 text-ink">Health calculators</h2>
              <p className="lede mt-4">
                BMI, blood pressure, and diabetes risk, using Indian clinical ranges. Nothing you
                enter is stored, saved, or sent anywhere.
              </p>
            </div>
          </div>
        </section>
        <MedicalCalculators variant="section" />
      </div>

      <div id="articles" className="scroll-mt-24">
        <section className="section">
          <div className="container">
            <div className="reveal measure">
              <p className="eyebrow">Read</p>
              <h2 className="heading-section mt-3 text-ink">Health articles and resources</h2>
              <p className="lede mt-4">
                Reviewed health education by topic, language, and format.
              </p>
            </div>
          </div>
        </section>
        <ResourceHub articles={articles} filters={filters} categories={categories} />
      </div>

      <section id="videos" className="section section-alt scroll-mt-24" aria-labelledby="videos-title">
        <div className="container">
          <div className="reveal measure mb-8">
            <p className="eyebrow">Watch</p>
            <h2 id="videos-title" className="heading-section mt-3 text-ink">
              Health education videos
            </h2>
            <p className="lede mt-4">
              Explanations from the clinic&apos;s specialists on diabetes, thyroid, and heart health.
            </p>
          </div>

          {allVideos.length > 0 ? (
            <>
              <VideoFilters
                topics={topics}
                languages={languages}
                currentTopic={videoTopic}
                currentLang={videoLang}
                basePath="/health"
              />
              {paged.items.length > 0 ? (
                <>
                  <div className="stagger grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {paged.items.map((video) => (
                      <VideoCard key={video.id} video={video} />
                    ))}
                  </div>
                  <VideoPagination
                    currentPage={paged.page}
                    totalPages={paged.totalPages}
                    total={filteredVideos.length}
                    basePath="/health"
                    topic={videoTopic}
                    lang={videoLang}
                  />
                </>
              ) : (
                <p className="card p-6 text-sm text-text-light">
                  No videos match those filters. Clear them to see the full library.
                </p>
              )}
            </>
          ) : (
            <p className="card p-6 text-sm text-text-light">
              The video library is not available right now. Call the clinic on {clinicSettings.phone}{' '}
              if you need guidance in the meantime.
            </p>
          )}
        </div>
      </section>

      <section id="research" className="section scroll-mt-24" aria-labelledby="research-title">
        <div className="container">
          <div className="reveal measure mb-8">
            <p className="eyebrow">Evidence</p>
            <h2 id="research-title" className="heading-section mt-3 text-ink">
              Published research
            </h2>
            <p className="lede mt-4">
              {researchPublications.length} peer-reviewed papers and case reports associated with{' '}
              {publicationAuthor.name}, for clinicians, students, and researchers.
            </p>
          </div>
          <PublicationLibrary publications={researchPublications} />
        </div>
      </section>
    </>
  );
}
