/* AZAAD Doctor Dashboard — universal doctor/profile reliability layer */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const lang = () => (document.documentElement.lang || localStorage.getItem('azaad_language') || 'ar').toLowerCase();
  const isEn = () => lang().startsWith('en');
  const tr = (ar, en) => isEn() ? en : ar;

  function currentDoctorName() {
    const ws = window.__AZAAD_DOCTOR_WORKSPACE__ || {};
    const b = ws.__selectedBooking || window.__AZAAD_SELECTED_BOOKING__ || {};
    const identity = $('identity')?.textContent?.trim() || '';
    return b.doctor_name || b.doctor?.name || ws.doctor_name || ws.doctor?.name || identity.replace(/^.*?:\s*/,'').trim();
  }

  function patchDoctorLabels() {
    const name = currentDoctorName();
    if (!name || /جاري التحقق|verifying/i.test(name)) return;
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
    const back = $('backWorkspace');
    if (back && back.dataset.universalAction !== '1') {
      back.dataset.universalAction = '1';
      back.addEventListener('click', () => {
        $('workspace')?.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, true);
    }
    const prev = $('prevDate'), next = $('nextDate'), date = $('scheduleDate');
    if (date && prev && prev.dataset.universalDate !== '1') {
      prev.dataset.universalDate = '1';
      prev.addEventListener('click', () => { if (date.value) { const d=new Date(`${date.value}T12:00:00`); d.setDate(d.getDate()-1); date.value=d.toISOString().slice(0,10); date.dispatchEvent(new Event('change',{bubbles:true})); } }, true);
    }
    if (date && next && next.dataset.universalDate !== '1') {
      next.dataset.universalDate = '1';
      next.addEventListener('click', () => { if (date.value) { const d=new Date(`${date.value}T12:00:00`); d.setDate(d.getDate()+1); date.value=d.toISOString().slice(0,10); date.dispatchEvent(new Event('change',{bubbles:true})); } }, true);
    }
  }

  function init() {
    if (!/doctor-dashboard\.html$/i.test(location.pathname)) return;
    bindTabs(); bindResilientActions(); patchDoctorLabels();
    const observer = new MutationObserver(() => { bindTabs(); bindResilientActions(); patchDoctorLabels(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('languagechange', () => { bindTabs(); bindResilientActions(); patchDoctorLabels(); });
    window.addEventListener('storage', () => { bindTabs(); patchDoctorLabels(); });
    setInterval(() => { bindTabs(); bindResilientActions(); patchDoctorLabels(); }, 1000);
  }
  init();
})();
