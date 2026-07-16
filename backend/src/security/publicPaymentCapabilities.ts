import crypto from 'node:crypto';
import { query } from '../config/database';
import { AppError } from '../utils/errors';

export type PaymentCapabilityPurpose = 'status' | 'receipt';
const statusTtlMs = 24 * 60 * 60 * 1000;
const receiptTtlMs = 30 * 24 * 60 * 60 * 1000;

const tokenHash = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

function token(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export async function issuePublicPaymentCapabilities(paymentId: string) {
  const statusCapability = token();
  const receiptCapability = token();
  const statusExpiresAt = new Date(Date.now() + statusTtlMs);
  const receiptExpiresAt = new Date(Date.now() + receiptTtlMs);
  await query(
    `INSERT INTO public_payment_capabilities(token_hash,payment_id,purpose,expires_at)
     VALUES($1,$3,'status',$4),($2,$3,'receipt',$5)`,
    [
      tokenHash(statusCapability),
      tokenHash(receiptCapability),
      paymentId,
      statusExpiresAt,
      receiptExpiresAt,
    ]
  );
  return {
    statusCapability,
    receiptCapability,
    statusExpiresAt,
    receiptExpiresAt,
  };
}

export async function resolvePublicPaymentCapability(
  capability: string,
  purpose: PaymentCapabilityPurpose
): Promise<{ paymentId: string; capabilityHash: string }> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(capability)) {
    throw new AppError(
      404,
      'PUBLIC_CAPABILITY_INVALID',
      'Payment access link is invalid or expired.'
    );
  }
  const hash = tokenHash(capability);
  const result = await query(
    `UPDATE public_payment_capabilities
        SET last_used_at=NOW(),use_count=use_count+1
      WHERE token_hash=$1 AND purpose=$2 AND expires_at>NOW()
      RETURNING payment_id`,
    [hash, purpose]
  );
  if (!result.rows[0]) {
    throw new AppError(
      404,
      'PUBLIC_CAPABILITY_INVALID',
      'Payment access link is invalid or expired.'
    );
  }
  return { paymentId: result.rows[0].payment_id, capabilityHash: hash };
}

export async function auditPublicPaymentAccess(
  paymentId: string | null,
  purpose: string,
  outcome: 'success' | 'denied',
  requestId?: string
) {
  await query(
    `INSERT INTO audit_log(actor_staff_id,action,entity_type,entity_id,metadata)
     VALUES(NULL,$1,'payment',$2,$3)`,
    [
      `public.payment.${purpose}.${outcome}`,
      paymentId,
      JSON.stringify({ request_id: requestId, outcome }),
    ]
  ).catch(() => undefined);
}

export function publicPaymentStatusDto(payment: any) {
  return {
    status: String(payment.status),
    amount: Number(payment.amount),
    currency: String(payment.currency || 'INR'),
    updated_at: payment.updated_at,
    expires_at: payment.expires_at || null,
    receipt_available: Boolean(payment.receipt_id),
    receipt_number: payment.receipt_number || null,
    notification_status: payment.notification_status || null,
  };
}

export function publicPaymentStartDto(payment: any) {
  const access = payment.public_access;
  return {
    status: String(payment.status),
    amount: Number(payment.amount),
    currency: String(payment.currency || 'INR'),
    checkout_url: payment.redirect_url || null,
    status_capability: access.statusCapability,
    receipt_capability: access.receiptCapability,
    status_capability_expires_at: access.statusExpiresAt,
    receipt_capability_expires_at: access.receiptExpiresAt,
  };
}
