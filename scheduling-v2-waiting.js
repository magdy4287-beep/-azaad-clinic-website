/* Azaad Scheduling V2 — secure Waiting List creation */
(function () {
  'use strict';
  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== 'sv2WaitingForm') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const p = Object.fromEntries(new FormData(form));
    const patientOption = form.patient_id?.selectedOptions?.[0];
    if (!p.patient_id || !p.service_id) {
      const msg = 'المريض والخدمة مطلوبان.';
      if (window.AZAAD_SCHEDULING_V2) window.AZAAD_SCHEDULING_V2.invoke;
      return;
    }
    try {
      if (!window.AZAAD_SCHEDULING_V2?.invoke) throw new Error('Scheduling V2 غير جاهز.');
      await window.AZAAD_SCHEDULING_V2.invoke('ADD_WAITING', {
        patient_id: p.patient_id,
        service_id: p.service_id,
        requested_date: p.requested_date || null,
        priority: p.priority || 'normal',
        reason: p.reason || null,
        preferred_doctor_id: p.preferred_doctor_id || null,
      });
      form.closest('.modal')?.remove();
      window.AZAAD_SCHEDULING_V2.refresh();
    } catch (error) {
      const el = document.createElement('div');
      el.className = 'error';
      el.textContent = `⚠️ ${error?.message || 'تعذر إضافة المريض إلى قائمة الانتظار.'}`;
      form.prepend(el);
    }
  }, true);
})();
