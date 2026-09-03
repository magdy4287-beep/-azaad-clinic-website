import { neon } from '@neondatabase/serverless';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export default async function handler(request) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  if (!process.env.DATABASE_URL) return json({ error: 'Runtime database is not configured' }, 503);

  try {
    const sql = neon(process.env.DATABASE_URL);
    const [settings, doctors, services, posts] = await Promise.all([
      sql`SELECT clinic_name, tagline, tagline_en, phone, landline, email, address, whatsapp, facebook_url, linkedin_url, instagram_url, tiktok_url, logo_url, hero_image_url, slot_minutes, booking_notice, booking_notice_en FROM public.clinic_settings ORDER BY id LIMIT 1`,
      sql`SELECT id, name, name_en, title, title_en, bio, bio_en, image_url, services FROM public.clinic_doctors WHERE active = true ORDER BY sort_order, name`,
      sql`SELECT id, name, name_en, description, description_en, duration_minutes, price FROM public.clinic_services WHERE active = true ORDER BY sort_order, name`,
      sql`SELECT id, title, title_en, content, content_en, media_type, media_url, external_url, published, published_at, sort_order FROM public.clinic_posts WHERE published = true ORDER BY published_at DESC NULLS LAST, sort_order, created_at DESC`
    ]);
    return json({ settings: settings[0] || {}, doctors, services, posts });
  } catch (error) {
    console.error('public-clinic-data failed', { name: error?.name, message: error?.message });
    return json({ error: 'Clinic data unavailable' }, 503);
  }
}
