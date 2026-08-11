(() => {
  'use strict';
  const API =
    'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinic';
  const $ = (id) =>
    document.getElementById(id);
  let selectedSlot = '';
  let clinicData = {
    doctors: [],
    services: [],
    settings: {}
  };
  let pendingBooking = null;
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
    const element = $('message');
    if (!element) {
      alert(message);
      return;
    }
    element.textContent = message;
    element.style.display = 'block';
    element.style.color =
      success ? '#16734a' : '#a13a3a';
    element.style.background =
      success ? '#eaf8f1' : '#fff1f1';
    element.style.padding = '12px 16px';
    element.style.borderRadius = '10px';
    element.style.marginTop = '12px';
    element.style.lineHeight = '1.8';
  }
  function clearMessage() {
    const element = $('message');
    if (!element) return;
    element.textContent = '';
    element.style.display = 'none';
  }
  function getDoctorName(id) {
    const doctor =
      (clinicData.doctors || []).find(
        item =>
          String(item.id) === String(id)
      );
    return doctor
      ? (
          doctor.name ||
          doctor.full_name ||
          'الطبيب'
        )
      : 'الطبيب';
  }
  function getServiceName(id) {
    const service =
      (clinicData.services || []).find(
        item =>
          String(item.id) === String(id)
      );
    return service
      ? (
          service.name ||
          service.title ||
          'الخدمة'
        )
      : 'الخدمة';
  }
  function getModeName(mode) {
    const value =
      String(mode || '')
        .toLowerCase()
        .trim();
    if (
      value === 'online' ||
      value === 'online_session'
    ) {
      return 'جلسة أونلاين';
    }
    return 'داخل العيادة';
  }
  function formatDate(date) {
    if (!date) return '—';
    try {
      return new Date(
        `${date}T00:00:00`
      ).toLocaleDateString(
        'ar-EG',
        {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }
      );
    } catch (_) {
      return date;
    }
  }
  function formatTime(time) {
    if (!time) return '—';
    const value =
      String(time).slice(0, 5);
    const parts =
      value.split(':');
    if (parts.length < 2) {
      return value;
    }
    const hour =
      Number(parts[0]);
    const minute =
      parts[1];
    if (
      Number.isNaN(hour)
    ) {
      return value;
    }
    const suffix =
      hour >= 12
        ? 'م'
        : 'ص';
    const displayHour =
      hour % 12 || 12;
    return `${displayHour}:${minute} ${suffix}`;
  }
  function normalizeWhatsAppNumber(value) {
    return String(value || '')
      .replace(/\D/g, '');
  }
  function getClinicWhatsApp() {
    return normalizeWhatsAppNumber(
      clinicData?.settings?.whatsapp
    );
  }
  function buildWhatsAppMessage(booking) {
    const doctorName =
      getDoctorName(
        booking.doctor_id
      );
    const serviceName =
      getServiceName(
        booking.service_id
      );
    const modeName =
      getModeName(
        booking.mode
      );
    const code =
      booking.booking_code ||
      'غير متوفر';
    const patientName =
      booking.patient_name ||
      'غير متوفر';
    const patientPhone =
      booking.patient_phone ||
      'غير متوفر';
    const date =
      formatDate(
        booking.appointment_date
      );
    const time =
      formatTime(
        booking.appointment_time
      );
    const notes =
      booking.notes
        ? booking.notes
        : 'لا توجد';
    return [
      '🔔 *طلب حجز جديد - Azaad Clinic*',
      '',
      `🎫 *رقم الحجز:* ${code}`,
      '',
      `👤 *اسم المريض:* ${patientName}`,
      `📱 *رقم الهاتف:* ${patientPhone}`,
      '',
      `👨‍⚕️ *الطبيب المطلوب:* ${doctorName}`,
      `🧠 *الخدمة:* ${serviceName}`,
      `📅 *التاريخ:* ${date}`,
      `🕐 *الوقت:* ${time}`,
      `🏥 *نوع الجلسة:* ${modeName}`,
      '',
      `📝 *ملاحظات المريض:* ${notes}`,
      '',
      '⚠️ *حالة الحجز: قيد المراجعة*',
      '',
      'يرجى مراجعة توفر الطبيب والتواصل مع المريض لتأكيد الموعد.',
      '',
      `📞 *رقم المريض:* ${patientPhone}`
    ].join('\n');
  }
  function buildPatientWhatsAppMessage(booking) {
    const doctorName =
      getDoctorName(
        booking.doctor_id
      );
    const serviceName =
      getServiceName(
        booking.service_id
      );
    const modeName =
      getModeName(
        booking.mode
      );
    const code =
      booking.booking_code ||
      'غير متوفر';
    const date =
      formatDate(
        booking.appointment_date
      );
    const time =
      formatTime(
        booking.appointment_time
      );
    return [
      'مرحبًا Azaad Clinic 👋',
      '',
      'أرسلت لكم طلب حجز جديد من خلال الموقع.',
      '',
      `🎫 رقم الحجز: ${code}`,
      `👤 الاسم: ${booking.patient_name || ''}`,
      `📱 الهاتف: ${booking.patient_phone || ''}`,
      `👨‍⚕️ الطبيب: ${doctorName}`,
      `🧠 الخدمة: ${serviceName}`,
      `📅 التاريخ: ${date}`,
      `🕐 الوقت: ${time}`,
      `🏥 نوع الجلسة: ${modeName}`,
      '',
      'أرجو مراجعة توفر الطبيب وتأكيد الموعد معي.',
      '',
      booking.notes
        ? `ملاحظات: ${booking.notes}`
        : ''
    ]
      .filter(Boolean)
      .join('\n');
  }
  function createWhatsAppUrl(
    number,
    message
  ) {
    return (
      'https://wa.me/' +
      number +
      '?text=' +
      encodeURIComponent(message)
    );
  }
  function createWhatsAppStep() {
    let container =
      $('whatsappBookingStep');
    if (container) {
      return container;
    }
    container =
      document.createElement('div');
    container.id =
      'whatsappBookingStep';
    container.style.display =
      'none';
    container.style.marginTop =
      '20px';
    container.style.padding =
      '20px';
    container.style.borderRadius =
      '16px';
    container.style.background =
      '#f4fbf7';
    container.style.border =
      '1px solid #ccebdd';
    container.innerHTML = `
      <div
        style="
          text-align:center;
          line-height:1.8;
        "
      >
        <div
          style="
            font-size:32px;
            margin-bottom:8px;
          "
        >
          ✅
        </div>
        <h3
          style="
            margin:0 0 8px;
          "
        >
          تم تسجيل طلب الحجز
        </h3>
        <p
          style="
            margin:0 0 12px;
          "
        >
          رقم الحجز:
        </p>
        <strong
          id="whatsappBookingCode"
          style="
            display:block;
            font-size:22px;
            margin-bottom:15px;
          "
        >
          —
        </strong>
        <p
          style="
            margin:0 0 18px;
          "
        >
          لإكمال إجراءات الحجز،
          يرجى إرسال تفاصيل الطلب
          إلى WhatsApp العيادة.
        </p>
        <button
          id="sendBookingWhatsApp"
          type="button"
          class="btn"
          style="
            width:100%;
            cursor:pointer;
            background:#16734a;
          "
        >
          📱 إرسال الحجز إلى WhatsApp العيادة
        </button>
        <p
          id="whatsappStepMessage"
          style="
            display:none;
            margin:15px 0 0;
            font-size:14px;
          "
        >
        </p>
      </div>
    `;
    const form =
      $('bookingForm');
    if (form?.parentNode) {
      form.parentNode.appendChild(
        container
      );
    } else {
      document.body.appendChild(
        container
      );
    }
    const button =
      $('sendBookingWhatsApp');
    if (button) {
      button.addEventListener(
        'click',
        handleWhatsAppSend
      );
    }
    return container;
  }
  function showWhatsAppStep(
    booking
  ) {
    const container =
      createWhatsAppStep();
    const code =
      $('whatsappBookingCode');
    const message =
      $('whatsappStepMessage');
    if (code) {
      code.textContent =
        booking.booking_code ||
        '—';
    }
    if (message) {
      message.style.display =
        'none';
      message.textContent = '';
    }
    container.style.display =
      'block';
    container.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }
  function hideWhatsAppStep() {
    const container =
      $('whatsappBookingStep');
    if (container) {
      container.style.display =
        'none';
    }
  }
  function handleWhatsAppSend() {
    if (!pendingBooking) {
      showMessage(
        'لا توجد بيانات حجز لإرسالها.'
      );
      return;
    }
    const number =
      getClinicWhatsApp();
    if (!number) {
      showMessage(
        'لم يتم إعداد رقم WhatsApp العيادة بعد. يرجى إبلاغ الإدارة بإضافة رقم WhatsApp في إعدادات العيادة.'
      );
      return;
    }
    const message =
      buildWhatsAppMessage(
        pendingBooking
      );
    const url =
      createWhatsAppUrl(
        number,
        message
      );
    const stepMessage =
      $('whatsappStepMessage');
    if (stepMessage) {
      stepMessage.style.display =
        'block';
      stepMessage.style.color =
        '#16734a';
      stepMessage.textContent =
        'سيتم فتح WhatsApp برسالة الحجز جاهزة للإرسال. اضغط إرسال داخل WhatsApp لإرسال الطلب إلى العيادة.';
    }
    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );
  }
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
    doctorSelect.innerHTML =
      `
        <option value="">
          اختر الطبيب
        </option>
      ` +
      doctors
        .map(
          doctor => `
            <option
              value="${escapeHtml(
                doctor.id
              )}"
            >
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
          `
        )
        .join('');
    serviceSelect.innerHTML =
      `
        <option value="">
          اختر الخدمة
        </option>
      ` +
      services
        .map(
          service => `
            <option
              value="${escapeHtml(
                service.id
              )}"
            >
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
          `
        )
        .join('');
    if (
      [...doctorSelect.options]
        .some(
          option =>
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
          option =>
            option.value ===
            oldService
        )
    ) {
      serviceSelect.value =
        oldService;
    }
  }
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
  async function loadClinicData() {
    try {
      const result =
        await request(
          API +
          '?api=data&_=' +
          Date.now()
        );
      clinicData =
        result || {
          doctors: [],
          services: [],
          settings: {}
        };
      clinicData.doctors =
        Array.isArray(
          clinicData.doctors
        )
          ? clinicData.doctors
          : [];
      clinicData.services =
        Array.isArray(
          clinicData.services
        )
          ? clinicData.services
          : [];
      clinicData.settings =
        clinicData.settings ||
        {};
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
    selectedSlot = '';
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
          اختر الطبيب والخدمة والتاريخ
          لعرض المواعيد المتاحة.
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
        '&_=' +
        Date.now();
      const result =
        await request(url);
      const slots =
        Array.isArray(
          result?.slots
        )
          ? result.slots
          : [];
      if (!slots.length) {
        slotsContainer.innerHTML = `
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
            time => `
              <button
                type="button"
                class="slot"
                data-slot="${escapeHtml(
                  time
                )}"
              >
                ${escapeHtml(time)}
              </button>
            `
          )
          .join('');
      slotsContainer
        .querySelectorAll('.slot')
        .forEach(button => {
          button.addEventListener(
            'click',
            () => {
              slotsContainer
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
                button.dataset.slot ||
                '';
              clearMessage();
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
      slotsContainer.innerHTML = `
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
  async function submitBooking(event) {
    event.preventDefault();
    clearMessage();
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
     * الاسم ورقم الهاتف فقط إجباريان
     * من بيانات المريض.
     *
     * البريد الإلكتروني اختياري.
     * الملاحظات اختيارية.
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
        'جاري تسجيل طلب الحجز...';
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
      const booking =
        result?.booking ||
        result?.data ||
        {};
      const bookingCode =
        result?.booking_code ||
        booking?.booking_code ||
        '';
      /*
       * إذا لم يرجع السيرفر
       * رقم الحجز، لا نفتح WhatsApp.
       */
      if (!bookingCode) {
        throw new Error(
          'تم إنشاء الحجز ولكن لم يتم استلام رقم الحجز. يرجى التواصل مع العيادة قبل إعادة المحاولة.'
        );
      }
      pendingBooking = {
        ...payload,
        ...booking,
        booking_code:
          bookingCode
      };
      /*
       * نخفي النموذج بعد نجاح التسجيل.
       * المريض ينتقل إلى خطوة WhatsApp.
       */
      const form =
        $('bookingForm');
      if (form) {
        form.style.display =
          'none';
      }
      showMessage(
        `تم تسجيل طلب الحجز بنجاح. رقم الحجز: ${bookingCode}`,
        true
      );
      showWhatsAppStep(
        pendingBooking
      );
      /*
       * نعيد تحميل المواعيد في الخلفية
       * حتى لا يبقى الموعد ظاهرًا
       * إذا أصبح محجوزًا.
       */
      selectedSlot = '';
    } catch (error) {
      console.error(
        'Booking error:',
        error
      );
      let message =
        error.message ||
        'تعذر إرسال طلب الحجز.';
      const lower =
        message.toLowerCase();
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
          'booked'
        )
      ) {
        message =
          'هذا الموعد تم حجزه بالفعل. يرجى اختيار موعد آخر.';
      }
      showMessage(
        message
      );
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
  function initializeBooking() {
    const form =
      $('bookingForm');
    if (!form) {
      console.warn(
        'Azaad Clinic: bookingForm not found.'
      );
      return;
    }
    createWhatsAppStep();
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
          hideWhatsAppStep();
          loadAvailableSlots();
        }
      );
    }
    if (service) {
      service.addEventListener(
        'change',
        () => {
          hideWhatsAppStep();
          loadAvailableSlots();
        }
      );
    }
    if (date) {
      date.addEventListener(
        'change',
        () => {
          hideWhatsAppStep();
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
