import { test, expect } from '@playwright/test';

function cleanEnv(name) {
  const value = process.env[name];
  if (!value) return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

const supabaseUrl = cleanEnv('AZAAD_SUPABASE_URL');
const anonKey = cleanEnv('AZAAD_SUPABASE_ANON_KEY');

const tokens = {
  frontdesk: cleanEnv('AZAAD_E2E_FRONTDESK_TOKEN'),
  nonStaff: cleanEnv('AZAAD_E2E_NONSTAFF_TOKEN'),
  doctorA: cleanEnv('AZAAD_E2E_DOCTOR_A_TOKEN'),
  doctorB: cleanEnv('AZAAD_E2E_DOCTOR_B_TOKEN'),
};

const bookings = {
  wrongDoctor: cleanEnv('AZAAD_E2E_WRONG_DOCTOR_BOOKING_ID'),
  invalidState: cleanEnv('AZAAD_E2E_INVALID_STATE_BOOKING_ID'),
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

async function readSafeRpcError(response) {
  const body = await response.text().catch(() => '');
  let parsed = null;
  try { parsed = JSON.parse(body); } catch {}
  return {
    status: response.status(),
    code: parsed?.code || parsed?.error_code || null,
    message: parsed?.message || parsed?.error || body.slice(0, 500),
  };
}

async function createControlledHappyPathFixture(request, token) {
  const response = await rpc(
    request,
    'clinic_prepare_controlled_clinical_e2e_fixture',
    {},
    token,
  );
  if (!response.ok()) {
    const diagnostic = await readSafeRpcError(response);
    throw new Error(`Controlled clinical fixture creation failed: HTTP ${diagnostic.status}; code=${diagnostic.code || 'none'}; message=${diagnostic.message || 'empty response'}`);
  }
  const payload = await response.json();
  const bookingId = payload?.booking_id;
  expect(typeof bookingId).toBe('string');
  expect(bookingId).not.toBe('');
  return bookingId;
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

    const bookingId = await createControlledHappyPathFixture(request, tokens.frontdesk);

    const checkin = await rpc(request, 'clinic_frontdesk_checkin', {
      p_booking_id: bookingId,
      p_notes: 'controlled-clinical-e2e-happy-path',
    }, tokens.frontdesk);
    if (!checkin.ok()) {
      const diagnostic = await readSafeRpcError(checkin);
      throw new Error(`Controlled fixture check-in failed: HTTP ${diagnostic.status}; code=${diagnostic.code || 'none'}; message=${diagnostic.message || 'empty response'}`);
    }

    const visit = await rpc(request, 'clinic_start_clinical_visit', {
      p_booking_id: bookingId,
    }, tokens.doctorB);
    if (!visit.ok()) {
      const diagnostic = await readSafeRpcError(visit);
      throw new Error(`Controlled clinical visit failed: HTTP ${diagnostic.status}; code=${diagnostic.code || 'none'}; message=${diagnostic.message || 'empty response'}`);
    }
  });
});
