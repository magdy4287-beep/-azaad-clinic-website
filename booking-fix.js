(() => {
  const API =
    'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinic';

  const $ = id => document.getElementById(id);

  let selectedSlot = '';

  let data = {
    doctors: [],
    services: []
  };

  const esc = value =>
    String(value ?? '').replace(
      /[&<>"']/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[c])
    );

  async function request(url, options) {
    const response =
      await fetch(url, options);

    let body = {};

    try {
      body = await response.json();
    } catch (_) {}

    if (!response.ok) {
      throw new Error(
        body.error || 'تعذر تنفيذ الطلب'
      );
    }

    return body;
  }

  function showMessage(text, success = false) {
    const element = $('message');

    if (!element) return;

    element.textContent = text;

    element.style.color =
      success
        ? '#16734a'
        : '#a13a3a';
  }

  /* ================================
     تحميل الأطباء والخدمات
  ================================= */

  function fillSelectors() {
    const doctor = $('doctor');
    const service = $('service');

    if (!doctor || !service) return;

    const previousDoctor =
      doctor.value;

    const previousService =
      service.value;

    const doctors =
      Array.isArray(data.doctors)
        ? data.doctors
        : [];

    const services =
      Array.isArray(data.services)
        ? data.services
        : [];

    doctor.innerHTML =
      '<option value="">اختر الطبيب</option>' +

      doctors
        .map(d => `
          <option value="${esc(d.id)}">
            ${esc(d.name)}
            ${
              d.title
                ? ' — ' + esc(d.title)
                : ''
            }
          </option>
        `)
        .join('');

    service.innerHTML =
      '<option value="">اختر الخدمة</option>' +

      services
        .map(s => `
          <option value="${esc(s.id)}">
            ${esc(s.name)}
            ${
              s.duration_minutes
                ? ' — ' +
                  esc(
                    s.duration_minutes
                  ) +
                  ' دقيقة'
                : ''
            }
          </option>
        `)
        .join('');

    if (
      [...doctor.options]
        .some(
          option =>
            option.value ===
            previousDoctor
        )
    ) {
      doctor.value =
        previousDoctor;
    }

    if (
      [...service.options]
        .some(
          option =>
            option.value ===
            previousService
        )
    ) {
      service.value =
        previousService;
    }
  }

  /* ================================
     تحميل بيانات العيادة
  ================================= */

  async function loadData() {
    try {

      const response =
        await request(
          API +
          '?api=data&v=' +
          Date.now()
        );

      data =
        response || {};

      fillSelectors();

      if (
        $('date') &&
        !$('date').value
      ) {

        const now =
          new Date();

        now.setMinutes(
          now.getMinutes() -
          now.getTimezoneOffset()
        );

        $('date').value =
          now
            .toISOString()
            .slice(0, 10);

        $('date').min =
          $('date').value;
      }

      await loadSlots();

    } catch (error) {

      showMessage(
        error.message ||
        'تعذر تحميل بيانات الحجز'
      );

      const service =
        $('service');

      if (
        service &&
        service.options.length === 1
      ) {

        service.innerHTML =
          `
            <option value="">
              تعذر تحميل الخدمات —
              أعد تحميل الصفحة
            </option>
          `;
      }
    }
  }

  /* ================================
     المواعيد المتاحة
  ================================= */

  async function loadSlots() {

    selectedSlot = '';

    const slots =
      $('slots');

    const doctor =
      $('doctor')?.value;

    const service =
      $('service')?.value;

    const date =
      $('date')?.value;

    if (!slots) return;

    if (
      !doctor ||
      !service ||
      !date
    ) {

      slots.textContent =
        'اختر الطبيب والخدمة والتاريخ لعرض المواعيد المتاحة.';

      return;
    }

    slots.textContent =
      'جاري تحميل المواعيد...';

    try {

      const url =
        API +
        '?api=slots' +
        '&doctor=' +
        encodeURIComponent(
          doctor
        ) +
        '&service=' +
        encodeURIComponent(
          service
        ) +
        '&date=' +
        encodeURIComponent(
          date
        ) +
        '&v=' +
        Date.now();

      const response =
        await request(url);

      const list =
        Array.isArray(
          response.slots
        )
          ? response.slots
          : [];

      if (!list.length) {

        slots.textContent =
          'لا توجد مواعيد متاحة لهذا اليوم.';

        return;
      }

      slots.innerHTML =
        list
          .map(time => `
            <button
              class="slot"
              type="button"
              data-slot="${esc(time)}">

              ${esc(time)}

            </button>
          `)
          .join('');

      slots
        .querySelectorAll('.slot')
        .forEach(button => {

          button.addEventListener(
            'click',
            () => {

              slots
                .querySelectorAll(
                  '.slot'
                )
                .forEach(
                  item =>
                    item.classList
                      .remove(
                        'selected'
                      )
                );

              button.classList.add(
                'selected'
              );

              selectedSlot =
                button.dataset.slot;
            }
          );

        });

    } catch (error) {

      slots.textContent =
        error.message ||
        'تعذر تحميل المواعيد.';
    }
  }

  /* ================================
     إرسال الحجز
  ================================= */

  async function submitBooking(event) {

    event.preventDefault();

    const doctor =
      $('doctor')?.value;

    const service =
      $('service')?.value;

    const date =
      $('date')?.value;

    if (
      !doctor ||
      !service ||
      !date
    ) {

      showMessage(
        'من فضلك اختر الطبيب والخدمة والتاريخ.'
      );

      return;
    }

    if (!selectedSlot) {

      showMessage(
        'من فضلك اختر موعدًا متاحًا.'
      );

      return;
    }

    if (
      !$('name')?.value.trim()
    ) {

      showMessage(
        'من فضلك اكتب الاسم بالكامل.'
      );

      return;
    }

    if (
      !$('phone')?.value.trim()
    ) {

      showMessage(
        'من فضلك اكتب رقم الهاتف.'
      );

      return;
    }

    const payload = {

      doctor_id:
        doctor,

      service_id:
        service,

      appointment_date:
        date,

      appointment_time:
        selectedSlot,

      mode:
        $('mode')?.value ||
        'clinic',

      patient_name:
        $('name')
          .value
          .trim(),

      patient_phone:
        $('phone')
          .value
          .trim(),

      patient_email:
        $('email')?.value
          .trim() ||
        '',

      notes:
        $('notes')?.value
          .trim() ||
        '',

      patient_language:
        document.documentElement
          .lang ||
        'ar'
    };

    const button =
      document.querySelector(
        '#bookingForm button[type="submit"]'
      );

    if (button) {

      button.disabled =
        true;

      button.dataset.oldText =
        button.textContent;

      button.textContent =
        'جاري إرسال الطلب...';
    }

    try {

      const response =
        await request(
          API + '?api=book',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify(
                payload
              )
          }
        );

      showMessage(
        'تم إرسال الحجز بنجاح. رقم الحجز: ' +
        (
          response.booking_code ||
          '—'
        ),
        true
      );

      $('bookingForm').reset();

      selectedSlot = '';

      const now =
        new Date();

      now.setMinutes(
        now.getMinutes() -
        now.getTimezoneOffset()
      );

      $('date').value =
        now
          .toISOString()
          .slice(0, 10);

      await loadSlots();

    } catch (error) {

      showMessage(
        error.message ||
        'تعذر إرسال طلب الحجز.'
      );

      await loadSlots();

    } finally {

      if (button) {

        button.disabled =
          false;

        button.textContent =
          button.dataset.oldText ||
          'تأكيد طلب الحجز';
      }
    }
  }

  /* ================================
     تشغيل النظام
  ================================= */

  function start() {

    if (!$('bookingForm'))
      return;

    $('doctor').onchange =
      loadSlots;

    $('service').onchange =
      loadSlots;

    $('date').onchange =
      loadSlots;

    $('bookingForm').onsubmit =
      submitBooking;

    loadData();
  }

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      start
    );

  } else {

    start();
  }

})();
