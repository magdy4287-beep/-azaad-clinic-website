/* AZAAD CLINIC — CANONICAL REFUND WORKFLOW UI
 * Every refund: Request -> Doctor Approval -> Management/Owner Approval -> Processing.
 * Canonical runtime: Appwrite session -> /api/invoices?resource=refunds -> Neon.
 * Financial mutations are server-side and fail closed; the browser never receives provider secrets.
 */
(() => {
  'use strict';
  const tr = (ar, en) => (document.documentElement.lang || '').startsWith('en') ? en : ar;
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const endpoint = '/api/invoices?resource=refunds';
  const api = (action, body) => fetch(`${endpoint}&action=${encodeURIComponent(action)}`, { method: 'POST', credentials: 'include', cache: 'no-store', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body || {}) }).then(async r => { const data = await r.json().catch(() => ({})); if (!r.ok) throw new Error(data.error || tr('تعذر تنفيذ العملية.','Refund operation failed.')); return data; });
  const get = () => fetch(endpoint, { credentials: 'include', cache: 'no-store', headers: { accept: 'application/json' } }).then(async r => { const data = await r.json().catch(() => ({})); if (!r.ok) throw new Error(data.error || 'refund_workflow_unavailable'); return data; });
  const toast = (m, error = false) => window.showToast ? window.showToast(m, error ? 'error' : 'success') : console[error ? 'error' : 'log'](m);
  const role = () => String(window.AZAAD?.state?.staff?.role || window.AZAAD?.state?.identity?.role || '').toUpperCase();

  async function requestRefund(bookingId, amount, reason, reasonCode = 'other') {
    if (!bookingId || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !String(reason || '').trim()) throw new Error(tr('الحجز والمبلغ والسبب مطلوبة.','Booking, amount and reason are required.'));
    return api('request', { booking_id: bookingId, amount: Number(amount), reason: String(reason).trim(), reason_code: reasonCode });
  }
  async function approve_refund_doctor(id, note = '') { return api('approve_refund_doctor', { refund_id: id, note }); }
  async function approve_refund_management(id, note = '') { return api('approve_refund_management', { refund_id: id, note }); }
  async function process_refund(id, refundMethod, refundReference = '') { return api('process_refund', { refund_id: id, refund_method: refundMethod, refund_reference: refundReference }); }

  function render(rows) {
    const target = document.querySelector('[data-azaad-refunds]');
    if (!target) return;
    target.innerHTML = rows.map(r => `<div class="item"><div><b>💸 ${esc(r.invoice_number || r.invoice_id)} · ${Number(r.amount || 0).toFixed(2)}</b><div>${esc(r.reason || '')}</div><div class="refund-flow"><span>${r.doctor_approval_status === 'approved' ? '✅' : '⏳'} Doctor</span> → <span>${r.management_approval_status === 'approved' ? '✅' : '⏳'} Management/Owner</span> → <span>${r.status === 'processed' ? '✅' : '🔒'} Processing</span></div></div></div>`).join('') || `<div class="empty">${tr('لا توجد طلبات استرداد.','No refund requests.')}</div>`;
  }
  async function load() { try { const data = await get(); render(Array.isArray(data.refunds) ? data.refunds : []); return data; } catch (e) { toast(e.message || String(e), true); return null; } }
  window.AZAAD_REFUND_WORKFLOW = Object.freeze({ requestRefund, approve_refund_doctor, approve_refund_management, process_refund, load, role });
  window.addEventListener('azaad:admin-authenticated', () => { void load(); }, { once: true });
})();
