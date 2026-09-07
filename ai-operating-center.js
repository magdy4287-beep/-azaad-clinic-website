/* AZAAD CLINIC — AI Operating Center
   Cross-department, free-first advisory layer.
   Core workflows never depend on this module.
   Runtime data boundary: Appwrite session + Neon local rules engine.
*/
(() => {
  'use strict';

  const FUNCTION = '/api/ai-insights';
  const ROLES = [
    ['frontdesk', '🧑‍💼', 'Front Desk Supervisor', 'Secretary workflow, required fields, duplicate warnings, follow-up and no-show queues.'],
    ['doctor', '🧑‍⚕️', 'Doctor Copilot', 'Visit preparation, progress trends, documentation prompts and follow-up suggestions.'],
    ['patient360', '🤢', 'Patient 360 Assistant', 'Appointments, visits, billing, follow-up and operational warnings in one view.'],
    ['scheduling', '📅', 'Scheduling Supervisor', 'Capacity, conflicts, utilization and follow-up scheduling suggestions.'],
    ['rcm', '🧾', 'RCM Team', 'Outstanding invoices, collections priorities, billing QA and reconciliation signals.'],
    ['finance', '💰', 'Finance Team', 'Revenue, collections, expenses, cash-flow and reconciliation insights.'],
    ['hr', '👥', 'HR Team', 'Staff KPIs, document reminders, compensation signals and workforce planning.'],
    ['management', '📊', 'Executive Management', 'Daily/weekly/monthly operational, financial and quality briefings.'],
    ['marketing', '📣', 'Marketing Team', 'Campaign ideas, content planning, leads, offers and performance signals.'],
    ['security', '🛡️', 'Security Analyst', 'Security-event grouping, anomaly summaries and investigation priorities.']
  ];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
  const english = () => String(document.documentElement.lang || '').toLowerCase().startsWith('en');
  const text = (ar, en) => english() ? en : ar;

  async function insights() {
    try {
      const response = await fetch(FUNCTION, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return { insights: [], fallback: true };
      return body;
    } catch (_) {
      return { insights: [], fallback: true };
    }
  }

  function styles() {
    if (document.getElementById('azaadAiOperatingStyles')) return;
    const style = document.createElement('style');
    style.id = 'azaadAiOperatingStyles';
    style.textContent = `
      #azaadAiOperatingCenter{margin-top:16px}
      #azaadAiOperatingCenter .ai-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      #azaadAiOperatingCenter .ai-role{border:1px solid #e3e7ef;border-radius:16px;background:#fff;padding:15px;display:flex;gap:13px;align-items:flex-start}
      #azaadAiOperatingCenter .ai-icon{font-size:28px;line-height:1}
      #azaadAiOperatingCenter .ai-role h4{margin:0 0 5px;color:#17214f}
      #azaadAiOperatingCenter .ai-role p{margin:0;color:#69738b;font-size:12px;line-height:1.7}
      #azaadAiOperatingCenter .ai-status{margin-top:8px;font-size:11px;font-weight:800;color:#26734d}
      #azaadAiOperatingCenter .ai-insights{display:grid;gap:9px;margin-top:14px}
      #azaadAiOperatingCenter .ai-insight{border-radius:12px;border:1px solid #e5e8ef;padding:11px;background:#fbfcff}
      #azaadAiOperatingCenter .ai-insight b{color:#17214f}
      #azaadAiOperatingCenter .ai-empty{padding:18px;text-align:center;color:#737d94;background:#f7f8fb;border-radius:12px}
      #azaadAiOperatingCenter .ai-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
      @media(max-width:800px){#azaadAiOperatingCenter .ai-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function mount() {
    if (!document.querySelector('.admin') || document.getElementById('azaadAiOperatingCenter')) return;
    const host = document.createElement('section');
    host.id = 'azaadAiOperatingCenter';
    host.className = 'panel';
    host.innerHTML = `<div class="card">
      <div class="ai-head">
        <div><h2>🧠 ${text('نظام الذكاء الاصطناعي التشغيلي','AI Operating System')}</h2><div class="muted">${text('مساعد استشاري لكل قسم — التشغيل الأساسي لا يعتمد عليه.','Advisory assistants for every department — core operations never depend on AI.')}</div></div>
        <button id="azaadAiRefresh" class="btn btn-secondary" type="button">🔄 ${text('تحديث الرؤى','Refresh Insights')}</button>
      </div>
      <div class="ai-grid" id="azaadAiRoles"></div>
      <div class="ai-insights" id="azaadAiInsights"><div class="ai-empty">🧠 ${text('جاري تحميل الرؤى...','Loading insights...')}</div></div>
    </div>`;
    document.querySelector('.admin').appendChild(host);
    const roles = document.getElementById('azaadAiRoles');
    roles.innerHTML = ROLES.map(([id, icon, title, desc]) => `<article class="ai-role" data-ai-role="${id}"><div class="ai-icon">${icon}</div><div><h4>${esc(title)}</h4><p>${esc(desc)}</p><div class="ai-status">🟢 ${text('مساعد استشاري — موافقة بشرية مطلوبة','Advisory — human approval required')}</div></div></article>`).join('');
    document.getElementById('azaadAiRefresh').addEventListener('click', refresh);
    refresh();
  }

  async function refresh() {
    const box = document.getElementById('azaadAiInsights');
    if (!box) return;
    box.innerHTML = `<div class="ai-empty">⏳ ${text('جاري تحليل البيانات المتاحة...','Analyzing available data...')}</div>`;
    const result = await insights();
    const list = Array.isArray(result?.insights) ? result.insights : [];
    if (!list.length) {
      box.innerHTML = `<div class="ai-empty">🟢 ${text('لا توجد رؤى جديدة. التشغيل الأساسي مستمر بدون AI.','No new insights. Core operations continue without AI.')}</div>`;
      return;
    }
    box.innerHTML = list.slice(0, 20).map(item => `<article class="ai-insight"><b>🧠 ${esc(item.title_en || item.title_ar || item.title || 'Smart Insight')}</b><div class="muted">${esc(english() ? (item.summary_en || item.summary_ar || '') : (item.summary_ar || item.summary_en || ''))}</div><div>💡 ${esc(english() ? (item.recommendation_en || item.recommendation_ar || '') : (item.recommendation_ar || item.recommendation_en || ''))}</div><small class="muted">${esc(item.severity || item.priority || 'info')}</small></article>`).join('');
  }

  function boot() {
    styles();
    mount();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.AZAAD_AI_OPERATING_CENTER = { refresh, roles: ROLES };
})();
