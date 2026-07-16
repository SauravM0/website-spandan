import { describe, expect, it } from 'vitest';
import { ApiError, publicPaymentErrorMessage } from '../api';

describe('public payment provider state', () => {
  it('explains that a saved request can be completed with the clinic when online payment is disabled', () => {
    const error = new ApiError('disabled', 503, {
      error: {
        code: 'PAYMENT_PROVIDER_DISABLED',
        message: 'Online payment is temporarily unavailable.',
        fieldErrors: {},
      },
    });
    expect(publicPaymentErrorMessage(error)).toContain('request was saved');
    expect(publicPaymentErrorMessage(error)).toContain('contact the clinic');
  });

  it('does not replace unrelated errors', () => {
    expect(publicPaymentErrorMessage(new Error('network'))).toBeNull();
  });
});
