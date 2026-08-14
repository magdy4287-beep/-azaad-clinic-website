import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';

test('public website primary actions are wired', async ({ page }) => {
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#booking')).toBeAttached();
  await expect(page.locator('#waHero')).toHaveAttribute('href', /wa\.me\//);
  await expect(page.locator('#mapsLink')).toHaveAttribute('href', /maps\.app\.goo\.gl/);
  await expect(page.locator('#shareLocation')).toHaveAttribute('type', 'button');
  await page.locator('a[href="#booking"]').first().click();
  await expect(page.locator('#booking')).toBeInViewport();
});

test('public English mode has English UI chrome', async ({ page }) => {
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('nav a').first()).toHaveText('Home');
  await expect(page.locator('#booking h2')).toHaveText('Book an Appointment');
  await expect(page.locator('.booking-submit')).toHaveText('Submit Booking Request');
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toContain('الرئيسية');
  expect(bodyText).not.toContain('احجز موعدك');
  expect(bodyText).not.toContain('تواصل معنا');
  expect(bodyText).not.toContain('تأكيد طلب الحجز');
});

test('public English mode survives reload', async ({ page }) => {
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'English' }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('nav a').first()).toHaveText('Home');
});
