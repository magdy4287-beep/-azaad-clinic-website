from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app.js"
CENTRAL = ROOT / "central-i18n.js"

app = APP.read_text(encoding="utf-8")
central = CENTRAL.read_text(encoding="utf-8")

# Remove the legacy app-owned language state entirely.
legacy_language = re.compile(
    r"(?s)/\*\s*\n\s*\* =========================================================\s*\n\s*\* LANGUAGE\s*\n\s*\* =========================================================\s*\n\s*\*/.*?(?=/\*\s*\n\s*\* =========================================================\s*\n\s*\* TRANSLATIONS)"
)
app, language_count = legacy_language.subn("", app, count=1)
if language_count != 1:
    raise SystemExit("Legacy app.js language owner was not found")

# Extract the complete legacy booking dictionary and move it into the central
# runtime. The production artifact must contain one translation owner only.
block = re.compile(
    r"(?s)/\*\s*\n\s*\* =========================================================\s*\n\s*\* TRANSLATIONS\s*\n\s*\* =========================================================\s*\n\s*\*/\s*\n\s*const I18N = (\{.*?\});\s*\n\s*function t\(key\) \{.*?\n\s*\}\s*(?=/\*)"
)
match = block.search(app)
if not match:
    raise SystemExit("Legacy app.js translation block was not found")

legacy_object = match.group(1)
replacement = """/* LANGUAGE: CENTRAL I18N ONLY */
  function getCurrentLanguage() {
    const language = window.AZAAD_I18N?.language?.();
    if (language === 'en' || language === 'ar') return language;
    const htmlLang = String(document.documentElement.lang || '').toLowerCase().trim();
    return htmlLang === 'en' || htmlLang.startsWith('en-') ? 'en' : 'ar';
  }
  function isEnglish() { return getCurrentLanguage() === 'en'; }
  function t(key) {
    const value = window.AZAAD_I18N?.t?.(key);
    return typeof value === 'string' && value !== key ? value : key;
  }
"""
app = app[:match.start()] + replacement + app[match.end():]

# Replace the old 400ms language polling loop with the central language event.
observer = re.compile(
    r"(?s)  function setupLanguageObserver\(\) \{.*?\n  \}\n  /\*\s*\n\s*\* =========================================================\s*\n\s*\* EVENT HELPERS"
)
observer_replacement = """  function setupLanguageObserver() {
    const refresh = () => refreshDynamicLanguage();
    window.addEventListener('azaadLanguageChanged', refresh);
    window.addEventListener('azaadPublicContentLanguageChanged', refresh);
  }
  /*
   * =========================================================
   * EVENT HELPERS"""
app, observer_count = observer.subn(observer_replacement, app, count=1)
if observer_count != 1:
    raise SystemExit("Legacy app.js language polling observer was not found")

APP.write_text(app, encoding="utf-8")

# Keep the booking strings in the central runtime itself. No second runtime is
# introduced: this extends the central owner's existing t() contract.
marker = "\n})();\n"
if "__AZAAD_PUBLIC_BOOKING_I18N_CANONICAL__" not in central:
    extra = f"""

  // Canonical public-booking strings migrated from app.js.
  const __AZAAD_PUBLIC_BOOKING_I18N_CANONICAL__ = {legacy_object};
  const __azaadCentralTranslate = window.AZAAD_I18N?.t?.bind(window.AZAAD_I18N);
  if (window.AZAAD_I18N && __azaadCentralTranslate) {{
    window.AZAAD_I18N.t = (key) => {{
      const value = __AZAAD_PUBLIC_BOOKING_I18N_CANONICAL__[key];
      if (value && typeof value === 'object') {{
        const language = window.AZAAD_I18N.language?.() === 'en' ? 'en' : 'ar';
        return value[language] ?? value.ar ?? key;
      }}
      return __azaadCentralTranslate(key);
    }};
  }}
"""
    if marker not in central:
        raise SystemExit("Central i18n runtime boundary was not found")
    CENTRAL.write_text(central.replace(marker, extra + marker, 1), encoding="utf-8")

print("[AZAAD i18n] public booking uses central language state, translations, and events")
