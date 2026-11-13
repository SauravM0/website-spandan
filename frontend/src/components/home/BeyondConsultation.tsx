import React from 'react';
import {
  ClipboardCheck,
  HeartHandshake,
  IndianRupee,
  Languages,
  MonitorSmartphone,
  type LucideIcon,
} from 'lucide-react';
import { clinicSettings, clinicLinks } from '@/lib/settings';
import { formatPackageMoney } from '@/components/packages/PackageCard';
import CountUpStat from '@/components/home/CountUpStat';
import Button from '@/components/ui/Button';

/**
 * One home-page band for everything that surrounds a consultation but has never
 * been visible on the site: the care included with a visit, the programmes, the
 * prices, the languages spoken at the desk, the team, and what the clinic is
 * building next.
 *
 * Deliberately compact. Each tile is a headline and one or two lines, and every
 * tile that could invite a detailed question ends by pointing at a phone call,
 * because the clinic answers those far better than a web page can.
 */

const WOMEN_IN_TEAM_PERCENT = 80;

/** Shown when the package feed is unavailable, so the tile never prints a stray dash. */
const PRICE_FALLBACK = 'On request';

type Tile = {
  title: string;
  icon: LucideIcon;
  body: string;
};

const careTiles: Tile[] = [
  {
    title: 'Included with your care',
    icon: HeartHandshake,
    body: 'Diet counselling with our dietitian and a follow-up in your first week, applicable as per clinic terms. Call us to know more.',
  },
  {
    title: 'Care programmes',
    icon: ClipboardCheck,
    body: 'Diabetes, pregnancy with diabetes, CGM sensor, weight and obesity, cardiac, and whole-body check-ups. Call the clinic for details.',
  },
];

export default function BeyondConsultation({
  lowestPackagePrice,
}: {
  lowestPackagePrice: number | null;
}) {
  const packagesFrom =
    lowestPackagePrice && lowestPackagePrice > 0
      ? formatPackageMoney(lowestPackagePrice)
      : PRICE_FALLBACK;

  const prices: { label: string; value: string; highlight?: boolean }[] = [
    { label: 'Consultation', value: formatPackageMoney(clinicSettings.consultationFee) },
    { label: 'Health packages from', value: packagesFrom },
    { label: 'On pharmacy medicines', value: '5% off', highlight: true },
    { label: 'Cardiac package, new patients', value: '25% off', highlight: true },
  ];

  return (
    <section className="section section-alt" aria-labelledby="beyond-consultation-title">
      <div className="container">
        <div className="reveal measure">
          <p className="eyebrow">Beyond the consultation</p>
          <h2 id="beyond-consultation-title" className="heading-section mt-3 text-ink">
            Everything that comes with your visit
          </h2>
          <p className="lede mt-4">
            Diet guidance, follow-up, clear prices, and a team that speaks your language, under one
            roof in {clinicSettings.city}.
          </p>
        </div>

        <div className="stagger mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* The team figure anchors the band, so it takes the double-width tile. */}
          <article className="card trust-card flex flex-wrap items-center gap-6 p-6 md:col-span-2">
            <p
              className="font-display text-6xl font-semibold leading-none tracking-tight text-accent tabular-nums sm:text-7xl"
              style={{ fontVariationSettings: "'SOFT' 40, 'WONK' 0, 'opsz' 144" }}
              aria-hidden="true"
            >
              <CountUpStat value={WOMEN_IN_TEAM_PERCENT} />
              <span className="align-super text-[0.42em]">%</span>
            </p>
            <div className="min-w-0 flex-1 basis-64">
              <h3 className="heading-card text-ink">A clinic run by women</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                {WOMEN_IN_TEAM_PERCENT}% of the Spandan team are women, at reception, in the
                laboratory, the pharmacy, and beside every patient. Women&rsquo;s empowerment is how
                this clinic was built.
              </p>
            </div>
          </article>

          {careTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <article key={tile.title} className="card p-6">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-wash-pink text-accent"
                  aria-hidden="true"
                >
                  <Icon size={20} />
                </span>
                <h3 className="heading-card mt-4 text-ink">{tile.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-light">{tile.body}</p>
              </article>
            );
          })}

          <article className="card p-6">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-wash-pink text-accent"
              aria-hidden="true"
            >
              <IndianRupee size={20} />
            </span>
            <h3 className="heading-card mt-4 text-ink">Prices you know in advance</h3>
            <dl className="mt-3 grid gap-2 border-t border-border pt-3 text-sm">
              {prices.map((price) => (
                <div key={price.label} className="flex items-baseline justify-between gap-4">
                  <dt className="min-w-0 text-text-light">{price.label}</dt>
                  <dd
                    className={`whitespace-nowrap font-semibold tabular-nums ${
                      price.highlight ? 'text-accent' : 'text-ink'
                    }`}
                  >
                    {price.value}
                  </dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="card p-6">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-wash-pink text-accent"
              aria-hidden="true"
            >
              <Languages size={20} />
            </span>
            <h3 className="heading-card mt-4 text-ink">In your own language</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-light">
              Consultation, counselling and this website in all three.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {['मराठी', 'हिन्दी', 'English'].map((language) => (
                <li
                  key={language}
                  className="rounded-full bg-blush-soft px-3 py-1 text-sm font-semibold text-blush-deep"
                >
                  {language}
                </li>
              ))}
            </ul>
          </article>

          {/*
            Spans the full row so the band closes on a wide card instead of a
            single tile stranded beside two empty cells, and so the three
            "next" items read as one row rather than a stacked list.
          */}
          <article className="card relative border-border-strong p-6 md:col-span-2 lg:col-span-3">
            <span className="badge badge-new absolute right-5 top-5 uppercase tracking-[0.1em]">
              Coming soon
            </span>
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-wash-pink text-accent"
              aria-hidden="true"
            >
              <MonitorSmartphone size={20} />
            </span>
            <h3 className="heading-card mt-4 pr-24 text-ink">Where we are going next</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-text-light sm:grid-cols-3 sm:gap-x-8">
              {[
                'Online consultations, wherever you live',
                'Digital and AI-supported care',
                'Online health check-ups for families and groups from any region',
              ].map((item) => (
                <li key={item} className="relative pl-5">
                  <span
                    className="absolute left-0 top-[0.55em] h-[7px] w-[7px] rounded-full bg-primary-light"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="min-w-0 max-w-[62ch] text-sm leading-relaxed text-text-light">
            <strong className="font-semibold text-ink">Want to know more?</strong> Fees, packages
            and what is included apply as per clinic terms. Our team will explain everything on a
            call.
          </p>
          <Button href={clinicLinks.phone} variant="accent">
            Call {clinicSettings.phone}
          </Button>
        </div>
      </div>
    </section>
  );
}
