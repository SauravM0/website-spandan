'use client';

import React from 'react';
import type { ResultScale } from '@/lib/tools/types';
import { TONE_CLASSES, TONE_MARKER } from '@/lib/tools/types';

const BAND_FILL: Record<string, string> = {
  green: 'bg-success/25',
  amber: 'bg-warm/25',
  red: 'bg-danger/25',
  navy: 'bg-accent/20',
};

function clampPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

/**
 * Plots a reading against its clinical bands. The bar is decorative — the same
 * information is already stated in words above it — so it is hidden from
 * assistive tech rather than duplicating the result in a second announcement.
 */
export default function ToolGauge({ scale }: { scale: ResultScale }) {
  const position = clampPercent(scale.value, scale.min, scale.max);
  const activeBand =
    scale.bands.find((band) => scale.value <= band.upTo) ?? scale.bands[scale.bands.length - 1];

  return (
    <div className="mt-4" aria-hidden="true">
      <div className="relative h-2.5 w-full overflow-hidden rounded-pill bg-bg-alt">
        <div className="flex h-full w-full">
          {scale.bands.map((band, index) => {
            const lower = index === 0 ? scale.min : scale.bands[index - 1].upTo;
            const width = clampPercent(band.upTo, scale.min, scale.max) - clampPercent(lower, scale.min, scale.max);
            if (width <= 0) return null;
            return (
              <span
                key={band.label}
                className={BAND_FILL[band.tone] ?? BAND_FILL.navy}
                style={{ width: `${width}%` }}
              />
            );
          })}
        </div>
        <span
          className={`absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-pill ring-2 ring-white ${TONE_MARKER[activeBand.tone]}`}
          style={{ left: `${position}%`, transition: 'left 420ms cubic-bezier(0.22, 0.61, 0.36, 1)' }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-text-light">
        {scale.bands.map((band) => (
          <span key={band.label} className={band === activeBand ? 'text-ink' : ''}>
            {band.label}
          </span>
        ))}
      </div>
      {scale.caption ? (
        <p className="mt-1 text-[11px] text-text-light">Plotted on {scale.caption}</p>
      ) : null}
    </div>
  );
}

export { TONE_CLASSES };
