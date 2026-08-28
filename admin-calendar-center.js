/*
 * AZAAD Admin Calendar Center
 * Single owner for the Admin booking calendar UI.
 * Reads the canonical booking state exposed by admin.js.
 * No second Supabase client, auth owner, or booking query.
 */
(() => {
  'use strict';

  if (window.__AZAAD_ADMIN_CALENDAR_CENTER__) return;
  window.__AZAAD_ADMIN_CALENDAR_CENTER__ = true;

  const $ = (id) => document.getElementById(id);
  const TIME_ZONE = 'Africa/Cairo';

  const escapeHTML = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const cairoDateParts = (date) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  };

  const iso = (date) => {
    const parts = cairoDateParts(date);
    return `${parts.year}-${parts.month}-${parts.day}`;
  };

  const shiftDate = (value, days) => {
    const [year, month, day] = String(value).split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
    return date.toISOString().slice(0, 10);
  };

  const displayDate = (value) => {
    const [year, month, day] = String(value).split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return new Intl.DateTimeFormat('ar-EG', {
      timeZone: TIME_ZONE,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const displayDay = (value) => {
    const [year, month, day] = String(value).split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return {
      weekday: new Intl.DateTimeFormat('ar-EG', { timeZone: TIME_ZONE, weekday: 'short' }).format(date),
      date: new Intl.DateTimeFormat('ar-EG', { timeZone: TIME_ZONE, day: 'numeric', month: 'short' }).format(date)
    };
  };

  const displayTime = (value) => {
    const raw = String(value || '').slice(0, 5);
    const match = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return escapeHTML(value || '-');
    const hour = Number(match[1]);
    const suffix = hour < 12 ? 'ص' : 'م';
    const h = hour % 12 || 12;
    return `${h}:${match[2]} ${suffix}`;
  };

  const bookingDate = (booking) => String(
    booking?.appointment_date || ''
  ).slice(0, 10);

  const bookings = () => Array.isArray(window.AZAAD?.state?.bookings)
    ? window.AZAAD.state.bookings
    : [];

  const isCalendarVisible = () => {
    const panel = $('calendarPanel');
    if (!panel) return false;

    const style = window.getComputedStyle(panel);
    return !panel.hidden &&
      style.display !== 'none' &&
      style.visibility !== 'hidden';
  };

  const renderDay = (value) => {
    const panel = $('calendarPanel');
    const body = $('calendarBody');
    if (!panel || !body) return;

    panel.dataset.selectedDate = value;
    const rows = bookings()
      .filter((booking) => bookingDate(booking) === value)
      .sort((a, b) => String(a.appointment_time || '').localeCompare(String(b.appointment_time || '')));

    body.innerHTML = `
      <div class="azaad-calendar-toolbar">
        <button type="button" class="btn btn-secondary" id="calendarPrev">◀ اليوم السابق</button>
        <strong>${escapeHTML(displayDate(value))}</strong>
        <button type="button" class="btn btn-secondary" id="calendarNext">اليوم التالي ▶</button>
      </div>
      <div class="azaad-calendar-week">
        ${Array.from({ length: 7 }, (_, index) => {
          const day = shiftDate(value, index - 3);
          const labels = displayDay(day);
          const count = bookings().filter((booking) => bookingDate(booking) === day).length;
          return `<button type="button" class="azaad-calendar-day ${day === value ? 'is-selected' : ''}" data-calendar-date="${day}">
            <span>${escapeHTML(labels.weekday)}</span>
            <b>${escapeHTML(labels.date)}</b>
            <em>${count} موعد</em>
          </button>`;
        }).join('')}
      </div>
      <div class="azaad-calendar-list">
        ${rows.length ? rows.map((booking) => `
          <article class="azaad-calendar-booking">
            <div>
              <strong>${escapeHTML(booking.patient_name || 'مريض')}</strong>
              <div class="muted">${escapeHTML(booking.booking_code || '-')} · ${escapeHTML(displayTime(booking.appointment_time))}</div>
            </div>
            <span class="badge">${escapeHTML(booking.status || 'غير محدد')}</span>
          </article>
        `).join('') : '<div class="empty">📭 لا توجد حجوزات فعلية لهذا اليوم.</div>'}
      </div>
    `;

    $('calendarPrev')?.addEventListener('click', () => renderDay(shiftDate(value, -1)));
    $('calendarNext')?.addEventListener('click', () => renderDay(shiftDate(value, 1)));

    body.querySelectorAll('[data-calendar-date]').forEach((button) => {
      button.addEventListener('click', () => renderDay(button.dataset.calendarDate));
    });
  };

  function render() {
    const panel = $('calendarPanel');
    if (!panel) return;
    const selected = panel.dataset.selectedDate || iso(new Date());
    renderDay(selected);
  }

  let bookingPanelObserver = null;
  let refreshQueued = false;

  const queueRefreshFromBookingRender = () => {
    if (!isCalendarVisible() || refreshQueued) return;

    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      render();
    });
  };

  const observeBookingPanel = () => {
    const panel = $('bookingsPanel');
    if (!panel || bookingPanelObserver) return;

    bookingPanelObserver = new MutationObserver(() => {
      queueRefreshFromBookingRender();
    });

    bookingPanelObserver.observe(panel, {
      childList: true,
      subtree: true
    });
  };

  window.AZAAD_ADMIN_CALENDAR = Object.freeze({
    render,
    refresh: render
  });

  window.addEventListener('azaad:admin-panel-ready', (event) => {
    if (event?.detail?.panel === 'calendar') render();
  });

  window.addEventListener('azaad:admin-bookings-updated', render);

  observeBookingPanel();
  render();
})();
