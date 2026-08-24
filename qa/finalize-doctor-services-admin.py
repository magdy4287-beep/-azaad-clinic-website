from pathlib import Path

path = Path('admin.html')
if not path.exists():
    raise SystemExit('admin.html not found')
text = path.read_text(encoding='utf-8')

# Guarantee the feature is present after every other Admin canonicalization pass.
tag = '<script src="/doctor-services-admin.js" defer></script>'
while tag in text:
    text = text.replace(tag, '')
text = text.replace('</body>', tag + '\n</body>', 1)

# Guarantee the doctors tab loads both the public doctor profile editor and the
# per-doctor service editor. This is intentionally idempotent.
start = text.find("const groups = {'")
if start != -1:
    end = text.find('};', start)
    if end != -1:
        block = text[start:end]
        if "'public-team-admin.js'" not in block:
            block = block.replace("'doctors': [", "'doctors': ['public-team-admin.js', 'doctor-services-admin.js', ", 1)
        elif "'doctor-services-admin.js'" not in block:
            block = block.replace("'public-team-admin.js'", "'public-team-admin.js', 'doctor-services-admin.js'", 1)
        text = text[:start] + block + text[end:]

path.write_text(text, encoding='utf-8')

# Keep the Admin appointment display explicitly AM/PM.
admin_js = Path('admin.js')
if admin_js.exists():
    js = admin_js.read_text(encoding='utf-8')
    js = js.replace('''  const suffix =\n    hour < 12\n      ? "ص"\n      : "م";''', '''  const suffix =\n    hour < 12\n      ? "AM"\n      : "PM";''')
    admin_js.write_text(js, encoding='utf-8')

print('[AZAAD] final doctor service editor + AM/PM contract established')
