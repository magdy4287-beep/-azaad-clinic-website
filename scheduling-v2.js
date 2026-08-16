/* ============================================================
   AZAAD CLINIC — SCHEDULING V2 UI
   Central Calendar / Doctor Schedule / Waiting List
   All mutations go through azaad-appointments-actions.
   No direct booking writes are performed here.
   ============================================================ */
(function () {
  'use strict';

  const state = {
    date: new Date().toISOString().slice(0, 10),
    view: 'day',
    doctorId: '',
    doctors: [],
    services: [],
    bookings: [],
    schedules: [],
    overrides: [],
    waiting: [],
    patients: [],
  };

  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));

  const qs = (id) => document.getElementById(id);
  const today = () => new Date().toISOString().slice(0, 10);

  function toast(message, error = false) {
    if (typeof window.AZAAD?.toast === 'function') return window.AZAAD.toast(message, error);
    const el = document.createElement('div');
    el.textContent = message;
    el.style.cssText = `position:fixed;z-index:99999;bottom:20px;left:20px;right:20px;max-width:620px;margin:auto;padding:13px 17px;border-radius:10px;background:${error ? '#a32939' : '#17214f'};color:#fff;text-align:center`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function panel() {
    if (qs('azaadSchedulingV2')) return qs('azaadSchedulingV2');
    const tabs = document.querySelector('.tabs');
    if (tabs) {
      const tab = document.createElement('button');
      tab.className = 'tab';
      tab.dataset.panel = 'azaadSchedulingV2';
      tab.type = 'button';
      tab.textContent = '📅 Schedule V2';
      tabs.appendChild(tab);
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
        document.querySelectorAll('.panel').forEach((x) => x.classList.remove('active'));
        tab.classList.add('active');
        root.classList.add('active');
        refresh();
      });
    }

    const root = document.createElement('section');
    root.id = 'azaadSchedulingV2';
    root.className = 'panel';
    root.innerHTML = `
      <div class="card">
        <div class="panel-head">
          <div>
            <h2>📅 Central Scheduling</h2>
            <div class="muted">🧑‍⚕️ الأطباء • 🟢 المتاح • 🔵 مؤكد • 🟡 انتظار • 🟠 No-show • 🔴 ملغي • ⏳ Waiting List</div>
          </div>
          <div class="top-actions">
            <button id="sv2Today" class="btn btn-secondary" type="button">📅 اليوم</button>
            <button id="sv2Refresh" class="btn btn-secondary" type="button">🔄 تحديث</button>
          </div>
        </div>
        <div class="filters" style="grid-template-columns:150px 1fr 220px 160px">
          <select id="sv2View">
            <option value="day">يوم</option>
            <option value="week">أسبوع</option>
            <option value="month">شهر</option>
          </select>
          <input id="sv2Date" type="date">
          <select id="sv2Doctor"><option value="">كل الأطباء</option></select>
          <button id="sv2Add" class="btn btn-primary" type="button">➕ إضافة موعد</button>
        </div>
        <div id="sv2Grid"></div>
      </div>
      <div class="card">
        <div class="panel-head">
          <div>
            <h2>⏳ Waiting List</h2>
            <div class="muted">قائمة انتظار مرتبطة بالمريض والطبيب والخدمة والأولوية.</div>
          </div>
          <button id="sv2WaitingAdd" class="btn btn-primary" type="button">➕ إضافة انتظار</button>
        </div>
        <div id="sv2Waiting"></div>
      </div>`;
    document.querySelector('#bookings')?.parentElement?.appendChild(root);

    qs('sv2Date').value = state.date;
    qs('sv2View').value = state.view;
    qs('sv2Doctor').value = state.doctorId;
    qs('sv2Date').onchange = () => { state.date = qs('sv2Date').value || today(); refresh(); };
    qs('sv2View').onchange = () => { state.view = qs('sv2View').value; refresh(); };
    qs('sv2Doctor').onchange = () => { state.doctorId = qs('sv2Doctor').value; render(); };
    qs('sv2Today').onclick = () => { state.date = today(); qs('sv2Date').value = state.date; refresh(); };
    qs('sv2Refresh').onclick = refresh;
    qs('sv2Add').onclick = () => bookingModal();
    qs('sv2WaitingAdd').onclick = () => waitingModal();
    return root;
  }

  async function db(table, columns = '*', filter = null) {
    const client = window.AZAAD?.supabase;
    if (!client) throw new Error('Supabase client غير متاح.');
    let q = client.from(table).select(columns);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  function rangeForView() {
    const d = new Date(`${state.date}T12:00:00`);
    if (state.view === 'month') {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return [iso(start), iso(end)];
    }
    if (state.view === 'week') {
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return [iso(start), iso(end)];
    }
    return [state.date, state.date];
  }

  function iso(d) { return d.toISOString().slice(0, 10); }
  function labelDate(v) { return new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${v}T12:00:00`)); }
  function time(v) { return String(v || '').slice(0, 5); }

  async function refresh() {
    panel();
    const [from, to] = rangeForView();
    try {
      const doctorFilter = state.doctorId ? (q) => q.eq('id', state.doctorId) : null;
      state.doctors = await db('clinic_doctors', 'id,name,title,image_url,active', doctorFilter);
      state.doctors = state.doctors.filter((d) => d.active !== false);
      state.services = await db('clinic_services', 'id,name,duration_minutes,active', (q) => q.eq('active', true));
      state.bookings = await db('clinic_bookings', 'id,booking_code,doctor_id,service_id,patient_id,patient_name,patient_phone,appointment_date,appointment_time,status,mode,notes', (q) => q.gte('appointment_date', from).lte('appointment_date', to));
      if (state.doctorId) state.bookings = state.bookings.filter((b) => String(b.doctor_id) === String(state.doctorId));
      state.schedules = await db('doctor_weekly_schedules', 'doctor_id,weekday,enabled,start_time,end_time,break_start,break_end,slot_minutes,buffer_minutes,max_daily_bookings');
      state.overrides = await db('doctor_schedule_overrides', 'doctor_id,override_date,type,start_time,end_time,break_start,break_end,slot_minutes,max_daily_bookings', (q) => q.gte('override_date', from).lte('override_date', to));
      state.waiting = await db('clinic_waiting_list', 'id,patient_id,doctor_id,preferred_doctor_id,alternative_doctor_ids,service_id,requested_date,preferred_start_time,preferred_end_time,priority,reason,patient_phone_snapshot,status,position,source,notes,created_at', (q) => q.in('status', ['waiting', 'pending', 'active']).order('position', { ascending: true }));
      renderDoctorsFilter();
      render();
    } catch (error) {
      renderError(error);
      console.error('[Azaad Scheduling V2]', error);
    }
  }

  function renderDoctorsFilter() {
    const select = qs('sv2Doctor');
    if (!select) return;
    select.innerHTML = `<option value="">كل الأطباء</option>` + state.doctors.map((d) => `<option value="${esc(d.id)}">${esc(d.name || d.title || 'طبيب')}</option>`).join('');
    select.value = state.doctorId;
  }

  function statusClass(status) {
    return ({ confirmed: 'confirmed', pending: 'pending', cancelled: 'cancelled', completed: 'completed', no_show: 'cancelled' })[String(status || '').toLowerCase()] || 'pending';
  }

  function statusLabel(status) {
    return ({ confirmed: '🔵 مؤكد', pending: '🟡 قيد التأكيد', cancelled: '🔴 ملغي', completed: '✅ مكتمل', no_show: '🟠 No-show' })[String(status || '').toLowerCase()] || '🟡 غير محدد';
  }

  function scheduleFor(doctorId, date) {
    const d = new Date(`${date}T12:00:00`);
    const override = state.overrides.find((x) => String(x.doctor_id) === String(doctorId) && x.override_date === date);
    if (override) return override.type === 'closed' ? null : override;
    const row = state.schedules.find((x) => String(x.doctor_id) === String(doctorId) && Number(x.weekday) === d.getDay() && x.enabled !== false);
    return row || null;
  }

  function slotsFor(doctorId, date) {
    const schedule = scheduleFor(doctorId, date);
    if (!schedule || !schedule.start_time || !schedule.end_time) return [];
    const step = Number(schedule.slot_minutes || 30);
    const out = [];
    let cur = minutes(schedule.start_time);
    const end = minutes(schedule.end_time);
    const bs = schedule.break_start ? minutes(schedule.break_start) : null;
    const be = schedule.break_end ? minutes(schedule.break_end) : null;
    while (cur < end) {
      if (!(bs !== null && be !== null && cur >= bs && cur < be)) out.push(toTime(cur));
      cur += step + Number(schedule.buffer_minutes || 0);
    }
    return out;
  }

  function minutes(v) { const [h, m] = time(v).split(':').map(Number); return (h * 60) + m; }
  function toTime(n) { return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; }

  function render() {
    const grid = qs('sv2Grid');
    if (!grid) return;
    if (state.view === 'month') return renderMonth(grid);
    if (state.view === 'week') return renderWeek(grid);
    grid.innerHTML = `<div class="muted" style="margin-bottom:10px">📅 ${esc(labelDate(state.date))}</div>` + state.doctors.map((d) => renderDoctorDay(d, state.date)).join('');
    renderWaiting();
  }

  function renderDoctorDay(doctor, date) {
    const slots = slotsFor(doctor.id, date);
    const bookings = state.bookings.filter((b) => String(b.doctor_id) === String(doctor.id) && b.appointment_date === date);
    const max = scheduleFor(doctor.id, date)?.max_daily_bookings;
    return `<div class="schedule-day">
      <div class="schedule-head"><div><strong>🧑‍⚕️ ${esc(doctor.name || 'طبيب')}</strong><div class="muted">${esc(doctor.title || '')} ${max ? `• الحد اليومي ${esc(max)}` : ''}</div></div><button class="btn btn-secondary" type="button" data-doctor-view="${esc(doctor.id)}">📅 مواعيد الطبيب</button></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;margin-top:12px">
        ${slots.length ? slots.map((slot) => renderSlot(doctor, date, slot, bookings)).join('') : `<div class="empty" style="grid-column:1/-1">⚫ لا توجد ساعات عمل لهذا اليوم.</div>`}
      </div>
    </div>`;
  }

  function renderSlot(doctor, date, slot, bookings) {
    const booking = bookings.find((b) => time(b.appointment_time) === slot && !['cancelled'].includes(String(b.status).toLowerCase()));
    if (!booking) return `<button class="btn btn-secondary" style="text-align:right;min-height:76px" type="button" data-book-slot="${esc(doctor.id)}" data-book-date="${esc(date)}" data-book-time="${esc(slot)}"><strong>🟢 ${esc(to12(slot))}</strong><div class="muted">متاح • + إضافة موعد</div></button>`;
    return `<div style="border:1px solid #e1e5ed;border-radius:12px;padding:10px;background:#fff"><div><strong>${esc(to12(slot))}</strong> ${statusLabel(booking.status)}</div><div style="font-weight:700;margin-top:5px">🤢 ${esc(booking.patient_name || 'مريض')}</div><div class="muted">${esc(booking.booking_code || '')} • ${esc(booking.patient_phone || '')}</div><div class="item-actions" style="margin-top:8px"><button class="btn btn-secondary" type="button" data-edit-booking="${esc(booking.id)}">✍️ إدارة</button></div></div>`;
  }

  function renderWeek(grid) {
    const d = new Date(`${state.date}T12:00:00`); d.setDate(d.getDate() - d.getDay());
    const days = Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return iso(x); });
    grid.innerHTML = `<div class="muted" style="margin-bottom:10px">📆 أسبوع ${esc(days[0])} → ${esc(days[6])}</div>` + days.map((date) => `<div class="schedule-day"><h3>📅 ${esc(labelDate(date))}</h3>${state.doctors.map((doc) => renderDoctorDay(doc, date)).join('')}</div>`).join('');
    renderWaiting();
  }

  function renderMonth(grid) {
    const [from, to] = rangeForView();
    const start = new Date(`${from}T12:00:00`); const end = new Date(`${to}T12:00:00`);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(iso(new Date(d)));
    grid.innerHTML = `<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">${days.map((date) => { const count = state.bookings.filter((b) => b.appointment_date === date && b.status !== 'cancelled').length; return `<button class="btn btn-secondary" style="min-height:82px;text-align:right" type="button" data-month-date="${esc(date)}"><strong>📅 ${esc(new Date(`${date}T12:00:00`).getDate())}</strong><div class="muted">${count} موعد</div></button>`; }).join('')}</div>`;
    renderWaiting();
  }

  function renderWaiting() {
    const box = qs('sv2Waiting');
    if (!box) return;
    const rows = state.waiting.slice().sort((a, b) => Number(a.position || 9999) - Number(b.position || 9999));
    box.innerHTML = rows.length ? `<div class="items">${rows.map((w) => { const doc = state.doctors.find((d) => String(d.id) === String(w.preferred_doctor_id || w.doctor_id)); return `<div class="item"><div><strong>⏳ #${esc(w.position || '—')} • ${esc(w.patient_id)}</strong><div class="muted">${doc ? `🧑‍⚕️ ${esc(doc.name)}` : '🧑‍⚕️ أي طبيب مناسب'} • ${esc(w.requested_date || 'بدون تاريخ')} • ${esc(w.preferred_start_time ? time(w.preferred_start_time) : 'مرن')}</div><div class="muted">⭐ ${esc(w.priority || 'normal')} • ${esc(w.reason || '')}</div></div><div class="item-actions"><button class="btn btn-primary" type="button" data-assign-waiting="${esc(w.id)}">📅 Assign Slot</button></div></div>`; }).join('')}</div>` : `<div class="empty">📭 لا توجد حالات انتظار نشطة.</div>`;
  }

  function renderError(error) {
    const grid = qs('sv2Grid');
    if (grid) grid.innerHTML = `<div class="error">⚠️ تعذر تحميل Scheduling V2: ${esc(error?.message || error)}</div>`;
    const waiting = qs('sv2Waiting');
    if (waiting) waiting.innerHTML = '';
  }

  function to12(v) {
    const [h, m] = time(v).split(':').map(Number); const suffix = h >= 12 ? 'PM' : 'AM'; const hh = h % 12 || 12; return `${hh}:${String(m).padStart(2, '0')} ${suffix}`;
  }

  async function invoke(action, body) {
    const client = window.AZAAD?.supabase;
    if (!client) throw new Error('Supabase client غير متاح.');
    const { data, error } = await client.functions.invoke('azaad-appointments-actions', { body: { action, ...body } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function patientSearch(term) {
    const value = String(term || '').trim();
    if (!value) return [];
    return db('clinic_patients', 'id,mrn,patient_name,patient_phone,patient_phone_normalized,patient_email,active', (q) => q.or(`mrn.ilike.%${value}%,patient_name.ilike.%${value}%,patient_phone.ilike.%${value}%`).limit(12));
  }

  function bookingModal(preset = {}) {
    const modal = document.createElement('div'); modal.className = 'modal show';
    modal.innerHTML = `<div class="modal-box"><h2>➕ إضافة موعد</h2><form id="sv2BookingForm"><div class="grid"><label>🔎 بحث المريض<input name="patientSearch" placeholder="MRN / الاسم / الهاتف" required></label><label>👤 المريض<select name="patient_id" required><option value="">ابحث أولًا</option></select></label><label>🧑‍⚕️ الطبيب<select name="doctor_id" required>${state.doctors.map((d) => `<option value="${esc(d.id)}" ${String(preset.doctorId || '') === String(d.id) ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label><label>🩺 الخدمة<select name="service_id" required>${state.services.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></label><label>📅 التاريخ<input name="appointment_date" type="date" value="${esc(preset.date || state.date)}" required></label><label>⏰ الوقت<input name="appointment_time" type="time" value="${esc(preset.time || '')}" required></label><label class="full">📝 ملاحظات<textarea name="notes"></textarea></label></div><div class="modal-actions"><button class="btn btn-primary" type="submit">💾 حجز</button><button class="btn btn-secondary" type="button" data-close>إلغاء</button></div></form></div>`;
    document.body.appendChild(modal);
    const form = modal.querySelector('form');
    form.patientSearch.oninput = async () => { try { const rows = await patientSearch(form.patientSearch.value); form.patient_id.innerHTML = rows.length ? rows.map((p) => `<option value="${esc(p.id)}">${esc(p.mrn)} — ${esc(p.patient_name)} — ${esc(p.patient_phone || '')}</option>`).join('') : '<option value="">لا توجد نتيجة</option>'; } catch (e) { toast(e.message, true); } };
    modal.querySelector('[data-close]').onclick = () => modal.remove();
    form.onsubmit = async (e) => { e.preventDefault(); const p = Object.fromEntries(new FormData(form)); try { await invoke('BOOK', { patient_id: p.patient_id, mrn: form.patient_id.selectedOptions[0]?.textContent?.split(' — ')[0], doctor_id: p.doctor_id, service_id: p.service_id, appointment_date: p.appointment_date, appointment_time: p.appointment_time, notes: p.notes || null }); modal.remove(); toast('✅ تم إنشاء الموعد.'); refresh(); } catch (err) { toast(err.message || 'تعذر إنشاء الموعد.', true); } };
  }

  function waitingModal() {
    const modal = document.createElement('div'); modal.className = 'modal show';
    modal.innerHTML = `<div class="modal-box"><h2>⏳ إضافة إلى Waiting List</h2><form id="sv2WaitingForm"><div class="grid"><label>🔎 بحث المريض<input name="patientSearch" required placeholder="MRN / الاسم / الهاتف"></label><label>👤 المريض<select name="patient_id" required><option value="">ابحث أولًا</option></select></label><label>🧑‍⚕️ الطبيب المفضل<select name="preferred_doctor_id"><option value="">أي طبيب مناسب</option>${state.doctors.map((d) => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}</select></label><label>🩺 الخدمة<select name="service_id">${state.services.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></label><label>📅 التاريخ المطلوب<input name="requested_date" type="date" value="${esc(state.date)}"></label><label>⭐ الأولوية<select name="priority"><option value="normal">عادية</option><option value="high">عالية</option><option value="urgent">عاجلة</option></select></label><label class="full">📝 السبب<textarea name="reason"></textarea></label></div><div class="modal-actions"><button class="btn btn-primary" type="submit">💾 إضافة</button><button class="btn btn-secondary" type="button" data-close>إلغاء</button></div></form></div>`;
    document.body.appendChild(modal);
    const form = modal.querySelector('form');
    form.patientSearch.oninput = async () => { try { const rows = await patientSearch(form.patientSearch.value); form.patient_id.innerHTML = rows.length ? rows.map((p) => `<option value="${esc(p.id)}">${esc(p.mrn)} — ${esc(p.patient_name)}</option>`).join('') : '<option value="">لا توجد نتيجة</option>'; } catch (e) { toast(e.message, true); } };
    modal.querySelector('[data-close]').onclick = () => modal.remove();
    form.onsubmit = async (e) => { e.preventDefault(); toast('⏳ Waiting List creation is intentionally routed through the existing secured waiting-list API; direct INSERT is disabled in V2.', true); };
  }

  async function bookingActions(id) {
    const booking = state.bookings.find((x) => String(x.id) === String(id));
    if (!booking) return;
    const action = prompt(`الحجز ${booking.booking_code || ''}\nاختر: cancel / no_show / reschedule / transfer`);
    if (!action) return;
    try {
      const a = action.trim().toUpperCase().replace('-', '_');
      if (a === 'CANCEL' || a === 'NO_SHOW') await invoke(a, { booking_id: booking.id });
      else if (a === 'RESCHEDULE') { const date = prompt('التاريخ الجديد YYYY-MM-DD', booking.appointment_date); const timeValue = prompt('الوقت HH:MM', time(booking.appointment_time)); if (!date || !timeValue) return; await invoke('RESCHEDULE', { booking_id: booking.id, appointment_date: date, appointment_time: timeValue }); }
      else if (a === 'TRANSFER') { const doctor = prompt('doctor_id الجديد'); if (!doctor) return; await invoke('TRANSFER', { booking_id: booking.id, doctor_id: doctor }); }
      else throw new Error('Action غير مدعوم.');
      toast('✅ تم تنفيذ الإجراء.'); refresh();
    } catch (e) { toast(e.message, true); }
  }

  async function assignWaiting(id) {
    const row = state.waiting.find((x) => String(x.id) === String(id)); if (!row) return;
    const date = prompt('تاريخ الـslot YYYY-MM-DD', row.requested_date || state.date); const timeValue = prompt('وقت الـslot HH:MM', row.preferred_start_time ? time(row.preferred_start_time) : '09:00'); if (!date || !timeValue) return;
    try { await invoke('ASSIGN_WAITING', { waiting_id: row.id, appointment_date: date, appointment_time: timeValue, doctor_id: row.preferred_doctor_id || row.doctor_id || null }); toast('✅ تم تحويل الانتظار إلى موعد.'); refresh(); } catch (e) { toast(e.message, true); }
  }

  document.addEventListener('click', (event) => {
    const b = event.target.closest?.('[data-book-slot]'); if (b) bookingModal({ doctorId: b.dataset.bookSlot, date: b.dataset.bookDate, time: b.dataset.bookTime });
    const eb = event.target.closest?.('[data-edit-booking]'); if (eb) bookingActions(eb.dataset.editBooking);
    const aw = event.target.closest?.('[data-assign-waiting]'); if (aw) assignWaiting(aw.dataset.assignWaiting);
    const md = event.target.closest?.('[data-month-date]'); if (md) { state.view = 'day'; state.date = md.dataset.monthDate; qs('sv2View').value = 'day'; qs('sv2Date').value = state.date; render(); }
    const dv = event.target.closest?.('[data-doctor-view]'); if (dv) { state.doctorId = dv.dataset.doctorView; qs('sv2Doctor').value = state.doctorId; render(); }
  });

  window.AZAAD_SCHEDULING_V2 = { refresh, invoke };
  document.addEventListener('DOMContentLoaded', () => { panel(); });
  if (document.readyState !== 'loading') panel();
})();
