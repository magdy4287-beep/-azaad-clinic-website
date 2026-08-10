const API =
  'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinic';

const $ = x => document.getElementById(x);

let chosen = '';
let currentLang =
  localStorage.getItem('azaad_lang') || 'ar';


/* =========================================================
   TRANSLATIONS
========================================================= */

const T = {

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

    heroBook: 'احجز جلستك الآن',

    heroWhatsapp: 'تواصل عبر واتساب',

    trustPrivacy: '✓ خصوصية كاملة',
    trustModes: '✓ حضوري وأونلاين',
    trustCare: '✓ رعاية متخصصة',

    aboutTitle:
      'مكان تستطيع فيه<br>أن تكون على طبيعتك.',

    aboutP1:
      'نؤمن أن طلب المساعدة خطوة قوة وليست ضعفًا. لذلك نوفر بيئة آمنة ومحترمة تساعدك على فهم التحديات النفسية والتعامل معها بخطوات عملية.',

    aboutP2:
      'هدفنا أن تحصل على رعاية نفسية مهنية، إنسانية، وسرية بالكامل.',

    servicesTitle: 'خدماتنا',

    servicesIntro:
      'خدمات نفسية مصممة لتناسب احتياجات كل شخص.',

    doctorsTitle: 'فريق العيادة',

    doctorsIntro:
      'متخصصون يعملون معك للوصول إلى حياة أكثر توازنًا.',

    bookingTitle: 'احجز موعدك',

    bookingIntro:
      'اختر الطبيب والخدمة والتاريخ والوقت المناسب لك.',

    doctorLabel: 'الطبيب',
    serviceLabel: 'الخدمة',
    dateLabel: 'التاريخ',
    modeLabel: 'نوع الجلسة',

    clinicMode: 'داخل العيادة',
    onlineMode: 'جلسة أونلاين',

    slotsLabel: 'المواعيد المتاحة',

    slotsHint:
      'اختر الطبيب والخدمة والتاريخ لعرض المواعيد المتاحة.',

    nameLabel: 'الاسم بالكامل',
    namePlaceholder: 'اكتب اسمك',

    phoneLabel: 'رقم الهاتف',
    phonePlaceholder: 'رقم الهاتف',

    emailLabel: 'البريد الإلكتروني',

    notesLabel: 'ملاحظات',
    notesPlaceholder: 'أي معلومات إضافية...',

    confirmBooking: 'تأكيد طلب الحجز',

    contactTitle: 'تواصل معنا',

    phoneContact: 'الهاتف',
    emailContact: 'البريد الإلكتروني',
    whatsappContact: 'واتساب',

    startChat: 'ابدأ المحادثة',

    rights: 'جميع الحقوق محفوظة.',

    chooseDoctor: 'اختر الطبيب',
    chooseService: 'اختر الخدمة',

    chooseDate:
      'اختر الطبيب والخدمة والتاريخ.',

    loadingSlots:
      'جاري تحميل المواعيد...',

    noSlots:
      'لا توجد مواعيد متاحة لهذا اليوم.',

    booked:
      'تم إرسال الحجز بنجاح. رقم الحجز: ',

    bookingReceived:
      'تم استلام طلب الحجز.',

    chooseSlot:
      'من فضلك اختر موعدًا.',

    loadError:
      'تعذر تحميل البيانات. يرجى المحاولة لاحقًا.',

    slotsError:
      'تعذر تحميل المواعيد.',

    minutes: 'دقيقة',

    locationTitle: 'موقع العيادة',

    openMaps:
      'فتح الموقع على Google Maps',

    shareLocation:
      'مشاركة موقع العيادة عبر WhatsApp'
  },


  en: {

    navHome: 'Home',
    navAbout: 'About',
    navServices: 'Services',
    navDoctors: 'Doctors',
    navBooking: 'Booking',
    navContact: 'Contact',

    bookNow: 'Book Appointment',

    heroTitle:
      'A Safe Space<br><span>to Begin Your Change</span>',

    heroText:
      'Specialized mental healthcare with empathy, complete privacy, and a care plan tailored to your needs.',

    heroBook: 'Book Your Session',

    heroWhatsapp: 'Chat on WhatsApp',

    trustPrivacy: '✓ Complete privacy',
    trustModes: '✓ In-clinic & online',
    trustCare: '✓ Specialized care',

    aboutTitle:
      'A place where you can<br>be yourself.',

    aboutP1:
      'We believe asking for help is a sign of strength. We provide a safe, respectful environment to understand mental health challenges and work through them with practical steps.',

    aboutP2:
      'Our goal is professional, compassionate, and fully confidential mental healthcare.',

    servicesTitle: 'Our Services',

    servicesIntro:
      'Mental health services designed around each person’s needs.',

    doctorsTitle: 'Our Team',

    doctorsIntro:
      'Specialists working with you toward a more balanced life.',

    bookingTitle: 'Book an Appointment',

    bookingIntro:
      'Choose your doctor, service, date, and preferred time.',

    doctorLabel: 'Doctor',
    serviceLabel: 'Service',
    dateLabel: 'Date',
    modeLabel: 'Session type',

    clinicMode: 'In-clinic',
    onlineMode: 'Online session',

    slotsLabel: 'Available times',

    slotsHint:
      'Choose a doctor, service, and date to see available times.',

    nameLabel: 'Full name',
    namePlaceholder: 'Enter your name',

    phoneLabel: 'Phone number',
    phonePlaceholder: 'Phone number',

    emailLabel: 'Email',

    notesLabel: 'Notes',
    notesPlaceholder: 'Any additional information...',

    confirmBooking: 'Confirm Booking Request',

    contactTitle: 'Contact Us',

    phoneContact: 'Phone',
    emailContact: 'Email',
    whatsappContact: 'WhatsApp',

    startChat: 'Start a conversation',

    rights: 'All rights reserved.',

    chooseDoctor: 'Choose doctor',
    chooseService: 'Choose service',

    chooseDate:
      'Choose a doctor, service, and date.',

    loadingSlots:
      'Loading available times...',

    noSlots:
      'No appointments are available for this day.',

    booked:
      'Booking submitted successfully. Booking number: ',

    bookingReceived:
      'Booking request received.',

    chooseSlot:
      'Please choose an appointment time.',

    loadError:
      'Unable to load clinic data. Please try again.',

    slotsError:
      'Unable to load appointments.',

    minutes: 'minutes',

    locationTitle: 'Clinic Location',

    openMaps:
      'Open Location in Google Maps',

    shareLocation:
      'Share Clinic Location via WhatsApp'
  }

};


/* =========================================================
   ENGLISH SERVICE TRANSLATIONS
========================================================= */

const SERVICE_EN = {

  'جلسة علاج نفسي فردية': {
    name: 'Individual Psychotherapy Session',
    description:
      'Individual session with one of our mental health specialists.'
  },

  'جلسة علاج نفسي جماعية': {
    name: 'Group Psychotherapy Session',
    description:
      'Group psychotherapy sessions.'
  },

  'جلسة أونلاين': {
    name: 'Online Therapy Session',
    description:
      'Remote mental health therapy session.'
  },

  'تقييم نفسي': {
    name: 'Psychological Assessment',
    description:
      'Initial psychological assessment and consultation.'
  }

};


/* =========================================================
   ENGLISH DOCTOR TRANSLATIONS
========================================================= */

const DOCTOR_EN = {

  'أ/ لميا مجدي': {
    name: 'Lamia Magdy',
    title: 'Psychotherapist',
    bio:
      'Psychotherapy sessions using CBT, DBT, ACT, MI, Counseling, and Schema Therapy. Individual, group, and online sessions.'
  },

  'د/ محمد أبو الخير': {
    name: 'Dr. Mohamed Abu Elkhair',
    title: 'Psychiatry Resident',
    bio:
      'Psychiatry Resident.'
  },

  'د/ علي باسل': {
    name: 'Dr. Ali Basel',
    title: 'Psychiatrist & Addiction Treatment Specialist',
    bio:
      'Psychiatrist and Addiction Treatment Specialist.'
  },

  'أ/ رحاب الصواف': {
    name: 'Rehab El Sawaf',
    title: 'Psychologist',
    bio:
      'Psychologist.'
  },

  'د/ أحمد إبراهيم': {
    name: 'Dr. Ahmed Ibrahim',
    title: 'Psychiatrist & Addiction Treatment Specialist',
    bio:
      'Psychiatrist and Addiction Treatment Specialist.'
  }

};


/* =========================================================
   HELPERS
========================================================= */

const esc = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[c])
  );


const tr = k =>
  T[currentLang][k] ||
  T.ar[k] ||
  k;


/* =========================================================
   API
========================================================= */

async function api(q, opt) {

  const r =
    await fetch(API + q, opt);

  let d = {};

  try {
    d = await r.json();
  } catch {}

  if (!r.ok)
    throw Error(
      d.error || 'Request failed'
    );

  return d;
}


/* =========================================================
   SERVICE TRANSLATION
========================================================= */

function getServiceText(service) {

  if (currentLang === 'ar') {

    return {
      name: service.name || '',
      description:
        service.description || ''
    };

  }

  const original =
    String(service.name || '').trim();

  const translated =
    SERVICE_EN[original];

  if (translated) {

    return translated;

  }

  return {
    name: original,
    description:
      service.description || ''
  };

}


/* =========================================================
   DOCTOR TRANSLATION
========================================================= */

function getDoctorText(doctor) {

  if (currentLang === 'ar') {

    return {
      name: doctor.name || '',
      title: doctor.title || '',
      bio: doctor.bio || ''
    };

  }

  const original =
    String(doctor.name || '').trim();

  const translated =
    DOCTOR_EN[original];

  if (translated) {

    return translated;

  }

  return {
    name: original,
    title: doctor.title || '',
    bio: doctor.bio || ''
  };

}


/* =========================================================
   LANGUAGE
========================================================= */

function applyLanguage() {

  document.documentElement.lang =
    currentLang;

  document.documentElement.dir =
    currentLang === 'ar'
      ? 'rtl'
      : 'ltr';


  document
    .querySelectorAll('[data-i18n]')
    .forEach(el => {

      const k =
        el.dataset.i18n;

      if (T[currentLang][k])
        el.innerHTML =
          T[currentLang][k];

    });


  document
    .querySelectorAll(
      '[data-i18n-placeholder]'
    )
    .forEach(el => {

      const k =
        el.dataset.i18nPlaceholder;

      if (T[currentLang][k])
        el.placeholder =
          T[currentLang][k];

    });


  document
    .querySelectorAll('.lang-btn')
    .forEach(b =>
      b.classList.toggle(
        'active',
        b.dataset.lang === currentLang
      )
    );


  document.title =
    currentLang === 'ar'
      ? 'Azaad Clinic | عيادة أزاد للصحة النفسية'
      : 'Azaad Clinic | Mental Health Clinic';


  if (
    $('slots') &&
    !chosen &&
    (
      !$('doctor').value ||
      !$('service').value
    )
  ) {

    $('slots').textContent =
      tr('chooseDate');

  }


  /*
    Re-render dynamic database content
    so doctors/services change language
    immediately when language changes.
  */

  if (
    window.clinicData
  ) {

    render(
      window.clinicData,
      false
    );

  }

}


/* =========================================================
   CHANGE LANGUAGE
========================================================= */

function setLanguage(lang) {

  currentLang =
    lang === 'en'
      ? 'en'
      : 'ar';

  localStorage.setItem(
    'azaad_lang',
    currentLang
  );


  applyLanguage();


  if (
    $('doctor').value &&
    $('service').value &&
    $('date').value
  ) {

    loadSlots();

  }


  $('nav')
    .classList
    .remove('mobile-open');

  $('menu')
    .setAttribute(
      'aria-expanded',
      'false'
    );

}


/* =========================================================
   RENDER DATA
========================================================= */

function render(d, resetSelectors = true) {

  window.clinicData = d;

  const services =
    d.services || [];

  const doctors =
    d.doctors || [];


  /* =========================
     SERVICES
  ========================= */

  $('servicesGrid').innerHTML =
    services.map(
      (x, i) => {

        const text =
          getServiceText(x);

        return `

        <article class="card">

          <div class="icon">
            ${['🧠','🌿','💙','🔎','✨'][i % 5]}
          </div>

          <h3>
            ${esc(text.name)}
          </h3>

          <p>
            ${esc(text.description)}
          </p>

          <p>
            ${x.duration_minutes || 30}
            ${esc(tr('minutes'))}
          </p>

        </article>

        `;

      }
    ).join('');


  /* =========================
     DOCTORS
  ========================= */

  $('doctorsGrid').innerHTML =
    doctors.map(
      x => {

        const text =
          getDoctorText(x);

        return `

        <article class="card">

          <div class="photo">

            ${
              x.image_url
                ? `
                  <img
                    src="${esc(x.image_url)}"
                    alt="${esc(text.name)}">
                  `
                : esc(
                    (text.name || 'A')[0]
                  )
            }

          </div>

          <h3>
            ${esc(text.name)}
          </h3>

          <p>
            <b>
              ${esc(text.title)}
            </b>
          </p>

          <p>
            ${esc(text.bio)}
          </p>

        </article>

        `;

      }
    ).join('');


  /*
     Keep currently selected doctor/service
     when switching language.
  */

  const oldDoctor =
    $('doctor').value;

  const oldService =
    $('service').value;


  /* =========================
     DOCTOR SELECT
  ========================= */

  $('doctor').innerHTML =
    `
      <option value="">
        ${esc(tr('chooseDoctor'))}
      </option>
    ` +
    doctors.map(
      x => {

        const text =
          getDoctorText(x);

        return `
          <option value="${esc(x.id)}">
            ${esc(text.name)}
            —
            ${esc(text.title)}
          </option>
        `;

      }
    ).join('');


  /* =========================
     SERVICE SELECT
  ========================= */

  $('service').innerHTML =
    `
      <option value="">
        ${esc(tr('chooseService'))}
      </option>
    ` +
    services.map(
      x => {

        const text =
          getServiceText(x);

        return `
          <option value="${esc(x.id)}">
            ${esc(text.name)}
          </option>
        `;

      }
    ).join('');


  /*
     Restore previous selections.
  */

  if (
    oldDoctor &&
    doctors.some(
      x => String(x.id) === String(oldDoctor)
    )
  ) {

    $('doctor').value =
      oldDoctor;

  }


  if (
    oldService &&
    services.some(
      x => String(x.id) === String(oldService)
    )
  ) {

    $('service').value =
      oldService;

  }


  /* =========================
     SETTINGS
  ========================= */

  const s =
    d.settings || {};


  if ($('phone')) {

    $('phone').textContent =
      s.phone || '—';

  }


  if ($('phoneLink')) {

    $('phoneLink').href =
      s.phone
        ? 'tel:' + s.phone
        : '#';

  }


  if ($('email')) {

    $('email').textContent =
      s.email || '—';

  }


  if ($('emailLink')) {

    $('emailLink').href =
      s.email
        ? 'mailto:' + s.email
        : '#';

  }


  const w =
    s.whatsapp
      ? `https://wa.me/${String(
          s.whatsapp
        ).replace(/\D/g, '')}`
      : '#';


  if ($('waLink'))
    $('waLink').href = w;


  if ($('waHero'))
    $('waHero').href = w;


  if ($('address'))
    $('address').textContent =
      s.address || '';


  /*
     Google Maps location
  */

  const mapsURL =
    'https://maps.app.goo.gl/6kta6eBxN7TH88ATA?g_st=ic';


  if ($('mapsLink')) {

    $('mapsLink').href =
      mapsURL;

  }


  /*
     WhatsApp location sharing
  */

  if ($('shareLocation')) {

    const message =
      currentLang === 'ar'
        ? '📍 موقع عيادة أزاد على Google Maps:\n' +
          mapsURL
        : '📍 Azaad Clinic location on Google Maps:\n' +
          mapsURL;

    $('shareLocation').href =
      'https://wa.me/?text=' +
      encodeURIComponent(message);

  }

}


/* =========================================================
   INITIALIZE
========================================================= */

async function init() {

  try {

    const d =
      await api('?api=data');


    window.clinicData = d;


    render(d);


    const now =
      new Date();

    now.setMinutes(
      now.getMinutes()
      -
      now.getTimezoneOffset()
    );


    $('date').min =
      now.toISOString()
        .slice(0, 10);

    $('date').value =
      now.toISOString()
        .slice(0, 10);


    applyLanguage();

  }

  catch (e) {

    $('servicesGrid').innerHTML =
      `
        <div class="loading">
          ${esc(tr('loadError'))}
        </div>
      `;

    $('doctorsGrid').innerHTML =
      `
        <div class="loading">
          ${esc(tr('loadError'))}
        </div>
      `;

  }

}


/* =========================================================
   LOAD AVAILABLE SLOTS
========================================================= */

async function loadSlots() {

  chosen = '';


  if (
    !$('doctor').value ||
    !$('service').value ||
    !$('date').value
  ) {

    $('slots').textContent =
      tr('chooseDate');

    return;

  }


  $('slots').textContent =
    tr('loadingSlots');


  try {

    const d =
      await api(
        `?api=slots` +
        `&doctor=${encodeURIComponent(
          $('doctor').value
        )}` +
        `&service=${encodeURIComponent(
          $('service').value
        )}` +
        `&date=${encodeURIComponent(
          $('date').value
        )}`
      );


    const slots =
      d.slots || [];


    $('slots').innerHTML =
      slots.map(
        t => `

        <button
          class="slot"
          type="button"
          data-t="${esc(t)}">

          ${esc(t)}

        </button>

        `
      ).join('')
      ||
      esc(tr('noSlots'));


    document
      .querySelectorAll('.slot')
      .forEach(b => {

        b.onclick = () => {

          document
            .querySelectorAll('.slot')
            .forEach(x =>
              x.classList.remove(
                'selected'
              )
            );

          b.classList.add(
            'selected'
          );

          chosen =
            b.dataset.t;

        };

      });

  }

  catch (e) {

    $('slots').textContent =
      tr('slotsError');

  }

}


/* =========================================================
   BOOKING
========================================================= */

$('bookingForm').onsubmit =
  async e => {

    e.preventDefault();


    if (!chosen) {

      $('message').textContent =
        tr('chooseSlot');

      $('message').style.color =
        '#a13a3a';

      return;

    }


    try {

      const d =
        await api(
          '?api=book',
          {

            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({

              doctor_id:
                $('doctor').value,

              service_id:
                $('service').value,

              appointment_date:
                $('date').value,

              appointment_time:
                chosen,

              mode:
                $('mode').value,

              patient_name:
                $('name').value,

              patient_phone:
                $('phone').value,

              patient_email:
                $('email').value,

              notes:
                $('notes').value,

              patient_language:
                currentLang

            })

          }
        );


      $('message').textContent =
        tr('booked') +
        (
          d.booking_code ||
          'AZD-' +
          Math.floor(
            100000 +
            Math.random() * 900000
          )
        );


      $('message').style.color =
        '#16734a';


      $('bookingForm').reset();

      chosen = '';


      /*
         Restore today's date after reset
      */

      const now =
        new Date();

      now.setMinutes(
        now.getMinutes()
        -
        now.getTimezoneOffset()
      );

      $('date').value =
        now.toISOString()
          .slice(0, 10);


      $('slots').textContent =
        tr('bookingReceived');

    }

    catch (e) {

      $('message').textContent =
        e.message ||
        tr('loadError');

      $('message').style.color =
        '#a13a3a';

    }

  };


/* =========================================================
   EVENTS
========================================================= */

[
  'doctor',
  'service',
  'date'
].forEach(
  id =>
    $(id).onchange =
      loadSlots
);


$('year').textContent =
  new Date().getFullYear();


document
  .querySelectorAll('.lang-btn')
  .forEach(
    b =>
      b.onclick =
        () =>
          setLanguage(
            b.dataset.lang
          )
  );


$('menu').onclick = () => {

  const open =
    $('nav')
      .classList
      .toggle(
        'mobile-open'
      );

  $('menu')
    .setAttribute(
      'aria-expanded',
      String(open)
    );

};


document
  .querySelectorAll('#nav a')
  .forEach(
    a =>
      a.onclick =
        () => {

          $('nav')
            .classList
            .remove(
              'mobile-open'
            );

          $('menu')
            .setAttribute(
              'aria-expanded',
              'false'
            );

        }
  );


/* =========================================================
   START
========================================================= */

applyLanguage();

init();
