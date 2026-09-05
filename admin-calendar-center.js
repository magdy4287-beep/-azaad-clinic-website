/*
 * AZAAD Admin Calendar Center
 * Single owner for the Admin booking calendar UI.
 * Reads the canonical booking state exposed by admin.js.
 * No second auth owner or booking query.
 */
(() => {
  'use strict';
  if (window.__AZAAD_ADMIN_CALENDAR_CENTER__) return;
  window.__AZAAD_ADMIN_CALENDAR_CENTER__ = true;
  const $ = (id) => document.getElementById(id);
  const TIME_ZONE = 'Africa/Cairo';
  const escapeHTML = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const dateParts = (date) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  const iso = (date) => { const p = dateParts(date); return `${p.year}-${p.month}-${p.day}`; };
  const shiftDate = (value, days) => { const [y,m,d] = String(value).split('-').map(Number); return new Date(Date.UTC(y,m-1,d+days,12)).toISOString().slice(0,10); };
  const dateLabel = (value, options) => { const [y,m,d] = String(value).split('-').map(Number); return new Intl.DateTimeFormat('ar-EG', { timeZone: TIME_ZONE, ...options }).format(new Date(Date.UTC(y,m-1,d,12))); };
  const displayTime = (value) => { const match = String(value || '').slice(0,5).match(/^(\d{1,2}):(\d{2})$/); if (!match) return escapeHTML(value || '-'); const h = Number(match[1]); return `${h % 12 || 12}:${match[2]} ${h < 12 ? 'ص' : 'م'}`; };
  const bookingDate = (booking) => String(booking?.appointment_date || '').slice(0,10);
  const bookings = () => Array.isArray(window.AZAAD?.state?.bookings) ? window.AZAAD.state.bookings : [];
  const visible = () => { const p=$('calendar'); if (!p) return false; const s=getComputedStyle(p); return !p.hidden && s.display !== 'none' && s.visibility !== 'hidden'; };

  const renderDay = (value) => {
    const panel=$('calendar'), body=$('calendarBody'); if (!panel || !body) return;
    panel.dataset.selectedDate=value;
    const rows=bookings().filter(b=>bookingDate(b)===value).sort((a,b)=>String(a.appointment_time||'').localeCompare(String(b.appointment_time||'')));
    body.classList.remove('empty');
    body.innerHTML=`<div class="azaad-calendar-toolbar"><button type="button" class="btn btn-secondary" id="calendarPrev">◀ اليوم السابق</button><strong>${escapeHTML(dateLabel(value,{weekday:'long',year:'numeric',month:'long',day:'numeric'}))}</strong><button type="button" class="btn btn-secondary" id="calendarNext">اليوم التالي ▶</button></div><div class="azaad-calendar-week">${Array.from({length:7},(_,i)=>{const day=shiftDate(value,i-3);return `<button type="button" class="azaad-calendar-day ${day===value?'is-selected':''}" data-calendar-date="${day}"><span>${escapeHTML(dateLabel(day,{weekday:'short'}))}</span><b>${escapeHTML(dateLabel(day,{day:'numeric',month:'short'}))}</b><em>${bookings().filter(b=>bookingDate(b)===day).length} موعد</em></button>`}).join('')}</div><div class="azaad-calendar-list">${rows.length?rows.map(b=>`<article class="azaad-calendar-booking"><div><strong>${escapeHTML(b.patient_name||'مريض')}</strong><div class="muted">${escapeHTML(b.booking_code||'-')} · ${escapeHTML(displayTime(b.appointment_time))}</div></div><span class="badge">${escapeHTML(b.status||'غير محدد')}</span></article>`).join(''):'<div class="empty">📭 لا توجد حجوزات فعلية لهذا اليوم.</div>'}</div>`;
    $('calendarPrev')?.addEventListener('click',()=>renderDay(shiftDate(value,-1)));
    $('calendarNext')?.addEventListener('click',()=>renderDay(shiftDate(value,1)));
    body.querySelectorAll('[data-calendar-date]').forEach(b=>b.addEventListener('click',()=>renderDay(b.dataset.calendarDate)));
  };
  const render = () => { const p=$('calendar'); if (p) renderDay(p.dataset.selectedDate || iso(new Date())); };
  let timer=null, started=0, refreshQueued=false;
  const queue=()=>{ if(!visible()||refreshQueued)return; refreshQueued=true; requestAnimationFrame(()=>{refreshQueued=false;render();}); };
  const poll=()=>{ if(!visible()){if(timer)clearTimeout(timer);timer=null;return;} const s=window.AZAAD?.state; if(!s?.loadingBookings){if(timer)clearTimeout(timer);timer=null;render();return;} if(!started)started=performance.now(); if(performance.now()-started>=10000){if(timer)clearTimeout(timer);timer=null;render();return;} timer=setTimeout(poll,100); };

  // Activation is the authoritative lifecycle signal. Rendering here closes the
  // race where the registry loaded this module before the calendar panel existed
  // or before the panel was made visible.
  window.addEventListener('azaad:admin-panel-activated', event => {
    if (event?.detail?.panel !== 'calendar') return;
    requestAnimationFrame(() => { render(); started=performance.now(); poll(); });
  });
  window.addEventListener('azaad:admin-panel-ready', event => {
    if (event?.detail?.panel === 'calendar') render();
  });
  window.addEventListener('azaad:admin-bookings-updated', () => { if(timer)clearTimeout(timer); timer=null; render(); });

  const observeDocument = new MutationObserver(() => {
    const body=$('calendarBody');
    if (!body || !visible()) return;
    if (body.classList.contains('empty') && /جاري تجهيز التقويم/.test(body.textContent||'')) queue();
  });
  observeDocument.observe(document.body,{childList:true,subtree:true});
  window.AZAAD_ADMIN_CALENDAR=Object.freeze({render,refresh:render});
  render(); started=performance.now(); poll();
})();
