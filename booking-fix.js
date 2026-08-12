(() => {
  'use strict';

  /*
   * =========================================================
   * AZAAD CLINIC
   * booking-fix.js
   * =========================================================
   *
   * Compatibility + dynamic public UI language layer.
   *
   * IMPORTANT:
   * - app.js remains the ONLY booking controller.
   * - This file never submits a booking.
   * - This file never calls Supabase.
   * - This file never changes the booking payload.
   * - public-ui.js is never loaded twice.
   * - Dynamic Arabic text generated later by app.js can be
   *   translated when English is selected.
   * =========================================================
   */

  const STATE_KEY =
    '__AZAAD_BOOKING_FIX_INITIALIZED__';

  const TRANSLATION_STATE_KEY =
    '__AZAAD_DYNAMIC_I18N_INSTALLED__';

  window.AzaadClinicBookingFix =
    window.AzaadClinicBookingFix || {
      version: '4.3.0',
      enabled: false,
      handledBy: 'app.js',
      publicUiBootstrapped: false
    };

  const state =
    window.AzaadClinicBookingFix;

  /*
   * =========================================================
   * LANGUAGE
   * =========================================================
   */

  function getLanguage() {
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

    return (
      document.documentElement.lang ===
      'en'
        ? 'en'
        : 'ar'
    );
  }

  function isEnglish() {
    return getLanguage() === 'en';
  }

  /*
   * =========================================================
   * DYNAMIC TRANSLATIONS
   * =========================================================
   */

  const EXACT_TRANSLATIONS = {
    'غير محدد':
      'Not specified',

    'غير متوفر':
      'Not available',

    'داخل العيادة':
      'In-clinic',

    'جلسة أونلاين':
      'Online session',

    'جاري التحميل':
      'Loading...',

    'جاري تحميل البيانات':
      'Loading data...',

    'جاري تحميل المواعيد':
      'Loading appointments...',

    'جاري تحميل المواعيد المتاحة':
      'Loading available appointments...',

    'تحميل المواعيد':
      'Loading appointments...',

    'لا توجد مواعيد متاحة':
      'No appointments are available',

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

    'يرجى اختيار الطبيب':
      'Please select a doctor',

    'يرجى اختيار الخدمة':
      'Please select a service',

    'يرجى اختيار التاريخ':
      'Please select a date',

    'يرجى اختيار الموعد':
      'Please select an appointment time',

    'يرجى اختيار موعد':
      'Please select an appointment time',

    'يرجى إدخال الاسم':
      'Please enter your name',

    'يرجى إدخال رقم الهاتف':
      'Please enter your phone number',

    'رقم الهاتف غير صحيح':
      'Invalid phone number',

    'يرجى إدخال بريد إلكتروني صحيح':
      'Please enter a valid email address',

    'جاري تأكيد الحجز':
      'Confirming your booking...',

    'جاري إنشاء الحجز':
      'Creating your booking...',

    'جاري إرسال طلب الحجز':
      'Submitting your booking request...',

    'تم إنشاء الحجز بنجاح':
      'Your booking request was created successfully',

    'تم الحجز بنجاح':
      'Booking completed successfully',

    'تم إرسال طلب الحجز بنجاح':
      'Your booking request was submitted successfully',

    'رقم الحجز':
      'Booking number',

    'رقم الحجز:':
      'Booking number:',

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

    'المواعيد المتاحة':
      'Available appointments',

    'داخل العيادة':
      'In-clinic',

    'جلسة أونلاين':
      'Online session',

    'أونلاين':
      'Online',

    'حضوري':
      'In-person',

    'ملاحظات':
      'Notes',

    'الاسم بالكامل':
      'Full name',

    'رقم الهاتف':
      'Phone number',

    'البريد الإلكتروني':
      'Email',

    'تأكيد طلب الحجز':
      'Submit Booking Request',

    'تأكيد الحجز':
      'Confirm Booking',

    'احجز موعدك':
      'Book Appointment',

    'احجز موعد':
      'Book Appointment',

    'احجز جلستك الآن':
      'Book Your Session',

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

    'البريد الإلكتروني':
      'Email',

    'فتح الموقع على Google Maps':
      'Open location in Google Maps',

    'مشاركة موقع العيادة عبر WhatsApp':
      'Share clinic location via WhatsApp',

    'مشاركة الموقع':
      'Share Location',

    'فتح الموقع':
      'Open Location',

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

    'حدث خطأ أثناء الحجز':
      'An error occurred while booking',

    'حدث خطأ أثناء تحميل المواعيد':
      'An error occurred while loading appointments',

    'يرجى المحاولة مرة أخرى':
      'Please try again',

    'يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى':
      'Please check your internet connection and try again'
  };

  /*
   * Longer messages must be checked before shorter ones.
   */

  const PHRASE_TRANSLATIONS = [
    [
      'تعذر الاتصال بخادم العيادة. يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى.',
      'Unable to connect to the clinic server. Please check your internet connection and try again.'
    ],

    [
      'انتهت مهلة الاتصال بالخادم. يرجى المحاولة مرة أخرى.',
      'The connection timed out. Please try again.'
    ],

    [
      'لا توجد مواعيد متاحة لهذا اليوم',
      'No appointments are available for this day'
    ],

    [
      'لا توجد مواعيد متاحة في هذا اليوم',
      'No appointments are available for this day'
    ],

    [
      'يرجى مراجعة توفر الطبيب وتأكيد الموعد مع المريض.',
      'Please review the doctor availability and confirm the appointment with the patient.'
    ],

    [
      'بعد فتح WhatsApp ستظهر الرسالة جاهزة.',
      'After WhatsApp opens, the message will be ready to send.'
    ]
  ];

  function translateText(text) {
    const original =
      String(text || '');

    const trimmed =
      original.trim();

    if (!trimmed) {
      return original;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        EXACT_TRANSLATIONS,
        trimmed
      )
    ) {
      const translated =
        EXACT_TRANSLATIONS[trimmed];

      const start =
        original.indexOf(trimmed);

      return (
        original.slice(
          0,
          start
        ) +
        translated +
        original.slice(
          start + trimmed.length
        )
      );
    }

    for (
      const [ar, en]
      of PHRASE_TRANSLATIONS
    ) {
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

  /*
   * =========================================================
   * TRANSLATE ELEMENT
   * =========================================================
   */

  function translateElement(element) {
    if (
      !element ||
      !isEnglish()
    ) {
      return;
    }

    /*
     * Do not translate form values or user-entered data.
     */

    if (
      element instanceof
        HTMLInputElement ||
      element instanceof
        HTMLTextAreaElement
    ) {
      return;
    }

    /*
     * SELECT options can contain dynamic Arabic labels.
     */

    if (
      element instanceof
      HTMLSelectElement
    ) {
      element
        .querySelectorAll('option')
        .forEach(
          (option) => {
            const text =
              option.textContent;

            const translated =
              translateText(text);

            if (
              translated !== text
            ) {
              option.textContent =
                translated;
            }
          }
        );

      return;
    }

    /*
     * Translate direct text nodes only.
     *
     * This avoids changing doctor names,
     * service names, patient data, etc.
     */

    const walker =
      document.createTreeWalker(
        element,
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
                'input, textarea, select, option, script, style'
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
          textNode.nodeValue;

        const after =
          translateText(before);

        if (
          after !== before
        ) {
          textNode.nodeValue =
            after;
        }
      }
    );
  }

  /*
   * =========================================================
   * TRANSLATE DYNAMIC UI
   * =========================================================
   */

  function translateDynamicUI() {
    if (!isEnglish()) {
      return;
    }

    const root =
      document.body;

    if (!root) {
      return;
    }

    /*
     * Keep the scope focused on public UI.
     */

    const selectors = [
      '#message',
      '#slots',
      '#availableSlots',
      '#bookingForm',
      '#bookingSummary',
      '#whatsappBookingStep',
      '#doctor',
      '#service',
      '#mode',
      '#appointmentTime',
      '#appointmentDate'
    ];

    selectors.forEach(
      (selector) => {
        document
          .querySelectorAll(
            selector
          )
          .forEach(
            translateElement
          );
      }
    );
  }

  /*
   * =========================================================
   * PLACEHOLDERS
   * =========================================================
   */

  function translatePlaceholders() {
    if (!isEnglish()) {
      return;
    }

    const placeholders = {
      'اكتب اسمك':
        'Enter your name',

      'رقم الهاتف':
        'Phone number',

      'أي معلومات إضافية...':
        'Any additional information...',

      'اكتب ملاحظاتك':
        'Enter your notes',

      'البريد الإلكتروني':
        'Email'
    };

    document
      .querySelectorAll(
        'input, textarea'
      )
      .forEach(
        (element) => {
          const value =
            element.getAttribute(
              'placeholder'
            );

          if (
            !value
          ) {
            return;
          }

          if (
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

  /*
   * =========================================================
   * DYNAMIC BUTTON LABELS
   * =========================================================
   */

  function translateButtons() {
    if (!isEnglish()) {
      return;
    }

    document
      .querySelectorAll(
        'button, a'
      )
      .forEach(
        (element) => {
          /*
           * Never translate a patient's name,
           * doctor name, or service name.
           * Only exact known UI labels.
           */

          const text =
            element.textContent;

          const translated =
            translateText(text);

          if (
            translated !== text
          ) {
            element.textContent =
              translated;
          }

          if (
            element.hasAttribute(
              'aria-label'
            )
          ) {
            const aria =
              element.getAttribute(
                'aria-label'
              );

            const translatedAria =
              translateText(aria);

            if (
              translatedAria !==
              aria
            ) {
              element.setAttribute(
                'aria-label',
                translatedAria
              );
            }
          }

          if (
            element.hasAttribute(
              'title'
            )
          ) {
            const title =
              element.getAttribute(
                'title'
              );

            const translatedTitle =
              translateText(title);

            if (
              translatedTitle !==
              title
            ) {
              element.setAttribute(
                'title',
                translatedTitle
              );
            }
          }
        }
      );
  }

  /*
   * =========================================================
   * CONTACT BUTTON SAFETY
   * =========================================================
   */

  function normalizeDigits(value) {
    return String(value || '')
      .replace(
        /\D/g,
        ''
      );
  }

  function getWhatsAppNumber() {
    const data =
      window.AZAAD_PUBLIC_CLINIC_DATA ||
      {};

    const settings =
      data.settings ||
      {};

    return (
      normalizeDigits(
        settings.whatsapp ||
        settings.whatsapp_number ||
        settings.whatsapp_phone ||
        ''
      ) ||
      '201140526294'
    );
  }

  function ensureContactLinks() {
    const whatsapp =
      getWhatsAppNumber();

    const waLinks =
      document.querySelectorAll(
        '#waHero, #waLink'
      );

    waLinks.forEach(
      (link) => {
        if (
          !link ||
          !whatsapp
        ) {
          return;
        }

        /*
         * Only set WhatsApp if it is missing.
         * public-ui.js remains the primary owner.
         */

        if (
          !link.getAttribute(
            'href'
          )
        ) {
          link.setAttribute(
            'href',
            `https://wa.me/${whatsapp}`
          );
        }
      }
    );

    const maps =
      document.querySelector(
        '#mapsLink'
      );

    if (
      maps &&
      !maps.getAttribute(
        'href'
      )
    ) {
      maps.setAttribute(
        'href',
        'https://maps.app.goo.gl/6kta6eBxN7TH88ATA?g_st=ic'
      );
    }
  }

  /*
   * =========================================================
   * LANGUAGE EVENT OBSERVER
   * =========================================================
   */

  function observeLanguageChanges() {
    if (
      window.__AZAAD_LANGUAGE_OBSERVER__
    ) {
      return;
    }

    window.__AZAAD_LANGUAGE_OBSERVER__ =
      true;

    let lastLanguage =
      getLanguage();

    setInterval(
      () => {
        const current =
          getLanguage();

        if (
          current !==
          lastLanguage
        ) {
          lastLanguage =
            current;

          /*
           * public-ui.js handles the main
           * static translation.
           *
           * We handle dynamic content.
           */

          setTimeout(
            () => {
              translateDynamicUI();
              translatePlaceholders();
              translateButtons();
            },
            0
          );
        }
      },
      250
    );
  }

  /*
   * =========================================================
   * DOM MUTATION OBSERVER
   * =========================================================
   */

  function observeDynamicContent() {
    if (
      window.__AZAAD_DYNAMIC_UI_OBSERVER__
    ) {
      return;
    }

    window.__AZAAD_DYNAMIC_UI_OBSERVER__ =
      true;

    const observer =
      new MutationObserver(
        (mutations) => {
          if (!isEnglish()) {
            return;
          }

          let relevant = false;

          for (
            const mutation
            of mutations
          ) {
            if (
              mutation.type ===
              'childList'
            ) {
              relevant = true;
              break;
            }

            if (
              mutation.type ===
              'characterData'
            ) {
              relevant = true;
              break;
            }
          }

          if (!relevant) {
            return;
          }

          /*
           * Batch mutations so app.js can finish
           * rendering before translation occurs.
           */

          clearTimeout(
            window.__AZAAD_TRANSLATION_TIMER__
          );

          window.__AZAAD_TRANSLATION_TIMER__ =
            setTimeout(
              () => {
                translateDynamicUI();
                translatePlaceholders();
                translateButtons();
              },
              20
            );
        }
      );

    observer.observe(
      document.body,
      {
        subtree: true,
        childList: true,
        characterData: true
      }
    );
  }

  /*
   * =========================================================
   * PUBLIC UI LOADER
   * =========================================================
   */

  function publicUiAlreadyPresent() {
    return Boolean(
      window.AzaadClinicPublicUILoaded ||
      window.AzaadClinicPublicUI ||
      document.querySelector(
        'script[src*="public-ui.js"]'
      ) ||
      document.querySelector(
        'script[data-azaad-public-ui="true"]'
      )
    );
  }

  function markPublicUIReady() {
    state.publicUiBootstrapped =
      true;

    try {
      window.AzaadClinicPublicUILoaded =
        true;
    } catch (_) {}
  }

  function loadPublicUIIfNeeded() {
    /*
     * index.html already loads public-ui.js.
     * Never inject another copy.
     */

    if (
      publicUiAlreadyPresent()
    ) {
      markPublicUIReady();
      return;
    }

    if (
      document.querySelector(
        'script[data-azaad-public-ui-loader="true"]'
      )
    ) {
      return;
    }

    const script =
      document.createElement(
        'script'
      );

    script.src =
      'public-ui.js?v=1';

    script.async =
      false;

    script.dataset.azaadPublicUi =
      'true';

    script.dataset.azaadPublicUiLoader =
      'true';

    script.onload =
      () => {
        markPublicUIReady();

        setTimeout(
          () => {
            translateDynamicUI();
            translatePlaceholders();
            translateButtons();
          },
          50
        );
      };

    script.onerror =
      (error) => {
        console.error(
          'Azaad Clinic public UI failed to load:',
          error
        );
      };

    document.head.appendChild(
      script
    );
  }

  /*
   * =========================================================
   * INITIALIZATION
   * =========================================================
   */

  function initialize() {
    /*
     * Hard guard against duplicate initialization.
     */

    if (
      window[STATE_KEY]
    ) {
      return;
    }

    window[STATE_KEY] =
      true;

    /*
     * Compatibility state.
     */

    state.enabled =
      false;

    state.handledBy =
      'app.js';

    /*
     * Never interfere with booking.
     */

    loadPublicUIIfNeeded();

    /*
     * Install dynamic language layer.
     */

    if (
      !window[
        TRANSLATION_STATE_KEY
      ]
    ) {
      window[
        TRANSLATION_STATE_KEY
      ] = true;

      observeLanguageChanges();
      observeDynamicContent();
    }

    /*
     * Give app.js and public-ui.js time to
     * finish their initial rendering.
     */

    setTimeout(
      () => {
        ensureContactLinks();
        translateDynamicUI();
        translatePlaceholders();
        translateButtons();
      },
      100
    );

    setTimeout(
      () => {
        ensureContactLinks();
        translateDynamicUI();
        translatePlaceholders();
        translateButtons();
      },
      700
    );
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
      initialize,
      {
        once: true
      }
    );
  } else {
    initialize();
  }

})();
