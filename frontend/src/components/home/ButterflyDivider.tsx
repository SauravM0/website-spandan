'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function ButterflyDivider() {
  return (
    <div className="relative h-24 overflow-hidden" aria-hidden="true">
      <svg
        className="absolute inset-0 w-full h-full text-accent/10"
        viewBox="0 0 1200 96"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 48 Q150 0 300 48 Q450 96 600 48 Q750 0 900 48 Q1050 96 1200 48"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <motion.svg
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-accent/20"
        viewBox="0 0 40 40"
        fill="none"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M20 8C20 8 10 2 4 8C-2 14 4 22 20 32C36 22 42 14 36 8C30 2 20 8 20 8Z"
          fill="currentColor"
          opacity="0.8"
        />
        <path
          d="M20 8C20 8 14 2 10 6C6 10 10 18 20 24C30 18 34 10 30 6C26 2 20 8 20 8Z"
          fill="currentColor"
          opacity="0.5"
        />
      </motion.svg>
    </div>
  );
}
