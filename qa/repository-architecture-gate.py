#!/usr/bin/env python3
"""Fail-closed architecture gate for the canonical AZAAD Admin tree and workflow ownership."""
from pathlib import Path
import re
import sys

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
        "## Canonical ownership map",
        "## Retirement rule",
        "## Anti-recursion rule",
        "No workflow may create or modify source files",
    ):
        if marker not in registry:
            errors.append(f"workflow ownership registry missing required rule: {marker}")

if ADMIN.is_file():
    text = ADMIN.read_text(encoding="utf-8", errors="replace")

    # The Admin application has exactly one runtime owner: admin.js.
    canonical_refs = re.findall(
        r'<script\b[^>]*\btype=["\']module["\'][^>]*\bsrc=["\']([^"\']*admin\.js[^"\']*)["\'][^>]*>\s*</script>',
        text,
        flags=re.I,
    )
    if len(canonical_refs) != 1:
        errors.append(f"canonical Admin application must have exactly one admin.js module reference; found {len(canonical_refs)}")

    # The old giant inline controller must never return.
    if (
        "const SUPABASE_URL" in text
        and "function renderDoctors" in text
        and "window.AZAAD_AUTH_READY" in text
    ):
        errors.append("legacy inline Admin application controller is present")

    if text.count("admin-shell.js") != 1:
        errors.append("Admin navigation Shell must have exactly one source reference")

    for retired in RETIRED_ADMIN_LAYERS:
        if retired in text:
            errors.append(f"retired Admin layer referenced by admin.html: {retired}")

    scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\'][^>]*>', text, flags=re.I)
    counts = {}
    for src in scripts:
        key = src.split("?", 1)[0]
        counts[key] = counts.get(key, 0) + 1
    for src, count in sorted(counts.items()):
        if src and count > 1:
            errors.append(f"duplicate Admin script source ({count}x): {src}")

if PATCH.is_file():
    text = PATCH.read_text(encoding="utf-8", errors="replace")
    if "rglob('*.js')" in text or 'rglob("*.js")' in text:
        errors.append("Admin patcher must not recursively mutate arbitrary JavaScript")
    if "Path('.').rglob" in text or 'Path(".").rglob' in text:
        errors.append("Admin patcher has an unbounded repository scan/mutation")
    for retired in RETIRED_ADMIN_LAYERS:
        if retired in text:
            errors.append(f"retired Admin layer still referenced by patch-admin.py: {retired}")

if CANONICALIZER.is_file():
    text = CANONICALIZER.read_text(encoding="utf-8", errors="replace")
    for marker in (
        "function renderDoctors",
        "window.AZAAD_AUTH_READY",
        "admin.js?v=canonical",
    ):
        if marker not in text:
            errors.append(f"Admin runtime canonicalizer missing required invariant: {marker}")

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
print("[AZAAD architecture gate] One Admin application owner + navigation-only shell + bounded build mutation + duplicate prevention verified")
