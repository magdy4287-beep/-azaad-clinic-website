const API =
  'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinic';

const MAPS_URL =
  'https://maps.app.goo.gl/6kta6eBxN7TH88ATA?g_st=ic';

const CLINIC_ADDRESS_AR =
  'دمياط - شارع نافع، مقابل مسجد المظلوم - أعلى صيدلية الرياض';

const CLINIC_ADDRESS_EN =
  'Damietta - Nafea Street, opposite Al-Mazloum Mosque - above Al Riyad Pharmacy';

const $ = id => document.getElementById(id);

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

    shareLocation:
      'مشاركة موقع العيادة عبر WhatsApp',

    rights: 'جميع الحقوق محفوظة.',

    chooseDoctor: 'اختر الطبيب',

    chooseService: 'اختر الخدمة',

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

    navHome: 'Home',
    navAbout: 'About',
    navServices: 'Services',
    navDoctors: 'Our Team',
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
      'We believe asking for help is a sign of strength. We provide a safe and respectful environment to understand mental health challenges and work through them with practical steps.',

    aboutP2:
      'Our goal is to provide professional, compassionate, and fully confidential mental healthcare.',

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
    modeLabel: 'Session Type',

    clinicMode: 'In-clinic',
    onlineMode: 'Online Session',

    slotsLabel: 'Available Times',

    nameLabel: 'Full Name',
    namePlaceholder: 'Enter your name',

    phoneLabel: 'Phone Number',
    phonePlaceholder: 'Phone number',

    emailLabel: 'Email',

    notesLabel: 'Notes',
    notesPlaceholder: 'Any additional information...',

    confirmBooking:
      'Confirm Booking Request',

    contactTitle: 'Contact Us',

    phoneContact: 'Phone',
    emailContact: 'Email',
    whatsappContact: 'WhatsApp',

    startChat: 'Start a conversation',

    locationTitle: 'Clinic Location',

    openMaps:
      'Open Location on Google Maps',

    shareLocation:
      'Share Clinic Location via WhatsApp',

    rights: 'All rights reserved.',

    chooseDoctor: 'Choose doctor',

    chooseService: 'Choose service',

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
   SERVICES TRANSLATION
   Supports Arabic AND English database names
===================================================== */

const SERVICES = {

  individual: {

    arName:
      'جلسة علاج نفسي فردية',

    arDescription:
      'جلسة فردية مع أحد المتخصصين',

    enName:
      'Individual Psychotherapy Session',

    enDescription:
      'Individual session with one of our mental health specialists.',

    duration: 60
  },


  group: {

    arName:
      'جلسة علاج نفسي جماعية',

    arDescription:
      'جلسات علاج نفسي جماعي',

    enName:
      'Group Psychotherapy Session',

    enDescription:
      'Group psychotherapy sessions.',

    duration: 90
  },


  online: {

    arName:
      'جلسة أونلاين',

    arDescription:
      'جلسة علاج نفسي عن بُعد',

    enName:
      'Online Therapy Session',

    enDescription:
      'Remote mental health therapy session.',

    duration: 60
  },


  assessment: {

    arName:
      'تقييم نفسي',

    arDescription:
      'تقييم ومقابلة نفسية أولية',

    enName:
      'Psychological Assessment',

    enDescription:
      'Initial psychological assessment and consultation.',

    duration: 60
  }

};


/* =====================================================
   DOCTORS TRANSLATION
===================================================== */

const DOCTORS = {

  lamya: {

    arNames: [
      'أ/ لميا مجدي',
      'لميا مجدي'
    ],

    enNames: [
      'Lamya Magdy'
    ],

    arTitle:
      'معالج نفسي',

    enTitle:
      'Psychotherapist',

    arBio:
      'جلسات العلاج النفسي السلوكي CBT - DBT - ACT - MI - Counseling - Schema Therapy، فردي وجماعي وأونلاين.',

    enBio:
      'Psychotherapy sessions using CBT, DBT, ACT, MI, Counseling, and Schema Therapy, including individual, group, and online sessions.'
  },


  mohamed: {

    arNames: [
      'د/ محمد أبو الخير',
      'محمد أبو الخير'
    ],

    enNames: [
      'Dr. Mohamed Abu Elkhair',
      'Dr. Mohamed Abu Al-Khair'
    ],

    arTitle:
      'طبيب مقيم الطب النفسي',

    enTitle:
      'Psychiatry Resident',

    arBio:
      'طبيب مقيم الطب النفسي.',

    enBio:
      'Psychiatry resident physician.'
  },


  ali: {

    arNames: [
      'د/ علي باسل',
      'علي باسل'
    ],

    enNames: [
      'Dr. Ali Basel'
    ],

    arTitle:
      'أخصائي الطب النفسي وعلاج الإدمان',

    enTitle:
      'Psychiatry & Addiction Treatment Specialist',

    arBio:
      'أخصائي الطب النفسي وعلاج الإدمان.',

    enBio:
      'Specialist in psychiatry and addiction treatment.'
  },


  rehab: {

    arNames: [
      'أ/ رحاب الصواف',
      'رحاب الصواف'
    ],

    enNames: [
      'Rehab El-Sawaf'
    ],

    arTitle:
      'أخصائي نفسي',

    enTitle:
      'Psychologist',

    arBio:
      'أخصائي نفسي.',

    enBio:
      'Psychologist.'
  },


  ahmed: {

    arNames: [
      'د/ أحمد إبراهيم',
      'أحمد إبراهيم'
    ],

    enNames: [
      'Dr. Ahmed Ibrahim'
    ],

    arTitle:
      'أخصائي الطب النفسي وعلاج الإدمان',

    enTitle:
      'Psychiatry & Addiction Treatment Specialist',

    arBio:
      'أخصائي الطب النفسي وعلاج الإدمان.',

    enBio:
      'Specialist in psychiatry and addiction treatment.'
  }

};


/* =====================================================
   FIND SERVICE
===================================================== */

function findService(service) {

  const value =
    String(service?.name || '')
      .trim()
      .toLowerCase();


  if (
    value === 'جلسة علاج نفسي فردية' ||
    value.includes('individual psychotherapy')
  ) {

    return SERVICES.individual;

  }


  if (
    value === 'جلسة علاج نفسي جماعية' ||
    value.includes('group psychotherapy')
  ) {

    return SERVICES.group;

  }


  if (
    value === 'جلسة أونلاين' ||
    value.includes('online therapy')
  ) {

    return SERVICES.online;

  }


  if (
    value === 'تقييم نفسي' ||
    value.includes('psychological assessment')
  ) {

    return SERVICES.assessment;

  }


  return null;

}


/* =====================================================
   FIND DOCTOR
===================================================== */

function findDoctor(doctor) {

  const value =
    String(doctor?.name || '')
      .trim();


  for (
    const key of Object.keys(DOCTORS)
  ) {

    const item =
      DOCTORS[key];


    if (
      item.arNames.includes(value) ||
      item.enNames.includes(value)
    ) {

      return item;

    }

  }


  return null;

}


/* =====================================================
   DISPLAY SERVICE
===================================================== */

function serviceName(service) {

  const item =
    findService(service);


  if (!item) {

    return service?.name || '';

  }


  return currentLang === 'ar'
    ? item.arName
    : item.enName;

}


function serviceDescription(service) {

  const item =
    findService(service);


  if (!item) {

    return service?.description || '';

  }


  return currentLang === 'ar'
    ? item.arDescription
    : item.enDescription;

}


function serviceDuration(service) {

  const item =
    findService(service);


  return (
    item?.duration ||
    service?.duration_minutes ||
    60
  );

}


/* =====================================================
   DISPLAY DOCTOR
===================================================== */

function doctorName(doctor) {

  const item =
    findDoctor(doctor);


  if (!item) {

    return doctor?.name || '';

  }


  return currentLang === 'ar'
    ? item.arNames[0]
    : item.enNames[0];

}


function doctorTitle(doctor) {

  const item =
    findDoctor(doctor);


  if (!item) {

    return doctor?.title || '';

  }


  return currentLang === 'ar'
    ? item.arTitle
    : item.enTitle;

}


function doctorBio(doctor) {

  const item =
    findDoctor(doctor);


  if (!item) {

    return doctor?.bio || '';

  }


  return currentLang === 'ar'
    ? item.arBio
    : item.enBio;

}


/* =====================================================
   HTML ESCAPE
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

  }

  catch {

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
   CHANGE LANGUAGE
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


  /*
    إعادة بناء الأطباء والخدمات
    حتى تتغير الأسماء فورًا
  */

  if (
    window.clinicData
  ) {

    render(window.clinicData);

  }


  if (
    $('doctor')?.value &&
    $('service')?.value &&
    $('date')?.value
  ) {

    loadSlots();

  }


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

}


/* =====================================================
   RENDER
===================================================== */

function render(data) {

  window.clinicData =
    data;


  const services =
    data.services || [];


  const doctors =
    data.doctors || [];


  /* =========================
     SERVICES CARDS
  ========================= */

  $('servicesGrid').innerHTML =

    services
      .map(
        (service, index) => `

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

              ${esc(
                serviceName(service)
              )}

            </h3>


            <p>

              ${esc(
                serviceDescription(service)
              )}

            </p>


            <p>

              ${serviceDuration(service)}

              ${
                currentLang === 'ar'
                  ? 'دقيقة'
                  : 'minutes'
              }

            </p>

          </article>

        `
      )
      .join('');


  /* =========================
     DOCTORS
  ========================= */

  $('doctorsGrid').innerHTML =

    doctors
      .map(
        doctor => `

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
                        doctorName(doctor)
                      )}">

                    `

                  : esc(
                      (
                        doctorName(doctor) ||
                        'A'
                      )[0]
                    )
              }

            </div>


            <h3>

              ${esc(
                doctorName(doctor)
              )}

            </h3>


            <p>

              <b>

                ${esc(
                  doctorTitle(doctor)
                )}

              </b>

            </p>


            <p>

              ${esc(
                doctorBio(doctor)
              )}

            </p>

          </article>

        `
      )
      .join('');


  /* =========================
     DOCTOR SELECT
  ========================= */

  $('doctor').innerHTML =

    `
      <option value="">
        ${esc(
          tr('chooseDoctor')
        )}
      </option>
    `

    +

    doctors
      .map(
        doctor => `

          <option
            value="${esc(
              doctor.id
            )}">

            ${esc(
              doctorName(doctor)
            )}

            —
            
            ${esc(
              doctorTitle(doctor)
            )}

          </option>

        `
      )
      .join('');


  /* =========================
     SERVICE SELECT
  ========================= */

  $('service').innerHTML =

    `
      <option value="">
        ${esc(
          tr('chooseService')
        )}
      </option>
    `

    +

    services
      .map(
        service => `

          <option
            value="${esc(
              service.id
            )}">

            ${esc(
              serviceName(service)
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


  updateLocationShareLink();

}


/* =====================================================
   LOCATION WHATSAPP
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
   INIT
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
        now.toISOString()
          .slice(0, 10);


      $('date').value =
        now.toISOString()
          .slice(0, 10);

    }


    applyLanguage();

    render(data);

  }

  catch (error) {

    console.error(
      'Azaad Clinic initialization error:',
      error
    );


    if ($('servicesGrid')) {

      $('servicesGrid').innerHTML = `

        <div class="loading">

          ${esc(
            tr('loadError')
          )}

        </div>

      `;

    }


    if ($('doctorsGrid')) {

      $('doctorsGrid').innerHTML = `

        <div class="loading">

          ${esc(
            tr('loadError')
          )}

        </div>

      `;

    }

  }

}


/* =====================================================
   AVAILABLE SLOTS
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

      esc(
        tr('noSlots')
      );


    document
      .querySelectorAll('.slot')
      .forEach(button => {

        button.onclick = () => {

          document
            .querySelectorAll('.slot')
            .forEach(item =>
              item.classList.remove(
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
   BOOKING
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
   EVENTS
===================================================== */

[
  'doctor',
  'service',
  'date'
].forEach(id => {

  if ($(id)) {

    $(id).onchange =
      loadSlots;

  }

});


if ($('year')) {

  $('year').textContent =
    new Date().getFullYear();

}


document
  .querySelectorAll('.lang-btn')
  .forEach(button => {

    button.onclick = () => {

      setLanguage(
        button.dataset.lang
      );

    };

  });


if ($('menu')) {

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

}


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
   START APPLICATION
===================================================== */

applyLanguage();

init();
