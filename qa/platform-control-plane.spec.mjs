import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';
const navigation = { waitUntil: 'commit' };

test('AZAAD operating control plane contract is deployed', async ({ page }) => {
  const response = await page.request.get(`${baseURL}/azaad-platform-control-plane.js`);
  expect(response.ok()).toBeTruthy();
  const source = await response.text();
  expect(source).toContain('AZAAD AI Copilot');
  expect(source).toContain('AI provides signals and suggestions only');
  expect(source).toContain('/api/admin-appointments?resource=operations');
  expect(source).toContain('/api/admin-appointments?resource=platform');
  expect(source).not.toContain('AI_APPROVES_REFUND');
});

test('admin shell remains reachable after control-plane injection', async ({ page }) => {
  await page.goto(`${baseURL}/admin.html`, navigation);
  await expect(page.locator('#loginPage')).toBeVisible();
  await expect(page.locator('#loginForm')).toBeVisible();
});

test('refund workflow policy is fail-closed for AI', async ({ page }) => {
  const response = await page.request.get(`${baseURL}/refund-workflow-ui.js`);
  expect(response.ok()).toBeTruthy();
  const source = await response.text();
  expect(source).toContain('Refund = human approvals');
  expect(source).not.toContain('AI_APPROVES_REFUND');
  expect(source).toContain('approve_refund_doctor');
  expect(source).toContain('approve_refund_management');
  expect(source).toContain('process_refund');
});
