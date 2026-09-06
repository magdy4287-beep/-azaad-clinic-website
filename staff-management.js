/* AZAAD canonical Staff Management runtime — Appwrite HttpOnly + Neon API only. */
(function () {
  'use strict';
  if (window.__AZAAD_STAFF_MANAGEMENT_RUNTIME__) return;
  window.__AZAAD_STAFF_MANAGEMENT_RUNTIME__ = true;
  const state = { staff: [], initialized: false, loading: false, role: '' };
  const ROLES = ['OWNER','ADMIN','MANAGER','SECRETARY','CASHIER','RECEPTION','DOCTOR','MARKETING'];
  const MANAGEMENT_ROLES = new Set(['OWNER','ADMIN','MANAGER']);
  const panel = () => document.getElementById('staff') || document.getElementById('staffPanel');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const role = () => {
    const staffRole = String(window.AZAAD?.state?.staff?.role || '').toUpperCase().trim();
    const currentRole = String(window.AZAAD?.state?.currentRole || '').toUpperCase().trim();
    if (staffRole && currentRole && staffRole !== currentRole) return '';
    return staffRole || currentRole || String(state.role || '').toUpperCase().trim();
  };

  async function session() {
    const response = await fetch('/api/admin-auth', { method:'GET', credentials:'include', cache:'no-store', headers:{Accept:'application/json'} });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.authenticated) throw new Error('authentication_required');
    const serverRole = String(data.staff?.role || '').toUpperCase().trim();
    const localRole = role();
    if (!MANAGEMENT_ROLES.has(serverRole) || (localRole && localRole !== serverRole)) throw new Error('staff_management_forbidden');
    state.role = serverRole;
    return data;
  }

  async function api(action, payload = {}) {
    if (!MANAGEMENT_ROLES.has(role())) throw new Error('staff_management_forbidden');
    await session();
    const response = await fetch('/api/staff-admin', {
      method:'POST', credentials:'include', cache:'no-store',
      headers:{Accept:'application/json','Content-Type':'application/json'},
      body:JSON.stringify({ action, ...payload })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || `staff_api_${response.status}`);
    return data;
  }

  function renderShell() {
    const target = panel();
    if (!target || document.getElementById('staffManagementCenter')) return Boolean(target);
    const box = document.createElement('div');
    box.id = 'staffManagementCenter'; box.className = 'card'; box.dir = 'rtl';
    box.innerHTML = `<div class="panel-head"><div><h2>👥 إدارة الموظفين</h2><div class="muted">Appwrite Identity + Neon Staff API</div></div><button id="staffAddButton" class="btn btn-primary" type="button">➕ إضافة موظف</button></div><div id="staffManagementStats" class="stats" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:15px 0"></div><div style="display:flex;gap:10px;flex-wrap:wrap;margin:15px 0"><input id="staffSearch" type="search" autocomplete="off" placeholder="🔎 الاسم / البريد / الهاتف" style="flex:1;min-width:240px"><select id="staffRoleFilter" style="min-width:180px"><option value="">كل الوظائف</option>${ROLES.map(r=>`<option value="${r}">${r}</option>`).join('')}</select></div><div class="table-wrap"><table style="min-width:760px"><thead><tr><th>الاسم</th><th>البريد</th><th>الوظيفة</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody id="staffTableBody"></tbody></table></div><div id="staffMessage" class="muted" style="margin-top:12px"></div>`;
    target.appendChild(box);
    document.getElementById('staffAddButton').addEventListener('click', createStaff);
    document.getElementById('staffSearch').addEventListener('input', renderRows);
    document.getElementById('staffRoleFilter').addEventListener('change', renderRows);
    return true;
  }

  function renderRows() {
    const body = document.getElementById('staffTableBody'); if (!body) return;
    const q = String(document.getElementById('staffSearch')?.value || '').trim().toLowerCase();
    const filter = String(document.getElementById('staffRoleFilter')?.value || '');
    const rows = state.staff.filter(s => { const hay=[s.full_name,s.name,s.email,s.phone,s.username,s.role].map(v=>String(v||'').toLowerCase()).join(' '); return (!q || hay.includes(q)) && (!filter || String(s.role||'').toUpperCase()===filter); });
    body.innerHTML = rows.length ? rows.map(s => { const active=s.active!==false; const id=esc(s.id||s.auth_user_id||''); const toggle=active?'disable':'enable'; return `<tr><td>${esc(s.full_name||s.name||'—')}</td><td>${esc(s.email||'—')}</td><td>${esc(s.role||'—')}</td><td>${active?'🟢 نشط':'🔴 موقوف'}</td><td><button class="btn btn-secondary" data-staff-action="${toggle}" data-staff-id="${id}">${active?'إيقاف':'تفعيل'}</button></td></tr>`; }).join('') : '<tr><td colspan="5" class="empty">لا توجد بيانات موظفين.</td></tr>';
    body.querySelectorAll('[data-staff-action]').forEach(button => button.addEventListener('click', async () => { try { await api(button.dataset.staffAction,{staff_id:button.dataset.staffId}); await load(); } catch(error) { show(error.message||'تعذر تنفيذ العملية'); } }));
  }

  function show(message) { const node=document.getElementById('staffMessage'); if(node) node.textContent=String(message||''); }

  async function load() {
    if (state.loading || !MANAGEMENT_ROLES.has(role())) return;
    state.loading=true;
    try { renderShell(); const data=await api('list'); state.staff=Array.isArray(data.staff)?data.staff:Array.isArray(data)?data:[]; const active=state.staff.filter(s=>s.active!==false).length; const stats=document.getElementById('staffManagementStats'); if(stats) stats.innerHTML=`<div class="stat"><div class="stat-number">${state.staff.length}</div><div class="muted">إجمالي الموظفين</div></div><div class="stat"><div class="stat-number">${active}</div><div class="muted">حسابات نشطة</div></div><div class="stat"><div class="stat-number">${state.staff.length-active}</div><div class="muted">حسابات موقوفة</div></div>`; renderRows(); }
    catch(error) { renderShell(); show(error.message||'تعذر تحميل الموظفين'); }
    finally { state.loading=false; }
  }

  async function createStaff() {
    if (!MANAGEMENT_ROLES.has(role())) { show('غير مصرح بإضافة موظف.'); return; }
    const full_name=window.prompt('اسم الموظف'); if(!full_name)return; const email=window.prompt('البريد الإلكتروني'); if(!email)return; const password=window.prompt('كلمة المرور المؤقتة'); if(!password)return; const selected=window.prompt(`الوظيفة (${ROLES.join(', ')})`,'RECEPTION'); const staffRole=ROLES.includes(String(selected||'').toUpperCase())?String(selected).toUpperCase():'RECEPTION';
    try { await api('create',{full_name,email,password,role:staffRole}); await load(); } catch(error) { show(error.message||'تعذر إنشاء الموظف'); }
  }

  async function initialize() {
    if(state.initialized || !panel()) return;
    const currentRole=role();
    if(!MANAGEMENT_ROLES.has(currentRole)) return;
    state.initialized=true;
    await load();
  }

  window.AZAAD_STAFF_MANAGEMENT_CANONICAL=Object.freeze({provider:'appwrite-neon',initialize,load});
  window.addEventListener('azaad:admin-panel-activated',event=>{if(event.detail?.panel==='staff')void initialize();});
  window.addEventListener('azaad:admin-role-ready',()=>{void initialize();});
})();