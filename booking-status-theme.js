/* Azaad Clinic — Unified Booking Status Theme
   Status colors are semantic and consistent across booking cards/calendars.
   Green = booked/confirmed, yellow = available, red = completed/past/cancelled,
   blue = in-progress, purple = pending/awaiting confirmation.
*/
(() => {
  'use strict';
  const root = document.documentElement;
  if (!document.getElementById('azaadBookingStatusTheme')) {
    const style = document.createElement('style');
    style.id = 'azaadBookingStatusTheme';
    style.textContent = `
      .azaad-booking-status{border-inline-start:5px solid var(--azaad-booking-accent,#6b7280)!important;background:var(--azaad-booking-bg,#fff)!important;color:var(--azaad-booking-text,#172033)!important}
      .azaad-booking-status *{color:inherit!important}
      .azaad-booking-available{--azaad-booking-accent:#d69e00;--azaad-booking-bg:#fff9db;--azaad-booking-text:#6b4e00}
      .azaad-booking-booked{--azaad-booking-accent:#16803c;--azaad-booking-bg:#eaf8ef;--azaad-booking-text:#0b5d2a}
      .azaad-booking-completed{--azaad-booking-accent:#c0392b;--azaad-booking-bg:#fff0ee;--azaad-booking-text:#8d2118}
      .azaad-booking-progress{--azaad-booking-accent:#2878c8;--azaad-booking-bg:#edf6ff;--azaad-booking-text:#165a99}
      .azaad-booking-pending{--azaad-booking-accent:#7c3aed;--azaad-booking-bg:#f4efff;--azaad-booking-text:#5b21b6}
      .azaad-booking-available .azaad-booking-label,.azaad-booking-booked .azaad-booking-label,.azaad-booking-completed .azaad-booking-label,.azaad-booking-progress .azaad-booking-label,.azaad-booking-pending .azaad-booking-label{font-weight:900;display:inline-flex;align-items:center;gap:6px}
      .azaad-booking-available .azaad-booking-label:before{content:'🟡'}
      .azaad-booking-booked .azaad-booking-label:before{content:'🟢'}
      .azaad-booking-completed .azaad-booking-label:before{content:'🔴'}
      .azaad-booking-progress .azaad-booking-label:before{content:'🔵'}
      .azaad-booking-pending .azaad-booking-label:before{content:'🟣'}
      .azaad-booking-legend{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.azaad-booking-legend span{padding:5px 9px;border-radius:999px;font-weight:800;font-size:12px}
      .azaad-legend-available{background:#fff9db;color:#6b4e00}.azaad-legend-booked{background:#eaf8ef;color:#0b5d2a}.azaad-legend-completed{background:#fff0ee;color:#8d2118}.azaad-legend-progress{background:#edf6ff;color:#165a99}.azaad-legend-pending{background:#f4efff;color:#5b21b6}
    `;
    document.head.appendChild(style);
  }
  const statusText = el => `${el.dataset.status||''} ${el.dataset.bookingStatus||''} ${el.getAttribute('aria-label')||''} ${el.textContent||''}`.toLowerCase();
  function classify(el){
    if (!(el instanceof HTMLElement) || el.closest('[data-azaad-status-skip]')) return;
    const explicit = String(el.dataset.bookingStatus||el.dataset.status||'').toLowerCase();
    const t = explicit || statusText(el);
    let cls = t.match(/available|متاح|متاحة/) ? 'azaad-booking-available' :
      t.match(/completed|complete|finished|past|منته|انته|مكتمل|ملغى|cancelled|canceled|no.?show/) ? 'azaad-booking-completed' :
      t.match(/in.?progress|in progress|جاري|داخل|قيد التنفيذ/) ? 'azaad-booking-progress' :
      t.match(/pending|await|انتظار|معلق|بانتظار/) ? 'azaad-booking-pending' :
      t.match(/confirmed|booked|reserved|حجز|محجوز|مؤكد/) ? 'azaad-booking-booked' : '';
    if(!cls)return;
    ['azaad-booking-available','azaad-booking-booked','azaad-booking-completed','azaad-booking-progress','azaad-booking-pending'].forEach(c=>el.classList.remove(c));
    el.classList.add('azaad-booking-status',cls);
    if(!el.querySelector('.azaad-booking-label')){const label=document.createElement('span');label.className='azaad-booking-label';label.textContent=el.dataset.statusLabel||'';if(label.textContent)el.prepend(label)}
  }
  function scan(){document.querySelectorAll('[data-booking-status],[data-status],[data-booking],.booking-card,.appointment-card,.calendar-event,.booking-item,.appointment-item,.slot,.time-slot').forEach(classify)}
  new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-status','data-booking-status']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
  window.AZAAD_BOOKING_STATUS={refresh:scan};
})();
