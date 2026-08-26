from pathlib import Path
import re

path = Path('admin.html')
text = path.read_text(encoding='utf-8')

registry = re.search(r'(<script[^>]*data-azaad-admin-module-registry=["\']1["\'][^>]*>)(.*?)(</script>)', text, re.I | re.S)
if not registry:
    raise SystemExit('Canonical admin module registry not found')
body = registry.group(2)
needle = "'calendar': ['admin-calendar-center.js']"
enterprise = ", 'patient360EnterprisePanel': ['admin-enterprise-centers.js'], 'rcmEnterprisePanel': ['admin-enterprise-centers.js'], 'analyticsEnterprisePanel': ['admin-enterprise-centers.js'], 'financeEnterprisePanel': ['admin-enterprise-centers.js'], 'purchasingEnterprisePanel': ['admin-purchasing-center.js'], 'marketingEnterprisePanel': ['admin-enterprise-centers.js'], 'insightsEnterprisePanel': ['admin-enterprise-centers.js'], 'securityEnterprisePanel': ['admin-enterprise-centers.js']"
if "patient360EnterprisePanel" not in body:
    if needle not in body:
        raise SystemExit('Canonical calendar registry entry not found')
    body = body.replace(needle, needle + enterprise, 1)
else:
    body = re.sub(r"'purchasingEnterprisePanel':\s*\[[^\]]+\]", "'purchasingEnterprisePanel': ['admin-purchasing-center.js']", body, count=1)
text = text[:registry.start(2)] + body + text[registry.end(2):]

keys = [
    ('patient360EnterprisePanel','🧑‍⚕️ Patient 360'), ('rcmEnterprisePanel','🧾 Invoices & RCM'),
    ('analyticsEnterprisePanel','📊 Analytics'), ('financeEnterprisePanel','💰 Finance'),
    ('purchasingEnterprisePanel','🛒 Purchasing'), ('marketingEnterprisePanel','📣 Marketing'),
    ('insightsEnterprisePanel','🧠 Smart Insights'), ('securityEnterprisePanel','🛡️ IT Security')
]
tabs = []
panels = []
for pid, label in keys:
    tabs.append(f'<button class="tab" data-panel="{pid}" type="button">{label}</button>')
    panels.append(f'<section id="{pid}" class="panel"><div class="card"><div class="empty">⏳ الوحدة تُحمّل عند فتحها.</div></div></section>')

if 'data-azaad-enterprise-tabs="1"' not in text:
    marker = '<div class="tabs">'
    if marker not in text:
        raise SystemExit('Admin tabs container not found')
    text = text.replace(marker, marker + '\n<!-- data-azaad-enterprise-tabs="1" -->\n' + '\n'.join(tabs), 1)

if 'data-azaad-enterprise-panels="1"' not in text:
    marker = '\n  <section\n    id="bookings"'
    if marker not in text:
        raise SystemExit('Admin bookings panel marker not found')
    text = text.replace(marker, '\n<!-- data-azaad-enterprise-panels="1" -->\n' + '\n'.join(panels) + marker, 1)

path.write_text(text, encoding='utf-8')
print('finalize-enterprise-admin.py completed successfully')
