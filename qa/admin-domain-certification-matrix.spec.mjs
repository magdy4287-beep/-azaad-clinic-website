import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';
const REQUIRED_DOMAINS = [
  { name: 'doctors', panel: 'doctors' }, { name: 'services', panel: 'services' }, { name: 'calendar', panel: 'calendar' },
  { name: 'patient-360', panel: 'patient360EnterprisePanel' }, { name: 'rcm', panel: 'rcmEnterprisePanel' }, { name: 'finance', panel: 'financeEnterprisePanel' },
  { name: 'purchasing', panel: 'purchasingEnterprisePanel' }, { name: 'marketing', panel: 'marketingEnterprisePanel' }, { name: 'analytics', panel: 'analyticsEnterprisePanel' },
  { name: 'smart-insights', panel: 'insightsEnterprisePanel' }, { name: 'security', panel: 'securityEnterprisePanel' }
];

async function readAuthState(page) {
  return page.evaluate(() => ({
    loginHidden: document.getElementById('loginPage')?.classList.contains('hidden') === true,
    adminVisible: document.getElementById('adminPage')?.classList.contains('hidden') !== true,
    session: Boolean(window.AZAAD?.state?.session?.access_token),
    provider: window.AZAAD?.state?.provider || null,
    staffRole: window.AZAAD?.state?.staff?.role || window.AZAAD?.state?.role || window.AZAAD?.state?.currentRole || null,
    loginError: document.getElementById('loginError')?.textContent?.trim() || null
  }));
}

async function authenticate(page) {
  test.skip(!process.env.AZAAD_TEST_USERNAME || !process.env.AZAAD_TEST_PASSWORD, 'Authenticated domain certification requires dedicated CI credentials.');
  const authResponses = []; const runtimeErrors = [];
  page.on('response', response => { if (response.url().includes('/api/admin-auth') && response.request().method() === 'POST') authResponses.push({ status: response.status(), url: response.url() }); });
  page.on('pageerror', error => runtimeErrors.push(`pageerror:${error.message}`));
  page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(`console:${message.text()}`); });
  await page.goto(`${baseURL}/admin.html`, { waitUntil: 'commit' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil: 'commit' });
  await expect(page.locator('#loginForm')).toBeVisible({ timeout: 5000 });
  await page.waitForFunction(() => Boolean(window.AZAAD_LOGIN_CONTROLLER_READY), { timeout: 10000 });
  await page.locator('#username').fill(process.env.AZAAD_TEST_USERNAME); await page.locator('#password').fill(process.env.AZAAD_TEST_PASSWORD);
  await page.locator('#loginForm button[type="submit"]').click();
  await expect.poll(() => authResponses.length, { timeout: 15000 }).toBeGreaterThan(0); expect(authResponses.at(-1).status).toBe(200);
  const state = await readAuthState(page);
  if (!(state.loginHidden && state.adminVisible)) throw new Error(`Admin shell did not activate. adminAuthResponses=${JSON.stringify(authResponses)} state=${JSON.stringify(state)} runtimeErrors=${JSON.stringify(runtimeErrors)}`);
  await expect(page.locator('#loginPage')).toBeHidden({ timeout: 5000 }); await expect(page.locator('#adminPage')).toBeVisible({ timeout: 5000 }); return state;
}

test('production exposes every required enterprise domain through the canonical navigation contract', async ({ page }) => {
  const errors = []; const backendFailures = [];
  page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.url().includes('/api/') && [401, 403, 500, 502, 503].includes(response.status())) backendFailures.push({ method: response.request().method(), status: response.status(), url: response.url() }); });
  const authState = await authenticate(page); const role = String(authState.staffRole || '').toUpperCase().trim();
  const privilegedRoles = new Set(['OWNER', 'ADMIN', 'MANAGER']);
  test.skip(!privilegedRoles.has(role), `Enterprise-domain matrix requires OWNER/ADMIN/MANAGER; current authenticated role is ${role || 'unknown'}. Role-scoped Admin E2E remains covered by admin-domain-runtime-e2e.`);
  await page.waitForTimeout(1000);
  const registeredPanels = await page.evaluate(() => { const registry = window.AZAAD_ADMIN_MODULE_REGISTRY; return registry && typeof registry === 'object' ? Object.keys(registry.groups || registry) : []; });
  const visiblePanels = await page.locator('.tabs .tab[data-panel]:visible').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-panel')).filter(Boolean));
  for (const domain of REQUIRED_DOMAINS) {
    const hasNavigation = visiblePanels.includes(domain.panel) || registeredPanels.includes(domain.panel); expect(hasNavigation, `Required domain ${domain.name} must be exposed through canonical panel ${domain.panel}`).toBeTruthy();
    const button = page.locator(`.tab[data-panel="${domain.panel}"]`).first();
    if (await button.count()) {
      await button.click(); const section = page.locator(`#${domain.panel}`).first(); await expect(section, `${domain.name} panel ${domain.panel} must exist when navigated`).toHaveCount(1); await expect(section, `${domain.name} panel ${domain.panel} must activate`).toHaveClass(/active/, { timeout: 5000 }); await page.waitForTimeout(500);
      const content = await section.evaluate(node => ({ bytes: node.innerHTML.length, text: (node.textContent || '').trim() })); expect(content.bytes, `${domain.name} panel must render substantive content`).toBeGreaterThan(80);
    }
  }
  expect(errors, `Unexpected browser errors: ${JSON.stringify(errors)}`).toEqual([]); expect(backendFailures, `Critical backend responses failed: ${JSON.stringify(backendFailures)}`).toEqual([]);
});
