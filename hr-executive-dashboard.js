/* AZAAD CLINIC — HR Executive Dashboard, read-only analytics */
(() => {
  'use strict';
  const client=()=>window.AZAAD?.supabase||window.supabaseClient||window.supabase;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function load(){
    const c=client(); if(!c)return;
    const {data,error}=await c.from('clinic_staff').select('id,full_name,role,active,created_at');
    if(error)return;
    const staff=data||[], active=staff.filter(x=>x.active!==false);
    const host=document.querySelector('#adminPage')||document.body;
    if(document.getElementById('azaadHrExecutive'))return;
    const card=document.createElement('section'); card.id='azaadHrExecutive'; card.className='card';
    card.innerHTML=`<div class="panel-head"><div><h2>👥 HR Executive Dashboard</h2><p class="muted">تحليلات الموظفين التشغيلية — قراءة فقط.</p></div></div><div class="stats"><div class="stat"><div class="stat-number">${staff.length}</div><div class="muted">إجمالي الموظفين</div></div><div class="stat"><div class="stat-number">${active.length}</div><div class="muted">الموظفون النشطون</div></div><div class="stat"><div class="stat-number">${staff.filter(x=>/manager|director|admin|supervisor/i.test(x.role||'')).length}</div><div class="muted">الإدارة والإشراف</div></div></div><div class="notice">🤖 <strong>HR AI:</strong> التحليلات الحالية وصفية فقط. أي قرار توظيف أو راتب أو إنهاء خدمة يحتاج موافقة بشرية وصلاحية مناسبة.</div><div class="table-wrap"><table><thead><tr><th>الموظف</th><th>الدور</th><th>الحالة</th></tr></thead><tbody>${staff.map(x=>`<tr><td>${esc(x.full_name||'—')}</td><td>${esc(x.role||'—')}</td><td>${x.active===false?'غير نشط':'نشط'}</td></tr>`).join('')}</tbody></table></div>`;
    host.appendChild(card);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
