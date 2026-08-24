(() => {
  'use strict';

  const STATE_KEY = '__AZAAD_BOOKING_UI_FINAL_FIX_V1__';
  if (window[STATE_KEY]) return;
  const state = { observer: null, timer: null, running: false, lastSuccess: false };
  window[STATE_KEY] = state;

  const $ = (id) => document.getElementById(id);
  const visible = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };
  const textOf = (el) => String(el?.textContent || '').replace(/\s+/g, ' ').trim();
  const isWhatsAppAction = (el) => {
    if (!el || !visible(el)) return false;
    const href = String(el.getAttribute?.('href') || '').toLowerCase();
    const text = textOf(el).toLowerCase();
    return href.includes('wa.me/') || href.includes('api.whatsapp.com/') || href.includes('whatsapp.com/send') || text.includes('whatsapp') || text.includes('واتساب');
  };
  const findWhatsAppAction = () => [...document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"], button, [role="button"]')].find(isWhatsAppAction) || null;
  const findBookingSubmit = () => $('bookingForm')?.querySelector('.booking-submit[type="submit"]') || $('bookingForm')?.querySelector('button[type="submit"]') || document.querySelector('.booking-submit[type="submit"]');
  const successTextPresent = () => {
    const t = String(document.body?.innerText || '').toLowerCase();
    return t.includes('تم إنشاء الحجز بنجاح') || t.includes('تم إنشاء طلب الحجز بنجاح') || t.includes('booking created successfully') || t.includes('your booking request was created successfully') || t.includes('رقم الحجز');
  };
  const successMarkerPresent = () => ['[data-booking-success]','.booking-success','.booking-result','.booking-confirmation','.whatsapp-step','#whatsappStep'].some(s => [...document.querySelectorAll(s)].some(visible));
  const bookingSucceeded = () => {
    const wa = findWhatsAppAction();
    return Boolean(wa && (successTextPresent() || successMarkerPresent()));
  };

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
    const blue = submit ? (getComputedStyle(submit).backgroundColor || '#101b56') : '#101b56';
    action.dataset.azaadPrimaryWhatsApp = 'true';
    action.style.setProperty('background', blue, 'important');
    action.style.setProperty('background-color', blue, 'important');
    action.style.setProperty('color', '#ffffff', 'important');
    action.style.setProperty('border-color', blue, 'important');
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

  // IMPORTANT: this formatter runs from a MutationObserver. It must be idempotent.
  // Once a time has an AM/PM suffix, never match and format the numeric part again.
  const TIME_TOKEN_RE = /\b([01]?\d|2[0-3]):([0-5]\d)\b(?!\s*(?:AM|PM)\b)/gi;
  const convertTimeString = (value) => String(value || '').replace(TIME_TOKEN_RE, (full,h,m) => formatTime12(h,m) || full);

  function convertTimeInTextNodes(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p || ['SCRIPT','STYLE','NOSCRIPT','TEXTAREA'].includes(p.tagName) || p.closest('[data-time-format-lock="true"]')) return NodeFilter.FILTER_REJECT;
        return TIME_TOKEN_RE.test(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    TIME_TOKEN_RE.lastIndex = 0;
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => { const before = String(n.nodeValue || ''); TIME_TOKEN_RE.lastIndex = 0; const after = convertTimeString(before); if (before !== after) n.nodeValue = after; });
  }

  function refresh() {
    if (state.running) return;
    state.running = true;
    try {
      convertTimeInTextNodes(document.body);
      if (bookingSucceeded()) {
        state.lastSuccess = true;
        const wa = findWhatsAppAction();
        hideConfirmationButton();
        styleWhatsAppAction(wa);
        moveStatusBelowWhatsApp(wa);
      }
    } finally { state.running = false; }
  }

  function schedule() {
    if (state.timer) return;
    state.timer = setTimeout(() => { state.timer = null; refresh(); }, 40);
  }

  function init() {
    refresh();
    try {
      state.observer = new MutationObserver(schedule);
      state.observer.observe(document.body, { childList:true, subtree:true, characterData:true });
    } catch (_) {}
    window.addEventListener('azaadLanguageChanged', schedule);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
