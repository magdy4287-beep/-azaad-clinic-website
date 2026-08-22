from pathlib import Path
import re

# These modules are enhancements/features, not required to render or authenticate
# the admin shell. Loading them only when their surface is opened prevents the
# initial page from parsing and executing the entire admin application at once.
LAZY = {
    "bookings": [
        "patient-appointment-actions.js",
        "appointment-cancellation-ui.js",
        "patient-financial-summary.js",
        "patient-clinical-history.js",
    ],
    "doctors": [
        "doctors-center-v2.js",
        "doctor-staff-binding.js",
        "doctor-staff-convert.js",
    ],
    "services": ["services-center-v2.js"],
    "schedules": [
        "central-scheduling-center.js",
        "scheduling-v2.js",
        "scheduling-v2-waiting.js",
        "scheduling-actions-contract.js",
    ],
    "posts": [
        "clinic-posts.js",
        "marketing-workspace-v2.js",
        "marketing-platform-expansion.js",
        "marketing-studio-v3.js",
    ],
    "staff": ["staff-management.js", "patient-merge-tool.js"],
    "settings": [
        "admin-account-security.js",
        "admin-enhancements-v1.js",
        "admin-nextgen-fixes.js",
        "admin-nextgen-v2.js",
        "admin-english-hardening.js",
        "admin-patient-icon-guard.js",
    ],
}

# Only scripts explicitly injected by patch-admin are candidates. Existing
# application/core scripts remain untouched.
ALL_LAZY = {name for values in LAZY.values() for name in values}


def main():
    path = Path("admin.html")
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")

    for name in sorted(ALL_LAZY):
        tag = re.compile(r'<script\b[^>]*src=["\'](?:/)?' + re.escape(name) + r'(?:\?[^"\']*)?["\'][^>]*>\s*</script>', re.I)
        text = tag.sub("", text)

    payload = """
<script>
(function(){
  const groups = %s;
  const loaded = new Map();
  const loading = new Map();
  const loadedForPanel = new Set();
  const load = src => {
    if (loaded.has(src)) return loaded.get(src);
    if (loading.has(src)) return loading.get(src);
    const p = new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='/' + src;
      s.defer=true;
      s.onload=()=>{loaded.set(src,true);resolve();};
      s.onerror=()=>reject(new Error('Failed to load '+src));
      document.head.appendChild(s);
    });
    loading.set(src,p);
    return p;
  };
  window.AZAAD_LOAD_ADMIN_PANEL = async function(panel){
    const key=String(panel||'');
    if(loadedForPanel.has(key)) return;
    const files=groups[key]||[];
    loadedForPanel.add(key);
    await Promise.all(files.map(load));
    window.dispatchEvent(new CustomEvent('azaad:admin-panel-ready',{detail:{panel:key}}));
  };
  const activate=el=>{
    const panel=el?.getAttribute('data-panel');
    if(panel) window.AZAAD_LOAD_ADMIN_PANEL(panel).catch(e=>console.error('[AZAAD_ADMIN_MODULE]',e));
  };
  document.addEventListener('click',e=>{
    const tab=e.target?.closest?.('[data-panel]');
    if(tab) activate(tab);
  },{passive:true});
  window.addEventListener('load',()=>{
    const active=document.querySelector('.tab.active[data-panel]');
    // Keep the first screen responsive; bookings are loaded after first paint.
    if(active) setTimeout(()=>activate(active),0);
  },{once:true});
})();
</script>
""" % repr(LAZY)

    if "window.AZAAD_LOAD_ADMIN_PANEL" not in text:
        text = text.replace("</body>", payload + "\n</body>", 1)

    path.write_text(text, encoding="utf-8")
    print("lazy-admin-modules.py completed successfully")


if __name__ == "__main__":
    main()
