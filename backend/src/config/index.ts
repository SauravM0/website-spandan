import dotenv from 'dotenv';
dotenv.config();

const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, '');
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const env = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION_MUST_BE_AT_LEAST_32_CHARS';
const frontendUrl = normalizeOrigin(process.env.FRONTEND_URL || 'http://localhost:3000');
const requiredInProduction = [
  ['DATABASE_URL', process.env.DATABASE_URL],
  ['JWT_SECRET', process.env.JWT_SECRET],
  ['CORS_ORIGIN', process.env.CORS_ORIGIN],
  ['FRONTEND_URL', process.env.FRONTEND_URL],
];

if (env === 'production') {
  const missing = requiredInProduction.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  }
  if (jwtSecret.includes('CHANGE_ME') || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set to a strong secret in production');
  }
}

export const config = {
  env,
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/spandan_clinic',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  adminSessionCookieName: process.env.ADMIN_SESSION_COOKIE_NAME || 'admin_session',
  adminSessionCookieMaxAgeMs: parseInt(process.env.ADMIN_SESSION_COOKIE_MAX_AGE_MS || String(24 * 60 * 60 * 1000), 10),
  adminSessionCookieSameSite: (process.env.ADMIN_SESSION_COOKIE_SAMESITE || 'lax') as 'lax' | 'strict' | 'none',
  corsOrigin: corsOrigins[0],
  corsOrigins,
  frontendUrl,
  appointmentConsultationFee: parseFloat(process.env.APPOINTMENT_CONSULTATION_FEE || '700'),
  receiptBrandName: process.env.RECEIPT_BRAND_NAME || 'Spandan Super Speciality Clinic',
  phonePe: {
    enabled: process.env.PHONEPE_ENABLED === 'true',
    environment: process.env.PHONEPE_ENVIRONMENT || 'sandbox',
    merchantId: process.env.PHONEPE_MERCHANT_ID || '',
    clientId: process.env.PHONEPE_CLIENT_ID || '',
    clientVersion: process.env.PHONEPE_CLIENT_VERSION || '',
    clientSecret: process.env.PHONEPE_CLIENT_SECRET || '',
    authBaseUrl: process.env.PHONEPE_AUTH_BASE_URL || (process.env.PHONEPE_ENVIRONMENT === 'production'
      ? 'https://api.phonepe.com/apis/identity-manager'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox'),
    pgBaseUrl: process.env.PHONEPE_PG_BASE_URL || (process.env.PHONEPE_ENVIRONMENT === 'production'
      ? 'https://api.phonepe.com/apis/pg'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox'),
    checkoutExpirySeconds: parseInt(process.env.PHONEPE_CHECKOUT_EXPIRY_SECONDS || '1200', 10),
    webhookUsername: process.env.PHONEPE_WEBHOOK_USERNAME || '',
    webhookPassword: process.env.PHONEPE_WEBHOOK_PASSWORD || '',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  notificationEmail: process.env.NOTIFICATION_EMAIL || '',
  whatsapp: {
    enabled: process.env.WHATSAPP_NOTIFICATIONS_ENABLED === 'true',
    provider: process.env.WHATSAPP_PROVIDER || 'meta',
    webhookUrl: process.env.WHATSAPP_WEBHOOK_URL || '',
    webhookToken: process.env.WHATSAPP_WEBHOOK_TOKEN || '',
    apiUrl: process.env.WHATSAPP_API_URL || '',
    apiToken: process.env.WHATSAPP_API_TOKEN || '',
    accountSid: process.env.WHATSAPP_ACCOUNT_SID || '',
    authToken: process.env.WHATSAPP_AUTH_TOKEN || '',
    from: process.env.WHATSAPP_FROM || '',
    to: process.env.WHATSAPP_TO || '',
    timeoutMs: parseInt(process.env.WHATSAPP_TIMEOUT_MS || '5000', 10),
  },
};
