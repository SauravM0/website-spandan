import dotenv from 'dotenv';
dotenv.config();

const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, '');
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/spandan_clinic',
  jwtSecret: process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION_MUST_BE_AT_LEAST_32_CHARS',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  corsOrigin: corsOrigins[0],
  corsOrigins,
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
