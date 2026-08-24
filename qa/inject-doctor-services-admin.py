from pathlib import Path
import re


def inject_admin_script():
    path = Path('admin.html')
    if not path.exists():
        raise SystemExit('admin.html not found')
    text = path.read_text(encoding='utf-8')
    pattern = re.compile(r'\s*<script\b[^>]*\bsrc=["\']doctor-services-admin\.js[^"\']*["\'][^>]*>\s*</script>\s*', re.I)
    text = pattern.sub('\n', text)
    tag = '<script src="doctor-services-admin.js" defer></script>'
    if '</body>' not in text:
        raise SystemExit('admin.html body marker not found')
    text = text.replace('</body>', tag + '\n</body>', 1)
    doctors_marker = '"doctors": ['
    if doctors_marker in text:
        start = text.find(doctors_marker)
        block_end = text.find('],', start)
        if block_end != -1:
            block = text[start:block_end]
            for script in ('public-team-admin.js', 'doctor-services-admin.js'):
                if script not in block:
                    block += f'\n        "{script}",'
            text = text[:start] + block + text[block_end:]
    path.write_text(text, encoding='utf-8')


def patch_admin_time_formatter():
    path = Path('admin.js')
    if not path.exists():
        raise SystemExit('admin.js not found')
    text = path.read_text(encoding='utf-8')
    text = text.replace('''  const suffix =\n    hour < 12\n      ? "ص"\n      : "م";''', '''  const suffix =\n    hour < 12\n      ? "AM"\n      : "PM";''')
    path.write_text(text, encoding='utf-8')


inject_admin_script()
patch_admin_time_formatter()
print('doctor services admin injection + AM/PM formatter patch complete')
