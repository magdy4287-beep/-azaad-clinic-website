/* AZAAD ADMIN FEATURE CONTROLLER
 * One post-auth feature owner for the legacy core management panels.
 * Authentication/session ownership remains exclusively in admin.js.
 */
(() => {
  'use strict';
  if (window.__AZAAD_ADMIN_FEATURE_CONTROLLER__) return;
  window.__AZAAD_ADMIN_FEATURE_CONTROLLER__ = true;

  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const state = { data: null, loading: false };
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const token = () => window.AZAAD?.state?.session?.access_token || '';

  async function dashboard() {
    if (state.data) return state.data;
    if (state.loading) {
      while (state.loading) await new Promise(r => setTimeout(r, 40));
      return state.data || {};
    }
    state.loading = true;
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/azaad-admin?api=dashboard`, {
        cache: 'no-store',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token()}`, apikey: KEY }
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || body?.message || `HTTP ${response.status}`);
      state.data = body || {};
      return state.data;
    } finally { state.loading = false; }
  }

  function empty(text) { return `<div class="empty">${text}</div>`; }

  function renderDoctors(data) {
    const out = $('doctorList'); if (!out) return;
    const rows = Array.isArray(data?.doctors) ? data.doctors : [];
    out.innerHTML = rows.length ? rows.map(d => `<div class="item"><div><b>🧑‍⚕️ ${esc(d.name || d.full_name || d.name_en || '—')}</b><div class="muted">${esc(d.specialty || d.title || d.specialty_en || d.title_en || '')}</div>${d.phone ? `<div class="muted">📱 ${esc(d.phone)}</div>` : ''}</div><div class="item-actions"><span class="badge ${d.active === false ? 'cancelled' : 'confirmed'}">${d.active === false ? '🔴 غير نشط' : '🟢 نشط'}</span><button class="btn btn-secondary" type="button" data-feature-doctor="${esc(d.id)}">✍️ تعديل</button></div></div>`).join('') : empty('لا يوجد أطباء.');
    out.querySelectorAll('[data-feature-doctor]').forEach(b => b.onclick = () => editDoctor(b.dataset.featureDoctor));
  }

  function renderServices(data) {
    const out = $('serviceList'); if (!out) return;
    const rows = Array.isArray(data?.services) ? data.services : [];
    out.innerHTML = rows.length ? rows.map(s => `<div class="item"><div><b>🩺 ${esc(s.name || s.service_name || s.title || '—')}</b><div class="muted">${esc(s.description || '')}</div>${s.price != null ? `<div class="muted">💰 ${Number(s.price || 0).toFixed(2)} EGP</div>` : ''}</div><div class="item-actions"><button class="btn btn-secondary" type="button" data-feature-service="${esc(s.id)}">✍️ تعديل</button></div></div>`).join('') : empty('لا توجد خدمات.');
    out.querySelectorAll('[data-feature-service]').forEach(b => b.onclick = () => editService(b.dataset.featureService));
  }

  function renderPosts(data) {
    const out = $('postList'); if (!out) return;
    const rows = Array.isArray(data?.posts) ? data.posts : [];
    out.innerHTML = rows.length ? rows.map(p => `<div class="item"><div><b>📣 ${esc(p.title || '—')}</b><div class="muted">${esc(p.content || p.description || '')}</div>${p.scheduled_at ? `<div class="muted">🕐 ${esc(String(p.scheduled_at).replace('T',' ').slice(0,16))}</div>` : ''}</div><div class="item-actions"><button class="btn btn-secondary" type="button" data-feature-post="${esc(p.id)}">✍️ تعديل</button></div></div>`).join('') : empty('لا توجد منشورات.');
    out.querySelectorAll('[data-feature-post]').forEach(b => b.onclick = () => editPost(b.dataset.featurePost));
  }

  function renderHolidays(data) {
    const out = $('holidayList'); if (!out) return;
    const rows = Array.isArray(data?.holidays) ? data.holidays : [];
    out.innerHTML = rows.length ? rows.map(h => `<div class="item"><div><b>🚫 ${esc(h.title || h.name || 'إغلاق')}</b><div class="muted">📅 ${esc(h.date || h.start_date || '')}${h.end_date ? ` → ${esc(h.end_date)}` : ''}</div><div class="muted">${esc(h.reason || h.notes || '')}</div></div></div>`).join('') : empty('لا توجد عطلات أو إغلاقات مسجلة.');
  }

  function renderHours(data) {
    const out = $('hoursList'); if (!out) return;
    const rows = Array.isArray(data?.working_hours) ? data.working_hours : [];
    out.innerHTML = rows.length ? rows.map(h => `<div class="item"><div><b>🕘 ${esc(h.day_name || h.day || h.weekday || '')}</b><div class="muted">${esc(String(h.start_time || '').slice(0,5))} — ${esc(String(h.end_time || '').slice(0,5))}</div></div><span class="badge ${h.enabled === false ? 'cancelled' : 'confirmed'}">${h.enabled === false ? '🔴 مغلق' : '🟢 مفتوح'}</span></div>`).join('') : empty('لا توجد ساعات عمل مسجلة.');
  }

  function renderSettings(data) {
    const out = $('settingsForm'); if (!out) return;
    const settings = data?.settings && typeof data.settings === 'object' ? data.settings : {};
    const rows = Object.entries(settings);
    out.innerHTML = rows.length ? rows.map(([k,v]) => `<div class="item"><div><b>⚙️ ${esc(k)}</b><div class="muted">${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</div></div></div>`).join('') : empty('لا توجد إعدادات إضافية لعرضها.');
  }

  function toast(message, error = false) {
    const x = $('toast') || $('adminToast'); if (!x) return;
    x.textContent = message; x.classList.add('show'); x.style.background = error ? '#a32939' : '#17214f';
    setTimeout(() => x.classList.remove('show'), 3200);
  }

  async function adminApi(query, options = {}) {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/azaad-admin${query}`, {
      ...options, cache: 'no-store',
      headers: { Accept: 'application/json', ...(options.body ? {'Content-Type':'application/json'} : {}), Authorization: `Bearer ${token()}`, apikey: KEY, ...(options.headers || {}) }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || body?.message || `HTTP ${response.status}`);
    return body;
  }

  function modal(title, html, submit) {
    const old = $('featureControllerModal'); old?.remove();
    const wrap = document.createElement('div'); wrap.id = 'featureControllerModal'; wrap.className = 'modal show';
    wrap.innerHTML = `<div class="modal-box"><div class="panel-head"><h2>${title}</h2><button id="featureModalClose" class="btn btn-secondary" type="button">إغلاق</button></div>${html}</div>`;
    document.body.appendChild(wrap); $('featureModalClose').onclick = () => wrap.remove(); submit(wrap);
  }

  function editDoctor(id) {
    const d = (state.data?.doctors || []).find(x => String(x.id) === String(id)); if (!d) return;
    modal('🧑‍⚕️ تعديل الطبيب', `<form id="featureDoctorForm"><div class="grid"><label>اسم الطبيب<input name="name" required value="${esc(d.name || d.full_name || '')}"></label><label>التخصص<input name="specialty" value="${esc(d.specialty || '')}"></label><label>الهاتف<input name="phone" value="${esc(d.phone || '')}"></label><label>الحالة<select name="active"><option value="true" ${d.active !== false ? 'selected' : ''}>🟢 نشط</option><option value="false" ${d.active === false ? 'selected' : ''}>🔴 غير نشط</option></select></label></div><button class="btn btn-primary" type="submit">💾 حفظ</button></form>`, wrap => {
      $('featureDoctorForm').onsubmit = async e => { e.preventDefault(); const payload = Object.fromEntries(new FormData(e.currentTarget)); payload.active = payload.active === 'true'; try { await adminApi(`?api=doctor&id=${encodeURIComponent(id)}`, {method:'PUT',body:JSON.stringify(payload)}); wrap.remove(); state.data = null; await refresh(); toast('✅ تم حفظ بيانات الطبيب.'); } catch (err) { toast(err.message, true); } };
    });
  }

  function editService(id) {
    const s = (state.data?.services || []).find(x => String(x.id) === String(id)); if (!s) return;
    modal('🩺 تعديل الخدمة', `<form id="featureServiceForm"><div class="grid"><label>اسم الخدمة<input name="name" required value="${esc(s.name || '')}"></label><label>السعر<input name="price" type="number" step="0.01" value="${esc(s.price ?? '')}"></label><label class="full">الوصف<textarea name="description">${esc(s.description || '')}</textarea></label></div><button class="btn btn-primary" type="submit">💾 حفظ</button></form>`, wrap => {
      $('featureServiceForm').onsubmit = async e => { e.preventDefault(); const payload = Object.fromEntries(new FormData(e.currentTarget)); try { await adminApi(`?api=service&id=${encodeURIComponent(id)}`, {method:'PUT',body:JSON.stringify(payload)}); wrap.remove(); state.data = null; await refresh(); toast('✅ تم حفظ بيانات الخدمة.'); } catch (err) { toast(err.message, true); } };
    });
  }

  function editPost(id) {
    const p = (state.data?.posts || []).find(x => String(x.id) === String(id)); if (!p) return;
    modal('📣 تعديل المنشور', `<form id="featurePostForm"><label>العنوان<input name="title" required value="${esc(p.title || '')}"></label><label>المحتوى<textarea name="content">${esc(p.content || p.description || '')}</textarea></label><button class="btn btn-primary" type="submit">💾 حفظ</button></form>`, wrap => {
      $('featurePostForm').onsubmit = async e => { e.preventDefault(); const payload = Object.fromEntries(new FormData(e.currentTarget)); try { await adminApi(`?api=post&id=${encodeURIComponent(id)}`, {method:'PUT',body:JSON.stringify(payload)}); wrap.remove(); state.data = null; await refresh(); toast('✅ تم حفظ المنشور.'); } catch (err) { toast(err.message, true); } };
    });
  }

  async function refresh() {
    const data = await dashboard();
    renderDoctors(data); renderServices(data); renderPosts(data); renderHolidays(data); renderHours(data); renderSettings(data);
    return data;
  }

  async function ensure() {
    if (!token()) return;
    try { await refresh(); } catch (error) { console.error('[AZAAD_FEATURE_CONTROLLER]', error); }
  }

  window.AZAAD_ADMIN_FEATURES = { refresh, ensure };
})();
