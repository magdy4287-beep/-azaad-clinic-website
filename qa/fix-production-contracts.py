from pathlib import Path
import re

CANONICAL_ADMIN_STORAGE_KEY = "azaad-clinic-admin-auth"


def patch_admin_auth():
    path = Path("admin.js")
    text = path.read_text(encoding="utf-8")

    if "const SUPABASE_AUTH_STORAGE_KEY = \"azaad-clinic-admin-auth\";" not in text:
        marker = 'const SUPABASE_PUBLISHABLE_KEY =\n  "'
        match = re.search(r'const SUPABASE_PUBLISHABLE_KEY\s*=\s*"[^"]+";', text)
        if not match:
            raise SystemExit("admin.js: SUPABASE_PUBLISHABLE_KEY declaration not found")
        insert = match.group(0) + f'\n\nconst SUPABASE_AUTH_STORAGE_KEY = "{CANONICAL_ADMIN_STORAGE_KEY}";'
        text = text[:match.start()] + insert + text[match.end():]

    auth_pattern = re.compile(
        r'auth:\s*\{\s*'
        r'persistSession:\s*true,\s*'
        r'autoRefreshToken:\s*true,\s*'
        r'detectSessionInUrl:\s*true\s*'
        r'\}',
        re.S,
    )
    replacement = (
        'auth: {\n'
        '      persistSession: true,\n'
        '      autoRefreshToken: true,\n'
        '      detectSessionInUrl: false,\n'
        '      storage: window.localStorage,\n'
        '      storageKey: SUPABASE_AUTH_STORAGE_KEY\n'
        '    }'
    )
    text, count = auth_pattern.subn(replacement, text, count=1)
    if count != 1:
        raise SystemExit("admin.js: expected exactly one Supabase auth configuration")

    path.write_text(text, encoding="utf-8")


def patch_patient_booking_gate():
    path = Path("patient-booking-gate.js")
    text = path.read_text(encoding="utf-8")

    render_pattern = re.compile(
        r'  function renderGate\(\) \{.*?\n  \}\n\n  async function lookup\(\)',
        re.S,
    )
    replacement = '''  function renderGate() {
    const form = $('bookingForm');
    if (!form) return;
    let gate = $('azaadPatientBookingGate');
    if (!gate) {
      gate = document.createElement('div');
      gate.id = 'azaadPatientBookingGate';
      form.parentNode?.insertBefore(gate, form);
    }

    const found = state.patient;
    if (found) {
      gate.innerHTML = `
        <h3>👤 ${t('ملف المريض','Patient file')}</h3>
        <p>${t('تم العثور على ملف مرتبط بهذا الرقم. لا يتم عرض بيانات تعريفية أو مواعيد من البحث العام. يمكنك متابعة الحجز باستخدام السياق الآمن للملف.','A patient file is associated with this number. Public lookup does not display identifying details or appointments. You can continue using the secure patient context.')}</p>
        <div class="azaad-patient-card">
          <div><strong>🔐 ${t('تم التحقق من وجود الملف','Patient file verified')}</strong></div>
          <div class="azaad-gate-status">${t('المعرف الآمن فقط هو المستخدم لربط الحجز بالملف.','Only the opaque patient identifier is used to link the booking to the patient file.')}</div>
          <button type="button" id="azaadUseExistingPatient" class="azaad-gate-btn">✅ ${t('متابعة الحجز','Continue booking')}</button>
        </div>`;
      $('azaadUseExistingPatient').onclick = () => {
        state.mode = 'existing';
        state.patient = found;
        ensureHiddenPatientId();
        setFormLocked(false);
        if ($('phone')) $('phone').value = state.phone;
        const status = document.createElement('div');
        status.className = 'azaad-gate-status';
        status.textContent = t('تم التحقق من الملف. يمكنك الآن اختيار الطبيب والخدمة والموعد.','Patient file verified. You can now choose the doctor, service, and appointment.');
        gate.querySelector('.azaad-patient-card')?.appendChild(status);
      };
      return;
    }

    gate.innerHTML = `
      <h3>📱 ${t('ابدأ برقم الموبايل','Start with your mobile number')}</h3>
      <p>${t('يجب البحث برقم الموبايل أولًا للتأكد من وجود ملف للمريض قبل اختيار الموعد.','Mobile-number lookup is required before choosing an appointment so we can prevent duplicate patient files.')}</p>
      <div class="azaad-gate-row">
        <input id="azaadPatientLookupPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="${t('رقم الموبايل','Mobile number')}" aria-label="${t('رقم الموبايل','Mobile number')}">
        <button type="button" id="azaadPatientLookupButton" class="azaad-gate-btn">🔎 ${t('بحث عن الملف','Find patient file')}</button>
      </div>
      <div id="azaadPatientLookupResult" class="azaad-gate-result"></div>`;
    const input = $('azaadPatientLookupPhone');
    if (input) input.value = state.phone || '';
    $('azaadPatientLookupButton').onclick = lookup;
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); lookup(); } });
  }

  async function lookup()'''
    text, count = render_pattern.subn(replacement, text, count=1)
    if count != 1:
        raise SystemExit("patient-booking-gate.js: renderGate() block not found")

    text = text.replace(
        "        state.patient.upcoming_bookings = body.upcoming_bookings || [];\n",
        "",
    )
    text = text.replace(
        "      const upcoming = Array.isArray(found.upcoming_bookings) ? found.upcoming_bookings : [];\n",
        "",
    )
    text = text.replace(
        "    if (state.mode === 'existing' && state.patient) {\n      const name = $('name');\n      if (name) name.value = state.patient.patient_name || '';\n    }\n",
        "",
    )
    text = text.replace(
        "            payload.patient_mrn = state.patient.mrn;\n",
        "",
    )

    path.write_text(text, encoding="utf-8")


patch_admin_auth()
patch_patient_booking_gate()
print("Production auth and patient public contracts unified.")
