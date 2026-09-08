import { neon } from '@neondatabase/serverless';

function json(res, body, status = 200) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, { error: 'Method not allowed' }, 405);
  if (!process.env.DATABASE_URL) {
    return json(res, { error: 'Runtime database is not configured' }, 503);
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const [doctors, team] = await Promise.all([
      sql`SELECT id, name, name_en, title, title_en, bio, bio_en, image_url
          FROM public.clinic_doctors
          WHERE active = true
          ORDER BY sort_order, name`,
      sql`SELECT id, display_name, display_name_en, title, title_en,
                 department, department_en, bio, bio_en, image_url
          FROM public.clinic_public_team_profiles
          WHERE active = true AND show_on_patient_portal = true
          ORDER BY sort_order, display_name`
    ]);

    return json(res, { doctors, team });
  } catch (error) {
    console.error('public-team-data failed', {
      name: error?.name,
      message: error?.message
    });
    return json(res, { error: 'Team data unavailable' }, 503);
  }
}
