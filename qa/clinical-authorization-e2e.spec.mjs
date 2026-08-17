import { test, expect } from '@playwright/test';

const supabaseUrl = process.env.AZAAD_SUPABASE_URL;
const anonKey = process.env.AZAAD_SUPABASE_ANON_KEY;

function normalizeSecret(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function requireJwtSecret(name, value) {
  if (!value) throw new Error(`Missing required controlled-E2E secret/env: ${name}`);
  const compact = normalizeSecret(value);
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(compact)) {
    throw new Error(`Controlled-E2E secret ${name} is not a JWT. Replace the repository secret with a real Supabase Auth access token for the dedicated E2E identity.`);
  }
  return compact;
}

const tokens = {
  frontdesk: requireJwtSecret('AZAAD_E2E_FRONTDESK_TOKEN', process.env.AZAAD_E2E_FRONTDESK_TOKEN),
  nonStaff: requireJwtSecret('AZAAD_E2E_NONSTAFF_TOKEN', process.env.AZAAD_E2E_NONSTAFF_TOKEN),
  doctorA: requireJwtSecret('AZAAD_E2E_DOCTOR_A_TOKEN', process.env.AZAAD_E2E_DOCTOR_A_TOKEN),
  doctorB: requireJwtSecret('AZAAD_E2E_DOCTOR_B_TOKEN', process.env.AZAAD_E2E_DOCTOR_B_TOKEN),
};

const bookings = {
  wrongDoctor: process.env.AZAAD_E2E_WRONG_DOCTOR_BOOKING_ID,
  invalidState: process.env.AZAAD_E2E_INVALID_STATE_BOOKING_ID,
  happyPath: process.env.AZAAD_E2E_HAPPY_PATH_BOOKING_ID,
};

function requireEnv(name, value) {
  if (!value) throw new Error(`Missing required controlled-E2E secret/env: ${name}`);
}

function rpcUrl(name) {
  return `${supabaseUrl}/rest/v1/rpc/${name}`;
}

async function rpc(request, name, args = {}, token) {
  requireEnv('AZAAD_SUPABASE_URL', supabaseUrl);
  requireEnv('AZAAD_SUPABASE_ANON_KEY', anonKey);
  const headers = {
    apikey: anonKey,
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return request.post(rpcUrl(name), { headers, data: args });
}

function expectDenied(response) {
  expect([401, 403, 409, 422]).toContain(response.status());
}

test.describe('Clinical authorization boundary', () => {
  test('unauthenticated check-in is denied', async ({ request }) => {
    requireEnv('AZAAD_E2E_INVALID_STATE_BOOKING_ID', bookings.invalidState);
    const response = await rpc(request, 'clinic_frontdesk_checkin', {
      p_booking_id: bookings.invalidState,
      p_notes: 'security-negative-e2e',
    });
    expectDenied(response);
  });

  test('non-staff start-visit is denied', async ({ request }) => {
    requireEnv('AZAAD_E2E_INVALID_STATE_BOOKING_ID', bookings.invalidState);
    const response = await rpc(request, 'clinic_start_clinical_visit', {
      p_booking_id: bookings.invalidState,
    }, tokens.nonStaff);
    expectDenied(response);
  });

  test('staff without clinical permission is denied', async ({ request }) => {
    requireEnv('AZAAD_E2E_INVALID_STATE_BOOKING_ID', bookings.invalidState);
    const response = await rpc(request, 'clinic_start_clinical_visit', {
      p_booking_id: bookings.invalidState,
    }, tokens.frontdesk);
    expectDenied(response);
  });

  test('doctor scope mismatch is denied', async ({ request }) => {
    requireEnv('AZAAD_E2E_WRONG_DOCTOR_BOOKING_ID', bookings.wrongDoctor);
    const response = await rpc(request, 'clinic_start_clinical_visit', {
      p_booking_id: bookings.wrongDoctor,
    }, tokens.doctorA);
    expectDenied(response);
  });

  test('invalid workflow state is denied', async ({ request }) => {
    requireEnv('AZAAD_E2E_INVALID_STATE_BOOKING_ID', bookings.invalidState);
    const response = await rpc(request, 'clinic_start_clinical_visit', {
      p_booking_id: bookings.invalidState,
    }, tokens.doctorA);
    expectDenied(response);
  });

  test('authorized clinical path is allowed in controlled environment', async ({ request }) => {
    requireEnv('AZAAD_E2E_HAPPY_PATH_BOOKING_ID', bookings.happyPath);

    const checkin = await rpc(request, 'clinic_frontdesk_checkin', {
      p_booking_id: bookings.happyPath,
      p_notes: 'security-negative-e2e-happy-path',
    }, tokens.frontdesk);
    expect(checkin.ok()).toBeTruthy();

    const visit = await rpc(request, 'clinic_start_clinical_visit', {
      p_booking_id: bookings.happyPath,
    }, tokens.doctorB);
    expect(visit.ok()).toBeTruthy();
  });
});
