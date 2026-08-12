(() => {
  'use strict';

  /* =========================================================
     AZAAD CLINIC — PUBLIC UI
     Responsibilities:
     ☰ Mobile navigation
     🇪🇬 Arabic / 🇬🇧 English
     📱 WhatsApp contact
     📍 Google Maps + WhatsApp location sharing
     📞 Phone / ✉️ Email links

     IMPORTANT:
     - Does NOT submit bookings.
     - Does NOT modify app.js booking logic.
     - Uses only public clinic settings already exposed by the
       public clinic API / clinic-posts.js.
     ========================================================= */

  const WEBSITE_URL =
    'https://magdy4287-beep.github.io/-azaad-clinic-website/';

  const MAPS_URL =
    'https://maps.app.goo.gl/6kta6eBxN7TH88ATA?g_st=ic';

  const DEFAULT_WHATSAPP = '201140526294';

  const I18N = {
    ar: {
      navHome: 'الرئيسية',
      navAbout: 'عن العيادة',
      navServices: 'الخدمات',
      navDoctors: 'الأطباء',
      navBooking: 'الحجز',
      navContact: 'تواصل معنا',
      bookNow: 'احجز موعدك',

      heroTitle:
        'مساحة آمنة<br><span>لبداية التغيير</span>',

      heroText:
        'رعاية نفسية متخصصة باهتمام إنساني، وخصوصية كاملة، وخطة علاجية تناسب احتياجاتك.',

      heroBook:
        'احجز جلستك الآن',

      heroWhatsapp:
        'تواصل عبر واتساب',

      trustPrivacy:
        '✓ خصوصية كاملة',

      trustModes:
        '✓ حضوري وأونلاين',

      trustCare:
        '✓ رعاية متخصصة',

      aboutTitle:
        'مكان تستطيع فيه<br>أن تكون على طبيعتك.',

      aboutP1:
        'نؤمن أن طلب المساعدة خطوة قوة وليست ضعفًا. لذلك نوفر بيئة آمنة ومحترمة تساعدك على فهم التحديات النفسية والتعامل معها بخطوات عملية.',

      aboutP2:
        'هدفنا أن تحصل على رعاية نفسية مهنية، إنسانية، وسرية بالكامل.',

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

      contactTitle:
        'تواصل معنا',

      phoneContact:
        'الهاتف',

      emailContact:
        'البريد الإلكتروني',

      whatsappContact:
        'واتساب',

      startChat:
        'ابدأ المحادثة',

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

      heroTitle:
        'A safe space<br><span>to begin change</span>',

      heroText:
        'Specialized mental health care with human attention, complete privacy, and a treatment plan tailored to your needs.',

      heroBook:
        'Book Your Session',

      heroWhatsapp:
        'Contact us on WhatsApp',

      trustPrivacy:
        '✓ Complete privacy',

      trustModes:
        '✓ In-person & online',

      trustCare:
        '✓ Specialized care',

      aboutTitle:
        'A place where<br>you can be yourself.',

      aboutP1:
        'We believe asking for help is a sign of strength, not weakness. We provide a safe and respectful environment to understand mental health challenges and work through them with practical steps.',

      aboutP2:
        'Our goal is to provide professional, human, and completely confidential mental health care.',

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

      contactTitle:
        'Contact Us',

      phoneContact:
        'Phone',

      emailContact:
        'Email',

      whatsappContact:
        'WhatsApp',

      startChat:
        'Start a conversation',

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

  let currentLang = 'ar';

  const $ = (id) =>
    document.getElementById(id);

  function normalizeDigits(value) {
    return String(value || '')
      .replace(/\D/g, '');
  }

  function getPublicData() {
    return (
      window.AZAAD_PUBLIC_CLINIC_DATA ||
      {}
    );
  }

  function getSettings() {
    return (
      getPublicData().settings ||
      {}
    );
  }

  function setting(...keys) {
    const settings =
      getSettings();

    for (const key of keys) {
      const value =
        settings?.[key];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim()
      ) {
        return String(value).trim();
      }
    }

    return '';
  }

  function getWhatsApp() {
    return normalizeDigits(
      setting(
        'whatsapp',
        'whatsapp_number',
        'whatsapp_phone',
        'phone_whatsapp'
      ) ||
      DEFAULT_WHATSAPP
    );
  }

  function getPhone() {
    return setting(
      'phone',
      'phone_number',
      'clinic_phone',
      'contact_phone'
    );
  }

  function getEmail() {
    return setting(
      'email',
      'clinic_email',
      'contact_email'
    );
  }

  function getAddress() {
    return (
      setting(
        'address',
        'clinic_address',
        'location',
        'clinic_location'
      ) ||
      'دمياط - شارع نافع، مقابل مسجد المظلوم - أعلى صيدلية الرياض'
    );
  }

  function applyLanguage(
    lang,
    persist = true
  ) {
    currentLang =
      lang === 'en'
        ? 'en'
        : 'ar';

    const dictionary =
      I18N[currentLang];

    document.documentElement.lang =
      currentLang;

    document.documentElement.dir =
      currentLang === 'ar'
        ? 'rtl'
        : 'ltr';

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
            Object.prototype.hasOwnProperty.call(
              dictionary,
              key
            )
          ) {
            element.innerHTML =
              dictionary[key];
          }
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

    document
      .querySelectorAll(
        '[data-lang]'
      )
      .forEach(
        (button) => {
          const active =
            button.getAttribute(
              'data-lang'
            ) === currentLang;

          button.classList.toggle(
            'active',
            active
          );

          button.setAttribute(
            'aria-pressed',
            active
              ? 'true'
              : 'false'
          );
        }
      );

    const menu =
      $('menu');

    if (menu) {
      menu.setAttribute(
        'aria-label',
        currentLang === 'ar'
          ? 'القائمة'
          : 'Menu'
      );
    }

    if (persist) {
      try {
        localStorage.setItem(
          'azaadClinicLanguage',
          currentLang
        );
      } catch (_) {}
    }

    updateContactLinks();
  }

  function readInitialLanguage() {
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

  function closeMobileMenu() {
    const nav =
      $('nav');

    const menu =
      $('menu');

    if (!nav) {
      return;
    }

    nav.classList.remove(
      'mobile-open'
    );

    if (menu) {
      menu.setAttribute(
        'aria-expanded',
        'false'
      );

      menu.textContent =
        '☰';
    }
  }

  function setupMobileMenu() {
    const nav =
      $('nav');

    const menu =
      $('menu');

    if (
      !nav ||
      !menu
    ) {
      return;
    }

    menu.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        const open =
          nav.classList.toggle(
            'mobile-open'
          );

        menu.setAttribute(
          'aria-expanded',
          open
            ? 'true'
            : 'false'
        );

        menu.textContent =
          open
            ? '✕'
            : '☰';
      }
    );

    nav
      .querySelectorAll('a')
      .forEach(
        (link) => {
          link.addEventListener(
            'click',
            () => {
              closeMobileMenu();
            }
          );
        }
      );

    document.addEventListener(
      'click',
      (event) => {
        if (
          !nav.classList.contains(
            'mobile-open'
          )
        ) {
          return;
        }

        if (
          nav.contains(
            event.target
          ) ||
          menu.contains(
            event.target
          )
        ) {
          return;
        }

        closeMobileMenu();
      }
    );

    window.addEventListener(
      'resize',
      () => {
        if (
          window.innerWidth >
          900
        ) {
          closeMobileMenu();
        }
      }
    );
  }

  function updateContactLinks() {
    const whatsapp =
      getWhatsApp();

    const phone =
      getPhone();

    const email =
      getEmail();

    const address =
      getAddress();

    const phoneLink =
      $('phoneLink');

    const phoneText =
      $('contactPhone');

    const emailLink =
      $('emailLink');

    const emailText =
      $('contactEmail');

    const waLink =
      $('waLink');

    const waHero =
      $('waHero');

    const mapsLink =
      $('mapsLink');

    const shareLocation =
      $('shareLocation');

    const addressElement =
      $('address');

    if (phoneText) {
      phoneText.textContent =
        phone || '—';
    }

    if (emailText) {
      emailText.textContent =
        email || '—';
    }

    if (addressElement) {
      addressElement.textContent =
        address;
    }

    if (phoneLink) {
      phoneLink.href =
        phone
          ? `tel:${phone.replace(
              /[^\d+]/g,
              ''
            )}`
          : '#contact';

      phoneLink.setAttribute(
        'aria-disabled',
        phone
          ? 'false'
          : 'true'
      );
    }

    if (emailLink) {
      emailLink.href =
        email
          ? `mailto:${email}`
          : '#contact';

      emailLink.setAttribute(
        'aria-disabled',
        email
          ? 'false'
          : 'true'
      );
    }

    const waMessage =
      currentLang === 'en'
        ? 'Hello Azaad Clinic, I would like to ask about an appointment.'
        : 'مرحبًا عيادة أزاد، أود الاستفسار عن حجز موعد.';

    const waUrl =
      `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        waMessage
      )}`;

    if (waLink) {
      waLink.href =
        waUrl;
    }

    if (waHero) {
      waHero.href =
        waUrl;
    }

    if (mapsLink) {
      mapsLink.href =
        MAPS_URL;

      mapsLink.target =
        '_blank';

      mapsLink.rel =
        'noopener noreferrer';
    }

    if (shareLocation) {
      const locationMessage =
        currentLang === 'en'
          ? `📍 Azaad Clinic location:\n${address}\n\n${MAPS_URL}`
          : `📍 موقع عيادة أزاد:\n${address}\n\n${MAPS_URL}`;

      shareLocation.href =
        `https://wa.me/${whatsapp}?text=${encodeURIComponent(
          locationMessage
        )}`;

      shareLocation.target =
        '_blank';

      shareLocation.rel =
        'noopener noreferrer';
    }
  }

  function setupLanguageSwitch() {
    document
      .querySelectorAll(
        '[data-lang]'
      )
      .forEach(
        (button) => {
          button.addEventListener(
            'click',
            (event) => {
              event.preventDefault();

              applyLanguage(
                button.getAttribute(
                  'data-lang'
                )
              );
            }
          );
        }
      );
  }

  function refreshPublicSettings(
    attempt = 0
  ) {
    updateContactLinks();

    if (attempt >= 10) {
      return;
    }

    if (
      !window.AZAAD_PUBLIC_CLINIC_DATA
    ) {
      window.setTimeout(
        () =>
          refreshPublicSettings(
            attempt + 1
          ),
        500
      );
    }
  }

  function initialize() {
    setupMobileMenu();

    setupLanguageSwitch();

    applyLanguage(
      readInitialLanguage(),
      false
    );

    updateContactLinks();

    refreshPublicSettings();

    const year =
      $('year');

    if (year) {
      year.textContent =
        String(
          new Date().getFullYear()
        );
    }
  }

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
