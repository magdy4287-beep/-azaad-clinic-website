import { neon } from '@neondatabase/serverless';
import { jsonResponse, runtimeContract } from '../lib/azaad-runtime-contract.js';

export const config = {
  runtime: 'edge'
};

export default async function handler() {
  const contract = runtimeContract();
  let databaseReachable = false;

  if (contract.database) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      const rows = await sql`select 1 as ok`;
      databaseReachable = rows?.[0]?.ok === 1;
    } catch (error) {
      console.error('[AZAAD runtime-health] Neon connectivity failed', error);
    }
  }

  const ready = databaseReachable && contract.storage && contract.identity;

  return jsonResponse(
    {
      status: ready ? 'ok' : 'blocked',
      runtime: 'provider-neutral',
      supabaseRuntimeAllowed: false,
      checks: {
        ...contract,
        database: databaseReachable,
        databaseConfigured: contract.configured.DATABASE_URL,
        databaseReachable
      }
    },
    ready ? 200 : 503
  );
}
