'use client';

import { motion } from 'framer-motion';

export function ECGLine({
  width = 200,
  color = '#D6336C',
  strokeWidth = 2,
}: {
  width?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const h = 24;
  const path = `M0,${h / 2} L${width * 0.1},${h / 2}
    L${width * 0.15},${h / 2 - 8}
    L${width * 0.22},${h / 2 + 10}
    L${width * 0.28},${h / 2 - 14}
    L${width * 0.35},${h / 2 + 12}
    L${width * 0.42},${h / 2}
    L${width},${h / 2}`;

  return (
    <svg
      width={width}
      height={h}
      viewBox={`0 0 ${width} ${h}`}
      aria-hidden="true"
    >
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        viewport={{ once: true }}
      />
    </svg>
  );
}
