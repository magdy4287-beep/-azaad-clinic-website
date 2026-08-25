from pathlib import Path
import re

# Canonical runtime ownership. A module may appear in exactly one group.
# QA/contract files are never loaded into the browser.
CORE = [
    "admin-enhancements-v1.js",
    "admin-english-hardening.js",
    "admin-patient-icon-guard.js",
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
}

# These files are intentionally not browser runtime modules:
# - clinic-posts.js owns public-site rendering, not Admin.
# - marketing-workspace-v2.js / marketing-platform-expansion.js were superseded
#   by marketing-studio-v3.js.
# - scheduling-v2-waiting.js was a second waiting-list submit handler and depended
#   on an obsolete global; Scheduling V2 now remains the single scheduling UI owner.
# - scheduling-actions-contract.js is a QA contract, never a runtime dependency.
LEGACY_OR_CONTRACT = {
    "clinic-posts.js",
    "marketing-workspace-v2.js",
    "marketing-platform-expansion.js",
    "scheduling-v2-waiting.js",
    "scheduling-actions-contract.js",
    "admin-nextgen-fixes.js",
    "admin-nextgen-v2.js",
}

ALL_RUNTIME = {name for values in LAZY.values() for name in values} | set(CORE)


def script_tag(name):
    return (
        f'<script src="/{name}" defer data-azaad-admin-core="1"></script>'
    )


def main():
    path = Path("admin.html")
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")

    # Remove all previously injected module tags before installing one canonical
    # runtime registry. This is intentionally idempotent.
    names_to_remove = ALL_RUNTIME | LEGACY_OR_CONTRACT
    for name in sorted(names_to_remove):
        tag = re.compile(
            r'<script\b[^>]*src=["\'](?:/)?' + re.escape(name) +
            r'(?:\?[^"\']*)?["\'][^>]*>\s*</script>', re.I
        )
        text = tag.sub("", text)

    # The core layer is non-blocking and loaded exactly once. It owns the
    # cross-cutting admin enhancements; panel-specific code remains lazy.
    core_marker = 'data-azaad-admin-core="1"'
    if core_marker not in text:
        payload = "\n".join(script_tag(name) for name in CORE)
        text = text.replace("</body>", payload + "\n</body>", 1)

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
    if (typeof window.requestIdleCallback === 'function') {{
      window.requestIdleCallback(resolve, {{ timeout: 250 }});
      return;
    }}
    window.setTimeout(resolve, 0);
  }});

  const load = src => {{
    if (loaded.has(src)) return Promise.resolve(true);
    if (loading.has(src)) return loading.get(src);
    const p = new Promise((resolve, reject) => {{
      const s = document.createElement('script');
      s.src = '/' + src;
      s.defer = true;
      s.dataset.azaadAdminModule = src;
      s.onload = () => {{ loaded.set(src, true); loading.delete(src); resolve(true); }};
      s.onerror = () => {{ loading.delete(src); reject(new Error('Failed to load ' + src)); }};
      document.head.appendChild(s);
    }});
    loading.set(src, p);
    return p;
  }};

  window.AZAAD_LOAD_ADMIN_PANEL = async function(panel) {{
    const key = String(panel || '');
    if (loadedForPanel.has(key)) return;
    loadedForPanel.add(key);
    for (const src of (groups[key] || [])) {{
      await yieldToBrowser();
      try {{ await load(src); }}
      catch (err) {{
        console.error('[AZAAD_ADMIN_MODULE]', key, src, err);
        window.dispatchEvent(new CustomEvent('azaad:admin-module-error', {{ detail: {{ panel: key, src, error: err }} }}));
      }}
    }}
    window.dispatchEvent(new CustomEvent('azaad:admin-panel-ready', {{ detail: {{ panel: key }} }}));
  }};

  // Never block navigation/auth. Loading begins after the browser gets a frame.
  document.addEventListener('click', event => {{
    const tab = event.target?.closest?.('[data-panel]');
    if (!tab) return;
    const key = tab.getAttribute('data-panel');
    yieldToBrowser().then(() => window.AZAAD_LOAD_ADMIN_PANEL(key));
  }}, {{ passive: true }});

  window.AZAAD_ADMIN_MODULE_REGISTRY = Object.freeze({{
    core: {CORE!r},
    groups,
    load: window.AZAAD_LOAD_ADMIN_PANEL
  }});
}})();
</script>
"""

    text = re.sub(
        r'<script\b[^>]*data-azaad-admin-module-registry=["\']1["\'][^>]*>.*?</script>',
        '', text, flags=re.I | re.S
    )
    text = text.replace("</body>", payload + "\n</body>", 1)

    path.write_text(text, encoding="utf-8")
    print("lazy-admin-modules.py completed successfully")


if __name__ == "__main__":
    main()
