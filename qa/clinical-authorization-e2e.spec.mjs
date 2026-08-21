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

function jwtClaims(token) {
  try {
    const [header, payload] = token.split('.');
    const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return {
      alg: typeof decodedHeader?.alg === 'string' ? decodedHeader.alg : null,
      kid: typeof decodedHeader?.kid === 'string' ? decodedHeader.kid : null,
      typ: typeof decodedHeader?.typ === 'string' ? decodedHeader.typ : null,
      iat: Number.isFinite(decodedPayload?.iat) ? decodedPayload.iat : null,
      nbf: Number.isFinite(decodedPayload?.nbf) ? decodedPayload.nbf : null,
      exp: Number.isFinite(decodedPayload?.exp) ? decodedPayload.exp : null,
      aud: typeof decodedPayload?.aud === 'string' ? decodedPayload.aud : null,
      role: typeof decodedPayload?.role === 'string' ? decodedPayload.role : null,
      iss: typeof decodedPayload?.iss === 'string' ? decodedPayload.iss : null,
    };
  } catch (_) {
    return null;
  }
}

async function authClockEvidence(request, token) {
  requireEnv('AZAAD_SUPABASE_URL', supabaseUrl);
  requireEnv('AZAAD_SUPABASE_ANON_KEY', anonKey);
  const response = await request.get(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  return {
    status: response.status(),
    dateHeader: response.headers()['date'] || '',
  };
}

async function recordPgrst303Evidence(request, token, response) {
  const claims = jwtClaims(token);
  const postgrestDateHeader = response.headers()['date'] || '';
  const postgrestDate = Date.parse(postgrestDateHeader);
  const localNow = Date.now();
  const authEvidence = await authClockEvidence(request, token);
  const authDate = Date.parse(authEvidence.dateHeader);

  if (!claims || claims.iat == null) {
    throw new Error('PGRST303 claim diagnostic could not decode numeric JWT iat.');
  }

  console.log(`PGRST303 signing evidence: alg=${claims.alg ?? '<absent>'}; kid=${claims.kid ?? '<absent>'}; typ=${claims.typ ?? '<absent>'}.`);
  console.log(`PGRST303 claim evidence: iat=${claims.iat}; iatIso=${new Date(claims.iat * 1000).toISOString()}; nbf=${claims.nbf ?? '<absent>'}; nbfIso=${claims.nbf == null ? '<absent>' : new Date(claims.nbf * 1000).toISOString()}; exp=${claims.exp ?? '<absent>'}; expIso=${claims.exp == null ? '<absent>' : new Date(claims.exp * 1000).toISOString()}; aud=${claims.aud ?? '<absent>'}; role=${claims.role ?? '<absent>'}; iss=${claims.iss ?? '<absent>'}.`);
  console.log(`PGRST303 clock evidence: localNowIso=${new Date(localNow).toISOString()}; postgrestDate=${postgrestDateHeader || '<missing>'}; authUserStatus=${authEvidence.status}; authDate=${authEvidence.dateHeader || '<missing>'}; postgrestVsAuthDateMs=${Number.isFinite(postgrestDate) && Number.isFinite(authDate) ? postgrestDate - authDate : '<unmeasured>'}; jwtIatVsPostgrestDateMs=${Number.isFinite(postgrestDate) ? claims.iat * 1000 - postgrestDate : '<unmeasured>'}; jwtIatVsAuthDateMs=${Number.isFinite(authDate) ? claims.iat * 1000 - authDate : '<unmeasured>'}.`);

  if (!Number.isFinite(postgrestDate)) {
    throw new Error('PGRST303 claim diagnostic could not measure PostgREST gateway time because the response Date header is missing or invalid.');
  }

  console.log(`PGRST303 terminal diagnostic: no retry/backoff will be attempted; same JWT would retain the same iat=${claims.iat}.`);
}

async function prepareFixtures(request) {
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
  if (isFutureJwtRejection(response.status(), body)) {
    await recordPgrst303Evidence(request, tokens.frontdesk, response);
  }

  throw new Error(`Controlled E2E fixture factory failed with HTTP ${response.status()}: ${body}`);
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
