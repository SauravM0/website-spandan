'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SpecialityBadge } from '../icons/SpecialityBadge';

const services = [
  {
    title: 'Cardiology',
    description: 'Advanced cardiac diagnostics and consultation under Dr. Aute',
    icon: (
      <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
        <path d="M20 8C20 8 10 14 10 22C10 28 14 34 20 36C26 34 30 28 30 22C30 14 20 8 20 8Z" stroke="currentColor" strokeWidth="2" />
        <path d="M16 22L18.5 24.5L24 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    href: '/doctors/dr-aute',
    color: 'text-accent',
  },
  {
    title: 'Endocrinology',
    description: 'Hormone health and metabolic disorder management under Dr. Pawal-Aute',
    icon: (
      <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
        <circle cx="20" cy="14" r="6" stroke="currentColor" strokeWidth="2" />
        <path d="M12 34C12 27 16 22 20 22C24 22 28 27 28 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="14" y1="30" x2="26" y2="30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    href: '/doctors/dr-pawal-aute',
    color: 'text-primary',
  },
  {
    title: 'Diagnostics',
    description: 'State-of-the-art equipment for comprehensive health assessment',
    icon: (
      <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
        <rect x="6" y="8" width="28" height="20" rx="3" stroke="currentColor" strokeWidth="2" />
        <line x1="12" y1="18" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="22" y1="18" x2="28" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="23" x2="18" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="22" y1="23" x2="28" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 34L20 28L24 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    href: '/facilities',
    color: 'text-navy',
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export default function ServiceCards() {
  return (
    <section className="section">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="heading-section text-navy mb-2">Our Specialities</h2>
          <p className="text-lg text-text-light">
            Expert care across cardiology, endocrinology, and advanced diagnostics
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid-3"
        >
          {services.map((service) => (
            <motion.div key={service.title} variants={item} className="h-full">
              <Link
                href={service.href}
                className="card p-8 block h-full group"
              >
                <div className={`mb-5 ${service.color} group-hover:scale-110 transition-transform duration-300`}>
                  {service.icon}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-navy">{service.title}</h3>
                  {service.title === 'Cardiology' && <SpecialityBadge type="cardiology" />}
                  {service.title === 'Endocrinology' && <SpecialityBadge type="endocrinology" />}
                </div>
                <p className="text-text-light text-sm leading-relaxed">{service.description}</p>
                <div className="mt-4 text-sm font-semibold text-accent group-hover:underline">
                  Learn more &rarr;
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
