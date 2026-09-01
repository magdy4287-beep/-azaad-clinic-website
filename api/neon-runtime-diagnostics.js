import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'DATABASE_URL not configured' });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT current_database() AS database_name, current_setting('server_version') AS server_version, (SELECT count(*) FROM information_schema.tables WHERE table_schema='public') AS public_tables, (SELECT count(*) FROM public.clinic_settings) AS clinic_settings, (SELECT count(*) FROM public.clinic_doctors) AS doctors, (SELECT count(*) FROM public.clinic_services) AS services, (SELECT count(*) FROM public.clinic_patients) AS patients, (SELECT count(*) FROM public.clinic_bookings) AS bookings, (SELECT count(*) FROM public.clinic_audit_log) AS audit_log`;
    return res.status(200).json({ ok: true, database: rows[0] });
  } catch (error) {
    console.error('neon-runtime-diagnostics failed', error);
    return res.status(503).json({ error: 'Neon database query failed' });
  }
}
