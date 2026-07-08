import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Spandan Super Speciality Clinic',
  description: 'Advanced diagnostics and expert medical care in Chhatrapati Sambhajinagar.',
  icons: [{ rel: 'icon', url: '/logo.png' }],
  openGraph: {
    title: 'Spandan Super Speciality Clinic',
    description: 'Advanced diagnostics and expert medical care in Chhatrapati Sambhajinagar.',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'Spandan Super Speciality Clinic' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans text-text bg-white antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
