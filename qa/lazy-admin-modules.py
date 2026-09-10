from pathlib import Path
import re

CORE = [
    "admin-english-hardening.js",
    "admin-patient-icon-guard.js",
    "azaad-role-experience.js",
]
LAZY = {
    "bookings":["patient-appointment-actions.js","appointment-cancellation-ui.js","patient-financial-summary.js","patient-clinical-history.js"],
    "doctors":["doctors-center-v2.js","doctor-staff-binding.js","doctor-staff-convert.js"],
    "services":["services-center-v2.js"],
    "schedules":["scheduling-v2.js"],
    "posts":["marketing-studio-v4.js","marketing-intelligence-loader.js"],
    "staff":["staff-management.js"],
    "settings":[],
    "calendar":["admin-calendar-center.js"],
}
LEGACY_OR_CONTRACT={"admin-enhancements-v1.js","clinic-posts.js","marketing-workspace-v2.js","marketing-platform-expansion.js","marketing-studio-v3.js","scheduling-actions-contract.js","scheduling-v2-waiting.js","admin-nextgen-fixes.js","admin-nextgen-v2.js","finance-executive-dashboard.js","finance-executive-loader.js","finance-executive-annual-monthly.js","finance-executive-period-loader.js","patient-merge-tool.js","hr-performance-analytics.js"}
ALL_RUNTIME={name for values in LAZY.values() for name in values}|set(CORE)
def script_tag(name):return f'<script src="/{name}" defer data-azaad-admin-core="1"></script>'
def main():
    path=Path('admin.html')
    if not path.exists():return
    text=path.read_text(encoding='utf-8');names_to_remove=ALL_RUNTIME|LEGACY_OR_CONTRACT
    for name in sorted(names_to_remove):
        text=re.sub(r'<script\b[^>]*(?:src|data-azaad-after-auth-src)=["\'](?:/|\./)?'+re.escape(name)+r'(?:\?[^"\']*)?["\'][^>]*>\s*</script>','',text,flags=re.I)
    if 'data-azaad-admin-core="1"' not in text:text=text.replace('</body>',"\n".join(script_tag(n) for n in CORE)+"\n</body>",1)
    groups=repr(LAZY)
    payload=f'''<script data-azaad-admin-module-registry="1">\n(function(){{'use strict';const groups={groups};const buildSha=document.querySelector('meta[name="azaad-build-sha"]')?.content||'dev';const loaded=new Map(),loading=new Map(),loadedForPanel=new Set();const yieldToBrowser=()=>new Promise(r=>{{if(typeof window.requestIdleCallback==='function'){{window.requestIdleCallback(r,{{timeout:250}});return}}window.setTimeout(r,0)}});const load=src=>{{if(loaded.has(src))return Promise.resolve(true);if(loading.has(src))return loading.get(src);const p=new Promise((resolve,reject)=>{{const s=document.createElement('script');const sep=src.includes('?')?'&':'?';s.src='/'+src+sep+'azaad_build='+encodeURIComponent(buildSha);s.defer=true;s.dataset.azaadAdminModule=src;s.dataset.azaadBuildSha=buildSha;s.onload=()=>{{loaded.set(src,true);loading.delete(src);resolve(true)}};s.onerror=()=>{{loading.delete(src);reject(new Error('Failed to load '+src))}};document.head.appendChild(s)}});loading.set(src,p);return p}};window.AZAAD_LOAD_ADMIN_PANEL=async function(panel){{const key=String(panel||'');if(loadedForPanel.has(key)){{window.dispatchEvent(new CustomEvent('azaad:admin-panel-ready',{{detail:{{panel:key}}}}));return}}loadedForPanel.add(key);for(const src of(groups[key]||[])){{if(key!=='calendar')await yieldToBrowser();try{{await load(src);if(key==='calendar')window.AZAAD_ADMIN_CALENDAR?.render()}}catch(err){{console.error('[AZAAD_ADMIN_MODULE]',key,src,err);window.dispatchEvent(new CustomEvent('azaad:admin-module-error',{{detail:{{panel:key,src,error:err}}}}))}}}}window.dispatchEvent(new CustomEvent('azaad:admin-panel-ready',{{detail:{{panel:key}}}}))}};window.addEventListener('azaad:admin-panel-activated',e=>{{const key=e.detail?.panel;if(!key)return;if(key==='calendar'){{window.AZAAD_LOAD_ADMIN_PANEL(key);return}}yieldToBrowser().then(()=>window.AZAAD_LOAD_ADMIN_PANEL(key))}});window.addEventListener('azaad:admin-authenticated',()=>{{void window.AZAAD_LOAD_ADMIN_PANEL('calendar')}},{{once:true}});window.AZAAD_ADMIN_MODULE_REGISTRY=Object.freeze({{core:{CORE!r},groups,load:window.AZAAD_LOAD_ADMIN_PANEL,buildSha}})}})();\n</script>'''
    text=re.sub(r'<script\b[^>]*data-azaad-admin-module-registry=["\']1["\'][^>]*>.*?</script>','',text,flags=re.I|re.S);text=text.replace('</body>',payload+'\n</body>',1);path.write_text(text,encoding='utf-8');print('lazy-admin-modules.py completed successfully')
if __name__=='__main__':main()
