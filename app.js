(() => {
  'use strict';
  /*
   * =========================================================
   * AZAAD CLINIC
   * PUBLIC BOOKING SYSTEM
   * File: app.js
   * =========================================================
   *
   * 🏥 تحميل بيانات العيادة
   * 👨‍⚕️ تحميل الأطباء
   * 🩺 تحميل الخدمات
   * 📅 تحميل المواعيد المتاحة
   * 🕐 عرض الوقت بنظام 12 ساعة AM / PM
   * 🏥 / 💻 نوع الجلسة
   * 👤 استقبال بيانات المريض
   * 📱 التحقق من رقم الهاتف
   * 📋 إنشاء طلب الحجز
   * 🔐 الاتصال بـ Supabase Edge Function
   * 🎫 استلام رقم الحجز
   * 📲 تجهيز WhatsApp
   *
   * SECURITY
   * ---------------------------------------------------------
   * ❌ لا يحتوي على Service Role Key
   * ❌ لا ينفذ عمليات إدارية
   * ❌ لا يتعامل مع Auth Admin
   * ❌ لا يغير Booking Payload
   *
   * =========================================================
   */
  const API =
    'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-booking';
  const PUBLIC_API =
    'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-clinic-data';
  const PUBLIC_SCHEDULING_API =
    'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-scheduling';
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
  let lastSuccessfulBooking = null;
  let slotsRequestId = 0;
  let slotsAbortController = null;
  /*
   * =========================================================
   * LANGUAGE
   * =========================================================
   */
  function getCurrentLanguage() {
    try {
      const saved =
        localStorage.getItem(
          'azaadClinicLanguage'
        );
      if (
        saved === 'en' ||
        saved === 'ar'
      ) {
        return saved;
      }
    } catch (_) {}
    const htmlLang =
      String(
        document.documentElement.lang || ''
      )
        .toLowerCase()
        .trim();
    if (
      htmlLang === 'en' ||
      htmlLang.startsWith('en-')
    ) {
      return 'en';
    }
    return 'ar';
  }
  function isEnglish() {
    return (
      getCurrentLanguage() === 'en'
    );
  }
  /*
   * =========================================================
   * TRANSLATIONS
   * =========================================================
   */
  const I18N = {
    ar: {
      chooseDoctor: 'اختر الطبيب',
      chooseService: 'اختر الخدمة',
      chooseDate: 'اختر التاريخ',
      chooseTime: 'اختر الوقت',
      unspecified: 'غير محدد',
      unavailable: 'غير متوفر',
      clinic: 'داخل العيادة',
      online: 'جلسة أونلاين',
      loading: 'جاري التحميل...',
      loadingAppointments: 'جاري تحميل المواعيد...',
      noAppointments: 'لا توجد مواعيد متاحة لهذا اليوم.',
      selectDoctorServiceDate:
        'اختر الطبيب والخدمة والتاريخ لعرض المواعيد المتاحة.',
      selectDoctor: 'من فضلك اختر الطبيب.',
      selectService: 'من فضلك اختر الخدمة.',
      selectDate: 'من فضلك اختر التاريخ.',
      selectMode: 'من فضلك اختر نوع الجلسة.',
      selectTime: 'من فضلك اختر أحد المواعيد المتاحة.',
      enterName: 'من فضلك اكتب الاسم بالكامل.',
      enterPhone: 'من فضلك اكتب رقم الهاتف.',
      invalidPhone: 'من فضلك أدخل رقم هاتف صحيح.',
      invalidEmail:
        'من فضلك أدخل بريدًا إلكترونيًا صحيحًا أو اترك الحقل فارغًا.',
      bookingConfirming: 'جاري تأكيد الحجز...',
      bookingCreated: 'تم إنشاء طلب الحجز بنجاح.',
      bookingSuccess: 'تم إنشاء الحجز بنجاح.',
      bookingNumber: 'رقم الحجز',
      doctor: 'الطبيب',
      service: 'الخدمة',
      date: 'التاريخ',
      time: 'الوقت',
      sessionType: 'نوع الجلسة',
      patientName: 'اسم المريض',
      phone: 'رقم الهاتف',
      email: 'البريد الإلكتروني',
      notes: 'ملاحظات المريض',
      bookingRequest: 'طلب حجز جديد',
      reviewAvailability:
        'يرجى مراجعة توفر الطبيب وتأكيد الموعد مع المريض.',
      sentFromWebsite:
        'تم إرسال الطلب من موقع Azaad Clinic.',
      whatsappTitle: 'تم إنشاء الحجز بنجاح',
      whatsappDescription:
        'لإكمال إجراءات الحجز، اضغط الزر التالي لإرسال تفاصيل الموعد إلى WhatsApp العيادة.',
      sendToWhatsApp:
        '📲 إرسال الموعد إلى WhatsApp العيادة',
      whatsappReady:
        'بعد فتح WhatsApp ستظهر الرسالة جاهزة. اضغط «إرسال» داخل WhatsApp لإرسال الحجز إلى السكرتيرة.',
      connectionTimeout:
        'انتهت مهلة الاتصال بالخادم. يرجى المحاولة مرة أخرى.',
      connectionFailed:
        'تعذر الاتصال بخادم العيادة. يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى.',
      dataLoadFailed:
        'تعذر تحميل بيانات العيادة. يرجى تحديث الصفحة والمحاولة مرة أخرى.',
      slotsLoadFailed:
        'تعذر تحميل المواعيد. يرجى المحاولة مرة أخرى.',
      bookingFailed:
        'تعذر إرسال طلب الحجز.',
      bookingCreatedNoCode:
        'تم إنشاء الحجز ولكن لم يتم استلام رقم الحجز. يرجى التواصل مع العيادة.',
      duplicateBooking:
        'هذا الموعد تم حجزه بالفعل. يرجى اختيار موعد آخر.',
      bookedRequest:
        'تم تسجيل طلب الحجز. يمكنك إرسال تفاصيل الموعد إلى WhatsApp العيادة من الزر أعلاه.',
      serviceMinutes: 'دقيقة',
      onlineShort: 'أونلاين',
      inPerson: 'حضوري',
      doctorFallback: 'طبيب',
      serviceFallback: 'خدمة',
      invalidBookingResponse:
        'تم إنشاء الحجز ولكن استجابة الخادم غير مكتملة. يرجى التواصل مع العيادة.'
    },
    en: {
      chooseDoctor: 'Select doctor',
      chooseService: 'Select service',
      chooseDate: 'Select date',
      chooseTime: 'Select time',
      unspecified: 'Not specified',
      unavailable: 'Not available',
      clinic: 'In-clinic',
      online: 'Online session',
      loading: 'Loading...',
      loadingAppointments: 'Loading appointments...',
      noAppointments:
        'No appointments are available for this day.',
      selectDoctorServiceDate:
        'Select a doctor, service, date, and session type to view available appointments.',
      selectDoctor:
        'Please select a doctor.',
      selectService:
        'Please select a service.',
      selectDate:
        'Please select a date.',
      selectMode:
        'Please select the session type.',
      selectTime:
        'Please select one of the available appointments.',
      enterName:
        'Please enter your full name.',
      enterPhone:
        'Please enter your phone number.',
      invalidPhone:
        'Please enter a valid phone number.',
      invalidEmail:
        'Please enter a valid email address or leave the field empty.',
      bookingConfirming:
        'Confirming your booking...',
      bookingCreated:
        'Your booking request was created successfully.',
      bookingSuccess:
        'Booking created successfully.',
      bookingNumber:
        'Booking number',
      doctor:
        'Doctor',
      service:
        'Service',
      date:
        'Date',
      time:
        'Time',
      sessionType:
        'Session type',
      patientName:
        'Patient name',
      phone:
        'Phone number',
      email:
        'Email',
      notes:
        'Patient notes',
      bookingRequest:
        'New booking request',
      reviewAvailability:
        'Please review the doctor availability and confirm the appointment with the patient.',
      sentFromWebsite:
        'This request was submitted from the Azaad Clinic website.',
      whatsappTitle:
        'Booking created successfully',
      whatsappDescription:
        'To complete the booking process, click the button below to send the appointment details to the clinic WhatsApp.',
      sendToWhatsApp:
        '📲 Send appointment to clinic WhatsApp',
      whatsappReady:
        'WhatsApp will open with the message ready. Press "Send" inside WhatsApp to send the booking to the receptionist.',
      connectionTimeout:
        'The connection timed out. Please try again.',
      connectionFailed:
        'Unable to connect to the clinic server. Please check your internet connection and try again.',
      dataLoadFailed:
        'Unable to load clinic data. Please refresh the page and try again.',
      slotsLoadFailed:
        'Unable to load appointments. Please try again.',
      bookingFailed:
        'Unable to submit the booking request.',
      bookingCreatedNoCode:
        'The booking was created, but no booking number was received. Please contact the clinic.',
      duplicateBooking:
        'This appointment has already been booked. Please select another appointment.',
      bookedRequest:
        'The booking request has been registered. You can send the appointment details to the clinic WhatsApp using the button above.',
      serviceMinutes:
        'minutes',
      onlineShort:
        'Online',
      inPerson:
        'In-person',
      doctorFallback:
        'Doctor',
      serviceFallback:
        'Service',
      invalidBookingResponse:
        'The booking was created, but the server response was incomplete. Please contact the clinic.'
    }
  };
  function t(key) {
    const language =
      getCurrentLanguage();
    return (
      I18N?.[language]?.[key] ??
      I18N.ar[key] ??
      key
    );
  }
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
      options.signal
        ? null
        : new AbortController();
    const signal =
      options.signal ||
      controller?.signal;
    const timeout =
      setTimeout(() => {
        try {
          controller?.abort();
        } catch (_) {}
      }, 20000);
    try {
      const response =
        await fetch(url, {
          ...options,
          cache: 'no-store',
          signal,
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
        throw error;
      }
      if (
        error instanceof TypeError &&
        String(error.message || '')
          .toLowerCase()
          .includes('failed to fetch')
      ) {
        throw new Error(
          t('connectionFailed')
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
    try {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    } catch (_) {}
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
      return t('unspecified');
    }
    return (
      doctor.name ||
      doctor.full_name ||
      doctor.display_name ||
      t('doctorFallback')
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
      return t('unspecified');
    }
    return (
      service.name ||
      service.title ||
      t('serviceFallback')
    );
  }
  /*
   * =========================================================
   * MODE
   * =========================================================
   */
  function getSelectedMode() {
    const modeElement =
      $('mode');
    if (!modeElement) {
      return 'clinic';
    }
    const value =
      String(
        modeElement.value || ''
      )
        .trim()
        .toLowerCase();
    return value || 'clinic';
  }
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
      return t('online');
    }
    return t('clinic');
  }
  /*
   * =========================================================
   * DATE / TIME
   * =========================================================
   */
  function formatDate(date) {
    if (!date) {
      return t('unspecified');
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
        isEnglish()
          ? 'en-US'
          : 'ar-EG',
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
  /*
   * IMPORTANT
   * ---------------------------------------------------------
   * normalizeTime()
   * يحافظ على قيمة الوقت الأصلية
   * مثل 13:30 لإرسالها إلى Backend.
   *
   * formatTime12()
   * مخصص للعرض فقط للمريض / WhatsApp.
   *
   * Database remains 24-hour internally.
   * UI is 12-hour.
   * =========================================================
   */
  function normalizeTime(time) {
    return String(time || '')
      .trim()
      .slice(0, 5);
  }
  function formatTime12(time) {
    const normalized =
      normalizeTime(time);
    if (!normalized) {
      return t('unspecified');
    }
    const match =
      normalized.match(
        /^(\d{1,2}):(\d{2})$/
      );
    if (!match) {
      return normalized;
    }
    let hours =
      Number(match[1]);
    const minutes =
      match[2];
    if (
      !Number.isFinite(hours) ||
      hours < 0 ||
      hours > 23
    ) {
      return normalized;
    }
    const period =
      hours >= 12
        ? 'PM'
        : 'AM';
    hours =
      hours % 12 || 12;
    if (isEnglish()) {
      return `${hours}:${minutes} ${period}`;
    }
    return `${hours}:${minutes} ${period}`;
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
    const settings =
      clinicData?.settings ||
      {};
    const configured =
      settings.whatsapp ||
      settings.whatsapp_number ||
      settings.whatsapp_phone ||
      settings.phone_whatsapp ||
      '';
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
      formatTime12(
        booking.appointment_time
      );
    const bookingCode =
      booking.booking_code ||
      t('unavailable');
    const patientName =
      booking.patient_name ||
      t('unspecified');
    const patientPhone =
      booking.patient_phone ||
      t('unspecified');
    const patientEmail =
      String(
        booking.patient_email ||
        ''
      ).trim();
    const notes =
      String(
        booking.notes ||
        ''
      ).trim();
    let message =
`🏥 Azaad Clinic - ${t('bookingRequest')}
📌 ${t('bookingNumber')}: ${bookingCode}
👤 ${t('patientName')}: ${patientName}
📱 ${t('phone')}: ${patientPhone}
👨‍⚕️ ${t('doctor')}: ${doctorDisplay}
🩺 ${t('service')}: ${serviceName}
📅 ${t('date')}: ${date}
⏰ ${t('time')}: ${time || t('unspecified')}
💻 ${t('sessionType')}: ${mode}`;
    if (patientEmail) {
      message +=
`\n📧 ${t('email')}: ${patientEmail}`;
    }
    if (notes) {
      message +=
`\n\n📝 ${t('notes')}:
${notes}`;
    }
    message +=
`\n⚠️ ${t('reviewAvailability')}
${t('sentFromWebsite')}`;
    return message;
  }
  /*
   * =========================================================
   * WHATSAPP RESULT
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
          ${escapeHtml(
            t('whatsappTitle')
          )}
        </div>
        <p style="
          line-height:1.8;
          margin:0 0 14px;
        ">
          ${escapeHtml(
            t('bookingNumber')
          )}:
          <strong>
            ${escapeHtml(
              booking.booking_code || ''
            )}
          </strong>
          <br>
          ${escapeHtml(
            t('whatsappDescription')
          )}
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
          ${escapeHtml(
            t('sendToWhatsApp')
          )}
        </a>
        <p style="
          font-size:13px;
          color:#666;
          margin-top:12px;
          line-height:1.7;
        ">
          ${escapeHtml(
            t('whatsappReady')
          )}
        </p>
      </div>
    `;
    try {
      container.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    } catch (_) {}
  }
  function removeOldWhatsAppStep() {
    const old =
      $('whatsappBookingStep');
    if (old) {
      old.remove();
    }
    lastSuccessfulBooking =
      null;
  }
  /*
   * =========================================================
   * SELECTORS
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
    doctorSelect.innerHTML =
      `
        <option value="">
          ${escapeHtml(
            t('chooseDoctor')
          )}
        </option>
      ` +
      doctors
        .map(
          (doctor) => `
            <option value="${escapeHtml(
              doctor.id
            )}">
              ${escapeHtml(
                doctor.name ||
                doctor.full_name ||
                doctor.display_name ||
                t('doctorFallback')
              )}
              ${
                doctor.title ||
                doctor.specialty
                  ? ' — ' +
                    escapeHtml(
                      doctor.title ||
                      doctor.specialty
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
          ${escapeHtml(
            t('chooseService')
          )}
        </option>
      ` +
      services
        .map(
          (service) => `
            <option value="${escapeHtml(
              service.id
            )}">
              ${escapeHtml(
                service.name ||
                service.title ||
                t('serviceFallback')
              )}
              ${
                service.duration_minutes
                  ? ' — ' +
                    escapeHtml(
                      service.duration_minutes
                    ) +
                    ' ' +
                    escapeHtml(
                      t('serviceMinutes')
                    )
                  : ''
              }
            </option>
          `
        )
        .join('');
    if (
      [...doctorSelect.options].some(
        (option) =>
          option.value ===
          oldDoctor
      )
    ) {
      doctorSelect.value =
        oldDoctor;
    }
    if (
      [...serviceSelect.options].some(
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
          PUBLIC_API +
          '?api=data&_=' +
          Date.now()
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
          result?.settings ||
          {}
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
        t('dataLoadFailed')
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
    const mode =
      getSelectedMode();
    selectedSlot =
      '';
    removeOldWhatsAppStep();
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
          ${escapeHtml(
            t('selectDoctorServiceDate')
          )}
        </div>
      `;
      return;
    }
    try {
      slotsAbortController?.abort();
    } catch (_) {}
    slotsAbortController =
      new AbortController();
    const requestId =
      ++slotsRequestId;
    slotsContainer.innerHTML = `
      <div class="slots-loading">
        ${escapeHtml(
          t('loadingAppointments')
        )}
      </div>
    `;
    try {
      const url =
        PUBLIC_SCHEDULING_API +
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
        '&mode=' +
        encodeURIComponent(
          mode
        ) +
        '&_=' +
        Date.now();
      const result =
        await request(
          url,
          {
            signal:
              slotsAbortController
                .signal
          }
        );
      if (
        requestId !==
        slotsRequestId
      ) {
        return;
      }
      const slots =
        Array.isArray(
          result?.slots
        )
          ? result.slots
          : [];
      if (!slots.length) {
        slotsContainer.innerHTML = `
          <div class="slots-empty">
            ${escapeHtml(
              t('noAppointments')
            )}
          </div>
        `;
        return;
      }
      /*
       * القيمة الأصلية normalized
       * تُحفظ داخل data-slot.
       *
       * العرض للمريض فقط 12-hour.
       */
      slotsContainer.innerHTML =
        slots
          .map(
            (time) => {
              const normalized =
                normalizeTime(
                  time
                );
              const displayTime =
                formatTime12(
                  normalized
                );
              return `
                <button
                  type="button"
                  class="slot"
                  data-slot="${escapeHtml(
                    normalized
                  )}"
                  aria-label="${escapeHtml(
                    `${t('chooseTime')}: ${displayTime}`
                  )}"
                  aria-pressed="false"
                >
                  ${escapeHtml(
                    displayTime
                  )}
                </button>
              `;
            }
          )
          .join('');
      slotsContainer
        .querySelectorAll(
          '.slot'
        )
        .forEach(
          (button) => {
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
                      item.setAttribute(
                        'aria-pressed',
                        'false'
                      );
                    }
                  );
                button.classList.add(
                  'selected'
                );
                button.setAttribute(
                  'aria-pressed',
                  'true'
                );
                selectedSlot =
                  button.dataset.slot ||
                  '';
                hideMessage();
                removeOldWhatsAppStep();
              }
            );
          }
        );
    } catch (error) {
      if (
        error?.name ===
        'AbortError'
      ) {
        return;
      }
      console.error(
        'Slots error:',
        error
      );
      if (
        requestId !==
        slotsRequestId
      ) {
        return;
      }
      slotsContainer.innerHTML = `
        <div class="slots-error">
          ${escapeHtml(
            t('slotsLoadFailed')
          )}
        </div>
      `;
      showMessage(
        error?.message ||
        t('slotsLoadFailed')
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
      digits.length >= 8 &&
      digits.length <= 15
    );
  }
  /*
   * =========================================================
   * EMAIL VALIDATION
   * =========================================================
   */
  function validateEmail(email) {
    if (!email) {
      return true;
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    );
  }
  /*
   * =========================================================
   * SUBMIT BOOKING
   * =========================================================
   */
  async function submitBooking(event) {
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
      getSelectedMode();
    if (!doctor) {
      showMessage(
        t('selectDoctor')
      );
      return;
    }
    if (!service) {
      showMessage(
        t('selectService')
      );
      return;
    }
    if (!date) {
      showMessage(
        t('selectDate')
      );
      return;
    }
    if (!mode) {
      showMessage(
        t('selectMode')
      );
      return;
    }
    if (!selectedSlot) {
      showMessage(
        t('selectTime')
      );
      return;
    }
    if (!name) {
      showMessage(
        t('enterName')
      );
      return;
    }
    if (!phone) {
      showMessage(
        t('enterPhone')
      );
      return;
    }
    if (!validatePhone(phone)) {
      showMessage(
        t('invalidPhone')
      );
      return;
    }
    if (!validateEmail(email)) {
      showMessage(
        t('invalidEmail')
      );
      return;
    }
    /*
     * Backend receives original 24-hour value.
     * Example:
     * UI: 1:30 PM
     * Payload: 13:30
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
        email ||
        null,
      notes:
        notes ||
        null
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
      submitButton.setAttribute(
        'aria-busy',
        'true'
      );
      submitButton.textContent =
        t('bookingConfirming');
    }
    try {
      const result =
        await request(
          API +
          '?api=book',
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
        {};
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
          t('bookingCreatedNoCode')
        );
      }
      lastSuccessfulBooking =
        {
          ...bookingData
        };
      showMessage(
        `${t('bookingCreated')} ${t('bookingNumber')}: ${bookingCode}`,
        true
      );
      showWhatsAppStep(
        lastSuccessfulBooking
      );
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
            ${escapeHtml(
              t('bookedRequest')
            )}
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
        t('bookingFailed');
      const lower =
        String(message)
          .toLowerCase();
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
        )
      ) {
        message =
          t('duplicateBooking');
      }
      showMessage(
        message
      );
      await loadAvailableSlots();
    } finally {
      if (submitButton) {
        submitButton.disabled =
          false;
        submitButton.removeAttribute(
          'aria-busy'
        );
        submitButton.textContent =
          oldButtonText ||
          (
            isEnglish()
              ? 'Confirm booking request'
              : 'تأكيد طلب الحجز'
          );
      }
    }
  }
  /*
   * =========================================================
   * LANGUAGE CHANGE SUPPORT
   * =========================================================
   */
  function refreshDynamicLanguage() {
    try {
      populateSelectors();
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
      if (
        slotsContainer &&
        doctor &&
        service &&
        date
      ) {
        loadAvailableSlots();
      }
      const submitButton =
        document.querySelector(
          '#bookingForm button[type="submit"]'
        );
      if (
        submitButton &&
        !submitButton.disabled
      ) {
        const currentText =
          String(
            submitButton.textContent ||
            ''
          ).trim();
        const knownArabic =
          [
            'تأكيد طلب الحجز',
            'جاري تأكيد الحجز...'
          ];
        const knownEnglish =
          [
            'Confirm booking request',
            'Confirming your booking...'
          ];
        if (
          knownArabic.includes(
            currentText
          ) ||
          knownEnglish.includes(
            currentText
          )
        ) {
          submitButton.textContent =
            isEnglish()
              ? 'Confirm booking request'
              : 'تأكيد طلب الحجز';
        }
      }
      if (
        lastSuccessfulBooking
      ) {
        showWhatsAppStep(
          lastSuccessfulBooking
        );
      }
    } catch (error) {
      console.warn(
        'Azaad Clinic language refresh warning:',
        error
      );
    }
  }
  /*
   * =========================================================
   * LANGUAGE OBSERVER
   * =========================================================
   */
  function setupLanguageObserver() {
    let lastLanguage =
      getCurrentLanguage();
    const checkLanguage =
      () => {
        const currentLanguage =
          getCurrentLanguage();
        if (
          currentLanguage !==
          lastLanguage
        ) {
          lastLanguage =
            currentLanguage;
          refreshDynamicLanguage();
        }
      };
    setInterval(
      checkLanguage,
      400
    );
    window.addEventListener(
      'storage',
      (event) => {
        if (
          event.key ===
          'azaadClinicLanguage'
        ) {
          checkLanguage();
        }
      }
    );
    try {
      const html =
        document.documentElement;
      const observer =
        new MutationObserver(
          () => {
            checkLanguage();
          }
        );
      observer.observe(
        html,
        {
          attributes: true,
          attributeFilter: [
            'lang',
            'dir'
          ]
        }
      );
    } catch (_) {}
  }
  /*
   * =========================================================
   * EVENT HELPERS
   * =========================================================
   */
  function resetBookingState() {
    selectedSlot =
      '';
    removeOldWhatsAppStep();
    hideMessage();
  }
  function setupSelectChange(
    element,
    callback
  ) {
    if (!element) {
      return;
    }
    element.addEventListener(
      'change',
      callback
    );
  }
  /*
   * =========================================================
   * INITIALIZE
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
    if (!form) {
      setupLanguageObserver();
      return;
    }
    const doctor =
      $('doctor');
    const service =
      $('service');
    const date =
      $('date');
    const mode =
      $('mode');
    setupSelectChange(
      doctor,
      () => {
        resetBookingState();
        loadAvailableSlots();
      }
    );
    setupSelectChange(
      service,
      () => {
        resetBookingState();
        loadAvailableSlots();
      }
    );
    setupSelectChange(
      date,
      () => {
        resetBookingState();
        loadAvailableSlots();
      }
    );
    /*
     * تغيير:
     * 🏥 داخل العيادة
     * 💻 أونلاين
     *
     * يعيد تحميل المواعيد.
     */
    setupSelectChange(
      mode,
      () => {
        resetBookingState();
        loadAvailableSlots();
      }
    );
    form.addEventListener(
      'submit',
      submitBooking
    );
    setupDate();
    setupLanguageObserver();
    loadClinicData();
  }
  /*
   * =========================================================
   * START
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
