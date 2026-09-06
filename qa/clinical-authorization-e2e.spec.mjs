import { test, expect } from '@playwright/test';

const BASE = (process.env.AZAAD_BASE_URL || 'http://127.0.0.1:4173').replace(/\/+$/, '');

async function json(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}

async function postCheckin(request, body, extra = {}) {
  return request.post(`${BASE}/api/frontdesk-checkin`, {
    headers: {'Content-Type':'application/json', ...extra},
    data: body,
  });
}

test.describe('Clinical authorization migration boundary', () => {
  test('check-in API is not reachable without the Appwrite HttpOnly session', async ({ request }) => {
    const response = await postCheckin(request, { booking_id: '00000000-0000-4000-8000-000000000001' });
    expect([401, 503]).toContain(response.status());
    const body = await json(response);
    expect(String(body.error || '')).not.toMatch(/supabase/i);
  });

  test('malformed check-in cannot bypass the authentication boundary', async ({ request }) => {
    const response = await postCheckin(request, {});
    expect([401, 503]).toContain(response.status());
    const body = await json(response);
    expect(String(body.error || '')).not.toMatch(/supabase/i);
  });

  test('clinical browser runtime uses the canonical API boundary', async ({ request }) => {
    const response = await request.get(`${BASE}/frontdesk-checkin-workflow.js?azaad_clinical_boundary=1`);
    expect(response.ok()).toBeTruthy();
    const source = await response.text();
    expect(source).toContain("fetch('/api/frontdesk-checkin'");
    expect(source).toContain("credentials: 'include'");
    expect(source).not.toMatch(/supabase/i);
    expect(source).not.toContain('AZAAD_SUPABASE_ANON_KEY');
  });
});
