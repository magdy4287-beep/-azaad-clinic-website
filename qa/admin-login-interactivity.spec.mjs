import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';
const navigation = { waitUntil: 'commit' };

test('admin login prevents native navigation while admin.js is loading', async ({ page }) => {
  await page.route('**/admin.js*', async route => {
    await new Promise(resolve => setTimeout(resolve, 1800));
    await route.continue();
  });

  await page.goto(`${baseURL}/admin.html`, navigation);
  const form = page.locator('#loginForm');
  const username = page.locator('#username');
  const password = page.locator('#password');

  await expect(form).toBeVisible({ timeout: 5000 });
  await expect(username).toBeVisible({ timeout: 5000 });
  await expect(password).toBeVisible({ timeout: 5000 });

  await username.fill('azaadadmin');
  await password.fill('temporary-e2e-value');
  await expect(password).toHaveValue('temporary-e2e-value');

  await form.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/admin\.html(?:\?.*)?$/);
  await expect(username).toHaveValue('azaadadmin');
  await expect(password).toHaveValue('temporary-e2e-value');

  await expect.poll(
    () => page.evaluate(() => Boolean(window.AZAAD_LOGIN_CONTROLLER_READY)),
    { timeout: 10000, intervals: [100, 250, 500] }
  ).toBeTruthy();
});

test('admin login has one canonical form and no retired auth bootstrap/guard assets', async ({ page }) => {
  await page.goto(`${baseURL}/admin.html`, navigation);
  await expect(page.locator('#loginForm')).toHaveCount(1);

  const htmlResponse = await page.request.get(`${baseURL}/admin.html`);
  expect(htmlResponse.ok()).toBeTruthy();
  const html = await htmlResponse.text();

  expect(html).toContain('onsubmit="event.preventDefault();"');
  expect(html).toContain('/admin.js?v=2026-08-24-login-fix');
  expect(html).not.toContain('admin-login-bootstrap.js');
  expect(html).not.toContain('admin-auth-ui-guard.js');
});
