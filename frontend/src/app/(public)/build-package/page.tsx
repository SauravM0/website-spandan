import type { Metadata } from 'next';
import CustomTestBuilder from '@/components/booking/CustomTestBuilder';

export const metadata: Metadata = {
  title: 'Build Your Diagnostic Package | Spandan Clinic',
  description: 'Choose individual diagnostic tests, provide patient details, and submit a personalised test request.',
  alternates: { canonical: '/build-package' },
};

export default function BuildPackagePage() {
  return <CustomTestBuilder />;
}
