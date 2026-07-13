import crypto from 'crypto';
import { config } from '../config';
import { requireApprovedVendor } from '../security/vendorGate';

type TokenCache = {
  accessToken: string;
  expiresAt: number;
} | null;

type PhonePePaymentInput = {
  merchantOrderId: string;
  amountPaisa: number;
  redirectUrl: string;
  phone?: string;
  metaInfo?: Record<string, string>;
};

let tokenCache: TokenCache = null;

function assertPhonePeConfigured() {
  const missing = [
    ['PHONEPE_CLIENT_ID', config.phonePe.clientId],
    ['PHONEPE_CLIENT_VERSION', config.phonePe.clientVersion],
    ['PHONEPE_CLIENT_SECRET', config.phonePe.clientSecret],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`PhonePe is enabled but missing configuration: ${missing.join(', ')}`);
  }
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const signal = init.signal || AbortSignal.timeout(10_000);
  const response = await fetch(url, { ...init, signal });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = body?.message || body?.error || `PhonePe request failed with ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

export function amountToPaisa(amount: number): number {
  return Math.round(Number(amount) * 100);
}

export function verifyPhonePeWebhookAuthorization(headerValue?: string): boolean {
  const { webhookUsername, webhookPassword } = config.phonePe;
  if (!webhookUsername || !webhookPassword) {
    return !config.phonePe.enabled;
  }
  if (!headerValue) return false;
  const expected = crypto.createHash('sha256').update(`${webhookUsername}:${webhookPassword}`).digest('hex');
  const actual = headerValue
    .replace(/^SHA256\s*/i, '')
    .replace(/^\(/, '')
    .replace(/\)$/, '')
    .trim();
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function normalizePhonePeState(state?: string) {
  const normalized = String(state || '').toUpperCase();
  if (normalized === 'COMPLETED') return 'success';
  if (normalized === 'FAILED') return 'failed';
  if (normalized === 'EXPIRED') return 'expired';
  if (normalized === 'PENDING') return 'pending';
  return 'verification_required';
}

export function extractPhonePePaymentDetail(payload: any) {
  const details = Array.isArray(payload?.paymentDetails) ? payload.paymentDetails : [];
  return details[0] || {};
}

export async function getPhonePeAccessToken(): Promise<string> {
  await requireApprovedVendor('PhonePe');
  assertPhonePeConfigured();
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.expiresAt > now + 60) {
    return tokenCache.accessToken;
  }

  const params = new URLSearchParams({
    client_id: config.phonePe.clientId,
    client_version: config.phonePe.clientVersion,
    client_secret: config.phonePe.clientSecret,
    grant_type: 'client_credentials',
  });

  const response = await requestJson<{ access_token: string; expires_at?: number }>(
    `${config.phonePe.authBaseUrl}/v1/oauth/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    }
  );

  tokenCache = {
    accessToken: response.access_token,
    expiresAt: response.expires_at || now + 300,
  };
  return response.access_token;
}

export async function initiatePhonePePayment(input: PhonePePaymentInput) {
  const token = await getPhonePeAccessToken();
  const body: Record<string, unknown> = {
    merchantOrderId: input.merchantOrderId,
    amount: input.amountPaisa,
    expireAfter: config.phonePe.checkoutExpirySeconds,
    paymentFlow: {
      type: 'PG_CHECKOUT',
      merchantUrls: {
        redirectUrl: input.redirectUrl,
      },
    },
    disablePaymentRetry: true,
    metaInfo: input.metaInfo || {},
  };

  if (input.phone) {
    body.prefillUserLoginDetails = { phoneNumber: input.phone };
  }

  return requestJson<{ orderId: string; state: string; expireAt: number; redirectUrl: string }>(
    `${config.phonePe.pgBaseUrl}/checkout/v2/pay`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `O-Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }
  );
}

export async function getPhonePeOrderStatus(merchantOrderId: string) {
  const token = await getPhonePeAccessToken();
  return requestJson<any>(
    `${config.phonePe.pgBaseUrl}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status?details=false&errorContext=true`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `O-Bearer ${token}`,
      },
    }
  );
}
