import { expect, test } from '@playwright/test';

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

test('the single administrator can log in and receive the expected session DTO', async ({
  page,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL || 'admin-ci@example.test';
  const password = process.env.E2E_ADMIN_PASSWORD || 'CI-only-admin-password-2026';

  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

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
