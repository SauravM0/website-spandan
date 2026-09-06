'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe2, Menu, Phone, MessageCircle, X } from 'lucide-react';
import '../../lib/i18n';
import { clinicLinks } from '@/lib/settings';
import Button from '@/components/ui/Button';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
];

const primaryLinks = [
  { href: '/doctors', label: 'nav_doctors' },
  { href: '/facilities', label: 'nav_services_gallery' },
  { href: '/health-resources', label: 'nav_health_resources' },
  { href: '/contact', label: 'nav_contact' },
];

const secondaryLinks = [
  { href: '/about', label: 'nav_about' },
  { href: '/facilities', label: 'nav_facilities' },
  { href: '/health-resources', label: 'nav_articles' },
  { href: '/publications', label: 'nav_publications' },
  { href: '/tools', label: 'nav_tools' },
  { href: '/videos', label: 'nav_videos' },
];

export default function Navbar() {
  const { t, i18n } = useTranslation('common');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Every nav key is present in all three dictionaries (guarded by
  // src/lib/__tests__/locales.test.ts), so no English fallbacks are needed.
  const navLabel = (key: string) => t(key);

  // React re-applies the server-rendered lang attribute during hydration, so the
  // document language has to be set from an effect rather than only from i18n's
  // languageChanged event - otherwise a Marathi page keeps announcing lang="en".
  useEffect(() => {
    const active = i18n.resolvedLanguage || i18n.language;
    if (active) document.documentElement.lang = active;
  }, [i18n.resolvedLanguage, i18n.language]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen, closeDrawer]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [typeof window !== 'undefined' ? window.location.pathname : '']);

  useEffect(() => {
    if (!moreOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [moreOpen]);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-lg">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-ink">
          <img src="/logo.png" alt={t('site_name')} className="h-[46px] w-auto object-contain" />
        </Link>

        <button
          ref={toggleRef}
          onClick={() => setDrawerOpen(true)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl text-ink transition-all duration-300 hover:bg-bg-alt md:hidden"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="link-underline flex min-h-[44px] items-center rounded-2xl px-3 text-sm font-medium text-text transition-colors duration-200 hover:text-accent"
            >
              {navLabel(link.label)}
            </Link>
          ))}
          <div ref={moreRef} className="relative">
            <button type="button" onClick={() => { setLanguageOpen(false); setMoreOpen((open) => !open); }} className="flex min-h-[44px] items-center gap-1 rounded-2xl px-3 text-sm font-medium text-text transition-colors hover:bg-bg-alt hover:text-accent" aria-expanded={moreOpen} aria-haspopup="true">
              {t('nav_more')} <ChevronDown size={15} aria-hidden="true" />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-2xl bg-white p-2 shadow-lg">
                {secondaryLinks.map((link) => (
                  <Link key={link.href} href={link.href} onClick={() => setMoreOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-text hover:bg-bg-alt hover:text-accent">{navLabel(link.label)}</Link>
                ))}
              </div>
            )}
          </div>
          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => { setMoreOpen(false); setLanguageOpen((v) => !v); }}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl text-text transition-all duration-300 hover:bg-bg-alt hover:text-accent"
              aria-label="Change language"
              aria-expanded={languageOpen}
            >
              <Globe2 size={18} />
            </button>
            {languageOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10"
                  onClick={() => setLanguageOpen(false)}
                  aria-label="Close language menu"
                />
                <div className="absolute right-0 top-full z-20 mt-2 w-36 rounded-2xl bg-white p-2 shadow-lg">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { i18n.changeLanguage(lang.code); setLanguageOpen(false); }}
                      className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-all duration-300 ${
                        i18n.language === lang.code
                          ? 'bg-accent font-semibold text-white'
                          : 'text-text hover:bg-bg-alt'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <Button href={clinicLinks.phone} variant="accent" className="ml-2 min-h-[44px] px-4 text-sm">
            <Phone size={16} />
            {t('nav_call_clinic')}
          </Button>
        </nav>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/30"
            onClick={closeDrawer}
            aria-label="Close menu"
          />
          <div
            ref={drawerRef}
            className="relative flex h-full w-[min(88vw,320px)] flex-col bg-white shadow-xl"
          >
            <div className="flex min-h-[72px] items-center justify-between px-4 shadow-md">
              <span className="text-base font-bold text-ink">Menu</span>
              <button
                type="button"
                ref={closeRef}
                onClick={closeDrawer}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl text-text-light transition-all duration-300 hover:bg-bg-alt hover:text-ink"
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeDrawer}
                  className="flex min-h-[48px] items-center rounded-2xl px-3 text-base font-medium text-text transition-all duration-300 hover:bg-bg-alt hover:text-accent"
                >
                  {navLabel(link.label)}
                </Link>
              ))}
              {secondaryLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={closeDrawer} className="flex min-h-[48px] items-center rounded-2xl px-3 text-base font-medium text-text hover:bg-bg-alt hover:text-accent">
                  {navLabel(link.label)}
                </Link>
              ))}

              <div className="mt-4 pt-4">
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-text-light">
                  Language
                </p>
                <div className="grid gap-1 px-3">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { i18n.changeLanguage(lang.code); setDrawerOpen(false); }}
                      className={`rounded-xl px-3 py-2 text-left text-sm transition-all duration-300 ${
                        i18n.language === lang.code
                          ? 'bg-accent font-semibold text-white'
                          : 'text-text hover:bg-bg-alt'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </nav>

            <div className="sticky bottom-0 bg-white px-3 py-4 shadow-lg">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  href={clinicLinks.phone}
                  variant="accent"
                  className="min-h-[48px] justify-center text-sm"
                >
                  <Phone size={16} />
                  Call
                </Button>
                <Button
                  href={clinicLinks.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  className="min-h-[48px] justify-center text-sm"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
