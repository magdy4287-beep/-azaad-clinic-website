/* AZAAD CLINIC — Doctors Center V2
   Free-first enhancement layer. It works on top of the existing doctor loader,
   preserves the existing admin/auth flow, and never deletes historical records. */
(()=>{
  const ready=()=>window.AZAAD?.supabase&&document.getElementById('doctorList');
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const state={timer:null};
  function inject(){
    const panel=document.getElementById('doctors'); if(!panel||document.getElementById('doctorsV2Tools')) return;
    const host=document.createElement('div');host.id='doctorsV2Tools';host.className='card';
    host.innerHTML=`<div class="panel-head"><div><h3>🧑‍⚕️ Doctors Management</h3><div class="muted">Active doctors, profiles, schedules and performance.</div></div><div class="top-actions"><input id="doctorsV2Search" placeholder="🔎 Search doctor" style="max-width:260px"><select id="doctorsV2Status" style="max-width:160px"><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select><button id="doctorsV2Refresh" class="btn btn-secondary" type="button">🔄 Refresh</button></div></div><div id="doctorsV2Summary" class="stats"></div>`;
    panel.insertBefore(host,panel.querySelector('.card'));
    document.getElementById('doctorsV2Search').addEventListener('input',renderSummary);
    document.getElementById('doctorsV2Status').addEventListener('change',renderSummary);
    document.getElementById('doctorsV2Refresh').onclick=async()=>{try{await window.AZAAD.refresh?.();setTimeout(renderSummary,250)}catch(e){console.warn(e)}};
  }
  function cards(){return [...document.querySelectorAll('#doctorList .item')];}
  function renderSummary(){
    const out=document.getElementById('doctorsV2Summary');if(!out)return;
    const q=(document.getElementById('doctorsV2Search')?.value||'').toLowerCase().trim();
    const status=document.getElementById('doctorsV2Status')?.value||'all';
    const rows=cards();
    let active=0,inactive=0,visible=0;
    rows.forEach(r=>{
      const text=r.textContent.toLowerCase();
      const isInactive=/inactive|غير نشط|موقوف|archiv/.test(text);
      if(isInactive)inactive++;else active++;
      const okText=!q||text.includes(q);const okStatus=status==='all'||(status==='active'&&!isInactive)||(status==='inactive'&&isInactive);
      r.style.display=okText&&okStatus?'':'none';if(okText&&okStatus)visible++;
    });
    out.innerHTML=`<div class="stat"><div class="stat-number">${active}</div>🟢 Active</div><div class="stat"><div class="stat-number">${inactive}</div>🔴 Inactive</div><div class="stat"><div class="stat-number">${visible}</div>👥 Showing</div>`;
  }
  function decorate(){
    inject();
    cards().forEach(row=>{
      if(row.dataset.doctorsV2)return;row.dataset.doctorsV2='1';
      row.style.alignItems='center';
      const actions=row.querySelector('.item-actions')||row.querySelector('[data-edit-doctor]')?.parentElement;
      if(actions){
        if(![...actions.querySelectorAll('button')].some(b=>/archive|أرش|delete|حذف/i.test(b.textContent||''))){
          const note=document.createElement('span');note.className='muted';note.textContent='🛡️ Historical records protected';actions.append(note);
        }
      }
    });
    renderSummary();
  }
  function boot(){
    if(!ready())return;
    decorate();
    const list=document.getElementById('doctorList');
    new MutationObserver(()=>{clearTimeout(state.timer);state.timer=setTimeout(decorate,50)}).observe(list,{childList:true,subtree:true});
  }
  const wait=setInterval(()=>{if(ready()){clearInterval(wait);boot()}},300);
  setTimeout(()=>clearInterval(wait),15000);
})();
