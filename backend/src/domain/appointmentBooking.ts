export const BOOKING_STATES = [
  'draft',
  'slot_held',
  'payment_required',
  'payment_pending',
  'confirmed',
  'hold_expired',
  'payment_failed',
  'cancelled',
  'refund_pending',
  'refunded',
] as const;

export type BookingState = (typeof BOOKING_STATES)[number];

const transitions: Readonly<Record<BookingState, readonly BookingState[]>> = {
  draft: ['slot_held', 'cancelled'],
  slot_held: ['payment_required', 'hold_expired', 'cancelled'],
  payment_required: ['payment_pending', 'hold_expired', 'cancelled'],
  payment_pending: ['confirmed', 'payment_failed', 'hold_expired'],
  confirmed: ['cancelled', 'refund_pending'],
  hold_expired: [],
  payment_failed: ['payment_pending', 'cancelled'],
  cancelled: ['refund_pending'],
  refund_pending: ['refunded'],
  refunded: [],
};

export class InvalidBookingTransitionError extends Error {
  readonly code = 'INVALID_BOOKING_TRANSITION';

  constructor(from: BookingState, to: BookingState) {
    super(`Booking cannot transition from ${from} to ${to}`);
  }
}

export function isBookingState(value: unknown): value is BookingState {
  return typeof value === 'string' && (BOOKING_STATES as readonly string[]).includes(value);
}

export function assertBookingTransition(from: BookingState, to: BookingState): void {
  if (from === to) return;
  if (!transitions[from].includes(to)) throw new InvalidBookingTransitionError(from, to);
}

export function bookingStateForPayment(status: string): BookingState | null {
  if (status === 'success') return 'confirmed';
  if (['created'].includes(status)) return 'payment_required';
  if (['pending', 'verification_required'].includes(status)) return 'payment_pending';
  if (['failed', 'expired'].includes(status)) return 'payment_failed';
  if (status === 'refunded') return 'refunded';
  return null;
}
