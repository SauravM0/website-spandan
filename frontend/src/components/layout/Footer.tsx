'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
];

export default function Footer() {
  const { t, i18n } = useTranslation('common');

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <footer className="bg-navy text-slate-400 py-12 pb-6">
      <div className="container">
        <div className="grid-4 mb-8">
          <div>
            <h4 className="text-white mb-4 text-lg font-semibold">{t('site_name')}</h4>
            <p className="text-sm leading-relaxed">{t('hero_subtitle')}</p>
            <p className="mt-4 text-sm font-semibold text-warm">
              {t('footer_emergency')} +91 7798095795
            </p>
          </div>
          <div>
            <h4 className="text-white mb-4 text-lg font-semibold">Quick Links</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/packages" className="hover:text-white transition-colors">{t('nav_packages')}</Link>
              <Link href="/doctors" className="hover:text-white transition-colors">{t('nav_doctors')}</Link>
              <Link href="/health-resources" className="hover:text-white transition-colors">{t('nav_articles')}</Link>
              <Link href="/about" className="hover:text-white transition-colors">{t('nav_about')}</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Use</Link>
              <Link href="/contact" className="hover:text-white transition-colors">{t('nav_contact')}</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white mb-4 text-lg font-semibold">{t('contact_title')}</h4>
            <div className="flex flex-col gap-2 text-sm">
              <p>{t('contact_address')}: Plot No. 63, Alankar Housing Society, Garkheda, Chhatrapati Sambhajinagar</p>
              <p>{t('contact_phone')}: +91 7798095795</p>
              <p>{t('contact_email')}: info@spandanclinic.com</p>
            </div>
          </div>
          <div>
            <h4 className="text-white mb-4 text-lg font-semibold">{t('language_en')}</h4>
            <div className="flex flex-col gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className="bg-transparent border-none text-slate-400 text-sm text-left p-0 hover:text-white transition-colors min-h-[44px]"
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-navy-light pt-6 text-center text-xs">
          &copy; {new Date().getFullYear()} {t('site_name')}. {t('footer_rights')}
        </div>
      </div>
    </footer>
  );
}
