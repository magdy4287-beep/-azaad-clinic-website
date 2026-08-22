from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app.js"
CENTRAL = ROOT / "central-i18n.js"
GATE = ROOT / "patient-booking-gate.js"

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

# The patient-booking gate previously owned language through localStorage and
# documentElement.lang. Replace that owner with the central language API and
# central translation function. The gate keeps booking/security behavior only.
gate = GATE.read_text(encoding="utf-8")
legacy_gate = """  const LANG_KEY = 'azaadClinicLanguage';
"""
if legacy_gate in gate:
    gate = gate.replace(legacy_gate, "", 1)
legacy_gate_owner = re.compile(
    r"(?s)  const isEnglish = \(\) => \{.*?\n  \};\n  const t = \(ar, en\) => isEnglish\(\) \? en : ar;"
)
central_gate_owner = """  const getCurrentLanguage = () => {
    const language = window.AZAAD_I18N?.language?.();
    if (language === 'en' || language === 'ar') return language;
    const htmlLang = String(document.documentElement.lang || '').toLowerCase().trim();
    return htmlLang === 'en' || htmlLang.startsWith('en-') ? 'en' : 'ar';
  };
  const isEnglish = () => getCurrentLanguage() === 'en';
  const t = (ar, en) => {
    const key = `__AZAAD_BOOKING_PAIR__${ar}__${en}`;
    const central = window.AZAAD_I18N?.t;
    if (typeof central === 'function') {
      const translated = central(key);
      if (translated && translated !== key) return translated;
    }
    return isEnglish() ? en : ar;
  };"""
gate, gate_owner_count = legacy_gate_owner.subn(central_gate_owner, gate, count=1)
if gate_owner_count != 1:
    raise SystemExit("Patient booking gate language owner was not found")

# Re-render the gate whenever the central language changes. No polling and no
# independent locale state are allowed.
gate_marker = """  function init() {
"""
if "azaadPatientBookingGateLanguageBound" not in gate:
    gate_binding = """  function bindCentralLanguage() {
    if (window.azaadPatientBookingGateLanguageBound) return;
    window.azaadPatientBookingGateLanguageBound = true;
    const refresh = () => {
      const active = document.activeElement;
      const phone = state.phone;
      renderGate();
      state.phone = phone;
      if (active && active.id) document.getElementById(active.id)?.focus();
    };
    window.addEventListener('azaadLanguageChanged', refresh);
    window.addEventListener('azaadPublicContentLanguageChanged', refresh);
  }

"""
    if gate_marker not in gate:
        raise SystemExit("Patient booking gate init boundary was not found")
    gate = gate.replace(gate_marker, gate_binding + gate_marker, 1)
    gate = gate.replace("    injectStyles();\n    const form = $('bookingForm');", "    injectStyles();\n    bindCentralLanguage();\n    const form = $('bookingForm');", 1)

GATE.write_text(gate, encoding="utf-8")

print("[AZAAD i18n] public booking app and patient gate use central language state, translations, and events")
