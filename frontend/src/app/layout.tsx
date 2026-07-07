import React from 'react';
import type { Metadata } from 'next';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ConsentBanner from '../components/layout/ConsentBanner';
import StickyCTA from '../components/home/StickyCTA';
import '../styles/globals.css';

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

const medicalClinicJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalClinic',
  name: 'Spandan Super Speciality Clinic',
  image: '/logo.png',
  telephone: '+917798095795',
  email: 'info@spandanclinic.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Plot No. 63, Alankar Housing Society, Beside Essar Petrol Pump, Gajanan Maharaj Mandir Rd, Pundlik Nagar, Garkheda',
    addressLocality: 'Chhatrapati Sambhajinagar',
    addressRegion: 'Maharashtra',
    postalCode: '431009',
    addressCountry: 'IN',
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '07:00',
      closes: '20:00',
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans text-text bg-white antialiased min-h-screen flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalClinicJsonLd) }}
        />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <ConsentBanner />
        <StickyCTA />
      </body>
    </html>
  );
}
