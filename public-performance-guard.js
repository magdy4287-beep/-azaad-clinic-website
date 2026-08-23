/* AZAAD PUBLIC PERFORMANCE GUARD
 * Build-injected guard for the public experience only.
 * 1) Coalesces concurrent clinic-data reads through the dedicated cache layer.
 * 2) Batches the public hardening MutationObserver callback to one pass per frame.
 * No other fetches or observers are modified.
 */
(() => {
  'use strict';
  const STATE = '__AZAAD_PUBLIC_PERFORMANCE_GUARD_V1__';
  if (window[STATE]) return;
  window[STATE] = true;

  const NativeMutationObserver = window.MutationObserver;
  if (typeof NativeMutationObserver !== 'function') return;

  window.MutationObserver = function AzaadBatchedMutationObserver(callback) {
    let scheduled = false;
    let records = [];
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      const flush = () => {
        scheduled = false;
        const batch = records;
        records = [];
        try { callback(batch, proxy); } catch (error) { setTimeout(() => { throw error; }, 0); }
      };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(flush);
      else setTimeout(flush, 0);
    };
    const native = new NativeMutationObserver((newRecords) => {
      records.push(...newRecords);
      schedule();
    });
    const proxy = {
      observe(target, options) { return native.observe(target, options); },
      disconnect() { records = []; scheduled = false; return native.disconnect(); },
      takeRecords() { return native.takeRecords(); }
    };
    return proxy;
  };
  window.MutationObserver.prototype = NativeMutationObserver.prototype;
})();
