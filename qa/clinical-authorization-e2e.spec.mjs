import { test, expect } from '@playwright/test';

function normalizeEnv(name, mode = 'scalar') {
  const value = process.env[name];
  if (value == null) return value;
  const normalized = mode === 'token'
    ? value.replace(/\s+/g, '')
    : value.trim();
  if (mode !== 'token' && /\r|\n/.test(normalized)) {
    throw new Error(`Invalid controlled-E2E secret/env contains a line break: ${name}`);
  }
  return normalized;
}

function normalizeBookingId(name) {
  const value = process.env[name];
  if (value == null) return value;
  const normalized = value.replace(/\s+/g, '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    throw new Error(`Invalid controlled-E2E booking UUID: ${name}`);
  }
  return normalized;
}

const supabaseUrl = normalizeEnv('AZAAD_SUPABASE_URL');
const anonKey = normalizeEnv('AZAAD_SUPABASE_ANON_KEY');

const tokens = {
  frontdesk: normalizeEnv('AZAAD_E2E_FRONTDESK_TOKEN', 'token'),
  nonStaff: normalizeEnv('AZAAD_E2E_NONSTAFF_TOKEN', 'token'),
  doctorA: normalizeEnv('AZAAD_E2E_DOCTOR_A_TOKEN', 'token'),
  doctorB: normalizeEnv('AZAAD_E2E_DOCTOR_B_TOKEN', 'token'),
};

const bookings = {
  wrongDoctor: normalizeBookingId('AZAAD_E2E_WRONG_DOCTOR_BOOKING_ID'),
  invalidState: normalizeBookingId('AZAAD_E2E_INVALID_STATE_BOOKING_ID'),
  happyPath: normalizeBookingId('AZAAD_E2E_HAPPY_PATH_BOOKING_ID'),
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
    requireEnv('AZAAD_E2E_NONSTAFF_TOKEN', tokens.nonStaff);
    requireEnv('AZAAD_E2E_INVALID_STATE_BOOKING_ID', bookings.invalidState);
    const response = await rpc(request, 'clinic_start_clinical_visit', {
      p_booking_id: bookings.invalidState,
    }, tokens.nonStaff);
    expectDenied(response);
  });

  test('staff without clinical permission is denied', async ({ request }) => {
    requireEnv('AZAAD_E2E_FRONTDESK_TOKEN', tokens.frontdesk);
    requireEnv('AZAAD_E2E_INVALID_STATE_BOOKING_ID', bookings.invalidState);
    const response = await rpc(request, 'clinic_start_clinical_visit', {
      p_booking_id: bookings.invalidState,
    }, tokens.frontdesk);
    expectDenied(response);
  });

  test('doctor scope mismatch is denied', async ({ request }) => {
    requireEnv('AZAAD_E2E_DOCTOR_A_TOKEN', tokens.doctorA);
    requireEnv('AZAAD_E2E_WRONG_DOCTOR_BOOKING_ID', bookings.wrongDoctor);
    const response = await rpc(request, 'clinic_start_clinical_visit', {
      p_booking_id: bookings.wrongDoctor,
    }, tokens.doctorA);
    expectDenied(response);
  });

  test('invalid workflow state is denied', async ({ request }) => {
    requireEnv('AZAAD_E2E_DOCTOR_A_TOKEN', tokens.doctorA);
    requireEnv('AZAAD_E2E_INVALID_STATE_BOOKING_ID', bookings.invalidState);
    const response = await rpc(request, 'clinic_start_clinical_visit', {
      p_booking_id: bookings.invalidState,
    }, tokens.doctorA);
    expectDenied(response);
  });

  test('authorized clinical path is allowed in controlled environment', async ({ request }) => {
    requireEnv('AZAAD_E2E_FRONTDESK_TOKEN', tokens.frontdesk);
    requireEnv('AZAAD_E2E_DOCTOR_B_TOKEN', tokens.doctorB);
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
