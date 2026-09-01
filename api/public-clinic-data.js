import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Runtime database is not configured' });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const [settings, doctors, services] = await Promise.all([
      sql`SELECT clinic_name, tagline, tagline_en, phone, landline, email, address, whatsapp, facebook_url, linkedin_url, instagram_url, tiktok_url, logo_url, hero_image_url, slot_minutes, booking_notice, booking_notice_en FROM public.clinic_settings ORDER BY id LIMIT 1`,
      sql`SELECT id, name, name_en, title, title_en, bio, bio_en, image_url, services FROM public.clinic_doctors WHERE active = true ORDER BY sort_order, name`,
      sql`SELECT id, name, name_en, description, description_en, duration_minutes, price FROM public.clinic_services WHERE active = true ORDER BY sort_order, name`
    ]);
    return res.status(200).json({ settings: settings[0] || {}, doctors, services });
  } catch (error) {
    console.error('public-clinic-data failed', error);
    return res.status(503).json({ error: 'Clinic data unavailable' });
  }
}
