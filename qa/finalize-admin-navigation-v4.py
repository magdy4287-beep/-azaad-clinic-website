from pathlib import Path
import re

ADMIN_HTML = Path('admin.html')
ADMIN_JS = Path('admin.js')
FEATURE = Path('admin-feature-controller.js')
if not ADMIN_HTML.exists() or not ADMIN_JS.exists() or not FEATURE.exists():
    raise SystemExit('canonical admin files missing')

html = ADMIN_HTML.read_text(encoding='utf-8')
js = ADMIN_JS.read_text(encoding='utf-8')

# Canonical bridge: feature code receives the existing auth/session/client;
# it never creates another authentication owner.
bridge = '''\n  window.AZAAD = Object.assign(window.AZAAD || {}, {\n    state,\n    supabase,\n    refresh: loadBookings,\n  });\n'''
if 'window.AZAAD = Object.assign(window.AZAAD || {}' not in js:
    anchor = '  state.initializing = false;\n'
    if anchor not in js:
        raise SystemExit('admin.js canonical initialization anchor missing')
    js = js.replace(anchor, anchor + bridge, 1)

style = '''\n<style id="azaad-admin-navigation-v4-style">\n.admin{width:100%!important;max-width:none!important;margin:0!important;padding-inline:clamp(10px,2vw,28px)!important}\n.topbar{position:relative!important;top:auto!important;width:100%!important}\n.azaad-admin-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0 14px;padding:10px 14px;background:#fff;border:1px solid #e3e6ed;border-radius:12px;color:#5f6880;font-weight:700}\n.azaad-admin-clock{direction:ltr;font-variant-numeric:tabular-nums}\n.azaad-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;margin-top:12px}\n.azaad-calendar-day{min-height:105px;border:1px solid #e1e5ed;border-radius:12px;background:#fff;padding:9px;cursor:pointer;text-align:right}\n.azaad-calendar-day:hover{border-color:#17214f}\n.azaad-calendar-day.is-selected{outline:2px solid #17214f}\n.azaad-calendar-day.is-today{background:#f5f7ff}\n.azaad-calendar-count{display:inline-flex;min-width:24px;height:24px;align-items:center;justify-content:center;border-radius:999px;background:#eef1f8;font-size:11px;font-weight:900}\n@media(max-width:760px){.azaad-calendar-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}\n</style>\n'''
if 'azaad-admin-navigation-v4-style' not in html:
    html = html.replace('</head>', style + '\n</head>', 1)

# Remove every previous inline post-auth panel loader. V4 is the only loader.
html = re.sub(r'<script\\b[^>]*>.*?window\\.AZAAD_LOAD_ADMIN_PANEL.*?</script>', '', html, flags=re.I|re.S)

loader = r'''<script id="azaad-admin-navigation-v4">
(function(){
  'use strict';
  if(window.__AZAAD_ADMIN_NAV_V4__) return;
  window.__AZAAD_ADMIN_NAV_V4__=true;
  var loaded=new Set(), loading=new Map();
  var groups={
    patientsPanel:['patients-center.js'],
    doctors:['admin-feature-controller.js','doctors-center-v2.js','doctor-staff-binding.js','doctor-staff-convert.js'],
    services:['admin-feature-controller.js','services-center-v2.js'],
    schedules:['admin-feature-controller.js','central-scheduling-center.js','scheduling-v2.js','scheduling-v2-waiting.js','scheduling-actions-contract.js'],
    posts:['admin-feature-controller.js','clinic-posts.js','marketing-workspace-v2.js','marketing-platform-expansion.js','marketing-studio-v3.js'],
    holidays:['admin-feature-controller.js'],
    hours:['admin-feature-controller.js'],
    staff:['staff-management.js','patient-merge-tool.js'],
    settings:['admin-feature-controller.js','admin-enhancements-v1.js']
  };
  function idle(){return new Promise(function(resolve){if(typeof requestIdleCallback==='function')requestIdleCallback(resolve,{timeout:400});else setTimeout(resolve,0);});}
  function load(src){if(loaded.has(src))return Promise.resolve();if(loading.has(src))return loading.get(src);var p=new Promise(function(resolve,reject){var s=document.createElement('script');s.src='/'+src;s.defer=true;s.dataset.azaadFeatureOwner='navigation-v4';s.onload=function(){loaded.add(src);loading.delete(src);resolve()};s.onerror=function(){loading.delete(src);reject(new Error('Failed to load '+src))};document.head.appendChild(s)});loading.set(src,p);return p}
  async function loadPanel(key){var files=groups[String(key||'')]||[];for(const src of files){await idle();try{await load(src)}catch(e){console.error('[AZAAD_ADMIN_FEATURE]',e)}}if(window.AZAAD_ADMIN_FEATURES?.ensure)await window.AZAAD_ADMIN_FEATURES.ensure();if(key==='calendar-center')renderCalendar()}
  window.AZAAD_LOAD_ADMIN_PANEL=loadPanel;

  function addTab(id,label){var tabs=document.querySelector('.tabs');if(!tabs||tabs.querySelector('[data-panel="'+id+'"]'))return null;var b=document.createElement('button');b.className='tab';b.type='button';b.dataset.panel=id;b.textContent=label;tabs.appendChild(b);return b}
  function ensurePanel(id,title,bodyHtml){if(document.getElementById(id))return;var admin=document.getElementById('adminPage');if(!admin)return;var s=document.createElement('section');s.id=id;s.className='panel';s.innerHTML='<div class="card"><div class="panel-head"><h2>'+title+'</h2></div><div id="'+id+'Body">'+(bodyHtml||'<div class="empty">⏳ جاري تجهيز القسم...</div>')+'</div></div>';admin.appendChild(s)}
  function activate(id,button){document.querySelectorAll('.tab[data-panel]').forEach(function(t){t.classList.toggle('active',t===button)});document.querySelectorAll('.panel').forEach(function(p){p.classList.toggle('active',p.id===id)})}
  function wireOwnTab(button){if(!button||button.dataset.navV4==='1')return;button.dataset.navV4='1';button.addEventListener('click',function(){activate(button.dataset.panel,button);loadPanel(button.dataset.panel)})}

  function renderCalendar(){var p=document.getElementById('calendar-center'),body=document.getElementById('calendar-centerBody');if(!p||!body)return;var bookings=window.AZAAD?.state?.bookings||[];var today=new Date();var selected=p.dataset.date||today.toISOString().slice(0,10);var d=new Date(selected+'T00:00:00');var start=new Date(d);start.setDate(d.getDate()-((d.getDay()+6)%7));var cells=[];for(var i=0;i<7;i++){var x=new Date(start);x.setDate(start.getDate()+i);var iso=x.toISOString().slice(0,10);var rows=bookings.filter(function(b){return String(b.appointment_date||'').slice(0,10)===iso}).sort(function(a,b){return String(a.appointment_time||'').localeCompare(String(b.appointment_time||''))});cells.push('<button type="button" class="azaad-calendar-day '+(iso===selected?'is-selected ':'')+(iso===today.toISOString().slice(0,10)?'is-today':'')+'" data-cal-date="'+iso+'"><b>'+x.toLocaleDateString('ar-EG',{weekday:'short'})+'</b><div>'+x.toLocaleDateString('ar-EG',{day:'numeric',month:'short'})+'</div><div class="azaad-calendar-count">'+rows.length+'</div><div class="muted">'+rows.slice(0,3).map(function(r){return (r.appointment_time||'').slice(0,5)+' '+(r.patient_name||'')}).join('<br>')+'</div></button>')};body.innerHTML='<div class="azaad-admin-meta"><span>📅 التقويم المركزي للحجوزات الفعلية</span><span>التاريخ: '+d.toLocaleDateString('ar-EG')+'</span></div><div class="azaad-calendar-grid">'+cells.join('')+'</div>';body.querySelectorAll('[data-cal-date]').forEach(function(b){b.onclick=function(){p.dataset.date=b.dataset.calDate;renderCalendar()}})}

  function boot(){
    var patient=addTab('patientsPanel','👤 Patient 360'); if(patient)wireOwnTab(patient);
    var cal=addTab('calendar-center','🗓️ التقويم'); if(cal)wireOwnTab(cal);
    ensurePanel('calendar-center','🗓️ التقويم المركزي','<div id="calendar-centerBody"></div>');
    var meta=document.getElementById('azaadAdminMeta');if(!meta){meta=document.createElement('div');meta.id='azaadAdminMeta';meta.className='azaad-admin-meta';var admin=document.getElementById('adminPage'),tabs=document.querySelector('.tabs');if(admin&&tabs)admin.insertBefore(meta,tabs)}
    function clock(){var now=new Date();meta.innerHTML='<span>📅 '+now.toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'})+'</span><span class="azaad-admin-clock">🕐 '+now.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true,timeZone:'Africa/Cairo'})+' Cairo</span>'} clock();setInterval(clock,1000);
    // The existing management suite owns its own tabs; V4 only observes those
    // clicks to load the feature data layer. It never installs another handler.
    document.addEventListener('click',function(e){var t=e.target?.closest?.('.tab[data-panel]');if(!t||t.dataset.navV4==='1')return;var key=t.dataset.panel;if(groups[key]){idle().then(function(){return loadPanel(key)})}},true);
    idle().then(function(){return load('admin-enhancements-v1.js')}).then(function(){return window.AZAAD_ADMIN_FEATURES?.ensure?.()}).catch(function(e){console.error('[AZAAD_ADMIN_ENHANCEMENT]',e)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
</script>
'''
if 'id="azaad-admin-navigation-v4"' not in html:
    html = html.replace('</body>', loader + '\n</body>', 1)

if html.count('id="azaad-admin-navigation-v4"') != 1:
    raise SystemExit('navigation v4 owner count invalid')
if 'window.AZAAD = Object.assign(window.AZAAD || {}' not in js:
    raise SystemExit('canonical feature bridge missing')

ADMIN_HTML.write_text(html, encoding='utf-8')
ADMIN_JS.write_text(js, encoding='utf-8')
print('[AZAAD] navigation v4: one lazy owner, core feature controller restored, calendar and clock enabled')
