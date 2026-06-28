'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import HeroBackground from '../animations/HeroBackground';

export default function HeroSection() {
  return (
    <section className="relative bg-navy text-white py-24 md:py-32 overflow-hidden">
      <HeroBackground />
      <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
        <svg className="w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none">
          <defs>
            <pattern id="butterfly-pattern" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
              <path d="M60 20C60 20 50 14 44 20C38 26 44 34 60 44C76 34 82 26 76 20C70 14 60 20 60 20Z" fill="white" />
              <path d="M60 20C60 20 54 16 50 20C46 24 50 32 60 38C70 32 74 24 70 20C66 16 60 20 60 20Z" fill="white" opacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#butterfly-pattern)" />
        </svg>
      </div>

      <div className="container relative z-10">
        <div className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-primary-light font-semibold tracking-widest text-sm uppercase mb-4"
          >
            Chhatrapati Sambhajinagar
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            className="heading-display text-white mb-5"
          >
            Advanced Diagnostics,<br />
            <span className="text-primary-light">Expert Care</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            className="text-lg leading-relaxed text-white/80 mb-8 max-w-[540px]"
          >
            Spandan Super Speciality Clinic offers comprehensive diagnostic services
            with cutting-edge technology and experienced specialists.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <Link
              href="/packages"
              className="btn bg-accent text-white hover:bg-accent-light animate-[pulseHeartbeat_3s_ease-in-out_infinite]"
            >
              View Health Packages
            </Link>
            <Link
              href="/contact"
              className="btn border-2 border-white text-white bg-transparent hover:bg-white hover:text-navy"
            >
              Contact Us
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
