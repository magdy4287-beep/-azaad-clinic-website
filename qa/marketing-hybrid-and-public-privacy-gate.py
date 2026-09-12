from pathlib import Path

studio=Path('marketing-studio-v4.js').read_text(encoding='utf-8').lower()
privacy=Path('patient-booking-privacy-v2.js').read_text(encoding='utf-8').lower()
team=Path('public-team-display.js').read_text(encoding='utf-8').lower()
# This lookup is retained only as legacy migration/privacy evidence. It is not a production runtime owner.
legacy_lookup=Path('supabase/functions/azaad-patient-lookup/index.ts').read_text(encoding='utf-8').lower()
lazy=Path('qa/lazy-admin-modules.py').read_text(encoding='utf-8').lower()

for needle in ('facebook','instagram','linkedin','tiktok','campaign','addchannel','clinic_marketing_publications'):
    assert needle in studio, needle
assert 'free ai suggest' in studio
assert 'marketing-studio-v3.js' not in studio
assert 'marketing-studio-v4.js' in lazy
assert 'marketing-studio-v3.js' in lazy  # explicitly retired/removed by the deterministic cleanup set
assert 'supabase.co' not in studio
assert 'azaad-public-patient-lookup' in privacy
assert 'select("id,active")' in legacy_lookup
response_contract=legacy_lookup.split('select("id,active")',1)[1]
for secret in ('upcoming_bookings','patient_name','mrn'):
    assert secret not in response_contract, secret
assert 'api/public-clinic-data?scope=team' in team
print('marketing hybrid + public privacy gate: PASS (legacy lookup checked as evidence only)')
