import React from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Baby,
  Bone,
  FlaskConical,
  HeartPulse,
  Microscope,
  Scale,
  ShieldPlus,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

type CarePath = {
  title: string;
  shortTitle?: string;
  text: string;
  icon: LucideIcon;
  speciality?: 'endocrinology' | 'cardiology';
};

const featuredCare: CarePath[] = [
  {
    title: 'Diabetes care',
    shortTitle: 'Diabetes',
    text: 'Sugar patterns, CGMS, medicines, and follow-up planning.',
    icon: Activity,
    speciality: 'endocrinology',
  },
  {
    title: 'Heart care',
    shortTitle: 'Heart',
    text: 'Chest pain, blood pressure, ECG, Holter, and cardiac risk review.',
    icon: HeartPulse,
    speciality: 'cardiology',
  },
];

const supportingCare: CarePath[] = [
  {
    title: 'Thyroid',
    text: 'Symptoms, reports, and long-term monitoring.',
    icon: ShieldPlus,
    speciality: 'endocrinology',
  },
  {
    title: 'Hormone disorders',
    text: 'Pituitary, adrenal, parathyroid, and other hormone concerns.',
    icon: FlaskConical,
    speciality: 'endocrinology',
  },
  {
    title: 'Child Growth & Puberty',
    text: 'Growth, puberty, and hormone concerns.',
    icon: Baby,
    speciality: 'endocrinology',
  },
  {
    title: 'Weight & Metabolism',
    text: 'Body composition and metabolic risk assessment.',
    icon: Scale,
    speciality: 'endocrinology',
  },
  {
    title: 'PCOS',
    text: 'Cycle, hormones, weight, and metabolic evaluation.',
    icon: Sparkles,
    speciality: 'endocrinology',
  },
  {
    title: 'Bone Health',
    text: 'Vitamin D, calcium, bone health, and endocrine review.',
    icon: Bone,
    speciality: 'endocrinology',
  },
  {
    title: 'Diagnostics',
    text: 'Laboratory equipment, monitoring, and diagnostic support.',
    icon: Microscope,
  },
];

function DiabetesVisual() {
  return (
    <div className="pointer-events-none absolute bottom-[16%] left-[43%] right-5 h-[50%] opacity-95" aria-hidden="true">
      <svg viewBox="0 0 360 180" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="diabetes-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F078C0" stopOpacity=".24" />
            <stop offset="1" stopColor="#FBE4F0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M10 145 L50 100 L82 116 L122 40 L158 126 L202 26 L247 119 L297 78 L348 90 L348 170 L10 170 Z" fill="url(#diabetes-area)" />
        <path d="M10 145 L50 100 L82 116 L122 40 L158 126 L202 26 L247 119 L297 78 L348 90" fill="none" stroke="#C0006F" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {[['10','140'],['50','100'],['82','115'],['122','42'],['156','124'],['202','28'],['248','118'],['298','82']].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="#fff" stroke="#C0006F" strokeWidth="3" />
        ))}
        <path d="M10 165 H350 M10 120 H350 M10 75 H350" stroke="#F3C9E0" strokeWidth="1" strokeDasharray="4 6" />
      </svg>
    </div>
  );
}

function HeartVisual() {
  return (
    <div className="pointer-events-none absolute bottom-[19%] left-[40%] right-4 h-[50%]" aria-hidden="true">
      <svg viewBox="0 0 430 170" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="heart-line" x1="0" x2="1">
            <stop offset="0" stopColor="#C0006F" stopOpacity=".3" />
            <stop offset=".48" stopColor="#F078C0" />
            <stop offset="1" stopColor="#C17570" />
          </linearGradient>
          <filter id="heart-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path d="M0 105 H42 L58 76 L72 135 L89 28 L105 122 L122 105 H195 L210 82 L226 127 L242 50 L257 105 H285" fill="none" stroke="url(#heart-line)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M301 100 C273 73 290 42 315 47 C330 49 339 61 344 72 C349 61 358 49 373 47 C400 43 416 74 388 101 L344 142 Z" fill="none" stroke="#C17570" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#heart-glow)" />
      </svg>
    </div>
  );
}

export default function ServiceCards() {
  return (
    <section className="section" aria-labelledby="care-paths-title">
      <div className="container">
        <div className="reveal mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-blush-deep">Find the right care</p>
            <h2 id="care-paths-title" className="heading-section text-ink">What brings you in today?</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-text-light">
              Choose what you need help with and we’ll guide you to the right specialist,
              facility, or next step for care.
            </p>
          </div>
          <Link href="/contact" className="inline-flex min-h-[44px] items-center gap-2 self-start text-sm font-semibold text-accent transition hover:gap-3 md:self-auto">
            Not sure where to start? Contact the clinic
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>

        <div className="stagger grid gap-5 md:grid-cols-2">
          {featuredCare.map((care, index) => {
            const Icon = care.icon;
            const dark = index === 1;
            return (
              <Link
                key={care.title}
                href="/doctors"
                className={`group relative flex min-h-[330px] flex-col overflow-hidden rounded-[28px] border p-7 transition duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent lg:p-8 ${
                  dark
                    ? 'border-ink bg-ink text-white shadow-xl'
                    : 'border-primary/30 bg-gradient-to-br from-white via-wash-pink/70 to-white text-ink shadow-xl'
                }`}
                aria-label={`Learn about ${care.title} and meet our specialists`}
              >
                <div className="relative z-10">
                  <span className={`inline-flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.08em] ${dark ? 'text-blush' : 'text-accent'}`}>
                    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${dark ? 'border border-white/20 bg-white/5' : 'bg-primary/15/80'}`}>
                      <Icon size={23} aria-hidden="true" />
                    </span>
                    {care.speciality}
                  </span>
                  <h3 className="mt-5 text-3xl font-extrabold tracking-tight">{care.title}</h3>
                  <p className={`mt-3 max-w-[260px] text-base leading-relaxed ${dark ? 'text-sand' : 'text-text-light'}`}>
                    {care.text}
                  </p>
                </div>

                {dark ? <HeartVisual /> : <DiabetesVisual />}

                {!dark && (
                  <span className="pointer-events-none absolute right-7 top-7 flex h-[88px] w-[88px] items-center justify-center rounded-full border border-primary/15 bg-white/90 shadow-lg" aria-hidden="true">
                    <span className="relative h-12 w-12 rounded-full border-[7px] border-border bg-white shadow-inner after:absolute after:left-1/2 after:top-1/2 after:h-2 after:w-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-text-light" />
                  </span>
                )}

                <span className={`relative z-10 mt-auto inline-flex items-center gap-2 text-sm font-extrabold transition-all group-hover:gap-3 ${dark ? 'text-white' : 'text-accent'}`}>
                  Meet our specialists
                  <ArrowRight size={18} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mx-auto mt-5 grid max-w-[860px] gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {supportingCare.map((care) => {
            const Icon = care.icon;
            return (
              <Link
                key={care.title}
                href="/care"
                className="group relative flex min-h-[230px] flex-col overflow-hidden rounded-[22px] border border-primary/25 bg-white p-6 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent sm:aspect-square sm:min-h-0"
                aria-label={`${care.title}: ${care.text}`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-wash-pink text-accent transition group-hover:bg-primary/15">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <span className="mt-4 min-w-0 pr-6">
                  <strong className="block text-lg font-extrabold leading-snug text-ink">{care.title}</strong>
                  <span className="mt-2 block text-sm leading-relaxed text-text-light">{care.text}</span>
                </span>
                <span className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-primary/25 text-accent transition group-hover:border-accent group-hover:bg-wash-pink" aria-hidden="true">
                  <ArrowRight size={15} />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
