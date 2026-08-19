import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';
const navigation = { waitUntil: 'commit' };
const AUTH_READY_TIMEOUT = 60000;

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

  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push({ message: error.message, stack: error.stack || '' }));

  await resetBrowserSession(page);
  const username = page.locator('#username');
  const password = page.locator('#password');
  await expect(username).toBeVisible({ timeout: 5000 });
  await expect(password).toBeVisible({ timeout: 5000 });

  // The production-parity login controller is injected at build time. Because
  // this test deliberately navigates with `commit`, wait for the real handler
  // to bind before clicking; otherwise the browser can race the script load and
  // perform a native form submit without exercising authentication at all.
  await page.waitForFunction(
    () => Boolean(window.AZAAD_LOGIN_CONTROLLER_READY && window.AZAAD?.supabase?.auth?.setSession),
    { timeout: 10000 }
  );

  await username.fill(process.env.AZAAD_TEST_USERNAME);
  await password.fill(process.env.AZAAD_TEST_PASSWORD);

  const authResponsePromise = page.waitForResponse(
    response => response.url().includes('/functions/v1/staff-login'),
    { timeout: 15000 }
  );
  await page.locator('#loginForm').getByRole('button', { name: /تسجيل الدخول/ }).click();

  const authResponse = await authResponsePromise;
  const authStatus = authResponse.status();
  const authBody = await authResponse.json().catch(() => ({}));
  expect(authStatus, `staff-login must be reached with the real CI credential flow; response=${JSON.stringify(authBody)}`).toBe(200);

  await password.fill('');

  // Fail with non-secret diagnostics if the real authentication request succeeds
  // but the authenticated shell does not transition.
  await expect.poll(
    async () => page.evaluate(() => ({
      loginHidden: document.getElementById('loginPage')?.classList.contains('hidden') === true,
      adminVisible: document.getElementById('adminPage')?.classList.contains('hidden') !== true,
      hasAzaadGlobal: Boolean(window.AZAAD),
      loginControllerReady: Boolean(window.AZAAD_LOGIN_CONTROLLER_READY),
      loginAttempt: window.AZAAD_LOGIN_LAST_ATTEMPT || '',
      hasAdminToken: Boolean(sessionStorage.getItem('azaad_admin_token')),
      hasSupabaseAuthStorage: Object.keys(localStorage).some(key => key.includes('-auth-token')),
      loginErrorVisible: !document.getElementById('loginError')?.classList.contains('hidden'),
      loginErrorText: document.getElementById('loginError')?.textContent || ''
    })),
    { timeout: AUTH_READY_TIMEOUT, intervals: [250, 500, 1000] }
  ).toMatchObject({ loginHidden: true, adminVisible: true });

  await expect(page.locator('#loginPage')).toBeHidden({ timeout: AUTH_READY_TIMEOUT });
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: AUTH_READY_TIMEOUT });

  await page.reload(navigation);
  await expect(page.locator('#loginPage')).toBeHidden({ timeout: AUTH_READY_TIMEOUT });
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: AUTH_READY_TIMEOUT });
});
