from pathlib import Path
import re

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
    "posts": ["marketing-studio-v3.js", "marketing-intelligence-loader.js"],
    "staff": ["staff-management.js", "patient-merge-tool.js"],
    "settings": [
        "admin-enhancements-v1.js",
        "admin-english-hardening.js",
        "admin-patient-icon-guard.js",
    ],
}

ALL_LAZY = {name for values in LAZY.values() for name in values}


def main():
    path = Path("admin.html")
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")

    # Remove legacy/duplicate Marketing owners from the Admin shell.
    for name in sorted(ALL_LAZY | {
        "clinic-posts.js",
        "marketing-workspace-v2.js",
        "marketing-platform-expansion.js",
        "admin-nextgen-fixes.js",
        "admin-nextgen-v2.js",
    }):
        tag = re.compile(
            r'<script\b[^>]*src=["\'](?:/)?' + re.escape(name) +
            r'(?:\?[^"\']*)?["\'][^>]*>\s*</script>', re.I
        )
        text = tag.sub("", text)

    payload = """
<script>
(function(){
  const groups = %s;
  const loaded = new Map();
  const loading = new Map();
  const loadedForPanel = new Set();
  const yieldToBrowser = () => new Promise(resolve => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => resolve(), { timeout: 250 });
      return;
    }
    window.setTimeout(resolve, 0);
  });
  const load = src => {
    if (loaded.has(src)) return Promise.resolve(true);
    if (loading.has(src)) return loading.get(src);
    const p = new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='/' + src;
      s.defer=true;
      s.onload=()=>{loaded.set(src,true);loading.delete(src);resolve(true);};
      s.onerror=()=>{loading.delete(src);reject(new Error('Failed to load '+src));};
      document.head.appendChild(s);
    });
    loading.set(src,p);
    return p;
  };
  window.AZAAD_LOAD_ADMIN_PANEL = async function(panel){
    const key=String(panel||'');
    if(loadedForPanel.has(key)) return;
    const files=groups[key]||[];
    if (!files.length) return;
    loadedForPanel.add(key);
    for (const src of files) {
      await yieldToBrowser();
      try { await load(src); }
      catch (err) { console.error('[AZAAD_ADMIN_MODULE]',err); }
    }
    window.dispatchEvent(new CustomEvent('azaad:admin-panel-ready',{detail:{panel:key}}));
  };
  document.addEventListener('click',e=>{
    const tab=e.target?.closest?.('[data-panel]');
    if(!tab) return;
    const key=tab.getAttribute('data-panel');
    yieldToBrowser().then(() => window.AZAAD_LOAD_ADMIN_PANEL(key))
      .catch(err => console.error('[AZAAD_ADMIN_MODULE]',err));
  },{passive:true});
})();
</script>
""" % repr(LAZY)

    if "window.AZAAD_LOAD_ADMIN_PANEL" not in text:
        text = text.replace("</body>", payload + "\n</body>", 1)

    path.write_text(text, encoding="utf-8")
    print("lazy-admin-modules.py completed successfully")


if __name__ == "__main__":
    main()
