import facilityMode from '../../server/api/platform-facility-mode.js';
import aiInsights from '../../server/api/platform-ai-insights.js';
import clinicalAiCockpit from '../../server/api/platform-clinical-ai-cockpit.js';
import publicBooking from '../../server/api/public-booking.js';
import marketing from '../../server/api/marketing.js';

const ROUTES = new Map([
  ['facility-mode', facilityMode],
  ['ai-insights', aiInsights],
  ['clinical-ai-cockpit', clinicalAiCockpit],
  ['public-booking', publicBooking],
  ['marketing', marketing],
]);

export default async function handler(req, res) {
  const raw = req.query?.route ?? new URL(req.url || '/', 'https://azaad.invalid').pathname.split('/').filter(Boolean).at(-1);
  const route = Array.isArray(raw) ? raw[0] : String(raw || '');
  const target = ROUTES.get(route);
  if (!target) {
    res.statusCode = 404;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'platform_route_not_found' }));
  }
  return target(req, res);
}
