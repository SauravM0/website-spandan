import React from 'react';
import type { Metadata } from 'next';
import MedicalCalculators from '../../components/tools/MedicalCalculators';

export const metadata: Metadata = {
  title: 'Medical Calculators | Spandan Super Speciality Clinic',
  description:
    'Use simple educational health calculators for BMI, blood pressure risk, and Indian Diabetes Risk Score from Spandan Super Speciality Clinic.',
  openGraph: {
    title: 'Medical Calculators | Spandan Clinic',
    description: 'Educational BMI, blood pressure, and diabetes risk tools.',
  },
};

export default function ToolsPage() {
  return <MedicalCalculators />;
}
