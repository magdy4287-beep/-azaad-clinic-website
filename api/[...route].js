const handlers = {
  'admin-auth': () => import('../server/admin-auth.js'),
  'admin-appointments': () => import('../server/admin-appointments.js'),
  'admissions': () => import('../server/admissions.js'),
  'clinical-assessments': () => import('../server/clinical-assessments.js'),
  'emergency-department': () => import('../server/emergency-department.js'),
  'icu': () => import('../server/icu.js'),
  'insurance-admission': () => import('../server/insurance-admission.js'),
  'invoices': () => import('../server/invoices.js'),
  'marketing': () => import('../server/marketing.js'),
  'nursing': () => import('../server/nursing.js'),
  'patient-financial-summary': () => import('../server/patient-financial-summary.js'),
  'pharmacy': () => import('../server/pharmacy.js'),
  'public-clinic-data': () => import('../server/public-clinic-data.js'),
  'public-scheduling': () => import('../server/public-scheduling.js'),
  'public-team-admin': () => import('../server/public-team-admin.js'),
  'purchases': () => import('../server/purchases.js'),
  'staff-admin': () => import('../server/staff-admin.js'),
  'waiting-list': () => import('../server/waiting-list.js'),
};

const aliases = {
  'runtime-health': ['admin-auth', 'runtime-health'],
  'frontdesk-checkin': ['clinical-assessments', 'check-in'],
};

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  return res.end(JSON.stringify(body));
}

function routeFromRequest(req) {
  const url = new URL(req.url || '/', `https://${req.headers?.host || 'azaad.invalid'}`);
  const parts = url.pathname.split('/').filter(Boolean);
  return { url, route: parts[0] === 'api' ? parts[1] || '' : parts.at(-1) || '' };
}

export default async function handler(req, res) {
  try {
    const { url, route: rawRoute } = routeFromRequest(req);
    const alias = aliases[rawRoute];
    const route = alias ? alias[0] : rawRoute;
    const load = handlers[route];
    if (!load) return json(res, 404, { error: 'platform_route_not_found' });
    if (alias) url.searchParams.set('action', alias[1]);
    req.url = `${url.pathname}${url.search}`;
    const module = await load();
    return module.default(req, res);
  } catch (error) {
    console.error('AZAAD platform gateway failure', { name: error?.name, message: error?.message });
    return json(res, 503, { error: 'platform_gateway_unavailable' });
  }
}
