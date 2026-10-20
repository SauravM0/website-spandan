'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Activity,
  ArrowLeft,
  HeartPulse,
  Microscope,
  Moon,
  Scale,
  ShieldCheck,
  Syringe,
  type LucideIcon,
} from 'lucide-react';
import type { FacilityCategory, FacilityRecord } from '@/lib/facilities';

const facilityIcons: Record<string, LucideIcon> = {
  'clinic-environment': ShieldCheck,
  inbody: Scale,
  cgms: Activity,
  abpm: HeartPulse,
  holter: Microscope,
  'sleep-study': Moon,
  'insulin-pump': Syringe,
  echocardiography: HeartPulse,
  ecg: HeartPulse,
  tmt: HeartPulse,
  'fundus-screening': Activity,
  fibroscan: Activity,
};

/**
 * One accent per category, so seventeen otherwise identical cards can be told
 * apart at a glance. The values are the palette's own tokens rather than new
 * colours, which keeps the grid inside the existing brand.
 */
const categoryAccent: Record<FacilityCategory, { chip: string; dot: string }> = {
  Environment: { chip: 'bg-bg-alt text-text-light', dot: 'bg-text-light' },
  'Laboratory diagnostics': { chip: 'bg-wash-sage text-accent', dot: 'bg-accent' },
  'Cardiac diagnostics': { chip: 'bg-wash-blush text-blush-deep', dot: 'bg-blush-deep' },
  'Diabetes and endocrine diagnostics': { chip: 'bg-primary/15 text-accent', dot: 'bg-primary' },
  'Sleep and therapy support': { chip: 'bg-ink/10 text-ink', dot: 'bg-ink' },
};

/**
 * Tile-sized category names. The full wording is long enough that a two-column
 * phone layout truncated it to "LABORATORY…", which reads as broken rather than
 * as a label; the back of the card still shows the category in full.
 */
const categoryShortLabel: Record<FacilityCategory, string> = {
  Environment: 'Clinic visit',
  'Laboratory diagnostics': 'Laboratory',
  'Cardiac diagnostics': 'Cardiac',
  'Diabetes and endocrine diagnostics': 'Diabetes & endocrine',
  'Sleep and therapy support': 'Sleep & therapy',
};

function FacilityThumb({ facility }: { facility: FacilityRecord }) {
  const Icon = facilityIcons[facility.id] || Microscope;

  if (facility.media) {
    return (
      <Image
        src={facility.media.src}
        alt={facility.media.alt}
        width={facility.media.width}
        height={facility.media.height}
        sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
        className="h-full w-full object-contain p-3"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-bg-alt">
      <Icon className="text-accent/70" size={34} aria-hidden="true" />
    </div>
  );
}

function DetailRow({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="rounded-xl bg-wash-sage/60 p-2.5">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-text-light">{term}</dt>
      <dd className="mt-0.5 text-xs leading-relaxed text-ink">{detail}</dd>
    </div>
  );
}

function FacilityFlipCard({
  facility,
  flipped,
  onToggle,
}: {
  facility: FacilityRecord;
  flipped: boolean;
  onToggle: () => void;
}) {
  const accent = categoryAccent[facility.category];
  const backId = `${useId()}-back`;

  return (
    <div className="flip-card" data-flipped={flipped}>
      <div className="flip-inner">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={flipped}
          aria-controls={backId}
          className="flip-face flip-front flip-surface group flex w-full flex-col text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <div className="flex flex-col">
            <span className="relative block aspect-[4/3] overflow-hidden bg-wash-sage">
              <FacilityThumb facility={facility} />
              <span
                className={`absolute left-3 top-3 h-2 w-2 rounded-full ${accent.dot}`}
                aria-hidden="true"
              />
            </span>
            <span className="flex flex-col gap-1 p-3 sm:p-4">
              <span className="line-clamp-1 text-[10px] font-bold uppercase leading-tight text-text-light sm:text-[11px]">
                {categoryShortLabel[facility.category]}
              </span>
              <span className="line-clamp-2 min-h-[2.4rem] text-sm font-bold leading-snug text-ink">
                {facility.name}
              </span>
              <span className="pt-1 text-xs font-semibold text-accent">View details</span>
            </span>
          </div>
        </button>

        {/*
          `inert` keeps the hidden face out of the tab order and away from screen
          readers without hiding it from the flip animation itself.
        */}
        <div
          id={backId}
          className="flip-face flip-back flip-surface"
          inert={!flipped}
          aria-hidden={!flipped}
        >
          <div className="flex flex-col p-3 sm:p-4">
            <span className={`badge self-start ${accent.chip}`}>{facility.category}</span>
            <h3 className="mt-2 text-sm font-bold leading-snug text-ink">{facility.name}</h3>
            <p className="mt-2 text-xs leading-relaxed text-text-light">
              {facility.publicDescription}
            </p>

            <dl className="mt-3 grid gap-2">
              <DetailRow term="Purpose" detail={facility.purpose} />
            </dl>

            <button
              type="button"
              onClick={onToggle}
              className="mt-3 inline-flex min-h-[44px] items-center gap-2 self-start rounded-2xl px-3 text-xs font-semibold text-accent transition hover:bg-wash-sage focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * A compact tile per facility, with the full record on the back of the card.
 *
 * Only one card is turned over at a time: opening another closes the previous
 * one, and clicking the open card closes it. Scrolling deliberately does not
 * close anything, so a reader can scroll a long record without it folding away
 * under them.
 */
export default function FacilityGrid({ facilities }: { facilities: FacilityRecord[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const toggle = useCallback((id: string) => {
    setOpenId((current) => (current === id ? null : id));
  }, []);

  useEffect(() => {
    if (openId && !facilities.some((facility) => facility.id === openId)) setOpenId(null);
  }, [facilities, openId]);

  /*
    FacilityFilter narrows the grid by setting `hidden` on each tile from
    outside React, so a turned-over card would otherwise stay turned over behind
    the filter and reappear mid-record when the filter is cleared. Watching the
    attribute keeps the two in step without coupling the components together.
  */
  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver(() => setOpenId(null));
    observer.observe(list, { attributes: true, attributeFilter: ['hidden'], subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <ul
      ref={listRef}
      className="grid grid-cols-2 items-start gap-4 md:grid-cols-3 xl:grid-cols-4"
    >
      {facilities.map((facility) => (
        <li
          key={facility.id}
          id={facility.id}
          // FacilityFilter toggles `hidden` on anything carrying this
          // attribute, so filtering works tile by tile.
          data-facility-category={facility.category}
          className="scroll-mt-28"
        >
          <FacilityFlipCard
            facility={facility}
            flipped={openId === facility.id}
            onToggle={() => toggle(facility.id)}
          />
        </li>
      ))}
    </ul>
  );
}
