import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';
const navigation = { waitUntil: 'commit' };
const AUTH_READY_TIMEOUT = 15000;
const STAFF_LOGIN_URL = 'https://derofsthjivlkcdnojww.supabase.co/functions/v1/staff-login';

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
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await resetBrowserSession(page);
  const username = page.locator('#username');
  const password = page.locator('#password');
  await expect(username).toBeVisible({ timeout: 5000 });
  await expect(password).toBeVisible({ timeout: 5000 });

  await page.waitForFunction(
    () => Boolean(window.AZAAD_LOGIN_CONTROLLER_READY && window.AZAAD?.supabase?.auth?.setSession),
    { timeout: 10000 }
  );

  await username.fill(process.env.AZAAD_TEST_USERNAME);
  await password.fill(process.env.AZAAD_TEST_PASSWORD);

  const authResponsePromise = page.waitForResponse(
    response => response.url().includes('/functions/v1/staff-login') && response.request().method() === 'POST',
    { timeout: 15000 }
  );

  await page.locator('#loginForm').evaluate(form => form.requestSubmit());

  const authResponse = await authResponsePromise;
  const authStatus = authResponse.status();
  const authText = await authResponse.text().catch(() => '');
  let authBody = {};
  try { authBody = authText ? JSON.parse(authText) : {}; } catch (_) {}

  // Independent network probe: this does not establish the browser session;
  // it only distinguishes a browser-response transport problem from an
  // endpoint-response problem. Credentials remain in CI secrets and no token
  // is ever printed.
  const directProbe = await page.request.post(STAFF_LOGIN_URL, {
    data: { username: process.env.AZAAD_TEST_USERNAME, password: process.env.AZAAD_TEST_PASSWORD }
  });
  const directText = await directProbe.text().catch(() => '');
  let directBody = {};
  try { directBody = directText ? JSON.parse(directText) : {}; } catch (_) {}
  const diagnostic = {
    browserStatus: authStatus,
    browserBodyBytes: authText.length,
    browserContentType: authResponse.headers()['content-type'] || '',
    browserKeys: Object.keys(authBody),
    directStatus: directProbe.status(),
    directBodyBytes: directText.length,
    directContentType: directProbe.headers()['content-type'] || '',
    directKeys: Object.keys(directBody),
    directHasSession: Boolean(directBody?.session?.access_token),
    pageErrors,
    consoleErrors
  };

  expect(authStatus, `staff-login browser POST failed: ${JSON.stringify(diagnostic)}`).toBe(200);
  expect(
    authBody,
    `staff-login browser POST returned no usable JSON; endpoint comparison=${JSON.stringify(diagnostic)}`
  ).toEqual(expect.objectContaining({
    session: expect.objectContaining({ access_token: expect.any(String) }),
    staff: expect.objectContaining({ id: expect.anything() })
  }));

  const immediateState = await page.evaluate(() => ({
    url: location.href,
    loginHidden: document.getElementById('loginPage')?.classList.contains('hidden') === true,
    adminVisible: document.getElementById('adminPage')?.classList.contains('hidden') !== true,
    hasAzaadGlobal: Boolean(window.AZAAD),
    loginControllerReady: Boolean(window.AZAAD_LOGIN_CONTROLLER_READY),
    hasAdminToken: Boolean(sessionStorage.getItem('azaad_admin_token')),
    hasSupabaseAuthStorage: Object.keys(localStorage).some(key => key.includes('-auth-token')),
    loginErrorVisible: !document.getElementById('loginError')?.classList.contains('hidden'),
    loginErrorText: document.getElementById('loginError')?.textContent || ''
  }));

  await expect.poll(
    async () => page.evaluate(() => ({
      loginHidden: document.getElementById('loginPage')?.classList.contains('hidden') === true,
      adminVisible: document.getElementById('adminPage')?.classList.contains('hidden') !== true,
      hasAdminToken: Boolean(sessionStorage.getItem('azaad_admin_token')),
      loginErrorVisible: !document.getElementById('loginError')?.classList.contains('hidden'),
      loginErrorText: document.getElementById('loginError')?.textContent || ''
    })),
    {
      timeout: AUTH_READY_TIMEOUT,
      intervals: [250, 500, 1000],
      message: `authenticated shell did not transition. immediate=${JSON.stringify(immediateState)} diagnostics=${JSON.stringify(diagnostic)}`
    }
  ).toMatchObject({ loginHidden: true, adminVisible: true, hasAdminToken: true });

  await expect(page.locator('#loginPage')).toBeHidden({ timeout: 5000 });
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: 5000 });

  await page.reload(navigation);
  await expect(page.locator('#loginPage')).toBeHidden({ timeout: AUTH_READY_TIMEOUT });
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: AUTH_READY_TIMEOUT });
});
