(() => {
  'use strict';

  /*
   * AZAAD PUBLIC CENTRAL I18N BRIDGE v2
   *
   * Central i18n owns locale state. This bridge is the single public
   * presentation owner: it renders keyed public copy deterministically,
   * keeps RTL/LTR atomic, and re-renders public content after a locale
   * change. It deliberately does not create another language state.
   */

  const KEY = 'azaadClinicLanguage';
  const STATE_KEY = '__AZAAD_PUBLIC_CENTRAL_I18N_BRIDGE_V2__';
  if (window[STATE_KEY]) return;
  window[STATE_KEY] = true;

  const COPY = {
    navHome: ['الرئيسية', 'Home'],
    navAbout: ['عن العيادة', 'About'],
    navServices: ['الخدمات', 'Services'],
    navDoctors: ['الأطباء', 'Our Team'],
    navBooking: ['الحجز', 'Booking'],
    navContact: ['تواصل معنا', 'Contact'],
    bookNow: ['احجز موعدك', 'Book an appointment'],
    heroTitle: ['مساحة آمنة\nلبداية التغيير', 'A safe space\nfor a new beginning'],
    heroText: ['رعاية نفسية متخصصة باهتمام إنساني، وخصوصية كاملة، وخطة علاجية تناسب احتياجاتك.', 'Specialized mental health care with human attention, complete privacy, and a treatment plan tailored to your needs.'],
    heroBook: ['احجز جلستك الآن', 'Book your session'],
    heroWhatsapp: ['تواصل عبر واتساب', 'Contact us on WhatsApp'],
    trustPrivacy: ['✓ خصوصية كاملة', '✓ Complete privacy'],
    trustModes: ['✓ حضوري وأونلاين', '✓ In-clinic & online'],
    trustCare: ['✓ رعاية متخصصة', '✓ Specialized care'],
    aboutTitle: ['مكان تستطيع فيه\nأن تكون على طبيعتك.', 'A place where you\ncan be yourself.'],
    aboutP1: ['نؤمن أن طلب المساعدة خطوة قوة وليست ضعفًا. لذلك نوفر بيئة آمنة ومحترمة تساعدك على فهم التحديات النفسية والتعامل معها بخطوات عملية.', 'We believe asking for help is a sign of strength, not weakness. We provide a safe, respectful environment that helps you understand mental health challenges and work through them with practical steps.'],
    aboutP2: ['هدفنا أن تحصل على رعاية نفسية مهنية، إنسانية، وسرية بالكامل.', 'Our goal is to provide professional, human, and completely confidential mental health care.'],
    servicesTitle: ['خدماتنا', 'Our Services'],
    servicesIntro: ['خدمات نفسية مصممة لتناسب احتياجات كل شخص.', 'Mental health services designed around each person’s needs.'],
    doctorsTitle: ['فريق العيادة', 'Our Team'],
    doctorsIntro: ['متخصصون يعملون معك للوصول إلى حياة أكثر توازنًا.', 'Specialists working with you toward a more balanced life.'],
    bookingTitle: ['احجز موعدك', 'Book Your Appointment'],
    bookingIntro: ['اختر الطبيب والخدمة والتاريخ والوقت المناسب لك.', 'Choose the doctor, service, date, and time that work for you.'],
    doctorLabel: ['الطبيب', 'Doctor'],
    doctorPlaceholder: ['اختر الطبيب', 'Select doctor'],
    serviceLabel: ['الخدمة', 'Service'],
    servicePlaceholder: ['اختر الخدمة', 'Select service'],
    dateLabel: ['التاريخ', 'Date'],
    modeLabel: ['نوع الجلسة', 'Session type'],
    clinicMode: ['داخل العيادة', 'In-clinic'],
    onlineMode: ['جلسة أونلاين', 'Online session'],
    slotsLabel: ['المواعيد المتاحة', 'Available appointments'],
    slotsPlaceholder: ['اختر الطبيب والخدمة والتاريخ لعرض المواعيد المتاحة.', 'Choose a doctor, service, and date to view available appointments.'],
    nameLabel: ['الاسم بالكامل', 'Full name'],
    namePlaceholder: ['اكتب اسمك', 'Enter your name'],
    phoneLabel: ['رقم الهاتف', 'Phone number'],
    phonePlaceholder: ['رقم الهاتف', 'Phone number'],
    emailLabel: ['البريد الإلكتروني', 'Email'],
    notesLabel: ['ملاحظات', 'Notes'],
    notesPlaceholder: ['أي معلومات إضافية...', 'Any additional information…'],
    confirmBooking: ['تأكيد طلب الحجز', 'Confirm booking request'],
    contactTitle: ['تواصل معنا', 'Contact us'],
    phoneContact: ['الهاتف', 'Phone'],
    emailContact: ['البريد الإلكتروني', 'Email'],
    whatsappContact: ['واتساب', 'WhatsApp'],
    startChat: ['ابدأ المحادثة', 'Start chat'],
    locationTitle: ['موقع العيادة', 'Clinic location'],
    openMaps: ['فتح الموقع على Google Maps', 'Open location in Google Maps'],
    shareLocation: ['📲 مشاركة الموقع الإلكتروني للعيادة عبر WhatsApp', '📲 Share clinic website via WhatsApp'],
    rights: ['جميع الحقوق محفوظة.', 'All rights reserved.'],
    loading: ['جاري التحميل...', 'Loading...']
  };

  const EXACT = new Map();
  for (const [key, pair] of Object.entries(COPY)) {
    EXACT.set(pair[0].replace(/\s+/g, ' ').trim(), pair[1]);
    EXACT.set(pair[1].replace(/\s+/g, ' ').trim(), pair[0]);
  }
  Object.assign(EXACT, {
    'CONTACT': 'تواصل معنا',
    'تواصل معنا': 'CONTACT',
    'Phone': 'الهاتف',
    'الهاتف': 'Phone',
    'WhatsApp': 'واتساب',
    'واتساب': 'WhatsApp',
    'APPOINTMENT': 'الحجز',
    'الحجز': 'APPOINTMENT',
    'OUR TEAM': 'فريق العيادة',
    'فريق العيادة': 'OUR TEAM',
    'OUR SERVICES': 'خدماتنا',
    'خدماتنا': 'OUR SERVICES',
    'ABOUT AZAAD PSYCHOTHERAPY': 'عن عيادة آزاد للعلاج النفسي',
    'عن عيادة آزاد للعلاج النفسي': 'ABOUT AZAAD PSYCHOTHERAPY',
    'AZAAD PSYCHOTHERAPY • MENTAL HEALTH': 'آزاد للعلاج النفسي • الصحة النفسية',
    'آزاد للعلاج النفسي • الصحة النفسية': 'AZAAD PSYCHOTHERAPY • MENTAL HEALTH',
    'AZAAD CLINIC': 'عيادة آزاد',
    'عيادة آزاد': 'AZAAD CLINIC',
    'Damietta - Nafea Street, opposite Al-Mazloum Mosque, above Al-Riyad Pharmacy': 'دمياط - شارع نافع، مقابل مسجد المظلوم - أعلى صيدلية الرياض',
    'دمياط - شارع نافع، مقابل مسجد المظلوم - أعلى صيدلية الرياض': 'Damietta - Nafea Street, opposite Al-Mazloum Mosque, above Al-Riyad Pharmacy',
    'Load failed': 'تعذر التحميل',
    'تعذر التحميل': 'Load failed'
  });

  function language() {
    const central = window.AZAAD_I18N?.language;
    if (typeof central === 'function') {
      const value = central();
      if (value === 'ar' || value === 'en') return value;
    }
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'ar' || saved === 'en') return saved;
    } catch (_) {}
    return document.documentElement.lang?.toLowerCase().startsWith('en') ? 'en' : 'ar';
  }

  function pairValue(key, lang) {
    const pair = COPY[key];
    return pair ? pair[lang === 'en' ? 1 : 0] : null;
  }

  function normalize(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function isOwnedPublicContent(el) {
    return !!el.closest?.('#servicesGrid,#doctorsGrid,#clinicPostsGrid,.clinic-service-card,.clinic-doctor-card,.clinic-post-card');
  }

  function apply(root = document) {
    const lang = language();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.documentElement.dataset.language = lang;
    document.documentElement.dataset.publicContentLanguage = lang;

    const keyed = [];
    if (root.nodeType === Node.ELEMENT_NODE && root.hasAttribute('data-i18n')) keyed.push(root);
    root.querySelectorAll?.('[data-i18n]').forEach(el => keyed.push(el));
    for (const el of keyed) {
      const value = pairValue(el.getAttribute('data-i18n'), lang);
      if (value !== null) el.textContent = value;
    }

    const attrs = [];
    if (root.nodeType === Node.ELEMENT_NODE && root.matches?.('[data-i18n-placeholder]')) attrs.push(root);
    root.querySelectorAll?.('[data-i18n-placeholder]').forEach(el => attrs.push(el));
    for (const el of attrs) {
      const value = pairValue(el.getAttribute('data-i18n-placeholder'), lang);
      if (value !== null) el.setAttribute('placeholder', value);
    }

    if (root === document || root === document.body) {
      const description = document.querySelector('meta[name="description"]');
      if (description) description.content = lang === 'en'
        ? 'Azaad Psychotherapy Clinic — specialized mental health care with privacy and compassionate support.'
        : 'عيادة آزاد للعلاج النفسي — رعاية نفسية متخصصة وآمنة بخصوصية كاملة.';
      document.title = lang === 'en' ? 'Azaad Psychotherapy | Mental Health' : 'آزاد للعلاج النفسي | الصحة النفسية';
    }

    // Translate only known public chrome. Never rewrite doctor names, patient data,
    // posts, or API content here; those are rendered by their public content owner.
    if (root.querySelectorAll || root.nodeType === Node.ELEMENT_NODE) {
      const walkerRoot = root.nodeType === Node.ELEMENT_NODE ? root : document.body;
      const walker = document.createTreeWalker(walkerRoot, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const parent = node.parentElement;
        if (!parent || parent.closest('script,style,textarea,[data-no-i18n]') || isOwnedPublicContent(parent)) continue;
        const normalized = normalize(node.nodeValue);
        if (!normalized) continue;
        const translated = EXACT.get(normalized);
        if (!translated) continue;
        const desired = lang === 'en'
          ? (COPY[Object.keys(COPY).find(k => COPY[k][0] === normalized)]?.[1] || translated)
          : (COPY[Object.keys(COPY).find(k => COPY[k][1] === normalized)]?.[0] || translated);
        if (desired !== normalized) node.nodeValue = node.nodeValue.replace(normalized, desired);
      }
    }
  }

  function rerenderOwnedContent() {
    const state = window.__AZAAD_CLINIC_POSTS_V6__;
    if (!state) return;
    state.language = language();
    if (typeof window.AZAAD_PUBLIC_RERENDER === 'function') {
      window.AZAAD_PUBLIC_RERENDER();
    } else {
      window.dispatchEvent(new CustomEvent('azaadPublicContentLanguageChanged', { detail: { language: language() } }));
    }
    setTimeout(() => apply(document.body), 80);
  }

  let applying = false;
  let observer;
  function schedule() {
    if (applying) return;
    applying = true;
    requestAnimationFrame(() => {
      try {
        apply(document.body);
        rerenderOwnedContent();
      } finally {
        applying = false;
      }
    });
  }

  window.addEventListener('azaadLanguageChanged', schedule);
  window.addEventListener('storage', event => {
    if (event.key === KEY) schedule();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  observer = new MutationObserver(mutations => {
    if (applying) return;
    let relevant = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        relevant = true;
        break;
      }
      if (mutation.type === 'characterData') {
        const parent = mutation.target.parentElement;
        if (parent && !isOwnedPublicContent(parent)) {
          relevant = true;
          break;
        }
      }
    }
    if (relevant) setTimeout(() => apply(document.body), 0);
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  window.AZAAD_PUBLIC_I18N = Object.freeze({
    version: '2.0.0',
    language,
    apply,
    rerender: rerenderOwnedContent
  });
})();