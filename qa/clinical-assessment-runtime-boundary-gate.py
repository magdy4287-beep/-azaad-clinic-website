from pathlib import Path

path = Path('clinical-assessment.html')
if not path.is_file():
    raise SystemExit('clinical-assessment.html is required')
text = path.read_text(encoding='utf-8')

if text.count("const API='/api/clinical-assessments';") != 1:
    raise SystemExit('Clinical assessment must have exactly one same-origin API owner')
if 'supabase.co/functions/v1/azaad-clinical-assessments' in text:
    raise SystemExit('Retired Supabase clinical assessment endpoint remains in active artifact')
if 'sb_publishable_' in text or 'createClient(' in text:
    raise SystemExit('Clinical assessment artifact must not contain a browser Supabase client or publishable key')
if "credentials:'include'" not in text:
    raise SystemExit('Clinical assessment requests must use the HttpOnly session boundary')
print('[AZAAD gate] clinical assessment runtime ownership: PASS', flush=True)
