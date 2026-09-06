import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import axe from 'axe-core';
import HeroSection from '../home/HeroSection';
import ClinicGallery from '../home/ClinicGallery';
import ResultPanel from '../tools/ResultPanel';
import FacilityFilter from '../facilities/FacilityFilter';
import { clinicSettings } from '@/lib/settings';
import type { PublicDoctorSummary } from '@/lib/home';
import type { ToolResult } from '@/lib/tools/types';

const doctors: PublicDoctorSummary[] = [
  {
    slug: 'dr-tukaram-aute',
    name: 'Dr. Tukaram Sonaji Aute',
    speciality: 'Cardiology',
    qualifications: 'MD, DM Cardiology',
  },
  {
    slug: 'dr-pratibha-aute',
    name: 'Dr. Pratibha Pawal-Aute',
    speciality: 'Endocrinology',
    qualifications: 'MD, DM Endocrinology',
  },
];

const bmiResult: ToolResult = {
  value: '26.4',
  label: 'Obesity range',
  detail: 'Consider a medical review for diabetes, thyroid, lipid, and cardiac risk factors.',
  tone: 'red',
  scale: {
    value: 26.4,
    min: 14,
    max: 40,
    caption: 'BMI',
    bands: [
      { upTo: 18.5, label: 'Under', tone: 'amber' },
      { upTo: 23, label: 'Healthy', tone: 'green' },
      { upTo: 25, label: 'Overweight', tone: 'amber' },
      { upTo: 40, label: 'Obesity', tone: 'red' },
    ],
  },
};

// jsdom applies no stylesheet, so colour-contrast is covered by the palette
// contrast test instead of here.
async function expectNoSeriousViolations() {
  const results = await axe.run(document.body, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  const serious = results.violations.filter((item) =>
    ['serious', 'critical'].includes(item.impact || '')
  );
  expect(serious.map((item) => `${item.id}: ${item.nodes[0]?.html ?? ''}`)).toEqual([]);
}

describe('public surface accessibility', () => {
  it('hero has one h1, labelled actions, and no serious axe violations', async () => {
    render(<HeroSection settings={clinicSettings} doctors={doctors} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: /WhatsApp/i })).toHaveAttribute('rel', 'noopener noreferrer');
    await expectNoSeriousViolations();
  }, 20000);

  it('gallery images all carry descriptive alt text', async () => {
    render(<ClinicGallery />);
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
    images.forEach((image) => {
      expect(image.getAttribute('alt')?.trim()).toBeTruthy();
    });
    await expectNoSeriousViolations();
  }, 20000);

  it('calculator results announce politely and hide the decorative gauge', async () => {
    render(<ResultPanel result={bmiResult} title="BMI" emptyText="Enter values." />);
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).toBeTruthy();
    expect(live?.getAttribute('aria-atomic')).toBe('true');
    expect(document.querySelector('[aria-hidden="true"] .rounded-pill')).toBeTruthy();
    await expectNoSeriousViolations();
  }, 20000);

  it('facility filter exposes pressed state to assistive tech', async () => {
    render(<FacilityFilter categories={['Cardiac diagnostics', 'Laboratory diagnostics']} />);
    const all = screen.getByRole('button', { name: 'All facilities' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    await expectNoSeriousViolations();
  }, 20000);
});
