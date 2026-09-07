import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Runtime database is not configured' });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT media_key, media_type, source_url, scale, position_x, position_y, rotation FROM public.clinic_media_transforms ORDER BY media_key`;
    return res.status(200).json(rows);
  } catch (error) {
    console.error('public-media-transforms failed', { name: error?.name, message: error?.message });
    return res.status(503).json({ error: 'Media transforms unavailable' });
  }
}
