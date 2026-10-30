(() => {
  'use strict';

  const STATE_KEY = '__AZAAD_BOOKING_UI_FINAL_FIX_V6__';
  if (window[STATE_KEY]) return;
  const state = { observer: null, timer: null, running: false, lastSuccess: false, context: null, recoveryPromise: null };
  window[STATE_KEY] = state;

  const $ = (id) => document.getElementById(id);
  const visible = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };
  const textOf = (el) => String(el?.textContent || '').replace(/\s+/g, ' ').trim();
  const currentLanguage = () => {
    try {
      const saved = localStorage.getItem('azaadClinicLanguage');
      if (saved === 'en' || saved === 'ar') return saved;
    } catch (_) {}
    const lang = String(document.documentElement.lang || '').toLowerCase();
    return lang === 'en' || lang.startsWith('en-') ? 'en' : 'ar';
  };
  const bookingCopy = () => currentLanguage() === 'en'
    ? {
        success: 'Booking created successfully.',
        bookingRequest: 'Your booking request was created successfully.',
        bookingNumber: 'Booking number',
        title: 'Booking created successfully',
        instruction: 'Please click here 👇 to send the appointment to the clinic',
        button: 'Send the appointment to the clinic via WhatsApp',
        ready: 'WhatsApp will open with the message ready. Press “Send” inside WhatsApp to send the appointment to the clinic.'
      }
    : {
        success: 'تم إنشاء الحجز بنجاح.',
        bookingRequest: 'تم إنشاء طلب الحجز بنجاح.',
        bookingNumber: 'رقم الحجز',
        title: 'تم إنشاء الحجز بنجاح',
        instruction: 'يجب الضغط هنا 👇 لإرسال الموعد إلى العيادة',
        button: 'إرسال الموعد إلى العيادة عبر WhatsApp',
        ready: 'بعد فتح WhatsApp ستظهر الرسالة جاهزة. اضغط «إرسال» داخل WhatsApp لإرسال الموعد إلى العيادة.'
      };
  const isWhatsAppAction = (el) => {
    if (!el || !visible(el)) return false;
    const href = String(el.getAttribute?.('href') || '').toLowerCase();
    const text = textOf(el).toLowerCase();
    return href.includes('wa.me/') || href.includes('api.whatsapp.com/') || href.includes('whatsapp.com/send') || text.includes('whatsapp') || text.includes('واتساب');
  };
  const findWhatsAppAction = () => {
    const bookingAction = $('whatsappBookingStep')?.querySelector('#sendBookingWhatsApp,[data-azaad-whatsapp-cta]');
    return bookingAction && visible(bookingAction) ? bookingAction : null;
  };
  const findBookingSubmit = () => $('bookingForm')?.querySelector('.booking-submit[type="submit"]') || $('bookingForm')?.querySelector('button[type="submit"]') || document.querySelector('.booking-submit[type="submit"]');
  const successTextPresent = () => {
    const status = $('message');
    const value = textOf(status).toLowerCase();
    if (!status || !visible(status)) return false;
    return value.includes('تم إنشاء الحجز بنجاح') ||
      value.includes('تم إنشاء طلب الحجز بنجاح') ||
      value.includes('booking created successfully') ||
      value.includes('your booking request was created successfully') ||
      /(?:رقم الحجز|booking number)\s*:?\s*[a-z0-9-]+/i.test(value);
  };
  // Success detection must not depend on a WhatsApp anchor already existing:
  // that circular dependency was the reason the previous guard could not
  // recover the exact production state (success message, missing CTA).
  const bookingSucceeded = () => successTextPresent();

  function captureBookingContext() {
    const selected = document.querySelector('#slots .slot.selected');
    const doctor = $('doctor');
    const service = $('service');
    state.context = {
      doctorName: doctor?.selectedOptions?.[0]?.textContent?.trim() || '',
      serviceName: service?.selectedOptions?.[0]?.textContent?.trim() || '',
      date: $('date')?.value || '',
      time: selected?.dataset?.slot || '',
      mode: $('mode')?.value || 'clinic',
      patientName: $('name')?.value?.trim() || '',
      phone: $('phone')?.value?.trim() || '',
      email: $('email')?.value?.trim() || '',
      notes: $('notes')?.value?.trim() || ''
    };
  }

  function bookingCode() {
    const value = textOf($('message'));
    return value.match(/(?:رقم الحجز|Booking number)\s*:?\s*([A-Za-z0-9-]+)/i)?.[1] ||
      value.match(/\b(AZD-[A-Z0-9-]{6,})\b/i)?.[1] || '';
  }

  async function getClinicWhatsAppNumber() {
    try {
      const response = await fetch('/api/public-clinic-data?api=data&_=' + Date.now(), {
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        const settings = data?.settings || {};
        const number = String(settings.whatsapp || settings.whatsapp_number ||
          settings.whatsapp_phone || settings.phone_whatsapp || '').replace(/\D/g, '');
        if (number) return number;
      }
    } catch (_) {}
    return '201140526294';
  }

  function createRecoveryMessage(code) {
    const c = state.context || {};
    const en = currentLanguage() === 'en';
    const service = String(c.serviceName || (en ? 'Service' : 'الخدمة'))
      .replace(/\s+—?\s*\d+\s*(?:دقيقة|minutes?)\s*$/i, '');
    const date = c.date ? new Date(c.date + 'T00:00:00').toLocaleDateString(
      en ? 'en-US' : 'ar-EG',
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    ) : (en ? 'Not specified' : 'غير محدد');
    const rawTime = String(c.time || '').slice(0, 5);
    const match = rawTime.match(/^(\d{1,2}):(\d{2})$/);
    let time = rawTime || (en ? 'Not specified' : 'غير محدد');
    if (match) {
      let hour = Number(match[1]);
      if (hour >= 0 && hour <= 23) time = `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
    }
    const mode = c.mode === 'online'
      ? (en ? 'Online' : 'جلسة أونلاين')
      : (en ? 'In-clinic' : 'داخل العيادة');
    const lines = [
      `🏥 ${en ? 'New appointment from Azaad Clinic website' : 'موعد جديد من موقع عيادة آزاد'}`,
      `📌 ${en ? 'Booking number' : 'رقم الحجز'}: ${code || (en ? 'Not available' : 'غير متوفر')}`,
      `👤 ${en ? 'Patient name' : 'اسم المريض'}: ${c.patientName || (en ? 'Not specified' : 'غير محدد')}`,
      `📱 ${en ? 'Phone' : 'رقم الهاتف'}: ${c.phone || (en ? 'Not specified' : 'غير محدد')}`,
      `👨‍⚕️ ${en ? 'Doctor' : 'الطبيب'}: ${c.doctorName || (en ? 'Doctor' : 'الطبيب')}`,
      `🩺 ${en ? 'Service' : 'الخدمة'}: ${service}`,
      `📅 ${en ? 'Date' : 'التاريخ'}: ${date}`,
      `⏰ ${en ? 'Time' : 'الوقت'}: ${time}`,
      `💻 ${en ? 'Session type' : 'نوع الجلسة'}: ${mode}`
    ];
    if (c.email) lines.push(`📧 ${en ? 'Email' : 'البريد الإلكتروني'}: ${c.email}`);
    if (c.notes) lines.push(`📝 ${en ? 'Notes' : 'ملاحظات'}: ${c.notes}`);
    return lines.join('\n');
  }

  async function ensureWhatsAppStep() {
    if (!state.lastSuccess || !state.context || state.recoveryPromise) return;
    const code = bookingCode();
    if (!code) return;

    state.recoveryPromise = (async () => {
      let container = $('whatsappBookingStep');
      const form = $('bookingForm');
      if (!container) {
        container = document.createElement('div');
        container.id = 'whatsappBookingStep';
        container.style.marginTop = '20px';
        container.style.padding = '20px';
        container.style.borderRadius = '14px';
        container.style.background = '#f1fbf5';
        container.style.border = '1px solid #ccebd8';
        if (form?.parentNode) form.parentNode.insertBefore(container, form.nextSibling);
        else document.body.appendChild(container);
      } else if (form && container.parentNode === form && form.parentNode) {
        // Keep the post-booking action outside the form reset/control lifecycle.
        form.parentNode.insertBefore(container, form.nextSibling);
      }

      container.hidden = false;
      container.removeAttribute('aria-hidden');
      container.setAttribute('role', 'status');
      container.setAttribute('aria-live', 'polite');
      container.style.setProperty('display', 'block', 'important');
      container.style.setProperty('visibility', 'visible', 'important');
      container.style.setProperty('opacity', '1', 'important');

      let button = container.querySelector('#sendBookingWhatsApp');
      if (!button) {
        const number = await getClinicWhatsAppNumber();
        const href = `https://wa.me/${number}?text=${encodeURIComponent(createRecoveryMessage(code))}`;
        const en = currentLanguage() === 'en';
        const instruction = en
          ? 'Please click here 👇 to send the appointment to the clinic'
          : 'يجب الضغط هنا 👇 لإرسال الموعد إلى العيادة';
        const buttonText = en
          ? 'Send the appointment to the clinic via WhatsApp'
          : 'إرسال الموعد إلى العيادة عبر WhatsApp';
        const ready = en
          ? 'WhatsApp will open with the message ready. Press “Send” inside WhatsApp to send the appointment to the clinic.'
          : 'بعد فتح WhatsApp ستظهر الرسالة جاهزة. اضغط «إرسال» داخل WhatsApp لإرسال الموعد إلى العيادة.';
        // Re-check after the async settings request in case app.js rendered
        // the canonical CTA while the recovery request was in flight.
        button = container.querySelector('#sendBookingWhatsApp');
        if (!button) {
        const block = document.createElement('div');
        block.style.textAlign = 'center';
        block.innerHTML = `<span data-azaad-whatsapp-instruction="true" style="display:block;font-size:18px;font-weight:700;line-height:1.8;margin:8px 0 12px">${escapeHtml(instruction)}</span><a id="sendBookingWhatsApp" data-azaad-whatsapp-cta="true" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;color:#fff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700;font-size:16px;min-height:52px">${escapeHtml(buttonText)}</a><p data-booking-whatsapp-ready="true" style="font-size:13px;color:#666;margin-top:12px;line-height:1.7">${escapeHtml(ready)}</p>`;
        container.appendChild(block);
        button = block.querySelector('#sendBookingWhatsApp');
        }
      }

      const en = currentLanguage() === 'en';
      const instructionText = en
        ? 'Please click here 👇 to send the appointment to the clinic'
        : 'يجب الضغط هنا 👇 لإرسال الموعد إلى العيادة';
      let instruction = container.querySelector('[data-azaad-whatsapp-instruction]');
      if (!instruction && button.parentNode) {
        instruction = document.createElement('span');
        instruction.setAttribute('data-azaad-whatsapp-instruction', 'true');
        instruction.style.cssText = 'display:block;font-size:18px;font-weight:700;line-height:1.8;margin:8px 0 12px';
        button.parentNode.insertBefore(instruction, button);
      }
      if (instruction) instruction.textContent = instructionText;
      button.textContent = en
        ? 'Send the appointment to the clinic via WhatsApp'
        : 'إرسال الموعد إلى العيادة عبر WhatsApp';
      button.setAttribute('aria-label', button.textContent);
      button.setAttribute('data-azaad-whatsapp-cta', 'true');
      container.dir = en ? 'ltr' : 'rtl';
      container.hidden = false;
      container.style.setProperty('display', 'block', 'important');
      container.style.setProperty('visibility', 'visible', 'important');
      container.style.setProperty('opacity', '1', 'important');
    })().finally(() => {
      state.recoveryPromise = null;
    });
    return state.recoveryPromise;
  }

  function hideConfirmationButton() {
    const button = findBookingSubmit();
    if (!button) return;
    button.dataset.azaadHiddenAfterBooking = 'true';
    button.setAttribute('aria-hidden', 'true');
    button.setAttribute('tabindex', '-1');
    button.hidden = true;
    ['display','visibility','pointer-events','opacity','height','margin','padding','overflow'].forEach((p, i) => {
      const values = ['none','hidden','none','0','0','0','0','hidden'];
      button.style.setProperty(p, values[i], 'important');
    });
  }

  function styleWhatsAppAction(action) {
    if (!action) return;
    const submit = findBookingSubmit();
    const submitStyle = submit ? getComputedStyle(submit) : null;
    const background = submitStyle?.backgroundColor || '#101b56';
    const border = submitStyle?.borderTopColor || background;
    action.dataset.azaadPrimaryWhatsApp = 'true';
    action.style.setProperty('background', background, 'important');
    action.style.setProperty('background-color', background, 'important');
    action.style.setProperty('color', '#ffffff', 'important');
    action.style.setProperty('border-color', border, 'important');
    action.style.setProperty('font-weight', '700', 'important');
    action.style.setProperty('text-decoration', 'none', 'important');
    action.style.setProperty('opacity', '1', 'important');
    action.style.setProperty('visibility', 'visible', 'important');
    action.style.setProperty('min-height', '52px', 'important');
    action.style.setProperty('cursor', 'pointer', 'important');
    if (action.tagName === 'A') {
      action.style.setProperty('display', 'inline-flex', 'important');
      action.style.setProperty('align-items', 'center', 'important');
      action.style.setProperty('justify-content', 'center', 'important');
    }
  }

  function moveStatusBelowWhatsApp(action) {
    const status = $('message') || document.querySelector('.booking-message,.booking-status,.booking-success,.booking-result,[data-booking-status]');
    if (!action || !status || action === status) return;
    if (action.nextElementSibling !== status) action.insertAdjacentElement('afterend', status);
    status.dataset.azaadBookingStatusBelowWhatsApp = 'true';
    status.style.setProperty('display','block','important');
    status.style.setProperty('margin-top','12px','important');
    status.style.setProperty('margin-bottom','0','important');
  }

  function localizeBookingConfirmation() {
    const copy = bookingCopy();
    const step = $('whatsappBookingStep');
    if (step && visible(step)) {
      const title = step.querySelector('div > div');
      if (title) title.textContent = copy.title;
      const paragraphs = [...step.querySelectorAll('p')];
      const details = paragraphs[0];
      const ready = paragraphs[paragraphs.length - 1];
      if (details) {
        const strong = details.querySelector('strong');
        const code = strong ? strong.textContent.trim() : '';
        details.innerHTML = `${copy.bookingNumber}: <strong>${escapeHtml(code)}</strong><br><span data-azaad-whatsapp-instruction="true"></span>`;
        const instruction = details.querySelector('[data-azaad-whatsapp-instruction]');
        if (instruction) instruction.textContent = copy.instruction;
      }
      if (ready) ready.textContent = copy.ready;
      const action = step.querySelector('#sendBookingWhatsApp') || findWhatsAppAction();
      if (action) {
        action.textContent = copy.button;
        action.setAttribute('aria-label', copy.button);
      }
    }

    const status = $('message');
    if (status && visible(status)) {
      const raw = textOf(status);
      if (/bookingCreated|bookingSuccess|bookingNumber|whatsappTitle|whatsappDescription|sendToWhatsApp|whatsappReady/.test(raw)) {
        const match = raw.match(/(?:bookingNumber\s*:\s*|رقم الحجز\s*:\s*)([A-Za-z0-9-]+)/i);
        status.textContent = match ? `${copy.success} ${copy.bookingNumber}: ${match[1]}` : copy.success;
      }
    }
  }

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));

  // The canonical slot renderer in app.js owns #slots and stores raw HH:MM in data-slot.
  // This hardening layer must never rewrite slot text or slot accessibility labels.
  // It only formats incidental time text outside the canonical slots container.
  function formatTime12(hour24, minute) {
    const formatter = window.AZAAD_LOCALE?.formatTime12;
    if (typeof formatter === 'function') {
      const formatted = String(formatter(hour24, minute) || '').trim();
      if (formatted) return formatted;
    }
    const h = Number(hour24), m = Number(minute);
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    const suffix = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
  }

  const TIME_TOKEN_RE = /\b([01]?\d|2[0-3]):([0-5]\d)\b(?!\s*(?:AM|PM)\b)/i;
  const convertTimeString = (value) => String(value || '').replace(
    /\b([01]?\d|2[0-3]):([0-5]\d)\b(?!\s*(?:AM|PM)\b)/gi,
    (full, h, m) => formatTime12(h, m) || full
  );

  function convertTimeInTextNodes(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        // Never touch the canonical slot renderer or any explicitly protected subtree.
        if (!p || ['SCRIPT','STYLE','NOSCRIPT','TEXTAREA'].includes(p.tagName) || p.closest('#slots,[data-no-i18n],[data-time-format-lock="true"]')) {
          return NodeFilter.FILTER_REJECT;
        }
        const value = node.nodeValue || '';
        return TIME_TOKEN_RE.test(value) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      const before = String(n.nodeValue || '');
      const after = convertTimeString(before);
      if (before !== after) n.nodeValue = after;
    });
  }

  function refresh() {
    if (state.running) return;
    state.running = true;
    try {
      convertTimeInTextNodes(document.body);
      state.lastSuccess = bookingSucceeded();
      if (state.lastSuccess) {
        // The recovery owner can create the CTA when app.js or another DOM
        // owner leaves only the success message behind.
        void ensureWhatsAppStep();
        const wa = findWhatsAppAction();
        if (wa) {
          hideConfirmationButton();
          styleWhatsAppAction(wa);
          localizeBookingConfirmation();
          moveStatusBelowWhatsApp(wa);
        }
      }
    } finally { state.running = false; }
  }

  function schedule() {
    if (state.timer) return;
    state.timer = setTimeout(() => { state.timer = null; refresh(); }, 40);
  }

  function init() {
    const form = $('bookingForm');
    if (form) form.addEventListener('submit', captureBookingContext, true);
    refresh();
    try {
      state.observer = new MutationObserver(schedule);
      state.observer.observe(document.body, { childList:true, subtree:true, characterData:true });
    } catch (_) {}
    window.addEventListener('azaadLanguageChanged', schedule);
    window.addEventListener('storage', (event) => {
      if (event.key === 'azaadClinicLanguage') schedule();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
