'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Counts a whole number up once, the first time it scrolls into view.
 *
 * The final value is what renders on the server and what stays on screen when
 * JavaScript never arrives, when the viewer prefers reduced motion, or when the
 * browser has no IntersectionObserver. The animation is decoration layered on
 * top of a correct, readable figure, never the thing that produces it.
 */
export default function CountUpStat({
  value,
  durationMs = 1100,
  className,
}: {
  value: number;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') return;

    let frame = 0;
    let startedAt: number | null = null;

    const step = (timestamp: number) => {
      if (startedAt === null) startedAt = timestamp;
      const progress = Math.min((timestamp - startedAt) / durationMs, 1);
      // Cubic ease-out: fast first, settling on the final figure.
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = window.requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        setDisplay(0);
        frame = window.requestAnimationFrame(step);
      },
      { threshold: 0.4 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
