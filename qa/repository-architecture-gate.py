#!/usr/bin/env python3
"""Fail-closed architecture gate for the canonical AZAAD Admin tree and workflow ownership."""
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
ADMIN = ROOT / "admin.html"
PATCH = ROOT / ".github" / "patch-admin.py"
BUILD = ROOT / "qa" / "vercel-build.py"
CANONICALIZER = ROOT / "qa" / "canonicalize-admin-runtime.py"
WORKFLOW_DIR = ROOT / ".github" / "workflows"
REGISTRY = ROOT / "docs" / "AZAAD_WORKFLOW_OWNERSHIP_REGISTRY.md"
errors = []

RETIRED_ADMIN_LAYERS = (
    "admin-ui-failsafe.js",
    "admin-login-controller.js",
    "admin-login-bootstrap.js",
    "inject-admin-early-recovery.py",
    "patch-admin-auth-lifecycle.py",
    "patch-admin-auth-reload.py",
    "patch-auth-ready-gate.py",
    "patch-frontdesk-auth-bridge.py",
    "restore-admin-submit-binding.py",
)


def require_file(path: Path, label: str):
    if not path.is_file():
        errors.append(f"missing {label}: {path.relative_to(ROOT)}")

for path, label in (
    (ADMIN, "Admin entrypoint"),
    (ROOT / "admin.js", "canonical Admin application controller"),
    (ROOT / "admin-shell.js", "canonical Admin navigation shell"),
    (PATCH, "canonical Admin feature build patcher"),
    (BUILD, "canonical production build owner"),
    (CANONICALIZER, "canonical Admin runtime normalizer"),
    (REGISTRY, "workflow ownership registry"),
):
    require_file(path, label)

for relative in RETIRED_ADMIN_LAYERS:
    path = ROOT / relative
    if path.exists():
        errors.append(f"retired Admin runtime/build layer exists: {relative}")

if WORKFLOW_DIR.is_dir():
    for retired_workflow in ("azaad-production-certification-v2.yml",):
        if (WORKFLOW_DIR / retired_workflow).exists():
            errors.append(f"retired duplicate workflow exists: .github/workflows/{retired_workflow}")

if REGISTRY.is_file():
    registry = REGISTRY.read_text(encoding="utf-8", errors="replace")
    for marker in (
        "## Canonical ownership map", "## Retirement rule", "## Anti-recursion rule",
        "No workflow may create or modify source files",
    ):
        if marker not in registry:
            errors.append(f"workflow ownership registry missing required rule: {marker}")

if ADMIN.is_file():
    text = ADMIN.read_text(encoding="utf-8", errors="replace")
    canonical_refs = re.findall(
        r'<script\b[^>]*\bsrc\s*=\s*["\']([^"\']+)["\'][^>]*>\s*</script>',
        text, flags=re.I,
    )
    canonical_refs = [src for src in canonical_refs if Path(src.split("?", 1)[0]).name == "admin.js"]
    if len(canonical_refs) != 1:
        errors.append(f"canonical Admin application must have exactly one admin.js module reference; found {len(canonical_refs)}: {canonical_refs}")

    if "admin-login-bootstrap.js" in text or "AZAAD_ADMIN_AUTH_ISOLATION_V" in text:
        errors.append("frozen duplicate Admin login surface is referenced by admin.html")

    inline_blocks = re.findall(r'<script\b([^>]*)>(.*?)</script>', text, flags=re.I | re.S)
    for attrs, block in inline_blocks:
        if re.search(r'\bsrc\s*=', attrs, re.I):
            continue
        if sum(marker in block for marker in ("const SUPABASE_URL", "STAFF_LOGIN_FUNCTION", "function login", "clinic_staff")) >= 3:
            errors.append("legacy inline Admin application/login controller is present")
            break

    if len(re.findall(r'<script\b[^>]*\bsrc=["\'][^"\']*admin-shell\.js[^"\']*["\'][^>]*>', text, flags=re.I)) > 1:
        errors.append("Admin navigation Shell has duplicate executable source references")

    # The canonical shell is executable before authentication. It must appear
    # exactly once as a real src and never as an after-auth-only manifest entry.
    executable_shell = [
        src for src in re.findall(
            r'<script\b[^>]*\bsrc\s*=\s*["\']([^"\']+)["\'][^>]*>', text, flags=re.I
        )
        if (urlsplit(src).path or src).lstrip("/").lower() == "admin-shell.js"
    ]
    after_auth_shell = [
        src for src in re.findall(
            r'data-azaad-after-auth-src\s*=\s*["\']([^"\']+)["\']', text, flags=re.I
        )
        if (urlsplit(src).path or src).lstrip("/").lower() == "admin-shell.js"
    ]
    if len(executable_shell) != 1 or after_auth_shell:
        errors.append(
            "Admin navigation Shell must have exactly one executable pre-auth entry "
            f"and no after-auth entry; executable={len(executable_shell)}, after_auth={len(after_auth_shell)}"
        )

    if text.count("admin-shell.js") < 1:
        errors.append("Admin navigation Shell reference is missing")

    scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\'][^>]*>', text, flags=re.I)
    counts = {}
    for src in scripts:
        key = src.split("?", 1)[0]
        counts[key] = counts.get(key, 0) + 1
    for src, count in sorted(counts.items()):
        if src and count > 1:
            errors.append(f"duplicate Admin script source ({count}x): {src}")

    for retired in RETIRED_ADMIN_LAYERS:
        if retired in text:
            errors.append(f"retired Admin layer referenced by admin.html: {retired}")

if PATCH.is_file():
    text = PATCH.read_text(encoding="utf-8", errors="replace")
    if "rglob('*.js')" in text or 'rglob("*.js")' in text:
        errors.append("Admin patcher must not recursively mutate arbitrary JavaScript")
    if "Path('.').rglob" in text or 'Path(".").rglob' in text:
        errors.append("Admin patcher has an unbounded repository scan/mutation")
    if "_remove_legacy_inline_admin_controller" not in text:
        errors.append("Admin patcher must retain explicit legacy-controller ownership documentation")
    for retired in RETIRED_ADMIN_LAYERS:
        if retired in text:
            errors.append(f"retired Admin layer still referenced by patch-admin.py: {retired}")

if CANONICALIZER.is_file():
    text = CANONICALIZER.read_text(encoding="utf-8", errors="replace")
    for marker in (
        "CANONICAL = '/admin.js?v=2026-08-24-login-fix'",
        "legacy inline Admin controller",
        "Remove every previous Admin controller/bootstrap reference",
        "Remove duplicate external scripts",
    ):
        if marker not in text:
            errors.append(f"Admin runtime canonicalizer missing required invariant: {marker}")
    for forbidden_marker in ("LOGIN_BOOTSTRAP", "LOGIN_SURFACE_STYLE", "AZAAD_ADMIN_AUTH_ISOLATION_V"):
        if forbidden_marker in text:
            errors.append(f"retired login isolation invariant remains in canonicalizer: {forbidden_marker}")

if BUILD.is_file():
    text = BUILD.read_text(encoding="utf-8", errors="replace")
    if text.count("qa/repository-architecture-gate.py") != 1:
        errors.append("repository architecture gate must run exactly once")
    if text.count("qa/verify-admin-script-graph.py") != 1:
        errors.append("Admin script graph gate must run exactly once")
    if text.count("qa/canonicalize-admin-runtime.py") != 1:
        errors.append("Admin runtime canonicalizer must run exactly once")
    for retired in RETIRED_ADMIN_LAYERS:
        if retired in text:
            errors.append(f"retired Admin layer is in the production build: {retired}")

if WORKFLOW_DIR.is_dir():
    for workflow in WORKFLOW_DIR.glob("*.yml"):
        workflow_text = workflow.read_text(encoding="utf-8", errors="replace")
        for retired in RETIRED_ADMIN_LAYERS:
            if retired in workflow_text:
                errors.append(f"workflow references retired Admin layer: {workflow.relative_to(ROOT)} -> {retired}")

if errors:
    print("[AZAAD architecture gate] FAIL")
    for error in errors:
        print(f" - {error}")
    sys.exit(1)

print("[AZAAD architecture gate] PASS")
print("[AZAAD architecture gate] One Admin application owner + navigation-only shell + bounded build mutation + duplicate prevention + no duplicate login surface verified")
