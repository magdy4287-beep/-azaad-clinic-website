import { neon } from '@neondatabase/serverless';
import { jsonResponse, runtimeContract } from '../lib/azaad-runtime-contract.js';

export const config = {
  runtime: 'edge'
};

export default async function handler() {
  const contract = runtimeContract();

  if (!contract.database || !contract.storage || !contract.identity) {
    return jsonResponse(
      {
        status: 'blocked',
        runtime: 'provider-neutral',
        supabaseRuntimeAllowed: false,
        checks: contract
      },
      503
    );
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`select 1 as ok`;
    const databaseOk = rows?.[0]?.ok === 1;

    if (!databaseOk) {
      return jsonResponse(
        {
          status: 'blocked',
          runtime: 'provider-neutral',
          supabaseRuntimeAllowed: false,
          checks: { ...contract, database: false }
        },
        503
      );
    }

    return jsonResponse({
      status: 'ok',
      runtime: 'provider-neutral',
      supabaseRuntimeAllowed: false,
      checks: { ...contract, database: true }
    });
  } catch (error) {
    console.error('[AZAAD runtime-health] Neon connectivity failed', error);
    return jsonResponse(
      {
        status: 'blocked',
        runtime: 'provider-neutral',
        supabaseRuntimeAllowed: false,
        checks: { ...contract, database: false }
      },
      503
    );
  }
}
