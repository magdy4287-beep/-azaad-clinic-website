from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
index = (ROOT / "index.html").read_text(encoding="utf-8")

legacy_files = ("azaad-locale-runtime.js", "public-central-i18n-bridge.js", "central-i18n-v6-candidate.js", "central-i18n-public-v6.js", "__tmp__central-i18n-v6.txt")
for legacy in legacy_files:
    assert not (ROOT / legacy).exists(), f"legacy/temporary i18n runtime remains: {legacy}"
    assert legacy not in index, f"legacy public i18n runtime still loaded: {legacy}"

assert 'src="central-i18n.js' in index, "central i18n runtime is not loaded"
assert "clinic-posts.js" in index, "public content runtime is missing"

clinic = (ROOT / "clinic-posts.js").read_text(encoding="utf-8")
for forbidden in (
    "localStorage.getItem(\"azaadClinicLanguage\")",
    "const TEXT =",
    "function getLanguage()",
    "function isEnglish()",
    "setInterval(",
    "window.AZAAD_LOCALE",
):
    assert forbidden not in clinic, f"clinic-posts owns a second language/locale runtime: {forbidden}"

print("CENTRAL_I18N_ONLY_PUBLIC_GATE: PASS")
