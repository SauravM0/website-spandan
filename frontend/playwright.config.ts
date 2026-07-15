import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  ['postgresql', '://postgres:postgres@127.0.0.1:5432/spandan_ci'].join('');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      cwd: path.resolve(__dirname, '../backend'),
      url: 'http://127.0.0.1:4000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        DEPLOYMENT_ENV: 'development',
        ENVIRONMENT_NAME: 'spandan-development',
        DATA_POLICY: 'synthetic-only',
        DATABASE_URL: databaseUrl,
        JWT_SECRET: 'ci-only-jwt-secret-7b453da850fa47c7895b',
        JWT_SECRET_VERSION: 'v1',
        INTAKE_ENCRYPTION_KEY: 'ci-only-intake-key-f6b90b2935bb4806a90a',
        INTAKE_ENCRYPTION_KEY_VERSION: 'v1',
        CORS_ORIGIN: 'http://127.0.0.1:3000',
        FRONTEND_URL: 'http://127.0.0.1:3000',
        PHONEPE_ENABLED: 'false',
        PAYMENT_MOCK_ENABLED: 'false',
        EMAIL_NOTIFICATIONS_ENABLED: 'false',
        WHATSAPP_NOTIFICATIONS_ENABLED: 'false',
        MEDICAL_DOCUMENTS_ENABLED: 'false',
        CLINICAL_RECORD_WRITES_ENABLED: 'false',
        CLINICAL_OBSERVATIONS_ENABLED: 'false',
        DEVICE_IMPORTS_ENABLED: 'false',
        PORT: '4000',
      },
    },
    {
      command: 'npm run dev -- --hostname 127.0.0.1',
      cwd: path.resolve(__dirname),
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        INTERNAL_API_URL: 'http://127.0.0.1:4000/api',
      },
    },
  ],
});
