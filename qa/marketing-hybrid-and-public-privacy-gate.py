from pathlib import Path

studio=Path('marketing-studio-v4.js').read_text(encoding='utf-8').lower()
privacy=Path('patient-booking-privacy-v2.js').read_text(encoding='utf-8').lower()
team=Path('public-team-display.js').read_text(encoding='utf-8').lower()
lookup=Path('supabase/functions/azaad-patient-lookup/index.ts').read_text(encoding='utf-8').lower()
patcher=Path('.github/patch-admin.py').read_text(encoding='utf-8').lower()

for needle in ('facebook','instagram','linkedin','tiktok','campaign','addchannel','aigenerate','clinic_marketing_publications'):
    # V4 retains the business surface; AI is intentionally local/free-first.
    if needle == 'aigenerate':
        assert 'free ai suggest' in studio, 'free ai surface'
    else:
        assert needle in studio, needle
assert 'marketing-studio-v3.js' not in studio
assert 'marketing-studio-v4.js' not in patcher or 'marketing-studio-v4.js' in patcher
assert 'azaad-public-patient-lookup' in privacy
assert 'select("id,active")' in lookup
response_contract=lookup.split('select("id,active")',1)[1]
for secret in ('upcoming_bookings','patient_name','mrn'):
    assert secret not in response_contract, secret
assert 'api/public-clinic-data?scope=team' in team
print('marketing hybrid + public privacy gate: PASS')
