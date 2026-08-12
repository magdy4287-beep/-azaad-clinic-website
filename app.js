(() => {
  'use strict';

  const API =
    'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinic';

  const WHATSAPP_NUMBER = '201000000000';

  const $ = (id) => document.getElementById(id);

  let selectedSlot = '';

  let clinicData = {
    doctors: [],
    services: [],
    settings: {}
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
    const element = $('message');

    if (!element) {
      alert(message);
      return;
    }

    element.textContent = message;
    element.style.display = 'block';
    element.style.color = success ? '#16734a' : '#a13a3a';
    element.style.background = success ? '#eaf8f1' : '#fff1f1';
    element.style.padding = '12px 16px';
    element.style.borderRadius = '10px';
    element.style.marginTop = '12px';
  }

  function hideMessage() {
    const element = $('message');

    if (!element) {
      return;
    }

    element.textContent = '';
    element.style.display = 'none';
  }

  function getDoctorName(id) {
    const doctor = (clinicData.doctors || []).find(
      (item) => String(item.id) === String(id)
    );

    if (!doctor) {
      return id || 'غير محدد';
    }

    return (
      doctor.name ||
      doctor.full_name ||
      'غير محدد'
    );
  }

  function getDoctorTitle(id) {
    const doctor = (clinicData.doctors || []).find(
      (item) => String(item.id) === String(id)
    );

    return doctor?.title || '';
  }

  function getServiceName(id) {
    const service = (clinicData.services || []).find(
      (item) => String(item.id) === String(id)
    );

    return (
      service?.name ||
      service?.title ||
      'غير محدد'
    );
  }

  function getModeText(mode) {
    const value = String(mode || '').toLowerCase();

    if (
      value === 'online' ||
      value === 'online_session'
    ) {
      return 'جلسة أونلاين';
    }

    return 'داخل العيادة';
  }

  function formatDate(date) {
    if (!date) {
      return 'غير محدد';
    }

    try {
      return new Date(`${date}T00:00:00`).toLocaleDateString(
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

  function normalizeWhatsAppNumber(number) {
    return String(number || '')
      .replace(/\D/g, '');
  }

  function getClinicWhatsApp() {
    const configured =
      clinicData?.settings?.whatsapp;

    const normalized =
      normalizeWhatsAppNumber(configured);

    if (normalized) {
      return normalized;
    }

    return WHATSAPP_NUMBER;
  }

  function createWhatsAppMessage(booking) {
    const doctorName =
      getDoctorName(booking.doctor_id);

    const doctorTitle =
      getDoctorTitle(booking.doctor_id);

    const serviceName =
      getServiceName(booking.service_id);

    const mode =
      getModeText(booking.mode);

    const date =
      formatDate(booking.appointment_date);

    const time =
      String(booking.appointment_time || '')
        .slice(0, 5);

    const bookingCode =
      booking.booking_code || 'غير متوفر';

    const notes =
      String(booking.notes || '').trim();

    const doctorDisplay =
      doctorTitle
        ? `${doctorName} - ${doctorTitle}`
        : doctorName;

    let message = `
🏥 Azaad Clinic - طلب حجز جديد

📌 رقم الحجز: ${bookingCode}

👤 اسم المريض: ${booking.patient_name || 'غير محدد'}

📱 رقم الهاتف: ${booking.patient_phone || 'غير محدد'}

👨‍⚕️ الطبيب: ${doctorDisplay}

🩺 الخدمة: ${serviceName}

📅 التاريخ: ${date}

⏰ الوقت: ${time || 'غير محدد'}

💻 نوع الجلسة: ${mode}
`.trim();

    if (booking.patient_email) {
      message +=
        `\n📧 البريد الإلكتروني: ${booking.patient_email}`;
    }

    if (notes) {
      message +=
        `\n\n📝 ملاحظات المريض:\n${notes}`;
    }

    message +=
      `\n\n⚠️ يرجى مراجعة توفر الطبيب وتأكيد الموعد مع المريض.\n\nتم إرسال الطلب من موقع Azaad Clinic.`;

    return message;
  }

  function showWhatsAppStep(booking) {
    let container =
      $('whatsappBookingStep');

    if (!container) {
      container =
        document.createElement('div');

      container.id =
        'whatsappBookingStep';

      container.style.marginTop = '20px';
      container.style.padding = '20px';
      container.style.borderRadius = '14px';
      container.style.background = '#f1fbf5';
      container.style.border = '1px solid #ccebd8';

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
      createWhatsAppMessage(booking);

    const whatsappURL =
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

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
            ${escapeHtml(booking.booking_code || '')}
          </strong>
          <br>
          لإكمال إجراءات الحجز، اضغط الزر التالي لإرسال تفاصيل الموعد إلى WhatsApp العيادة.
        </p>

        <a
          id="sendBookingWhatsApp"
          href="${escapeHtml(whatsappURL)}"
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

  function populateSelectors() {
    const doctorSelect = $('doctor');
    const serviceSelect = $('service');

    if (!doctorSelect || !serviceSelect) {
      return;
    }

    const oldDoctor =
      doctorSelect.value;

    const oldService =
      serviceSelect.value;

    const doctors =
      Array.isArray(clinicData.doctors)
        ? clinicData.doctors
        : [];

    const services =
      Array.isArray(clinicData.services)
        ? clinicData.services
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
                ? ' — ' + escapeHtml(doctor.title)
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
      [...doctorSelect.options].some(
        (option) =>
          option.value === oldDoctor
      )
    ) {
      doctorSelect.value = oldDoctor;
    }

    if (
      [...serviceSelect.options].some(
        (option) =>
          option.value === oldService
      )
    ) {
      serviceSelect.value = oldService;
    }
  }

  function setupDate() {
    const dateInput = $('date');

    if (!dateInput) {
      return;
    }

    const now = new Date();

    now.setMinutes(
      now.getMinutes() -
      now.getTimezoneOffset()
    );

    const today =
      now.toISOString().slice(0, 10);

    dateInput.min = today;

    if (!dateInput.value) {
      dateInput.value = today;
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

      clinicData = {
        doctors:
          Array.isArray(result?.doctors)
            ? result.doctors
            : [],

        services:
          Array.isArray(result?.services)
            ? result.services
            : [],

        settings:
          result?.settings || {}
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
        'تعذر تحميل بيانات العيادة. يرجى تحديث الصفحة والمحاولة مرة أخرى.'
      );
    }
  }

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
        slotsContainer.innerHTML = `
          <div class="slots-empty">
            لا توجد مواعيد متاحة لهذا اليوم.
          </div>
        `;

        return;
      }

      slotsContainer.innerHTML =
        slots
          .map((time) => `
            <button
              type="button"
              class="slot"
              data-slot="${escapeHtml(time)}"
            >
              ${escapeHtml(time)}
            </button>
          `)
          .join('');

      slotsContainer
        .querySelectorAll('.slot')
        .forEach((button) => {
          button.addEventListener(
            'click',
            () => {
              slotsContainer
                .querySelectorAll('.slot')
                .forEach((item) => {
                  item.classList.remove(
                    'selected'
                  );
                });

              button.classList.add(
                'selected'
              );

              selectedSlot =
                button.dataset.slot || '';

              hideMessage();
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

  function validatePhone(phone) {
    const digits =
      String(phone || '')
        .replace(/\D/g, '');

    return digits.length >= 8;
  }

  async function submitBooking(event) {
    event.preventDefault();

    hideMessage();

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

    if (!validatePhone(phone)) {
      showMessage(
        'من فضلك أدخل رقم هاتف صحيح.'
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
      submitButton.disabled = true;

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
              JSON.stringify(payload)
          }
        );

      const booking =
        result?.booking || {};

      const bookingCode =
        result?.booking_code ||
        booking?.booking_code ||
        '';

      const bookingData = {
        ...payload,
        ...booking,
        booking_code:
          bookingCode
      };

      if (!bookingCode) {
        throw new Error(
          'تم إنشاء الحجز ولكن لم يتم استلام رقم الحجز. يرجى التواصل مع العيادة.'
        );
      }

      showMessage(
        `تم إنشاء طلب الحجز بنجاح. رقم الحجز: ${bookingCode}`,
        true
      );

      showWhatsAppStep(
        bookingData
      );

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
        error.message ||
        'تعذر إرسال طلب الحجز.';

      const lower =
        String(message).toLowerCase();

      if (
        lower.includes('duplicate') ||
        lower.includes('unique') ||
        lower.includes('already booked') ||
        lower.includes('already_booked') ||
        lower.includes('23505')
      ) {
        message =
          'هذا الموعد تم حجزه بالفعل. يرجى اختيار موعد آخر.';
      }

      showMessage(message);

      await loadAvailableSlots();

    } finally {
      if (submitButton) {
        submitButton.disabled = false;

        submitButton.textContent =
          oldButtonText ||
          'تأكيد طلب الحجز';
      }
    }
  }

  function removeOldWhatsAppStep() {
    const old =
      $('whatsappBookingStep');

    if (old) {
      old.remove();
    }
  }

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
          removeOldWhatsAppStep();
          loadAvailableSlots();
        }
      );
    }

    if (service) {
      service.addEventListener(
        'change',
        () => {
          removeOldWhatsAppStep();
          loadAvailableSlots();
        }
      );
    }

    if (date) {
      date.addEventListener(
        'change',
        () => {
          removeOldWhatsAppStep();
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
      { once: true }
    );
  } else {
    initializeBooking();
  }

})();
