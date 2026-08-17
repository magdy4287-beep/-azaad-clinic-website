/* AZAAD CLINIC — Patient 360 Check-in Bridge
 * Makes the existing database-enforced front-desk Check-in action visible in Patient 360.
 * The UI never writes booking rows directly; all state changes go through clinic_frontdesk_checkin RPC.
 */
(() => {
  'use strict';

  const STATUS = new Set(['pending', 'confirmed']);
  const NORMALIZE = value => String(value || '').toLowerCase().trim().replaceAll('-', '_').replaceAll(' ', '_');
  const tr = (ar, en) => (document.documentElement.lang || 'ar').toLowerCase().startsWith('en') ? en : ar;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));

  function bookings() {
    return Array.isArray(window.AZAAD_PATIENTS?.state?.bookings) ? window.AZAAD_PATIENTS.state.bookings : [];
  }

  function currentPatientId() {
    const root = document.getElementById('p360Content');
    if (!root) return '';
    const text = root.textContent || '';
    const code = text.match(/AZD-[A-Z0-9-]+/)?.[0] || '';
    const row = bookings().find(b => String(b.booking_code || '') === code);
    return String(row?.patient_id || row?.clinic_patients?.id || '');
  }

  function candidates() {
    const id = currentPatientId();
    if (!id) return [];
    return bookings().filter(b => String(b.patient_id || b.clinic_patients?.id || '') === id && STATUS.has(NORMALIZE(b.status)));
  }

  function bookingCodeFromElement(el) {
    const code = (el.textContent || '').match(/AZD-[A-Z0-9-]+/)?.[0] || '';
    return bookings().find(b => String(b.booking_code || '') === code) || null;
  }

  function style() {
    if (document.getElementById('azaadP360CheckinBridgeStyle')) return;
    const s = document.createElement('style');
    s.id = 'azaadP360CheckinBridgeStyle';
    s.textContent = `
      .azaad-p360-checkin-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:9px 14px;border:0;border-radius:10px;background:#167345;color:#fff;font-weight:800;cursor:pointer;margin:6px 4px 6px 0}
      .azaad-p360-checkin-btn:disabled{opacity:.55;cursor:not-allowed}
      .azaad-p360-checkin-host{margin-top:8px}
      .azaad-p360-checkin-modal{position:fixed;inset:0;z-index:10050;background:rgba(15,25,70,.55);display:flex;align-items:center;justify-content:center;padding:15px}
      .azaad-p360-checkin-box{width:min(560px,100%);background:#fff;border-radius:16px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.22);direction:rtl}
      .azaad-p360-checkin-box textarea{width:100%;min-height:90px;margin:10px 0;padding:10px;border:1px solid #d9deea;border-radius:10px}
      .azaad-p360-checkin-actions{display:flex;gap:8px;flex-wrap:wrap}
    `;
    document.head.appendChild(s);
  }

  async function runCheckin(booking, notes) {
    if (!window.supabase?.rpc) throw new Error(tr('جلسة النظام غير جاهزة. أعد تحميل الصفحة ثم حاول مرة أخرى.', 'The system session is not ready. Reload and try again.'));
    const { data, error } = await window.supabase.rpc('clinic_frontdesk_checkin', {
      p_booking_id: booking.id,
      p_notes: notes || null
    });
    if (error) throw error;
    return data;
  }

  function openDialog(booking, trigger) {
    const existing = document.querySelector('.azaad-p360-checkin-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.className = 'azaad-p360-checkin-modal';
    modal.innerHTML = `<div class="azaad-p360-checkin-box" role="dialog" aria-modal="true">
      <h3>🚪 ${tr('تسجيل دخول المريض','Patient Check-in')}</h3>
      <p><strong>${esc(booking.patient_name || booking.patient_id || '')}</strong></p>
      <p class="muted">📅 ${esc(booking.appointment_date || '')} ⏰ ${esc(String(booking.appointment_time || '').slice(0,5))}</p>
      <textarea placeholder="${tr('ملاحظة الاستقبال (اختياري)','Front desk note (optional)')}"></textarea>
      <div class="azaad-p360-checkin-actions">
        <button type="button" class="btn btn-success" data-confirm>🟢 ${tr('تسجيل الدخول','Check in')}</button>
        <button type="button" class="btn btn-secondary" data-close>${tr('إلغاء','Cancel')}</button>
      </div>
      <div data-result class="azaad-p360-checkin-host"></div>
    </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('[data-close]').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.querySelector('[data-confirm]').onclick = async () => {
      const btn = modal.querySelector('[data-confirm]');
      const result = modal.querySelector('[data-result]');
      btn.disabled = true;
      try {
        const payload = await runCheckin(booking, modal.querySelector('textarea').value);
        result.innerHTML = `<div class="notice">🟢 ${tr('تم تسجيل حضور المريض بنجاح.','Patient checked in successfully.')}<br>${payload?.late_arrival ? '⏰ '+tr('حضور متأخر.','Late arrival.') : ''}<br>🧾 ${tr('الفاتورة','Invoice')}: <strong>${esc(payload?.invoice_number || payload?.invoice_id || '')}</strong></div>`;
        trigger.disabled = true;
        trigger.textContent = `✅ ${tr('تم Check-in','Checked in')}`;
        const b = bookings().find(x => String(x.id) === String(booking.id));
        if (b) {
          b.status = payload?.status || (payload?.late_arrival ? 'checked_in_late' : 'checked_in');
          b.checked_in_at = payload?.checked_in_at || new Date().toISOString();
        }
        setTimeout(() => {
          close();
          window.AZAAD?.refresh?.();
          window.AZAAD_PATIENTS?.refresh?.();
          window.AZAADPatient360?.refresh?.();
        }, 700);
      } catch (error) {
        result.innerHTML = `<div class="error">❌ ${esc(error?.message || tr('تعذر تسجيل الدخول.','Check-in failed.'))}</div>`;
        btn.disabled = false;
      }
    };
  }

  function inject() {
    const root = document.getElementById('p360Content');
    if (!root) return;
    style();
    const list = candidates();
    if (!list.length) return;

    root.querySelectorAll('.azaad-p360-checkin-btn').forEach(x => x.dataset.seen = '1');
    root.querySelectorAll('tr,.p360-row,.item,.card').forEach(container => {
      const booking = bookingCodeFromElement(container);
      if (!booking || !STATUS.has(NORMALIZE(booking.status))) return;
      if (container.querySelector(`.azaad-p360-checkin-btn[data-booking-id="${CSS.escape(String(booking.id))}"]`)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'azaad-p360-checkin-btn';
      button.dataset.bookingId = booking.id;
      button.textContent = `🟢 ${tr('Check-in','Check in')}`;
      button.title = tr('تسجيل حضور المريض','Register patient arrival');
      button.onclick = () => openDialog(booking, button);
      container.appendChild(button);
    });
  }

  function boot() {
    style();
    inject();
    const root = document.getElementById('p360Content');
    if (root && !root.__azaadCheckinObserver) {
      const observer = new MutationObserver(() => inject());
      observer.observe(root, { childList:true, subtree:true });
      root.__azaadCheckinObserver = observer;
    }
    setTimeout(inject, 250);
    setTimeout(inject, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true }); else boot();
  window.AZAADPatient360Checkin = { inject, openDialog };
})();
