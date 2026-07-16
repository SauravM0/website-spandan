import crypto from 'node:crypto';
import { config } from '../config';
import { providerEventHash } from '../domain/paymentLifecycle';
import { AppError } from '../utils/errors';

export type PaymentEvidenceSource =
  'phonepe.webhook' | 'phonepe.status_api' | 'phonepe.reconciliation' | 'test.mock';

export type PaymentEvidence = {
  source: PaymentEvidenceSource;
  providerVerified: boolean;
  observedAt: Date;
  eventName: string;
  identityPayload?: unknown;
  rejectReplay?: boolean;
};

const phonePeSources = new Set<PaymentEvidenceSource>([
  'phonepe.webhook',
  'phonepe.status_api',
  'phonepe.reconciliation',
]);

export function assertPaymentEvidenceAllowed(evidence: PaymentEvidence): void {
  if (phonePeSources.has(evidence.source)) {
    if (!config.phonePe.enabled || !evidence.providerVerified) {
      throw new AppError(
        422,
        'PROVIDER_EVIDENCE_REQUIRED',
        'Authoritative provider evidence is required for this payment update.'
      );
    }
    return;
  }
  const explicitTestEnvironment = ['development', 'test'].includes(config.deploymentEnvironment);
  if (
    evidence.source !== 'test.mock' ||
    !config.payments.mockEnabled ||
    !explicitTestEnvironment ||
    config.phonePe.enabled
  ) {
    throw new AppError(
      422,
      'TEST_PAYMENT_EVIDENCE_FORBIDDEN',
      'Test payment evidence is not enabled in this environment.'
    );
  }
}

export function paymentEvidenceHash(evidence: PaymentEvidence, payload: unknown): string {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        source: evidence.source,
        event: evidence.eventName,
        observed_at: evidence.observedAt.toISOString(),
        payload_hash: providerEventHash('phonepe', evidence.eventName, payload),
      })
    )
    .digest('hex');
}

export function paymentEventIdentityHash(evidence: PaymentEvidence, payload: unknown): string {
  const identity = evidence.rejectReplay
    ? (evidence.identityPayload ?? payload)
    : { payload, observed_at: evidence.observedAt.toISOString() };
  return providerEventHash(
    evidence.source === 'test.mock' ? 'test' : 'phonepe',
    evidence.eventName,
    identity
  );
}
