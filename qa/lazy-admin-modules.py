from pathlib import Path
import re

CORE = [
    "admin-enhancements-v1.js",
    "admin-english-hardening.js",
    "admin-patient-icon-guard.js",
    "azaad-role-experience.js",
]

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
    "schedules": ["scheduling-v2.js"],
    "posts": ["marketing-studio-v3.js", "marketing-intelligence-loader.js"],
    "staff": ["staff-management.js", "patient-merge-tool.js", "hr-performance-analytics.js"],
    "settings": [],
    "calendar": ["admin-calendar-center.js"],
}

LEGACY_OR_CONTRACT = {
    "clinic-posts.js", "marketing-workspace-v2.js", "marketing-platform-expansion.js",
    "scheduling-actions-contract.js", "scheduling-v2-waiting.js", "admin-nextgen-fixes.js", "admin-nextgen-v2.js",
    "finance-executive-dashboard.js", "finance-executive-loader.js",
    "finance-executive-annual-monthly.js", "finance-executive-period-loader.js",
}
ALL_RUNTIME = {name for values in LAZY.values() for name in values} | set(CORE)


def script_tag(name):
    return f'<script src="/{name}" defer data-azaad-admin-core="1"></script>'


def main():
    path = Path("admin.html")
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    names_to_remove = ALL_RUNTIME | LEGACY_OR_CONTRACT
    for name in sorted(names_to_remove):
        tag = re.compile(r'<script\b[^>]*(?:src|data-azaad-after-auth-src)=["\'](?:/|\./)?' + re.escape(name) + r'(?:\?[^"\']*)?["\'][^>]*>\s*</script>', re.I)
        text = tag.sub("", text)
    core_marker = 'data-azaad-admin-core="1"'
    if core_marker not in text:
        text = text.replace("</body>", "\n".join(script_tag(name) for name in CORE) + "\n</body>", 1)
    if 'id="marketing-center"' not in text:
        marketing_mount = '''\n      <div id="marketing-center" data-azaad-marketing-mount="1"></div>\n'''
        posts_marker = re.compile(r'(\n  <section\n    id="posts"\n    class="panel"\n  >\n)', re.I)
        text = posts_marker.sub(r'\1' + marketing_mount, text, count=1)
    if 'id="calendar"' not in text and 'id="calendarPanel"' not in text:
        calendar_tab = '''\n<button class="tab" data-panel="calendar" type="button">🗓️ التقويم</button>\n'''
        text = text.replace('</div>\n\n  <section\n    id="bookings"', calendar_tab + '</div>\n\n  <section\n    id="bookings"', 1)
        calendar_panel = '''\n<section id="calendar" class="panel">\n  <div class="card">\n    <div class="panel-head"><div><h2>🗓️ التقويم المركزي</h2><div class="muted">الحجوزات الفعلية مرتبة حسب التاريخ والوقت.</div></div></div>\n    <div id="calendarBody" class="empty">⏳ جاري تجهيز التقويم...</div>\n  </div>\n</section>\n'''
        text = text.replace('\n  <section\n    id="bookings"', calendar_panel + '\n  <section\n    id="bookings"', 1)
    elif 'id="calendarPanel"' in text:
        text = text.replace('id="calendarPanel"', 'id="calendar"', 1)
    groups = repr(LAZY)
    payload = f"""
<script data-azaad-admin-module-registry="1">
(function(){{
  'use strict';
  const groups = {groups};
  const loaded = new Map();
  const loading = new Map();
  const loadedForPanel = new Set();
  const yieldToBrowser = () => new Promise(resolve => {{
    if (typeof window.requestIdleCallback === 'function') {{ window.requestIdleCallback(resolve, {{ timeout: 250 }}); return; }}
    window.setTimeout(resolve, 0);
  }});
  const load = src => {{
    if (loaded.has(src)) return Promise.resolve(true);
    if (loading.has(src)) return loading.get(src);
    const p = new Promise((resolve, reject) => {{
      const s = document.createElement('script');
      s.src = '/' + src; s.defer = true; s.dataset.azaadAdminModule = src;
      s.onload = () => {{ loaded.set(src, true); loading.delete(src); resolve(true); }};
      s.onerror = () => {{ loading.delete(src); reject(new Error('Failed to load ' + src)); }};
      document.head.appendChild(s);
    }});
    loading.set(src, p); return p;
  }};
  window.AZAAD_LOAD_ADMIN_PANEL = async function(panel) {{
    const key = String(panel || '');
    if (loadedForPanel.has(key)) {{ window.dispatchEvent(new CustomEvent('azaad:admin-panel-ready', {{ detail: {{ panel: key }} }})); return; }}
    loadedForPanel.add(key);
    for (const src of (groups[key] || [])) {{
      if (key !== 'calendar') await yieldToBrowser();
      try {{ await load(src); }} catch (err) {{
        console.error('[AZAAD_ADMIN_MODULE]', key, src, err);
        window.dispatchEvent(new CustomEvent('azaad:admin-module-error', {{ detail: {{ panel: key, src, error: err }} }}));
      }}
    }}
    window.dispatchEvent(new CustomEvent('azaad:admin-panel-ready', {{ detail: {{ panel: key }} }}));
  }};
  window.addEventListener('azaad:admin-panel-activated', event => {{
    const key = event.detail?.panel; if (!key) return;
    if (key === 'calendar') {{ window.AZAAD_LOAD_ADMIN_PANEL(key); return; }}
    yieldToBrowser().then(() => window.AZAAD_LOAD_ADMIN_PANEL(key));
  }});
  window.addEventListener('azaad:admin-authenticated', () => {{
    void window.AZAAD_LOAD_ADMIN_PANEL('calendar');
  }}, {{ once: true }});
  window.AZAAD_ADMIN_MODULE_REGISTRY = Object.freeze({{ core: {CORE!r}, groups, load: window.AZAAD_LOAD_ADMIN_PANEL }});
}})();
</script>
"""
    text = re.sub(r'<script\b[^>]*data-azaad-admin-module-registry=["\']1["\'][^>]*>.*?</script>', '', text, flags=re.I | re.S)
    text = text.replace("</body>", payload + "\n</body>", 1)
    path.write_text(text, encoding="utf-8")
    print("lazy-admin-modules.py completed successfully")


if __name__ == "__main__":
    main()
