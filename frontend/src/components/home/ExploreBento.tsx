import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  FileText,
  FlaskConical,
  Gauge,
  HeartPulse,
  Image as ImageIcon,
  Microscope,
  Play,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { publishedFacilities } from '@/lib/facilities';
import type { PublicArticleSummary } from '@/lib/home';
import { researchPublications } from '@/lib/publications';
import { getAllCalculators } from '@/lib/tools/registry';

type ExploreBentoProps = {
  article: PublicArticleSummary | null;
  video: PublicArticleSummary | null;
};

function youtubeThumbnail(value?: string | null) {
  if (!value) return null;

  const match = value.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  return match?.[1] ? `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg` : null;
}

function CardArrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="home-bento-cta">
      {children}
      <ArrowRight size={16} aria-hidden="true" />
    </span>
  );
}

export default function ExploreBento({ article, video }: ExploreBentoProps) {
  const facilities = publishedFacilities();
  const laboratoryAnalyzers = facilities.filter((item) => item.category === 'Laboratory diagnostics');
  const monitoringServices = facilities.filter(
    (item) => item.category !== 'Environment' && item.category !== 'Laboratory diagnostics'
  );
  const calculatorCount = getAllCalculators().length;
  const videoImage = video?.cover_image_url || youtubeThumbnail(video?.youtube_video_url);
  const articleHref = article ? `/health-resources/${article.slug}` : '/health-resources';
  const overviewStats: Array<[number, string, LucideIcon]> = [
    [laboratoryAnalyzers.length, 'Laboratory analyzers', FlaskConical],
    [monitoringServices.length, 'Monitoring services', Activity],
    [calculatorCount, 'Health tools', Calculator],
  ];

  return (
    <section className="home-bento-section section" aria-labelledby="explore-spandan-title">
      <div className="container">
        <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end lg:mb-11">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-blush-deep">
              Explore Spandan
            </p>
            <h2 id="explore-spandan-title" className="heading-section max-w-2xl text-ink">
              Health knowledge, tools &amp; technology — all in one place
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-text-light">
              Explore our diagnostic facilities, specialist-led education, practical health tools,
              and published research.
            </p>
          </div>
          <Link href="/health" className="home-bento-heading-link">
            Explore everything
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>

        <div className="home-bento-grid">
          <Link
            href="/care"
            className="home-bento-card home-bento-facilities group sm:col-span-2 lg:col-span-5 lg:row-span-2"
            aria-label={`Explore ${facilities.length} verified facilities and diagnostics`}
          >
            <div className="relative z-10 p-6 sm:p-7">
              <span className="home-bento-label text-accent">
                <Activity size={17} aria-hidden="true" />
                Facilities &amp; diagnostics
              </span>
              <h3 className="mt-5 max-w-[320px] text-2xl font-extrabold leading-tight text-ink sm:text-[1.7rem]">
                Technology supporting better care
              </h3>
              <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/90 px-3 py-2 text-xs font-bold text-ink shadow-sm">
                <CheckCircle2 size={16} className="text-accent" aria-hidden="true" />
                {facilities.length} verified facilities
              </span>
              <CardArrow>View facilities</CardArrow>
            </div>
            <div className="home-bento-machine-lines" aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 h-[47%] sm:h-[52%] lg:h-[51%]">
              <Image
                src="/equipment/roche-cobas-e-411.png"
                alt="Roche cobas e 411 laboratory analyzer available at Spandan Clinic"
                fill
                sizes="(max-width: 1023px) 100vw, 460px"
                className="object-contain object-bottom px-2 transition duration-500 group-hover:scale-[1.025] sm:px-5"
              />
            </div>
          </Link>

          <Link
            href="/health#videos"
            className="home-bento-card home-bento-video group sm:col-span-2 lg:col-span-4"
            aria-label="Watch health education videos"
          >
            {videoImage ? (
              <img
                src={videoImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 home-bento-video-fallback" aria-hidden="true">
                <HeartPulse className="absolute -bottom-9 right-4 text-white/10" size={150} strokeWidth={1.2} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/40" />
            <div className="relative z-10 flex h-full flex-col justify-between p-6 text-white sm:p-7">
              <span className="home-bento-label text-white">
                <Video size={17} aria-hidden="true" />
                Featured video
              </span>
              <div className="flex items-end justify-between gap-5">
                <div>
                  <h3 className="line-clamp-2 max-w-[290px] text-xl font-extrabold leading-tight sm:text-2xl">
                    {video?.title || 'Understand your health with our specialists'}
                  </h3>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold">
                    Watch health videos <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </div>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-accent shadow-xl transition group-hover:scale-105">
                  <Play size={23} fill="currentColor" className="ml-1" aria-hidden="true" />
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/health"
            className="home-bento-card group p-6 sm:col-span-2 lg:col-span-3 lg:p-7"
            aria-label="View an overview of Spandan facilities, services, and tools"
          >
            <span className="home-bento-label text-ink">
              <Microscope size={17} className="text-blush-deep" aria-hidden="true" />
              Inside Spandan
            </span>
            <dl className="mt-4 divide-y divide-primary/10">
              {overviewStats.map(([value, label, Icon]) => (
                <div key={String(label)} className="grid grid-cols-[36px_30px_1fr] items-center gap-2 py-3 first:pt-1">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-wash-sage text-accent">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <dt className="order-3 text-xs font-medium text-text-light">{String(label)}</dt>
                  <dd className="order-2 text-xl font-extrabold text-ink">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </Link>

          <Link
            href={articleHref}
            className="home-bento-card group p-6 lg:col-span-3"
            aria-label={article ? `Read article: ${article.title}` : 'Browse health articles'}
          >
            <span className="home-bento-label text-blush-deep">
              <FileText size={17} aria-hidden="true" />
              Health article
            </span>
            <h3 className="mt-5 line-clamp-3 text-xl font-extrabold leading-snug text-ink">
              {article?.title || 'Early warning signs you should know'}
            </h3>
            <CardArrow>Read articles</CardArrow>
            <FileText className="absolute -bottom-6 right-3 rotate-[-8deg] text-blush-soft" size={94} aria-hidden="true" />
          </Link>

          <Link
            href="/health#research"
            className="home-bento-card group p-6 lg:col-span-2"
            aria-label={`Browse ${researchPublications.length} research publications`}
          >
            <span className="home-bento-label text-accent">
              <BookOpen size={17} aria-hidden="true" />
              Research
            </span>
            <p className="mt-4 text-4xl font-black leading-none text-ink">{researchPublications.length}</p>
            <h3 className="mt-2 font-extrabold text-ink">Research publications</h3>
            <p className="mt-2 text-xs leading-relaxed text-text-light">Endocrinology, thyroid &amp; metabolic medicine</p>
            <CardArrow>Browse</CardArrow>
          </Link>

          <Link
            href="/health#calculators"
            className="home-bento-card group p-6 lg:col-span-2"
            aria-label={`Try ${calculatorCount} free educational health calculators`}
          >
            <span className="home-bento-label text-accent">
              <Calculator size={17} aria-hidden="true" />
              Health tools
            </span>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-4xl font-black leading-none text-ink">{calculatorCount}</p>
                <h3 className="mt-2 font-extrabold text-ink">Free calculators</h3>
              </div>
              <Gauge size={48} strokeWidth={1.5} className="text-primary/30" aria-hidden="true" />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold text-accent">
              <span className="rounded-full bg-wash-sage px-2 py-1">BMI</span>
              <span className="rounded-full bg-wash-sage px-2 py-1">Blood pressure</span>
              <span className="rounded-full bg-wash-sage px-2 py-1">Diabetes risk</span>
            </div>
            <CardArrow>Try a tool</CardArrow>
          </Link>

          <Link
            href="/facilities#abbott-afinion-2"
            className="home-bento-card home-bento-small-machine group lg:col-span-3"
            aria-label="View Abbott Afinion 2 HbA1c testing facility details"
          >
            <div className="relative h-[155px] sm:h-[165px] lg:h-[148px]">
              <Image
                src="/equipment/abbott-afinion-2.png"
                alt="Abbott Afinion 2 analyzer"
                fill
                sizes="(max-width: 1023px) 50vw, 270px"
                className="object-contain px-6 pt-4 transition duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex items-center justify-between gap-3 px-5 pb-5">
              <h3 className="font-extrabold text-ink">HbA1c testing</h3>
              <ArrowRight size={18} className="text-accent" aria-hidden="true" />
            </div>
          </Link>

          <Link
            href="/facilities#erba-em-200"
            className="home-bento-card home-bento-small-machine group lg:col-span-3"
            aria-label="View Erba EM 200 clinical chemistry facility details"
          >
            <div className="relative h-[155px] sm:h-[165px] lg:h-[148px]">
              <Image
                src="/equipment/erba-mannheim-em-200.png"
                alt="Erba Mannheim EM 200 clinical chemistry analyzer"
                fill
                sizes="(max-width: 1023px) 50vw, 270px"
                className="object-contain px-6 pt-4 transition duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex items-center justify-between gap-3 px-5 pb-5">
              <h3 className="font-extrabold text-ink">Clinical chemistry</h3>
              <ArrowRight size={18} className="text-accent" aria-hidden="true" />
            </div>
          </Link>

          <Link
            href="/health-resources?tab=images"
            className="home-bento-card home-bento-gallery group sm:col-span-2 lg:col-span-6"
            aria-label="Browse posters and visual health resources"
          >
            <div className="relative z-10 max-w-[260px] p-6 sm:p-7">
              <span className="home-bento-label text-blush-deep">
                <ImageIcon size={17} aria-hidden="true" />
                Posters &amp; images
              </span>
              <h3 className="mt-5 text-xl font-extrabold leading-snug text-ink">
                Visual resources for better understanding
              </h3>
              <CardArrow>View gallery</CardArrow>
            </div>
            <div className="home-bento-posters" aria-hidden="true">
              <div className="home-bento-poster home-bento-poster-blue">Know your<br />blood pressure<br />numbers</div>
              <div className="home-bento-poster home-bento-poster-pink">Small steps.<br />Healthier<br />habits.</div>
              <div className="home-bento-poster home-bento-poster-navy">Eat smart.<br />Live strong.</div>
            </div>
          </Link>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-text-light">
          Educational resources and tools provide general information and do not replace medical advice.
        </p>
      </div>
    </section>
  );
}
