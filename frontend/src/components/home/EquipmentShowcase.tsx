'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Monitor, Moon } from 'lucide-react';
import { HeartIcon } from '../icons/HeartIcon';
import { DropletIcon } from '../icons/DropletIcon';
import CardioBackground from '../animations/CardioBackground';

const iconMap: Record<string, React.ReactNode> = {
  InBody: <Activity size={24} />,
  CGMS: <DropletIcon size={24} color="#2E86C1" />,
  ABPM: <HeartIcon size={24} color="#D6336C" />,
  Holter: <Monitor size={24} />,
  'Sleep Study': <Moon size={24} />,
  'Insulin Pump': <DropletIcon size={24} color="#2E86C1" />,
};

const equipment = [
  { name: 'InBody', description: 'Body Composition Analyzer' },
  { name: 'CGMS', description: 'Continuous Glucose Monitoring' },
  { name: 'ABPM', description: 'Ambulatory BP Monitoring' },
  { name: 'Holter', description: 'Holter Monitor' },
  { name: 'Sleep Study', description: 'Sleep Diagnostics' },
  { name: 'Insulin Pump', description: 'Insulin Therapy' },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const iconVariants = {
  hidden: { scale: 0, rotate: -15 },
  show: { scale: 1, rotate: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20, delay: 0.15 } },
};

export default function EquipmentShowcase() {
  return (
    <section className="section bg-bg-alt relative overflow-hidden">
      <CardioBackground />
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <motion.div
          className="absolute bottom-0 left-0 right-0 opacity-[0.04]"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <svg width="800" height="40" viewBox="0 0 800 40" preserveAspectRatio="none">
            <path
              d="M0,20 L50,20 L70,4 L100,36 L120,4 L150,36 L180,20 L800,20"
              fill="none"
              stroke="#D6336C"
              strokeWidth="2"
            />
          </svg>
        </motion.div>
      </div>
      <div className="container relative z-10">
        <div className="text-center mb-12">
          <h2 className="heading-section text-navy mb-2">Advanced Equipment</h2>
          <p className="text-lg text-text-light">
            Cutting-edge diagnostic technology for accurate health assessment
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          <div
            className="flex gap-5 pb-4 overflow-x-auto snap-x snap-mandatory scrollbar-thin -mx-6 px-6"
            style={{ scrollbarWidth: 'thin' }}
          >
            {equipment.map((item) => (
              <motion.div
                key={item.name}
                variants={cardVariants}
                className="flex-shrink-0 w-[220px] md:w-[260px] snap-start bg-white rounded-xl p-6 shadow hover:shadow-lg transition-shadow"
              >
                <motion.div
                  variants={iconVariants}
                  className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:bg-accent/20 transition-colors"
                >
                  <motion.span
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    {iconMap[item.name]}
                  </motion.span>
                </motion.div>
                <h3 className="font-bold text-navy mb-1">{item.name}</h3>
                <p className="text-sm text-text-light">{item.description}</p>
                <div className="mt-3 h-1 w-full bg-bg-alt rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                    className="h-full bg-accent/30 rounded-full"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center text-sm text-text-light mt-8"
        >
          Real clinic photos coming soon &mdash; visit us to see our equipment in person
        </motion.p>
      </div>
    </section>
  );
}
