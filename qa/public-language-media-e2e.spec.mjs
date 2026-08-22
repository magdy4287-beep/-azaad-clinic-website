import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app';
const navigation = { waitUntil: 'domcontentloaded' };

async function openPublic(page) {
  await page.goto(baseURL, navigation);
  await page.waitForLoadState('networkidle');
  await expect.poll(() => page.evaluate(() => Boolean(window.AZAAD_I18N))).toBeTruthy();
}

async function setLanguage(page, language) {
  const changed = await page.evaluate((lang) => {
    const controls = [...document.querySelectorAll('[data-lang],[data-azaad-lang]')];
    const control = controls.find(el => (el.dataset.lang || el.dataset.azaadLang) === lang);
    if (!control) return false;
    control.click();
    return true;
  }, language);
  expect(changed, `No ${language} language control was found`).toBeTruthy();
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(language);
  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(language === 'en' ? 'ltr' : 'rtl');
}

test('public language switch is complete and stable AR → EN → AR', async ({ page }) => {
  await openPublic(page);

  await setLanguage(page, 'ar');
  const arabicState = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    bodyText: document.body.innerText,
    hasEnglishControl: Boolean(document.querySelector('[data-lang="en"],[data-azaad-lang="en"]'))
  }));
  expect(arabicState.lang).toBe('ar');
  expect(arabicState.dir).toBe('rtl');
  expect(arabicState.bodyText.length).toBeGreaterThan(100);
  expect(arabicState.hasEnglishControl).toBeTruthy();

  await setLanguage(page, 'en');
  const englishState = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    bodyText: document.body.innerText,
    arabicRatio: (document.body.innerText.match(/[\u0600-\u06FF]/g) || []).length
  }));
  expect(englishState.lang).toBe('en');
  expect(englishState.dir).toBe('ltr');
  expect(englishState.bodyText.length).toBeGreaterThan(100);
  expect(englishState.arabicRatio).toBeLessThan(Math.max(20, englishState.bodyText.length * 0.02));

  await setLanguage(page, 'ar');
  await expect.poll(() => page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    arabicRatio: (document.body.innerText.match(/[\u0600-\u06FF]/g) || []).length
  }))).toMatchObject({ lang: 'ar', dir: 'rtl' });
});

test('public doctor and post media never use destructive cover cropping', async ({ page }) => {
  await openPublic(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  await expect.poll(async () => page.locator('img').count()).toBeGreaterThan(0);
  const media = await page.locator('img').evaluateAll(images => images.map(img => {
    const rect = img.getBoundingClientRect();
    const style = getComputedStyle(img);
    return {
      src: img.currentSrc || img.src,
      width: rect.width,
      height: rect.height,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      objectFit: style.objectFit,
      complete: img.complete
    };
  }).filter(item => item.naturalWidth > 0 && item.naturalHeight > 0));

  expect(media.length).toBeGreaterThan(0);
  for (const item of media) {
    expect(item.objectFit, `Destructive cover crop found for ${item.src}`).not.toBe('cover');
    expect(item.width).toBeGreaterThan(0);
    expect(item.height).toBeGreaterThan(0);
  }
});
