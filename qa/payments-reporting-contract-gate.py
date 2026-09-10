#!/usr/bin/env python3
"""Canonical payments/reporting contract gate — fail closed."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
enterprise = ROOT / "admin-enterprise-centers.js"
invoice_api = ROOT / "api/invoices.js"
appointment_api = ROOT / "api/admin-appointments.js"
failed = []

def require(condition, message):
    if not condition:
        failed.append(message)

et = enterprise.read_text(encoding="utf-8", errors="replace") if enterprise.exists() else ""
it = invoice_api.read_text(encoding="utf-8", errors="replace") if invoice_api.exists() else ""
at = appointment_api.read_text(encoding="utf-8", errors="replace") if appointment_api.exists() else ""

require(enterprise.exists(), "canonical enterprise center missing")
require(invoice_api.exists(), "canonical invoice API missing")
require(appointment_api.exists(), "canonical appointment/reporting API missing")
require("key==='rcm'" in et, "RCM enterprise panel missing")
require("'/api/invoices?limit=200'" in et, "RCM panel is not wired to canonical invoice API")
require("credentials: 'include'" in et and "cache: 'no-store'" in et, "RCM panel does not use protected session boundary")
for token, label in (("invoice_number", "invoice"), ("paid_amount", "payment"), ("remaining_amount", "outstanding"), ("total_amount", "amount")):
    require(token in et or token in it, f"{label} contract missing")
for token, label in (("public.clinic_invoices", "invoice storage"), ("public.clinic_payments", "payment storage"), ("sum(case when verification_status <> 'rejected' then amount else 0 end)", "verified payment aggregation"), ("greatest(0, i.total - coalesce(pay.paid_amount, 0))", "outstanding calculation"), ("provider: 'appwrite-neon'", "Appwrite-Neon provider boundary")):
    require(token in it, f"{label} missing")
require("from=${today}&to=${today}" in et, "daily reporting does not use canonical date-bounded API")
require("from" in at and "to" in at, "appointment reporting API lacks date-range parameters")
for name in ("rcm-finance-loader.js", "rcm-finance-center.js"):
    require(not (ROOT / name).exists(), f"retired duplicate renderer exists: {name}")

checks = {
    "payment": any(x in et or x in it for x in ("paid_amount", "clinic_payments")),
    "invoice": "invoice_number" in et or "clinic_invoices" in it,
    "outstanding": "remaining_amount" in et and "greatest(0" in it,
    "amount": "total_amount" in et and "i.total" in it,
    "daily reporting": "from=${today}&to=${today}" in et,
    "monthly reporting": "month" in at.lower() or "monthly" in et.lower(),
    "annual reporting": "year" in at.lower() or "annual" in et.lower(),
    "date filtering": "from" in at and "to" in at,
}
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")
    if not ok and not any(name in failure for failure in failed):
        failed.append(f"{name} reporting contract missing")

if failed:
    raise SystemExit("Payments/reporting contract gate failed: " + ", ".join(failed))
print("Payments/reporting contract gate: PASS")
