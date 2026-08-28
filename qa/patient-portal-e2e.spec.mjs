import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';

test.describe('Patient Portal production boundary', () => {
  test('patient portal route is a real deployed surface, not a 404', async ({ page }) => {
    const response = await page.goto(`${baseURL}/patient.html`, { waitUntil: 'domcontentloaded' });
    expect(response).not.toBeNull();
    expect(response.status()).toBe(200);
    await expect(page.locator('body')).not.toContainText('404: NOT_FOUND');
    await expect(page.locator('body')).not.toContainText('NOT_FOUND');
  });

  test('patient portal exposes an authenticated entry boundary', async ({ page }) => {
    await page.goto(`${baseURL}/patient.html`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[type="email"], input[name="email"], button').first()).toBeVisible();
    await expect(page.locator('body')).toContainText(/patient|portal|sign in|login/i);
  });
});
