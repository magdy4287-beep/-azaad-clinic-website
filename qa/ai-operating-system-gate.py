#!/usr/bin/env python3
"""Static contract gate for Azaad Clinic's clinic-wide AI operating model."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "AZAAD_AI_OPERATING_SYSTEM_2026-08-15.md"
text = DOC.read_text(encoding="utf-8")

required = {
    "free-first core": "Core workflows never depend on AI.",
    "local fallback": "azaad-ai-insights",
    "optional external models": "Optional external/free-tier models may be adapters",
    "front desk assistant": "AI Front Desk Assistant",
    "doctor copilot": "AI Doctor Copilot",
    "patient 360 assistant": "AI Patient 360 Assistant",
    "scheduling supervisor": "AI Scheduling Supervisor",
    "RCM team": "AI RCM / Billing Team",
    "finance team": "AI Finance Department",
    "HR team": "AI Human Resources Team",
    "executive office": "AI Management / Executive Office",
    "marketing team": "AI Marketing Team",
    "security analyst": "AI Security Analyst",
    "human approval": "Human approval is mandatory",
    "clinical guardrail": "no autonomous diagnosis",
    "financial guardrail": "No AI agent may issue a refund",
    "HR guardrail": "must not make discriminatory",
    "security guardrail": "never the firewall",
    "traceability": "underlying metrics/signals",
    "Arabic and English": "Arabic and English are supported",
    "AI-off fallback": "core clinic workflow still works with AI disabled.",
}

missing = [name for name, needle in required.items() if needle not in text]
if missing:
    raise SystemExit("AI operating-system gate failed: " + ", ".join(missing))

print(f"AI operating-system contract gate: PASS ({len(required)} checks)")
