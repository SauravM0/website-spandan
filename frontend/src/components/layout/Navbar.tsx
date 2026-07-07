'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarCheck, ChevronDown, Globe2, Menu, X } from 'lucide-react';
import '../../lib/i18n';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'mr', label: 'Marathi' },
];

export default function Navbar() {
  const { t, i18n } = useTranslation('common');
  const [menuOpen, setMenuOpen] = useState(false);
  const [clinicOpen, setClinicOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const navLinks = [
    { href: '/doctors', label: 'nav_doctors' },
    { href: '/packages', label: 'nav_packages' },
    { href: '/facilities', label: 'nav_facilities' },
    { href: '/health-resources', label: 'nav_articles' },
    { href: '/contact', label: 'nav_contact' },
  ];

  const clinicLinks = [
    { href: '/', label: 'nav_home' },
    { href: '/about', label: 'nav_about' },
    { href: '/tools', label: 'nav_tools' },
  ];

  const closeMenus = () => {
    setMenuOpen(false);
    setClinicOpen(false);
    setLanguageOpen(false);
  };

  const navLabel = (key: string) => {
    const translated = t(key);
    return translated === key && key === 'nav_tools' ? 'Health Tools' : translated;
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
      <div className="container flex items-center justify-between h-[70px]">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-navy">
          <img src="/logo.png" alt={t('site_name')} className="h-[46px] w-auto object-contain" />
        </Link>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden bg-transparent border-none p-2 min-w-[44px] min-h-[44px] text-navy"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <nav
          className={`${
            menuOpen
              ? 'flex md:hidden flex-col absolute top-[70px] left-0 right-0 bg-white/95 backdrop-blur-sm p-4 border-b border-border shadow-lg'
              : 'hidden md:flex'
          } md:flex md:items-center md:gap-1`}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMenus}
              className="px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-bg-alt transition-colors min-h-[44px] flex items-center"
            >
              {navLabel(link.label)}
            </Link>
          ))}

          <div
            className="relative"
            onMouseEnter={() => setClinicOpen(true)}
            onMouseLeave={() => setClinicOpen(false)}
          >
            <button
              type="button"
              onClick={() => setClinicOpen((open) => !open)}
              className="w-full px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-bg-alt transition-colors min-h-[44px] flex items-center justify-between gap-1"
              aria-expanded={clinicOpen}
            >
              Clinic
              <ChevronDown size={16} />
            </button>
            <div
              className={`md:absolute md:right-0 md:top-full md:w-44 md:rounded-lg md:border md:border-border md:bg-white md:p-2 md:shadow-lg ${
                clinicOpen ? 'block' : 'hidden'
              }`}
            >
              {clinicLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenus}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-text hover:bg-bg-alt"
                >
                  {navLabel(link.label)}
                </Link>
              ))}
            </div>
          </div>

          <div className="relative md:ml-2">
            <button
              type="button"
              onClick={() => setLanguageOpen((open) => !open)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-bg-alt transition-colors min-h-[44px] flex items-center gap-2"
              aria-label="Change language"
              aria-expanded={languageOpen}
            >
              <Globe2 size={18} />
              <span className="md:hidden">Language</span>
              <ChevronDown size={16} />
            </button>
            <div
              className={`md:absolute md:right-0 md:top-full md:w-36 md:rounded-lg md:border md:border-border md:bg-white md:p-2 md:shadow-lg ${
                languageOpen ? 'grid gap-1' : 'hidden'
              }`}
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setLanguageOpen(false);
                  }}
                  className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    i18n.language === lang.code
                      ? 'bg-primary text-white font-semibold'
                      : 'bg-transparent text-text border border-border hover:bg-bg-alt'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/book-appointment"
            className="md:hidden mt-2 btn btn-accent justify-center"
            onClick={closeMenus}
          >
            <CalendarCheck size={18} />
            Book Appointment
          </Link>
        </nav>

        <Link
          href="/book-appointment"
          className="hidden md:inline-flex btn btn-accent text-xs px-4 py-2"
        >
          <CalendarCheck size={16} />
          Book Appointment
        </Link>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[-1] bg-black/20 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>
    </header>
  );
}
