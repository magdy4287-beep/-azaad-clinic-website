const API =
  'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinic';

const GOOGLE_MAPS_URL =
  'https://maps.app.goo.gl/6kta6eBxN7TH88ATA?g_st=ic';

const $ = id => document.getElementById(id);

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
    trackBooking: 'تتبع الحجز',

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

    locationTitle: 'موقع العيادة',
    openMaps: 'فتح الموقع على Google Maps',
    shareLocation: 'مشاركة موقع العيادة عبر WhatsApp',

    address:
      'دمياط - شارع نافع، مقابل مسجد المظلوم - أعلى صيدلية الرياض',

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
      'تم إرسال الحجز بنجاح. رقم الحجز:',

    bookingReceived:
      'تم استلام طلب الحجز.',

    chooseSlot:
      'من فضلك اختر موعدًا.',

    loadError:
      'تعذر تحميل البيانات. يرجى المحاولة لاحقًا.',

    slotsError:
      'تعذر تحميل المواعيد.'

  },


  en: {

    navHome: 'Home',
    navAbout: 'About',
    navServices: 'Services',
    navDoctors: 'Doctors',
    navBooking: 'Booking',
    navContact: 'Contact',
    trackBooking: 'Track Booking',

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

    locationTitle: 'Clinic Location',
    openMaps: 'Open in Google Maps',
    shareLocation: 'Share Clinic Location via WhatsApp',

    address:
      'Damietta – Nafea Street, opposite Al-Mazloum Mosque, above Al-Riyadh Pharmacy',

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
      'Booking submitted successfully. Booking number:',

    bookingReceived:
      'Booking request received.',

    chooseSlot:
      'Please choose an appointment time.',

    loadError:
      'Unable to load clinic data. Please try again.',

    slotsError:
      'Unable to load appointments.'

  }

};


/* =========================================================
   SERVICE TRANSLATIONS
========================================================= */

const SERVICE_TRANSLATIONS = {

  'جلسة علاج نفسي فردية': {
    name:
      'Individual Psychotherapy Session',
    description:
      'One-on-one session with a mental health professional'
  },

  'جلسة فردية مع أحد المتخصصين': {
    name:
      'Individual Psychotherapy Session',
    description:
      'One-on-one session with a mental health professional'
  },

  'جلسة علاج نفسي جماعية': {
    name:
      'Group Psychotherapy Session',
    description:
      'Group psychotherapy sessions'
  },

  'جلسات علاج نفسي جماعي': {
    name:
      'Group Psychotherapy Session',
    description:
      'Group psychotherapy sessions'
  },

  'جلسة أونلاين': {
    name:
      'Online Therapy Session',
    description:
      'Remote mental health therapy session'
  },

  'جلسة علاج نفسي عن بُعد': {
    name:
      'Online Therapy Session',
    description:
      'Remote mental health therapy session'
  },

  'تقييم نفسي': {
    name:
      'Psychological Assessment',
    description:
      'Initial Psychological Assessment & Consultation'
  },

  'تقييم ومقابلة نفسية أولية': {
    name:
      'Psychological Assessment',
    description:
      'Initial Psychological Assessment & Consultation'
  }

};


/* =========================================================
   DOCTOR TRANSLATIONS
========================================================= */

const DOCTOR_TRANSLATIONS = {

  'أ/ لميا مجدي': {
    name:
      'Lamya Magdy',
    title:
      'Psychotherapist',
    bio:
      'Psychotherapy sessions using CBT, DBT, ACT, MI, Counseling and Schema Therapy, available individually, in groups and online.'
  },

  'د/ محمد أبو الخير': {
    name:
      'Dr. Mohamed Abu El-Kheir',
    title:
      'Psychiatry Resident',
    bio:
      'Psychiatry Resident.'
  },

  'د/ علي باسل': {
    name:
      'Dr. Ali Basel',
    title:
      'Psychiatry & Addiction Treatment Specialist',
    bio:
      'Specialist in psychiatry and addiction treatment.'
  },

  'أ/ رحاب الصواف': {
    name:
      'Rehab El-Sawaf',
    title:
      'Psychologist',
    bio:
      'Psychologist.'
  },

  'د/ أحمد إبراهيم': {
    name:
      'Dr. Ahmed Ibrahim',
    title:
      'Psychiatry & Addiction Treatment Specialist',
    bio:
      'Specialist in psychiatry and addiction treatment.'
  }

};


/* =========================================================
   HELPERS
========================================================= */

const esc = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char])
  );


const tr = key =>
  T[currentLang]?.[key] ||
  T.ar[key] ||
  key;


/*
  Finds an English translation using the Arabic text
  already stored in Supabase.
*/

function translatedService(service) {

  if(currentLang === 'ar') {
    return {
      name:
        service.name || '',
      description:
        service.description || ''
    };
  }


  const key =
    Object.keys(
      SERVICE_TRANSLATIONS
    ).find(
      x =>
        x.trim() ===
        String(
          service.name || ''
        ).trim()
    );


  if(key) {

    return {
      name:
        SERVICE_TRANSLATIONS[key].name,

      description:
        SERVICE_TRANSLATIONS[key]
          .description
    };

  }


  return {
    name:
      service.name || '',

    description:
      service.description || ''
  };

}


function translatedDoctor(doctor) {

  if(currentLang === 'ar') {

    return {
      name:
        doctor.name || '',

      title:
        doctor.title || '',

      bio:
        doctor.bio || ''
    };

  }


  const key =
    Object.keys(
      DOCTOR_TRANSLATIONS
    ).find(
      x =>
        x.trim() ===
        String(
          doctor.name || ''
        ).trim()
    );


  if(key) {

    return {
      name:
        DOCTOR_TRANSLATIONS[key].name,

      title:
        DOCTOR_TRANSLATIONS[key].title,

      bio:
        DOCTOR_TRANSLATIONS[key].bio
    };

  }


  return {
    name:
      doctor.name || '',

    title:
      doctor.title || '',

    bio:
      doctor.bio || ''
  };

}


/* =========================================================
   API
========================================================= */

async function api(query, options = {}) {

  const response =
    await fetch(
      API + query,
      options
    );


  let data = {};

  try {
    data =
      await response.json();
  }
  catch {}


  if(!response.ok) {

    throw new Error(
      data.error ||
      'Request failed'
    );

  }


  return data;

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
    .querySelectorAll(
      '[data-i18n]'
    )
    .forEach(element => {

      const key =
        element.dataset.i18n;

      if(T[currentLang]?.[key]) {

        element.innerHTML =
          T[currentLang][key];

      }

    });


  document
    .querySelectorAll(
      '[data-i18n-placeholder]'
    )
    .forEach(element => {

      const key =
        element.dataset
          .i18nPlaceholder;

      if(T[currentLang]?.[key]) {

        element.placeholder =
          T[currentLang][key];

      }

    });


  document
    .querySelectorAll(
      '.lang-btn'
    )
    .forEach(button => {

      button.classList.toggle(
        'active',
        button.dataset.lang ===
        currentLang
      );

    });


  document.title =
    currentLang === 'ar'
      ? 'Azaad Clinic | عيادة أزاد للصحة النفسية'
      : 'Azaad Clinic | Mental Health Clinic';


  if($('slots') && !chosen) {

    if(
      !$('doctor')?.value ||
      !$('service')?.value
    ) {

      $('slots').textContent =
        tr('chooseDate');

    }

  }

}


function setLanguage(language) {

  currentLang =
    language === 'en'
      ? 'en'
      : 'ar';


  localStorage.setItem(
    'azaad_lang',
    currentLang
  );


  applyLanguage();


  if(
    $('doctor')?.value &&
    $('service')?.value &&
    $('date')?.value
  ) {

    loadSlots();

  }

}


/* =========================================================
   RENDER DATA
========================================================= */

function render(data) {

  const services =
    data.services || [];

  const doctors =
    data.doctors || [];


  /* ================= SERVICES ================= */

  if($('servicesGrid')) {

    $('servicesGrid').innerHTML =
      services.map(
        (service, index) => {

          const s =
            translatedService(
              service
            );


          return `

            <article class="card">

              <div class="icon">
                ${
                  [
                    '🧠',
                    '🌿',
                    '💙',
                    '🔎',
                    '✨'
                  ][index % 5]
                }
              </div>

              <h3>
                ${esc(s.name)}
              </h3>

              <p>
                ${esc(s.description)}
              </p>

              <p>
                <strong>
                  ${
                    service.duration_minutes ||
                    30
                  }
                </strong>

                ${
                  currentLang === 'ar'
                    ? ' دقيقة'
                    : ' minutes'
                }
              </p>

            </article>

          `;

        }
      ).join('');

  }


  /* ================= DOCTORS ================= */

  if($('doctorsGrid')) {

    $('doctorsGrid').innerHTML =
      doctors.map(
        doctor => {

          const d =
            translatedDoctor(
              doctor
            );


          return `

            <article class="card">

              <div class="photo">

                ${
                  doctor.image_url
                    ? `
                      <img
                        src="${esc(
                          doctor.image_url
                        )}"
                        alt="${esc(
                          d.name
                        )}"
                        loading="lazy">
                    `
                    : esc(
                        (
                          d.name ||
                          'A'
                        )[0]
                      )
                }

              </div>

              <h3>
                ${esc(d.name)}
              </h3>

              <p>
                <b>
                  ${esc(d.title)}
                </b>
              </p>

              <p>
                ${esc(d.bio)}
              </p>

            </article>

          `;

        }
      ).join('');

  }


  /* ================= DOCTOR SELECT ================= */

  if($('doctor')) {

    $('doctor').innerHTML =

      `
        <option value="">
          ${esc(
            tr('chooseDoctor')
          )}
        </option>
      ` +

      doctors.map(
        doctor => {

          const d =
            translatedDoctor(
              doctor
            );


          return `

            <option
              value="${esc(
                doctor.id
              )}">

              ${esc(d.name)}
              —
              ${esc(d.title)}

            </option>

          `;

        }
      ).join('');

  }


  /* ================= SERVICE SELECT ================= */

  if($('service')) {

    $('service').innerHTML =

      `
        <option value="">
          ${esc(
            tr('chooseService')
          )}
        </option>
      ` +

      services.map(
        service => {

          const s =
            translatedService(
              service
            );


          return `

            <option
              value="${esc(
                service.id
              )}">

              ${esc(s.name)}

            </option>

          `;

        }
      ).join('');

  }


  /* ================= SETTINGS ================= */

  const settings =
    data.settings || {};


  if($('phone')) {

    $('phone').textContent =
      settings.phone || '—';

  }


  if($('phoneLink')) {

    $('phoneLink').href =
      settings.phone
        ? 'tel:' + settings.phone
        : '#';

  }


  if($('email')) {

    $('email').textContent =
      settings.email || '—';

  }


  if($('emailLink')) {

    $('emailLink').href =
      settings.email
        ? 'mailto:' +
          settings.email
        : '#';

  }


  const whatsapp =
    settings.whatsapp
      ? `https://wa.me/${String(
          settings.whatsapp
        ).replace(
          /\D/g,
          ''
        )}`
      : '#';


  if($('waLink')) {

    $('waLink').href =
      whatsapp;

  }


  if($('waHero')) {

    $('waHero').href =
      whatsapp;

  }


  if($('address')) {

    $('address').textContent =
      currentLang === 'ar'
        ? T.ar.address
        : T.en.address;

  }


  /* ================= GOOGLE MAPS ================= */

  const mapsLink =
    $('mapsLink');


  if(mapsLink) {

    mapsLink.href =
      GOOGLE_MAPS_URL;

    mapsLink.target =
      '_blank';

    mapsLink.rel =
      'noopener noreferrer';

  }


  /* ================= WHATSAPP LOCATION ================= */

  const locationMessage =
    currentLang === 'ar'

      ? `مرحبًا، أريد معرفة موقع عيادة أزاد على الخريطة:

📍 Azaad Clinic
دمياط - شارع نافع، مقابل مسجد المظلوم - أعلى صيدلية الرياض

${GOOGLE_MAPS_URL}`

      : `Hello, I would like to share the location of Azaad Clinic:

📍 Azaad Clinic
Damietta – Nafea Street, opposite Al-Mazloum Mosque, above Al-Riyadh Pharmacy

${GOOGLE_MAPS_URL}`;


  const shareUrl =
    'https://wa.me/?text=' +
    encodeURIComponent(
      locationMessage
    );


  const shareLink =
    $('shareLocation');


  if(shareLink) {

    shareLink.href =
      shareUrl;

    shareLink.target =
      '_blank';

    shareLink.rel =
      'noopener noreferrer';

  }

}


/* =========================================================
   INITIALIZATION
========================================================= */

async function init() {

  try {

    const data =
      await api(
        '?api=data'
      );


    render(data);


    if($('date')) {

      const now =
        new Date();


      now.setMinutes(
        now.getMinutes() -
        now.getTimezoneOffset()
      );


      const today =
        now.toISOString()
          .slice(0, 10);


      $('date').min =
        today;


      if(!$('date').value) {

        $('date').value =
          today;

      }

    }


    applyLanguage();

  }

  catch(error) {

    console.error(
      'Azaad Clinic:',
      error
    );


    if($('servicesGrid')) {

      $('servicesGrid').innerHTML =
        `
          <div class="loading">
            ${esc(
              tr('loadError')
            )}
          </div>
        `;

    }


    if($('doctorsGrid')) {

      $('doctorsGrid').innerHTML =
        `
          <div class="loading">
            ${esc(
              tr('loadError')
            )}
          </div>
        `;

    }

  }

}


/* =========================================================
   AVAILABLE SLOTS
========================================================= */

async function loadSlots() {

  chosen = '';


  if(
    !$('doctor') ||
    !$('service') ||
    !$('date') ||
    !$('slots')
  ) {

    return;

  }


  if(
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

    const data =
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
      Array.isArray(
        data.slots
      )
        ? data.slots
        : [];


    if(!slots.length) {

      $('slots').textContent =
        tr('noSlots');

      return;

    }


    $('slots').innerHTML =
      slots.map(
        time => `

          <button
            type="button"
            class="slot"
            data-t="${esc(time)}">

            ${esc(time)}

          </button>

        `
      ).join('');


    document
      .querySelectorAll(
        '.slot'
      )
      .forEach(button => {

        button.onclick = () => {

          document
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


          chosen =
            button.dataset.t;

        };

      });

  }

  catch(error) {

    console.error(
      error
    );


    $('slots').textContent =
      tr('slotsError');

  }

}


/* =========================================================
   BOOKING
========================================================= */

if($('bookingForm')) {

  $('bookingForm').onsubmit =
    async event => {

      event.preventDefault();


      if(!chosen) {

        if($('message')) {

          $('message').textContent =
            tr('chooseSlot');

          $('message').style.color =
            '#a13a3a';

        }

        return;

      }


      const submit =
        $('bookingForm')
          .querySelector(
            'button[type="submit"]'
          );


      try {

        if(submit) {

          submit.disabled =
            true;

          submit.style.opacity =
            '0.65';

        }


        const result =
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


        const bookingCode =
          result.booking_code ||
          'AZD-' +
          Math.floor(
            100000 +
            Math.random() *
            900000
          );


        if($('message')) {

          $('message').innerHTML = `

            <strong>
              ${esc(
                tr('booked')
              )}
            </strong>

            <span
              style="
                display:block;
                margin-top:8px;
                font-size:1.25rem;
                font-weight:800;
                letter-spacing:1px;
              ">

              ${esc(
                bookingCode
              )}

            </span>

          `;

          $('message').style.color =
            '#16734a';

        }


        /*
          Prepare WhatsApp confirmation
          link if the page contains
          #bookingWhatsapp
        */

        const doctor =
          $('doctor')
            ?.selectedOptions?.[0]
            ?.textContent
            ?.trim() || '';


        const service =
          $('service')
            ?.selectedOptions?.[0]
            ?.textContent
            ?.trim() || '';


        const mode =
          $('mode')
            ?.selectedOptions?.[0]
            ?.textContent
            ?.trim() || '';


        const shareText =
          currentLang === 'ar'

            ? `موعدي في Azaad Clinic

رقم الحجز: ${bookingCode}
الطبيب: ${doctor}
الخدمة: ${service}
التاريخ: ${$('date').value}
الوقت: ${chosen}
نوع الجلسة: ${mode}

📍 موقع العيادة:
${GOOGLE_MAPS_URL}`

            : `My appointment at Azaad Clinic

Booking number: ${bookingCode}
Doctor: ${doctor}
Service: ${service}
Date: ${$('date').value}
Time: ${chosen}
Session: ${mode}

📍 Clinic location:
${GOOGLE_MAPS_URL}`;


        const bookingWhatsApp =
          $('bookingWhatsapp');


        if(bookingWhatsApp) {

          bookingWhatsApp.href =
            'https://wa.me/?text=' +
            encodeURIComponent(
              shareText
            );

          bookingWhatsApp.target =
            '_blank';

          bookingWhatsApp.rel =
            'noopener noreferrer';

          bookingWhatsApp.style.display =
            'inline-flex';

        }


        $('bookingForm').reset();

        chosen = '';


        if($('slots')) {

          $('slots').textContent =
            tr('bookingReceived');

        }

      }

      catch(error) {

        console.error(
          error
        );


        if($('message')) {

          $('message').textContent =
            error.message ||
            tr('loadError');

          $('message').style.color =
            '#a13a3a';

        }

      }

      finally {

        if(submit) {

          submit.disabled =
            false;

          submit.style.opacity =
            '';

        }

      }

    };

}


/* =========================================================
   FORM EVENTS
========================================================= */

[
  'doctor',
  'service',
  'date'
].forEach(id => {

  const element =
    $(id);


  if(element) {

    element.onchange =
      loadSlots;

  }

});


/* =========================================================
   LANGUAGE BUTTONS
========================================================= */

document
  .querySelectorAll(
    '.lang-btn'
  )
  .forEach(button => {

    button.onclick =
      () =>
        setLanguage(
          button.dataset.lang
        );

  });


/* =========================================================
   MOBILE MENU
========================================================= */

if($('menu')) {

  $('menu').onclick = () => {

    if(!$('nav'))
      return;


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

}


document
  .querySelectorAll(
    '#nav a'
  )
  .forEach(link => {

    link.onclick = () => {

      if($('nav')) {

        $('nav')
          .classList
          .remove(
            'mobile-open'
          );

      }


      if($('menu')) {

        $('menu')
          .setAttribute(
            'aria-expanded',
            'false'
          );

      }

    };

  });


/* =========================================================
   FOOTER YEAR
========================================================= */

if($('year')) {

  $('year').textContent =
    new Date()
      .getFullYear();

}


/* =========================================================
   START
========================================================= */

applyLanguage();

init();
