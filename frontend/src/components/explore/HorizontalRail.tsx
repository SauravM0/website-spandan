'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function HorizontalRail({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  const move = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rail.scrollBy({
      left: direction * Math.max(280, rail.clientWidth * 0.82),
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => move(-1)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-primary/15 bg-white text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
          aria-label={`Show previous ${label}`}
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-primary/15 bg-white text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
          aria-label={`Show more ${label}`}
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
      <div
        ref={railRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain pb-5"
        aria-label={label}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}
