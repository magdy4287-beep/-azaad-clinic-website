from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CENTRAL = ROOT / "central-i18n.js"
PATIENT_GATE = ROOT / "patient-booking-gate.js"
INDEX = ROOT / "index.html"

central = CENTRAL.read_text(encoding="utf-8")
patient = PATIENT_GATE.read_text(encoding="utf-8")
index = INDEX.read_text(encoding="utf-8")

# Keep these strings in the central public translation owner. They are not a
# second runtime: the build only extends the existing central P dictionary.
extra = {
    "patientGateTitle": ["ابدأ برقم الموبايل", "Start with your mobile number"],
    "patientGateIntro": ["يجب البحث برقم الموبايل أولًا للتأكد من وجود ملف للمريض قبل اختيار الموعد.", "Mobile-number lookup is required before choosing an appointment so we can prevent duplicate patient files."],
    "patientFindFile": ["بحث عن الملف", "Find patient file"],
    "patientFile": ["ملف المريض", "Patient file"],
    "patientFound": ["تم العثور على ملف مرتبط بهذا الرقم. استخدم نفس الملف حتى لا يتم إنشاء ملف مكرر.", "A patient file already exists for this phone number. Reuse it to prevent duplicate files."],
    "patientContinue": ["متابعة الحجز بهذا الملف", "Continue with this patient file"],
    "patientSelected": ["تم اختيار الملف. يمكنك الآن اختيار الطبيب والخدمة والموعد.", "Patient file selected. You can now choose the doctor, service, and appointment."],
    "patientUpcoming": ["مواعيد قادمة", "Upcoming appointments"],
    "patientInvalidPhone": ["أدخل رقم موبايل صحيح ثم اضغط بحث.", "Enter a valid mobile number and press Find."],
    "patientSearching": ["جاري البحث...", "Searching..."],
    "patientChecking": ["جاري التحقق من ملف المريض...", "Checking the patient file..."],
    "patientUnable": ["تعذر البحث عن الملف.", "Unable to search for the patient file."],
    "patientNone": ["لم يتم العثور على ملف بهذا الرقم.", "No patient file was found for this number."],
    "patientNewIntro": ["يمكنك الآن إنشاء ملف جديد مرة واحدة ثم إكمال الحجز.", "You can now create one new patient file and continue with the booking."],
    "patientCreate": ["اختيار ملف جديد", "Create new patient file"],
    "patientNewOpen": ["تم فتح نموذج المريض الجديد. أكمل بياناتك ثم اختر الموعد.", "New patient flow is open. Complete your details, then choose the appointment."],
    "patientLocked": ["ابدأ بالبحث عن رقم الموبايل أولًا. لا يمكن إنشاء حجز قبل التحقق من ملف المريض.", "Start by searching the mobile number. A booking cannot be created before the patient file is verified."],
    "clinicAddress": ["دمياط - شارع نافع، مقابل مسجد المظلوم - أعلى صيدلية الرياض", "Damietta - Nafea Street, opposite Al-Mazloum Mosque, above Al-Riyad Pharmacy"],
}

# Insert the extra public keys into the existing central P object once.
if "patientGateTitle:" not in central:
    marker = "  const P={\n"
    if marker not in central:
        raise SystemExit("Central public dictionary marker not found")
    lines = ["  const P={"]
    for key, (ar, en) in extra.items():
        lines.append(f"    {key}:[{ar!r},{en!r}],")
    injected = "\n".join(lines) + "\n"
    central = central.replace(marker, injected, 1)

# Remove the booking gate's independent localStorage language owner. The gate
# continues to use the same central translation runtime and re-renders on the
# central language event, so EN -> AR -> EN is deterministic.
legacy = re.compile(
    r"const LANG_KEY = 'azaadClinicLanguage';\n"
    r"(?s)  const isEnglish = \(\) => \{.*?\n  \};\n  const t = \(ar, en\) => isEnglish\(\) \? en : ar;"
)
replacement = """  const centralLanguage = () => {
    const language = window.AZAAD_I18N?.language?.();
    if (language === 'en' || language === 'ar') return language;
    const htmlLang = String(document.documentElement.lang || '').toLowerCase();
    return htmlLang.startsWith('en') ? 'en' : 'ar';
  };
  const isEnglish = () => centralLanguage() === 'en';
  const t = (key) => window.AZAAD_I18N?.t?.(key) || key;"""
patient, count = legacy.subn(replacement, patient, count=1)
if count != 1:
    raise SystemExit("Patient booking gate legacy language owner not found")

# Convert the gate's bilingual pair calls to central keys.
pairs = {
    "ملف المريض":"patientFile",
    "تم العثور على ملف مرتبط بهذا الرقم. استخدم نفس الملف حتى لا يتم إنشاء ملف مكرر.":"patientFound",
    "الهاتف":"phoneLabel",
    "مواعيد قادمة":"patientUpcoming",
    "متابعة الحجز بهذا الملف":"patientContinue",
    "تم اختيار الملف. يمكنك الآن اختيار الطبيب والخدمة والموعد.":"patientSelected",
    "ابدأ برقم الموبايل":"patientGateTitle",
    "يجب البحث برقم الموبايل أولًا للتأكد من وجود ملف للمريض قبل اختيار الموعد.":"patientGateIntro",
    "رقم الموبايل":"phonePlaceholder",
    "بحث عن الملف":"patientFindFile",
    "أدخل رقم موبايل صحيح ثم اضغط بحث.":"patientInvalidPhone",
    "جاري البحث...":"patientSearching",
    "جاري التحقق من ملف المريض...":"patientChecking",
    "تعذر البحث عن الملف.":"patientUnable",
    "لم يتم العثور على ملف بهذا الرقم.":"patientNone",
    "يمكنك الآن إنشاء ملف جديد مرة واحدة ثم إكمال الحجز.":"patientNewIntro",
    "اختيار ملف جديد":"patientCreate",
    "تم فتح نموذج المريض الجديد. أكمل بياناتك ثم اختر الموعد.":"patientNewOpen",
    "ابدأ بالبحث عن رقم الموبايل أولًا. لا يمكن إنشاء حجز قبل التحقق من ملف المريض.":"patientLocked",
}
for ar, key in pairs.items():
    patient = patient.replace(f"t('{ar}',", f"t('{key}')")
    # Remove the remaining English argument for the converted calls.
    patient = re.sub(rf"t\('{re.escape(key)}'\)\s*", f"t('{key}') ", patient)

# The pair conversion above leaves the original English argument in some
# template expressions. Replace the exact complete calls deterministically.
for ar, key in pairs.items():
    patient = re.sub(rf"t\('{re.escape(key)}'\)\s*'[^']*'\)", f"t('{key}')", patient)

# Make the gate refresh itself from the central language event.
if "azaadPatientBookingGateLanguageListener" not in patient:
    needle = "  init();\n})();"
    listener = """  window.addEventListener('azaadLanguageChanged', () => {
    if (!window.azaadPatientBookingGateLanguageListener) {
      window.azaadPatientBookingGateLanguageListener = true;
      renderGate();
    }
  });
  window.addEventListener('azaadPublicContentLanguageChanged', () => renderGate());
  init();
})();"""
    if needle not in patient:
        raise SystemExit("Patient booking gate init boundary not found")
    patient = patient.replace(needle, listener, 1)

# Make the address an explicit central-i18n key instead of dynamic text-only
# content, so it follows the selected language every time.
index = index.replace(
    '<div id="address" class="address">دمياط - شارع نافع، مقابل مسجد المظلوم - أعلى صيدلية الرياض</div>',
    '<div id="address" class="address" data-i18n="clinicAddress">دمياط - شارع نافع، مقابل مسجد المظلوم - أعلى صيدلية الرياض</div>',
    1,
)

CENTRAL.write_text(central, encoding="utf-8")
PATIENT_GATE.write_text(patient, encoding="utf-8")
INDEX.write_text(index, encoding="utf-8")
print("[AZAAD i18n] fixed booking gate and clinic address under central ownership")
