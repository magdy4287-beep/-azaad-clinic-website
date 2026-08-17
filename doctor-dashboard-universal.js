/* AZAAD Doctor Dashboard — universal doctor/profile reliability layer
 * Rules:
 * - Never hard-code a doctor name in a shared clinical UI.
 * - Active doctors may use their own authenticated clinical workspace.
 * - Historical/inactive doctor records remain displayable to authorized staff, but
 *   an inactive doctor must not gain clinical write access merely by being displayed.
 * - Tabs are resilient to rerendering and language changes.
 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const lang = () => (document.documentElement.lang || localStorage.getItem('azaad_language') || 'ar').toLowerCase();
  const isEn = () => lang().startsWith('en');
  const tr = (ar, en) => isEn() ? en : ar;

  function currentDoctorName() {
    const ws = window.__AZAAD_DOCTOR_WORKSPACE__ || {};
    const b = ws.__selectedBooking || window.__AZAAD_SELECTED_BOOKING__ || {};
    return b.doctor_name || b.doctor?.name || ws.doctor_name || ws.doctor?.name || '';
  }

  function patchDoctorLabels() {
    const name = currentDoctorName();
    if (!name) return;
    document.querySelectorAll('.status-pill.sent, [data-doctor-routing-label]').forEach(el => {
      el.textContent = `🧑‍⚕️ ${tr('تم الإرسال إلى','Sent to ')}${name} ✅`;
    });
  }

  function bindTabs() {
    document.querySelectorAll('.tabs .tab[data-panel]').forEach(btn => {
      if (btn.dataset.universalTab === '1') return;
      btn.dataset.universalTab = '1';
      btn.addEventListener('click', () => {
        const id = btn.dataset.panel;
        document.querySelectorAll('.tabs .tab[data-panel]').forEach(x => x.classList.toggle('active', x === btn));
        document.querySelectorAll('.panel[id]').forEach(x => x.classList.toggle('active', x.id === id));
      }, true);
    });

    document.querySelectorAll('#wsTabs .tab[data-ws]').forEach(btn => {
      if (btn.dataset.universalWsTab === '1') return;
      btn.dataset.universalWsTab = '1';
      btn.addEventListener('click', () => {
        const id = `ws-${btn.dataset.ws}`;
        document.querySelectorAll('#wsTabs .tab[data-ws]').forEach(x => x.classList.toggle('active', x === btn));
        document.querySelectorAll('.ws-panel[id]').forEach(x => x.classList.toggle('hidden', x.id !== id));
      }, true);
    });
  }

  function bindResilientActions() {
    // These are safe UI-only fallbacks. Existing handlers keep ownership of API mutations.
    const back = $('backWorkspace');
    if (back && back.dataset.universalAction !== '1') {
      back.dataset.universalAction = '1';
      back.addEventListener('click', () => {
        $('workspace')?.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, true);
    }

    const prev = $('prevDate');
    const next = $('nextDate');
    const date = $('scheduleDate');
    if (date && prev && prev.dataset.universalDate !== '1') {
      prev.dataset.universalDate = '1';
      prev.addEventListener('click', () => { if (date.value) { const d=new Date(`${date.value}T12:00:00`); d.setDate(d.getDate()-1); date.value=d.toISOString().slice(0,10); date.dispatchEvent(new Event('change',{bubbles:true})); } }, true);
    }
    if (date && next && next.dataset.universalDate !== '1') {
      next.dataset.universalDate = '1';
      next.addEventListener('click', () => { if (date.value) { const d=new Date(`${date.value}T12:00:00`); d.setDate(d.getDate()+1); date.value=d.toISOString().slice(0,10); date.dispatchEvent(new Event('change',{bubbles:true})); } }, true);
    }
  }

  function publishContext() {
    // Keep the shared layer informed after the native dashboard renders a workspace.
    const ws = window.__AZAAD_DOCTOR_WORKSPACE__;
    if (ws && !ws.__universalProxy) {
      try {
        Object.defineProperty(ws, '__universalProxy', { value: true, enumerable: false });
      } catch (_) {}
    }
    patchDoctorLabels();
  }

  function init() {
    if (!/doctor-dashboard\.html$/i.test(location.pathname)) return;
    bindTabs();
    bindResilientActions();
    publishContext();
  }

  init();
  const observer = new MutationObserver(() => { bindTabs(); bindResilientActions(); publishContext(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('languagechange', () => { bindTabs(); bindResilientActions(); patchDoctorLabels(); });
  window.addEventListener('storage', () => { bindTabs(); patchDoctorLabels(); });
  setInterval(() => { bindTabs(); bindResilientActions(); patchDoctorLabels(); }, 1000);
})();
