#!/usr/bin/env python3
"""Canonicalize the public booking runtime onto central-i18n without changing booking transport."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "app.js"
text = PATH.read_text(encoding="utf-8")

# app.js keeps booking-specific message translations, but must not own locale state.
old_language = re.compile(
    r"  function getCurrentLanguage\(\) \{.*?\n  \}\n  function isEnglish\(\) \{.*?\n  \}\n",
    re.S,
)
new_language = """  function getCurrentLanguage() {\n    try {\n      if (window.AZAAD_I18N && typeof window.AZAAD_I18N.language === 'function') {\n        const language = window.AZAAD_I18N.language();\n        if (language === 'en' || language === 'ar') {\n          return language;\n        }\n      }\n    } catch (_) {}\n    const htmlLang =\n      String(document.documentElement.lang || '')\n        .toLowerCase()\n        .trim();\n    return htmlLang === 'en' || htmlLang.startsWith('en-') ? 'en' : 'ar';\n  }\n  function isEnglish() {\n    return getCurrentLanguage() === 'en';\n  }\n"""
text, count = old_language.subn(new_language, text, count=1)
if count != 1:
    raise SystemExit("PUBLIC_BOOKING_I18N: language owner block not found")

# Prefer canonical bilingual data fields while preserving existing fallbacks.
old_doctor = """    return (\n      doctor.name ||\n      doctor.full_name ||\n      doctor.display_name ||\n      t('doctorFallback')\n    );"""
new_doctor = """    if (isEnglish()) {\n      return (\n        doctor.name_en ||\n        doctor.full_name_en ||\n        doctor.display_name_en ||\n        doctor.name ||\n        doctor.full_name ||\n        doctor.display_name ||\n        t('doctorFallback')\n      );\n    }\n    return (\n      doctor.name_ar ||\n      doctor.name ||\n      doctor.full_name ||\n      doctor.display_name ||\n      t('doctorFallback')\n    );"""
if old_doctor not in text:
    raise SystemExit("PUBLIC_BOOKING_I18N: doctor helper not found")
text = text.replace(old_doctor, new_doctor, 1)

old_title = """    return (\n      doctor.title ||\n      doctor.specialty ||\n      ''\n    );"""
new_title = """    if (isEnglish()) {\n      return (\n        doctor.title_en ||\n        doctor.specialty_en ||\n        doctor.title ||\n        doctor.specialty ||\n        ''\n      );\n    }\n    return (\n      doctor.title_ar ||\n      doctor.title ||\n      doctor.specialty ||\n      ''\n    );"""
if old_title not in text:
    raise SystemExit("PUBLIC_BOOKING_I18N: doctor title helper not found")
text = text.replace(old_title, new_title, 1)

old_service = """    return (\n      service.name ||\n      service.title ||\n      t('serviceFallback')\n    );"""
new_service = """    if (isEnglish()) {\n      return (\n        service.name_en ||\n        service.title_en ||\n        service.name ||\n        service.title ||\n        t('serviceFallback')\n      );\n    }\n    return (\n      service.name_ar ||\n      service.name ||\n      service.title ||\n      t('serviceFallback')\n    );"""
if old_service not in text:
    raise SystemExit("PUBLIC_BOOKING_I18N: service helper not found")
text = text.replace(old_service, new_service, 1)

# Selector rendering must use the same locale-aware helpers as booking/WhatsApp output.
old_doctor_option = """              doctor.name ||\n                doctor.full_name ||\n                doctor.display_name ||\n                t('doctorFallback')"""
new_doctor_option = """              getDoctorName(doctor.id)"""
if old_doctor_option not in text:
    raise SystemExit("PUBLIC_BOOKING_I18N: doctor selector label not found")
text = text.replace(old_doctor_option, new_doctor_option, 1)

old_doctor_title_option = """                doctor.title ||\n                      doctor.specialty"""
new_doctor_title_option = """                getDoctorTitle(doctor.id)"""
if old_doctor_title_option not in text:
    raise SystemExit("PUBLIC_BOOKING_I18N: doctor selector title not found")
text = text.replace(old_doctor_title_option, new_doctor_title_option, 1)

old_service_option = """              service.name ||\n                service.title ||\n                t('serviceFallback')"""
new_service_option = """              getServiceName(service.id)"""
if old_service_option not in text:
    raise SystemExit("PUBLIC_BOOKING_I18N: service selector label not found")
text = text.replace(old_service_option, new_service_option, 1)

# Replace polling + DOM MutationObserver language detection with the canonical event.
old_observer = re.compile(
    r"  function setupLanguageObserver\(\) \{.*?\n  \}\n  /\*\n   \* =========================================================\n   \* EVENT HELPERS",
    re.S,
)
new_observer = """  function setupLanguageObserver() {\n    window.addEventListener(\n      'azaadLanguageChanged',\n      () => refreshDynamicLanguage()\n    );\n  }\n  /*\n   * =========================================================\n   * EVENT HELPERS"""
text, count = old_observer.subn(new_observer, text, count=1)
if count != 1:
    raise SystemExit("PUBLIC_BOOKING_I18N: legacy language observer not found")

PATH.write_text(text, encoding="utf-8")
print("PUBLIC_BOOKING_CENTRAL_I18N_PASS")
