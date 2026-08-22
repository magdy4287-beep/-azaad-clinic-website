"""Fail-closed guard against reintroducing a second public language runtime."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

index = (ROOT / "index.html").read_text(encoding="utf-8")
central = (ROOT / "central-i18n.js").read_text(encoding="utf-8")
posts = (ROOT / "clinic-posts.js").read_text(encoding="utf-8")
bridge = (ROOT / "public-central-i18n-bridge.js").read_text(encoding="utf-8")

assert index.count("central-i18n.js") == 1, "central-i18n.js must have exactly one public runtime load"
assert index.count("public-central-i18n-bridge.js") == 1, "public central i18n bridge must have exactly one load"
assert "window.AZAAD_I18N" in central, "central i18n API is missing"
assert "azaadLanguageChanged" in central, "central locale-change event is missing"
assert "window.AZAAD_I18N" in bridge, "public bridge must consume central i18n"
assert "azaadLanguageChanged" in bridge, "public bridge must listen to central locale changes"

# clinic-posts may keep bilingual content fields, but must not become another
# language-state owner. These patterns are intentionally narrow and fail closed.
for forbidden in (
    "localStorage.setItem(\"azaadClinicLanguage\"",
    "localStorage.setItem('azaadClinicLanguage'",
    "setInterval(\"",
):
    assert forbidden not in posts, f"legacy public language runtime detected: {forbidden}"

assert "name_en" in posts and "title_en" in posts, "bilingual content fields must remain available"
print("PUBLIC_I18N_SINGLE_OWNER_PASS")
