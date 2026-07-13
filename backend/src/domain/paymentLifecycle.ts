import crypto from 'crypto';

export const ACTIVE_PAYMENT_STATUSES = ['created', 'pending', 'verification_required'] as const;
export const TERMINAL_PAYMENT_STATUSES = ['success', 'failed', 'expired', 'refunded', 'disputed'] as const;

const transitions: Readonly<Record<string, readonly string[]>> = {
  created: ['created', 'pending', 'verification_required', 'failed', 'expired', 'success'],
  pending: ['pending', 'verification_required', 'failed', 'expired', 'success'],
  verification_required: ['verification_required', 'pending', 'failed', 'expired', 'success'],
  failed: ['failed', 'success'], // delayed authoritative provider evidence may recover a failed callback
  expired: ['expired', 'success'],
  success: ['success', 'refund_pending', 'refunded', 'disputed'],
  refund_pending: ['refund_pending', 'success', 'refunded', 'disputed'],
  refunded: ['refunded', 'disputed'],
  disputed: ['disputed'],
};

export function canApplyPaymentTransition(current: string, next: string): boolean {
  return Boolean(transitions[current]?.includes(next));
}

export function assertPaymentTransition(current: string, next: string): void {
  if (!canApplyPaymentTransition(current, next)) {
    const error = new Error(`Payment transition ${current} -> ${next} is not allowed`) as Error & { code?: string; status?: number };
    error.code = 'INVALID_PAYMENT_TRANSITION';
    error.status = 409;
    throw error;
  }
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

export function providerEventHash(provider: string, eventName: string, payload: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(canonical({ provider, eventName, payload }))).digest('hex');
}

export function validateRefundAmount(paymentAmount: number, completedRefunds: number, requested: number): void {
  if (!Number.isFinite(requested) || requested <= 0 || requested + completedRefunds > paymentAmount) {
    const error = new Error('Refund amount exceeds the verified refundable balance') as Error & { code?: string; status?: number };
    error.code = 'INVALID_REFUND_AMOUNT';
    error.status = 409;
    throw error;
  }
}
