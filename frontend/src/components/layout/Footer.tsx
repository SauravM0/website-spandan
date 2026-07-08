'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { clinicSettings } from '@/lib/settings';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'mr', label: 'Marathi' },
];

export default function Footer() {
  const { t, i18n } = useTranslation('common');

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <footer className="section-alt border-t border-primary/10 pb-6 pt-12 text-text-light">
      <div className="container">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr_1.2fr_0.8fr]">
          <div>
            <h4 className="mb-4 text-lg font-semibold text-navy">{clinicSettings.name}</h4>
            <p className="text-sm leading-relaxed">{clinicSettings.tagline}</p>
            <p className="mt-4 text-sm font-semibold text-pink-700">{clinicSettings.emergencyNote}</p>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold text-navy">Quick Links</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/doctors" className="transition-colors duration-300 hover:text-accent">{t('nav_doctors')}</Link>
              <Link href="/packages" className="transition-colors duration-300 hover:text-accent">{t('nav_packages')}</Link>
              <Link href="/facilities" className="transition-colors duration-300 hover:text-accent">{t('nav_facilities')}</Link>
              <Link href="/health-resources" className="transition-colors duration-300 hover:text-accent">{t('nav_articles')}</Link>
              <Link href="/privacy" className="transition-colors duration-300 hover:text-accent">Privacy Policy</Link>
              <Link href="/terms" className="transition-colors duration-300 hover:text-accent">Terms of Use</Link>
              <Link href="/terms#refunds" className="transition-colors duration-300 hover:text-accent">Refund Policy</Link>
              <Link href="/terms#payments" className="transition-colors duration-300 hover:text-accent">Payment Policy</Link>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold text-navy">{t('contact_title')}</h4>
            <div className="flex flex-col gap-2 text-sm">
              <p>{clinicSettings.address}, {clinicSettings.city}, {clinicSettings.state} {clinicSettings.pincode}</p>
              <p>{t('contact_phone')}: {clinicSettings.phone}</p>
              <p>{t('contact_email')}: {clinicSettings.email}</p>
              <p>Timings: {clinicSettings.timings}</p>
              <a
                href={clinicSettings.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-accent transition-colors duration-300 hover:text-primary"
              >
                Open map
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold text-navy">Language</h4>
            <div className="flex flex-col gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className="min-h-[44px] bg-transparent p-0 text-left text-sm text-text-light transition-colors duration-300 hover:text-accent"
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 text-center text-xs text-text-light">
          &copy; {new Date().getFullYear()} {clinicSettings.name}. {t('footer_rights')}
        </div>
      </div>
    </footer>
  );
}
