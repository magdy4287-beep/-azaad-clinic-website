import { neon } from '@neondatabase/serverless';
function json(res, body, status = 200) { res.setHeader('Cache-Control', 'no-store'); return res.status(status).json(body); }
export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, { error: 'Method not allowed' }, 405);
  if (!process.env.DATABASE_URL) return json(res, { error: 'Runtime database is not configured' }, 503);
  try {
    const sql = neon(process.env.DATABASE_URL);
    const scope = new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams.get('scope');
    if (scope === 'media-transforms') {
      const rows = await sql`SELECT media_key, media_type, source_url, scale, position_x, position_y, rotation FROM public.clinic_media_transforms ORDER BY media_key`;
      return json(res, rows);
    }
    if (scope === 'team') {
      const [doctors, team] = await Promise.all([
        sql`SELECT id, name, name_en, title, title_en, bio, bio_en, image_url FROM public.clinic_doctors WHERE active = true ORDER BY sort_order, name`,
        sql`SELECT p.id, p.staff_id, s.doctor_id, p.display_name, p.display_name_en, p.title, p.title_en, p.department, p.department_en, p.bio, p.bio_en, p.image_url FROM public.clinic_public_team_profiles p LEFT JOIN public.clinic_staff s ON s.id=p.staff_id WHERE p.active = true AND p.show_on_patient_portal = true ORDER BY p.sort_order, p.display_name`
      ]);
      return json(res, { doctors, team });
    }
    const [settings, doctors, services, posts] = await Promise.all([
      sql`SELECT clinic_name, tagline, tagline_en, phone, landline, email, address, whatsapp, facebook_url, linkedin_url, instagram_url, tiktok_url, logo_url, hero_image_url, slot_minutes, booking_notice, booking_notice_en FROM public.clinic_settings ORDER BY id LIMIT 1`,
      sql`SELECT id, name, name_en, title, title_en, bio, bio_en, image_url, services FROM public.clinic_doctors WHERE active = true ORDER BY sort_order, name`,
      sql`SELECT id, name, name_en, description, description_en, duration_minutes, price FROM public.clinic_services WHERE active = true ORDER BY sort_order, name`,
      sql`SELECT id, title, title_en, content, content_en, media_type, media_url, external_url, published, published_at, sort_order FROM public.clinic_posts WHERE published = true ORDER BY published_at DESC NULLS LAST, sort_order, created_at DESC`
    ]);
    return json(res, { settings: settings[0] || {}, doctors, services, posts });
  } catch (error) {
    console.error('public-clinic-data failed', { name: error?.name, message: error?.message });
    return json(res, { error: 'Clinic data unavailable' }, 503);
  }
}
