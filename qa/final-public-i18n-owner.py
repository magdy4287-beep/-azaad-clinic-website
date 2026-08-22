from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CENTRAL = ROOT / "central-i18n.js"
APP = ROOT / "app.js"


def find_matching_brace(text: str, start: int) -> int:
    depth = 0
    quote = None
    escape = False
    line_comment = False
    block_comment = False
    i = start
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if line_comment:
            if ch == "\n": line_comment = False
            i += 1; continue
        if block_comment:
            if ch == "*" and nxt == "/": block_comment = False; i += 2; continue
            i += 1; continue
        if quote:
            if escape: escape = False
            elif ch == "\\": escape = True
            elif ch == quote: quote = None
            i += 1; continue
        if ch == "/" and nxt == "/": line_comment = True; i += 2; continue
        if ch == "/" and nxt == "*": block_comment = True; i += 2; continue
        if ch in "'\"`": quote = ch; i += 1; continue
        if ch == "{": depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0: return i
        i += 1
    raise RuntimeError("Unbalanced JavaScript braces")

central = CENTRAL.read_text(encoding="utf-8")
app = APP.read_text(encoding="utf-8")

keys = {
    "chooseDoctor": ["اختر الطبيب", "Select doctor"],
    "chooseService": ["اختر الخدمة", "Select service"],
    "chooseDate": ["اختر التاريخ", "Select date"],
    "chooseTime": ["اختر الوقت", "Select time"],
    "sessionType": ["نوع الجلسة", "Session type"],
    "selectDoctorServiceDate": ["اختر الطبيب والخدمة والتاريخ لعرض المواعيد المتاحة.", "Choose a doctor, service, and date to see available appointments."],
    "clinicAddress": ["دمياط - شارع نافع، مقابل مسجد المظلوم - أعلى صيدلية الرياض", "Damietta - Nafea Street, opposite Al-Mazloum Mosque, above Al-Riyad Pharmacy"],
}

missing_lines = []
for key, (ar, en) in keys.items():
    if re.search(rf"\b{re.escape(key)}\s*:\s*\[", central) is None:
        missing_lines.append(f"    {key}:[{ar!r},{en!r}],")
if missing_lines:
    marker = "  const P={\n"
    if marker not in central: raise RuntimeError("Central P dictionary marker not found")
    central = central.replace(marker, marker + "\n".join(missing_lines) + "\n", 1)

marker = "  // __AZAAD_FINAL_PUBLIC_I18N_OWNER__\n"
if marker not in central:
    owner = r'''  // __AZAAD_FINAL_PUBLIC_I18N_OWNER__
  const __azaadFinalLanguage = () => localStorage.getItem(KEY) === 'en' ? 'en' : 'ar';
  const __azaadFinalTranslate = (key) => {
    const pair = P?.[key];
    if (Array.isArray(pair)) return pair[__azaadFinalLanguage() === 'en' ? 1 : 0] ?? key;
    return LEGACY_EN[key] && __azaadFinalLanguage() === 'en' ? LEGACY_EN[key] : key;
  };
  const __azaadFinalApply = (language) => {
    const lang = language === 'en' ? 'en' : 'ar';
    localStorage.setItem(KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const value = __azaadFinalTranslate(el.getAttribute('data-i18n'));
      if (value != null) el.innerHTML = value;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const value = __azaadFinalTranslate(el.getAttribute('data-i18n-placeholder'));
      if (value != null) el.setAttribute('placeholder', value);
    });
    document.querySelectorAll('.lang-btn[data-lang]').forEach((btn) => {
      const active = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    window.dispatchEvent(new CustomEvent('azaadLanguageChanged', { detail: { language: lang } }));
    window.dispatchEvent(new CustomEvent('azaadPublicContentLanguageChanged', { detail: { language: lang } }));
  };
  const __azaadBindFinalLanguage = () => {
    document.querySelectorAll('.lang-btn[data-lang]').forEach((btn) => {
      if (btn.dataset.azaadFinalLanguageBound === '1') return;
      btn.dataset.azaadFinalLanguageBound = '1';
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        __azaadFinalApply(btn.getAttribute('data-lang'));
      }, true);
    });
    __azaadFinalApply(__azaadFinalLanguage());
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', __azaadBindFinalLanguage, { once: true });
  else __azaadBindFinalLanguage();
'''
    boundary = "\n})();"
    if boundary not in central: raise RuntimeError("Central IIFE boundary not found")
    central = central.replace(boundary, "\n" + owner + boundary, 1)

fn_match = re.search(r"function\s+getCurrentLanguage\s*\(\)\s*\{", app)
if fn_match:
    start = app.find("{", fn_match.start())
    end = find_matching_brace(app, start)
    app = app[:fn_match.start()] + "function getCurrentLanguage() { return window.AZAAD_I18N?.language?.() === 'en' ? 'en' : 'ar'; }" + app[end + 1:]

obj_match = re.search(r"const\s+I18N\s*=\s*\{", app)
if obj_match:
    start = app.find("{", obj_match.start())
    end = find_matching_brace(app, start)
    replacement = "const I18N = new Proxy({}, { get: (_target, lang) => new Proxy({}, { get: (_t, key) => window.AZAAD_I18N?.t?.(key) ?? key }) });"
    app = app[:obj_match.start()] + replacement + app[end + 1:]

APP.write_text(app, encoding="utf-8")
CENTRAL.write_text(central, encoding="utf-8")
print("[AZAAD] final public i18n owner enforced: central-i18n.js only")
