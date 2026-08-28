import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';
const REQUIRED_DOMAINS = [
  'doctors',
  'services',
  'calendar',
  'patient-360',
  'rcm',
  'finance',
  'purchasing',
  'marketing',
  'analytics',
  'smart-insights',
  'security'
];

async function authenticate(page) {
  test.skip(!process.env.AZAAD_TEST_USERNAME || !process.env.AZAAD_TEST_PASSWORD,
    'Authenticated domain certification requires dedicated CI credentials.');

  await page.goto(`${baseURL}/admin.html`, { waitUntil: 'commit' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil: 'commit' });
  await expect(page.locator('#loginForm')).toBeVisible({ timeout: 5000 });
  await page.waitForFunction(() => Boolean(window.AZAAD_LOGIN_CONTROLLER_READY), { timeout: 10000 });
  await page.locator('#username').fill(process.env.AZAAD_TEST_USERNAME);
  await page.locator('#password').fill(process.env.AZAAD_TEST_PASSWORD);
  await page.locator('#loginForm button[type="submit"]').click();
  await expect(page.locator('#loginPage')).toBeHidden({ timeout: 15000 });
  await expect(page.locator('#adminPage')).toBeVisible({ timeout: 15000 });
}

test('production exposes every required enterprise domain through the canonical navigation contract', async ({ page }) => {
  const errors = [];
  const backendFailures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => {
    if (response.url().includes('/functions/v1/') && [401, 403, 500, 502, 503].includes(response.status())) {
      backendFailures.push({ method: response.request().method(), status: response.status(), url: response.url() });
    }
  });

  await authenticate(page);
  await page.waitForTimeout(1000);

  const visiblePanels = await page.locator('.tab[data-panel]:visible').evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('data-panel')).filter(Boolean)
  );
  const registeredPanels = await page.evaluate(() => {
    const registry = window.AZAAD?.adminPanelRegistry || window.AZAAD?.state?.adminPanelRegistry;
    return registry ? Object.keys(registry) : [];
  });

  for (const domain of REQUIRED_DOMAINS) {
    const hasNavigation = visiblePanels.includes(domain) || registeredPanels.includes(domain);
    expect(hasNavigation, `Required domain ${domain} must be exposed by navigation or canonical registry`).toBeTruthy();

    const button = page.locator(`.tab[data-panel="${domain}"]`).first();
    if (await button.count()) {
      await button.click();
      const section = page.locator(`#${domain}`).first();
      await expect(section, `${domain} panel must exist when navigated`).toHaveCount(1);
      await expect(section, `${domain} panel must activate`).toHaveClass(/active/, { timeout: 5000 });
      await page.waitForTimeout(500);
      const content = await section.evaluate(node => ({ bytes: node.innerHTML.length, text: (node.textContent || '').trim() }));
      expect(content.bytes, `${domain} panel must render substantive content`).toBeGreaterThan(80);
    }
  }

  expect(errors, `Unexpected browser errors: ${JSON.stringify(errors)}`).toEqual([]);
  expect(backendFailures, `Critical backend responses failed: ${JSON.stringify(backendFailures)}`).toEqual([]);
});
