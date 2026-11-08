'use client';

import React from 'react';
import Link from 'next/link';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
  socialBrandColors,
} from '@/components/icons/SocialIcons';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { clinicSettings } from '@/lib/settings';

// Only the channels the clinic actually publishes on are rendered, so an empty
// environment override silently drops the link instead of leaving a dead icon.
const socialLinks = [
  { key: 'facebook', href: clinicSettings.social.facebook, labelKey: 'footer_social_facebook', Icon: FacebookIcon, tint: socialBrandColors.facebook },
  { key: 'instagram', href: clinicSettings.social.instagram, labelKey: 'footer_social_instagram', Icon: InstagramIcon, tint: socialBrandColors.instagram },
  { key: 'youtube', href: clinicSettings.social.youtube, labelKey: 'footer_social_youtube', Icon: YoutubeIcon, tint: socialBrandColors.youtube },
  { key: 'linkedin', href: clinicSettings.social.linkedin, labelKey: 'footer_social_linkedin', Icon: LinkedinIcon, tint: socialBrandColors.linkedin },
].filter((link) => Boolean(link.href));

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
            <h4 className="mb-4 text-lg font-semibold text-ink">{clinicSettings.name}</h4>
            <p className="text-sm leading-relaxed">{clinicSettings.tagline}</p>
            <p className="mt-4 text-sm font-semibold text-blush-deep">{clinicSettings.emergencyNote}</p>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold text-ink">{t('footer_quick_links')}</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/doctors" className="inline-flex min-h-[44px] items-center transition-colors duration-300 hover:text-accent">{t('nav_doctors')}</Link>
              <Link href="/care" className="inline-flex min-h-[44px] items-center transition-colors duration-300 hover:text-accent">{t('nav_care')}</Link>
              <Link href="/packages" className="inline-flex min-h-[44px] items-center transition-colors duration-300 hover:text-accent">{t('nav_packages')}</Link>
              <Link href="/health" className="inline-flex min-h-[44px] items-center transition-colors duration-300 hover:text-accent">{t('nav_health')}</Link>
              <Link href="/legal#privacy" className="inline-flex min-h-[44px] items-center transition-colors duration-300 hover:text-accent">{t('footer_privacy')}</Link>
              <Link href="/legal#terms" className="inline-flex min-h-[44px] items-center transition-colors duration-300 hover:text-accent">{t('footer_terms')}</Link>
            </div>

            {socialLinks.length > 0 && (
              <div className="mt-6">
                <h4 className="mb-3 text-sm font-semibold text-ink">{t('footer_follow')}</h4>
                <ul className="flex flex-wrap gap-2">
                  {socialLinks.map(({ key, href, labelKey, Icon, tint }) => (
                    <li key={key}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t(labelKey)}
                        // The chip borrows the platform's own colour at low
                        // opacity so the row reads as four distinct channels
                        // without turning the footer into a block of colour.
                        style={{
                          borderColor: `${tint}33`,
                          backgroundColor: `${tint}12`,
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        <Icon size={20} />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold text-ink">{t('contact_title')}</h4>
            <div className="flex flex-col gap-2 text-sm">
              <p>{clinicSettings.address}, {clinicSettings.city}, {clinicSettings.state} {clinicSettings.pincode}</p>
              <p>{t('contact_phone')}: {clinicSettings.phone}</p>
              <p>{t('contact_email')}: {clinicSettings.email}</p>
              <p>{t('footer_timings')}: {clinicSettings.timings}</p>
              <p>{t('contact_doctor_hours')}: 1:00 PM - 7:00 PM</p>
              <p>{clinicSettings.holidayNote}</p>
              <a
                href={clinicSettings.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center font-semibold text-accent transition-colors duration-300 hover:text-primary"
              >
                Open map
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold text-ink">{t('footer_language')}</h4>
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
