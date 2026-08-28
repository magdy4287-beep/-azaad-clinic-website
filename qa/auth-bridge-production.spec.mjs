import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';
const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
const AUTH_READY_TIMEOUT = 15000;

async function resetBrowserSession(page) {
  await page.goto(`${baseURL}/admin.html`, { waitUntil: 'commit' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil: 'commit' });
  await expect(page.locator('#loginPage')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#loginForm')).toBeVisible({ timeout: 5000 });
}

async function authDiagnostic(page, authResponses, unauthorizedRequests, pageErrors, consoleErrors) {
  return page.evaluate(({ authCount, unauthorized, pageErrors: errors, consoleErrors: consoles }) => ({
    authCount,
    unauthorized,
    pageErrors: errors,
    consoleErrors: consoles,
    productionBuildSha: document.querySelector('meta[name="azaad-build-sha"]')?.getAttribute('content') || null,
    loginHidden: document.getElementById('loginPage')?.classList.contains('hidden') === true,
    adminHidden: document.getElementById('adminPage')?.classList.contains('hidden') === true,
    loginControllerReady: Boolean(window.AZAAD_LOGIN_CONTROLLER_READY),
    supabaseReady: Boolean(window.AZAAD_SUPABASE_READY),
    azaadReady: Boolean(window.AZAAD_READY),
    formBound: document.getElementById('loginForm')?.dataset?.azaadBound || null,
    loginError: document.getElementById('loginError')?.textContent || '',
    role: document.body.dataset.role || '',
    sessionStorageKeys: Object.keys(sessionStorage),
    localStorageAuthKeys: Object.keys(localStorage).filter(key => key.includes('auth')),
    state: window.AZAAD?.state ? {
      initialized: Boolean(window.AZAAD.state.initialized),
      initializing: Boolean(window.AZAAD.state.initializing),
      hasSession: Boolean(window.AZAAD.state.session),
      hasUser: Boolean(window.AZAAD.state.user),
      hasStaff: Boolean(window.AZAAD.state.staff),
      currentRole: window.AZAAD.state.currentRole || null,
      permissions: Array.from(window.AZAAD.state.permissions || [])
    } : null
  }), { authCount: authResponses.length, unauthorized: unauthorizedRequests, pageErrors, consoleErrors });
}

test('production artifact is the exact certified SHA', async ({ page }) => {
  const expected = process.env.AZAAD_EXPECTED_PRODUCTION_SHA || process.env.GITHUB_SHA;
  test.skip(!expected, 'Production SHA binding is required for certification.');
  await page.goto(`${baseURL}/admin.html`, { waitUntil: 'commit' });
  await expect.poll(() => page.locator('meta[name="azaad-build-sha"]').getAttribute('content'), {
    timeout: 10000,
    message: `Production artifact SHA did not match expected certification SHA ${expected}`
  }).toBe(expected);
});

test('staff-login API returns a usable session', async ({ page }) => {
  test.skip(!process.env.AZAAD_TEST_USERNAME || !process.env.AZAAD_TEST_PASSWORD, 'Authenticated E2E requires dedicated CI test credentials.');
  const response = await page.request.post(`${SUPABASE_URL}/functions/v1/staff-login`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    data: { username: process.env.AZAAD_TEST_USERNAME, password: process.env.AZAAD_TEST_PASSWORD }
  });
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch (_) {}
  expect(response.status(), `staff-login status bodyBytes=${text.length}`).toBe(200);
  expect(body, `staff-login unusable response bodyBytes=${text.length}`).toEqual(expect.objectContaining({
    session: expect.objectContaining({ access_token: expect.any(String), refresh_token: expect.any(String) }),
    staff: expect.objectContaining({ id: expect.anything() })
  }));
});

test('admin authenticated browser flow uses the real staff-login response', async ({ page }) => {
  test.skip(!process.env.AZAAD_TEST_USERNAME || !process.env.AZAAD_TEST_PASSWORD, 'Authenticated E2E requires dedicated CI test credentials.');
  const pageErrors = [];
  const consoleErrors = [];
  const unauthorizedRequests = [];
  const authResponses = [];
  const authBodies = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', async response => {
    if (response.status() === 401) unauthorizedRequests.push({ method: response.request().method(), url: response.url() });
    if (response.url().includes('/functions/v1/staff-login') && response.request().method() === 'POST') {
      let body = null;
      try { body = await response.json(); } catch (_) {}
      authResponses.push({ status: response.status(), headers: response.headers() });
      authBodies.push(body);
    }
  });

  await resetBrowserSession(page);
  await page.waitForFunction(() => Boolean(window.AZAAD_LOGIN_CONTROLLER_READY), { timeout: 10000 });
  await expect(page.locator('#loginForm')).toHaveAttribute('data-azaad-bound', 'true');
  await page.locator('#username').fill(process.env.AZAAD_TEST_USERNAME);
  await page.locator('#password').fill(process.env.AZAAD_TEST_PASSWORD);
  await page.locator('#loginForm button[type="submit"]').click();

  await expect.poll(() => authResponses.length, {
    timeout: AUTH_READY_TIMEOUT,
    intervals: [100, 250, 500],
    message: `real staff-login POST was not observed. controllerReady=${Boolean(await page.evaluate(() => window.AZAAD_LOGIN_CONTROLLER_READY))}; supabaseReady=${Boolean(await page.evaluate(() => window.AZAAD_SUPABASE_READY))}; unauthorizedRequests=${JSON.stringify(unauthorizedRequests)} pageErrors=${JSON.stringify(pageErrors)} consoleErrors=${JSON.stringify(consoleErrors)}`
  }).toBeGreaterThan(0);

  const authResponse = authResponses[authResponses.length - 1];
  expect(authResponse.status, `staff-login browser response headers=${JSON.stringify(authResponse.headers)}`).toBe(200);
  console.log(`AUTH_BROWSER_RESPONSE=${JSON.stringify(authBodies[authBodies.length - 1], (_, value) => typeof value === 'string' && value.length > 40 ? `${value.slice(0, 12)}…` : value)}`);
  console.log(`AUTH_SHELL_IMMEDIATE=${JSON.stringify(await authDiagnostic(page, authResponses, unauthorizedRequests, pageErrors, consoleErrors))}`);

  await expect.poll(async () => authDiagnostic(page, authResponses, unauthorizedRequests, pageErrors, consoleErrors), {
    timeout: AUTH_READY_TIMEOUT,
    intervals: [250, 500, 1000],
    message: async () => `authenticated shell did not transition after real login: ${JSON.stringify(await authDiagnostic(page, authResponses, unauthorizedRequests, pageErrors, consoleErrors)}`
  }).toMatchObject({
    loginHidden: true,
    adminHidden: false,
    formBound: 'true',
    role: expect.any(String),
    state: expect.objectContaining({ hasSession: true, hasStaff: true })
  });

  await expect(page.locator('#loginPage')).toBeHidden({ timeout: AUTH_READY_TIMEOUT });
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: AUTH_READY_TIMEOUT });
});