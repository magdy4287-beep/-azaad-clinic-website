/* AZAAD CLINIC — Patient 360 Check-in UI
   Adds the missing front-desk Check-in action to the Patient 360 appointment view.
   The action calls the existing authenticated azaad-frontdesk-checkin Edge Function;
   it never writes clinic_bookings directly from the browser. */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const CHECKIN_API = `${SUPABASE_URL}/functions/v1/azaad-frontdesk-checkin`;
  const allowedRoles = new Set(['OWNER','ADMIN','MANAGER','SECRETARY','RECEPTION']);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));

  function token() {
    const live = window.AZAAD?.state?.session?.access_token;
    if (live) return live;
    try { return sessionStorage.getItem('azaad_admin_token') || ''; } catch (_) { return ''; }
  }

  function roleAllowed() {
    const role = String(window.AZAAD?.state?.role || window.AZAAD?.state?.currentRole || '').toUpperCase();
    return allowedRoles.has(role);
  }

  function label(status) {
    const s = String(status || '').toLowerCase().replaceAll('-', '_');
    return ['checked_in','in_progress','waiting','arrived'].includes(s);
  }

  function injectButtons() {
    const content = document.getElementById('p360Content');
    if (!content || !roleAllowed()) return;
    const rows = content.querySelectorAll('.p360-row');
    rows.forEach(row => {
      if (row.querySelector('[data-p360-checkin]')) return;
      const text = row.textContent || '';
      if (!text.includes('🔖')) return;
      const appointment = findAppointmentFromText(text);
      if (!appointment?.id) return;
      const action = document.createElement('div');
      action.className = 'p360-checkin-action';
      action.innerHTML = `<button type="button" class="btn btn-success" data-p360-checkin="${esc(appointment.id)}">🟢 Check-in</button>`;
      row.appendChild(action);
      action.querySelector('button').onclick = () => checkin(appointment.id, action.querySelector('button'));
    });
  }

  function findAppointmentFromText(text) {
    const bookingCode = (text.match(/🔖\s*([^\s<]+)/) || [])[1];
    if (!bookingCode) return null;
    const source = window.__AZAAD_P360_BOOKINGS__;
    if (Array.isArray(source)) return source.find(x => String(x.booking_code || x.id || '') === bookingCode) || null;
    return { id: bookingCode };
  }

  async function checkin(bookingId, button) {
    if (!bookingId || !button) return;
    const accessToken = token();
    if (!accessToken) { alert('جلسة الإدارة غير موجودة أو منتهية.'); return; }
    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '⏳ جاري تسجيل الحضور...';
    try {
      const response = await fetch(CHECKIN_API, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: SUPABASE_KEY
        },
        body: JSON.stringify({ booking_id: bookingId })
      });
      let body = {};
      try { body = await response.json(); } catch (_) {}
      if (!response.ok) throw new Error(body?.error || body?.message || `HTTP ${response.status}`);
      button.className = 'btn btn-secondary';
      button.innerHTML = '✅ Checked-in';
      button.disabled = true;
      const host = button.closest('.p360-row');
      if (host && !host.querySelector('.p360-checkin-success')) {
        const note = document.createElement('div');
        note.className = 'p360-checkin-success muted';
        note.textContent = '🛡️ تم تسجيل الحضور عبر Front Desk مع التدقيق والصلاحيات.';
        host.appendChild(note);
      }
      window.dispatchEvent(new CustomEvent('azaad:patient360-checkin-complete', { detail: { bookingId, data: body?.data || null } }));
    } catch (error) {
      button.disabled = false;
      button.innerHTML = original;
      alert(`تعذر تسجيل الحضور: ${error.message}`);
    }
  }

  function observe() {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent || modalContent.__p360CheckinObserver) return;
    modalContent.__p360CheckinObserver = true;
    const observer = new MutationObserver(() => setTimeout(injectButtons, 0));
    observer.observe(modalContent, { childList: true, subtree: true });
    setTimeout(injectButtons, 0);
  }

  function boot() {
    if (!/admin\.html$/i.test(location.pathname)) return;
    observe();
    setInterval(injectButtons, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
