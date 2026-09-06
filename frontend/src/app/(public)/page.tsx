import React from 'react';
import type { Metadata } from 'next';
import HeroSection from '@/components/home/HeroSection';
import TrustStrip from '@/components/home/TrustStrip';
import ServiceCards from '@/components/home/ServiceCards';
import DoctorCardsSection from '@/components/home/DoctorCards';
import ClinicGallery from '@/components/home/ClinicGallery';
import ExploreBento from '@/components/home/ExploreBento';
import LocationCTA from '@/components/home/LocationCTA';
import { getHomePayload } from '@/lib/home';

export const metadata: Metadata = {
  title: 'Spandan Super Speciality Clinic | Cardiology, Endocrinology & Diagnostics',
  description: 'Premium cardiology, diabetes, thyroid, and diagnostic care at Spandan Clinic in Chhatrapati Sambhajinagar.',
  openGraph: {
    title: 'Spandan Super Speciality Clinic',
    description: 'Specialist medical care and diagnostics in Chhatrapati Sambhajinagar.',
  },
};

function homeStructuredData(payload: Awaited<ReturnType<typeof getHomePayload>>) {
  const { settings, doctors } = payload;
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    name: settings.name,
    image: '/logo.png',
    telephone: settings.phone,
    email: settings.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: settings.address,
      addressLocality: settings.city,
      addressRegion: settings.state,
      postalCode: settings.pincode,
      addressCountry: 'IN',
    },
    physician: doctors.map((doctor) => ({
      '@type': 'Physician',
      name: doctor.name,
      medicalSpecialty: doctor.speciality,
      url: `/doctors/${doctor.slug}`,
    })),
  };
}

export default async function HomePage() {
  const payload = await getHomePayload();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData(payload)) }}
      />
      <HeroSection settings={payload.settings} doctors={payload.doctors} />
      <DoctorCardsSection doctors={payload.doctors} />
      <ServiceCards />
      <TrustStrip />
      <ClinicGallery />
      <ExploreBento article={payload.featuredArticle} video={payload.featuredVideo} />
      <LocationCTA settings={payload.settings} />
    </>
  );
}
