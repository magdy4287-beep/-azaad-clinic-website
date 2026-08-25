#!/usr/bin/env python3
"""Fail closed if public booking app.js regains its own locale watcher/state."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
text = (ROOT / "app.js").read_text(encoding="utf-8")

for forbidden in (
    "localStorage.getItem(\n          'azaadClinicLanguage'",
    "setInterval(\n      checkLanguage",
    "new MutationObserver(\n          () => {\n            checkLanguage();",
):
    assert forbidden not in text, f"public booking owns legacy language runtime: {forbidden}"

assert "window.AZAAD_I18N" in text, "public booking must consume central i18n"
assert "azaadLanguageChanged" in text, "public booking must consume the central locale-change event"
assert "doctor.name_en" in text, "doctor English field is missing"
assert "service.name_en" in text, "service English field is missing"
assert "getDoctorName(doctor.id)" in text, "doctor selector must use locale-aware helper"
assert "getServiceName(service.id)" in text, "service selector must use locale-aware helper"
print("PUBLIC_BOOKING_CENTRAL_I18N_GATE_PASS")
