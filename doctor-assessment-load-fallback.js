(() => {
  'use strict';
  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_GC253fvQbNBsDOaKjWGRw_tPYJrgLa';
  const ASSESS = `${SUPABASE_URL}/functions/v1/azaad-clinical-assessments`;
  const REST = `${SUPABASE_URL}/rest/v1`;
  const originalFetch = window.fetch.bind(window);

  function loadOperationsCenter() {
    if (document.getElementById('azaadOperationsScript')) return;
    const s = document.createElement('script');
    s.id = 'azaadOperationsScript';
    s.src = './azaad-operations-control-center.js?v=20260819-01';
    s.defer = true;
    document.head.appendChild(s);
  }

  async function loadAssessmentCatalog(init = {}) {
    const authHeader = init?.headers?.Authorization || init?.headers?.authorization || '';
    const token = String(authHeader).replace(/^Bearer\s+/i, '').trim() || window.AZAAD?.state?.session?.access_token || null;
    if (!token) throw new Error('جلسة الطبيب غير موجودة أو منتهية.');
    const headers = { Accept: 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` };
    const [templatesRes, questionsRes] = await Promise.all([
      originalFetch(`${REST}/clinical_assessment_templates?select=id,name,name_ar,active&active=eq.true&order=name`, { headers, cache: 'no-store' }),
      originalFetch(`${REST}/clinical_assessment_questions?select=id,template_id,question_order,question_text,question_text_ar,category,response_type,active,approved,archived_at&active=eq.true&approved=eq.true&archived_at=is.null&order=question_order`, { headers, cache: 'no-store' })
    ]);
    const templates = await templatesRes.json().catch(() => []);
    const questions = await questionsRes.json().catch(() => []);
    if (!templatesRes.ok) throw new Error(templates?.message || templates?.hint || `Templates HTTP ${templatesRes.status}`);
    if (!questionsRes.ok) throw new Error(questions?.message || questions?.hint || `Questions HTTP ${questionsRes.status}`);
    return new Response(JSON.stringify({ templates, questions }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  window.fetch = async function(input, init = {}) {
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      const method = String(init.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase();
      if (url.startsWith(ASSESS) && method === 'GET') {
        const u = new URL(url);
        if (u.searchParams.get('action') === 'templates') {
          try { return await loadAssessmentCatalog(init); }
          catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
        }
      }
    } catch (_) {}
    return originalFetch(input, init);
  };

  loadOperationsCenter();
})();
