'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle } from 'lucide-react';
import { guardLocalStorage } from '@/lib/tools/privacy-guard';
import BmiCalculator from './BmiCalculator';
import BloodPressureCalculator from './BloodPressureCalculator';
import DiabetesRiskCalculator from './DiabetesRiskCalculator';

export default function MedicalCalculators({
  // 'section' embeds the calculators inside a larger page, so the standalone
  // hero (and its h1) is skipped.
  variant = 'page',
}: {
  variant?: 'page' | 'section';
} = {}) {
  useEffect(() => {
    guardLocalStorage();
  }, []);

  return (
    <>
      {variant === 'page' ? (
        <section className="soft-page-hero py-16 text-center">
          <div className="container" data-no-storage data-no-analytics>
            <div className="icon-chip mx-auto mb-4 flex h-12 w-12">
              <Activity size={26} aria-hidden="true" />
            </div>
            <h1 className="heading-display">Medical Calculators</h1>
            <p className="lede mx-auto mt-3 max-w-2xl">
              Quick educational tools for everyday cardiometabolic health checks.
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-text-light">
              No values you enter are stored, saved, or sent anywhere.
            </p>
          </div>
        </section>
      ) : null}

      <section className="section section-alt">
        <div className="container">
          <div
            className="mb-8 rounded-lg border-l-4 border-warm bg-warm/10 p-4 text-sm text-warm"
            role="note"
            aria-label="Educational disclaimer"
          >
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <AlertTriangle size={18} aria-hidden="true" />
              Educational disclaimer
            </div>
            <p className="leading-relaxed">
              These tools are for general education only and are not a diagnosis or treatment plan. Readings can vary by age,
              pregnancy, medications, existing illness, and measurement technique. Please consult a qualified doctor for personal
              medical advice.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <BmiCalculator />
            <BloodPressureCalculator />
            <div className="lg:col-span-2">
              <DiabetesRiskCalculator />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Link
              href="/packages/diabetes-management-package"
              className="card p-6 block hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <span className="badge badge-featured mb-3">Diabetes</span>
              <h3 className="heading-card text-ink">Diabetes Management Package</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                Review blood sugar, HbA1c, lipids, kidney health, and related diabetes markers.
              </p>
            </Link>
            <Link
              href="/care"
              className="card p-6 block hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <span className="badge badge-new mb-3">Monitoring</span>
              <h3 className="heading-card text-ink">CGMS and ABPM Facilities</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                Learn about continuous glucose monitoring and 24-hour blood pressure monitoring at Spandan.
              </p>
            </Link>
            <Link
              href="/contact"
              className="card p-6 block hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <span className="badge badge-featured mb-3">Appointments</span>
              <h3 className="heading-card text-ink">Talk to Spandan</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                Book a clinician review if your scores are elevated or symptoms need attention.
              </p>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
