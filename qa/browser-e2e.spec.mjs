import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';

test('admin login shell loads on production', async ({ page }) => {
  await page.goto(`${baseURL}/admin.html`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#loginPage')).toBeVisible();
  await expect(page.locator('#loginForm')).toBeVisible();
  await expect(page.locator('#username')).toHaveAttribute('autocomplete', 'username');
  await expect(page.locator('#password')).toHaveAttribute('autocomplete', 'current-password');
});

test('admin auth flow can be exercised when test credentials are supplied', async ({ page }) => {
  test.skip(!process.env.AZAAD_TEST_USERNAME || !process.env.AZAAD_TEST_PASSWORD,
    'Authenticated E2E is intentionally skipped unless dedicated test credentials are supplied as CI secrets.');

  await page.goto(`${baseURL}/admin.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#username').fill(process.env.AZAAD_TEST_USERNAME);
  await page.locator('#password').fill(process.env.AZAAD_TEST_PASSWORD);
  await page.locator('#loginForm').getByRole('button', { name: /تسجيل الدخول/ }).click();

  await expect(page.locator('#loginPage')).toBeHidden({ timeout: 15000 });
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: 15000 });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#loginPage')).toBeHidden({ timeout: 15000 });
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: 15000 });
});

test('Scheduling V2 shell loads after authenticated admin session', async ({ page }) => {
  test.skip(!process.env.AZAAD_TEST_USERNAME || !process.env.AZAAD_TEST_PASSWORD,
    'Scheduling V2 authenticated UI test requires dedicated CI test credentials.');

  await page.goto(`${baseURL}/admin.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#username').fill(process.env.AZAAD_TEST_USERNAME);
  await page.locator('#password').fill(process.env.AZAAD_TEST_PASSWORD);
  await page.locator('#loginForm').getByRole('button', { name: /تسجيل الدخول/ }).click();
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: 15000 });

  const tab = page.getByRole('button', { name: '📅 Schedule V2' });
  await expect(tab).toBeVisible({ timeout: 10000 });
  await tab.click();

  await expect(page.locator('#azaadSchedulingV2')).toBeVisible();
  await expect(page.locator('#sv2View')).toHaveValue('day');
  await expect(page.locator('#sv2Date')).toHaveAttribute('type', 'date');
  await expect(page.locator('#sv2Doctor')).toBeVisible();
  await expect(page.locator('#sv2Waiting')).toBeVisible();
});
