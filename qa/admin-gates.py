from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

admin = (ROOT / "admin.html").read_text(encoding="utf-8")
hardening = (ROOT / "admin-english-hardening.js").read_text(encoding="utf-8")
patcher = (ROOT / ".github" / "patch-admin.py").read_text(encoding="utf-8")
mrn_display = (ROOT / "patient-mrn-display-v2.js").read_text(encoding="utf-8")
central_i18n = (ROOT / "central-i18n.js").read_text(encoding="utf-8")
lazy_registry = (ROOT / "qa" / "lazy-admin-modules.py").read_text(encoding="utf-8")

checks = []

def check(name, ok, detail=""):
    checks.append((name, ok, detail))

check("English hardening script exists", len(hardening) > 1000)
check(
    "English hardening is injected by build patch",
    re.search(r'inject_script\("admin\\.html"\s*,\s*"admin-english-hardening\\.js"\)', patcher) is not None
    or ("patch-admin.py completed successfully" in patcher and "admin-english-hardening.js" in patcher),
)

check(
    "Arabic/English direction switching exists",
    "document.documentElement.dir" in central_i18n and "document.documentElement.lang" in central_i18n
    and "ltr" in central_i18n and "rtl" in central_i18n,
)
check(
    "Language preference is persisted",
    "ADMIN_KEY='azaad_admin_lang'" in central_i18n and "localStorage" in central_i18n,
)

check("Short patient number is canonicalized", "padStart(6, '0')" in hardening and "AZA-" in hardening)
check(
    "Legacy Patient 6-digit display is not the approved V2 format",
    "Patient ${String(Number(digits)).padStart(5, '0')}" in hardening,
)
check("Patient MRN display V2 exists", "Patient ${m[1].slice(-5)}" in mrn_display)
check("Patient MRN display V2 is injected", "patient-mrn-display-v2.js" in patcher)
check(
    "Patient display layer is display-only",
    "never mutates the database MRN" in mrn_display and "supabase" not in mrn_display.lower(),
)
check("Patient display accepts canonical AZA MRN", "^AZA-?(\\d{6})$" in mrn_display)
check("Patient display produces five digits", "slice(-5)" in mrn_display)

check(
    "Dynamic DOM translation is enabled",
    all(token in central_i18n for token in (
        "function keyed(",
        "function legacy(",
        "function bind(",
        "MutationObserver",
        "childList:true",
        "window.dispatchEvent(new CustomEvent('azaadLanguageChanged'",
    )),
)
check("Service-role key is not embedded", "service_role" not in admin.lower() and "service_role" not in hardening.lower())
check("Existing admin baseline remains present", 'id="adminPage"' in admin and 'id="loginPage"' in admin)
check("Patient Center is part of the startup patch", "patch_patient_center" in patcher and "patients-center.js" in patcher)

CANONICAL_PANELS = {
    "bookings": "الحجوزات",
    "doctors": "الأطباء",
    "services": "الخدمات",
    "schedules": "جداول الأطباء",
    "posts": "المنشورات والعروض",
    "holidays": "العطلات والإغلاقات",
    "hours": "ساعات العمل العامة",
    "staff": "إدارة الموظفين",
    "settings": "إعدادات العيادة",
    "account": "حساب الإدارة",
}

for panel, label in CANONICAL_PANELS.items():
    occurrences = len(re.findall(r'data-panel=["\']' + re.escape(panel) + r'["\']', admin))
    check(
        f"Admin panel: {panel}",
        occurrences == 1 and label in admin and f'id="{panel}"' in admin,
        f"expected exactly one tab and one panel, found {occurrences} tab(s)",
    )

check(
    "Canonical Admin module registry source exists",
    "window.AZAAD_LOAD_ADMIN_PANEL = async function(panel)" in lazy_registry
    and "data-azaad-admin-module-registry" in lazy_registry
    and "const groups =" in lazy_registry,
)

if "window.AZAAD_LOAD_ADMIN_PANEL = async function(panel)" in lazy_registry:
    # The canonical source declares LAZY immediately before LEGACY_OR_CONTRACT.
    # Keep this parser tied to that real source boundary rather than an obsolete
    # comment delimiter that silently turned valid ownership entries into failures.
    groups_match = re.search(
        r"LAZY\s*=\s*\{(.*?)\n\}\n\nLEGACY_OR_CONTRACT\s*=",
        lazy_registry,
        re.S,
    )
    groups_source = groups_match.group(1) if groups_match else ""
    check("Canonical lazy ownership map is parseable", bool(groups_source))
    for panel in CANONICAL_PANELS:
        owned_by_lazy = re.search(r"[\"']" + re.escape(panel) + r"[\"']\s*:", groups_source) is not None
        owned_by_core = panel in {"holidays", "hours", "settings", "account"}
        check(
            f"Registry ownership: {panel}",
            owned_by_lazy or owned_by_core,
            "panel is missing from the canonical lazy/core ownership contract",
        )

failed = False
for name, ok, detail in checks:
    mark = "PASS" if ok else "FAIL"
    print(f"[{mark}] {name}" + (f" — {detail}" if detail else ""))
    failed |= not ok

print(
    f"\nAZAAD admin gate checks: {len(checks)} total, "
    f"{sum(ok for _, ok, _ in checks)} passed, {sum(not ok for _, ok, _ in checks)} failed."
)
sys.exit(1 if failed else 0)
