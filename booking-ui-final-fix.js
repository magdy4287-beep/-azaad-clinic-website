(() => {
  'use strict';

  const STATE_KEY = '__AZAAD_BOOKING_UI_FINAL_FIX_V2__';
  if (window[STATE_KEY]) return;
  const state = { timer: null, running: false, success: false, context: null, observer: null };
  window[STATE_KEY] = state;

  const $ = (id) => document.getElementById(id);
  const textOf = (el) => String(el?.textContent || '').replace(/\s+/g, ' ').trim();
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
        title: 'Booking created successfully',
        bookingNumber: 'Booking number',
        instruction: 'Please click here 👇 to send the appointment to the clinic',
        button: 'Send the appointment to the clinic via WhatsApp',
        ready: 'WhatsApp will open with the message ready. Press “Send” inside WhatsApp to send the appointment to the clinic.'
      }
    : {
        title: 'تم إنشاء الحجز بنجاح',
        bookingNumber: 'رقم الحجز',
        instruction: 'يجب الضغط هنا 👇 لإرسال الموعد إلى العيادة',
        button: 'إرسال الموعد إلى العيادة عبر WhatsApp',
        ready: 'بعد فتح WhatsApp ستظهر الرسالة جاهزة. اضغط «إرسال» داخل WhatsApp لإرسال الموعد إلى العيادة.'
      };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
  const visible = (el) => !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';

  function formatTime(value) {
    const raw = String(value || '').trim().slice(0, 5);
    const match = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return raw;
    let h = Number(match[1]);
    const m = match[2];
    if (!Number.isFinite(h) || h < 0 || h > 23) return raw;
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${period}`;
  }

  function captureBookingContext() {
    const selected = document.querySelector('#slots .slot.selected');
    const doctor = $('doctor');
    const service = $('service');
    const mode = $('mode');
    state.context = {
      doctorName: doctor?.selectedOptions?.[0]?.textContent?.trim() || '',
      serviceName: service?.selectedOptions?.[0]?.textContent?.trim() || '',
      date: $('date')?.value || '',
      time: selected?.dataset?.slot || '',
      mode: mode?.value || 'clinic',
      patientName: $('name')?.value?.trim() || '',
      phone: $('phone')?.value?.trim() || '',
      email: $('email')?.value?.trim() || '',
      notes: $('notes')?.value?.trim() || ''
    };
  }

  function bookingSucceeded() {
    const body = String(document.body?.innerText || '').toLowerCase();
    return body.includes('تم إنشاء الحجز بنجاح') ||
      body.includes('تم إنشاء طلب الحجز بنجاح') ||
      body.includes('تم تأكيد الحجز') ||
      body.includes('booking created successfully') ||
      body.includes('your booking request was created successfully') ||
      body.includes('booking number') ||
      body.includes('رقم الحجز');
  }

  function bookingCode() {
    const body = String(document.body?.innerText || '');
    return body.match(/(?:رقم الحجز|Booking number)\s*:?\s*([A-Za-z0-9-]+)/i)?.[1] || '';
  }

  function submitButton() {
    return $('bookingForm')?.querySelector('.booking-submit[type="submit"]') || $('bookingForm')?.querySelector('button[type="submit"]');
  }

  async function whatsappNumber() {
    try {
      const r = await fetch('https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-clinic-data?api=data&_=' + Date.now(), { cache: 'no-store', headers: { Accept: 'application/json' } });
      if (r.ok) {
        const d = await r.json();
        const s = d?.settings || {};
        const n = String(s.whatsapp || s.whatsapp_number || s.whatsapp_phone || s.phone_whatsapp || '').replace(/\D/g, '');
        if (n) return n;
      }
    } catch (_) {}
    return '201140526294';
  }

  function whatsappMessage(code) {
    const c = state.context || {};
    const en = language() === 'en';
    const service = (c.serviceName || (en ? 'Service' : 'الخدمة')).replace(/\s+—?\s*\d+\s*(?:دقيقة|minutes?)\s*$/i, '');
    const mode = c.mode === 'online' ? (en ? 'Online' : 'جلسة أونلاين') : (en ? 'In-clinic' : 'داخل العيادة');
    const lines = [
      `🏥 ${en ? 'New appointment from Azaad Clinic website' : 'موعد جديد من موقع عيادة آزاد'}`,
      `📌 ${en ? 'Booking number' : 'رقم الحجز'}: ${code || (en ? 'Not available' : 'غير متوفر')}`,
      `👤 ${en ? 'Patient name' : 'اسم المريض'}: ${c.patientName || (en ? 'Not specified' : 'غير محدد')}`,
      `📱 ${en ? 'Phone' : 'رقم الهاتف'}: ${c.phone || (en ? 'Not specified' : 'غير محدد')}`,
      `👨‍⚕️ ${en ? 'Doctor' : 'الطبيب'}: ${c.doctorName || (en ? 'Doctor' : 'الطبيب')}`,
      `🩺 ${en ? 'Service' : 'الخدمة'}: ${service}`,
      `📅 ${en ? 'Date' : 'التاريخ'}: ${c.date || (en ? 'Not specified' : 'غير محدد')}`,
      `⏰ ${en ? 'Time' : 'الوقت'}: ${formatTime(c.time) || (en ? 'Not specified' : 'غير محدد')}`,
      `💻 ${en ? 'Session type' : 'نوع الجلسة'}: ${mode}`
    ];
    if (c.email) lines.push(`📧 ${en ? 'Email' : 'البريد الإلكتروني'}: ${c.email}`);
    if (c.notes) lines.push(`📝 ${en ? 'Notes' : 'ملاحظات'}: ${c.notes}`);
    return lines.join('\n');
  }

  async function ensureWhatsAppStep() {
    if (!state.success || !state.context) return;
    const c = copy();
    const code = bookingCode();
    let container = $('whatsappBookingStep');
    if (!container) {
      container = document.createElement('div');
      container.id = 'whatsappBookingStep';
      container.dataset.azaadGuaranteed = 'true';
      const form = $('bookingForm');
      if (form?.parentNode) form.parentNode.insertBefore(container, form.nextSibling);
    }
    const number = await whatsappNumber();
    const href = `https://wa.me/${number}?text=${encodeURIComponent(whatsappMessage(code))}`;
    container.innerHTML = `<div style="text-align:center"><div style="font-size:18px;font-weight:700;margin-bottom:8px;color:#16734a">${escapeHtml(c.title)}</div><p style="line-height:1.8;margin:0 0 14px">${escapeHtml(c.bookingNumber)}: <strong>${escapeHtml(code)}</strong><br><span style="display:block;font-size:18px;font-weight:700;line-height:1.8;margin-top:8px">${escapeHtml(c.instruction)}</span></p><a id="sendBookingWhatsApp" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;color:#fff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700;font-size:16px;min-height:52px">${escapeHtml(c.button)}</a><p style="font-size:13px;color:#666;margin-top:12px;line-height:1.7">${escapeHtml(c.ready)}</p></div>`;

    const button = $('sendBookingWhatsApp');
    const source = submitButton();
    if (button && source) {
      const s = getComputedStyle(source);
      button.style.background = s.backgroundColor || '#101b56';
      button.style.backgroundColor = s.backgroundColor || '#101b56';
      button.style.border = s.border;
      button.style.borderRadius = s.borderRadius;
      button.style.fontFamily = s.fontFamily;
      button.style.fontWeight = s.fontWeight || '700';
      button.style.color = '#fff';
    } else if (button) {
      button.style.background = '#101b56';
    }
    container.dir = language() === 'en' ? 'ltr' : 'rtl';
    if (source) {
      source.hidden = true;
      source.setAttribute('aria-hidden', 'true');
      source.setAttribute('tabindex', '-1');
      source.style.setProperty('display', 'none', 'important');
    }
  }

  function refresh() {
    if (state.running) return;
    state.running = true;
    try {
      if (!state.success && bookingSucceeded()) state.success = true;
      if (state.success) void ensureWhatsAppStep();
    } finally {
      state.running = false;
    }
  }

  function schedule() {
    if (state.timer) return;
    state.timer = setTimeout(() => { state.timer = null; refresh(); }, 40);
  }

  function init() {
    const form = $('bookingForm');
    if (form) form.addEventListener('submit', captureBookingContext, true);
    try {
      state.observer = new MutationObserver(schedule);
      state.observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (_) {}
    window.addEventListener('azaadLanguageChanged', schedule);
    window.addEventListener('azaad:language-changed', schedule);
    window.addEventListener('storage', (e) => { if (e.key === 'azaadClinicLanguage') schedule(); });
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
