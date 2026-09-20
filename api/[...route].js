import { neon as _neonRuntimeDependency } from '@neondatabase/serverless';

// Keep the canonical Neon runtime dependency statically visible to Vercel's function tracer.
void _neonRuntimeDependency;

const legacy = {
  'admin-appointments': './_admin-appointments.js',
  'admin-auth': './_admin-auth.js',
  'clinical-assessments': './_clinical-assessments.js',
  'emergency-department': './_emergency-department.js',
  'icu': './_icu.js',
  'insurance-admission': './_insurance-admission.js',
  'invoices': './_invoices.js',
  'nursing': './_nursing.js',
  'patient-financial-summary': './_patient-financial-summary.js',
  'pharmacy': './_pharmacy.js',
  'public-clinic-data': './_public-clinic-data.js',
  'public-scheduling': './_public-scheduling.js',
  'public-team-admin': './_public-team-admin.js',
  'purchases': './_purchases.js',
  'staff-admin': './_staff-admin.js',
  'waiting-list': './_waiting-list.js',
};

const platform = {
  'facility-mode': '../server/api/platform-facility-mode.js',
  'ai-insights': '../server/api/platform-ai-insights.js',
  'clinical-ai-cockpit': '../server/api/platform-clinical-ai-cockpit.js',
  'public-booking': '../server/api/public-booking.js',
  'admissions': '../server/api/admissions.js',
  'marketing': '../server/api/marketing.js',
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
    const module = await import(target);
    if (typeof module.default !== 'function') {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'api_handler_invalid' }));
    }
    return module.default(req, res);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'api_gateway_failure', message: error instanceof Error ? error.message : String(error) }));
  }
}
