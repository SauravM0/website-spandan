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
    icons: [<HeartIcon key="h" size={14} color="#D6336C" />],
    label: 'Cardiology',
    bg: 'bg-pink-50',
    text: 'text-pink-700',
  },
  endocrinology: {
    icons: [<DropletIcon key="d" size={14} color="#2E86C1" />],
    label: 'Endocrinology',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
  },
  both: {
    icons: [
      <HeartIcon key="h" size={14} color="#D6336C" />,
      <DropletIcon key="d" size={14} color="#2E86C1" />,
    ],
    label: 'Cardiology & Endocrinology',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
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
