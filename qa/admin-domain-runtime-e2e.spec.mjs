import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';
const navigation = { waitUntil: 'commit' };
const AUTH_READY_TIMEOUT = 15000;

async function login(page) {
  test.skip(!process.env.AZAAD_TEST_USERNAME || !process.env.AZAAD_TEST_PASSWORD,
    'Authenticated domain E2E requires dedicated CI credentials.');

  const authResponses = [];
  page.on('response', response => {
    if (response.url().includes('/functions/v1/staff-login') && response.request().method() === 'POST') {
      authResponses.push({ status: response.status(), url: response.url() });
    }
  });

  await page.goto(`${baseURL}/admin.html`, navigation);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload(navigation);
  await expect(page.locator('#loginForm')).toBeVisible({ timeout: 5000 });
  await page.waitForFunction(() => Boolean(window.AZAAD_LOGIN_CONTROLLER_READY), { timeout: 10000 });
  await page.locator('#username').fill(process.env.AZAAD_TEST_USERNAME);
  await page.locator('#password').fill(process.env.AZAAD_TEST_PASSWORD);
  const buttonInfo = await page.locator('#loginForm button[type="submit"]').evaluate(button => ({
    type: button.getAttribute('type'),
    disabled: button.disabled,
    form: button.form?.id || null,
    onsubmit: button.form?.getAttribute('onsubmit') || null
  }));
  await page.locator('#loginForm button[type="submit"]').click();

  await page.waitForTimeout(1000);
  if (authResponses.length === 0) {
    const synthetic = await page.evaluate(() => {
      const form = document.getElementById('loginForm');
      if (!form) return { exists: false };
      const event = new Event('submit', { bubbles: true, cancelable: true });
      const dispatched = form.dispatchEvent(event);
      return { exists: true, dispatched, defaultPrevented: event.defaultPrevented };
    });
    await page.waitForTimeout(1500);
    throw new Error(`Native login submit produced no staff-login request. button=${JSON.stringify(buttonInfo)} synthetic=${JSON.stringify(synthetic)} controllerReady=${await page.evaluate(() => Boolean(window.AZAAD_LOGIN_CONTROLLER_READY))} supabaseReady=${await page.evaluate(() => Boolean(window.AZAAD_SUPABASE_READY))}`);
  }

  await expect.poll(async () => page.evaluate(() => ({
    loginHidden: document.getElementById('loginPage')?.classList.contains('hidden') === true,
    adminVisible: document.getElementById('adminPage')?.classList.contains('hidden') !== true,
    controllerReady: Boolean(window.AZAAD_LOGIN_CONTROLLER_READY),
    ready: Boolean(window.AZAAD_READY),
    role: document.body?.dataset?.role || null,
    initialized: Boolean(window.AZAAD?.state?.initialized),
    initializing: Boolean(window.AZAAD?.state?.initializing),
    staffRole: window.AZAAD?.state?.staff?.role || null,
    session: Boolean(window.AZAAD?.state?.session?.access_token),
    loginError: document.getElementById('loginError')?.textContent?.trim() || null
  })), {
    timeout: AUTH_READY_TIMEOUT,
    intervals: [250, 500, 1000],
    message: `Admin shell did not activate. staffLoginResponses=${JSON.stringify(authResponses)}`
  }).toMatchObject({ loginHidden: true, adminVisible: true });

  await expect(page.locator('#loginPage')).toBeHidden({ timeout: AUTH_READY_TIMEOUT });
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: AUTH_READY_TIMEOUT });
}

test('authenticated admin domain runtime certification covers every accessible panel', async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  const failedBackendResponses = [];
  const loadedScripts = [];

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', response => {
    const url = response.url();
    if (url.includes('/functions/v1/')) {
      if (response.status() >= 500 || response.status() === 401 || response.status() === 403) {
        failedBackendResponses.push({ status: response.status(), method: response.request().method(), url });
      }
    }
  });
  page.on('requestfinished', request => {
    const url = request.url();
    if (url.includes('.js')) loadedScripts.push(url);
  });

  await login(page);

  await expect(page.locator('.tab[data-panel]:visible').first(),
    'authenticated admin must expose a visible navigation panel').toBeVisible({ timeout: AUTH_READY_TIMEOUT });
  await page.waitForTimeout(1000);

  const panels = await page.locator('.tab[data-panel]:visible').evaluateAll(buttons =>
    buttons.map(button => ({
      id: button.getAttribute('data-panel'),
      label: (button.textContent || '').trim()
    })).filter(item => item.id)
  );

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
      hasLoadingOnly: node.querySelectorAll('.empty').length > 0 &&
        !node.querySelector('table, input, select, textarea, button[data-enterprise-refresh], .item, .stat, .error'),
      hasInteractiveContent: Boolean(node.querySelector('input, select, textarea, button, table, .item, .stat, .error, a[href]'))
    }));

    expect(state.hasLoadingOnly, `${panel.id} must not remain a loading-only shell`).toBeFalsy();
    expect(state.hasInteractiveContent || state.htmlBytes > 80,
      `${panel.id} must render a real control surface or substantive content`).toBeTruthy();
  }

  expect(pageErrors, `Unexpected page errors: ${JSON.stringify(pageErrors)}`).toEqual([]);
  expect(consoleErrors, `Unexpected console errors: ${JSON.stringify(consoleErrors)}`).toEqual([]);
  expect(failedBackendResponses, `Critical backend responses failed: ${JSON.stringify(failedBackendResponses)}`).toEqual([]);

  const uniqueScripts = [...new Set(loadedScripts)];
  expect(uniqueScripts.length).toBeGreaterThan(0);
});