/* AZAAD CLINIC — DOCTOR ↔ STAFF BINDING OVERLAY
 * Loads into the existing admin staff panel when injected by patch-admin.py.
 * Uses the existing staff-admin Edge Function; no service-role key.
 */
(() => {
  'use strict';
  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const API = `${SUPABASE_URL}/functions/v1/staff-admin`;
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const role = v => String(v || '').trim().toUpperCase();

  async function call(action, payload = {}) {
    const session = window.AZAAD?.state?.session;
    if (!session?.access_token) throw new Error('جلسة الإدارة غير موجودة أو منتهية.');
    const r = await fetch(API, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type':'application/json', Accept:'application/json', Authorization:`Bearer ${session.access_token}`, apikey:PUBLISHABLE_KEY },
      body: JSON.stringify({ action, ...payload })
    });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(b?.error || b?.message || `HTTP ${r.status}`);
    return b;
  }

  function install() {
    const panel = $('staff');
    if (!panel || $('doctorStaffBindingCenter')) return;

    const host = document.createElement('div');
    host.id = 'doctorStaffBindingCenter';
    host.className = 'card';
    host.style.cssText = 'margin-top:15px;direction:rtl';
    host.innerHTML = `
      <div class="panel-head">
        <div>
          <h3 style="margin-bottom:6px">🆔 Doctor ↔ Staff Binding</h3>
          <div class="muted">ربط حساب DOCTOR بطبيب موجود بالفعل بدون إنشاء سجل طبيب مكرر.</div>
        </div>
        <button id="dsbRefresh" class="btn btn-secondary" type="button">🔄 تحديث</button>
      </div>
      <div id="dsbMessage" class="muted" style="margin:10px 0"></div>
      <div id="dsbList" class="items"></div>
    `;
    panel.appendChild(host);
    $('dsbRefresh').onclick = load;
    load();
  }

  async function load() {
    const list = $('dsbList');
    const message = $('dsbMessage');
    if (!list) return;
    list.innerHTML = '<div class="empty">⏳ جاري تحميل ربط الأطباء...</div>';
    try {
      const result = await call('list');
      const staff = Array.isArray(result?.staff) ? result.staff : [];
      const doctors = Array.isArray(result?.doctors) ? result.doctors.filter(x => x.active !== false) : [];
      const doctorMap = new Map(doctors.map(x => [String(x.id), x]));
      const doctorsInUse = new Set(staff.filter(x => x.active && x.doctor_id).map(x => String(x.doctor_id)));
      const doctorStaff = staff.filter(x => role(x.role) === 'DOCTOR');
      message.textContent = `${doctorStaff.length} حساب DOCTOR · ${doctors.length} طبيب نشط`;
      list.innerHTML = doctorStaff.length ? doctorStaff.map(x => {
        const d = doctorMap.get(String(x.doctor_id));
        return `<div class="item">
          <div><strong>🧑‍⚕️ ${esc(x.full_name || x.username)}</strong>
            <div class="muted">🔑 ${esc(x.username || '—')} · ${d ? esc(d.name_en || d.name) : '⚠️ غير مرتبط'}</div>
          </div>
          <button class="btn btn-secondary" type="button" data-dsb-edit="${esc(x.id)}">✍️ تعديل الربط</button>
        </div>`;
      }).join('') : '<div class="empty">📭 لا توجد حسابات DOCTOR مرتبطة حتى الآن.</div>';
      list.querySelectorAll('[data-dsb-edit]').forEach(b => b.onclick = () => openBinding(b.dataset.dsbEdit, staff, doctors, doctorsInUse));
    } catch (e) {
      list.innerHTML = `<div class="error">❌ ${esc(e.message)}</div>`;
    }
  }

  function openBinding(staffId, staff, doctors, doctorsInUse) {
    const target = staff.find(x => String(x.id) === String(staffId));
    if (!target) return;
    const current = String(target.doctor_id || '');
    const available = doctors.filter(d => !doctorsInUse.has(String(d.id)) || String(d.id) === current);
    const options = available.map(d => `<option value="${esc(d.id)}" ${String(d.id) === current ? 'selected' : ''}>${esc(d.name_en || d.name)} — ${esc(d.title_en || d.title || '')}</option>`).join('');
    const modal = document.createElement('div');
    modal.id = 'dsbModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(10,18,45,.68);display:flex;align-items:center;justify-content:center;padding:20px;direction:rtl';
    modal.innerHTML = `<div style="width:min(600px,100%);background:#fff;border-radius:20px;padding:24px">
      <h2>🆔 ربط الطبيب بحساب الموظف</h2>
      <p><strong>👤 ${esc(target.full_name)}</strong></p>
      <label>🧑‍⚕️ الطبيب الموجود
        <select id="dsbDoctor" required><option value="">اختر الطبيب</option>${options}</select>
      </label>
      <div class="muted" style="line-height:1.8;margin-top:10px">🔐 لا يتم إنشاء طبيب جديد. يتم حفظ doctor_id على حساب الموظف وربطه بسجل clinic_doctors الموجود.</div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px">
        <button id="dsbCancel" class="btn btn-secondary" type="button">إلغاء</button>
        <button id="dsbSave" class="btn btn-primary" type="button">💾 حفظ الربط</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    $('dsbCancel').onclick = () => modal.remove();
    $('dsbSave').onclick = async () => {
      const doctorId = $('dsbDoctor').value;
      if (!doctorId) return;
      $('dsbSave').disabled = true;
      $('dsbSave').textContent = '⏳ جاري الحفظ...';
      try {
        await call('update', { staff_id: target.id, full_name: target.full_name, email: target.email, phone: target.phone, role:'DOCTOR', doctor_id:doctorId });
        modal.remove();
        await load();
        window.dispatchEvent(new CustomEvent('azaadDoctorStaffBindingChanged', { detail:{ staffId:target.id, doctorId } }));
      } catch (e) {
        alert(`❌ ${e.message}`);
        $('dsbSave').disabled = false;
        $('dsbSave').textContent = '💾 حفظ الربط';
      }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(install, 500), { once:true });
  else setTimeout(install, 500);
  window.AZAAD_DOCTOR_STAFF_BINDING = { load, install };
})();
