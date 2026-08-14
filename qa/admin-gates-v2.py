#!/usr/bin/env python3
"""AZAAD Clinic Admin Gate V2 - free-first static acceptance checks.

This gate intentionally validates source contracts rather than claiming browser E2E.
It protects the public MRN contract while requiring the human-facing Patient number
format and the core Admin centers to remain wired into the suite.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

def read(name: str) -> str:
    p = ROOT / name
    if not p.exists():
        raise AssertionError(f"missing required file: {name}")
    return p.read_text(encoding="utf-8")

admin = read("admin.html")
lang = read("admin-english-hardening.js")
enh = read("admin-enhancements-v1.js")

checks = []

def check(name, condition):
    checks.append((name, bool(condition)))

# Core files / wiring contracts.
check("admin.html exists", bool(admin.strip()))
check("English hardening exists", "MutationObserver" in lang and "azaad_admin_lang" in lang)
check("Admin enhancement layer exists", "function boot" in enh and "doctorUX" in enh)

# Language: require the hardening layer to translate embedded Arabic labels while
# preserving icons, and to set document direction for English.
check("English sets LTR", "document.documentElement.dir='ltr'" in lang)
check("Dynamic translation", "observer.observe(document.body" in lang)
check("Embedded-label translation", "text.includes(k)" in lang and "text.split(k).join(M[k])" in lang)
check("Language persistence", "localStorage.getItem('azaad_admin_lang')" in lang)

# Patient number contract: canonical database MRN remains AZA-######, while the
# UI displays Patient ##### and accepts the short numeric search form.
check("Canonical MRN preserved", "AZA-${prefixed[1].padStart(6,'0')}" in lang)
check("Short patient search supported", "^\\d{1,6}$" in lang)
check("Patient display hides AZA", "Patient ${String(Number(digits)).padStart(5,'0')}" in lang)
check("Patient 360 wording", "Patient 360" in lang or "Patient 360" in admin)

# Core admin centers must remain represented in the current suite.
for label, needles in {
    "Appointments": ("Bookings", "مواعيد"),
    "Doctors": ("doctorUX", "الأطباء"),
    "Services": ("serviceUX", "الخدمات"),
    "Scheduling": ("scheduleUX", "جداول الأطباء"),
    "Marketing": ("Marketing", "المنشورات والعروض"),
    "HR": ("Staff / HR", "الموظفون"),
    "Settings": ("Settings", "الإعدادات"),
}.items():
    check(f"{label} center contract", any(n in (admin + lang + enh) for n in needles))

# Frontend must not contain a Supabase service-role secret.
for secret_marker in ("service_role", "SUPABASE_SERVICE_ROLE_KEY", "sb_secret_"):
    check(f"No frontend secret marker: {secret_marker}", secret_marker not in admin and secret_marker not in lang and secret_marker not in enh)

failed = [name for name, ok in checks if not ok]
for name, ok in checks:
    print(("PASS" if ok else "FAIL") + " | " + name)

if failed:
    print(f"\n{len(failed)} gate(s) failed.", file=sys.stderr)
    sys.exit(1)

print(f"\nPASS | {len(checks)} Admin Gate V2 checks")
