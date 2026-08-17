/* AZAAD Doctor Dashboard — interaction reliability layer
 * Keeps the existing clinical authorization boundaries intact while making
 * rendered controls self-checking and connected to the existing Edge Functions.
 */
(() => {
  'use strict';
  const URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const ASSESS = `${URL}/functions/v1/azaad-clinical-assessments`;
  const AI = `${URL}/functions/v1/azaad-doctor-ai`;
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const session = () => window.AZAAD?.state?.session || null;
  const state = { templates: [], questions: [], loadedFor: '' };

  async function request(url, method = 'GET', params = {}, body = null) {
    const s = session();
    if (!s?.access_token) throw new Error('جلسة الطبيب غير موجودة أو منتهية.');
    const u = new globalThis.URL(url);
    Object.entries(params).forEach(([k, v]) => v !== '' && v != null && u.searchParams.set(k, v));
    const r = await fetch(u, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${s.access_token}`, apikey: KEY },
      body: method === 'POST' ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(b?.error || b?.message || `HTTP ${r.status}`);
    return b;
  }

  function setStatus(text, ok = false) {
    const el = $('error');
    if (!el) return;
    el.hidden = false;
    el.textContent = ok ? `✅ ${text}` : `❌ ${text}`;
    el.style.background = ok ? '#e9f9ef' : '#fff0f0';
    el.style.color = ok ? '#087443' : '#a21c1c';
  }

  function workspaceContext() {
    const ws = window.__AZAAD_DOCTOR_WORKSPACE__ || null;
    const p = ws?.patient || null;
    const booking = ws?.__selectedBooking || null;
    return {
      patientId: p?.id || window.__AZAAD_DOCTOR_PATIENT_ID__ || '',
      visitId: ws?.__activeVisitId || window.__AZAAD_DOCTOR_VISIT_ID__ || '',
      bookingId: booking?.id || window.__AZAAD_DOCTOR_BOOKING_ID__ || ''
    };
  }

  function findWorkspaceContextFromDom() {
    const ctx = workspaceContext();
    if (ctx.patientId) return ctx;
    const meta = $('wsMeta')?.textContent || '';
    const ws = window.__AZAAD_DOCTOR_WORKSPACE__;
    if (ws?.patient?.id) return { patientId: ws.patient.id, visitId: ws.__activeVisitId || '', bookingId: ws.__selectedBooking?.id || '' };
    return { patientId: '', visitId: '', bookingId: '' };
  }

  async function loadAssessment() {
    const ctx = findWorkspaceContextFromDom();
    if (!ctx.patientId) {
      setStatus('افتح ملف المريض وابدأ الزيارة أولًا حتى يتم تحميل أسئلة التقييم.', false);
      return;
    }
    const b = await request(ASSESS, 'GET', { action: 'templates' });
    state.templates = b.templates || [];
    state.questions = b.questions || [];
    state.loadedFor = ctx.patientId;
    const select = $('assessmentTemplate');
    if (!select) return;
    select.innerHTML = state.templates.map(t => `<option value="${esc(t.id)}">${esc(t.name_ar || t.name || t.specialty || t.id)}</option>`).join('');
    renderQuestions();
    setStatus('تم تحميل أسئلة التقييم من Clinical Assessment API.', true);
  }

  function renderQuestions() {
    const select = $('assessmentTemplate');
    const root = $('questions');
    if (!select || !root) return;
    const rows = state.questions.filter(q => String(q.template_id) === String(select.value));
    if (!rows.length) {
      root.innerHTML = '<div class="notice">لا توجد أسئلة معتمدة ونشطة لهذا التقييم.</div>';
      return;
    }
    root.innerHTML = rows.map((q, i) => {
      const type = String(q.response_type || 'text').toLowerCase();
      const title = q.question_text_ar || q.question_text || `Question ${i + 1}`;
      if (['boolean','yes_no','true_false'].includes(type)) {
        return `<div class="question"><div class="qmeta">#${i + 1}</div><div class="qtitle">${esc(title)}</div><div class="options"><label class="option"><input required type="radio" name="q_${esc(q.id)}" value="true"> نعم / Yes</label><label class="option"><input required type="radio" name="q_${esc(q.id)}" value="false"> لا / No</label></div></div>`;
      }
      if (['number','numeric','score'].includes(type)) {
        return `<div class="question"><div class="qmeta">#${i + 1}</div><div class="qtitle">${esc(title)}</div><input required name="q_${esc(q.id)}" type="number" step="any" style="padding:10px;border:1px solid #d5dbea;border-radius:10px;width:180px"></div>`;
      }
      return `<div class="question"><div class="qmeta">#${i + 1}</div><div class="qtitle">${esc(title)}</div><textarea required name="q_${esc(q.id)}" class="field textarea" style="width:100%;min-height:80px;padding:10px;border:1px solid #d5dbea;border-radius:10px"></textarea></div>`;
    }).join('');
  }

  async function saveAssessment(event) {
    event.preventDefault();
    const ctx = findWorkspaceContextFromDom();
    const templateId = $('assessmentTemplate')?.value;
    if (!ctx.patientId || !ctx.visitId || !templateId) {
      setStatus('بيانات الزيارة ناقصة. يجب أن تكون الزيارة بدأت قبل حفظ التقييم.', false);
      return;
    }
    const rows = state.questions.filter(q => String(q.template_id) === String(templateId));
    const answers = rows.map(q => {
      const selected = document.querySelector(`[name="q_${CSS.escape(String(q.id))}"]:checked`);
      const input = selected || document.querySelector(`[name="q_${CSS.escape(String(q.id))}"]`);
      const value = input?.value ?? '';
      return { question_id: q.id, response_boolean: value === 'true' ? true : value === 'false' ? false : null, response_text: value === 'true' || value === 'false' ? null : value, is_correct: null };
    });
    if (answers.some(a => a.response_boolean === null && !String(a.response_text || '').trim())) {
      setStatus('يجب الإجابة على جميع أسئلة التقييم قبل الحفظ.', false);
      return;
    }
    const b = await request(ASSESS, 'POST', {}, {
      patient_id: ctx.patientId,
      clinical_visit_id: ctx.visitId,
      template_id: templateId,
      answers,
      clinician_notes: $('assessmentNotes')?.value?.trim() || ''
    });
    setStatus(`تم حفظ التقييم. النتيجة ${b.percentage ?? 0}%`, true);
    renderAssessmentResult(b);
  }

  function renderAssessmentResult(b) {
    const chartText = $('chartText');
    if (chartText) chartText.textContent = `آخر تقييم: ${b.percentage ?? 0}% — ${b.answered_questions ?? 0}/${b.total_questions ?? 0} سؤال.`;
  }

  async function runAI() {
    const ctx = findWorkspaceContextFromDom();
    if (!ctx.patientId) {
      setStatus('افتح ملف المريض أولًا.', false);
      return;
    }
    const out = $('aiResult');
    const button = $('runAiBtn');
    if (button) { button.disabled = true; button.textContent = '⏳ جاري تحليل الحالة...'; }
    if (out) out.innerHTML = '<div class="notice">جاري الاتصال بالمساعد السريري...</div>';
    try {
      const b = await request(AI, 'POST', {}, { patient_id: ctx.patientId });
      if (out) {
        const findings = Array.isArray(b.key_findings_ar) ? b.key_findings_ar : [];
        const risks = Array.isArray(b.risk_flags_ar) ? b.risk_flags_ar : [];
        const questions = Array.isArray(b.suggested_clinician_questions_ar) ? b.suggested_clinician_questions_ar : [];
        out.innerHTML = `<div class="notice"><strong>🧠 الملخص</strong><br>${esc(b.summary_ar || 'لا يوجد ملخص.')}</div><div class="notice"><strong>🔎 أهم النتائج</strong><ul>${findings.map(esc).map(x => `<li>${x}</li>`).join('') || '<li>لا توجد</li>'}</ul></div><div class="notice"><strong>⚠️ إشارات تستحق المراجعة</strong><ul>${risks.map(esc).map(x => `<li>${x}</li>`).join('') || '<li>لا توجد</li>'}</ul></div><div class="notice"><strong>❓ أسئلة مقترحة للطبيب</strong><ul>${questions.map(esc).map(x => `<li>${x}</li>`).join('') || '<li>لا توجد</li>'}</ul></div><div class="muted">${esc(b.evidence_note_ar || '')}</div>`;
      }
      setStatus('تم الاتصال بالمساعد السريري وإظهار النتيجة.', true);
    } catch (e) {
      if (out) out.innerHTML = `<div class="error">${esc(e.message)}</div>`;
      setStatus(`تعذر تشغيل المساعد: ${e.message}`, false);
    } finally {
      if (button) { button.disabled = false; button.textContent = '✨ تحليل الحالة بعد اكتمال التقييم'; }
    }
  }

  function renderFinanceFromWorkspace() {
    const box = $('financeData');
    const ws = window.__AZAAD_DOCTOR_WORKSPACE__;
    if (!box || !ws) return;
    const invoices = Array.isArray(ws.invoices) ? ws.invoices : [];
    const total = invoices.reduce((n, i) => n + Number(i.total_amount ?? i.total ?? 0), 0);
    const paid = invoices.reduce((n, i) => n + Number(i.paid_amount ?? i.paid ?? 0), 0);
    const balance = Math.max(total - paid, 0);
    box.insertAdjacentHTML('beforeend', `<div class="notice" style="margin-top:10px"><b>📊 Financial details</b><br>Invoices: ${invoices.length} · Total: ${total.toFixed(2)} EGP · Paid: ${paid.toFixed(2)} EGP · Balance: ${balance.toFixed(2)} EGP</div>`);
  }

  function addRefreshButton() {
    const head = document.querySelector('#workspace .workspace-head .toolbar');
    if (!head || $('doctorWorkspaceRefreshBtn')) return;
    const b = document.createElement('button');
    b.id = 'doctorWorkspaceRefreshBtn'; b.type = 'button'; b.className = 'btn'; b.textContent = '🔄 تحديث البيانات';
    b.addEventListener('click', async () => {
      const ctx = findWorkspaceContextFromDom();
      if (!ctx.patientId) return setStatus('لا يوجد ملف مريض مفتوح.', false);
      b.disabled = true; b.textContent = '⏳ تحديث...';
      try {
        const r = await request(`${URL}/functions/v1/azaad-doctor-dashboard`, 'GET', { patient_id: ctx.patientId });
        window.__AZAAD_DOCTOR_WORKSPACE__ = r.patient_workspace || null;
        if (typeof window.AZAAD_DOCTOR_RENDER_WORKSPACE === 'function') window.AZAAD_DOCTOR_RENDER_WORKSPACE();
        renderFinanceFromWorkspace();
        setStatus('تم تحديث بيانات المريض والفاتورة والزيارة.', true);
      } catch (e) { setStatus(e.message, false); }
      finally { b.disabled = false; b.textContent = '🔄 تحديث البيانات'; }
    });
    head.prepend(b);
  }

  function observeWorkspace() {
    const root = $('workspace');
    if (!root || root.__reliabilityObserver) return;
    root.__reliabilityObserver = true;
    new MutationObserver(() => {
      addRefreshButton();
      renderFinanceFromWorkspace();
    }).observe(root, { childList: true, subtree: true });
  }

  function bind() {
    const form = $('assessmentForm');
    if (form && !form.dataset.reliabilityBound) { form.dataset.reliabilityBound = '1'; form.addEventListener('submit', saveAssessment, true); }
    const load = $('loadAssessmentBtn');
    if (load && !load.dataset.reliabilityBound) { load.dataset.reliabilityBound = '1'; load.addEventListener('click', () => loadAssessment().catch(e => setStatus(e.message, false)), true); }
    const select = $('assessmentTemplate');
    if (select && !select.dataset.reliabilityBound) { select.dataset.reliabilityBound = '1'; select.addEventListener('change', renderQuestions, true); }
    const ai = $('runAiBtn');
    if (ai && !ai.dataset.reliabilityBound) { ai.dataset.reliabilityBound = '1'; ai.addEventListener('click', () => runAI(), true); }
    addRefreshButton();
    observeWorkspace();
  }

  function init() {
    if (!/doctor-dashboard\.html$/i.test(location.pathname)) return;
    bind();
    setInterval(bind, 800);
    setInterval(() => { if ($('workspace') && !$('workspace').classList.contains('hidden')) renderFinanceFromWorkspace(); }, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
