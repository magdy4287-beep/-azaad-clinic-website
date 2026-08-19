import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';

// Do not wait on application-level DOMContentLoaded handlers: several public/admin
// modules intentionally perform optional remote work. We assert readiness directly.
const navigation = { waitUntil: 'commit' };

async function resetBrowserSession(page) {
  await page.goto(`${baseURL}/admin.html`, navigation);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload(navigation);
  await expect(page.locator('#loginPage')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#loginForm')).toBeVisible({ timeout: 5000 });
}

test('admin login shell loads with the canonical credential fields', async ({ page }) => {
  await resetBrowserSession(page);
  await expect(page.locator('#username')).toHaveAttribute('type', 'text');
  await expect(page.locator('#password')).toHaveAttribute('type', 'password');

  // Validate the source contract separately from runtime DOM mutations.
  const htmlResponse = await page.request.get(`${baseURL}/admin.html`);
  expect(htmlResponse.ok()).toBeTruthy();
  const html = await htmlResponse.text();
  expect(html).toContain('autocomplete="username"');
  expect(html).toContain('autocomplete="current-password"');
});

test('Patient 360 appointment action bridge resource is available', async ({ page }) => {
  await resetBrowserSession(page);

  const scriptResponse = await page.request.get(`${baseURL}/patient-appointment-actions.js?v=13.0.0`);
  expect(scriptResponse.ok()).toBeTruthy();
  const scriptText = await scriptResponse.text();
  expect(scriptText).toContain('/functions/v1/azaad-frontdesk-checkin');
  expect(scriptText).toContain('function checkIn');
  expect(scriptText).toContain('p360-actions');
});

test('admin authenticated flow is exercised only with dedicated CI credentials', async ({ page }) => {
  test.skip(!process.env.AZAAD_TEST_USERNAME || !process.env.AZAAD_TEST_PASSWORD,
    'Authenticated E2E requires dedicated CI test credentials.');

  await resetBrowserSession(page);
  const username = page.locator('#username');
  const password = page.locator('#password');
  await expect(username).toBeVisible({ timeout: 5000 });
  await expect(password).toBeVisible({ timeout: 5000 });

  await username.fill(process.env.AZAAD_TEST_USERNAME);
  await password.fill(process.env.AZAAD_TEST_PASSWORD);
  await page.locator('#loginForm').getByRole('button', { name: /تسجيل الدخول/ }).click();

  await expect(page.locator('#loginPage')).toBeHidden({ timeout: 15000 });
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: 15000 });

  await page.reload(navigation);
  await expect(page.locator('#loginPage')).toBeHidden({ timeout: 15000 });
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: 15000 });
});
