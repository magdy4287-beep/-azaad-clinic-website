import { test, expect } from '@playwright/test';

const supabaseUrl = (process.env.AZAAD_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const anonKey = process.env.AZAAD_SUPABASE_ANON_KEY;

function requireJwtSecret(name, value) {
  if (!value) throw new Error(`Missing required controlled-E2E secret/env: ${name}`);
  const compact = value.trim();
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(compact)) {
    throw new Error(`Controlled-E2E secret ${name} is not a JWT`);
  }
  return compact;
}

const tokens = {
  frontdesk: requireJwtSecret('AZAAD_E2E_FRONTDESK_TOKEN', process.env.AZAAD_E2E_FRONTDESK_TOKEN),
  nonStaff: requireJwtSecret('AZAAD_E2E_NONSTAFF_TOKEN', process.env.AZAAD_E2E_NONSTAFF_TOKEN),
  doctorA: requireJwtSecret('AZAAD_E2E_DOCTOR_A_TOKEN', process.env.AZAAD_E2E_DOCTOR_A_TOKEN),
  doctorB: requireJwtSecret('AZAAD_E2E_DOCTOR_B_TOKEN', process.env.AZAAD_E2E_DOCTOR_B_TOKEN),
};

function requireEnv(name, value) {
  if (!value) throw new Error(`Missing required controlled-E2E env: ${name}`);
}

function rpcUrl(name) {
  return `${supabaseUrl}/rest/v1/rpc/${name}`;
}

async function rpc(request, name, args = {}, token) {
  requireEnv('AZAAD_SUPABASE_URL', supabaseUrl);
  requireEnv('AZAAD_SUPABASE_ANON_KEY', anonKey);
  const headers = { apikey: anonKey, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return request.post(rpcUrl(name), { headers, data: args });
}

function extractFixture(body) {
  const candidate = Array.isArray(body) ? body[0] : body;
  const nested = candidate?.clinic_prepare_controlled_clinical_e2e_suite;
  if (nested && typeof nested === 'object') return nested;
  const fixtureResult = candidate?.fixture_result;
  if (fixtureResult && typeof fixtureResult === 'object') return fixtureResult;
  return candidate;
}

function requireUuid(name, value) {
  expect(value, `${name} must be a UUID`).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
}

function isFutureJwtRejection(status, body) {
  return status === 401 && /PGRST303|JWT issued at future/i.test(body);
}

function jwtIssuedAtMs(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return Number.isFinite(payload?.iat) ? payload.iat * 1000 : null;
  } catch (_) {
    return null;
  }
}

async function waitForJwtClockCatchUp(token, response, attempt) {
  const issuedAt = jwtIssuedAtMs(token);
  const serverDate = Date.parse(response.headers()['date'] || '');
  const now = Date.now();
  const referenceNow = Number.isFinite(serverDate) ? serverDate : now;
  const skewMs = issuedAt == null ? 0 : Math.max(0, issuedAt - referenceNow);
  const delayMs = Math.min(Math.max(skewMs + 1500, 5000 * attempt), 15000);
  console.log(`PGRST303 JWT future-time rejection; waiting ${delayMs}ms before retry (attempt ${attempt}, observedSkewMs=${skewMs}).`);
  await new Promise(resolve => setTimeout(resolve, delayMs));
}

async function prepareFixtures(request) {
  const maxClockSkewRetries = 4;

  for (let attempt = 1; attempt <= maxClockSkewRetries + 1; attempt += 1) {
    const response = await rpc(request, 'clinic_prepare_controlled_clinical_e2e_suite', {}, tokens.frontdesk);
    if (response.ok()) {
      const body = await response.json();
      const fixture = extractFixture(body);
      requireUuid('happy_path_booking_id', fixture?.happy_path_booking_id);
      requireUuid('wrong_doctor_booking_id', fixture?.wrong_doctor_booking_id);
      requireUuid('invalid_state_booking_id', fixture?.invalid_state_booking_id);
      return fixture;
    }

    const body = await response.text();
    if (attempt <= maxClockSkewRetries && isFutureJwtRejection(response.status(), body)) {
      await waitForJwtClockCatchUp(tokens.frontdesk, response, attempt);
      continue;
    }

    throw new Error(`Controlled E2E fixture factory failed with HTTP ${response.status()}: ${body}`);
  }

  throw new Error('Controlled E2E fixture factory exhausted clock-skew retries.');
}

function expectDenied(response) {
  expect([400, 401, 403, 409, 422]).toContain(response.status());
}

test.describe('Clinical authorization boundary', () => {
  let bookings;

  test.beforeAll(async ({ request }) => {
    bookings = await prepareFixtures(request);
  });

  test('unauthenticated check-in is denied', async ({ request }) => {
    const response = await rpc(request, 'clinic_frontdesk_checkin', {
      p_booking_id: bookings.invalid_state_booking_id,
      p_notes: 'security-negative-e2e',
    });
    expectDenied(response);
  });

  test('non-staff start-visit is denied', async ({ request }) => {
    const response = await rpc(request, 'clinic_start_clinical_visit', {
      p_booking_id: bookings.invalid_state_booking_id,
    }, tokens.nonStaff);
    expectDenied(response);
  });

  test('staff without clinical permission is denied', async ({ request }) => {
    const response = await rpc(request, 'clinic_start_clinical_visit', {
      p_booking_id: bookings.invalid_state_booking_id,
    }, tokens.frontdesk);
    expectDenied(response);
  });

  test('doctor scope mismatch is denied', async ({ request }) => {
    const response = await rpc(request, 'clinic_start_clinical_visit', {
      p_booking_id: bookings.wrong_doctor_booking_id,
    }, tokens.doctorA);
    expectDenied(response);
  });

  test('invalid workflow state is denied', async ({ request }) => {
    const response = await rpc(request, 'clinic_start_clinical_visit', {
      p_booking_id: bookings.invalid_state_booking_id,
    }, tokens.doctorA);
    expectDenied(response);
  });

  test('authorized clinical path is allowed in controlled environment', async ({ request }) => {
    const checkin = await rpc(request, 'clinic_frontdesk_checkin', {
      p_booking_id: bookings.happy_path_booking_id,
      p_notes: 'security-negative-e2e-happy-path',
    }, tokens.frontdesk);
    expect(checkin.ok()).toBeTruthy();

    const visit = await rpc(request, 'clinic_start_clinical_visit', {
      p_booking_id: bookings.happy_path_booking_id,
    }, tokens.doctorB);
    expect(visit.ok()).toBeTruthy();
  });
});
