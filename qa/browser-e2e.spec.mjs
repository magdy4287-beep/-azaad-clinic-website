import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';
const navigation = { waitUntil: 'commit' };
const AUTH_READY_TIMEOUT = 15000;

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
  expect(html).toContain('/admin-login-bootstrap.js?v=1');
});

test('admin password remains interactive while the module controller is loading', async ({ page }) => {
  await page.route('**/admin.js*', async route => {
    await new Promise(resolve => setTimeout(resolve, 1800));
    await route.continue();
  });

  await page.goto(`${baseURL}/admin.html`, navigation);
  await expect(page.locator('#loginForm')).toBeVisible({ timeout: 5000 });

  const password = page.locator('#password');
  await password.fill('temporary-e2e-value');
  await expect(password).toHaveValue('temporary-e2e-value');

  const submit = page.locator('#loginForm button[type="submit"]');
  await submit.click();

  // The bootstrap must prevent native form navigation while admin.js is still
  // loading. A reload would erase the password and recreate the username field.
  await expect(page).toHaveURL(/\/admin\.html(?:\?.*)?$/);
  await expect(password).toHaveValue('temporary-e2e-value');
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
  const unauthorizedRequests = [];
  const authResponses = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() === 401) {
      unauthorizedRequests.push({
        method: response.request().method(),
        url: response.url()
      });
    }
    if (response.url().includes('/functions/v1/staff-login') && response.request().method() === 'POST') {
      const record = {
        response,
        status: response.status(),
        headers: response.headers(),
        bodyText: null
      };
      authResponses.push(record);
      void response.text().then(text => { record.bodyText = text; }).catch(() => {});
    }
  });

  await resetBrowserSession(page);
  const username = page.locator('#username');
  const password = page.locator('#password');
  await expect(username).toBeVisible({ timeout: 5000 });
  await expect(password).toBeVisible({ timeout: 5000 });

  await page.waitForFunction(
    () => Boolean(window.AZAAD_LOGIN_CONTROLLER_READY),
    { timeout: 10000 }
  );

  await username.fill(process.env.AZAAD_TEST_USERNAME);
  await password.fill(process.env.AZAAD_TEST_PASSWORD);
  await page.locator('#loginForm').evaluate(form => form.requestSubmit());

  await expect.poll(
    () => authResponses.length,
    {
      timeout: AUTH_READY_TIMEOUT,
      intervals: [100, 250, 500],
      message: `real staff-login POST was not observed. controllerReady=${await page.evaluate(() => Boolean(window.AZAAD_LOGIN_CONTROLLER_READY))}; supabaseReady=${await page.evaluate(() => Boolean(window.AZAAD_SUPABASE_READY))}; unauthorizedRequests=${JSON.stringify(unauthorizedRequests)} pageErrors=${JSON.stringify(pageErrors)} consoleErrors=${JSON.stringify(consoleErrors)}`
    }
  ).toBeGreaterThan(0);

  const authRecord = authResponses[authResponses.length - 1];
  const authStatus = authRecord.status;
  let authBody = {};
  const authText = authRecord.bodyText || '';
  try { authBody = authText ? JSON.parse(authText) : {}; } catch (_) {}

  expect(
    authStatus,
    `staff-login POST must succeed with the real CI credential flow; response=${JSON.stringify(authBody)}`
  ).toBe(200);
  expect(
    authBody,
    `staff-login POST returned no usable session; bodyBytes=${authText.length}; contentType=${authRecord.headers['content-type'] || ''}; pageErrors=${JSON.stringify(pageErrors)}; consoleErrors=${JSON.stringify(consoleErrors)}`
  ).toEqual(expect.objectContaining({
    session: expect.objectContaining({ access_token: expect.any(String) }),
    staff: expect.objectContaining({ id: expect.anything() })
  }));

  await expect.poll(
    async () => page.evaluate(() => ({
      loginHidden: document.getElementById('loginPage')?.classList.contains('hidden') === true,
      adminVisible: document.getElementById('adminPage')?.classList.contains('hidden') !== true,
      hasAdminToken: Boolean(sessionStorage.getItem('azaad_admin_token')),
      hasSupabaseAuthStorage: Object.keys(localStorage).some(key => key.includes('auth')),
      loginControllerReady: Boolean(window.AZAAD_LOGIN_CONTROLLER_READY),
      authReady: Boolean(window.AZAAD_READY)
    })),
    {
      timeout: AUTH_READY_TIMEOUT,
      intervals: [250, 500, 1000],
      message: `authenticated shell did not transition after the real login/reload. unauthorizedRequests=${JSON.stringify(unauthorizedRequests)} pageErrors=${JSON.stringify(pageErrors)} consoleErrors=${JSON.stringify(consoleErrors)}`
    }
  ).toMatchObject({ loginHidden: true, adminVisible: true, hasAdminToken: true });

  await expect(page.locator('#loginPage')).toBeHidden({ timeout: AUTH_READY_TIMEOUT });
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: AUTH_READY_TIMEOUT });

  await page.reload(navigation);
  await expect(page.locator('#loginPage')).toBeHidden({ timeout: AUTH_READY_TIMEOUT });
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: AUTH_READY_TIMEOUT });
});
