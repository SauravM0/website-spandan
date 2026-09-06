import React from 'react';

type PulseLineProps = {
  /** `cardiac` opens with an ECG complex, `metabolic` is the smoother glucose curve. */
  variant?: 'cardiac' | 'metabolic';
  className?: string;
  strokeWidth?: number;
  /** Draw the line in as the element scrolls through the viewport. */
  animate?: boolean;
};

// The signature motif: a single line that reads as an ECG trace on the cardiology
// side and settles into a glucose curve on the metabolic side. Drawn as one path so
// it can be stroke-dash animated later without splitting the geometry.
const PATHS: Record<'cardiac' | 'metabolic', string> = {
  cardiac:
    'M0 40 H120 L134 40 L142 24 L152 62 L162 12 L172 48 L182 40 H250 ' +
    'C300 40 300 18 350 18 C400 18 400 56 450 56 C500 56 505 40 560 40 H720',
  metabolic:
    'M0 44 H90 C150 44 150 20 210 20 C270 20 268 52 330 52 C392 52 392 26 452 26 ' +
    'C512 26 512 44 560 44 H720',
};

export default function PulseLine({
  variant = 'cardiac',
  className = '',
  strokeWidth = 2,
  animate = false,
}: PulseLineProps) {
  return (
    <svg
      viewBox="0 0 720 80"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={`${animate ? 'pulse-draw ' : ''}${className}`}
    >
      <path
        d={PATHS[variant]}
        // Normalised length so the dash animation works without measuring the path.
        pathLength={1}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
