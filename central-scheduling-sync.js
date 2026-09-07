/* ============================================================
   AZAAD CLINIC — CENTRAL SCHEDULING SYNC
   ------------------------------------------------------------
   ONE scheduling truth for Patient + Admin.

   Source of truth:
     PostgreSQL clinic_bookings + doctor_weekly_schedules on Neon.

   Runtime design:
     - No Supabase dependency.
     - Public/admin reads go through the canonical Neon-backed APIs.
     - BroadcastChannel carries ONLY an invalidation signal between
       same-origin browser contexts; no patient/booking row data is sent.
     - Polling is the recovery path and also the cross-device refresh path.
     - No booking truth is stored in localStorage/sessionStorage.

   Ownership:
     - app.js is the sole owner of patient #slots rendering.
     - admin.js remains the sole owner of admin booking rendering.
     - this file only invalidates/requests a fresh read.
   ============================================================ */
(() => {
  'use strict';

  if (window.__AZAAD_CENTRAL_SCHEDULING_SYNC__) return;
  window.__AZAAD_CENTRAL_SCHEDULING_SYNC__ = true;

  const BROADCAST_TOPIC = 'azaad:scheduling';
  const BROADCAST_EVENT = 'availability_invalidated';
  const FALLBACK_POLL_MS = 15000;
  const EVENT_DEBOUNCE_MS = 150;
  const SLOT_RESTORE_TIMEOUT_MS = 6000;

  let broadcast = null;
  let refreshTimer = null;
  let pollTimer = null;
  let refreshInFlight = false;
  let refreshQueued = false;
  let lastFingerprint = '';

  const isPatient = () => !!document.getElementById('bookingForm');
  const isAdmin = () => !!document.getElementById('adminPage');

  function currentBookingContext() {
    return {
      doctor: document.getElementById('doctor')?.value || '',
      service: document.getElementById('service')?.value || '',
      date: document.getElementById('date')?.value || '',
      mode: document.getElementById('mode')?.value || 'clinic'
    };
  }

  function fingerprint() {
    const c = currentBookingContext();
    return `${c.doctor}|${c.service}|${c.date}|${c.mode}`;
  }

  function restoreSelectedSlotAfterRefresh(slotValue) {
    if (!slotValue || !isPatient()) return;
    const slots = document.getElementById('slots');
    if (!slots) return;

    let restored = false;
    let observer = null;
    let timer = null;

    const finish = () => {
      if (observer) observer.disconnect();
      if (timer) clearTimeout(timer);
    };

    const tryRestore = () => {
      if (restored) return true;
      const button = [...slots.querySelectorAll('.slot')]
        .find((item) => item.dataset.slot === slotValue);
      if (!button) return false;
      button.click();
      restored = true;
      finish();
      return true;
    };

    if (tryRestore()) return;

    try {
      observer = new MutationObserver(() => {
        if (tryRestore()) finish();
      });
      observer.observe(slots, { childList: true, subtree: true });
    } catch (_) {}

    timer = setTimeout(finish, SLOT_RESTORE_TIMEOUT_MS);
  }

  function patientRefresh() {
    if (!isPatient()) return;
    const ctx = currentBookingContext();
    if (!ctx.doctor || !ctx.service || !ctx.date) return;

    // Once a booking succeeds, the confirmation + WhatsApp step owns the
    // post-booking UI. Do not let background invalidation remove it.
    if (document.getElementById('whatsappBookingStep')) return;

    // Preserve a patient-selected slot across a canonical availability refresh.
    const selected = document.querySelector('#slots .slot.selected')?.dataset.slot || '';

    const date = document.getElementById('date');
    if (date) {
      date.dispatchEvent(new Event('change', { bubbles: true }));
      restoreSelectedSlotAfterRefresh(selected);
    }
  }

  function adminRefresh() {
    if (!isAdmin()) return;

    const button = document.getElementById('refreshBookings');
    if (button && !button.disabled) {
      button.click();
      return;
    }

    const topRefresh = document.getElementById('refreshBtn');
    if (topRefresh && !topRefresh.disabled) {
      topRefresh.click();
      return;
    }

    window.dispatchEvent(new CustomEvent('azaad:bookings-invalidated'));
  }

  function scheduleRefresh(reason = 'change') {
    if (refreshTimer) clearTimeout(refreshTimer);

    refreshTimer = setTimeout(() => {
      refreshTimer = null;

      if (refreshInFlight) {
        refreshQueued = true;
        return;
      }

      refreshInFlight = true;
      try {
        if (isPatient()) patientRefresh();
        if (isAdmin()) adminRefresh();

        window.dispatchEvent(new CustomEvent('azaad:scheduling-refreshed', {
          detail: { reason, at: new Date().toISOString() }
        }));
      } finally {
        refreshInFlight = false;
        if (refreshQueued) {
          refreshQueued = false;
          scheduleRefresh('queued-change');
        }
      }
    }, EVENT_DEBOUNCE_MS);
  }

  function startFallbackPolling() {
    if (pollTimer) clearInterval(pollTimer);

    pollTimer = setInterval(() => {
      if (document.visibilityState === 'hidden') return;

      const next = fingerprint();
      if (next !== lastFingerprint) {
        lastFingerprint = next;
        scheduleRefresh('context-change');
        return;
      }

      scheduleRefresh('fallback-poll');
    }, FALLBACK_POLL_MS);
  }

  function startSameOriginBroadcast() {
    if (typeof BroadcastChannel === 'undefined') return;

    try {
      broadcast = new BroadcastChannel(BROADCAST_TOPIC);
      broadcast.addEventListener('message', event => {
        if (event?.data?.type !== BROADCAST_EVENT) return;
        scheduleRefresh('broadcast-invalidation');
      });
    } catch (error) {
      console.warn('[AZAAD scheduling] same-origin broadcast unavailable; polling remains active:', error);
      broadcast = null;
    }
  }

  window.AZAAD_SCHEDULING = Object.freeze({
    refresh: () => {
      scheduleRefresh('manual');
      try {
        broadcast?.postMessage({ type: BROADCAST_EVENT });
      } catch (_) {}
    },
    context: currentBookingContext,
    schedulingApi: '/api/public-scheduling'
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleRefresh('visibility-return');
  });

  window.addEventListener('beforeunload', () => {
    try { broadcast?.close(); } catch (_) {}
    if (pollTimer) clearInterval(pollTimer);
    if (refreshTimer) clearTimeout(refreshTimer);
  });

  lastFingerprint = fingerprint();
  startFallbackPolling();
  startSameOriginBroadcast();
})();
