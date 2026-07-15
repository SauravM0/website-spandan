import dotenv from 'dotenv';
import { validateEnvironmentIsolation } from './environment';
import { validateSecurityConfiguration } from './security';
dotenv.config();

validateSecurityConfiguration(process.env);

const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, '');
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const env = process.env.NODE_ENV || 'development';
const deploymentEnvironment =
  process.env.DEPLOYMENT_ENV || (env === 'test' ? 'test' : 'development');
const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/spandan_clinic';
const environmentName = process.env.ENVIRONMENT_NAME || `spandan-${deploymentEnvironment}`;
const supabaseProjectRef = process.env.SUPABASE_PROJECT_REF || '';
const dataPolicy =
  process.env.DATA_POLICY ||
  (deploymentEnvironment === 'production' ? 'production-patient-data' : 'synthetic-only');
const jwtSecret = process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION_MUST_BE_AT_LEAST_32_CHARS';
const frontendUrl = normalizeOrigin(process.env.FRONTEND_URL || 'http://localhost:3000');
validateEnvironmentIsolation({
  runtimeEnvironment: env,
  deploymentEnvironment,
  environmentName,
  databaseUrl,
  supabaseProjectRef,
  dataPolicy,
});

export const config = {
  env,
  deploymentEnvironment,
  environmentName,
  supabaseProjectRef,
  dataPolicy,
  port: parseInt(process.env.PORT || '4000', 10),
  shutdownTimeoutMs: parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '25000', 10),
  databaseUrl,
  jwtSecret,
  jwtSecretVersion: process.env.JWT_SECRET_VERSION || 'v1',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  adminSessionCookieName: process.env.ADMIN_SESSION_COOKIE_NAME || 'admin_session',
  adminSessionCookieMaxAgeMs: parseInt(
    process.env.ADMIN_SESSION_COOKIE_MAX_AGE_MS || String(24 * 60 * 60 * 1000),
    10
  ),
  adminSessionCookieSameSite: (process.env.ADMIN_SESSION_COOKIE_SAMESITE || 'lax') as
    'lax' | 'strict' | 'none',
  corsOrigin: corsOrigins[0],
  corsOrigins,
  frontendUrl,
  receiptBrandName: process.env.RECEIPT_BRAND_NAME || 'Spandan Super Speciality Clinic',
  phonePe: {
    enabled: process.env.PHONEPE_ENABLED === 'true',
    environment: process.env.PHONEPE_ENVIRONMENT || 'sandbox',
    merchantId: process.env.PHONEPE_MERCHANT_ID || '',
    clientId: process.env.PHONEPE_CLIENT_ID || '',
    clientVersion: process.env.PHONEPE_CLIENT_VERSION || '',
    clientSecret: process.env.PHONEPE_CLIENT_SECRET || '',
    authBaseUrl:
      process.env.PHONEPE_AUTH_BASE_URL ||
      (process.env.PHONEPE_ENVIRONMENT === 'production'
        ? 'https://api.phonepe.com/apis/identity-manager'
        : 'https://api-preprod.phonepe.com/apis/pg-sandbox'),
    pgBaseUrl:
      process.env.PHONEPE_PG_BASE_URL ||
      (process.env.PHONEPE_ENVIRONMENT === 'production'
        ? 'https://api.phonepe.com/apis/pg'
        : 'https://api-preprod.phonepe.com/apis/pg-sandbox'),
    checkoutExpirySeconds: parseInt(process.env.PHONEPE_CHECKOUT_EXPIRY_SECONDS || '1200', 10),
    webhookUsername: process.env.PHONEPE_WEBHOOK_USERNAME || '',
    webhookPassword: process.env.PHONEPE_WEBHOOK_PASSWORD || '',
  },
  payments: {
    mockEnabled: process.env.PAYMENT_MOCK_ENABLED === 'true',
  },
  smtp: {
    enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  notificationEmail: process.env.NOTIFICATION_EMAIL || '',
  intake: {
    encryptionKey:
      process.env.INTAKE_ENCRYPTION_KEY ||
      (env === 'production' ? '' : 'development-only-intake-key-not-for-production'),
    keyVersion: process.env.INTAKE_ENCRYPTION_KEY_VERSION || 'v1',
    tokenTtlHours: parseInt(process.env.INTAKE_TOKEN_TTL_HOURS || '72', 10),
    draftRetentionDays: parseInt(process.env.INTAKE_DRAFT_RETENTION_DAYS || '30', 10),
    uploadBaseUrl: process.env.INTAKE_UPLOAD_BASE_URL || '',
  },
  patientRecord: {
    clinicalWritesEnabled: process.env.CLINICAL_RECORD_WRITES_ENABLED === 'true',
  },
  observations: {
    enabled: process.env.CLINICAL_OBSERVATIONS_ENABLED === 'true',
  },
  deviceIntegrations: {
    enabled: process.env.DEVICE_IMPORTS_ENABLED === 'true',
  },
  documents: {
    enabled: process.env.MEDICAL_DOCUMENTS_ENABLED === 'true',
    storageDir: process.env.DOCUMENT_STORAGE_DIR || '.private-documents',
    encryptionKey: process.env.DOCUMENT_ENCRYPTION_KEY || '',
    keyVersion: process.env.DOCUMENT_ENCRYPTION_KEY_VERSION || 'v1',
    maxBytes: parseInt(process.env.DOCUMENT_MAX_BYTES || String(10 * 1024 * 1024), 10),
    scannerMode: process.env.DOCUMENT_SCANNER_MODE || 'disabled',
    scannerHost: process.env.DOCUMENT_SCANNER_HOST || '127.0.0.1',
    scannerPort: parseInt(process.env.DOCUMENT_SCANNER_PORT || '3310', 10),
    scannerTimeoutMs: parseInt(process.env.DOCUMENT_SCANNER_TIMEOUT_MS || '15000', 10),
  },
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
