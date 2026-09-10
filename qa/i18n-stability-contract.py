#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
central_path = ROOT / 'central-i18n.js'
central = central_path.read_text(encoding='utf-8') if central_path.exists() else ''

checks = {
    'central runtime exists': central_path.exists(),
    'central runtime exposes language API': 'window.AZAAD_I18N' in central,
    'central runtime observes dynamic DOM changes': 'MutationObserver' in central,
    'central runtime emits language-change event': 'azaadLanguageChanged' in central,
    'central runtime does not reload pages for language switching': 'location.reload()' not in central,
    'language selection persistence remains supported': 'azaad_admin_lang' in central,
    'language dictionaries remain present': 'لوحة إدارة العيادة' in central and 'Clinic Administration Panel' in central,
    'retired patient session bridge is no longer an i18n dependency': not (ROOT / 'patient-session-bridge-v3.js').exists(),
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")
if failed:
    raise SystemExit('I18N stability contract failed: ' + ', '.join(failed))
print(f'I18N stability contract passed: {len(checks)}/{len(checks)}')
