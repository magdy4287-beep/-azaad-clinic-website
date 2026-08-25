from pathlib import Path

path = Path('public-experience-hardening.js')
if not path.exists():
    raise SystemExit('public-experience-hardening.js missing')
js = path.read_text(encoding='utf-8')
marker = "window.addEventListener('azaadLanguageChanged'"
if marker in js:
    print('PUBLIC_LANGUAGE_RENDER_CYCLE_ALREADY_PRESENT')
    raise SystemExit(0)
needle = "  async function loadAndRenderClinicSurface() {"
if needle not in js:
    raise SystemExit('public clinic render owner not found')
insert = """  window.addEventListener('azaadLanguageChanged', () => {\n    const data = window.AZAAD_PUBLIC_CLINIC_DATA;\n    if (!data) return;\n    renderServices(data.services || []);\n    renderDoctors(data.doctors || []);\n    if (Array.isArray(data.posts)) renderRecoveredPosts(data.posts);\n    dedupePublicData();\n  });\n\n"""
js = js.replace(needle, insert + needle, 1)
path.write_text(js, encoding='utf-8')
print('PUBLIC_LANGUAGE_RENDER_CYCLE_PASS')
