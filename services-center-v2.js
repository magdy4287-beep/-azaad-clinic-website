/* AZAAD CLINIC — Services Center V2
   Free-first admin layer. Reads the existing clinic_services table and keeps
   service history safe by using the existing admin archive endpoint.
*/
(()=>{
  const wait=setInterval(()=>{if(window.AZAAD?.supabase){clearInterval(wait);boot()}},250);
  setTimeout(()=>clearInterval(wait),12000);
  const D=()=>window.AZAAD.supabase;
  const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const toast=(m)=>{const x=document.getElementById('toast');if(!x)return;x.textContent=m;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),2800)};
  let services=[];
  function boot(){
    const panel=document.getElementById('services')||document.getElementById('serviceList')?.closest('.panel,section');
    if(!panel)return;
    renderShell(panel);
    load();
  }
  function renderShell(panel){
    if(document.getElementById('azServicesV2'))return;
    const host=document.createElement('div');host.id='azServicesV2';host.className='card';
    host.innerHTML=`<div class="panel-head"><div><h2>🩺 Services Center</h2><div class="muted">All clinic services • active/inactive • booking & billing ready</div></div><button id="azServicesRefresh" class="btn btn-secondary" type="button">🔄 Refresh</button></div><div class="filters"><input id="azServicesSearch" type="search" placeholder="🔎 Search service / description"><select id="azServicesStatus"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div><div id="azServicesSummary" class="stats"></div><div id="azServicesRows" class="items"></div>`;
    panel.appendChild(host);
    document.getElementById('azServicesRefresh').onclick=load;
    document.getElementById('azServicesSearch').oninput=renderRows;
    document.getElementById('azServicesStatus').onchange=renderRows;
  }
  async function load(){
    const out=document.getElementById('azServicesRows');if(!out)return;out.innerHTML='<div class="muted">Loading services…</div>';
    const q=await D().from('clinic_services').select('*').order('created_at',{ascending:false}).limit(500);
    if(q.error){out.innerHTML=`<div class="error">${E(q.error.message)}</div>`;return}
    services=q.data||[];renderRows();
  }
  const name=s=>s.name||s.service_name||s.title||s.ar_name||s.name_ar||'Unnamed service';
  const en=s=>s.name_en||s.service_name_en||s.title_en||s.english_name||'';
  const desc=s=>s.description||s.description_ar||'';
  const price=s=>s.price??s.default_price??s.amount??0;
  const active=s=>s.active??s.is_active??true;
  function renderRows(){
    const out=document.getElementById('azServicesRows');if(!out)return;
    const term=(document.getElementById('azServicesSearch')?.value||'').toLowerCase();
    const status=document.getElementById('azServicesStatus')?.value||'all';
    const list=services.filter(s=>{const a=!!active(s);const hay=[name(s),en(s),desc(s),s.category,s.specialty].join(' ').toLowerCase();return(!term||hay.includes(term))&&(status==='all'||(status==='active'?a:!a))});
    const a=services.filter(s=>!!active(s)).length;
    document.getElementById('azServicesSummary').innerHTML=`<div class="stat"><div class="stat-number">${services.length}</div>🩺 Services</div><div class="stat"><div class="stat-number">${a}</div>🟢 Active</div><div class="stat"><div class="stat-number">${services.length-a}</div>🔴 Inactive</div>`;
    out.innerHTML=list.map(s=>{
      const id=s.id||s.service_id;const isA=!!active(s);
      return `<div class="item"><div><b>${E(name(s))}</b>${en(s)?`<div class="muted">🇬🇧 ${E(en(s))}</div>`:''}<div class="muted">${E(desc(s))}</div><div class="muted">💰 ${Number(price(s)||0).toFixed(2)} EGP${s.duration_minutes?` • ⏱️ ${E(s.duration_minutes)} min`:''}${s.category?` • ${E(s.category)}`:''}</div></div><div class="actions"><span class="badge">${isA?'🟢 Active':'🔴 Inactive'}</span>${id?`<button class="btn btn-secondary" type="button" data-service-edit="${E(id)}">✏️ Edit</button><button class="btn btn-danger" type="button" data-service-archive="${E(id)}">📦 Archive</button>`:''}</div></div>`;
    }).join('')||'<div class="empty">No services found</div>';
    out.querySelectorAll('[data-service-edit]').forEach(b=>b.onclick=()=>editInfo(b.dataset.serviceEdit));
    out.querySelectorAll('[data-service-archive]').forEach(b=>b.onclick=()=>archive(b.dataset.serviceArchive));
  }
  function editInfo(id){
    const s=services.find(x=>String(x.id||x.service_id)===String(id));if(!s)return;
    const n=name(s),p=price(s);toast(`✏️ ${n} — use the existing service editor to update price/details.`);
    document.querySelector('[data-edit-service="'+CSS.escape(String(id))+'"]')?.click();
  }
  async function archive(id){
    const s=services.find(x=>String(x.id||x.service_id)===String(id));
    if(!s||!confirm(`Archive ${name(s)}? Historical bookings and invoices will be preserved.`))return;
    const staff=window.AZAAD.state?.staff, token=window.AZAAD.state?.session?.access_token;
    if(!token){toast('Please sign in again.');return}
    const r=await fetch(`https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-admin?api=service&id=${encodeURIComponent(id)}`,{method:'DELETE',headers:{Accept:'application/json',Authorization:`Bearer ${token}`,apikey:'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa'}});
    if(!r.ok){toast('Unable to archive service');return}
    toast('✅ Service archived');await load();window.AZAAD.refresh?.();
  }
})();
