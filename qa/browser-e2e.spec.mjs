import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';

// Navigation waits for the document commit; readiness is asserted explicitly below.
// This prevents application-level DOMContentLoaded handlers from masking whether the
// actual UI is reachable and interactive.
const navigation = { waitUntil: 'commit' };

test('admin login shell loads on production', async ({ page }) => {
  await page.goto(`${baseURL}/admin.html`, navigation);
  await expect(page.locator('#loginPage')).toBeVisible();
  await expect(page.locator('#loginForm')).toBeVisible();
  await expect(page.locator('#username')).toHaveAttribute('autocomplete', 'username');
  await expect(page.locator('#password')).toHaveAttribute('autocomplete', 'current-password');
});

test('Patient 360 appointment action bridge resource is available on production', async ({ page }) => {
  await page.goto(`${baseURL}/admin.html`, navigation);

  const scriptResponse = await page.request.get(`${baseURL}/patient-appointment-actions.js?v=13.0.0`);
  expect(scriptResponse.ok()).toBeTruthy();
  const scriptText = await scriptResponse.text();
  expect(scriptText).toContain('/functions/v1/azaad-frontdesk-checkin');
  expect(scriptText).toContain('function checkIn');
  expect(scriptText).toContain('p360-actions');
});

test('admin auth flow can be exercised when test credentials are supplied', async ({ page }) => {
  test.skip(!process.env.AZAAD_TEST_USERNAME || !process.env.AZAAD_TEST_PASSWORD,
    'Authenticated E2E is intentionally skipped unless dedicated test credentials are supplied as CI secrets.');

  await page.goto(`${baseURL}/admin.html`, navigation);
  await page.locator('#username').fill(process.env.AZAAD_TEST_USERNAME);
  await page.locator('#password').fill(process.env.AZAAD_TEST_PASSWORD);
  await page.locator('#loginForm').getByRole('button', { name: /تسجيل الدخول/ }).click();

  await expect(page.locator('#loginPage')).toBeHidden({ timeout: 15000 });
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: 15000 });

  await page.reload(navigation);
  await expect(page.locator('#loginPage')).toBeHidden({ timeout: 15000 });
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: 15000 });
});
