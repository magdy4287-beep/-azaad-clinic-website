#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
stability = (ROOT / 'central-i18n-stability.js').read_text(encoding='utf-8')
bridge = (ROOT / 'patient-session-bridge-v3.js').read_text(encoding='utf-8')
central = (ROOT / 'central-i18n.js').read_text(encoding='utf-8')

checks = {
    'stability guard exists': '__AZAAD_I18N_STABILITY__' in stability,
    'language switch does not call reload': 'location.reload()' not in stability,
    'language switch persists selected locale': 'localStorage.setItem(STORAGE, lang)' in stability,
    'stability loader exists': 'loadI18nStability' in bridge,
    'central runtime is loaded after stability guard': bridge.find('loadI18nStability') < bridge.find('loadCentralI18n') if 'loadI18nStability' in bridge and 'loadCentralI18n' in bridge else False,
    'central runtime remains present': 'central-i18n.js' in bridge,
    'admin language storage remains supported': 'azaad_admin_lang' in central,
    'central language dictionary remains present': 'لوحة إدارة العيادة' in central and 'Clinic Administration Panel' in central,
    'central runtime exposes the language-change event': 'azaadLanguageChanged' in central,
    'central runtime does not contain page-reload language switching': 'location.reload()' not in central,
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'}: {name}")
if failed:
    raise SystemExit('I18N stability contract failed: ' + ', '.join(failed))
print(f'I18N stability contract passed: {len(checks)}/{len(checks)}')
