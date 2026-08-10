const API =
  'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinic';

const MAPS_URL =
  'https://maps.app.goo.gl/6kta6eBxN7TH88ATA?g_st=ic';

const CLINIC_ADDRESS_AR =
  'دمياط - شارع نافع، مقابل مسجد المظلوم - أعلى صيدلية الرياض';

const CLINIC_ADDRESS_EN =
  'Damietta - Nafea Street, opposite Al-Mazloum Mosque - above Al Riyad Pharmacy';


const $ = id =>
  document.getElementById(id);


let chosen = '';

let currentLang =
  localStorage.getItem('azaad_lang') || 'ar';


/* =====================================================
   TRANSLATIONS
===================================================== */

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

    slotsHint:
      'اختر الطبيب والخدمة والتاريخ لعرض المواعيد المتاحة.',

    nameLabel:
      'الاسم بالكامل',

    namePlaceholder:
      'اكتب اسمك',

    phoneLabel:
      'رقم الهاتف',

    phonePlaceholder:
      'رقم الهاتف',

    emailLabel:
      'البريد الإلكتروني',

    notesLabel:
      'ملاحظات',

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
      'جميع الحقوق محفوظة.',

    chooseDoctor:
      'اختر الطبيب',

    chooseService:
      'اختر الخدمة',

    chooseDate:
      'اختر الطبيب والخدمة والتاريخ لعرض المواعيد المتاحة.',

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
      'تعذر تحميل بيانات العيادة. يرجى المحاولة لاحقًا.',

    slotsError:
      'تعذر تحميل المواعيد.'
  },


  en: {

    navHome:
      'Home',

    navAbout:
      'About',

    navServices:
      'Services',

    navDoctors:
      'Our Team',

    navBooking:
      'Booking',

    navContact:
      'Contact',

    bookNow:
      'Book Appointment',

    heroTitle:
      'A Safe Space<br><span>to Begin Your Change</span>',

    heroText:
      'Specialized mental healthcare with empathy, complete privacy, and a care plan tailored to your needs.',

    heroBook:
      'Book Your Session',

    heroWhatsapp:
      'Chat on WhatsApp',

    trustPrivacy:
      '✓ Complete privacy',

    trustModes:
      '✓ In-clinic & online',

    trustCare:
      '✓ Specialized care',

    aboutTitle:
      'A place where you can<br>be yourself.',

    aboutP1:
      'We believe asking for help is a sign of strength. We provide a safe and respectful environment to understand mental health challenges and work through them with practical steps.',

    aboutP2:
      'Our goal is to provide professional, compassionate, and fully confidential mental healthcare.',

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
      'Online Session',

    slotsLabel:
      'Available Times',

    slotsHint:
      'Choose a doctor, service, and date to see available times.',

    nameLabel:
      'Full Name',

    namePlaceholder:
      'Enter your name',

    phoneLabel:
      'Phone Number',

    phonePlaceholder:
      'Phone number',

    emailLabel:
      'Email',

    notesLabel:
      'Notes',

    notesPlaceholder:
      'Any additional information...',

    confirmBooking:
      'Confirm Booking Request',

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
      'Open Location on Google Maps',

    shareLocation:
      'Share Clinic Location via WhatsApp',

    rights:
      'All rights reserved.',

    chooseDoctor:
      'Choose doctor',

    chooseService:
      'Choose service',

    chooseDate:
      'Choose a doctor, service, and date to see available times.',

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
      'Unable to load clinic data. Please try again later.',

    slotsError:
      'Unable to load appointments.'
  }

};


/* =====================================================
   LOCAL TRANSLATIONS FOR SERVICES
===================================================== */

const SERVICE_TRANSLATIONS = {

  'جلسة علاج نفسي فردية': {
    enName: 'Individual Psychotherapy Session',
    enDescription:
      'Individual session with one of our mental health specialists.'
  },

  'جلسة علاج نفسي جماعية': {
    enName: 'Group Psychotherapy Session',
    enDescription:
      'Group psychotherapy sessions.'
  },

  'جلسة أونلاين': {
    enName: 'Online Therapy Session',
    enDescription:
      'Remote mental health therapy session.'
  },

  'تقييم نفسي': {
    enName: 'Psychological Assessment',
    enDescription:
      'Initial psychological assessment and consultation.'
  }

};


/* =====================================================
   LOCAL TRANSLATIONS FOR DOCTORS
===================================================== */

const DOCTOR_TRANSLATIONS = {

  'أ/ لميا مجدي': {

    enName:
      'Lamya Magdy',

    enTitle:
      'Psychotherapist',

    enBio:
      'Psychotherapy sessions using CBT, DBT, ACT, MI, Counseling, and Schema Therapy, including individual, group, and online sessions.'
  },


  'د/ محمد أبو الخير': {

    enName:
      'Dr. Mohamed Abu Elkhair',

    enTitle:
      'Psychiatry Resident',

    enBio:
      'Psychiatry resident physician.'
  },


  'د/ علي باسل': {

    enName:
      'Dr. Ali Basel',

    enTitle:
      'Psychiatry & Addiction Treatment Specialist',

    enBio:
      'Specialist in psychiatry and addiction treatment.'
  },


  'أ/ رحاب الصواف': {

    enName:
      'Rehab El-Sawaf',

    enTitle:
      'Psychologist',

    enBio:
      'Psychologist.'
  },


  'د/ أحمد إبراهيم': {

    enName:
      'Dr. Ahmed Ibrahim',

    enTitle:
      'Psychiatry & Addiction Treatment Specialist',

    enBio:
      'Specialist in psychiatry and addiction treatment.'
  }

};


/* =====================================================
   ESCAPE HTML
===================================================== */

const esc = value =>

  String(value ?? '')
    .replace(
      /[&<>"']/g,

      char => ({

        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'

      }[char])
    );


/* =====================================================
   TRANSLATION HELPER
===================================================== */

const tr = key =>

  T[currentLang][key] ||
  T.ar[key] ||
  key;


/* =====================================================
   API
===================================================== */

async function api(query, options) {

  const response =
    await fetch(
      API + query,
      options
    );


  let data = {};


  try {

    data =
      await response.json();

  } catch {

    data = {};

  }


  if (!response.ok) {

    throw new Error(
      data.error ||
      'Request failed'
    );

  }


  return data;

}


/* =====================================================
   SERVICE DISPLAY
===================================================== */

function getServiceName(service) {

  if (currentLang === 'ar') {

    return service.name || '';

  }


  const translation =
    SERVICE_TRANSLATIONS[
      service.name
    ];


  return translation
    ? translation.enName
    : service.name || '';

}


function getServiceDescription(service) {

  if (currentLang === 'ar') {

    return service.description || '';

  }


  const translation =
    SERVICE_TRANSLATIONS[
      service.name
    ];


  return translation
    ? translation.enDescription
    : service.description || '';

}


/* =====================================================
   DOCTOR DISPLAY
===================================================== */

function getDoctorName(doctor) {

  if (currentLang === 'ar') {

    return doctor.name || '';

  }


  const translation =
    DOCTOR_TRANSLATIONS[
      doctor.name
    ];


  return translation
    ? translation.enName
    : doctor.name || '';

}


function getDoctorTitle(doctor) {

  if (currentLang === 'ar') {

    return doctor.title || '';

  }


  const translation =
    DOCTOR_TRANSLATIONS[
      doctor.name
    ];


  return translation
    ? translation.enTitle
    : doctor.title || '';

}


function getDoctorBio(doctor) {

  if (currentLang === 'ar') {

    return doctor.bio || '';

  }


  const translation =
    DOCTOR_TRANSLATIONS[
      doctor.name
    ];


  return translation
    ? translation.enBio
    : doctor.bio || '';

}


/* =====================================================
   APPLY LANGUAGE
===================================================== */

function applyLanguage() {

  document.documentElement.lang =
    currentLang;


  document.documentElement.dir =
    currentLang === 'ar'
      ? 'rtl'
      : 'ltr';


  document
    .querySelectorAll('[data-i18n]')
    .forEach(element => {

      const key =
        element.dataset.i18n;


      if (
        T[currentLang] &&
        T[currentLang][key]
      ) {

        element.innerHTML =
          T[currentLang][key];

      }

    });


  document
    .querySelectorAll('[data-i18n-placeholder]')
    .forEach(element => {

      const key =
        element.dataset.i18nPlaceholder;


      if (
        T[currentLang] &&
        T[currentLang][key]
      ) {

        element.placeholder =
          T[currentLang][key];

      }

    });


  document
    .querySelectorAll('.lang-btn')
    .forEach(button => {

      button.classList.toggle(
        'active',
        button.dataset.lang === currentLang
      );

    });


  document.title =
    currentLang === 'ar'

      ? 'Azaad Clinic | عيادة أزاد للصحة النفسية'

      : 'Azaad Clinic | Mental Health Clinic';


  if ($('address')) {

    $('address').textContent =
      currentLang === 'ar'
        ? CLINIC_ADDRESS_AR
        : CLINIC_ADDRESS_EN;

  }


  if (
    $('slots') &&
    !chosen &&
    (
      !$('doctor')?.value ||
      !$('service')?.value
    )
  ) {

    $('slots').textContent =
      tr('chooseDate');

  }


  updateLocationShareLink();

}


/* =====================================================
   LANGUAGE SWITCH
===================================================== */

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
    $('doctor')?.value &&
    $('service')?.value &&
    $('date')?.value
  ) {

    loadSlots();

  }


  $('nav')
    ?.classList
    .remove('mobile-open');


  $('menu')
    ?.setAttribute(
      'aria-expanded',
      'false'
    );

}


/* =====================================================
   RENDER DATA
===================================================== */

function render(data) {

  const services =
    data.services || [];

  const doctors =
    data.doctors || [];


  /* =========================
     SERVICES
  ========================= */

  $('servicesGrid').innerHTML =

    services
      .map(
        (service, index) => {

          const name =
            getServiceName(service);

          const description =
            getServiceDescription(service);


          return `

            <article class="card">

              <div class="icon">
                ${[
                  '🧠',
                  '🌿',
                  '💙',
                  '🔎',
                  '✨'
                ][index % 5]}
              </div>

              <h3>
                ${esc(name)}
              </h3>

              <p>
                ${esc(description)}
              </p>

              <p>
                ${
                  service.duration_minutes ||
                  30
                }

                ${
                  currentLang === 'ar'
                    ? 'دقيقة'
                    : 'minutes'
                }

              </p>

            </article>

          `;

        }
      )
      .join('');


  /* =========================
     DOCTORS
  ========================= */

  $('doctorsGrid').innerHTML =

    doctors
      .map(
        doctor => {

          const name =
            getDoctorName(doctor);

          const title =
            getDoctorTitle(doctor);

          const bio =
            getDoctorBio(doctor);


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
                        alt="${esc(name)}">

                      `

                    : esc(
                        (
                          name ||
                          'A'
                        )[0]
                      )
                }

              </div>


              <h3>
                ${esc(name)}
              </h3>


              <p>

                <b>
                  ${esc(title)}
                </b>

              </p>


              <p>
                ${esc(bio)}
              </p>

            </article>

          `;

        }
      )
      .join('');


  /* =========================
     DOCTOR SELECT
  ========================= */

  $('doctor').innerHTML =

    `
      <option value="">
        ${esc(tr('chooseDoctor'))}
      </option>
    `

    +

    doctors
      .map(
        doctor => {

          const name =
            getDoctorName(doctor);

          const title =
            getDoctorTitle(doctor);


          return `

            <option
              value="${esc(doctor.id)}">

              ${esc(name)}
              —
              ${esc(title)}

            </option>

          `;

        }
      )
      .join('');


  /* =========================
     SERVICE SELECT
  ========================= */

  $('service').innerHTML =

    `
      <option value="">
        ${esc(tr('chooseService'))}
      </option>
    `

    +

    services
      .map(
        service => `

          <option
            value="${esc(service.id)}">

            ${esc(
              getServiceName(service)
            )}

          </option>

        `
      )
      .join('');


  /* =========================
     SETTINGS
  ========================= */

  const settings =
    data.settings || {};


  if ($('contactPhone')) {

    $('contactPhone').textContent =
      settings.phone || '—';

  }


  if ($('phoneLink')) {

    $('phoneLink').href =
      settings.phone
        ? 'tel:' + settings.phone
        : '#';

  }


  if ($('contactEmail')) {

    $('contactEmail').textContent =
      settings.email || '—';

  }


  if ($('emailLink')) {

    $('emailLink').href =
      settings.email
        ? 'mailto:' + settings.email
        : '#';

  }


  const whatsapp =
    settings.whatsapp
      ? String(settings.whatsapp)
          .replace(/\D/g, '')
      : '';


  const whatsappURL =
    whatsapp
      ? `https://wa.me/${whatsapp}`
      : '#';


  if ($('waLink')) {

    $('waLink').href =
      whatsappURL;

  }


  if ($('waHero')) {

    $('waHero').href =
      whatsappURL;

  }


  if ($('address')) {

    $('address').textContent =
      currentLang === 'ar'
        ? CLINIC_ADDRESS_AR
        : CLINIC_ADDRESS_EN;

  }


  updateLocationShareLink();

}


/* =====================================================
   WHATSAPP LOCATION SHARE
===================================================== */

function updateLocationShareLink() {

  const button =
    $('shareLocation');


  if (!button) {
    return;
  }


  const message =
    currentLang === 'ar'

      ? `مرحبًا، أريد معرفة موقع عيادة أزاد للصحة النفسية.\n\nالعنوان:\n${CLINIC_ADDRESS_AR}\n\nموقع Google Maps:\n${MAPS_URL}`

      : `Hello, I would like to get the location of Azaad Clinic.\n\nAddress:\n${CLINIC_ADDRESS_EN}\n\nGoogle Maps:\n${MAPS_URL}`;


  button.href =
    `https://wa.me/?text=${encodeURIComponent(
      message
    )}`;

}


/* =====================================================
   INITIALIZATION
===================================================== */

async function init() {

  try {

    const data =
      await api('?api=data');


    render(data);


    const now =
      new Date();


    now.setMinutes(
      now.getMinutes() -
      now.getTimezoneOffset()
    );


    if ($('date')) {

      $('date').min =
        now
          .toISOString()
          .slice(0, 10);


      $('date').value =
        now
          .toISOString()
          .slice(0, 10);

    }


    applyLanguage();

  }

  catch (error) {

    console.error(
      'Azaad Clinic initialization error:',
      error
    );


    if ($('servicesGrid')) {

      $('servicesGrid').innerHTML =

        `
          <div class="loading">
            ${esc(tr('loadError'))}
          </div>
        `;

    }


    if ($('doctorsGrid')) {

      $('doctorsGrid').innerHTML =

        `
          <div class="loading">
            ${esc(tr('loadError'))}
          </div>
        `;

    }

  }

}


/* =====================================================
   LOAD AVAILABLE SLOTS
===================================================== */

async function loadSlots() {

  chosen = '';


  if (
    !$('doctor')?.value ||
    !$('service')?.value ||
    !$('date')?.value
  ) {

    if ($('slots')) {

      $('slots').textContent =
        tr('chooseDate');

    }

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
      data.slots || [];


    $('slots').innerHTML =

      slots
        .map(
          time => `

            <button
              class="slot"
              type="button"
              data-t="${esc(time)}">

              ${esc(time)}

            </button>

          `
        )
        .join('')

      ||

      esc(tr('noSlots'));


    document
      .querySelectorAll('.slot')
      .forEach(button => {

        button.onclick = () => {


          document
            .querySelectorAll('.slot')
            .forEach(item => {

              item.classList.remove(
                'selected'
              );

            });


          button.classList.add(
            'selected'
          );


          chosen =
            button.dataset.t;

        };

      });

  }

  catch (error) {

    console.error(
      'Slots error:',
      error
    );


    $('slots').textContent =
      tr('slotsError');

  }

}


/* =====================================================
   BOOKING FORM
===================================================== */

if ($('bookingForm')) {

  $('bookingForm').onsubmit =

    async event => {

      event.preventDefault();


      if (!chosen) {

        $('message').textContent =
          tr('chooseSlot');


        $('message').style.color =
          '#a13a3a';


        return;

      }


      try {

        const data =

          await api(

            '?api=book',

            {

              method: 'POST',

              headers: {

                'Content-Type':
                  'application/json'

              },


              body:
                JSON.stringify({

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

            data.booking_code ||

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


        $('slots').textContent =
          tr('bookingReceived');


        applyLanguage();

      }

      catch (error) {

        console.error(
          'Booking error:',
          error
        );


        $('message').textContent =

          error.message ||
          tr('loadError');


        $('message').style.color =
          '#a13a3a';

      }

    };

}


/* =====================================================
   FORM EVENTS
===================================================== */

[
  'doctor',
  'service',
  'date'
]
  .forEach(id => {

    if ($(id)) {

      $(id).onchange =
        loadSlots;

    }

  });


/* =====================================================
   YEAR
===================================================== */

if ($('year')) {

  $('year').textContent =
    new Date().getFullYear();

}


/* =====================================================
   LANGUAGE BUTTONS
===================================================== */

document
  .querySelectorAll('.lang-btn')
  .forEach(button => {

    button.onclick = () => {

      setLanguage(
        button.dataset.lang
      );

    };

  });


/* =====================================================
   MOBILE MENU
===================================================== */

if ($('menu')) {

  $('menu').onclick = () => {

    const isOpen =
      $('nav')
        .classList
        .toggle(
          'mobile-open'
        );


    $('menu')
      .setAttribute(
        'aria-expanded',
        String(isOpen)
      );

  };

}


/* =====================================================
   CLOSE MOBILE MENU AFTER NAVIGATION
===================================================== */

document
  .querySelectorAll('#nav a')
  .forEach(link => {

    link.onclick = () => {

      $('nav')
        ?.classList
        .remove(
          'mobile-open'
        );


      $('menu')
        ?.setAttribute(
          'aria-expanded',
          'false'
        );

    };

  });


/* =====================================================
   START
===================================================== */

applyLanguage();

init();
