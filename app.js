(() => {
  'use strict';

  /*
   * =========================================================
   * AZAAD CLINIC
   * PUBLIC BOOKING SYSTEM
   * app.js
   * =========================================================
   *
   * هذا الملف هو المسؤول عن:
   *
   * 🏥 تحميل بيانات العيادة
   * 👨‍⚕️ تحميل الأطباء
   * 🩺 تحميل الخدمات
   * 📅 تحميل المواعيد المتاحة
   * 👤 استقبال بيانات المريض
   * 📱 التحقق من رقم الهاتف
   * 📋 إنشاء طلب الحجز
   * 🔐 إرسال الحجز إلى Supabase Edge Function
   * 🎫 استلام رقم الحجز
   * 📲 تجهيز رسالة WhatsApp للعيادة
   *
   * مهم:
   * لا يوجد submit handler آخر للحجز.
   * booking-fix.js يجب ألا ينشئ أي حجز.
   *
   * =========================================================
   */

  const API =
    'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinic';

  /*
   * رقم WhatsApp الافتراضي للعيادة.
   *
   * الرقم الموجود حاليًا في إعدادات العيادة:
   * 201140526294
   *
   * إذا أعاد Supabase رقمًا آخر من settings
   * سيتم استخدام الرقم الموجود في قاعدة البيانات.
   */

  const DEFAULT_WHATSAPP_NUMBER =
    '201140526294';

  const $ = (id) =>
    document.getElementById(id);

  let selectedSlot = '';

  let clinicData = {
    doctors: [],
    services: [],
    settings: {}
  };

  let initialized = false;

  /*
   * =========================================================
   * HTML ESCAPE
   * =========================================================
   */

  function escapeHtml(value) {
    return String(value ?? '').replace(
      /[&<>"']/g,
      (char) => {
        const entities = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
        };

        return entities[char];
      }
    );
  }

  /*
   * =========================================================
   * API REQUEST
   * =========================================================
   */

  async function request(
    url,
    options = {}
  ) {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(() => {
        controller.abort();
      }, 20000);

    try {
      const response =
        await fetch(url, {
          ...options,

          cache: 'no-store',

          signal:
            controller.signal,

          headers: {
            Accept:
              'application/json',

            ...(options.headers || {})
          }
        });

      let body = {};

      try {
        body =
          await response.json();
      } catch (_) {
        body = {};
      }

      if (!response.ok) {
        throw new Error(
          body?.error ||
          body?.message ||
          `HTTP ${response.status}`
        );
      }

      return body;

    } catch (error) {

      if (
        error?.name ===
        'AbortError'
      ) {
        throw new Error(
          'انتهت مهلة الاتصال بالخادم. يرجى المحاولة مرة أخرى.'
        );
      }

      if (
        error instanceof TypeError &&
        String(
          error.message || ''
        )
          .toLowerCase()
          .includes(
            'failed to fetch'
          )
      ) {
        throw new Error(
          'تعذر الاتصال بخادم العيادة. يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى.'
        );
      }

      throw error;

    } finally {
      clearTimeout(timeout);
    }
  }

  /*
   * =========================================================
   * MESSAGE UI
   * =========================================================
   */

  function showMessage(
    message,
    success = false
  ) {
    const element =
      $('message');

    if (!element) {
      window.alert(message);
      return;
    }

    element.textContent =
      String(message || '');

    element.style.display =
      'block';

    element.style.color =
      success
        ? '#16734a'
        : '#a13a3a';

    element.style.background =
      success
        ? '#eaf8f1'
        : '#fff1f1';

    element.style.border =
      success
        ? '1px solid #ccebd8'
        : '1px solid #f1cccc';

    element.style.padding =
      '12px 16px';

    element.style.borderRadius =
      '10px';

    element.style.marginTop =
      '12px';

    element.style.lineHeight =
      '1.8';

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }

  function hideMessage() {
    const element =
      $('message');

    if (!element) {
      return;
    }

    element.textContent =
      '';

    element.style.display =
      'none';
  }

  /*
   * =========================================================
   * DOCTOR HELPERS
   * =========================================================
   */

  function getDoctor(id) {
    return (
      clinicData.doctors || []
    ).find(
      (item) =>
        String(item.id) ===
        String(id)
    );
  }

  function getDoctorName(id) {
    const doctor =
      getDoctor(id);

    if (!doctor) {
      return 'غير محدد';
    }

    return (
      doctor.name ||
      doctor.full_name ||
      doctor.display_name ||
      'غير محدد'
    );
  }

  function getDoctorTitle(id) {
    const doctor =
      getDoctor(id);

    if (!doctor) {
      return '';
    }

    return (
      doctor.title ||
      doctor.specialty ||
      ''
    );
  }

  /*
   * =========================================================
   * SERVICE HELPERS
   * =========================================================
   */

  function getService(id) {
    return (
      clinicData.services || []
    ).find(
      (item) =>
        String(item.id) ===
        String(id)
    );
  }

  function getServiceName(id) {
    const service =
      getService(id);

    if (!service) {
      return 'غير محدد';
    }

    return (
      service.name ||
      service.title ||
      'غير محدد'
    );
  }

  /*
   * =========================================================
   * MODE
   * =========================================================
   */

  function getModeText(mode) {
    const value =
      String(mode || '')
        .trim()
        .toLowerCase();

    if (
      value === 'online' ||
      value === 'online_session' ||
      value === 'online-session'
    ) {
      return 'جلسة أونلاين';
    }

    return 'داخل العيادة';
  }

  /*
   * =========================================================
   * DATE / TIME
   * =========================================================
   */

  function formatDate(date) {
    if (!date) {
      return 'غير محدد';
    }

    try {
      const parsed =
        new Date(
          `${date}T00:00:00`
        );

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        return String(date);
      }

      return parsed.toLocaleDateString(
        'ar-EG',
        {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }
      );

    } catch (_) {
      return String(date);
    }
  }

  function normalizeTime(time) {
    return String(time || '')
      .trim()
      .slice(0, 5);
  }

  function getTodayLocalDate() {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        now.getDate()
      ).padStart(2, '0');

    return (
      `${year}-${month}-${day}`
    );
  }

  /*
   * =========================================================
   * WHATSAPP
   * =========================================================
   */

  function normalizeWhatsAppNumber(
    number
  ) {
    return String(number || '')
      .replace(/\D/g, '');
  }

  function getClinicWhatsApp() {
    const configured =
      clinicData?.settings?.whatsapp;

    const normalized =
      normalizeWhatsAppNumber(
        configured
      );

    if (normalized) {
      return normalized;
    }

    return (
      DEFAULT_WHATSAPP_NUMBER
    );
  }

  /*
   * =========================================================
   * WHATSAPP MESSAGE
   * =========================================================
   */

  function createWhatsAppMessage(
    booking
  ) {
    const doctorName =
      getDoctorName(
        booking.doctor_id
      );

    const doctorTitle =
      getDoctorTitle(
        booking.doctor_id
      );

    const doctorDisplay =
      doctorTitle
        ? `${doctorName} - ${doctorTitle}`
        : doctorName;

    const serviceName =
      getServiceName(
        booking.service_id
      );

    const mode =
      getModeText(
        booking.mode
      );

    const date =
      formatDate(
        booking.appointment_date
      );

    const time =
      normalizeTime(
        booking.appointment_time
      );

    const bookingCode =
      booking.booking_code ||
      'غير متوفر';

    const patientName =
      booking.patient_name ||
      'غير محدد';

    const patientPhone =
      booking.patient_phone ||
      'غير محدد';

    const patientEmail =
      String(
        booking.patient_email ||
        ''
      ).trim();

    const notes =
      String(
        booking.notes || ''
      ).trim();

    let message =
`🏥 Azaad Clinic - طلب حجز جديد

📌 رقم الحجز: ${bookingCode}

👤 اسم المريض: ${patientName}

📱 رقم الهاتف: ${patientPhone}

👨‍⚕️ الطبيب: ${doctorDisplay}

🩺 الخدمة: ${serviceName}

📅 التاريخ: ${date}

⏰ الوقت: ${time || 'غير محدد'}

💻 نوع الجلسة: ${mode}`;

    if (patientEmail) {
      message +=
`\n📧 البريد الإلكتروني: ${patientEmail}`;
    }

    if (notes) {
      message +=
`\n\n📝 ملاحظات المريض:
${notes}`;
    }

    message +=
`

⚠️ يرجى مراجعة توفر الطبيب وتأكيد الموعد مع المريض.

تم إرسال الطلب من موقع Azaad Clinic.`;

    return message;
  }

  /*
   * =========================================================
   * WHATSAPP CONFIRMATION
   * =========================================================
   */

  function showWhatsAppStep(
    booking
  ) {
    let container =
      $('whatsappBookingStep');

    if (!container) {

      container =
        document.createElement(
          'div'
        );

      container.id =
        'whatsappBookingStep';

      container.style.marginTop =
        '20px';

      container.style.padding =
        '20px';

      container.style.borderRadius =
        '14px';

      container.style.background =
        '#f1fbf5';

      container.style.border =
        '1px solid #ccebd8';

      const form =
        $('bookingForm');

      if (form?.parentNode) {
        form.parentNode.insertBefore(
          container,
          form.nextSibling
        );
      }
    }

    const phone =
      getClinicWhatsApp();

    const message =
      createWhatsAppMessage(
        booking
      );

    const whatsappURL =
      `https://wa.me/${phone}?text=${encodeURIComponent(
        message
      )}`;

    container.innerHTML = `
      <div style="text-align:center">

        <div style="
          font-size:18px;
          font-weight:700;
          margin-bottom:8px;
          color:#16734a;
        ">
          تم إنشاء الحجز بنجاح
        </div>

        <p style="
          line-height:1.8;
          margin:0 0 14px;
        ">
          رقم الحجز:
          <strong>
            ${escapeHtml(
              booking.booking_code || ''
            )}
          </strong>

          <br>

          لإكمال إجراءات الحجز،
          اضغط الزر التالي لإرسال
          تفاصيل الموعد إلى WhatsApp العيادة.
        </p>

        <a
          id="sendBookingWhatsApp"
          href="${escapeHtml(
            whatsappURL
          )}"
          target="_blank"
          rel="noopener noreferrer"
          style="
            display:inline-block;
            background:#25D366;
            color:#fff;
            text-decoration:none;
            padding:14px 22px;
            border-radius:10px;
            font-weight:700;
            font-size:16px;
          "
        >
          📲 إرسال الموعد إلى WhatsApp العيادة
        </a>

        <p style="
          font-size:13px;
          color:#666;
          margin-top:12px;
          line-height:1.7;
        ">
          بعد فتح WhatsApp ستظهر الرسالة جاهزة.
          اضغط «إرسال» داخل WhatsApp لإرسال الحجز إلى السكرتيرة.
        </p>

      </div>
    `;

    container.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  /*
   * =========================================================
   * REMOVE OLD WHATSAPP BOX
   * =========================================================
   */

  function removeOldWhatsAppStep() {
    const old =
      $('whatsappBookingStep');

    if (old) {
      old.remove();
    }
  }

  /*
   * =========================================================
   * POPULATE DOCTORS / SERVICES
   * =========================================================
   */

  function populateSelectors() {
    const doctorSelect =
      $('doctor');

    const serviceSelect =
      $('service');

    if (
      !doctorSelect ||
      !serviceSelect
    ) {
      return;
    }

    const oldDoctor =
      doctorSelect.value;

    const oldService =
      serviceSelect.value;

    const doctors =
      Array.isArray(
        clinicData.doctors
      )
        ? clinicData.doctors
        : [];

    const services =
      Array.isArray(
        clinicData.services
      )
        ? clinicData.services
        : [];

    doctorSelect.innerHTML = `
      <option value="">
        اختر الطبيب
      </option>
    `;

    doctors.forEach(
      (doctor) => {

        const option =
          document.createElement(
            'option'
          );

        option.value =
          String(
            doctor.id ?? ''
          );

        const name =
          doctor.name ||
          doctor.full_name ||
          doctor.display_name ||
          'طبيب';

        const title =
          doctor.title ||
          doctor.specialty ||
          '';

        option.textContent =
          title
            ? `${name} — ${title}`
            : name;

        doctorSelect.appendChild(
          option
        );
      }
    );

    serviceSelect.innerHTML = `
      <option value="">
        اختر الخدمة
      </option>
    `;

    services.forEach(
      (service) => {

        const option =
          document.createElement(
            'option'
          );

        option.value =
          String(
            service.id ?? ''
          );

        const name =
          service.name ||
          service.title ||
          'خدمة';

        const duration =
          service.duration_minutes;

        option.textContent =
          duration
            ? `${name} — ${duration} دقيقة`
            : name;

        serviceSelect.appendChild(
          option
        );
      }
    );

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
   * =========================================================
   * DATE SETUP
   * =========================================================
   */

  function setupDate() {
    const dateInput =
      $('date');

    if (!dateInput) {
      return;
    }

    const today =
      getTodayLocalDate();

    dateInput.min =
      today;

    if (
      !dateInput.value ||
      dateInput.value < today
    ) {
      dateInput.value =
        today;
    }
  }

  /*
   * =========================================================
   * LOAD CLINIC DATA
   * =========================================================
   */

  async function loadClinicData() {
    try {

      const result =
        await request(
          `${API}?api=data&_=${Date.now()}`
        );

      clinicData = {

        doctors:
          Array.isArray(
            result?.doctors
          )
            ? result.doctors
            : [],

        services:
          Array.isArray(
            result?.services
          )
            ? result.services
            : [],

        settings:
          result?.settings &&
          typeof result.settings ===
            'object'
            ? result.settings
            : {}
      };

      populateSelectors();

      setupDate();

      await loadAvailableSlots();

    } catch (error) {

      console.error(
        'Azaad Clinic data error:',
        error
      );

      showMessage(
        error?.message ||
        'تعذر تحميل بيانات العيادة. يرجى تحديث الصفحة والمحاولة مرة أخرى.'
      );
    }
  }

  /*
   * =========================================================
   * LOAD AVAILABLE SLOTS
   * =========================================================
   */

  async function loadAvailableSlots() {

    const slotsContainer =
      $('slots');

    const doctor =
      $('doctor')?.value ||
      '';

    const service =
      $('service')?.value ||
      '';

    const date =
      $('date')?.value ||
      '';

    selectedSlot =
      '';

    if (!slotsContainer) {
      return;
    }

    if (
      !doctor ||
      !service ||
      !date
    ) {

      slotsContainer.innerHTML = `
        <div class="slots-empty">
          اختر الطبيب والخدمة والتاريخ لعرض المواعيد المتاحة.
        </div>
      `;

      return;
    }

    slotsContainer.innerHTML = `
      <div class="slots-loading">
        جاري تحميل المواعيد...
      </div>
    `;

    try {

      const params =
        new URLSearchParams({
          api: 'slots',
          doctor,
          service,
          date,
          _: String(
            Date.now()
          )
        });

      const result =
        await request(
          `${API}?${params.toString()}`
        );

      const slots =
        Array.isArray(
          result?.slots
        )
          ? result.slots
          : [];

      if (!slots.length) {

        slotsContainer.innerHTML = `
          <div class="slots-empty">
            لا توجد مواعيد متاحة لهذا اليوم.
          </div>
        `;

        return;
      }

      slotsContainer.innerHTML =
        '';

      slots.forEach(
        (time) => {

          const button =
            document.createElement(
              'button'
            );

          button.type =
            'button';

          button.className =
            'slot';

          const normalized =
            normalizeTime(time);

          button.dataset.slot =
            normalized;

          button.textContent =
            normalized;

          button.addEventListener(
            'click',
            () => {

              slotsContainer
                .querySelectorAll(
                  '.slot'
                )
                .forEach(
                  (item) => {
                    item.classList.remove(
                      'selected'
                    );
                  }
                );

              button.classList.add(
                'selected'
              );

              selectedSlot =
                button.dataset.slot ||
                '';

              hideMessage();
            }
          );

          slotsContainer.appendChild(
            button
          );
        }
      );

    } catch (error) {

      console.error(
        'Slots error:',
        error
      );

      slotsContainer.innerHTML = `
        <div class="slots-error">
          تعذر تحميل المواعيد.
          يرجى المحاولة مرة أخرى.
        </div>
      `;

      showMessage(
        error?.message ||
        'تعذر تحميل المواعيد.'
      );
    }
  }

  /*
   * =========================================================
   * PHONE VALIDATION
   * =========================================================
   */

  function validatePhone(phone) {

    const digits =
      String(phone || '')
        .replace(/\D/g, '');

    return (
      digits.length >= 8
    );
  }

  /*
   * =========================================================
   * SUBMIT BOOKING
   * =========================================================
   */

  async function submitBooking(
    event
  ) {

    event.preventDefault();

    hideMessage();

    removeOldWhatsAppStep();

    const doctor =
      $('doctor')?.value ||
      '';

    const service =
      $('service')?.value ||
      '';

    const date =
      $('date')?.value ||
      '';

    const name =
      $('name')?.value.trim() ||
      '';

    const phone =
      $('phone')?.value.trim() ||
      '';

    const email =
      $('email')?.value.trim() ||
      '';

    const notes =
      $('notes')?.value.trim() ||
      '';

    const mode =
      $('mode')?.value ||
      'clinic';

    /*
     * -------------------------------------------------------
     * VALIDATION
     * -------------------------------------------------------
     */

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

    if (
      date <
      getTodayLocalDate()
    ) {

      showMessage(
        'لا يمكن اختيار تاريخ سابق.'
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

    if (
      !validatePhone(phone)
    ) {

      showMessage(
        'من فضلك أدخل رقم هاتف صحيح.'
      );

      return;
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {

      showMessage(
        'من فضلك أدخل بريدًا إلكترونيًا صحيحًا.'
      );

      return;
    }

    /*
     * -------------------------------------------------------
     * BOOKING PAYLOAD
     * -------------------------------------------------------
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

    /*
     * -------------------------------------------------------
     * SUBMIT BUTTON
     * -------------------------------------------------------
     */

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

      submitButton.setAttribute(
        'aria-busy',
        'true'
      );

      submitButton.textContent =
        'جاري تأكيد الحجز...';
    }

    /*
     * -------------------------------------------------------
     * SEND BOOKING
     * -------------------------------------------------------
     */

    try {

      const result =
        await request(
          `${API}?api=book`,
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

      const booking =
        result?.booking &&
        typeof result.booking ===
          'object'
          ? result.booking
          : {};

      const bookingCode =
        result?.booking_code ||
        booking?.booking_code ||
        '';

      /*
       * لا نعتبر الحجز ناجحًا
       * بدون رقم حجز من الخادم.
       */

      if (!bookingCode) {

        throw new Error(
          'تم إرسال الطلب ولكن لم يتم استلام رقم الحجز. يرجى التواصل مع العيادة للتأكد من حالة الطلب.'
        );
      }

      /*
       * -----------------------------------------------------
       * COMPLETE BOOKING OBJECT
       * -----------------------------------------------------
       */

      const bookingData = {

        ...payload,

        ...booking,

        booking_code:
          bookingCode
      };

      /*
       * -----------------------------------------------------
       * SUCCESS
       * -----------------------------------------------------
       */

      showMessage(
        `تم إنشاء طلب الحجز بنجاح. رقم الحجز: ${bookingCode}`,
        true
      );

      /*
       * -----------------------------------------------------
       * WHATSAPP
       * -----------------------------------------------------
       */

      showWhatsAppStep(
        bookingData
      );

      /*
       * -----------------------------------------------------
       * RESET FORM
       * -----------------------------------------------------
       */

      const form =
        $('bookingForm');

      if (form) {
        form.reset();
      }

      selectedSlot =
        '';

      setupDate();

      const slots =
        $('slots');

      if (slots) {

        slots.innerHTML = `
          <div class="slots-empty">
            تم تسجيل الحجز.
            يمكنك إرسال تفاصيل الموعد إلى WhatsApp العيادة من الزر أعلاه.
          </div>
        `;
      }

    } catch (error) {

      console.error(
        'Booking error:',
        error
      );

      let message =
        error?.message ||
        'تعذر إرسال طلب الحجز.';

      const lower =
        String(message)
          .toLowerCase();

      /*
       * -----------------------------------------------------
       * DUPLICATE BOOKING
       * -----------------------------------------------------
       */

      if (
        lower.includes(
          'duplicate'
        ) ||
        lower.includes(
          'unique'
        ) ||
        lower.includes(
          'already booked'
        ) ||
        lower.includes(
          'already_booked'
        ) ||
        lower.includes(
          '23505'
        ) ||
        lower.includes(
          'slot_unavailable'
        ) ||
        lower.includes(
          'slot unavailable'
        )
      ) {

        message =
          'هذا الموعد تم حجزه بالفعل. يرجى اختيار موعد آخر.';
      }

      /*
       * -----------------------------------------------------
       * UNAVAILABLE
       * -----------------------------------------------------
       */

      if (
        lower.includes(
          'not available'
        ) ||
        lower.includes(
          'not_available'
        )
      ) {

        message =
          'هذا الموعد غير متاح حاليًا. يرجى اختيار موعد آخر.';
      }

      showMessage(
        message
      );

      /*
       * تحديث المواعيد بعد فشل الحجز
       */

      try {

        await loadAvailableSlots();

      } catch (
        slotError
      ) {

        console.error(
          'Slot refresh error:',
          slotError
        );
      }

    } finally {

      if (submitButton) {

        submitButton.disabled =
          false;

        submitButton.removeAttribute(
          'aria-busy'
        );

        submitButton.textContent =
          oldButtonText ||
          'تأكيد طلب الحجز';
      }
    }
  }

  /*
   * =========================================================
   * EVENT BINDING
   * =========================================================
   */

  function bindChangeEvent(
    element
  ) {

    if (!element) {
      return;
    }

    element.addEventListener(
      'change',
      () => {

        removeOldWhatsAppStep();

        hideMessage();

        loadAvailableSlots();
      }
    );
  }

  /*
   * =========================================================
   * INITIALIZATION
   * =========================================================
   */

  function initializeBooking() {

    if (initialized) {
      return;
    }

    initialized =
      true;

    const form =
      $('bookingForm');

    /*
     * الصفحات التي لا تحتوي على
     * bookingForm لا تحتاج نظام الحجز.
     */

    if (!form) {
      return;
    }

    const doctor =
      $('doctor');

    const service =
      $('service');

    const date =
      $('date');

    bindChangeEvent(
      doctor
    );

    bindChangeEvent(
      service
    );

    bindChangeEvent(
      date
    );

    form.addEventListener(
      'submit',
      submitBooking
    );

    setupDate();

    loadClinicData();
  }

  /*
   * =========================================================
   * START APPLICATION
   * =========================================================
   */

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      initializeBooking,
      {
        once: true
      }
    );

  } else {

    initializeBooking();
  }

})();
