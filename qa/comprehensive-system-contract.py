#!/usr/bin/env python3
"""AZAAD comprehensive system contract.

Fail-closed architecture gate for the whole product, not the latest symptom.
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


central = ROOT / "central-i18n.js"
stability = ROOT / "central-i18n-stability.js"
vercel = ROOT / "vercel.json"
require(central.exists(), "central-i18n.js is missing")
require(stability.exists(), "central-i18n-stability.js is missing")
central_text = read(central) if central.exists() else ""
vercel_text = read(vercel) if vercel.exists() else ""
require("window.AZAAD_I18N" in central_text, "central-i18n.js does not expose the central runtime API")
require("location.reload()" not in central_text, "central-i18n.js reloads pages during language switching")
require("MutationObserver" in central_text, "central-i18n.js has no dynamic-content translation observer")
require("azaadLanguageChanged" in central_text, "central-i18n.js has no centralized language-change event")
require("qa/inject-central-i18n.py" in vercel_text, "Vercel build does not enforce central I18N on every HTML surface")

html_files = sorted(ROOT.rglob("*.html"))
for html in html_files:
    rel = html.relative_to(ROOT).as_posix()
    text = read(html)
    if "node_modules" in rel or ".git/" in rel:
        continue
    if "central-i18n.js" not in text and "qa/inject-central-i18n.py" not in vercel_text:
        FAILURES.append(f"{rel}: no central I18N runtime or build injection")
    if re.search(r"(?:lang|language)[^\n]{0,180}location\.reload\s*\(", text, re.I):
        FAILURES.append(f"{rel}: language switching contains location.reload()")

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

refund = ROOT / "refund-workflow-ui.js"
refund_text = read(refund) if refund.exists() else ""
require(refund.exists(), "refund-workflow-ui.js is missing")
for token in ("approve_refund_doctor", "approve_refund_management", "process_refund", "doctor_approval_status", "management_approval_status"):
    require(token in refund_text, f"refund workflow missing mandatory control: {token}")
require("Every refund: Request -> Doctor Approval -> Management/Owner Approval -> Processing" in refund_text, "refund workflow does not explicitly enforce the permanent approval hierarchy")

security_files = [p for p in ROOT.rglob("*") if p.is_file() and p.suffix.lower() in {".js", ".sql", ".html", ".md"} and ".git" not in p.parts]
security_text = "\n".join(read(p) for p in security_files)
require((ROOT / "change-password.html").exists(), "staff password-change page is missing")
require("owner_set_staff_account_status" in security_text, "owner-controlled staff status RPC is missing")
require("suspend" in security_text.lower(), "staff suspension capability is missing")
require("disable" in security_text.lower(), "staff disable capability is missing")
require("reactivate" in security_text.lower(), "staff reactivation capability is missing")

ai_hits = list(ROOT.rglob("*ai*")) + list(ROOT.rglob("*AI*"))
report_hits = list(ROOT.rglob("*report*")) + list(ROOT.rglob("*Report*"))
require(bool(ai_hits), "no AI implementation/gate surface found")
require(bool(report_hits), "no reporting implementation/gate surface found")
workflow_dir = ROOT / ".github" / "workflows"
workflow_names = {p.name for p in workflow_dir.glob("*.yml")} if workflow_dir.exists() else set()
for expected in ("azaad-ai-gate.yml", "azaad-department-ai-gate.yml", "azaad-executive-ai-gate.yml", "azaad-payments-reporting-gate.yml", "azaad-integration-gate.yml"):
    require(expected in workflow_names, f"missing required workflow gate: {expected}")

admin_dirs = [p for p in ROOT.glob("admin/**/index.html") if p.is_file()]
if len(admin_dirs) > 1:
    require("/admin/admin/:path*" in vercel_text, "duplicate admin trees exist without production redirects to /admin.html")

paid_markers = ("openai.com", "anthropic.com", "gemini.google.com")
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
