(() => {
  const API =
    'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinic';

  const $ = (id) => document.getElementById(id);

  let selectedSlot = '';

  let data = {
    doctors: [],
    services: []
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(
      /[&<>"']/g,
      (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      })[char]
    );
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      cache: 'no-store'
    });

    let body = {};

    try {
      body = await response.json();
    } catch (_) {
      body = {};
    }

    if (!response.ok) {
      throw new Error(
        body.error ||
        body.message ||
        `HTTP ${response.status}`
      );
    }

    return body;
  }

  function showMessage(message, success = false) {
    const messageElement =
      $('message');

    if (!messageElement) {
      alert(message);
      return;
    }

    messageElement.textContent =
      message;

    messageElement.style.display =
      'block';

    messageElement.style.color =
      success
        ? '#16734a'
        : '#a13a3a';

    messageElement.style.background =
      success
        ? '#eaf8f1'
        : '#fff1f1';

    messageElement.style.padding =
      '12px 16px';

    messageElement.style.borderRadius =
      '10px';

    messageElement.style.marginTop =
      '12px';
  }

  /*
   * ============================
   * تحميل الأطباء والخدمات
   * ============================
   */

  function populateSelectors() {
    const doctorSelect =
      $('doctor');

    const serviceSelect =
      $('service');

    if (!doctorSelect ||
        !serviceSelect) {
      return;
    }

    const oldDoctor =
      doctorSelect.value;

    const oldService =
      serviceSelect.value;

    const doctors =
      Array.isArray(data.doctors)
        ? data.doctors
        : [];

    const services =
      Array.isArray(data.services)
        ? data.services
        : [];

    doctorSelect.innerHTML =
      `
        <option value="">
          اختر الطبيب
        </option>
      ` +
      doctors
        .map((doctor) => `
          <option value="${escapeHtml(doctor.id)}">
            ${escapeHtml(
              doctor.name ||
              doctor.full_name ||
              'طبيب'
            )}
            ${
              doctor.title
                ? ' — ' +
                  escapeHtml(
                    doctor.title
                  )
                : ''
            }
          </option>
        `)
        .join('');

    serviceSelect.innerHTML =
      `
        <option value="">
          اختر الخدمة
        </option>
      ` +
      services
        .map((service) => `
          <option value="${escapeHtml(service.id)}">
            ${escapeHtml(
              service.name ||
              service.title ||
              'خدمة'
            )}
            ${
              service.duration_minutes
                ? ' — ' +
                  escapeHtml(
                    service.duration_minutes
                  ) +
                  ' دقيقة'
                : ''
            }
          </option>
        `)
        .join('');

    if (
      [...doctorSelect.options]
        .some(
          (option) =>
            option.value ===
            oldDoctor
        )
    ) {
      doctorSelect.value =
        oldDoctor;
    }

    if (
      [...serviceSelect.options]
        .some(
          (option) =>
            option.value ===
            oldService
        )
    ) {
      serviceSelect.value =
        oldService;
    }
  }

  /*
   * ============================
   * التاريخ
   * ============================
   */

  function setupDate() {
    const dateInput =
      $('date');

    if (!dateInput) {
      return;
    }

    const now =
      new Date();

    now.setMinutes(
      now.getMinutes() -
      now.getTimezoneOffset()
    );

    const today =
      now
        .toISOString()
        .slice(0, 10);

    dateInput.min =
      today;

    if (!dateInput.value) {
      dateInput.value =
        today;
    }
  }

  /*
   * ============================
   * تحميل البيانات الأساسية
   * ============================
   */

  async function loadClinicData() {
    try {

      const result =
        await request(
          API +
          '?api=data&_=' +
          Date.now()
        );

      data =
        result || {};

      populateSelectors();

      setupDate();

      await loadAvailableSlots();

    } catch (error) {

      console.error(
        'Azaad Clinic data error:',
        error
      );

      showMessage(
        'تعذر تحميل بيانات العيادة. يرجى تحديث الصفحة والمحاولة مرة أخرى.'
      );
    }
  }

  /*
   * ============================
   * المواعيد المتاحة
   * ============================
   */

  async function loadAvailableSlots() {

    const slotsContainer =
      $('slots');

    const doctor =
      $('doctor')?.value || '';

    const service =
      $('service')?.value || '';

    const date =
      $('date')?.value || '';

    selectedSlot = '';

    if (!slotsContainer) {
      return;
    }

    if (
      !doctor ||
      !service ||
      !date
    ) {

      slotsContainer.innerHTML =
        `
          <div class="slots-empty">
            اختر الطبيب والخدمة والتاريخ
            لعرض المواعيد المتاحة.
          </div>
        `;

      return;
    }

    slotsContainer.innerHTML =
      `
        <div class="slots-loading">
          جاري تحميل المواعيد...
        </div>
      `;

    try {

      const url =
        API +
        '?api=slots' +
        '&doctor=' +
        encodeURIComponent(doctor) +
        '&service=' +
        encodeURIComponent(service) +
        '&date=' +
        encodeURIComponent(date) +
        '&_=' +
        Date.now();

      const result =
        await request(url);

      const slots =
        Array.isArray(result?.slots)
          ? result.slots
          : [];

      if (!slots.length) {

        slotsContainer.innerHTML =
          `
            <div class="slots-empty">
              لا توجد مواعيد متاحة
              لهذا اليوم.
            </div>
          `;

        return;
      }

      slotsContainer.innerHTML =
        slots
          .map(
            (time) => `
              <button
                type="button"
                class="slot"
                data-slot="${escapeHtml(time)}"
              >
                ${escapeHtml(time)}
              </button>
            `
          )
          .join('');

      slotsContainer
        .querySelectorAll(
          '.slot'
        )
        .forEach((button) => {

          button.addEventListener(
            'click',
            () => {

              slotsContainer
                .querySelectorAll(
                  '.slot'
                )
                .forEach(
                  (item) =>
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

              showMessage(
                `تم اختيار الموعد ${selectedSlot}`,
                true
              );
            }
          );

        });

    } catch (error) {

      console.error(
        'Slots error:',
        error
      );

      slotsContainer.innerHTML =
        `
          <div class="slots-error">
            تعذر تحميل المواعيد.
            يرجى المحاولة مرة أخرى.
          </div>
        `;

      showMessage(
        error.message ||
        'تعذر تحميل المواعيد.'
      );
    }
  }

  /*
   * ============================
   * إرسال الحجز
   * ============================
   */

  async function submitBooking(event) {

    event.preventDefault();

    const doctor =
      $('doctor')?.value || '';

    const service =
      $('service')?.value || '';

    const date =
      $('date')?.value || '';

    const name =
      $('name')?.value.trim() || '';

    const phone =
      $('phone')?.value.trim() || '';

    const email =
      $('email')?.value.trim() || '';

    const notes =
      $('notes')?.value.trim() || '';

    const mode =
      $('mode')?.value ||
      'clinic';

    if (!doctor) {

      showMessage(
        'من فضلك اختر الطبيب.'
      );

      return;
    }

    if (!service) {

      showMessage(
        'من فضلك اختر الخدمة.'
      );

      return;
    }

    if (!date) {

      showMessage(
        'من فضلك اختر التاريخ.'
      );

      return;
    }

    if (!selectedSlot) {

      showMessage(
        'من فضلك اختر أحد المواعيد المتاحة.'
      );

      return;
    }

    if (!name) {

      showMessage(
        'من فضلك اكتب الاسم بالكامل.'
      );

      return;
    }

    if (!phone) {

      showMessage(
        'من فضلك اكتب رقم الهاتف.'
      );

      return;
    }

    /*
     * مهم:
     * لا نرسل patient_language
     * لأن هذا العمود غير موجود
     * في clinic_bookings.
     */

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
        mode,

      patient_name:
        name,

      patient_phone:
        phone,

      patient_email:
        email || null,

      notes:
        notes || null
    };

    const submitButton =
      document.querySelector(
        '#bookingForm button[type="submit"]'
      );

    const oldButtonText =
      submitButton
        ? submitButton.textContent
        : '';

    if (submitButton) {

      submitButton.disabled =
        true;

      submitButton.textContent =
        'جاري تأكيد الحجز...';
    }

    try {

      const result =
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

      const bookingCode =
        result?.booking_code ||
        result?.booking?.booking_code ||
        '';

      showMessage(
        bookingCode
          ? `تم إرسال طلب الحجز بنجاح. رقم الحجز: ${bookingCode}`
          : 'تم إرسال طلب الحجز بنجاح.',
        true
      );

      /*
       * تنظيف بيانات النموذج
       */

      const form =
        $('bookingForm');

      if (form) {
        form.reset();
      }

      selectedSlot = '';

      setupDate();

      const slots =
        $('slots');

      if (slots) {

        slots.innerHTML =
          `
            <div class="slots-empty">
              اختر الطبيب والخدمة والتاريخ
              لعرض المواعيد المتاحة.
            </div>
          `;
      }

    } catch (error) {

      console.error(
        'Booking error:',
        error
      );

      let message =
        error.message ||
        'تعذر إرسال طلب الحجز.';

      /*
       * رسالة مفهومة عند
       * حجز الموعد من شخص آخر
       */

      if (
        message
          .toLowerCase()
          .includes(
            'duplicate'
          ) ||
        message
          .toLowerCase()
          .includes(
            'unique'
          ) ||
        message
          .toLowerCase()
          .includes(
            'already booked'
          )
      ) {

        message =
          'هذا الموعد تم حجزه بالفعل. يرجى اختيار موعد آخر.';
      }

      showMessage(
        message
      );

      /*
       * إعادة تحميل المواعيد
       * بعد أي خطأ
       */

      await loadAvailableSlots();

    } finally {

      if (submitButton) {

        submitButton.disabled =
          false;

        submitButton.textContent =
          oldButtonText ||
          'تأكيد طلب الحجز';
      }
    }
  }

  /*
   * ============================
   * تشغيل الصفحة
   * ============================
   */

  function initializeBooking() {

    const form =
      $('bookingForm');

    if (!form) {
      return;
    }

    const doctor =
      $('doctor');

    const service =
      $('service');

    const date =
      $('date');

    if (doctor) {

      doctor.addEventListener(
        'change',
        () => {
          loadAvailableSlots();
        }
      );
    }

    if (service) {

      service.addEventListener(
        'change',
        () => {
          loadAvailableSlots();
        }
      );
    }

    if (date) {

      date.addEventListener(
        'change',
        () => {
          loadAvailableSlots();
        }
      );
    }

    form.addEventListener(
      'submit',
      submitBooking
    );

    setupDate();

    loadClinicData();
  }

  /*
   * ============================
   * بدء التشغيل
   * ============================
   */

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      initializeBooking
    );

  } else {

    initializeBooking();
  }

})();
