const API =
  'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinic';

const $ = x => document.getElementById(x);

let chosen = '';

let currentLang =
  localStorage.getItem('azaad_lang') || 'ar';


const T = {

  ar: {

    navHome:'الرئيسية',
    navAbout:'عن العيادة',
    navServices:'الخدمات',
    navDoctors:'الأطباء',
    navBooking:'الحجز',
    navContact:'تواصل معنا',
    trackBooking:'تتبع الحجز',

    bookNow:'احجز موعدك',

    heroTitle:'مساحة آمنة<br><span>لبداية التغيير</span>',

    heroText:
      'رعاية نفسية متخصصة باهتمام إنساني، وخصوصية كاملة، وخطة علاجية تناسب احتياجاتك.',

    heroBook:'احجز جلستك الآن',

    heroWhatsapp:'تواصل عبر واتساب',

    trustPrivacy:'✓ خصوصية كاملة',
    trustModes:'✓ حضوري وأونلاين',
    trustCare:'✓ رعاية متخصصة',

    aboutTitle:
      'مكان تستطيع فيه<br>أن تكون على طبيعتك.',

    aboutP1:
      'نؤمن أن طلب المساعدة خطوة قوة وليست ضعفًا. لذلك نوفر بيئة آمنة ومحترمة تساعدك على فهم التحديات النفسية والتعامل معها بخطوات عملية.',

    aboutP2:
      'هدفنا أن تحصل على رعاية نفسية مهنية، إنسانية، وسرية بالكامل.',

    servicesTitle:'خدماتنا',

    servicesIntro:
      'خدمات نفسية مصممة لتناسب احتياجات كل شخص.',

    doctorsTitle:'فريق العيادة',

    doctorsIntro:
      'متخصصون يعملون معك للوصول إلى حياة أكثر توازنًا.',

    bookingTitle:'احجز موعدك',

    bookingIntro:
      'اختر الطبيب والخدمة والتاريخ والوقت المناسب لك.',

    doctorLabel:'الطبيب',
    serviceLabel:'الخدمة',
    dateLabel:'التاريخ',
    modeLabel:'نوع الجلسة',

    clinicMode:'داخل العيادة',
    onlineMode:'جلسة أونلاين',

    slotsLabel:'المواعيد المتاحة',

    slotsHint:
      'اختر الطبيب والخدمة والتاريخ لعرض المواعيد المتاحة.',

    nameLabel:'الاسم بالكامل',
    namePlaceholder:'اكتب اسمك',

    phoneLabel:'رقم الهاتف',
    phonePlaceholder:'رقم الهاتف',

    emailLabel:'البريد الإلكتروني',

    notesLabel:'ملاحظات',
    notesPlaceholder:'أي معلومات إضافية...',

    confirmBooking:'تأكيد طلب الحجز',

    trackTitle:'هل لديك حجز بالفعل؟',

    trackText:
      'يمكنك معرفة حالة موعدك باستخدام رقم الحجز ورقم الهاتف.',

    contactTitle:'تواصل معنا',

    phoneContact:'الهاتف',
    emailContact:'البريد الإلكتروني',
    whatsappContact:'واتساب',

    startChat:'ابدأ المحادثة',

    rights:'جميع الحقوق محفوظة.',

    chooseDoctor:'اختر الطبيب',
    chooseService:'اختر الخدمة',

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
      'تعذر تحميل المواعيد.'

  },


  en: {

    navHome:'Home',
    navAbout:'About',
    navServices:'Services',
    navDoctors:'Doctors',
    navBooking:'Booking',
    navContact:'Contact',
    trackBooking:'Track Booking',

    bookNow:'Book Appointment',

    heroTitle:
      'A Safe Space<br><span>to Begin Your Change</span>',

    heroText:
      'Specialized mental healthcare with empathy, complete privacy, and a care plan tailored to your needs.',

    heroBook:'Book Your Session',

    heroWhatsapp:'Chat on WhatsApp',

    trustPrivacy:'✓ Complete privacy',
    trustModes:'✓ In-clinic & online',
    trustCare:'✓ Specialized care',

    aboutTitle:
      'A place where you can<br>be yourself.',

    aboutP1:
      'We believe asking for help is a sign of strength. We provide a safe, respectful environment to understand mental health challenges and work through them with practical steps.',

    aboutP2:
      'Our goal is professional, compassionate, and fully confidential mental healthcare.',

    servicesTitle:'Our Services',

    servicesIntro:
      'Mental health services designed around each person’s needs.',

    doctorsTitle:'Our Team',

    doctorsIntro:
      'Specialists working with you toward a more balanced life.',

    bookingTitle:'Book an Appointment',

    bookingIntro:
      'Choose your doctor, service, date, and preferred time.',

    doctorLabel:'Doctor',
    serviceLabel:'Service',
    dateLabel:'Date',
    modeLabel:'Session type',

    clinicMode:'In-clinic',
    onlineMode:'Online session',

    slotsLabel:'Available times',

    slotsHint:
      'Choose a doctor, service, and date to see available times.',

    nameLabel:'Full name',
    namePlaceholder:'Enter your name',

    phoneLabel:'Phone number',
    phonePlaceholder:'Phone number',

    emailLabel:'Email',

    notesLabel:'Notes',
    notesPlaceholder:'Any additional information...',

    confirmBooking:'Confirm Booking Request',

    trackTitle:'Already have a booking?',

    trackText:
      'Check your appointment status using your booking number and phone number.',

    contactTitle:'Contact Us',

    phoneContact:'Phone',
    emailContact:'Email',
    whatsappContact:'WhatsApp',

    startChat:'Start a conversation',

    rights:'All rights reserved.',

    chooseDoctor:'Choose doctor',
    chooseService:'Choose service',

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
      'Unable to load appointments.'

  }

};


const esc = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[c])
  );


const tr = k =>
  T[currentLang][k] ||
  T.ar[k] ||
  k;


async function api(q, opt = {}) {

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      10000
    );

  try {

    const r =
      await fetch(
        API + q,
        {
          ...opt,
          signal:
            controller.signal
        }
      );

    let d = {};

    try {
      d = await r.json();
    }
    catch {}

    if(!r.ok)
      throw Error(
        d.error ||
        'Request failed'
      );

    return d;

  }

  finally {

    clearTimeout(timeout);

  }

}


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

      if(
        T[currentLang] &&
        T[currentLang][k]
      ) {

        el.innerHTML =
          T[currentLang][k];

      }

    });


  document
    .querySelectorAll('[data-i18n-placeholder]')
    .forEach(el => {

      const k =
        el.dataset.i18nPlaceholder;

      if(
        T[currentLang] &&
        T[currentLang][k]
      ) {

        el.placeholder =
          T[currentLang][k];

      }

    });


  document
    .querySelectorAll('.lang-btn')
    .forEach(b =>
      b.classList.toggle(
        'active',
        b.dataset.lang ===
        currentLang
      )
    );


  document.title =
    currentLang === 'ar'
      ? 'Azaad Clinic | عيادة أزاد للصحة النفسية'
      : 'Azaad Clinic | Mental Health Clinic';


  if(
    $('slots') &&
    !chosen &&
    (
      !$('doctor') ||
      !$('service') ||
      !$('doctor').value ||
      !$('service').value
    )
  ) {

    $('slots').textContent =
      tr('chooseDate');

  }

}


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


  if(
    $('doctor') &&
    $('service') &&
    $('date') &&
    $('doctor').value &&
    $('service').value &&
    $('date').value
  ) {

    loadSlots();

  }


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

}


function render(d) {

  const services =
    d.services || [];

  const doctors =
    d.doctors || [];


  if($('servicesGrid')) {

    $('servicesGrid').innerHTML =
      services.length
        ? services.map(
            (x,i) => `

            <article class="card">

              <div class="icon">
                ${[
                  '🧠',
                  '🌿',
                  '💙',
                  '🔎',
                  '✨'
                ][i % 5]}
              </div>

              <h3>
                ${esc(x.name)}
              </h3>

              <p>
                ${esc(
                  x.description || ''
                )}
              </p>

              <p>
                <strong>
                  ${x.duration_minutes || 30}
                </strong>

                ${
                  currentLang === 'ar'
                    ? ' دقيقة'
                    : ' minutes'
                }

              </p>

            </article>

            `
          ).join('')
        : '';

  }


  if($('doctorsGrid')) {

    $('doctorsGrid').innerHTML =
      doctors.length
        ? doctors.map(
            x => `

            <article class="card">

              <div class="photo">

                ${
                  x.image_url
                    ? `
                      <img
                        src="${esc(
                          x.image_url
                        )}"
                        alt="${esc(
                          x.name
                        )}"
                        loading="lazy">
                      `
                    : esc(
                        (
                          x.name ||
                          'A'
                        )[0]
                      )
                }

              </div>

              <h3>
                ${esc(x.name)}
              </h3>

              <p>
                <b>
                  ${esc(
                    x.title || ''
                  )}
                </b>
              </p>

              <p>
                ${esc(
                  x.bio || ''
                )}
              </p>

            </article>

            `
          ).join('')
        : '';

  }


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
        x => `

          <option
            value="${esc(x.id)}">

            ${esc(x.name)}
            —
            ${esc(
              x.title || ''
            )}

          </option>

        `
      ).join('');

  }


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
        x => `

          <option
            value="${esc(x.id)}">

            ${esc(x.name)}

          </option>

        `
      ).join('');

  }


  const s =
    d.settings || {};


  if($('phone')) {

    $('phone').textContent =
      s.phone || '—';

  }


  if($('phoneText')) {

    $('phoneText').textContent =
      s.phone || '—';

  }


  if($('phoneLink')) {

    $('phoneLink').href =
      s.phone
        ? 'tel:' + s.phone
        : '#';

  }


  if($('email')) {

    $('email').textContent =
      s.email || '—';

  }


  if($('emailText')) {

    $('emailText').textContent =
      s.email || '—';

  }


  if($('emailLink')) {

    $('emailLink').href =
      s.email
        ? 'mailto:' + s.email
        : '#';

  }


  const w =
    s.whatsapp
      ? `https://wa.me/${String(
          s.whatsapp
        ).replace(/\D/g,'')}`
      : '#';


  if($('waLink')) {

    $('waLink').href =
      w;

  }


  if($('waHero')) {

    $('waHero').href =
      w;

  }


  if($('address')) {

    $('address').textContent =
      s.address || '';

  }

}


async function init() {

  try {

    const d =
      await api(
        '?api=data'
      );

    render(d);


    if($('date')) {

      const now =
        new Date();

      now.setMinutes(
        now.getMinutes()
        -
        now.getTimezoneOffset()
      );


      $('date').min =
        now.toISOString()
          .slice(0,10);

      $('date').value =
        now.toISOString()
          .slice(0,10);

    }


    applyLanguage();

  }

  catch(e) {

    console.error(
      'Azaad Clinic:',
      e
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


async function loadSlots() {

  chosen = '';


  if(
    !$('doctor') ||
    !$('service') ||
    !$('date')
  ) {

    return;

  }


  if(
    !$('doctor').value ||
    !$('service').value ||
    !$('date').value
  ) {

    if($('slots')) {

      $('slots').textContent =
        tr('chooseDate');

    }

    return;

  }


  if($('slots')) {

    $('slots').textContent =
      tr('loadingSlots');

  }


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
      Array.isArray(d.slots)
        ? d.slots
        : [];


    if(!$('slots'))
      return;


    $('slots').innerHTML =
      slots.length
        ? slots.map(
            t => `

            <button
              class="slot"
              type="button"
              data-t="${esc(t)}">

              ${esc(t)}

            </button>

            `
          ).join('')
        : esc(
            tr('noSlots')
          );


    document
      .querySelectorAll('.slot')
      .forEach(b => {

        b.onclick = () => {

          document
            .querySelectorAll(
              '.slot'
            )
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

  catch(e) {

    console.error(e);

    if($('slots')) {

      $('slots').textContent =
        tr('slotsError');

    }

  }

}


if($('bookingForm')) {

  $('bookingForm').onsubmit =
    async e => {

      e.preventDefault();


      if(!chosen) {

        if($('message')) {

          $('message').textContent =
            tr('chooseSlot');

          $('message').style.color =
            '#a13a3a';

        }

        return;

      }


      const submitButton =
        $('bookingForm')
          .querySelector(
            'button[type="submit"]'
          );


      try {

        if(submitButton) {

          submitButton.disabled =
            true;

          submitButton.style.opacity =
            '0.7';

        }


        const d =
          await api(
            '?api=book',
            {

              method:'POST',

              headers:{
                'Content-Type':
                  'application/json'
              },

              body:JSON.stringify({

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
          d.booking_code ||
          (
            'AZD-' +
            Math.floor(
              100000 +
              Math.random() *
              900000
            )
          );


        if($('message')) {

          $('message').innerHTML =
            `
              <strong>
                ${esc(
                  tr('booked')
                )}
              </strong>

              <span
                style="
                  display:block;
                  font-size:1.2em;
                  margin-top:8px;
                  font-weight:700;
                ">

                ${esc(
                  bookingCode
                )}

              </span>
            `;

          $('message').style.color =
            '#16734a';

        }


        $('bookingForm').reset();

        chosen = '';


        if($('slots')) {

          $('slots').textContent =
            tr('bookingReceived');

        }

      }

      catch(e) {

        console.error(e);

        if($('message')) {

          $('message').textContent =
            e.message ||
            tr('loadError');

          $('message').style.color =
            '#a13a3a';

        }

      }

      finally {

        if(submitButton) {

          submitButton.disabled =
            false;

          submitButton.style.opacity =
            '';

        }

      }

    };

}


[
  'doctor',
  'service',
  'date'
].forEach(id => {

  const el = $(id);

  if(el) {

    el.onchange =
      loadSlots;

  }

});


if($('year')) {

  $('year').textContent =
    new Date()
      .getFullYear();

}


document
  .querySelectorAll(
    '.lang-btn'
  )
  .forEach(b => {

    b.onclick =
      () =>
        setLanguage(
          b.dataset.lang
        );

  });


if($('menu')) {

  $('menu').onclick = () => {

    const nav =
      $('nav');

    if(!nav)
      return;


    const open =
      nav.classList.toggle(
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
  .forEach(a => {

    a.onclick = () => {

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


applyLanguage();

init();
