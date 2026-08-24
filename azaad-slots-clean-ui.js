(() => {
  'use strict';

  const API = 'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-scheduling';
  const state = { observer: null, timer: null, request: 0, originalButtons: new Map(), renderedKey: '' };
  const slotsEl = () => document.getElementById('slots');
  const doctorEl = () => document.getElementById('doctor');
  const serviceEl = () => document.getElementById('service');
  const dateEl = () => document.getElementById('date');
  const modeEl = () => document.getElementById('mode');
  const language = () => (String(document.documentElement.lang || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar');
  const text = (ar, en) => language() === 'en' ? en : ar;

  function normalizeTime(value) {
    const m = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    if (!m) return '';
    const h = Number(m[1]); const min = Number(m[2]);
    if (!Number.isInteger(h) || h < 0 || h > 23 || min < 0 || min > 59) return '';
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  function formatTime(value) {
    const normalized = normalizeTime(value);
    if (!normalized) return '';
    const [hh, mm] = normalized.split(':').map(Number);
    const suffix = hh >= 12 ? 'PM' : 'AM';
    let h = hh % 12; if (h === 0) h = 12;
    return `${h}:${String(mm).padStart(2, '0')} ${suffix}`;
  }

  function selectedValues() {
    const doctor = String(doctorEl()?.value || '').trim();
    const service = String(serviceEl()?.value || '').trim();
    const date = String(dateEl()?.value || '').trim();
    const mode = String(modeEl()?.value || 'clinic').trim().toLowerCase();
    return { doctor, service, date, mode };
  }

  function rememberOriginalButtons(root) {
    root.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]').forEach((el) => {
      const candidates = [el.getAttribute('data-time'), el.getAttribute('data-slot'), el.value, el.textContent];
      for (const candidate of candidates) {
        const time = normalizeTime(candidate);
        if (!time) continue;
        if (!state.originalButtons.has(time)) state.originalButtons.set(time, el);
        el.dataset.azaadOriginalSlot = time;
        el.style.setProperty('display', 'none', 'important');
        break;
      }
    });
  }

  function cleanNonSlotContent(root) {
    root.querySelectorAll('script, style, pre, code, table, ul, ol').forEach((el) => el.remove());
    [...root.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && String(node.nodeValue || '').trim()) node.nodeValue = '';
    });
    root.querySelectorAll(':scope > *').forEach((el) => {
      if (el.dataset?.azaadSlotsUi === 'true') return;
      const hasSlotControl = el.matches('button,[role="button"],input[type="button"],input[type="submit"]') || el.querySelector('button,[role="button"],input[type="button"],input[type="submit"]');
      if (!hasSlotControl) el.remove();
    });
  }

  function render(times, key) {
    const root = slotsEl(); if (!root) return;
    const old = root.querySelector('[data-azaad-slots-ui="true"]');
    if (old) old.remove();
    const panel = document.createElement('div');
    panel.dataset.azaadSlotsUi = 'true';
    panel.className = 'azaad-slots-clean-panel';

    if (!times.length) {
      const empty = document.createElement('div');
      empty.className = 'azaad-slots-empty';
      empty.textContent = text('لا توجد مواعيد متاحة لهذا اليوم.', 'No appointments are available for this day.');
      panel.appendChild(empty);
    } else {
      const title = document.createElement('div');
      title.className = 'azaad-slots-title';
      title.textContent = text('اختر الموعد المتاح', 'Choose an available appointment');
      panel.appendChild(title);
      const grid = document.createElement('div');
      grid.className = 'azaad-slots-grid';
      times.forEach((time) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'azaad-slot-button';
        button.dataset.time = time;
        button.textContent = formatTime(time);
        button.addEventListener('click', () => {
          const original = state.originalButtons.get(time);
          if (original) {
            original.click();
            grid.querySelectorAll('.azaad-slot-button').forEach((b) => b.classList.toggle('is-selected', b === button));
          }
        });
        grid.appendChild(button);
      });
      panel.appendChild(grid);
    }
    root.appendChild(panel);
    state.renderedKey = key;
  }

  async function load() {
    const root = slotsEl(); if (!root) return;
    const { doctor, service, date, mode } = selectedValues();
    const key = `${doctor}|${service}|${date}|${mode}`;
    state.request += 1; const requestId = state.request;
    rememberOriginalButtons(root);
    if (!doctor || !service || !date) {
      render([], key);
      const empty = root.querySelector('.azaad-slots-empty');
      if (empty) empty.textContent = text('اختر الطبيب والخدمة والتاريخ لعرض المواعيد المتاحة.', 'Select the doctor, service, and date to view available appointments.');
      return;
    }
    const panel = root.querySelector('[data-azaad-slots-ui="true"]');
    if (panel) panel.remove();
    const loading = document.createElement('div');
    loading.dataset.azaadSlotsUi = 'true';
    loading.className = 'azaad-slots-loading';
    loading.textContent = text('جاري تحميل المواعيد المتاحة...', 'Loading available appointments...');
    root.appendChild(loading);
    try {
      const params = new URLSearchParams({ api: 'slots', doctor, service, date, mode });
      const response = await fetch(`${API}?${params.toString()}`, { method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' } });
      const body = await response.json().catch(() => ({}));
      if (requestId !== state.request) return;
      if (!response.ok || !Array.isArray(body?.slots)) throw new Error('slots_failed');
      const times = [...new Set(body.slots.map(normalizeTime).filter(Boolean))].sort();
      render(times, key);
    } catch (_) {
      if (requestId !== state.request) return;
      render([], key);
      const empty = root.querySelector('.azaad-slots-empty');
      if (empty) {
        empty.classList.add('is-error');
        empty.textContent = text('تعذر تحميل المواعيد المتاحة. حاول مرة أخرى.', 'Unable to load available appointments. Please try again.');
      }
    }
  }

  function scheduleLoad() {
    clearTimeout(state.timer);
    state.timer = setTimeout(load, 80);
  }

  function init() {
    const root = slotsEl(); if (!root) return;
    ['doctor','service','date','mode'].forEach((id) => document.getElementById(id)?.addEventListener('change', scheduleLoad));
    state.observer = new MutationObserver(() => {
      const current = slotsEl(); if (!current) return;
      rememberOriginalButtons(current);
      cleanNonSlotContent(current);
    });
    state.observer.observe(root, { childList: true, subtree: true, characterData: true });
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
