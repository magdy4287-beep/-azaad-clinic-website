/* ============================================================
   AZAAD CLINIC — CENTRAL SCHEDULING SYNC
   ------------------------------------------------------------
   One scheduling truth for Patient + Admin.
   - Postgres clinic_bookings is the source of truth.
   - Realtime is an invalidation signal, never the data source.
   - Every change triggers a fresh canonical Availability/Admin read.
   - A bounded polling fallback protects against missed WebSocket events.
   - No booking data is duplicated into localStorage/sessionStorage.
   ============================================================ */
(() => {
  'use strict';

  if (window.__AZAAD_CENTRAL_SCHEDULING_SYNC__) return;
  window.__AZAAD_CENTRAL_SCHEDULING_SYNC__ = true;

  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const PUBLIC_SCHEDULING_API = `${SUPABASE_URL}/functions/v1/azaad-public-scheduling`;
  const SUPABASE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const POLL_MS = 8000;
  const EVENT_DEBOUNCE_MS = 250;

  let supabase = null;
  let channel = null;
  let refreshTimer = null;
  let pollTimer = null;
  let refreshInFlight = false;
  let refreshQueued = false;
  let lastFingerprint = '';

  const isAdmin = () => !!window.AZAAD?.supabase;
  const isPatient = () => !!document.getElementById('bookingForm');

  function currentBookingContext() {
    const doctor = document.getElementById('doctor')?.value || '';
    const service = document.getElementById('service')?.value || '';
    const date = document.getElementById('date')?.value || '';
    const mode = document.getElementById('mode')?.value || 'clinic';
    return { doctor, service, date, mode };
  }

  function fingerprint() {
    const c = currentBookingContext();
    return `${c.doctor}|${c.service}|${c.date}|${c.mode}`;
  }

  function patientRefresh() {
    if (!isPatient()) return;
    const ctx = currentBookingContext();
    if (!ctx.doctor || !ctx.service || !ctx.date) return;

    // app.js remains the sole owner of #slots. We only request a fresh read.
    const date = document.getElementById('date');
    if (!date) return;
    date.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function adminRefresh() {
    if (!isAdmin()) return;
    try {
      if (typeof window.AZAAD.refresh === 'function') {
        await window.AZAAD.refresh();
      } else {
        window.dispatchEvent(new CustomEvent('azaad:bookings-invalidated'));
      }
    } catch (error) {
      console.warn('[AZAAD scheduling] admin refresh failed:', error);
    }
  }

  function scheduleRefresh(reason = 'change') {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      refreshTimer = null;
      if (refreshInFlight) {
        refreshQueued = true;
        return;
      }
      refreshInFlight = true;
      try {
        if (isPatient()) patientRefresh();
        if (isAdmin()) await adminRefresh();
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

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      const next = fingerprint();
      if (next !== lastFingerprint) {
        lastFingerprint = next;
        scheduleRefresh('context-change');
        return;
      }
      if (document.visibilityState !== 'hidden') scheduleRefresh('fallback-poll');
    }, POLL_MS);
  }

  async function startRealtime() {
    try {
      if (window.AZAAD?.supabase) {
        supabase = window.AZAAD.supabase;
      } else {
        const mod = await import('https://esm.sh/@supabase/supabase-js@2');
        supabase = mod.createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
      }

      channel = supabase
        .channel('azaad-central-scheduling-v1')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clinic_bookings' }, payload => {
          console.info('[AZAAD scheduling] booking change received', payload.eventType);
          scheduleRefresh(`booking-${payload.eventType}`);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_weekly_schedules' }, payload => {
          console.info('[AZAAD scheduling] schedule change received', payload.eventType);
          scheduleRefresh(`schedule-${payload.eventType}`);
        })
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            console.info('[AZAAD scheduling] realtime connected');
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('[AZAAD scheduling] realtime unavailable; fallback polling remains active');
          }
        });
    } catch (error) {
      console.warn('[AZAAD scheduling] realtime setup failed; fallback polling remains active:', error);
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
    try { if (channel && supabase) supabase.removeChannel(channel); } catch (_) {}
    if (pollTimer) clearInterval(pollTimer);
    if (refreshTimer) clearTimeout(refreshTimer);
  });

  lastFingerprint = fingerprint();
  startPolling();
  startRealtime();
})();
