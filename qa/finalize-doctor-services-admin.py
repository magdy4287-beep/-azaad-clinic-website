from pathlib import Path
import re
from urllib.parse import urlsplit

path = Path('admin.html')
if not path.exists():
    raise SystemExit('admin.html not found')
text = path.read_text(encoding='utf-8')

# Single owner: doctor-services-admin.js is loaded once as a static Admin feature.
# Remove every absolute/relative/query-string variant before inserting one canonical tag.
pattern = re.compile(
    r'\s*<script\b[^>]*\bsrc=["\'][^"\']*doctor-services-admin\.js(?:\?[^"\']*)?["\'][^>]*>(?:\s*</script>)?\s*',
    re.I,
)
text = pattern.sub('\n', text)

tag = '<script src="/doctor-services-admin.js" defer></script>'
text = text.replace('</body>', tag + '\n</body>', 1)

# The doctors tab must not lazy-load the same controller again. It may still load
# the public doctor editor, while the service editor remains owned by the static tag.
start = text.find("const groups = {'")
if start != -1:
    end = text.find('};', start)
    if end != -1:
        block = text[start:end]
        block = block.replace("'doctor-services-admin.js', ", "")
        block = block.replace(", 'doctor-services-admin.js'", "")
        text = text[:start] + block + text[end:]

path.write_text(text, encoding='utf-8')

# Keep the Admin appointment display explicitly AM/PM.
admin_js = Path('admin.js')
if admin_js.exists():
    js = admin_js.read_text(encoding='utf-8')
    js = js.replace('''  const suffix =\n    hour < 12\n      ? "ص"\n      : "م";''', '''  const suffix =\n    hour < 12\n      ? "AM"\n      : "PM";''')
    admin_js.write_text(js, encoding='utf-8')

print('[AZAAD] final doctor service editor single-owner + AM/PM contract established')
