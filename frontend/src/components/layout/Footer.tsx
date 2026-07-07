'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

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
    <footer className="bg-navy pb-6 pt-12 text-slate-300">
      <div className="container">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr_1.2fr_0.8fr]">
          <div>
            <h4 className="mb-4 text-lg font-semibold text-white">{t('site_name')}</h4>
            <p className="text-sm leading-relaxed">
              Specialist heart, hormone, diabetes, thyroid, and diagnostic care in Garkheda.
            </p>
            <p className="mt-4 text-sm font-semibold text-warm">
              For emergencies, call local emergency services first.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold text-white">Quick Links</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/doctors" className="transition-colors hover:text-white">{t('nav_doctors')}</Link>
              <Link href="/packages" className="transition-colors hover:text-white">{t('nav_packages')}</Link>
              <Link href="/facilities" className="transition-colors hover:text-white">{t('nav_facilities')}</Link>
              <Link href="/health-resources" className="transition-colors hover:text-white">{t('nav_articles')}</Link>
              <Link href="/privacy" className="transition-colors hover:text-white">Privacy Policy</Link>
              <Link href="/terms" className="transition-colors hover:text-white">Terms of Use</Link>
              <Link href="/terms#refunds" className="transition-colors hover:text-white">Refund Policy</Link>
              <Link href="/terms#payments" className="transition-colors hover:text-white">Payment Policy</Link>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold text-white">{t('contact_title')}</h4>
            <div className="flex flex-col gap-2 text-sm">
              <p>
                {t('contact_address')}: Plot No. 63, Alankar Housing Society, Beside Essar Petrol Pump,
                Gajanan Maharaj Mandir Rd, Pundlik Nagar, Garkheda, Chhatrapati Sambhajinagar,
                Maharashtra 431009
              </p>
              <p>{t('contact_phone')}: +91 7798095795</p>
              <p>{t('contact_email')}: info@spandanclinic.com</p>
              <p>Timings: Monday to Saturday, 7:00 AM to 8:00 PM</p>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Spandan%20Super%20Speciality%20Clinic%20Garkheda%20Chhatrapati%20Sambhajinagar"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                Open map
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold text-white">Language</h4>
            <div className="flex flex-col gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className="min-h-[44px] border-none bg-transparent p-0 text-left text-sm text-slate-300 transition-colors hover:text-white"
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-navy-light pt-6 text-center text-xs">
          &copy; {new Date().getFullYear()} {t('site_name')}. {t('footer_rights')}
        </div>
      </div>
    </footer>
  );
}
