'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AmbientIconProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  amplitude?: number;
  className?: string;
}

export default function AmbientIcon({
  children,
  delay = 0,
  duration = 5.5,
  amplitude = 12,
  className = '',
}: AmbientIconProps) {
  return (
    <motion.div
      className={className}
      animate={{ y: [-amplitude / 2, amplitude / 2, -amplitude / 2] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  );
}
