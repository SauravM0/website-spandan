import { describe, expect, it } from 'vitest';
import { createInitialState } from '../BookingReducer';

describe('booking form defaults', () => {
  it('uses Consultation as the default reason for visit', () => {
    expect(createInitialState().form.reason_for_visit).toBe('Consultation');
  });
});
