#!/usr/bin/env python3
"""Fail-closed architecture gate for the canonical AZAAD Admin tree and workflow ownership."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
ADMIN = ROOT / "admin.html"
PATCH = ROOT / ".github" / "patch-admin.py"
BUILD = ROOT / "qa" / "vercel-build.py"
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
    (ROOT / "admin.js", "Admin application controller"),
    (ROOT / "admin-shell.js", "canonical Admin Shell"),
    (PATCH, "canonical Admin build patcher"),
    (BUILD, "canonical production build owner"),
    (REGISTRY, "workflow ownership registry"),
):
    require_file(path, label)

# Temporary recovery/controllers and divergent auth transforms must never return
# as parallel owners. Their behavior is now owned by the canonical build path.
for relative in RETIRED_ADMIN_LAYERS:
    path = ROOT / relative if "/" not in relative else ROOT / relative
    if path.exists():
        errors.append(f"retired Admin runtime/build layer exists: {relative}")

# Known duplicate certification workflow is retired; do not allow resurrection.
if WORKFLOW_DIR.is_dir():
    for retired_workflow in (
        "azaad-production-certification-v2.yml",
    ):
        if (WORKFLOW_DIR / retired_workflow).exists():
            errors.append(f"retired duplicate workflow exists: .github/workflows/{retired_workflow}")

if REGISTRY.is_file():
    registry = REGISTRY.read_text(encoding="utf-8", errors="replace")
    required_registry_markers = (
        "## Canonical ownership map",
        "## Retirement rule",
        "## Anti-recursion rule",
        "No workflow may create or modify source files",
    )
    for marker in required_registry_markers:
        if marker not in registry:
            errors.append(f"workflow ownership registry missing required rule: {marker}")

if ADMIN.is_file():
    text = ADMIN.read_text(encoding="utf-8", errors="replace")
    if text.count("admin-shell.js") != 1:
        errors.append("Admin Shell must have exactly one source reference")
    for retired in RETIRED_ADMIN_LAYERS:
        if retired in text:
            errors.append(f"retired Admin layer referenced by admin.html: {retired}")

    scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', text, flags=re.I)
    counts = {}
    for src in scripts:
        key = src.split("?", 1)[0]
        counts[key] = counts.get(key, 0) + 1
    for src, count in sorted(counts.items()):
        if src and count > 1:
            errors.append(f"duplicate Admin script source ({count}x): {src}")

if PATCH.is_file():
    text = PATCH.read_text(encoding="utf-8", errors="replace")
    if 'inject_head_script("admin.html", ADMIN_SHELL_SRC)' not in text:
        errors.append("Admin Shell is not injected through the canonical patcher owner")
    if "rglob('*.js')" in text or "rglob(\"*.js\")" in text:
        errors.append("Admin patcher must not recursively mutate arbitrary JavaScript")
    if "Path('.').rglob" in text or "Path(\".\").rglob" in text:
        errors.append("Admin patcher has an unbounded repository scan/mutation")
    for retired in RETIRED_ADMIN_LAYERS:
        if retired in text:
            errors.append(f"retired Admin layer still referenced by patch-admin.py: {retired}")

if BUILD.is_file():
    text = BUILD.read_text(encoding="utf-8", errors="replace")
    if text.count("qa/repository-architecture-gate.py") != 1:
        errors.append("repository architecture gate must run exactly once")
    if text.count("qa/verify-admin-script-graph.py") != 1:
        errors.append("Admin script graph gate must run exactly once")
    for retired in RETIRED_ADMIN_LAYERS:
        if retired in text:
            errors.append(f"retired Admin layer is in the production build: {retired}")

# No workflow may reference a retired transform. This prevents an old branch,
# copied workflow, or future edit from silently reintroducing a divergent build.
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
print("[AZAAD architecture gate] Canonical Admin owner + bounded build mutation + duplicate prevention + workflow ownership verified")
