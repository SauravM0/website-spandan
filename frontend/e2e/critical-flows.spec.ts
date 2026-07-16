import { expect, test } from '@playwright/test';
import crypto from 'node:crypto';

const base32Decode = (input: string) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const character of input.replace(/\s|-/g, '').toUpperCase()) {
    bits += alphabet.indexOf(character).toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
};

const totp = (secret: string) => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  const value =
    ((digest[offset] & 127) << 24) |
    ((digest[offset + 1] & 255) << 16) |
    ((digest[offset + 2] & 255) << 8) |
    (digest[offset + 3] & 255);
  return String(value % 1_000_000).padStart(6, '0');
};

test('same-origin health endpoint satisfies its public contract', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toEqual(
    expect.objectContaining({
      status: 'ok',
      version: expect.any(String),
      timestamp: expect.any(String),
    })
  );
});

test('public booking page never exposes backend or internal hostnames', async ({ page }) => {
  const unsafeRequests: string[] = [];
  page.on('request', (request) => {
    if (/localhost:4000|127\.0\.0\.1:4000|\.internal(?::|\/)/i.test(request.url())) {
      unsafeRequests.push(request.url());
    }
  });

  await page.goto('/book-appointment');
  await expect(page.getByRole('heading', { name: 'Book Appointment', level: 1 })).toBeVisible();
  expect(unsafeRequests).toEqual([]);
});

test('the single administrator enrolls MFA before receiving the expected session DTO', async ({
  page,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL || 'admin-ci@example.test';
  const password = process.env.E2E_ADMIN_PASSWORD || 'CI-only-admin-password-2026';

  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue securely' }).click();

  const setupKey = await page.getByLabel('Authenticator setup key').textContent();
  expect(setupKey).toBeTruthy();
  await page.getByLabel('Six-digit code').fill(totp(setupKey!.trim()));
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page.getByRole('heading', { name: 'Save recovery codes' })).toBeVisible();
  await expect(page.getByLabel('One-time recovery codes').getByRole('listitem')).toHaveCount(8);
  await page.getByRole('button', { name: 'I saved these codes' }).click();

  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.getByText('Today Dashboard')).toBeVisible();

  const session = await page.evaluate(async () => {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    return { status: response.status, body: await response.json() };
  });
  expect(session.status).toBe(200);
  expect(session.body.user).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      email,
      role: 'admin',
      capabilities: expect.any(Array),
      session_expires_at: expect.any(String),
    })
  );
});
