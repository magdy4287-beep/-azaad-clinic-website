from pathlib import Path

index = Path('index.html').read_text(encoding='utf-8')
gate = Path('patient-booking-gate.js').read_text(encoding='utf-8')

required_index = [
    'patient-booking-gate.js',
    'bookingForm',
]
for token in required_index:
    assert token in index, token

required_gate = [
    'azaad-patient-lookup',
    'mobile number',
    'patient file',
    'patient_id',
    'Continue with this patient file',
    'Create new patient file',
    'bookingForm',
    'stopImmediatePropagation',
    'patient_id = state.patient.id',
]
for token in required_gate:
    assert token in gate, token

# The public UI must not contain a service-role credential.
for token in ('SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY', 'service_role_key='):
    assert token not in gate, token

print('patient booking gate contract: PASS')
