#!/usr/bin/env python3
"""AZAAD comprehensive system contract.

This is intentionally fail-closed. It catches architectural regressions that
previous narrow gates missed: central I18N drift, language reloads, refund
approval bypasses, staff-account lifecycle gaps, hard-coded appointment-hour
limits, missing AI/reporting surfaces, and duplicated admin trees.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FAILURES: list[str] = []
WARNINGS: list[str] = []


def read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        FAILURES.append(f"cannot read {path}: {exc}")
        return ""


def require(condition: bool, message: str) -> None:
    if not condition:
        FAILURES.append(message)


# 1. Central language authority.
central = ROOT / "central-i18n.js"
stability = ROOT / "central-i18n-stability.js"
require(central.exists(), "central-i18n.js is missing")
require(stability.exists(), "central-i18n-stability.js is missing")
central_text = read(central) if central.exists() else ""
stability_text = read(stability) if stability.exists() else ""
require("window.AZAAD_I18N" in central_text, "central-i18n.js does not expose the central runtime API")
require("location.reload()" not in central_text, "central-i18n.js reloads pages during language switching")
require("MutationObserver" in central_text, "central-i18n.js has no dynamic-content translation observer")
require("azaadLanguageChanged" in central_text, "central-i18n.js has no centralized language-change event")

# Every first-class HTML page must load the central language authority.
html_files = sorted(ROOT.rglob("*.html"))
for html in html_files:
    rel = html.relative_to(ROOT).as_posix()
    text = read(html)
    if "node_modules" in rel or ".git/" in rel:
        continue
    require("central-i18n.js" in text, f"{rel}: missing central-i18n.js")
    # A page may have a local translation dictionary, but it must not reload to
    # change language. Presentation-only switching is a core contract.
    if re.search(r"(?:lang|language)[^\n]{0,180}location\.reload\s*\(", text, re.I):
        FAILURES.append(f"{rel}: language switching contains location.reload()")

# 2. Scheduling: no artificial 1..12-hour presentation ceiling.
source_files = [p for p in ROOT.rglob("*.js") if ".git" not in p.parts]
for path in source_files:
    text = read(path)
    rel = path.relative_to(ROOT).as_posix()
    suspicious = [
        r"(?:1|01)\s*[-–]\s*(?:12|12:00)",
        r"(?:hour|hours|ساعة)[^\n]{0,80}(?:12|12:00)",
        r"(?:max|maximum|limit|حد)[^\n]{0,80}(?:12|12:00)",
    ]
    if any(re.search(pattern, text, re.I) for pattern in suspicious):
        WARNINGS.append(f"{rel}: review possible hard-coded 1-12 scheduling limit")

# 3. Refund safety: every path must remain Doctor -> Management/Owner -> Process.
refund = ROOT / "refund-workflow-ui.js"
refund_text = read(refund) if refund.exists() else ""
require(refund.exists(), "refund-workflow-ui.js is missing")
for token in (
    "approve_refund_doctor",
    "approve_refund_management",
    "process_refund",
    "doctor_approval_status",
    "management_approval_status",
):
    require(token in refund_text, f"refund workflow missing mandatory control: {token}")
require(
    "Every refund: Request -> Doctor Approval -> Management/Owner Approval -> Processing" in refund_text,
    "refund workflow does not explicitly enforce the permanent approval hierarchy",
)

# 4. Staff lifecycle: owner-controlled account management and password recovery.
security_candidates = list(ROOT.rglob("*.js")) + list(ROOT.rglob("*.sql")) + list(ROOT.rglob("*.html"))
security_text = "\n".join(read(p) for p in security_candidates if ".git" not in p.parts)
for token in (
    "change-password",
    "owner_set_staff_account_status",
    "suspend",
    "disable",
    "reactivate",
):
    require(token.lower() in security_text.lower(), f"staff account lifecycle contract missing: {token}")

# 5. AI and reporting surfaces must exist in source, not only documentation.
ai_hits = list(ROOT.rglob("*ai*")) + list(ROOT.rglob("*AI*"))
report_hits = list(ROOT.rglob("*report*")) + list(ROOT.rglob("*Report*"))
require(bool(ai_hits), "no AI implementation/gate surface found")
require(bool(report_hits), "no reporting implementation/gate surface found")

# Existing AI gates must be present together with the department/executive gates.
workflow_dir = ROOT / ".github" / "workflows"
workflow_names = {p.name for p in workflow_dir.glob("*.yml")} if workflow_dir.exists() else set()
for expected in (
    "azaad-ai-gate.yml",
    "azaad-department-ai-gate.yml",
    "azaad-executive-ai-gate.yml",
    "azaad-payments-reporting-gate.yml",
    "azaad-integration-gate.yml",
):
    require(expected in workflow_names, f"missing required workflow gate: {expected}")

# 6. Duplicate admin trees are dangerous: one canonical admin surface only.
admin_dirs = [p for p in ROOT.glob("admin/**/index.html") if p.is_file()]
if len(admin_dirs) > 1:
    FAILURES.append(
        "multiple nested admin/index.html surfaces detected: "
        + ", ".join(p.relative_to(ROOT).as_posix() for p in admin_dirs)
    )

# 7. Free-only: reject obvious paid-provider dependencies in application source.
paid_markers = ("openai.com", "anthropic.com", "gemini.google.com")
# This is a review flag rather than an absolute prohibition because a URL can
# occur in documentation. Application runtime references are the important part.
for path in source_files:
    text = read(path)
    rel = path.relative_to(ROOT).as_posix()
    if any(marker in text for marker in paid_markers) and "qa/" not in rel:
        WARNINGS.append(f"{rel}: review external AI provider reference for Free-only compliance")

print("AZAAD comprehensive system contract")
print(f"HTML pages scanned: {len(html_files)}")
print(f"JS sources scanned: {len(source_files)}")
if WARNINGS:
    print("WARNINGS:")
    for item in sorted(set(WARNINGS)):
        print(f"  - {item}")
if FAILURES:
    print("FAILURES:")
    for item in FAILURES:
        print(f"  - {item}")
    print(f"CONTRACT FAILED: {len(FAILURES)} blocking finding(s)")
    sys.exit(1)
print("CONTRACT PASSED")
