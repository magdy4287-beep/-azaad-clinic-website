import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';
const navigation = { waitUntil: 'commit' };
const AUTH_READY_TIMEOUT = 15000;

async function login(page) {
  test.skip(!process.env.AZAAD_TEST_USERNAME || !process.env.AZAAD_TEST_PASSWORD,
    'Authenticated domain E2E requires dedicated CI credentials.');

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
  await page.locator('#loginForm').evaluate(form => form.requestSubmit());
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
    await expect(section, `${panel.id} panel must be visible after activation`).toBeVisible({ timeout: 5000 });

    await page.waitForTimeout(1200);

    const state = await section.evaluate(node => ({
      text: (node.textContent || '').replace(/\s+/g, ' ').trim(),
      htmlBytes: node.innerHTML.length,
      hasLoadingOnly: node.querySelectorAll('.empty').length > 0 &&
        !node.querySelector('table, input, select, textarea, button[data-enterprise-refresh], .item, .stat, .error')
    }));

    expect(state.htmlBytes, `${panel.id} must render content`).toBeGreaterThan(80);
    expect(state.hasLoadingOnly, `${panel.id} must not remain a loading-only shell`).toBeFalsy();
  }

  expect(pageErrors, `Unexpected page errors: ${JSON.stringify(pageErrors)}`).toEqual([]);
  expect(consoleErrors, `Unexpected console errors: ${JSON.stringify(consoleErrors)}`).toEqual([]);
  expect(failedBackendResponses, `Unexpected backend auth/server failures: ${JSON.stringify(failedBackendResponses)}`).toEqual([]);

  const runtimeState = await page.evaluate(() => ({
    ready: Boolean(window.AZAAD_READY),
    role: String(window.AZAAD?.state?.role || window.AZAAD?.state?.currentRole || document.body?.dataset?.role || '')
  }));
  expect(runtimeState.ready, 'canonical AZAAD runtime must be ready').toBeTruthy();
  expect(runtimeState.role, 'authenticated admin role must be known').not.toBe('');

  expect(loadedScripts.length, 'browser must load JavaScript runtime modules').toBeGreaterThan(0);
});
