'use client';

import { motion } from 'framer-motion';
import { HeartIcon } from './HeartIcon';
import { DropletIcon } from './DropletIcon';

type BadgeType = 'cardiology' | 'endocrinology' | 'both';

const configs: Record<BadgeType, {
  icons: React.ReactNode[];
  label: string;
  bg: string;
  text: string;
}> = {
  cardiology: {
    icons: [<HeartIcon key="h" size={14} color="#C0006F" />],
    label: 'Cardiology',
    bg: 'bg-wash-pink',
    text: 'text-accent',
  },
  endocrinology: {
    icons: [<DropletIcon key="d" size={14} color="#2E86C1" />],
    label: 'Endocrinology',
    bg: 'bg-wash-pink',
    text: 'text-accent',
  },
  both: {
    icons: [
      <HeartIcon key="h" size={14} color="#C0006F" />,
      <DropletIcon key="d" size={14} color="#2E86C1" />,
    ],
    label: 'Cardiology & Endocrinology',
    bg: 'bg-wash-blush',
    text: 'text-blush-deep',
  },
};

export function SpecialityBadge({ type }: { type: BadgeType }) {
  const c = configs[type];
  return (
    <motion.span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      viewport={{ once: true }}
    >
      {c.icons}
      <span>{c.label}</span>
    </motion.span>
  );
}
