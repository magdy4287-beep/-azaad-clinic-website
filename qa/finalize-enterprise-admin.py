from pathlib import Path
import re

path = Path('admin.html')
text = path.read_text(encoding='utf-8')

# The enterprise registry is the single lazy-loader owner. Keep all enterprise
# domains in that registry; this transform only establishes their mounts and UI.
registry = re.search(r'(<script[^>]*data-azaad-admin-module-registry=["\']1["\'][^>]*>)(.*?)(</script>)', text, re.I | re.S)
if not registry:
    raise SystemExit('Canonical admin module registry not found')
body = registry.group(2)
needle = "'calendar': ['admin-calendar-center.js']"
enterprise = ", 'patient360EnterprisePanel': ['admin-enterprise-centers.js'], 'rcmEnterprisePanel': ['admin-enterprise-centers.js'], 'analyticsEnterprisePanel': ['admin-enterprise-centers.js'], 'financeEnterprisePanel': ['admin-enterprise-centers.js'], 'purchasingEnterprisePanel': ['admin-purchasing-center.js'], 'marketingEnterprisePanel': ['admin-enterprise-centers.js'], 'insightsEnterprisePanel': ['admin-enterprise-centers.js'], 'securityEnterprisePanel': ['admin-enterprise-centers.js']"
if 'patient360EnterprisePanel' not in body:
    if needle not in body:
        raise SystemExit('Canonical calendar registry entry not found')
    body = body.replace(needle, needle + enterprise, 1)
else:
    body = re.sub(r"'purchasingEnterprisePanel':\s*\[[^\]]+\]", "'purchasingEnterprisePanel': ['admin-purchasing-center.js']", body, count=1)
text = text[:registry.start(2)] + body + text[registry.end(2):]

# Replace the two historical navigation surfaces (core Arabic tabs + enterprise
# English tabs) with ONE tree. Every leaf retains its canonical data-panel key.
nav_groups = [
    ('01 Operations', [
        ('bookings', '📅 حجوزات اليوم', 'today'),
        ('bookings', '📋 كل الحجوزات', 'bookings'),
        ('calendar', '🗓️ التقويم', 'calendar'),
        ('doctors', '🧑‍⚕️ الأطباء', 'doctors'),
        ('services', '🩺 الخدمات', 'services'),
        ('schedules', '🕐 جداول الأطباء', 'schedules'),
        ('holidays', '🚫 العطلات والإغلاقات', 'holidays'),
        ('hours', '🕘 ساعات العمل', 'hours'),
    ]),
    ('02 Patient & Clinical', [
        ('patient360EnterprisePanel', '🧑‍⚕️ Patient 360', 'patient360'),
    ]),
    ('03 Workforce', [
        ('staff', '👥 الموظفون', 'staff'),
        ('settings', '⚙️ إعدادات العيادة', 'settings'),
        ('account', '👤 حساب الإدارة', 'account'),
    ]),
    ('04 Revenue Cycle', [
        ('rcmEnterprisePanel', '🧾 Invoices & RCM', 'rcm'),
    ]),
    ('05 Finance', [
        ('financeEnterprisePanel', '💰 Finance', 'finance'),
    ]),
    ('06 Purchasing', [
        ('purchasingEnterprisePanel', '🛒 Purchasing', 'purchasing'),
    ]),
    ('07 Growth', [
        ('posts', '📣 المنشورات والعروض', 'posts'),
        ('marketingEnterprisePanel', '📣 Marketing', 'marketing'),
    ]),
    ('08 Analytics', [
        ('analyticsEnterprisePanel', '📊 Analytics', 'analytics'),
    ]),
    ('09 Intelligence', [
        ('insightsEnterprisePanel', '🧠 Smart Insights', 'insights'),
    ]),
    ('10 Security', [
        ('securityEnterprisePanel', '🛡️ IT Security', 'security'),
    ]),
]

nav_parts = ['<nav class="admin-tree" aria-label="AZAAD Admin">']
for title, leaves in nav_groups:
    nav_parts.append(f'<section class="admin-tree-group"><h3>{title}</h3><div class="admin-tree-leaves">')
    for panel_id, label, key in leaves:
        nav_parts.append(f'<button class="tab" data-panel="{panel_id}" data-azaad-domain="{key}" type="button">{label}</button>')
    nav_parts.append('</div></section>')
nav_parts.append('</nav>')
nav_html = '\n'.join(nav_parts)

# Replace only the navigation container, regardless of the previous generated form.
text, count = re.subn(r'<div class="tabs">.*?</div>\s*(?=<section\s+id="(?:calendar|bookings|calendarPanel)"|<!-- data-azaad-enterprise-panels)', nav_html + '\n', text, count=1, flags=re.I | re.S)
if count != 1:
    raise SystemExit('Admin navigation container not found exactly once')

# Enterprise panels are real mounts, not loading-only placeholders. The runtime
# fills them after the activation event; keeping a small deterministic shell is
# useful for no-JS inspection but must never be the terminal state.
keys = [
    ('patient360EnterprisePanel','🧑‍⚕️ Patient 360','ملف المريض الكامل'),
    ('rcmEnterprisePanel','🧾 Invoices & RCM','الفواتير والتحصيل'),
    ('analyticsEnterprisePanel','📊 Analytics','مؤشرات التشغيل'),
    ('financeEnterprisePanel','💰 Finance','الإيرادات والمصروفات'),
    ('purchasingEnterprisePanel','🛒 Purchasing','المشتريات والموردون'),
    ('marketingEnterprisePanel','📣 Marketing','النمو والحملات'),
    ('insightsEnterprisePanel','🧠 Smart Insights','التوصيات والمراجعة البشرية'),
    ('securityEnterprisePanel','🛡️ IT Security','الأحداث الأمنية والتدقيق'),
]
for pid, label, subtitle in keys:
    pattern = re.compile(rf'<section\s+id=["\']{re.escape(pid)}["\']\s+class=["\']panel["\']>.*?</section>', re.I | re.S)
    shell = f'''<section id="{pid}" class="panel"><div class="card"><div class="panel-head"><div><h2>{label}</h2><div class="muted">{subtitle}</div></div><button class="btn btn-secondary" type="button" data-enterprise-refresh="{pid.replace('EnterprisePanel','')}">🔄 تحديث</button></div><div id="{pid.replace('EnterprisePanel','')}EnterpriseBody" class="items" style="margin-top:15px"><div class="empty">⏳ جاري تجهيز الوحدة...</div></div></div></section>'''
    text, replaced = pattern.subn(shell, text, count=1)
    if replaced == 0:
        marker = '\n  <section\n    id="bookings"'
        if marker in text:
            text = text.replace(marker, '\n' + shell + marker, 1)
        else:
            raise SystemExit(f'Missing enterprise panel mount: {pid}')

style = '''<style id="azaad-admin-tree-v1">
.admin-tree{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin:16px 0;align-items:start}
.admin-tree-group{background:#fff;border:1px solid #dfe4ee;border-radius:16px;padding:12px;box-shadow:0 5px 18px rgba(0,0,0,.04)}
.admin-tree-group h3{font-size:13px;margin:0 0 9px;color:#6c758c;letter-spacing:.2px}
.admin-tree-leaves{display:grid;gap:7px}
.admin-tree .tab{width:100%;text-align:right;border-radius:11px;padding:9px 11px;white-space:normal}
.admin-tree .tab.active{background:#17214f;color:#fff}
@media(max-width:1100px){.admin-tree{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:700px){.admin-tree{grid-template-columns:1fr 1fr}.admin-tree-group{padding:10px}}
@media(max-width:480px){.admin-tree{grid-template-columns:1fr}.admin-tree-group h3{font-size:12px}}
</style>'''
if 'id="azaad-admin-tree-v1"' not in text:
    text = text.replace('</head>', style + '\n</head>', 1)

# One continuous document: no fixed-height admin viewport and no independent
# scrolling surface around the navigation or panels. Tables remain horizontally
# scrollable only when their intrinsic width requires it.
text = text.replace('body{margin:0;background:#f5f7fb;', 'html,body{min-height:100%;height:auto;overflow-x:hidden}body{margin:0;background:#f5f7fb;', 1)
text = text.replace('.admin{max-width:1450px;margin:auto;padding:15px}', '.admin{max-width:1450px;margin:auto;padding:15px;min-height:100vh;height:auto;overflow:visible}', 1)

path.write_text(text, encoding='utf-8')
print('finalize-enterprise-admin.py completed: single unified admin tree')
