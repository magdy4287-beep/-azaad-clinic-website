(() => {
  'use strict';

  const form = document.getElementById('bookingForm');
  const name = document.getElementById('name');
  const phone = document.getElementById('phone');
  if (!form || !name || !phone) return;

  const language = () => {
    try {
      const saved = localStorage.getItem('azaadClinicLanguage');
      if (saved === 'en' || saved === 'ar') return saved;
    } catch (_) {}
    const lang = String(document.documentElement.lang || '').toLowerCase();
    return lang === 'en' || lang.startsWith('en-') ? 'en' : 'ar';
  };

  const copy = () => language() === 'en'
    ? {
        name: 'Please enter your full three-part name.',
        phone: 'Please enter a valid Egyptian mobile phone number (11 digits, or +20 followed by 10 digits).'
      }
    : {
        name: 'من فضلك اكتب اسمك الثلاثي بالكامل.',
        phone: 'من فضلك أدخل رقم موبايل مصري صحيح (١١ رقمًا، أو +٢٠ ثم ١٠ أرقام).'
      };

  const normalizeDigits = (value) => String(value || '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

  const threePartName = (value) =>
    String(value || '').trim().split(/\s+/).filter(Boolean).length === 3;

  // AZAAD is Egypt-based: accept the four Egyptian mobile prefixes (010/011/012/015)
  // in local 11-digit form, or the equivalent +20 international form.
  const validEgyptianMobile = (value) => {
    const normalized = normalizeDigits(value).replace(/[\s().-]/g, '');
    return /^(?:01[0125]\d{8}|20(?:10|11|12|15)\d{8})$/.test(normalized);
  };

  function validate() {
    const c = copy();
    const nameValue = String(name.value || '').trim();
    const phoneValue = String(phone.value || '').trim();

    name.setCustomValidity(nameValue && threePartName(nameValue) ? '' : c.name);
    phone.setCustomValidity(phoneValue && validEgyptianMobile(phoneValue) ? '' : c.phone);
  }

  [name, phone].forEach((input) => {
    input.addEventListener('input', validate);
    input.addEventListener('change', validate);
  });

  form.addEventListener('invalid', validate, true);
  window.addEventListener('azaad:language-changed', validate);
  window.addEventListener('azaadLanguageChanged', validate);
  window.addEventListener('storage', (event) => {
    if (event.key === 'azaadClinicLanguage') validate();
  });

  // ------------------------------------------------------------
  // POST-BOOKING RECOVERY
  // ------------------------------------------------------------
  // app.js owns the booking operation. This layer only captures the
  // submitted context before app.js resets the form, then guarantees that
  // a successful booking always has a visible WhatsApp action.
  let pendingContext = null;
  let recoveryTimer = null;
  let recoveryAttempts = 0;

  const currentLanguage = language;
  const text = () => currentLanguage() === 'en'
    ? {
        title: 'Booking created successfully',
        instruction: 'Please click here 👇 to send the appointment to the clinic',
        button: 'Send the appointment to the clinic via WhatsApp',
        ready: 'WhatsApp will open with the message ready. Press “Send” inside WhatsApp to send the appointment to the clinic.',
        number: 'Booking number'
      }
    : {
        title: 'تم إنشاء الحجز بنجاح',
        instruction: 'يجب الضغط هنا 👇 لإرسال الموعد إلى العيادة',
        button: 'إرسال الموعد إلى العيادة عبر WhatsApp',
        ready: 'بعد فتح WhatsApp ستظهر الرسالة جاهزة. اضغط «إرسال» داخل WhatsApp لإرسال الموعد إلى العيادة.',
        number: 'رقم الحجز'
      };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));

  const clinicWhatsApp = () => {
    // Keep the existing canonical clinic number used by app.js unless a
    // configured number is exposed by the public clinic settings.
    const configured = window.AZAAD_CLINIC_WHATSAPP || '201140526294';
    return String(configured).replace(/\D/g, '');
  };

  const getOptionText = (id) => {
    const select = document.getElementById(id);
    const option = select?.selectedOptions?.[0];
    return String(option?.textContent || '').replace(/\s+/g, ' ').trim();
  };

  const formatDate = (value) => {
    if (!value) return '';
    try {
      return new Date(`${value}T00:00:00`).toLocaleDateString(
        currentLanguage() === 'en' ? 'en-US' : 'ar-EG',
        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      );
    } catch (_) {
      return value;
    }
  };

  const formatTime = (value) => {
    const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return String(value || '');
    let hour = Number(match[1]);
    const minute = match[2];
    const suffix = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${suffix}`;
  };

  const bookingCodeFromStatus = () => {
    const status = document.getElementById('message');
    const raw = String(status?.textContent || '');
    const match = raw.match(/(?:AZD-[A-Z0-9]+|رقم الحجز\s*:\s*([A-Za-z0-9-]+)|Booking number\s*:\s*([A-Za-z0-9-]+))/i);
    if (!match) return '';
    return match[0].match(/AZD-[A-Z0-9]+/i)?.[0] || match[1] || match[2] || '';
  };

  const successVisible = () => {
    const status = document.getElementById('message');
    if (!status) return false;
    const raw = String(status.textContent || '').toLowerCase();
    return raw.includes('تم إنشاء الحجز بنجاح') ||
      raw.includes('تم إنشاء طلب الحجز بنجاح') ||
      raw.includes('booking created successfully') ||
      raw.includes('your booking request was created successfully');
  };

  function renderWhatsAppRecovery() {
    if (!pendingContext || !successVisible()) return;
    if (document.getElementById('whatsappBookingStep')) return;

    const bookingCode = bookingCodeFromStatus();
    if (!bookingCode) return;

    const c = text();
    const doctor = pendingContext.doctorName;
    const service = pendingContext.serviceName;
    const mode = pendingContext.mode === 'online' ? (currentLanguage() === 'en' ? 'Online session' : 'جلسة أونلاين') : (currentLanguage() === 'en' ? 'In-clinic' : 'داخل العيادة');
    const bookingMessage = currentLanguage() === 'en'
      ? `Azaad Clinic - New booking\nBooking number: ${bookingCode}\nPatient name: ${pendingContext.name}\nPhone number: ${pendingContext.phone}\nDoctor: ${doctor}\nService: ${service}\nDate: ${formatDate(pendingContext.date)}\nTime: ${formatTime(pendingContext.time)}\nSession type: ${mode}`
      : `Azaad Clinic - طلب حجز جديد\nرقم الحجز: ${bookingCode}\nاسم المريض: ${pendingContext.name}\nرقم الهاتف: ${pendingContext.phone}\nالطبيب: ${doctor}\nالخدمة: ${service}\nالتاريخ: ${formatDate(pendingContext.date)}\nالوقت: ${formatTime(pendingContext.time)}\nنوع الجلسة: ${mode}`;

    const container = document.createElement('div');
    container.id = 'whatsappBookingStep';
    container.style.cssText = 'margin-top:20px;padding:20px;border-radius:14px;background:#f1fbf5;border:1px solid #ccebd8;';
    container.dir = currentLanguage() === 'en' ? 'ltr' : 'rtl';
    container.innerHTML = `
      <div style="text-align:center">
        <div style="font-size:18px;font-weight:700;margin-bottom:8px;color:#16734a">${escapeHtml(c.title)}</div>
        <p style="line-height:1.8;margin:0 0 14px">
          ${escapeHtml(c.number)}: <strong>${escapeHtml(bookingCode)}</strong><br>
          <span data-booking-whatsapp-instruction="true" style="font-size:18px;font-weight:700;line-height:1.8">${escapeHtml(c.instruction)}</span>
        </p>
        <a id="sendBookingWhatsApp" href="https://wa.me/${escapeHtml(clinicWhatsApp())}?text=${encodeURIComponent(bookingMessage)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700;font-size:16px;min-height:52px">${escapeHtml(c.button)}</a>
        <p data-booking-whatsapp-ready="true" style="font-size:13px;color:#666;margin-top:12px;line-height:1.7">${escapeHtml(c.ready)}</p>
      </div>`;

    const submit = form.querySelector('.booking-submit[type="submit"]') || form.querySelector('button[type="submit"]');
    const submitStyle = submit ? getComputedStyle(submit) : null;
    const button = container.querySelector('#sendBookingWhatsApp');
    if (submitStyle && button) {
      button.style.background = submitStyle.background;
      button.style.backgroundColor = submitStyle.backgroundColor;
      button.style.color = submitStyle.color;
      button.style.border = submitStyle.border;
      button.style.borderRadius = submitStyle.borderRadius;
      button.style.fontFamily = submitStyle.fontFamily;
      button.style.fontSize = submitStyle.fontSize;
      button.style.fontWeight = submitStyle.fontWeight;
      button.style.boxShadow = submitStyle.boxShadow;
    }

    form.parentNode?.insertBefore(container, form.nextSibling);
    try { container.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
  }

  function scheduleRecovery() {
    if (recoveryTimer) return;
    recoveryTimer = setTimeout(() => {
      recoveryTimer = null;
      recoveryAttempts += 1;
      renderWhatsAppRecovery();
      if (pendingContext && recoveryAttempts < 50 && !document.getElementById('whatsappBookingStep')) scheduleRecovery();
    }, 80);
  }

  // Capture before app.js receives the same submit event. This preserves the
  // appointment context even though app.js resets the form after success.
  form.addEventListener('submit', () => {
    validate();
    if (!form.checkValidity()) return;
    const slot = document.querySelector('#slots .slot.selected')?.dataset.slot || '';
    pendingContext = {
      doctorName: getOptionText('doctor'),
      serviceName: getOptionText('service'),
      date: document.getElementById('date')?.value || '',
      time: slot,
      mode: document.getElementById('mode')?.value || 'clinic',
      name: String(name.value || '').trim(),
      phone: String(phone.value || '').trim()
    };
    recoveryAttempts = 0;
    scheduleRecovery();
  }, true);

  const observer = new MutationObserver(() => {
    if (pendingContext && successVisible()) scheduleRecovery();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  validate();
})();
