import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';
const viewports = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1920, height: 1080 }
];

for (const viewport of viewports) {
  test(`public shell has no horizontal overflow at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${baseURL}/`, { waitUntil: 'commit' });
    await expect(page.locator('body')).toBeVisible();
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport + 1);
  });
}

test('admin shell exposes centralized language controls when rendered', async ({ page }) => {
  await page.goto(`${baseURL}/admin.html`, { waitUntil: 'commit' });
  const source = await page.request.get(`${baseURL}/azaad-role-experience.js?v=1.0.0`);
  expect(source.ok()).toBeTruthy();
  const text = await source.text();
  expect(text).toContain('azaadLanguageSwitcher');
  expect(text).toContain('AZAAD_I18N');
  expect(text).toContain('SECRETARY');
  expect(text).toContain('MARKETING');
});
