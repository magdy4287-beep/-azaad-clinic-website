#!/usr/bin/env python3
"""Free structural acceptance gate for the Azaad Doctors Center."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
files = {p.name: p.read_text(encoding="utf-8", errors="ignore") for p in root.glob("*.js")}
admin = (root / "admin.html").read_text(encoding="utf-8", errors="ignore") if (root / "admin.html").exists() else ""
combined = admin + "\n" + "\n".join(files.values())

required = {
    "doctor listing": ["doctor", "doctors"],
    "active/inactive": ["active", "inactive"],
    "edit": ["edit"],
    "archive": ["archive"],
    "schedule": ["schedule"],
    "services": ["service", "services"],
    "performance": ["performance"],
}
missing = [name for name, tokens in required.items() if not any(t.lower() in combined.lower() for t in tokens)]
if missing:
    raise SystemExit("Doctors Center gate failed: " + ", ".join(missing))

# Guard against exposing Supabase service-role credentials in browser code.
for marker in ("service_role", "SUPABASE_SERVICE_ROLE_KEY", "sb_secret_"):
    if marker.lower() in combined.lower():
        raise SystemExit(f"Doctors Center gate failed: secret marker {marker}")

print("Doctors Center structural gate: PASS")
