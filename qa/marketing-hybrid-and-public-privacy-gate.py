from pathlib import Path

studio=Path('marketing-studio-v3.js').read_text(encoding='utf-8').lower()
privacy=Path('patient-booking-privacy-v2.js').read_text(encoding='utf-8').lower()
team=Path('public-team-display.js').read_text(encoding='utf-8').lower()
lookup=Path('supabase/functions/azaad-patient-lookup/index.ts').read_text(encoding='utf-8').lower()
patcher=Path('.github/patch-admin.py').read_text(encoding='utf-8').lower()

for needle in ('facebook','instagram','linkedin','tiktok','campaign','addchannel','aigenerate','clinic_marketing_publications'):
    assert needle in studio, needle
assert 'marketing-studio-v3.js' in patcher
assert 'patient-booking-privacy-v2.js' in privacy
for secret in ('patient_name','mrn','upcoming_bookings'):
    assert secret not in lookup or ('select "id,active"' in lookup and secret not in lookup.split('select "id,active"',1)[1])
assert 'azaad-public-patient-lookup' in privacy
assert 'clinic_public_team_profiles' in team or 'azaad-public-team-data' in team
print('marketing hybrid + public privacy gate: PASS')
