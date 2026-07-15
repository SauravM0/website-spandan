import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomTestBuilder from '../CustomTestBuilder';

const getDiagnosticTests = vi.fn();

vi.mock('@/lib/api', () => ({
  getDiagnosticTests: (...args: unknown[]) => getDiagnosticTests(...args),
  createCustomTestOrder: vi.fn(),
  createPayment: vi.fn(),
}));

describe('CustomTestBuilder', () => {
  beforeEach(() => {
    getDiagnosticTests.mockResolvedValue({
      total: 2,
      categories: ['Diabetes', 'Thyroid'],
      tests: [
        { id: 'one', source_number: 2, slug: 'hba1c', name: 'HbA1c', aliases: [], category: 'Diabetes', price: 0, price_confirmed: false, preparation_instructions: null, sample_type: null, report_turnaround: null, requires_clinic_confirmation: false },
        { id: 'two', source_number: 11, slug: 'tsh', name: 'TSH', aliases: [], category: 'Thyroid', price: 500, price_confirmed: true, preparation_instructions: null, sample_type: null, report_turnaround: null, requires_clinic_confirmation: false },
      ],
    });
  });

  it('shows unconfirmed pricing and continues after a test is selected', async () => {
    render(<CustomTestBuilder />);
    expect(await screen.findByText('HbA1c')).toBeInTheDocument();
    expect(screen.getAllByText('Price to be updated').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /HbA1c/i }));
    const continueButton = screen.getByRole('button', { name: /Continue to Patient Details/i });
    expect(continueButton).toBeEnabled();
    fireEvent.click(continueButton);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Patient information' })).toBeInTheDocument());
  });
});
