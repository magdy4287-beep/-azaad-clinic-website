(() => {
  'use strict';

  const AR = {
    instruction: 'يجب الضغط هنا 👇 لإرسال الموعد إلى العيادة',
    button: 'إرسال الموعد إلى العيادة عبر WhatsApp',
    ready: 'بعد فتح WhatsApp ستظهر الرسالة جاهزة. اضغط «إرسال» داخل WhatsApp لإرسال الحجز إلى العيادة.'
  };
  const EN = {
    instruction: 'Please click here 👇 to send the appointment to the clinic',
    button: 'Send the appointment to the clinic via WhatsApp',
    ready: 'WhatsApp will open with the message ready. Press “Send” inside WhatsApp to send the booking to the clinic.'
  };

  function language() {
    try {
      const saved = localStorage.getItem('azaadClinicLanguage');
      if (saved === 'en' || saved === 'ar') return saved;
    } catch (_) {}
    const lang = String(document.documentElement.lang || '').toLowerCase();
    return lang === 'en' || lang.startsWith('en-') ? 'en' : 'ar';
  }

  function copyButtonStyle() {
    const source = document.querySelector('.booking-submit');
    const target = document.getElementById('sendBookingWhatsApp');
    if (!source || !target) return;
    const style = getComputedStyle(source);
    target.style.background = style.background;
    target.style.backgroundColor = style.backgroundColor;
    target.style.color = style.color;
    target.style.border = style.border;
    target.style.borderRadius = style.borderRadius;
    target.style.fontFamily = style.fontFamily;
    target.style.fontSize = style.fontSize;
    target.style.fontWeight = style.fontWeight;
    target.style.lineHeight = style.lineHeight;
    target.style.padding = style.padding;
    target.style.boxShadow = style.boxShadow;
    target.style.textDecoration = 'none';
  }

  function render() {
    const container = document.getElementById('whatsappBookingStep');
    if (!container) return;
    const isEn = language() === 'en';
    const copy = isEn ? EN : AR;
    const instruction = container.querySelector('[data-booking-whatsapp-instruction]');
    const button = document.getElementById('sendBookingWhatsApp');
    const ready = container.querySelector('[data-booking-whatsapp-ready]');
    if (instruction && instruction.textContent !== copy.instruction) instruction.textContent = copy.instruction;
    if (button) {
      if (button.textContent !== copy.button) button.textContent = copy.button;
      if (button.getAttribute('aria-label') !== copy.button) button.setAttribute('aria-label', copy.button);
      button.dir = isEn ? 'ltr' : 'rtl';
    }
    if (ready && ready.textContent !== copy.ready) ready.textContent = copy.ready;
    container.dir = isEn ? 'ltr' : 'rtl';
    copyButtonStyle();
  }

  function patch() {
    const container = document.getElementById('whatsappBookingStep');
    if (!container) return;
    let instruction = container.querySelector('[data-booking-whatsapp-instruction]');
    let ready = container.querySelector('[data-booking-whatsapp-ready]');
    if (!instruction) {
      const button = document.getElementById('sendBookingWhatsApp');
      if (button) {
        const p = button.parentElement?.querySelector('p');
        if (p) {
          instruction = document.createElement('p');
          instruction.setAttribute('data-booking-whatsapp-instruction', 'true');
          instruction.style.cssText = 'font-size:18px;font-weight:700;line-height:1.8;margin:0 0 12px;color:inherit;';
          p.parentElement.insertBefore(instruction, p);
        }
      }
    }
    if (!ready) {
      const paragraphs = Array.from(container.querySelectorAll('p'));
      const candidate = paragraphs[paragraphs.length - 1];
      if (candidate) {
        candidate.setAttribute('data-booking-whatsapp-ready', 'true');
        ready = candidate;
      }
    }
    render();
  }

  const observer = new MutationObserver(() => {
    if (document.getElementById('whatsappBookingStep')) patch();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('azaad:language-changed', patch);
  document.addEventListener('click', (event) => {
    if (event.target.closest('.lang-btn')) setTimeout(patch, 0);
  });
  patch();
})();
