(() => {
  'use strict';

  /*
   * =========================================================
   * AZAAD CLINIC
   * booking-fix.js
   * =========================================================
   *
   * FINAL PUBLIC LANGUAGE / DYNAMIC CONTENT FIX
   *
   * Fixes:
   *
   * 🇬🇧 Arabic content appearing inside English mode
   * 👨‍⚕️ Doctor names
   * 🧑‍⚕️ Doctor titles
   * 📝 Doctor biographies
   * 🩺 Service names
   * 📄 Service descriptions
   * ⏱️ Service duration
   * 📅 Booking labels
   * ⏰ Available appointment messages
   * 🔘 Dynamic buttons
   * 📱 Placeholders
   * 💬 WhatsApp booking result
   *
   * SECURITY:
   * - No Service Role Key
   * - No database writes
   * - No booking submission
   * - Does not change booking payload
   * - Does not interfere with app.js booking controller
   *
   * DATA:
   * Uses the public data already loaded by clinic-posts.js:
   *
   * window.AZAAD_PUBLIC_CLINIC_DATA
   *
   * English database fields supported:
   *
   * doctors:
   *   name_en
   *   title_en
   *   bio_en
   *
   * services:
   *   name_en
   *   description_en
   *
   * =========================================================
   */

  const VERSION =
    '5.0.0';

  const STATE_KEY =
    '__AZAAD_BOOKING_FIX_V5__';

  if (
    window[STATE_KEY]
  ) {
    return;
  }

  const state = {
    version: VERSION,
    language: null,
    timer: null,
    observer: null,
    scheduled: false
  };

  window[STATE_KEY] =
    state;


  /* =========================================================
     LANGUAGE
     ========================================================= */

  function getLanguage() {

    try {

      const saved =
        localStorage.getItem(
          'azaadClinicLanguage'
        );

      if (
        saved === 'ar' ||
        saved === 'en'
      ) {
        return saved;
      }

    } catch (_) {}

    const htmlLang =
      String(
        document.documentElement.lang ||
        ''
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
      getLanguage() === 'en'
    );
  }


  /* =========================================================
     TRANSLATIONS
     ========================================================= */

  const TEXT = {

    ar: {

      navHome:
        'الرئيسية',

      navAbout:
        'عن العيادة',

      navServices:
        'الخدمات',

      navDoctors:
        'الأطباء',

      navBooking:
        'الحجز',

      navContact:
        'تواصل معنا',

      bookNow:
        'احجز موعدك',

      heroBook:
        'احجز جلستك الآن',

      heroWhatsapp:
        'تواصل عبر واتساب',

      servicesTitle:
        'خدماتنا',

      servicesIntro:
        'خدمات نفسية مصممة لتناسب احتياجات كل شخص.',

      doctorsTitle:
        'فريق العيادة',

      doctorsIntro:
        'متخصصون يعملون معك للوصول إلى حياة أكثر توازنًا.',

      bookingTitle:
        'احجز موعدك',

      bookingIntro:
        'اختر الطبيب والخدمة والتاريخ والوقت المناسب لك.',

      doctorLabel:
        'الطبيب',

      serviceLabel:
        'الخدمة',

      dateLabel:
        'التاريخ',

      modeLabel:
        'نوع الجلسة',

      clinicMode:
        'داخل العيادة',

      onlineMode:
        'جلسة أونلاين',

      slotsLabel:
        'المواعيد المتاحة',

      nameLabel:
        'الاسم بالكامل',

      phoneLabel:
        'رقم الهاتف',

      emailLabel:
        'البريد الإلكتروني',

      notesLabel:
        'ملاحظات',

      namePlaceholder:
        'اكتب اسمك',

      phonePlaceholder:
        'رقم الهاتف',

      notesPlaceholder:
        'أي معلومات إضافية...',

      confirmBooking:
        'تأكيد طلب الحجز',

      phoneContact:
        'الهاتف',

      emailContact:
        'البريد الإلكتروني',

      whatsappContact:
        'واتساب',

      startChat:
        'ابدأ المحادثة',

      contactTitle:
        'تواصل معنا',

      locationTitle:
        'موقع العيادة',

      openMaps:
        'فتح الموقع على Google Maps',

      shareLocation:
        'مشاركة موقع العيادة عبر WhatsApp',

      rights:
        'جميع الحقوق محفوظة.'
    },


    en: {

      navHome:
        'Home',

      navAbout:
        'About',

      navServices:
        'Services',

      navDoctors:
        'Doctors',

      navBooking:
        'Booking',

      navContact:
        'Contact',

      bookNow:
        'Book Appointment',

      heroBook:
        'Book Your Session',

      heroWhatsapp:
        'Contact us on WhatsApp',

      servicesTitle:
        'Our Services',

      servicesIntro:
        'Mental health services designed around each person’s needs.',

      doctorsTitle:
        'Our Team',

      doctorsIntro:
        'Specialists working with you toward a more balanced life.',

      bookingTitle:
        'Book an Appointment',

      bookingIntro:
        'Choose your doctor, service, date, and preferred time.',

      doctorLabel:
        'Doctor',

      serviceLabel:
        'Service',

      dateLabel:
        'Date',

      modeLabel:
        'Session Type',

      clinicMode:
        'In-clinic',

      onlineMode:
        'Online session',

      slotsLabel:
        'Available appointments',

      nameLabel:
        'Full name',

      phoneLabel:
        'Phone number',

      emailLabel:
        'Email',

      notesLabel:
        'Notes',

      namePlaceholder:
        'Enter your name',

      phonePlaceholder:
        'Phone number',

      notesPlaceholder:
        'Any additional information...',

      confirmBooking:
        'Submit Booking Request',

      phoneContact:
        'Phone',

      emailContact:
        'Email',

      whatsappContact:
        'WhatsApp',

      startChat:
        'Start a conversation',

      contactTitle:
        'Contact Us',

      locationTitle:
        'Clinic Location',

      openMaps:
        'Open location in Google Maps',

      shareLocation:
        'Share clinic location via WhatsApp',

      rights:
        'All rights reserved.'
    }

  };


  /* =========================================================
     DYNAMIC BOOKING TRANSLATIONS
     ========================================================= */

  const EXACT = {

    'غير محدد':
      'Not specified',

    'غير متوفر':
      'Not available',

    'داخل العيادة':
      'In-clinic',

    'جلسة أونلاين':
      'Online session',

    'أونلاين':
      'Online',

    'حضوري':
      'In-person',

    'جاري التحميل...':
      'Loading...',

    'جاري التحميل':
      'Loading...',

    'جاري تحميل المواعيد...':
      'Loading appointments...',

    'جاري تحميل المواعيد':
      'Loading appointments...',

    'جاري تحميل المواعيد المتاحة...':
      'Loading available appointments...',

    'لا توجد مواعيد متاحة لهذا اليوم.':
      'No appointments are available for this day.',

    'لا توجد مواعيد متاحة لهذا اليوم':
      'No appointments are available for this day',

    'لا توجد مواعيد متاحة في هذا اليوم':
      'No appointments are available for this day',

    'اختر الطبيب':
      'Please select a doctor',

    'اختر الخدمة':
      'Please select a service',

    'اختر التاريخ':
      'Please select a date',

    'اختر الوقت':
      'Please select a time',

    'من فضلك اختر الطبيب.':
      'Please select a doctor.',

    'من فضلك اختر الخدمة.':
      'Please select a service.',

    'من فضلك اختر التاريخ.':
      'Please select a date.',

    'من فضلك اختر أحد المواعيد المتاحة.':
      'Please select one of the available appointments.',

    'من فضلك اكتب الاسم بالكامل.':
      'Please enter your full name.',

    'من فضلك اكتب رقم الهاتف.':
      'Please enter your phone number.',

    'من فضلك أدخل رقم هاتف صحيح.':
      'Please enter a valid phone number.',

    'من فضلك أدخل بريدًا إلكترونيًا صحيحًا أو اترك الحقل فارغًا.':
      'Please enter a valid email address or leave the field empty.',

    'جاري تأكيد الحجز...':
      'Confirming your booking...',

    'تم إنشاء طلب الحجز بنجاح.':
      'Your booking request was created successfully.',

    'تم إنشاء الحجز بنجاح.':
      'Booking created successfully.',

    'رقم الحجز':
      'Booking number',

    'الطبيب':
      'Doctor',

    'الخدمة':
      'Service',

    'التاريخ':
      'Date',

    'الوقت':
      'Time',

    'نوع الجلسة':
      'Session type',

    'الاسم بالكامل':
      'Full name',

    'رقم الهاتف':
      'Phone number',

    'البريد الإلكتروني':
      'Email',

    'ملاحظات':
      'Notes',

    'تأكيد طلب الحجز':
      'Submit Booking Request',

    'إرسال الموعد إلى WhatsApp العيادة':
      'Send appointment to clinic WhatsApp',

    'إرسال الحجز إلى WhatsApp العيادة':
      'Send booking to clinic WhatsApp',

    'تواصل عبر واتساب':
      'Contact us on WhatsApp',

    'واتساب':
      'WhatsApp',

    'الهاتف':
      'Phone',

    'فتح الموقع على Google Maps':
      'Open location in Google Maps',

    'مشاركة موقع العيادة عبر WhatsApp':
      'Share clinic location via WhatsApp',

    'مشاركة موقع العيادة':
      'Share clinic location',

    'ابدأ المحادثة':
      'Start a conversation',

    'الرئيسية':
      'Home',

    'عن العيادة':
      'About',

    'الخدمات':
      'Services',

    'الأطباء':
      'Doctors',

    'الحجز':
      'Booking',

    'تواصل معنا':
      'Contact',

    'جاري الاتصال':
      'Connecting...',

    'تعذر الاتصال':
      'Unable to connect',

    'حدث خطأ':
      'An error occurred',

    'يرجى المحاولة مرة أخرى':
      'Please try again'
  };


  const PHRASES = [

    [
      'تعذر الاتصال بخادم العيادة. يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى.',
      'Unable to connect to the clinic server. Please check your internet connection and try again.'
    ],

    [
      'انتهت مهلة الاتصال بالخادم. يرجى المحاولة مرة أخرى.',
      'The connection timed out. Please try again.'
    ],

    [
      'يرجى مراجعة توفر الطبيب وتأكيد الموعد مع المريض.',
      'Please review the doctor availability and confirm the appointment with the patient.'
    ],

    [
      'بعد فتح WhatsApp ستظهر الرسالة جاهزة.',
      'After WhatsApp opens, the message will be ready to send.'
    ],

    [
      'لإكمال إجراءات الحجز، اضغط الزر التالي لإرسال تفاصيل الموعد إلى WhatsApp العيادة.',
      'To complete the booking process, click the button below to send the appointment details to the clinic WhatsApp.'
    ],

    [
      'تم تسجيل طلب الحجز.',
      'The booking request has been registered.'
    ],

    [
      'يمكنك إرسال تفاصيل الموعد إلى WhatsApp العيادة من الزر أعلاه.',
      'You can send the appointment details to the clinic WhatsApp using the button above.'
    ]

  ];


  function translateText(
    value
  ) {

    const original =
      String(value || '');

    const trimmed =
      original.trim();

    if (!trimmed) {
      return original;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        EXACT,
        trimmed
      )
    ) {

      return original.replace(
        trimmed,
        EXACT[trimmed]
      );

    }

    for (
      const pair of PHRASES
    ) {

      const ar =
        pair[0];

      const en =
        pair[1];

      if (
        trimmed.includes(ar)
      ) {

        return original.replace(
          ar,
          en
        );

      }

    }

    return original;
  }


  /* =========================================================
     STATIC DATA-I18N
     ========================================================= */

  function applyI18nAttributes() {

    const language =
      getLanguage();

    const dictionary =
      TEXT[language] ||
      TEXT.ar;

    document
      .querySelectorAll(
        '[data-i18n]'
      )
      .forEach(
        (element) => {

          const key =
            element.getAttribute(
              'data-i18n'
            );

          if (
            !Object.prototype.hasOwnProperty.call(
              dictionary,
              key
            )
          ) {
            return;
          }

          /*
           * Preserve nested markup such as
           * <span> inside heroTitle.
           */

          element.innerHTML =
            dictionary[key];

        }
      );


    document
      .querySelectorAll(
        '[data-i18n-placeholder]'
      )
      .forEach(
        (element) => {

          const key =
            element.getAttribute(
              'data-i18n-placeholder'
            );

          if (
            Object.prototype.hasOwnProperty.call(
              dictionary,
              key
            )
          ) {

            element.setAttribute(
              'placeholder',
              dictionary[key]
            );

          }

        }
      );


    document.documentElement.lang =
      language;

    document.documentElement.dir =
      language === 'en'
        ? 'ltr'
        : 'rtl';
  }


  /* =========================================================
     PUBLIC DATA
     ========================================================= */

  function getPublicData() {

    return (
      window.AZAAD_PUBLIC_CLINIC_DATA ||
      {}
    );

  }


  function getDoctors() {

    const data =
      getPublicData();

    return Array.isArray(
      data.doctors
    )
      ? data.doctors
      : [];

  }


  function getServices() {

    const data =
      getPublicData();

    return Array.isArray(
      data.services
    )
      ? data.services
      : [];

  }


  /* =========================================================
     DOCTOR ENGLISH CONTENT
     ========================================================= */

  function getDoctorName(
    doctor
  ) {

    if (
      !isEnglish()
    ) {

      return (
        doctor?.name ||
        doctor?.full_name ||
        doctor?.display_name ||
        'طبيب'
      );

    }

    return (
      doctor?.name_en ||
      doctor?.name ||
      doctor?.full_name ||
      doctor?.display_name ||
      'Doctor'
    );

  }


  function getDoctorTitle(
    doctor
  ) {

    if (
      !isEnglish()
    ) {

      return (
        doctor?.title ||
        doctor?.specialty ||
        doctor?.specialization ||
        'متخصص في الصحة النفسية'
      );

    }

    return (
      doctor?.title_en ||
      doctor?.title ||
      doctor?.specialty ||
      doctor?.specialization ||
      'Mental health specialist'
    );

  }


  function getDoctorBio(
    doctor
  ) {

    if (
      !isEnglish()
    ) {

      return (
        doctor?.bio ||
        doctor?.description ||
        doctor?.short_bio ||
        'متخصص يعمل معك للوصول إلى حياة أكثر توازنًا.'
      );

    }

    return (
      doctor?.bio_en ||
      doctor?.bio ||
      doctor?.description ||
      doctor?.short_bio ||
      'Mental health specialist working with you toward a more balanced life.'
    );

  }


  /* =========================================================
     SERVICE ENGLISH CONTENT
     ========================================================= */

  function getServiceName(
    service
  ) {

    if (
      !isEnglish()
    ) {

      return (
        service?.name ||
        service?.title ||
        service?.service_name ||
        'خدمة نفسية'
      );

    }

    return (
      service?.name_en ||
      service?.name ||
      service?.title ||
      service?.service_name ||
      'Mental health service'
    );

  }


  function getServiceDescription(
    service
  ) {

    if (
      !isEnglish()
    ) {

      return (
        service?.description ||
        service?.short_description ||
        service?.details ||
        'خدمة نفسية مصممة لتناسب احتياجاتك.'
      );

    }

    return (
      service?.description_en ||
      service?.description ||
      service?.short_description ||
      service?.details ||
      'Mental health service designed around your needs.'
    );

  }


  /* =========================================================
     DOCTOR CARDS
     ========================================================= */

  function updateDoctorCards() {

    if (
      !isEnglish()
    ) {
      return;
    }

    const doctors =
      getDoctors();

    if (!doctors.length) {
      return;
    }

    const cards =
      document.querySelectorAll(
        '#doctorsGrid .clinic-doctor-card'
      );

    if (!cards.length) {
      return;
    }

    cards.forEach(
      (card, index) => {

        const doctor =
          doctors[index];

        if (!doctor) {
          return;
        }

        const name =
          getDoctorName(
            doctor
          );

        const title =
          getDoctorTitle(
            doctor
          );

        const bio =
          getDoctorBio(
            doctor
          );

        const heading =
          card.querySelector(
            'h3'
          );

        if (heading) {
          heading.textContent =
            name;
        }

        /*
         * clinic-posts.js renders the title
         * inside the div immediately after h3.
         */

        const titleElement =
          card.querySelector(
            'h3 + div'
          );

        if (
          titleElement
        ) {

          titleElement.textContent =
            `🧑‍⚕️ ${title}`;

        }

        const paragraphs =
          card.querySelectorAll(
            'p'
          );

        if (
          paragraphs.length
        ) {

          paragraphs[
            paragraphs.length - 1
          ].textContent =
            bio;

        }

        const image =
          card.querySelector(
            'img'
          );

        if (image) {
          image.alt =
            name;
        }

      }
    );

  }


  /* =========================================================
     SERVICE CARDS
     ========================================================= */

  function updateServiceCards() {

    if (
      !isEnglish()
    ) {
      return;
    }

    const services =
      getServices();

    if (!services.length) {
      return;
    }

    const cards =
      document.querySelectorAll(
        '#servicesGrid .clinic-service-card'
      );

    if (!cards.length) {
      return;
    }

    cards.forEach(
      (card, index) => {

        const service =
          services[index];

        if (!service) {
          return;
        }

        const name =
          getServiceName(
            service
          );

        const description =
          getServiceDescription(
            service
          );

        const heading =
          card.querySelector(
            'h3'
          );

        if (heading) {
          heading.textContent =
            name;
        }

        const paragraph =
          card.querySelector(
            'p'
          );

        if (paragraph) {
          paragraph.textContent =
            description;
        }

        const duration =
          Number(
            service?.duration_minutes ||
            service?.duration ||
            0
          );

        const durationElement =
          card.querySelector(
            '.small-note'
          );

        if (
          durationElement &&
          duration
        ) {

          durationElement.textContent =
            `⏱️ ${duration} minutes`;

        }

      }
    );

  }


  /* =========================================================
     BOOKING SELECT OPTIONS
     ========================================================= */

  function updateDoctorSelect() {

    const select =
      document.getElementById(
        'doctor'
      );

    const doctors =
      getDoctors();

    if (
      !select ||
      !doctors.length
    ) {
      return;
    }

    const selected =
      select.value;

    const firstOption =
      select.querySelector(
        'option[value=""]'
      );

    const firstText =
      firstOption
        ? 'Select doctor'
        : '';

    select.innerHTML =
      `<option value="">${firstText}</option>` +
      doctors
        .map(
          (doctor) => {

            const name =
              getDoctorName(
                doctor
              );

            const title =
              getDoctorTitle(
                doctor
              );

            return `
              <option
                value="${escapeHTML(
                  doctor.id
                )}"
              >
                ${escapeHTML(
                  name
                )}
                ${
                  title
                    ? ` — ${escapeHTML(
                        title
                      )}`
                    : ''
                }
              </option>
            `;

          }
        )
        .join('');


    if (
      [...select.options]
        .some(
          option =>
            option.value ===
            selected
        )
    ) {

      select.value =
        selected;

    }

  }


  function updateServiceSelect() {

    const select =
      document.getElementById(
        'service'
      );

    const services =
      getServices();

    if (
      !select ||
      !services.length
    ) {
      return;
    }

    const selected =
      select.value;

    select.innerHTML =
      `
        <option value="">
          Select service
        </option>
      ` +
      services
        .map(
          (service) => {

            const name =
              getServiceName(
                service
              );

            const duration =
              Number(
                service?.duration_minutes ||
                service?.duration ||
                0
              );

            return `
              <option
                value="${escapeHTML(
                  service.id
                )}"
              >
                ${escapeHTML(
                  name
                )}
                ${
                  duration
                    ? ` — ${duration} minutes`
                    : ''
                }
              </option>
            `;

          }
        )
        .join('');


    if (
      [...select.options]
        .some(
          option =>
            option.value ===
            selected
        )
    ) {

      select.value =
        selected;

    }

  }


  /* =========================================================
     SESSION MODE
     ========================================================= */

  function updateModeSelect() {

    const select =
      document.getElementById(
        'mode'
      );

    if (!select) {
      return;
    }

    if (
      !isEnglish()
    ) {
      return;
    }

    const clinic =
      select.querySelector(
        'option[value="clinic"]'
      );

    const online =
      select.querySelector(
        'option[value="online"]'
      );

    if (clinic) {
      clinic.textContent =
        'In-clinic';
    }

    if (online) {
      online.textContent =
        'Online session';
    }

  }


  /* =========================================================
     DYNAMIC TEXT NODES
     ========================================================= */

  function translateRoot(
    root
  ) {

    if (
      !root ||
      !isEnglish()
    ) {
      return;
    }

    const walker =
      document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {

            const parent =
              node.parentElement;

            if (!parent) {
              return NodeFilter.FILTER_REJECT;
            }

            if (
              parent.closest(
                'script,style,input,textarea,option'
              )
            ) {
              return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;

          }
        }
      );

    const nodes = [];

    let node;

    while (
      (node =
        walker.nextNode())
    ) {

      nodes.push(node);

    }

    nodes.forEach(
      (textNode) => {

        const before =
          textNode.nodeValue ||
          '';

        const after =
          translateText(
            before
          );

        if (
          after !==
          before
        ) {

          textNode.nodeValue =
            after;

        }

      }
    );

  }


  /* =========================================================
     PLACEHOLDERS
     ========================================================= */

  function updatePlaceholders() {

    if (
      !isEnglish()
    ) {
      return;
    }

    const placeholders = {

      'اكتب اسمك':
        'Enter your name',

      'رقم الهاتف':
        'Phone number',

      'أي معلومات إضافية...':
        'Any additional information...',

      'example@email.com':
        'example@email.com'

    };

    document
      .querySelectorAll(
        'input,textarea'
      )
      .forEach(
        (element) => {

          const value =
            element.getAttribute(
              'placeholder'
            );

          if (
            value &&
            placeholders[value]
          ) {

            element.setAttribute(
              'placeholder',
              placeholders[value]
            );

          }

        }
      );

  }


  /* =========================================================
     BUTTONS
     ========================================================= */

  function updateButtons() {

    if (
      !isEnglish()
    ) {
      return;
    }

    document
      .querySelectorAll(
        'button,a'
      )
      .forEach(
        (element) => {

          /*
           * Don't touch links containing complex
           * dynamic markup.
           */

          if (
            element.children.length >
            0
          ) {
            return;
          }

          const before =
            element.textContent ||
            '';

          const after =
            translateText(
              before
            );

          if (
            after !==
            before
          ) {

            element.textContent =
              after;

          }

        }
      );

  }


  /* =========================================================
     ESCAPE HTML
     ========================================================= */

  function escapeHTML(
    value
  ) {

    return String(
      value ?? ''
    ).replace(
      /[&<>"']/g,
      (char) => {

        const entities = {

          '&':
            '&amp;',

          '<':
            '&lt;',

          '>':
            '&gt;',

          '"':
            '&quot;',

          "'":
            '&#039;'

        };

        return entities[
          char
        ];

      }
    );

  }


  /* =========================================================
     WHATSAPP
     ========================================================= */

  function getWhatsAppNumber() {

    const data =
      getPublicData();

    const settings =
      data.settings ||
      {};

    const raw =
      settings.whatsapp ||
      settings.whatsapp_number ||
      settings.whatsapp_phone ||
      '201140526294';

    return String(
      raw
    ).replace(
      /\D/g,
      ''
    );

  }


  function updateWhatsAppLinks() {

    const number =
      getWhatsAppNumber();

    if (!number) {
      return;
    }

    document
      .querySelectorAll(
        '#waHero,#waLink'
      )
      .forEach(
        (link) => {

          if (
            link &&
            (
              !link.href ||
              link.getAttribute(
                'href'
              ) === '#'
            )
          ) {

            link.href =
              `https://wa.me/${number}`;

          }

        }
      );

  }


  /* =========================================================
     APPLY EVERYTHING
     ========================================================= */

  function apply() {

    if (
      !isEnglish()
    ) {
      return;
    }

    applyI18nAttributes();

    updateDoctorCards();

    updateServiceCards();

    updateDoctorSelect();

    updateServiceSelect();

    updateModeSelect();

    updatePlaceholders();

    updateButtons();

    updateWhatsAppLinks();

    translateRoot(
      document.getElementById(
        'slots'
      )
    );

    translateRoot(
      document.getElementById(
        'message'
      )
    );

    translateRoot(
      document.getElementById(
        'whatsappBookingStep'
      )
    );

  }


  /* =========================================================
     SCHEDULE
     ========================================================= */

  function schedule() {

    if (
      state.scheduled
    ) {
      return;
    }

    state.scheduled =
      true;

    requestAnimationFrame(
      () => {

        state.scheduled =
          false;

        apply();

      }
    );

  }


  /* =========================================================
     LANGUAGE WATCHER
     ========================================================= */

  function watchLanguage() {

    let last =
      getLanguage();

    state.language =
      last;

    state.timer =
      setInterval(
        () => {

          const current =
            getLanguage();

          if (
            current !==
            last
          ) {

            last =
              current;

            state.language =
              current;

            schedule();

          }

          if (
            current === 'en'
          ) {

            schedule();

          }

        },
        500
      );

  }


  /* =========================================================
     DOM OBSERVER
     ========================================================= */

  function watchDOM() {

    if (
      state.observer ||
      !document.body
    ) {
      return;
    }

    state.observer =
      new MutationObserver(
        () => {

          if (
            isEnglish()
          ) {

            schedule();

          }

        }
      );

    state.observer.observe(
      document.body,
      {
        subtree: true,
        childList: true,
        characterData: true
      }
    );

  }


  /* =========================================================
     INIT
     ========================================================= */

  function init() {

    state.language =
      getLanguage();

    watchLanguage();

    watchDOM();

    /*
     * app.js / clinic-posts.js / public-ui.js
     * may still be loading.
     */

    setTimeout(
      schedule,
      100
    );

    setTimeout(
      schedule,
      500
    );

    setTimeout(
      schedule,
      1000
    );

    setTimeout(
      schedule,
      2000
    );

  }


  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init,
      {
        once: true
      }
    );

  } else {

    init();

  }

})();
