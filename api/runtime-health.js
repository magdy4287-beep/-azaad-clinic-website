import { neon } from '@neondatabase/serverless';
import { jsonResponse, runtimeContract } from '../lib/azaad-runtime-contract.js';

export const config = {
  runtime: 'edge'
};

const REQUIRED_TABLES = [
  'clinic_settings',
  'clinic_doctors',
  'clinic_services',
  'clinic_patients',
  'clinic_bookings',
  'clinic_clinical_visits',
  'clinic_invoices',
  'clinic_payments',
  'clinic_audit_log'
];

async function databaseTargetFingerprint() {
  const raw = String(process.env.DATABASE_URL || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const canonical = `${url.protocol}//${url.hostname}:${url.port || ''}${url.pathname}`;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
    return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('[AZAAD runtime-health] database target fingerprint failed', error);
    return null;
  }
}

async function verifyNeon(sql) {
  const rows = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name = any(${REQUIRED_TABLES})
  `;
  const present = new Set(rows.map((row) => row.table_name));
  const missing = REQUIRED_TABLES.filter((name) => !present.has(name));
  return { reachable: true, requiredTablesPresent: missing.length === 0, missingTables: missing };
}

async function verifyAppwrite() {
  const endpoint = String(process.env.APPWRITE_ENDPOINT || '').trim().replace(/\/$/, '');
  const project = String(process.env.APPWRITE_PROJECT_ID || '').trim();
  const key = String(process.env.APPWRITE_API_KEY || '').trim();
  if (!endpoint || !project || !key) {
    return { configured: false, reachable: false, usersApi: false };
  }

  try {
    const response = await fetch(`${endpoint}/users?limit=1`, {
      method: 'GET',
      headers: {
        'X-Appwrite-Project': project,
        'X-Appwrite-Key': key,
        Accept: 'application/json'
      }
    });
    return {
      configured: true,
      reachable: response.ok,
      usersApi: response.ok
    };
  } catch (error) {
    console.error('[AZAAD runtime-health] Appwrite connectivity failed', error);
    return { configured: true, reachable: false, usersApi: false };
  }
}

export default async function handler() {
  const contract = runtimeContract();
  let databaseReachable = false;
  let databaseTables = { reachable: false, requiredTablesPresent: false, missingTables: REQUIRED_TABLES };

  if (contract.database) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      databaseTables = await verifyNeon(sql);
      databaseReachable = databaseTables.reachable;
    } catch (error) {
      console.error('[AZAAD runtime-health] Neon connectivity/schema verification failed', error);
    }
  }

  const [appwrite, targetFingerprint] = await Promise.all([
    verifyAppwrite(),
    databaseTargetFingerprint()
  ]);
  const expectedFingerprint = contract.expectedDatabaseTargetFingerprint;
  const databaseTargetMatches = Boolean(targetFingerprint && expectedFingerprint && targetFingerprint === expectedFingerprint);
  const ready =
    databaseReachable &&
    databaseTables.requiredTablesPresent &&
    databaseTargetMatches &&
    contract.storage &&
    contract.identity &&
    appwrite.reachable &&
    appwrite.usersApi;

  return jsonResponse(
    {
      status: ready ? 'ok' : 'blocked',
      runtime: 'provider-neutral',
      supabaseRuntimeAllowed: false,
      checks: {
        ...contract,
        database: databaseReachable,
        databaseConfigured: contract.configured.DATABASE_URL,
        databaseReachable,
        databaseTargetFingerprint: targetFingerprint,
        databaseTargetMatches,
        databaseTables,
        appwrite
      }
    },
    ready ? 200 : 503
  );
}
