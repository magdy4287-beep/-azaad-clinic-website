#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
marketing = (ROOT / 'marketing-workspace-v2.js').read_text(encoding='utf-8')
patcher = (ROOT / '.github' / 'patch-admin.py').read_text(encoding='utf-8')

checks = {
    'marketing workspace exists': 'marketingV2' in marketing,
    'new post composer': 'Create Post' in marketing and 'mktNew' in marketing,
    'edit workflow': 'data-edit-post' in marketing and 'composer(state.posts.find' in marketing,
    'archive workflow': 'data-archive-post' in marketing and "status:'archived'" in marketing,
    'image support': "media_type==='image'" in marketing or "media_type === 'image'" in marketing,
    'video support': "media_type==='video'" in marketing or "media_type === 'video'" in marketing,
    'real media upload': "storage.from('clinic-media').upload" in marketing,
    'lazy media rendering': 'loading="lazy"' in marketing,
    'Instagram channel': 'instagram' in marketing,
    'Facebook channel': 'facebook' in marketing,
    'draft workflow': 'mktSaveDraft' in marketing and "save(post,'draft')" in marketing,
    'scheduled workflow': "effectiveStatus==='scheduled'" in marketing,
    'published workflow': "effectiveStatus==='published'" in marketing,
    'existing marketing table': 'clinic_marketing_posts' in marketing,
    'existing media audit table': 'clinic_media_uploads' in marketing,
    'existing media bucket': 'clinic-media' in marketing,
    'free-first': 'No paid social API' in marketing,
    'injected into admin build': 'marketing-workspace-v2.js' in patcher,
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"{'PASS' if ok else 'FAIL'} | {name}")
if failed:
    raise SystemExit('Marketing V2 gate failed: ' + ', '.join(failed))
print(f'PASS | {len(checks)} Marketing Workspace V2 checks')
