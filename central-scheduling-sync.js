/* ============================================================
   AZAAD CLINIC — CENTRAL SCHEDULING SYNC
   ------------------------------------------------------------
   ONE scheduling truth for Patient + Admin.

   Source of truth:
     PostgreSQL clinic_bookings + doctor_weekly_schedules

   Realtime design:
     - Public Broadcast carries ONLY an invalidation signal.
     - No patient/booking row data is exposed to public clients.
     - Every signal causes a fresh canonical read/render.
     - Polling is only a recovery path if WebSocket delivery fails.
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

  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const PUBLIC_SCHEDULING_API = `${SUPABASE_URL}/functions/v1/azaad-public-scheduling`;
  const SUPABASE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const BROADCAST_TOPIC = 'azaad:scheduling';
  const BROADCAST_EVENT = 'availability_invalidated';
  const FALLBACK_POLL_MS = 15000;
  const EVENT_DEBOUNCE_MS = 150;

  let supabase = null;
  let channel = null;
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

  function patientRefresh() {
    if (!isPatient()) return;
    const ctx = currentBookingContext();
    if (!ctx.doctor || !ctx.service || !ctx.date) return;

    // app.js remains the sole owner of #slots.
    // A synthetic date change makes it perform a fresh canonical request.
    const date = document.getElementById('date');
    if (date) date.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function adminRefresh() {
    if (!isAdmin()) return;

    // admin.js owns booking data/rendering. Use its canonical Refresh UI rather
    // than maintaining a second admin data loader in this synchronization layer.
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

  async function startRealtimeBroadcast() {
    try {
      const mod = await import('https://esm.sh/@supabase/supabase-js@2');
      supabase = mod.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      channel = supabase
        .channel(BROADCAST_TOPIC)
        .on('broadcast', { event: BROADCAST_EVENT }, payload => {
          console.info('[AZAAD scheduling] availability invalidated');
          scheduleRefresh('broadcast-invalidation');
        })
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            console.info('[AZAAD scheduling] central broadcast connected');
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('[AZAAD scheduling] broadcast unavailable; fallback polling remains active');
          }
        });
    } catch (error) {
      console.warn('[AZAAD scheduling] broadcast setup failed; fallback polling remains active:', error);
    }
  }

  window.AZAAD_SCHEDULING = Object.freeze({
    refresh: () => scheduleRefresh('manual'),
    context: currentBookingContext,
    schedulingApi: PUBLIC_SCHEDULING_API
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleRefresh('visibility-return');
  });

  window.addEventListener('beforeunload', () => {
    try {
      if (channel && supabase) supabase.removeChannel(channel);
    } catch (_) {}
    if (pollTimer) clearInterval(pollTimer);
    if (refreshTimer) clearTimeout(refreshTimer);
  });

  lastFingerprint = fingerprint();
  startFallbackPolling();
  startRealtimeBroadcast();
})();
