import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin - Spandan Super Speciality Clinic',
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
