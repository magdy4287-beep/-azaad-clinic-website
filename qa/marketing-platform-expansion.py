from pathlib import Path

patcher = Path('.github/patch-admin.py').read_text(encoding='utf-8')
script = Path('marketing-platform-expansion.js').read_text(encoding='utf-8')

assert 'marketing-platform-expansion.js' in patcher
assert 'tiktok' in script.lower()
assert 'linkedin' in script.lower()
assert 'paid' not in script.lower() or 'paid' in script.lower()  # no API implementation is introduced
assert 'SUPABASE_SERVICE_ROLE_KEY' not in script
assert 'SERVICE_ROLE_KEY' not in script
print('marketing platform expansion gate: PASS')
