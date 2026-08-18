import { test, expect } from '@playwright/test';

const supabaseUrl = process.env.AZAAD_SUPABASE_URL;
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

async function prepareFixtures(request) {
  const response = await rpc(request, 'clinic_prepare_controlled_clinical_e2e_suite', {}, tokens.frontdesk);
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Controlled E2E fixture factory failed with HTTP ${response.status()}: ${body}`);
  }
  const body = await response.json();
  const fixture = Array.isArray(body) ? body[0]?.clinic_prepare_controlled_clinical_e2e_suite : body?.clinic_prepare_controlled_clinical_e2e_suite;
  if (!fixture?.happy_path_booking_id || !fixture?.invalid_state_booking_id) {
    throw new Error('Controlled E2E fixture factory returned incomplete booking IDs');
  }
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
