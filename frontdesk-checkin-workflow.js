/* AZAAD Front Desk Check-in Workflow
 * Uses the database RPC for check-in; never writes booking/invoice rows directly.
 * The host patient-file UI can call window.AzaadFrontDeskCheckin.open(booking).
 */
(() => {
  'use strict';
  const SUPABASE_URL = window.AZAAD_SUPABASE_URL || 'https://derofsthjivlkcdnojww.supabase.co';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  async function session() {
    if (window.supabase?.auth) return (await window.supabase.auth.getSession()).data.session;
    return window.AZAAD?.state?.session || null;
  }
  async function checkIn(bookingId, notes = '') {
    const s = await session();
    if (!s?.access_token) throw new Error('يجب تسجيل الدخول قبل تنفيذ دخول المريض.');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/clinic_frontdesk_checkin`, {
      method: 'POST',
      headers: {'Content-Type':'application/json','apikey': window.AZAAD_SUPABASE_ANON_KEY || '', 'Authorization': `Bearer ${s.access_token}`},
      body: JSON.stringify({p_booking_id: bookingId, p_notes: notes || null})
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body?.message || body?.hint || body?.error || `Check-in failed (${r.status})`);
    return body;
  }
  function renderInvoice(result, host) {
    host.innerHTML = `<div class="az-checkin-result card"><h3>🟢 تم دخول المريض</h3><p>${result.late_arrival ? '⏰ حضور متأخر — تم السماح بالدخول.' : '🚪 تم تسجيل الحضور.'}</p><p>🧾 الفاتورة: <strong>${esc(result.invoice_number || result.invoice_id)}</strong></p><p>الحالة: <strong>${esc(result.invoice_status || 'open')}</strong></p><button type="button" data-open-invoice>🧾 فتح تفاصيل الفاتورة</button></div>`;
    host.querySelector('[data-open-invoice]').onclick = () => window.dispatchEvent(new CustomEvent('azaad:open-invoice', {detail:{invoiceId:result.invoice_id, bookingId:result.booking_id}}));
  }
  async function open(booking, host = document.body) {
    if (!booking?.id) throw new Error('Booking ID is required.');
    const when = `${booking.appointment_date || ''} ${booking.appointment_time || ''}`.trim();
    const box = document.createElement('div'); box.className = 'az-checkin-panel card';
    box.innerHTML = `<h3>🚪 دخول الموعد</h3><p>📅 ${esc(when || 'موعد')}</p><p>المريض: <strong>${esc(booking.patient_name || booking.patient_id)}</strong></p><p>يمكن تسجيل الدخول قبل الموعد أو بعده. No-show يمكن استعادته إذا حضر فعليًا.</p><textarea rows="3" placeholder="ملاحظة الاستقبال (اختياري)"></textarea><div><button type="button" data-checkin>🟢 تسجيل الدخول</button> <button type="button" data-close>إلغاء</button></div><div data-result></div>`;
    host.appendChild(box);
    box.querySelector('[data-close]').onclick = () => box.remove();
    box.querySelector('[data-checkin]').onclick = async () => { const btn = box.querySelector('[data-checkin]'); btn.disabled = true; try { renderInvoice(await checkIn(booking.id, box.querySelector('textarea').value), box.querySelector('[data-result]')); } catch (e) { box.querySelector('[data-result]').innerHTML = `<div class="error">❌ ${esc(e.message)}</div>`; btn.disabled = false; } };
    return box;
  }
  window.AzaadFrontDeskCheckin = {open, checkIn};
})();