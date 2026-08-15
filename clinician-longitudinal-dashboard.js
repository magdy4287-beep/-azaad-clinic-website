/* AZAAD CLINIC — Clinician Longitudinal Dashboard
   Read-only trend layer for the active patient.
   Clinical decisions remain with the clinician.
*/
(() => {
  'use strict';
  const SUPABASE_URL='https://derofsthjivlkcdnojww.supabase.co';
  const KEY=window.SUPABASE_PUBLISHABLE_KEY || '';
  const token=()=>window.AZAAD?.state?.session?.access_token || '';
  const patientId=()=>window.CURRENT_PATIENT_ID || window.patientId || document.body.dataset.patientId || '';
  const en=()=>String(document.documentElement.lang||'').toLowerCase().startsWith('en');
  const t=(ar,english)=>en()?english:ar;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  async function query(table, select='*', filters={}) {
    const pid=patientId(); if(!pid || !token()) return [];
    const qs=new URLSearchParams({select,...filters});
    const response=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`,{
      headers:{apikey:KEY,Authorization:`Bearer ${token()}`,Accept:'application/json'},cache:'no-store'
    });
    if(!response.ok) return [];
    const body=await response.json().catch(()=>[]);
    return Array.isArray(body)?body:[];
  }

  function trend(points){
    if(points.length<2) return {state:'insufficient',delta:0};
    const first=Number(points[0].score_percent);
    const last=Number(points[points.length-1].score_percent);
    const delta=last-first;
    return {delta,state:delta>5?'improving':delta<-5?'worsening':'stable'};
  }

  function chart(points){
    if(!points.length) return `<div class="cld-empty">${t('لا توجد نتائج تقييم محفوظة بعد.','No saved assessment results yet.')}</div>`;
    const max=100,min=0,w=640,h=210,p=24;
    const coords=points.map((x,i)=>{const xx=p+(i*Math.max(1,(w-p*2)/(Math.max(1,points.length-1))));const yy=h-p-(Math.max(min,Math.min(max,Number(x.score_percent)||0))/100)*(h-p*2);return [xx,yy];});
    const poly=coords.map(c=>c.join(',')).join(' ');
    const dots=coords.map((c,i)=>`<circle cx="${c[0]}" cy="${c[1]}" r="5"><title>${esc(points[i].date)}: ${esc(points[i].score_percent)}%</title></circle>`).join('');
    return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(t('رسم تطور التقييم','Assessment trend chart'))}" preserveAspectRatio="none" style="width:100%;height:220px"><line x1="${p}" y1="${h-p}" x2="${w-p}" y2="${h-p}" stroke="currentColor" opacity=".18"/><line x1="${p}" y1="${p}" x2="${p}" y2="${h-p}" stroke="currentColor" opacity=".18"/><polyline points="${poly}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`;
  }

  function styles(){
    if(document.getElementById('azaadLongitudinalStyles')) return;
    const s=document.createElement('style');s.id='azaadLongitudinalStyles';s.textContent=`
      #azaadLongitudinalDashboard{margin-top:16px}.cld-head{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.cld-grid{display:grid;grid-template-columns:1.5fr .8fr;gap:14px}.cld-card{border:1px solid #e5e8ef;border-radius:16px;background:#fff;padding:15px}.cld-state{font-weight:900}.cld-state.improving{color:#1f8a54}.cld-state.stable{color:#9a7400}.cld-state.worsening{color:#c73a3a}.cld-state.insufficient{color:#68738a}.cld-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.cld-kpi{background:#f7f8fb;border-radius:12px;padding:10px;text-align:center}.cld-kpi strong{display:block;font-size:20px;color:#17214f}.cld-table{width:100%;border-collapse:collapse;font-size:12px}.cld-table th,.cld-table td{padding:8px;border-bottom:1px solid #edf0f5;text-align:start}.cld-empty{padding:18px;text-align:center;color:#737d94;background:#f7f8fb;border-radius:12px}.cld-alert{margin-top:10px;padding:10px;border-radius:12px;background:#fff5f5;border:1px solid #f3c8c8;color:#8e2525}.cld-note{font-size:11px;color:#737d94;margin-top:8px}@media(max-width:800px){.cld-grid{grid-template-columns:1fr}.cld-kpis{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(s);
  }

  async function load(){
    const host=document.getElementById('azaadLongitudinalDashboard'); if(!host)return;
    const sessions=await query('clinical_assessment_sessions','id,created_at,score_percent,baseline_score_percent,previous_score_percent,safety_review_required,status,template_id',{patient_id:`eq.${patientId()}`,order:'created_at.asc'});
    const points=sessions.filter(x=>x.score_percent!==null && x.score_percent!==undefined).map(x=>({date:String(x.created_at||'').slice(0,10),score_percent:Number(x.score_percent)||0}));
    const current=points.at(-1)?.score_percent ?? null;
    const previous=points.at(-2)?.score_percent ?? null;
    const baseline=sessions.find(x=>x.baseline_score_percent!==null)?.baseline_score_percent ?? points[0]?.score_percent ?? null;
    const tr=trend(points);
    const safety=sessions.some(x=>x.safety_review_required===true);
    const stateLabel={improving:t('🟢 تحسن','🟢 Improving'),stable:t('🟡 مستقر/مختلط','🟡 Stable/Mixed'),worsening:t('🔴 تراجع يحتاج مراجعة','🔴 Worsening — review'),insufficient:t('⚪ بيانات غير كافية','⚪ Insufficient data')}[tr.state];
    host.innerHTML=`<section class="cld-card"><div class="cld-head"><div><h3>📈 ${t('التطور السريري عبر الزيارات','Longitudinal Clinical Progress')}</h3><div class="cld-note">${t('ملخص قياسات موثقة — القرار والتفسير السريري للطبيب.','Documented measurements — clinical interpretation remains with the clinician.')}</div></div><button id="cldRefresh" type="button">🔄 ${t('تحديث','Refresh')}</button></div><div class="cld-kpis" style="margin-top:12px"><div class="cld-kpi"><strong>${current===null?'—':current+'%'}</strong>${t('الحالي','Current')}</div><div class="cld-kpi"><strong>${previous===null?'—':previous+'%'}</strong>${t('الزيارة السابقة','Previous')}</div><div class="cld-kpi"><strong>${baseline===null?'—':Number(baseline)+'%'}</strong>${t('الأساس','Baseline')}</div></div><div style="margin-top:12px">${chart(points)}</div><div class="cld-state ${tr.state}" style="margin-top:8px">${stateLabel}${points.length>1?` — Δ ${tr.delta>0?'+':''}${tr.delta.toFixed(1)}%`:''}</div>${safety?`<div class="cld-alert">⚠️ ${t('توجد جلسة تتطلب مراجعة سلامة من الطبيب.','A session is marked for clinician safety review.')}</div>`:''}<table class="cld-table" style="margin-top:12px"><thead><tr><th>${t('التاريخ','Date')}</th><th>${t('النتيجة','Score')}</th></tr></thead><tbody>${points.slice(-12).reverse().map(p=>`<tr><td>${esc(p.date)}</td><td>${esc(p.score_percent)}%</td></tr>`).join('')||`<tr><td colspan="2">${t('لا توجد بيانات','No data')}</td></tr>`}</tbody></table></section>`;
    document.getElementById('cldRefresh')?.addEventListener('click',load);
  }

  function mount(){
    const host=document.querySelector('#clinicalAssessmentApp')||document.querySelector('main');
    if(!host || document.getElementById('azaadLongitudinalDashboard')) return;
    const section=document.createElement('section');section.id='azaadLongitudinalDashboard';host.appendChild(section);load();
  }
  function boot(){styles();mount();setTimeout(mount,1000);setTimeout(mount,2500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.AZAAD_LONGITUDINAL_DASHBOARD={load};
})();
