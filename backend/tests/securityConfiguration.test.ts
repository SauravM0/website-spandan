import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSecurityConfiguration } from '../src/config/security';

const secret = (character: string) => character.repeat(48);
const hosted = () => ({
  NODE_ENV: 'production',
  DEPLOYMENT_ENV: 'production',
  ENVIRONMENT_NAME: 'spandan-production',
  DATA_POLICY: 'production-patient-data',
  DATABASE_URL: 'postgresql://pooler.example.invalid/database',
  SUPABASE_PROJECT_REF: 'productionref123',
  CORS_ORIGIN: 'https://clinic.example',
  FRONTEND_URL: 'https://clinic.example',
  JWT_SECRET: secret('j'),
  JWT_SECRET_VERSION: 'v1',
  INTAKE_ENCRYPTION_KEY: secret('i'),
  INTAKE_ENCRYPTION_KEY_VERSION: 'v1',
  METRICS_BEARER_TOKEN: secret('m'),
  MFA_ENCRYPTION_KEY: secret('f'),
  MFA_ENCRYPTION_KEY_VERSION: 'v1',
  ADMIN_SESSION_COOKIE_MAX_AGE_MS: '28800000',
  ADMIN_SESSION_IDLE_TIMEOUT_MS: '1800000',
  ADMIN_STEP_UP_MAX_AGE_MS: '600000',
});

test('accepts safe local defaults and an isolated hosted configuration', () => {
  assert.doesNotThrow(() => validateSecurityConfiguration({ NODE_ENV: 'development' }));
  assert.doesNotThrow(() => validateSecurityConfiguration(hosted()));
});

test('hosted startup rejects missing, weak, shared, or unversioned application secrets', () => {
  const missing = hosted();
  delete (missing as Partial<typeof missing>).INTAKE_ENCRYPTION_KEY;
  assert.throws(() => validateSecurityConfiguration(missing), /INTAKE_ENCRYPTION_KEY/);

  assert.throws(
    () => validateSecurityConfiguration({ ...hosted(), JWT_SECRET: 'replace-me' }),
    /JWT_SECRET/
  );
  assert.throws(
    () => validateSecurityConfiguration({ ...hosted(), JWT_SECRET_VERSION: 'current' }),
    /JWT_SECRET_VERSION/
  );
  assert.throws(
    () => validateSecurityConfiguration({ ...hosted(), INTAKE_ENCRYPTION_KEY: secret('j') }),
    /must be different/
  );
  assert.throws(
    () => validateSecurityConfiguration({ ...hosted(), METRICS_BEARER_TOKEN: 'replace-me' }),
    /METRICS_BEARER_TOKEN/
  );
  assert.throws(
    () => validateSecurityConfiguration({ ...hosted(), MFA_ENCRYPTION_KEY: 'replace-me' }),
    /MFA_ENCRYPTION_KEY/
  );
  assert.throws(
    () => validateSecurityConfiguration({ ...hosted(), MFA_ENCRYPTION_KEY_VERSION: 'current' }),
    /MFA_ENCRYPTION_KEY_VERSION/
  );
  assert.throws(
    () => validateSecurityConfiguration({ ...hosted(), MFA_ENCRYPTION_KEY: secret('j') }),
    /unique|different/
  );
  assert.throws(
    () =>
      validateSecurityConfiguration({ ...hosted(), ADMIN_SESSION_IDLE_TIMEOUT_MS: '999999999' }),
    /ADMIN_SESSION_IDLE_TIMEOUT_MS/
  );
});

test('enabled providers require complete credentials at startup', () => {
  assert.throws(
    () => validateSecurityConfiguration({ PHONEPE_ENABLED: 'true' }),
    /PHONEPE_CLIENT_SECRET/
  );
  assert.throws(
    () => validateSecurityConfiguration({ EMAIL_NOTIFICATIONS_ENABLED: 'true' }),
    /SMTP_PASS/
  );
  assert.throws(
    () => validateSecurityConfiguration({ WHATSAPP_NOTIFICATIONS_ENABLED: 'true' }),
    /WHATSAPP_API_TOKEN/
  );
  assert.doesNotThrow(() =>
    validateSecurityConfiguration({
      MEDICAL_DOCUMENTS_ENABLED: 'true',
      DOCUMENT_ENCRYPTION_KEY: secret('d'),
      DOCUMENT_ENCRYPTION_KEY_VERSION: 'v1',
      DOCUMENT_STORAGE_DIR: '.private-documents',
    })
  );
  assert.throws(
    () =>
      validateSecurityConfiguration({
        ...hosted(),
        MEDICAL_DOCUMENTS_ENABLED: 'true',
        DOCUMENT_ENCRYPTION_KEY: secret('j'),
        DOCUMENT_ENCRYPTION_KEY_VERSION: 'v1',
        DOCUMENT_STORAGE_DIR: '/private/documents',
        DOCUMENT_SCANNER_MODE: 'clamav',
      }),
    /must all be different/
  );
});

test('mock payments are explicit and forbidden in hosted environments', () => {
  assert.doesNotThrow(() =>
    validateSecurityConfiguration({ DEPLOYMENT_ENV: 'test', PAYMENT_MOCK_ENABLED: 'true' })
  );
  assert.throws(
    () => validateSecurityConfiguration({ ...hosted(), PAYMENT_MOCK_ENABLED: 'true' }),
    /forbidden/
  );
  assert.throws(
    () => validateSecurityConfiguration({ PHONEPE_ENABLED: 'true', PAYMENT_MOCK_ENABLED: 'true' }),
    /cannot both be true/
  );
});

test('invalid boolean flags fail instead of silently disabling a service', () => {
  assert.throws(
    () => validateSecurityConfiguration({ PHONEPE_ENABLED: 'yes' }),
    /must be true or false/
  );
});

test('hosted provider credentials cannot reuse application secrets', () => {
  assert.throws(
    () =>
      validateSecurityConfiguration({
        ...hosted(),
        EMAIL_NOTIFICATIONS_ENABLED: 'true',
        SMTP_HOST: 'smtp.example',
        SMTP_USER: 'clinic@example.test',
        SMTP_PASS: secret('j'),
        NOTIFICATION_EMAIL: 'clinic@example.test',
      }),
    /secrets must be unique/
  );
});
