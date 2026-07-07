'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CalendarCheck, HeartPulse, MapPin, ShieldCheck, Stethoscope } from 'lucide-react';
import HeroBackground from '../animations/HeroBackground';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <HeroBackground />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(18,50,74,0.98),rgba(18,50,74,0.86)_48%,rgba(15,118,110,0.58))]" />

      <div className="container relative z-10 grid min-h-[640px] items-center gap-10 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-20">
        <div className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mb-4 inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-teal-100"
          >
            <MapPin size={16} />
            Chhatrapati Sambhajinagar
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            className="heading-display mb-5 max-w-[720px] text-white"
          >
            Specialist Heart and Hormone Care at Spandan Clinic
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            className="mb-7 max-w-[590px] text-lg leading-relaxed text-white/85"
          >
            Book a confirmed appointment or purchase a health package online with clear fees,
            clinic location, and next steps before you pay.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.25 }}
            className="mb-8 flex flex-wrap gap-2 text-sm font-semibold text-white/90"
          >
            {['Cardiology', 'Endocrinology', 'Diabetes', 'Thyroid', 'Diagnostics'].map((item) => (
              <span key={item} className="rounded-md border border-white/15 bg-white/10 px-3 py-2">
                {item}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
            className="flex flex-wrap gap-3"
          >
            <Link href="/book-appointment" className="btn bg-accent text-white hover:bg-accent-light">
              <CalendarCheck size={18} />
              Book Appointment
            </Link>
            <Link href="/book-package" className="btn border border-white/40 bg-white text-navy hover:bg-teal-50">
              <HeartPulse size={18} />
              Book Health Package
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
          className="relative"
        >
          <div className="rounded-lg border border-white/15 bg-white p-5 text-navy shadow-2xl">
            <div className="mb-4 flex items-center gap-4 border-b border-border pb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-bg-alt p-2">
                <img src="/logo.png" alt="Spandan Super Speciality Clinic logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold text-accent">Spandan Super Speciality Clinic</p>
                <p className="text-xs text-text-light">Garkheda, Chhatrapati Sambhajinagar</p>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="flex gap-3 rounded-md bg-bg-alt p-3">
                <Stethoscope className="shrink-0 text-accent" size={22} />
                <div>
                  <p className="font-semibold">Specialist consultations</p>
                  <p className="text-sm text-text-light">Cardiology, endocrinology, diabetes, and thyroid care.</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-md bg-bg-alt p-3">
                <ShieldCheck className="shrink-0 text-success" size={22} />
                <div>
                  <p className="font-semibold">Payment-aware booking</p>
                  <p className="text-sm text-text-light">Fees are shown before payment and the form is preserved after errors.</p>
                </div>
              </div>
              <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
                Open Monday to Saturday, 7:00 AM to 8:00 PM. For emergencies, call local emergency services first.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
