import React from 'react';
import type { Metadata } from 'next';
import { Figtree, Fraunces, Noto_Sans_Devanagari } from 'next/font/google';
import '@/styles/globals.css';
import WebVitalsReporter from '@/components/telemetry/WebVitalsReporter';

// Fonts are downloaded at build time and served from our own origin, which keeps
// them inside the `font-src 'self'` CSP. Figtree carries the UI, Fraunces is the
// display accent, Noto Devanagari covers the Hindi and Marathi locales.
const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  display: 'swap',
  variable: '--font-devanagari',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Spandan Super Speciality Clinic',
  description: 'Advanced diagnostics and expert medical care in Chhatrapati Sambhajinagar.',
  icons: [{ rel: 'icon', url: '/logo.png' }],
  openGraph: {
    title: 'Spandan Super Speciality Clinic',
    description: 'Advanced diagnostics and expert medical care in Chhatrapati Sambhajinagar.',
    images: [
      { url: '/logo.png', width: 1200, height: 630, alt: 'Spandan Super Speciality Clinic' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${figtree.variable} ${fraunces.variable} ${notoDevanagari.variable}`}
    >
      <body className="font-sans text-text bg-white antialiased min-h-screen flex flex-col">
        <WebVitalsReporter />
        {children}
      </body>
    </html>
  );
}
