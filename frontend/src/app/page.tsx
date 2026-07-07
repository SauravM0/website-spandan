import React from 'react';
import type { Metadata } from 'next';
import HeroSection from '../components/home/HeroSection';

export const metadata: Metadata = {
  title: 'Spandan Super Speciality Clinic | Advanced Diagnostics in Chhatrapati Sambhajinagar',
  description: 'Spandan Clinic offers advanced diagnostics, cardiac care, endocrinology, and comprehensive health checkup packages in Chhatrapati Sambhajinagar (Aurangabad).',
  openGraph: {
    title: 'Spandan Super Speciality Clinic',
    description: 'Advanced diagnostics and expert medical care in Chhatrapati Sambhajinagar.',
  },
};
import TrustStrip from '../components/home/TrustStrip';
import ServiceCards from '../components/home/ServiceCards';
import FeaturedPackages from '../components/home/FeaturedPackages';
import EquipmentShowcase from '../components/home/EquipmentShowcase';
import DoctorCardsSection from '../components/home/DoctorCards';
import TeamCardsSection from '../components/home/TeamCards';
import ButterflyDivider from '../components/home/ButterflyDivider';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustStrip />
      <ServiceCards />
      <FeaturedPackages />
      <DoctorCardsSection />
      <ButterflyDivider />
      <EquipmentShowcase />
      <TeamCardsSection />
    </>
  );
}
