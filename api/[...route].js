const legacy = {
  'admin-appointments': (await import('./_admin-appointments.js')).default,
  'admin-auth': (await import('./_admin-auth.js')).default,
  'clinical-assessments': (await import('./_clinical-assessments.js')).default,
  'emergency-department': (await import('./_emergency-department.js')).default,
  'icu': (await import('./_icu.js')).default,
  'insurance-admission': (await import('./_insurance-admission.js')).default,
  'invoices': (await import('./_invoices.js')).default,
  'nursing': (await import('./_nursing.js')).default,
  'patient-financial-summary': (await import('./_patient-financial-summary.js')).default,
  'pharmacy': (await import('./_pharmacy.js')).default,
  'public-clinic-data': (await import('./_public-clinic-data.js')).default,
  'public-scheduling': (await import('./_public-scheduling.js')).default,
  'public-team-admin': (await import('./_public-team-admin.js')).default,
  'purchases': (await import('./_purchases.js')).default,
  'staff-admin': (await import('./_staff-admin.js')).default,
  'waiting-list': (await import('./_waiting-list.js')).default,
};

const platform = {
  'facility-mode': (await import('../server/api/platform-facility-mode.js')).default,
  'ai-insights': (await import('../server/api/platform-ai-insights.js')).default,
  'clinical-ai-cockpit': (await import('../server/api/platform-clinical-ai-cockpit.js')).default,
  'public-booking': (await import('../server/api/public-booking.js')).default,
  'admissions': (await import('../server/api/admissions.js')).default,
  'marketing': (await import('../server/api/marketing.js')).default,
};

export default async function handler(req, res) {
  try {
    const parts = new URL(req.url || '/', 'https://azaad.invalid').pathname.split('/').filter(Boolean);
    const route = parts.at(-1) || '';
    const target = legacy[route] || platform[route];
    if (!target) {
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'api_route_not_found' }));
    }
    return target(req, res);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'api_gateway_failure', message: error instanceof Error ? error.message : String(error) }));
  }
}
