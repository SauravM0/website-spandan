'use client';

import { motion } from 'framer-motion';

export default function HeroBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <motion.div
        className="absolute top-8 right-12 opacity-[0.08]"
        animate={{ y: [-10, 10, -10], rotate: [-2, 2, -2] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg width="160" height="120" viewBox="0 0 160 120">
          <ellipse cx="60" cy="45" rx="48" ry="30"
            fill="#D6336C"
            transform="rotate(-25, 60, 45)" />
          <ellipse cx="100" cy="45" rx="48" ry="30"
            fill="#D6336C"
            transform="rotate(25, 100, 45)" />
          <ellipse cx="65" cy="75" rx="30" ry="20"
            fill="#2E86C1"
            transform="rotate(20, 65, 75)" />
          <ellipse cx="95" cy="75" rx="30" ry="20"
            fill="#2E86C1"
            transform="rotate(-20, 95, 75)" />
          <ellipse cx="80" cy="58" rx="6" ry="22" fill="#1B3A57" />
        </svg>
      </motion.div>

      <motion.div
        className="absolute bottom-20 left-8 opacity-[0.05]"
        animate={{ y: [8, -8, 8] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        <svg width="80" height="60" viewBox="0 0 160 120">
          <ellipse cx="60" cy="45" rx="48" ry="30"
            fill="#D6336C" transform="rotate(-25, 60, 45)" />
          <ellipse cx="100" cy="45" rx="48" ry="30"
            fill="#D6336C" transform="rotate(25, 100, 45)" />
          <ellipse cx="65" cy="75" rx="30" ry="20"
            fill="#2E86C1" transform="rotate(20, 65, 75)" />
          <ellipse cx="95" cy="75" rx="30" ry="20"
            fill="#2E86C1" transform="rotate(-20, 95, 75)" />
          <ellipse cx="80" cy="58" rx="6" ry="22" fill="#1B3A57" />
        </svg>
      </motion.div>
    </div>
  );
}
