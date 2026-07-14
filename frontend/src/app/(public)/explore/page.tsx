import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  MessageCircle,
  Play,
  Share2,
  TestTube2,
  type LucideIcon,
} from 'lucide-react';
import HorizontalRail from '@/components/explore/HorizontalRail';
import { clinicSettings } from '@/lib/settings';
import { publishedFacilities } from '@/lib/facilities';
import { serverApiGet } from '@/lib/serverApi';
import type { PublicArticleSummary } from '@/lib/home';
import type { Video, VideosResponse } from '@/lib/videos';
import { researchPublications } from '@/lib/publications';

export const metadata: Metadata = {
  title: 'Diagnostics, Facilities & Health Resources | Spandan Clinic',
  description:
    'Explore Spandan Clinic laboratory equipment, diagnostic support, reviewed health articles, specialist videos, events, and public education channels.',
  openGraph: {
    title: 'Explore Spandan Clinic',
    description: 'In-clinic diagnostics, health education, videos, events, and clinic updates in one place.',
  },
};

async function getExploreData() {
  const [articleData, videoData] = await Promise.all([
    serverApiGet<{ articles: PublicArticleSummary[] }>(
      '/articles',
      { articles: [] },
      { next: { revalidate: 3600, tags: ['public-articles'] } }
    ),
    serverApiGet<VideosResponse>(
      '/youtube',
      { videos: [], channel: null },
      { next: { revalidate: 3600 } }
    ),
  ]);

  return {
    articles: (articleData.articles || []).slice(0, 3),
    videos: (videoData.videos || []).slice(0, 2),
    channel: videoData.channel,
  };
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function ArticlePreview({ article }: { article: PublicArticleSummary }) {
  return (
    <Link
      href={`/health-resources/${article.slug}`}
      className="soft-card group flex h-full flex-col p-5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-accent">
          <FileText size={15} aria-hidden="true" />
          {article.category || 'Health article'}
        </span>
        {article.published_at && <span className="text-xs text-text-light">{formatDate(article.published_at)}</span>}
      </div>
      <h3 className="mt-4 text-lg font-bold leading-snug text-navy group-hover:text-accent">{article.title}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-text-light">
        {article.excerpt || 'Reviewed health education from the Spandan clinical team.'}
      </p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">
        Read article <ArrowRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
}

function VideoPreview({ video }: { video: Video }) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="soft-card group overflow-hidden focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
    >
      <div className="relative aspect-video overflow-hidden bg-navy">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt=""
            className="h-full w-full object-cover opacity-90 transition duration-300 group-hover:scale-[1.03] group-hover:opacity-100"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-navy to-accent" />
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-accent shadow-lg transition group-hover:scale-105">
            <Play className="ml-1" size={24} fill="currentColor" aria-hidden="true" />
          </span>
        </span>
      </div>
      <div className="p-5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-pink-700">Health video</p>
        <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-navy">{video.title}</h3>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">
          Watch on YouTube <ExternalLink size={15} aria-hidden="true" />
        </span>
      </div>
    </a>
  );
}

export default async function ExplorePage() {
  const { articles, videos, channel } = await getExploreData();
  const allFacilities = publishedFacilities();
  const equipment = allFacilities.filter((item) => item.category === 'Laboratory diagnostics');
  const monitoring = allFacilities.filter(
    (item) => item.category !== 'Environment' && item.category !== 'Laboratory diagnostics'
  );

  const socialProfiles: Array<{ label: string; text: string; href: string; icon: LucideIcon }> = [
    ...(channel?.channelUrl
      ? [{ label: 'YouTube', text: 'Specialist health videos', href: channel.channelUrl, icon: Play }]
      : []),
    ...(clinicSettings.social.instagram
      ? [{ label: 'Instagram', text: 'Posters, reels, and updates', href: clinicSettings.social.instagram, icon: ImageIcon }]
      : []),
    ...(clinicSettings.social.linkedin
      ? [{ label: 'LinkedIn', text: 'Professional articles and updates', href: clinicSettings.social.linkedin, icon: FileText }]
      : []),
    ...(clinicSettings.social.facebook
      ? [{ label: 'Facebook', text: 'Events and community updates', href: clinicSettings.social.facebook, icon: Share2 }]
      : []),
    { label: 'WhatsApp', text: 'Contact the clinic', href: clinicSettings.social.whatsapp, icon: MessageCircle },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Diagnostics, Facilities and Health Resources',
    description: metadata.description,
    about: equipment.map((item) => item.name),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="soft-page-hero py-16 sm:py-20">
        <div className="container grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-pink-700 shadow-[0_8px_20px_rgba(236,72,153,0.12)]">
              <CheckCircle2 size={16} aria-hidden="true" />
              Explore Spandan Clinic
            </p>
            <h1 className="max-w-[820px] text-3xl font-bold leading-tight text-navy sm:text-4xl lg:text-5xl">
              Diagnostics, facilities, and trusted health education
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-text-light sm:text-lg">
              See the equipment available at our clinic, understand diagnostic support, and continue to reviewed articles, specialist videos, events, and clinic updates.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#equipment" className="btn btn-accent">
                <TestTube2 size={18} aria-hidden="true" />
                Our Equipment
              </a>
              <a href="#knowledge" className="btn btn-outline">
                <BookOpen size={18} aria-hidden="true" />
                Articles & Videos
              </a>
              <a href="#research" className="btn btn-outline">
                <GraduationCap size={18} aria-hidden="true" />
                Research
              </a>
              <Link href="/book-appointment" className="btn btn-outline">
                <CalendarCheck size={18} aria-hidden="true" />
                Book Appointment
              </Link>
            </div>
          </div>

          <div className="soft-card relative overflow-hidden p-6 sm:p-8">
            <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-blue-100/70" aria-hidden="true" />
            <div className="relative">
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-accent">One place to explore</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ['5', 'Laboratory analyzers'],
                  [String(monitoring.length), 'Monitoring services'],
                  [String(researchPublications.length), 'Research publications'],
                  [String(videos.length || '—'), 'Featured videos'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl bg-bg-alt p-4">
                    <p className="text-2xl font-bold text-navy">{value}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-light">{label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs leading-relaxed text-text-light">
                Test suitability, preparation, and current availability must be confirmed with the clinic.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="equipment" className="section scroll-mt-24">
        <div className="container">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-accent">In-clinic laboratory</p>
              <h2 className="heading-section mt-2 text-navy">Equipment available at Spandan</h2>
              <p className="mt-3 leading-relaxed text-text-light">
                Swipe or use the arrow controls to explore the clinic's laboratory analyzers. Select any item for purpose, process, preparation, and availability guidance.
              </p>
            </div>
            <Link href="/facilities#laboratory-diagnostics" className="btn btn-outline self-start md:self-auto">
              Full facility details <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-4">
            <HorizontalRail label="laboratory equipment">
              {equipment.map((item) => (
                <Link
                  key={item.id}
                  href={`/facilities#${item.id}`}
                  className="soft-card group w-[84vw] max-w-[360px] flex-none snap-start overflow-hidden focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 sm:w-[340px]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-white">
                    {item.media && (
                      <Image
                        src={item.media.src}
                        alt={item.media.alt}
                        fill
                        sizes="(max-width: 640px) 84vw, 340px"
                        className="object-contain p-5 transition duration-300 group-hover:scale-[1.03]"
                      />
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
                      Available in clinic
                    </span>
                  </div>
                  <div className="border-t border-primary/10 p-5">
                    <h3 className="text-lg font-bold leading-snug text-navy group-hover:text-accent">{item.name}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-text-light">{item.publicDescription}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                      View details <ArrowRight size={16} aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              ))}
            </HorizontalRail>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-accent">Beyond the laboratory</p>
            <h2 className="heading-section mt-2 text-navy">Monitoring and assessment support</h2>
            <p className="mt-3 text-text-light">These services may require prior booking, doctor advice, or device confirmation.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {monitoring.map((item) => (
              <Link key={item.id} href={`/facilities#${item.id}`} className="soft-card trust-card flex h-full gap-4 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-accent">
                  <Activity size={21} aria-hidden="true" />
                </span>
                <span>
                  <strong className="block text-navy">{item.name}</strong>
                  <span className="mt-1 block text-sm leading-relaxed text-text-light">{item.publicDescription}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="knowledge" className="section scroll-mt-24">
        <div className="container">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-accent">Learn from our specialists</p>
            <h2 className="heading-section mt-2 text-navy">Articles and videos, side by side</h2>
            <p className="mt-3 text-text-light">General education to help you prepare better questions for your consultation.</p>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-5 flex items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-navy">Latest health articles</h3>
                <Link href="/health-resources" className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
                  All articles <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
              {articles.length ? (
                <div className="grid gap-4">
                  {articles.map((article) => <ArticlePreview key={article.slug} article={article} />)}
                </div>
              ) : (
                <div className="soft-card p-7">
                  <BookOpen className="text-accent" size={28} aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-bold text-navy">Reviewed articles are being updated</h3>
                  <p className="mt-2 text-sm text-text-light">Visit the resource library for current clinic education and updates.</p>
                  <Link href="/health-resources" className="btn btn-outline mt-5">Open resources</Link>
                </div>
              )}
            </div>

            <div>
              <div className="mb-5 flex items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-navy">Featured videos</h3>
                <Link href="/videos" className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
                  All videos <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
              {videos.length ? (
                <div className="grid gap-4">
                  {videos.map((video) => <VideoPreview key={video.id} video={video} />)}
                </div>
              ) : (
                <div className="soft-card p-7">
                  <Play className="text-accent" size={28} aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-bold text-navy">Health videos are being updated</h3>
                  <p className="mt-2 text-sm text-text-light">The complete video collection will appear when the clinic channel sync is available.</p>
                  <Link href="/videos" className="btn btn-outline mt-5">Open videos</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="research" className="section section-alt scroll-mt-24">
        <div className="container">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-accent">Research and academic work</p>
              <h2 className="heading-section mt-2 text-navy">Research publications associated with Dr. Pratibha Pawal-Aute</h2>
              <p className="mt-3 leading-relaxed text-text-light">
                Explore endocrinology research and case reports across genetics, bone and mineral health, thyroid, pediatric endocrinology, and metabolic medicine.
              </p>
            </div>
            <Link href="/publications" className="btn btn-outline self-start md:self-auto">
              Search all {researchPublications.length} publications <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-4">
            <HorizontalRail label="research publications">
              {researchPublications.map((publication) => (
                <Link
                  key={publication.id}
                  href={`/publications#${publication.id}`}
                  className="soft-card group flex w-[86vw] max-w-[380px] flex-none snap-start flex-col p-5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 sm:w-[360px]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-accent">
                      {publication.topics[0]}
                    </span>
                    {publication.year && <span className="text-xs font-semibold text-text-light">{publication.year}</span>}
                  </div>
                  <h3 className="mt-4 line-clamp-4 text-lg font-bold leading-snug text-navy group-hover:text-accent">{publication.title}</h3>
                  {publication.journal && <p className="mt-3 text-sm font-semibold text-pink-700">{publication.journal}</p>}
                  <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-text-light">{publication.description}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                    Publication details <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </HorizontalRail>
          </div>
        </div>
      </section>

      <section id="updates" className="section bg-bg-alt scroll-mt-24">
        <div className="container">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-accent">Clinic activity</p>
            <h2 className="heading-section mt-2 text-navy">Events, posters, and updates</h2>
            <p className="mt-3 text-text-light">Explore public clinic activity without mixing it into medical advice or appointment information.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Link href="/health-resources?tab=events" className="soft-card group flex items-start gap-5 p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-pink-700">
                <CalendarDays size={23} aria-hidden="true" />
              </span>
              <span>
                <strong className="block text-xl text-navy group-hover:text-accent">Events and health campaigns</strong>
                <span className="mt-2 block text-sm leading-relaxed text-text-light">See public camps, awareness programmes, and future clinic events as they are announced.</span>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">View events <ArrowRight size={15} /></span>
              </span>
            </Link>
            <Link href="/health-resources?tab=images" className="soft-card group flex items-start gap-5 p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-accent">
                <ImageIcon size={23} aria-hidden="true" />
              </span>
              <span>
                <strong className="block text-xl text-navy group-hover:text-accent">Posters and visual education</strong>
                <span className="mt-2 block text-sm leading-relaxed text-text-light">Browse patient education posters, clinic announcements, and visual health resources.</span>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">View posters <ArrowRight size={15} /></span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-accent">Stay connected</p>
            <h2 className="heading-section mt-2 text-navy">Follow Spandan</h2>
            <p className="mt-3 text-text-light">Only configured, official clinic profiles are displayed here.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {socialProfiles.map((profile) => {
              const Icon = profile.icon;
              return (
                <a
                  key={profile.label}
                  href={profile.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="soft-card group flex items-center gap-4 p-5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-accent">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-navy group-hover:text-accent">{profile.label}</strong>
                    <span className="mt-1 block text-xs text-text-light">{profile.text}</span>
                  </span>
                  <ExternalLink className="shrink-0 text-text-light" size={16} aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="soft-cta py-12">
        <div className="container grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-2xl font-bold text-navy sm:text-3xl">Need help choosing the right next step?</h2>
            <p className="mt-3 max-w-2xl text-text-light">Contact the clinic to confirm diagnostic availability, preparation, or the appropriate specialist appointment.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/book-appointment" className="btn btn-accent">Book Appointment</Link>
            <a href={`tel:${clinicSettings.phone}`} className="btn btn-outline">Call Clinic</a>
          </div>
        </div>
      </section>
    </>
  );
}
