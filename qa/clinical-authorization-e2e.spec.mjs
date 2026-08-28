import { test, expect } from '@playwright/test';

const supabaseUrl = (process.env.AZAAD_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const anonKey = process.env.AZAAD_SUPABASE_ANON_KEY;
const fixtureFunctionName = (process.env.AZAAD_CLINICAL_FIXTURE_FUNCTION || 'azaad-clinical-e2e-fixtures').trim();

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

function requireUuid(name, value) {
  expect(value, `${name} must be a UUID`).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
}

async function prepareFixtures(request) {
  requireEnv('AZAAD_SUPABASE_URL', supabaseUrl);
  requireEnv('AZAAD_SUPABASE_ANON_KEY', anonKey);
  requireEnv('AZAAD_CLINICAL_FIXTURE_FUNCTION', fixtureFunctionName);
  if (!/^[a-z0-9-]+$/.test(fixtureFunctionName)) {
    throw new Error(`Invalid controlled-E2E fixture function name: ${fixtureFunctionName}`);
  }
  const response = await request.post(`${supabaseUrl}/functions/v1/${fixtureFunctionName}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${tokens.frontdesk}`, 'Content-Type': 'application/json' },
    data: {},
  });
  const body = await response.text();
  let parsed = {};
  try { parsed = JSON.parse(body); } catch {}
  if (!response.ok()) throw new Error(`Controlled E2E fixture boundary failed with HTTP ${response.status()}: ${body}`);
  const fixture = Array.isArray(parsed) ? parsed[0] : parsed;
  requireUuid('happy_path_booking_id', fixture?.happy_path_booking_id);
  requireUuid('wrong_doctor_booking_id', fixture?.wrong_doctor_booking_id);
  requireUuid('invalid_state_booking_id', fixture?.invalid_state_booking_id);
  return fixture;
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
