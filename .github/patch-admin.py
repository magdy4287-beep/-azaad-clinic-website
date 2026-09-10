from pathlib import Path
import re

ADMIN_SHELL_SRC = "/admin-shell.js?v=1"

# Canonical Admin feature modules. Each module has one build owner and one source reference.
ADMIN_FEATURE_SCRIPTS = (
    "azaad-platform-kernel.js",
    "azaad-operations-role-guard.js",
    "azaad-operations-control-center.js",
    "frontdesk-workflow.js",
    "patient-merge-tool.js",
    "patient-clinical-history.js",
    "admin-enhancements-v1.js",
    "admin-english-hardening.js",
    "doctors-center-v2.js",
    "services-center-v2.js",
    "patient-mrn-display-v2.js",
    "marketing-workspace-v2.js",
    "marketing-platform-expansion.js",
    "marketing-studio-v3.js",
    "public-team-admin.js",
    "ai-operating-center.js",
    "admin-patient-icon-guard.js",
    "admin-nextgen-v2.js",
    "waiting-list-center.js",
    "doctor-staff-binding.js",
    "doctor-staff-convert.js",
    "patient-financial-summary.js",
    "patient-appointment-actions.js",
    "doctor-visit-actions.js",
    "secretary-hybrid-workflow.js",
    "azaad-platform-control-plane.js",
)

# Only these files are permitted to receive the legacy translation-key compatibility
# rewrite. Never recursively mutate arbitrary JavaScript during a production build.
ADMIN_COMPATIBILITY_FILES = tuple(dict.fromkeys((
    "admin.html",
    "admin-english-hardening.js",
    *ADMIN_FEATURE_SCRIPTS,
)))


def _canonical_src(src):
    return src.split("?", 1)[0].lstrip("/")


def _remove_script_source(text, script_name):
    canonical = _canonical_src(script_name)
    pattern = re.compile(
        r'\s*<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>\s*</script>\s*',
        flags=re.I,
    )

    def replace(match):
        return "" if _canonical_src(match.group(1)) == canonical else match.group(0)

    return pattern.sub(replace, text)


def _remove_legacy_inline_admin_controller(text):
    """Explicit ownership marker: canonicalize-admin-runtime owns legacy-controller removal."""
    return text


def _inject_once(path_name, script_name, location):
    path = Path(path_name)
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    text = _remove_script_source(text, script_name)
    tag = f'<script src="{script_name}" defer></script>'
    marker = f"</{location}>"
    if marker not in text:
        raise SystemExit(f"FAIL-CLOSED: missing </{location}> in {path_name}")
    text = text.replace(marker, tag + "\n" + marker, 1)
    if text.count(tag) != 1:
        raise SystemExit(f"FAIL-CLOSED: expected one {script_name} owner in {path_name}")
    path.write_text(text, encoding="utf-8")


def inject_script(path_name, script_name):
    _inject_once(path_name, script_name, "body")


def inject_head_script(path_name, script_name):
    _inject_once(path_name, script_name, "head")


def patch_admin_injected_compatibility():
    path = Path("admin.html")
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    text = re.sub(
        r"const key\s*=\s*`azaadSrc\$\{a\}`;",
        "const key = a === 'aria-label' ? 'azaadSrcAriaLabel' : `azaadSrc${a}`;",
        text,
    )
    text = re.sub(r"\bconst\s+queued\s*=\s*false\b", "let queued=false", text)
    bridge = '<script>window.$=window.$||function(id){return document.getElementById(id)};</script>'
    if bridge not in text:
        text = text.replace('</head>', bridge + '\n</head>', 1)
    diagnostic = "<script>window.addEventListener('error',function(e){if(e&&e.error&&e.error.stack)console.error('[AZAAD_PAGE_ERROR_STACK]',e.error.stack);});</script>"
    if diagnostic not in text:
        text = text.replace('</head>', diagnostic + '\n</head>', 1)
    path.write_text(text, encoding="utf-8")


def patch_nextgen_scripts():
    # Explicit ownership list: production builds must never recursively rewrite
    # arbitrary JavaScript outside the Admin compatibility surface.
    for relative in ADMIN_COMPATIBILITY_FILES:
        path = Path(relative)
        if not path.exists() or path.suffix != '.js':
            continue
        text = path.read_text(encoding='utf-8', errors='replace')
        updated = text.replace(
            "const key=`azaadSrc${a}`;",
            "const key=a==='aria-label'?'azaadSrcAriaLabel':`azaadSrc${a}`;",
        )
        updated = updated.replace(
            "const key = `azaadSrc${a}`;",
            "const key=a==='aria-label'?'azaadSrcAriaLabel':`azaadSrc${a}`;",
        )
        if relative == "admin-english-hardening.js":
            updated = updated.replace("'معاد':'Rescheduled'},\nexact:", "'معاد':'Rescheduled',\nexact:")
        if updated != text:
            path.write_text(updated, encoding='utf-8')


# Runtime authentication, startup restoration, and session ownership are deliberately
# absent here. They belong exclusively to the canonical Appwrite/admin-boundary transforms.
for script in ADMIN_FEATURE_SCRIPTS:
    inject_script("admin.html", script)

inject_head_script("admin.html", ADMIN_SHELL_SRC)

for target, script in (
    ("clinical-assessment.html", "azaad-platform-kernel.js"),
    ("clinical-assessment.html", "clinical-followup-widget.js"),
    ("clinical-assessment.html", "clinician-transfer-widget.js"),
    ("clinical-assessment.html", "clinician-ai-session-cockpit.js"),
    ("clinical-assessment.html", "clinician-longitudinal-dashboard.js"),
    ("clinical-assessment.html", "patient-demographics-editor.js"),
    ("invoice-center.html", "azaad-platform-kernel.js"),
    ("invoice-center.html", "invoice-print-email.js"),
):
    inject_script(target, script)

patch_nextgen_scripts()
patch_admin_injected_compatibility()
print("patch-admin.py completed successfully")
