import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';
const navigation = { waitUntil: 'commit' };
const AUTH_READY_TIMEOUT = 15000;

async function readAuthState(page) {
  return page.evaluate(() => ({
    loginHidden: document.getElementById('loginPage')?.classList.contains('hidden') === true,
    adminVisible: document.getElementById('adminPage')?.classList.contains('hidden') !== true,
    controllerReady: Boolean(window.AZAAD_LOGIN_CONTROLLER_READY),
    ready: Boolean(window.AZAAD_READY),
    role: document.body?.dataset?.role || null,
    initialized: Boolean(window.AZAAD?.state?.initialized),
    initializing: Boolean(window.AZAAD?.state?.initializing),
    staffRole: window.AZAAD?.state?.staff?.role || null,
    session: Boolean(window.AZAAD?.state?.session?.access_token),
    provider: window.AZAAD?.state?.provider || null,
    loginError: document.getElementById('loginError')?.textContent?.trim() || null
  }));
}

async function login(page) {
  test.skip(!process.env.AZAAD_TEST_USERNAME || !process.env.AZAAD_TEST_PASSWORD,
    'Authenticated domain E2E requires dedicated CI credentials.');

  const authResponses = [];
  const runtimeErrors = [];
  page.on('response', response => {
    if (response.url().includes('/api/admin-auth') && response.request().method() === 'POST') {
      authResponses.push({ status: response.status(), url: response.url() });
    }
  });
  page.on('pageerror', error => runtimeErrors.push(`pageerror:${error.message}`));
  page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(`console:${message.text()}`); });

  await page.goto(`${baseURL}/admin.html`, navigation);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload(navigation);
  await expect(page.locator('#loginForm')).toBeVisible({ timeout: 5000 });
  await page.waitForFunction(() => Boolean(window.AZAAD_LOGIN_CONTROLLER_READY), { timeout: 10000 });
  await page.locator('#username').fill(process.env.AZAAD_TEST_USERNAME);
  await page.locator('#password').fill(process.env.AZAAD_TEST_PASSWORD);
  await page.locator('#loginForm button[type="submit"]').click();

  await expect.poll(() => authResponses.length, { timeout: AUTH_READY_TIMEOUT }).toBeGreaterThan(0);
  expect(authResponses.at(-1).status).toBe(200);
  const state = await readAuthState(page);
  if (!(state.loginHidden && state.adminVisible)) {
    throw new Error(`Admin shell did not activate. adminAuthResponses=${JSON.stringify(authResponses)} state=${JSON.stringify(state)} runtimeErrors=${JSON.stringify(runtimeErrors)}`);
  }

  await expect(page.locator('#loginPage')).toBeHidden({ timeout: AUTH_READY_TIMEOUT });
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: AUTH_READY_TIMEOUT });
}

test('authenticated admin domain runtime certification covers every accessible panel', async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  const failedBackendResponses = [];
  const loadedScripts = [];

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => {
    const url = response.url();
    if (url.includes('/api/') && (response.status() >= 500 || response.status() === 401 || response.status() === 403)) {
      failedBackendResponses.push({ status: response.status(), method: response.request().method(), url });
    }
  });
  page.on('requestfinished', request => { if (request.url().includes('.js')) loadedScripts.push(request.url()); });

  await login(page);

  await expect(page.locator('.tab[data-panel]:visible').first(), 'authenticated admin must expose a visible navigation panel').toBeVisible({ timeout: AUTH_READY_TIMEOUT });
  await page.waitForTimeout(1000);

  const panels = await page.locator('.tab[data-panel]:visible').evaluateAll(buttons => buttons.map(button => ({ id: button.getAttribute('data-panel'), label: (button.textContent || '').trim() })).filter(item => item.id));
  expect(panels.length, 'authenticated admin must expose at least one accessible panel').toBeGreaterThan(0);

  for (const panel of panels) {
    const button = page.locator(`.tab[data-panel="${panel.id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`).first();
    await expect(button, `${panel.id} navigation button must remain visible`).toBeVisible({ timeout: 5000 });
    await button.click();
    const section = page.locator(`#${panel.id}`).first();
    await expect(section, `${panel.id} panel must exist`).toHaveCount(1);
    await expect(section, `${panel.id} panel must activate`).toHaveClass(/active/, { timeout: 5000 });
    await page.waitForTimeout(1200);
    const state = await section.evaluate(node => ({
      text: (node.textContent || '').replace(/\s+/g, ' ').trim(),
      htmlBytes: node.innerHTML.length,
      hasLoadingOnly: node.querySelectorAll('.empty').length > 0 && !node.querySelector('table, input, select, textarea, button, .item, .stat, .error, a[href]'),
      hasInteractiveContent: Boolean(node.querySelector('input, select, textarea, button, table, .item, .stat, .error, a[href]'))
    }));
    expect(state.hasLoadingOnly, `${panel.id} must not remain a loading-only shell`).toBeFalsy();
    expect(state.hasInteractiveContent || state.htmlBytes > 80, `${panel.id} must render a real control surface or substantive content`).toBeTruthy();
  }

  expect(pageErrors, `Unexpected page errors: ${JSON.stringify(pageErrors)}`).toEqual([]);
  expect(consoleErrors, `Unexpected console errors: ${JSON.stringify(consoleErrors)}`).toEqual([]);
  expect(failedBackendResponses, `Critical backend responses failed: ${JSON.stringify(failedBackendResponses)}`).toEqual([]);
  expect([...new Set(loadedScripts)].length).toBeGreaterThan(0);
});
