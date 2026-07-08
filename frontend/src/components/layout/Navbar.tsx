'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, ChevronDown, Globe2, Menu, Phone, MessageCircle, X } from 'lucide-react';
import '../../lib/i18n';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
];

const primaryLinks = [
  { href: '/', label: 'nav_home' },
  { href: '/about', label: 'nav_about' },
  { href: '/doctors', label: 'nav_doctors' },
  { href: '/packages', label: 'nav_packages' },
  { href: '/facilities', label: 'nav_facilities' },
  { href: '/health-resources', label: 'nav_articles' },
  { href: '/tools', label: 'nav_tools' },
  { href: '/contact', label: 'nav_contact' },
];

export default function Navbar() {
  const { t, i18n } = useTranslation('common');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const navLabel = (key: string) => {
    const translated = t(key);
    return translated === key && key === 'nav_tools' ? 'Health Tools' : translated;
  };

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

  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_10px_30px_rgba(23,58,94,0.08)]">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-navy">
          <img src="/logo.png" alt={t('site_name')} className="h-[46px] w-auto object-contain" />
        </Link>

        <button
          ref={toggleRef}
          onClick={() => setDrawerOpen(true)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl text-navy transition-all duration-300 hover:bg-bg-alt md:hidden"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-[44px] items-center rounded-2xl px-3 text-sm font-medium text-text transition-all duration-300 hover:bg-bg-alt hover:text-accent"
            >
              {navLabel(link.label)}
            </Link>
          ))}
          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => setLanguageOpen((v) => !v)}
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
                <div className="absolute right-0 top-full z-20 mt-2 w-36 rounded-2xl bg-white p-2 shadow-[0_16px_34px_rgba(23,58,94,0.12)]">
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
          <Link
            href="/book-appointment"
            className="btn btn-accent ml-2 min-h-[44px] px-4 text-sm"
          >
            <CalendarCheck size={16} />
            {t('nav_book') || 'Book Appointment'}
          </Link>
        </nav>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-navy/30"
            onClick={closeDrawer}
            aria-label="Close menu"
          />
          <div
            ref={drawerRef}
            className="relative flex h-full w-[min(88vw,320px)] flex-col bg-white shadow-[0_24px_60px_rgba(23,58,94,0.18)]"
          >
            <div className="flex min-h-[72px] items-center justify-between px-4 shadow-[0_8px_24px_rgba(23,58,94,0.05)]">
              <span className="text-base font-bold text-navy">Menu</span>
              <button
                type="button"
                ref={closeRef}
                onClick={closeDrawer}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl text-text-light transition-all duration-300 hover:bg-bg-alt hover:text-navy"
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

            <div className="sticky bottom-0 bg-white px-3 py-4 shadow-[0_-10px_30px_rgba(23,58,94,0.06)]">
              <div className="grid grid-cols-3 gap-2">
                <Link
                  href="/book-appointment"
                  onClick={closeDrawer}
                  className="btn btn-accent min-h-[48px] justify-center text-sm"
                >
                  <CalendarCheck size={16} />
                  Book
                </Link>
                <a
                  href="tel:+917798095795"
                  className="btn btn-outline min-h-[48px] justify-center text-sm"
                >
                  <Phone size={16} />
                  Call
                </a>
                <a
                  href="https://wa.me/917798095795"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline min-h-[48px] justify-center text-sm"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
