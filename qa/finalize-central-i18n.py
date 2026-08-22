#!/usr/bin/env python3
"""Final, path-agnostic canonicalization for the production artifact."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
I18N = '<script src="/central-i18n.js?v=5.0.0"></script>'
CORE = '<script src="/azaad-core-context.js?v=1.0.0"></script>'
# Runs before the body is parsed so the browser never starts in the wrong locale/direction.
PREPAINT = '''<style id="azaad-i18n-prepaint">html[data-azaad-i18n-pending="1"] body{visibility:hidden}</style>\n<script id="azaad-i18n-bootstrap">(()=>{try{const a=localStorage.getItem("azaad_admin_lang"),b=localStorage.getItem("azaadClinicLanguage"),l=(a==="en"||a==="ar"?a:(b==="en"||b==="ar"?b:(document.documentElement.lang||"ar").toLowerCase().startsWith("en")?"en":"ar"));const d=document.documentElement;d.lang=l;d.dir=l==="en"?"ltr":"rtl";d.dataset.language=l;d.dataset.azaadI18nPending="1";}catch(_){}})();</script>'''

TAG_RE = re.compile(
    r'<script\b(?=[^>]*\bsrc\s*=\s*["\'][^"\']*(?:central-i18n|azaad-core-context)\.js(?:\?[^"\']*)?["\'])[^>]*>\s*</script\s*>',
    re.I,
)
BOOT_RE = re.compile(r'<(?:style|script)\b[^>]*(?:id=["\']azaad-i18n-(?:prepaint|bootstrap)["\'])[^>]*>.*?</(?:style|script)>\s*', re.I | re.S)

changed = 0
removed = 0
for path in sorted(ROOT.rglob('*.html')):
    if '.git' in path.parts:
        continue
    text = path.read_text(encoding='utf-8', errors='replace')
    if '</head>' not in text:
        continue
    normalized, count = TAG_RE.subn('', text)
    normalized = BOOT_RE.sub('', normalized)
    normalized = normalized.replace('</head>', PREPAINT + '\n' + I18N + '\n' + CORE + '\n</head>', 1)
    if normalized != text:
        path.write_text(normalized, encoding='utf-8')
        changed += 1
        removed += count

print(f'final centralized runtime canonicalization: {changed} HTML surface(s), removed {removed} prior runtime tag(s)')
