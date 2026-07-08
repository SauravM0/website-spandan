import React from 'react';
import type { Metadata } from 'next';
import MedicalCalculators from '@/components/tools/MedicalCalculators';
import { bmiMeta } from '@/lib/tools/bmi';
import { bpMeta } from '@/lib/tools/blood-pressure';
import { diabetesMeta } from '@/lib/tools/diabetes-risk';

const toolList = [bmiMeta, bpMeta, diabetesMeta];

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
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Medical Calculators',
            description:
              'Educational health calculators for BMI, blood pressure risk, and Indian Diabetes Risk Score.',
            about: {
              '@type': 'Thing',
              name: 'Health Calculators',
            },
            mainEntity: toolList.map((t) => ({
              '@type': 'SoftwareApplication',
              name: t.title,
              description: t.description,
              applicationCategory: 'HealthApplication',
              author: {
                '@type': 'MedicalClinic',
                name: 'Spandan Super Speciality Clinic',
              },
            })),
          }),
        }}
      />
      <MedicalCalculators />
    </>
  );
}
