import { test, expect } from '@playwright/test';

const baseURL = process.env.AZAAD_BASE_URL || 'http://127.0.0.1:4173';
const clinicData = {
  doctors: [{ id: 'doctor-e2e', name: 'Dr. WhatsApp Test', title: 'Psychotherapist' }],
  services: [{ id: 'service-e2e', name: 'Consultation', duration_minutes: 45 }],
  settings: { whatsapp: '201140526294' }
};

async function createSuccessWithoutWhatsAppCTA(page, { language = 'ar', existingHiddenContainer = false } = {}) {
  let bookingPosts = 0;
  page.on('request', request => {
    if (request.url().includes('/api/public-booking') && request.method() === 'POST') bookingPosts += 1;
  });
  await page.addInitScript(value => localStorage.setItem('azaadClinicLanguage', value), language);
  await page.route('**/api/public-clinic-data**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(clinicData)
  }));
  await page.route('**/api/public-scheduling**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ slots: [] })
  }));
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#bookingForm')).toBeVisible();
  await expect(page.locator('#doctor option[value="doctor-e2e"]')).toHaveCount(1);
  await expect(page.locator('#service option[value="service-e2e"]')).toHaveCount(1);

  await page.locator('#doctor').selectOption('doctor-e2e');
  await page.locator('#service').selectOption('service-e2e');
  await page.locator('#date').fill('2026-11-02');
  await page.locator('#mode').selectOption('clinic');
  await page.locator('#name').fill('Mohamed WhatsApp Test');
  await page.locator('#phone').fill('+201001234567');
  await page.locator('#email').fill('whatsapp-test@example.com');
  await page.locator('#notes').fill('Recovery UI test only');

  await page.locator('#slots').evaluate(slots => {
    const selected = document.createElement('button');
    selected.type = 'button';
    selected.className = 'slot selected';
    selected.dataset.slot = '13:30';
    selected.textContent = '1:30 PM';
    slots.replaceChildren(selected);
  });

  if (existingHiddenContainer) {
    await page.evaluate(() => {
      const hidden = document.createElement('div');
      hidden.id = 'whatsappBookingStep';
      hidden.hidden = true;
      hidden.setAttribute('aria-hidden', 'true');
      hidden.style.display = 'none';
      document.body.appendChild(hidden);
    });
  }

  // Exercise the real capture-phase booking-context hook, but deliberately stop
  // before app.js can submit a booking or write to Neon. We then reproduce the
  // exact reported state: success message visible, WhatsApp CTA absent.
  await page.locator('#bookingForm').evaluate(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
    }, { capture: true, once: true });
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await page.locator('#message').evaluate(status => {
    status.textContent = 'تم إنشاء الحجز بنجاح. رقم الحجز: AZD-TEST123456';
    status.style.display = 'block';
    status.style.visibility = 'visible';
  });
  await expect(page.locator('#sendBookingWhatsApp')).toBeVisible({ timeout: 5000 });
  expect(bookingPosts).toBe(0);
}

test('recreates a missing WhatsApp CTA after a successful booking without creating a booking', async ({ page }) => {
  await createSuccessWithoutWhatsAppCTA(page, { language: 'ar' });
  const button = page.locator('#sendBookingWhatsApp');
  await expect(button).toHaveText('إرسال الموعد إلى العيادة عبر WhatsApp');
  await expect(page.locator('[data-azaad-whatsapp-instruction]')).toHaveText('يجب الضغط هنا 👇 لإرسال الموعد إلى العيادة');
  const href = await button.getAttribute('href');
  const target = new URL(href);
  expect(target.origin).toBe('https://wa.me');
  expect(target.pathname).toBe('/201140526294');
  const message = target.searchParams.get('text') || '';
  for (const value of ['AZD-TEST123456', 'Mohamed WhatsApp Test', '+201001234567', 'Dr. WhatsApp Test', 'Consultation', '1:30 PM']) {
    expect(message).toContain(value);
  }
});

test('repairs an existing hidden WhatsApp confirmation container and preserves English copy', async ({ page }) => {
  await createSuccessWithoutWhatsAppCTA(page, { language: 'en', existingHiddenContainer: true });
  const step = page.locator('#whatsappBookingStep');
  const button = page.locator('#sendBookingWhatsApp');
  await expect(step).toBeVisible();
  await expect(button).toBeVisible();
  await expect(button).toHaveText('Send the appointment to the clinic via WhatsApp');
  await expect(page.locator('[data-azaad-whatsapp-instruction]')).toHaveText('Please click here 👇 to send the appointment to the clinic');
  const href = await button.getAttribute('href');
  expect(new URL(href).searchParams.get('text')).toContain('AZD-TEST123456');
});
