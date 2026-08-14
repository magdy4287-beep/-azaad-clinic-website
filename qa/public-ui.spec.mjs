import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';

test('public website primary actions are wired and interactive', async ({ page }) => {
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#booking')).toBeAttached();
  await expect(page.locator('#waHero')).toHaveAttribute('href', /wa\.me\//);
  await expect(page.locator('#waLink')).toHaveAttribute('href', /wa\.me\//);
  await expect(page.locator('#mapsLink')).toHaveAttribute('href', /maps\.app\.goo\.gl/);
  await expect(page.locator('#shareLocation')).toHaveAttribute('type', 'button');

  await page.locator('a[href="#booking"]').first().click();
  await expect(page.locator('#booking')).toBeInViewport();

  for (const target of ['#home', '#about', '#services', '#doctors', '#booking', '#contact']) {
    await page.locator(`nav a[href="${target}"]`).click();
    await expect(page.locator(target)).toBeInViewport();
  }

  await page.evaluate(() => {
    window.__AZAAD_TEST_OPENED_URL = '';
    const originalOpen = window.open;
    window.open = (url) => {
      window.__AZAAD_TEST_OPENED_URL = String(url || '');
      return { closed: false };
    };
    window.__AZAAD_TEST_RESTORE_OPEN = () => { window.open = originalOpen; };
  });

  await page.locator('#shareLocation').click();
  await expect.poll(() => page.evaluate(() => window.__AZAAD_TEST_OPENED_URL)).toMatch(/https:\/\/wa\.me\//);
  await page.evaluate(() => window.__AZAAD_TEST_RESTORE_OPEN?.());
});

test('public English mode has English UI chrome with no Arabic navigation labels', async ({ page }) => {
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('nav a').first()).toHaveText('Home');
  await expect(page.locator('#booking h2')).toHaveText('Book an Appointment');
  await expect(page.locator('.booking-submit')).toHaveText('Submit Booking Request');
  await expect(page.locator('#shareLocation')).toHaveText('Share clinic location via WhatsApp');

  const bodyText = await page.locator('body').innerText();
  for (const arabicChrome of ['الرئيسية', 'احجز موعدك', 'تواصل معنا', 'تأكيد طلب الحجز', 'مشاركة موقع العيادة عبر WhatsApp']) {
    expect(bodyText).not.toContain(arabicChrome);
  }
});

test('public English mode survives reload', async ({ page }) => {
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'English' }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('nav a').first()).toHaveText('Home');
  await expect(page.locator('#booking h2')).toHaveText('Book an Appointment');
});
