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

  const escapeHTML = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const iso = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const displayDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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
          const date = new Date(`${value}T00:00:00`);
          date.setDate(date.getDate() + index - 3);
          const day = iso(date);
          const count = bookings().filter((booking) => bookingDate(booking) === day).length;
          return `<button type="button" class="azaad-calendar-day ${day === value ? 'is-selected' : ''}" data-calendar-date="${day}">
            <span>${escapeHTML(date.toLocaleDateString('ar-EG', { weekday: 'short' }))}</span>
            <b>${escapeHTML(date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }))}</b>
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

    $('calendarPrev')?.addEventListener('click', () => {
      const date = new Date(`${value}T00:00:00`);
      date.setDate(date.getDate() - 1);
      renderDay(iso(date));
    });

    $('calendarNext')?.addEventListener('click', () => {
      const date = new Date(`${value}T00:00:00`);
      date.setDate(date.getDate() + 1);
      renderDay(iso(date));
    });

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
