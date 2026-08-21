(() => {
  'use strict';
  const API='https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-team-data';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const en=()=>String(document.documentElement.lang||'ar').startsWith('en');
  const text=(ar,enText)=>en()?enText:ar;
  let teamData=null;
  let loading=null;
  async function load(){
    if(teamData){render(teamData);return;}
    if(loading){await loading;render(teamData||[]);return;}
    loading=(async()=>{
      try{
        const r=await fetch(API,{cache:'no-store',headers:{Accept:'application/json'}});
        const d=await r.json();
        if(!r.ok)throw new Error(d.error||'team_unavailable');
        teamData={doctors:d.doctors||[],team:d.team||[]};
      }catch(e){console.warn('Azaad public team:',e)}
      finally{loading=null}
    })();
    await loading;
    if(teamData)render(teamData);
  }
  function render(data){
    const doctors=(data?.doctors||[]).map(x=>({name:en()?x.name_en||x.name:x.name,title:en()?x.title_en||x.title:x.title,bio:en()?x.bio_en||x.bio:x.bio,image_url:x.image_url,doctor:true}));
    const team=(data?.team||[]).map(x=>({name:en()?x.display_name_en||x.display_name:x.display_name,title:en()?x.title_en||x.title:x.title,department:en()?x.department_en||x.department:x.department,bio:en()?x.bio_en||x.bio:x.bio,image_url:x.image_url,doctor:false}));
    const rows=[...doctors,...team];
    let host=document.getElementById('azaadPublicTeam');
    if(!host){const anchor=document.getElementById('doctors');if(!anchor)return;host=document.createElement('section');host.id='azaadPublicTeam';host.className='section';anchor.insertAdjacentElement('afterend',host)}
    host.innerHTML=`<div class="container"><div class="eyebrow">${text('OUR TEAM','OUR TEAM')}</div><h2>${text('فريق عيادة أزاد','Azaad Clinic Team')}</h2><p class="section-intro">${text('الأطباء وأعضاء الفريق الذين تم اعتماد ظهورهم للمرضى.','Doctors and team members approved for patient-facing display.')}</p><div class="cards azaad-team-grid">${rows.map(x=>`<article class="card"><div class="azaad-team-photo">${x.image_url?`<img src="${esc(x.image_url)}" loading="lazy" alt="${esc(x.name)}">`:`<span>${esc((x.name||'A').trim().charAt(0))}</span>`}</div><h3>${esc(x.name)}</h3><strong>${esc(x.title||'')}</strong>${x.department?`<div class="muted">${esc(x.department)}</div>`:''}<p>${esc(x.bio||'')}</p></article>`).join('')}</div></div>`;
    if(!document.getElementById('azaadTeamPublicStyles')){const s=document.createElement('style');s.id='azaadTeamPublicStyles';s.textContent='.azaad-team-grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}.azaad-team-photo{height:260px;border-radius:18px;overflow:hidden;background:#eef1f7;display:flex;align-items:center;justify-content:center;font-size:64px;font-weight:900;color:#17214f}.azaad-team-photo img{width:100%;height:100%;object-fit:cover}';document.head.appendChild(s)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
  window.addEventListener('azaadLanguageChanged',()=>{if(teamData)render(teamData);else load()});
})();
