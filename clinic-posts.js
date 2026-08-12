(() => {

  "use strict";

  /*
   * =========================================================
   * AZAAD CLINIC
   * PUBLIC WEBSITE CONTENT
   * clinic-posts.js
   * =========================================================
   *
   * مسؤول عن:
   *
   * 🏥 عرض الخدمات
   * 👨‍⚕️ عرض فريق العيادة
   * 📣 عرض المنشورات
   * 📤 مشاركة الموقع الإلكتروني للعيادة
   *
   * LANGUAGE:
   *
   * 🇪🇬 Arabic:
   *   name
   *   title
   *   bio
   *   description
   *
   * 🇬🇧 English:
   *   name_en
   *   title_en
   *   bio_en
   *   description_en
   *
   * IMPORTANT:
   * - لا يحتوي على Service Role Key
   * - لا يغير نظام الحجز الموجود في app.js
   * - يستخدم الـ public Edge Functions فقط
   * - لا يعرض أي بيانات مرضى
   * - مشاركة الموقع لا تفتح محادثة مع العيادة
   *
   * =========================================================
   */

  const CLINIC_API =
    "https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinic";

  const POSTS_API =
    "https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-content";

  const WEBSITE_URL =
    "https://magdy4287-beep.github.io/-azaad-clinic-website/";

  const LANGUAGE_STORAGE_KEY =
    "azaadClinicLanguage";

  const STATE_KEY =
    "__AZAAD_CLINIC_POSTS_V6__";


  /* =========================================================
     SINGLE INITIALIZATION GUARD
     ========================================================= */

  if (window[STATE_KEY]) {
    return;
  }


  const state = {

    version:
      "6.0.0",

    language:
      null,

    services:
      [],

    doctors:
      [],

    posts:
      [],

    settings:
      {},

    languageTimer:
      null,

    shareObserver:
      null,

    renderTimer:
      null,

    started:
      false

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
          LANGUAGE_STORAGE_KEY
        );

      if (
        saved === "ar" ||
        saved === "en"
      ) {

        return saved;

      }

    }

    catch (_) {}


    const htmlLang =
      String(
        document.documentElement.lang ||
        ""
      )
        .toLowerCase()
        .trim();


    if (
      htmlLang === "en" ||
      htmlLang.startsWith("en-")
    ) {

      return "en";

    }


    return "ar";

  }


  function isEnglish() {

    return (
      getLanguage() === "en"
    );

  }


  function getCurrentLanguage() {

    return getLanguage();

  }


  /* =========================================================
     TEXT
     ========================================================= */

  const TEXT = {

    ar: {

      servicesEmpty:
        "🩺 خدمات العيادة سيتم تحديثها قريبًا.",

      servicesError:
        "⚠️ تعذر تحميل خدمات العيادة حاليًا.\nيرجى تحديث الصفحة والمحاولة مرة أخرى.",

      defaultService:
        "خدمة نفسية",

      defaultServiceDescription:
        "خدمة نفسية مصممة لتناسب احتياجاتك.",

      durationMinute:
        "دقيقة",

      doctorsEmpty:
        "🧑‍⚕️ فريق العيادة سيتم تحديثه قريبًا.",

      doctorsError:
        "⚠️ تعذر تحميل فريق العيادة حاليًا.\nيرجى تحديث الصفحة والمحاولة مرة أخرى.",

      defaultDoctor:
        "طبيب",

      defaultDoctorTitle:
        "متخصص في الصحة النفسية",

      defaultDoctorBio:
        "متخصص يعمل معك للوصول إلى حياة أكثر توازنًا.",

      postsEyebrow:
        "AZAAD CLINIC",

      postsTitle:
        "المنشورات والعروض",

      postsIntro:
        "آخر الأخبار والعروض والمحتوى من عيادة آزاد للصحة النفسية.",

      loadingPosts:
        "جاري تحميل المنشورات...",

      postMore:
        "عرض المزيد",

      defaultPostTitle:
        "منشور من عيادة آزاد",

      videoUnsupported:
        "المتصفح لا يدعم تشغيل الفيديو.",

      shareTitle:
        "Azaad Clinic | عيادة آزاد للصحة النفسية",

      shareText:
        "🌐 مشاركة الموقع الإلكتروني للعيادة\n\n" +
        "🏥 Azaad Clinic - عيادة آزاد للصحة النفسية\n\n" +
        "يمكنك التعرف على خدمات العيادة وفريقها وحجز موعد بسهولة.",

      shareButton:
        "📲 مشاركة الموقع الإلكتروني للعيادة عبر WhatsApp",

      shareAria:
        "مشاركة الموقع الإلكتروني للعيادة عبر WhatsApp",

      copied:
        "تم نسخ رابط موقع العيادة الإلكتروني.\n\nيمكنك الآن فتح WhatsApp أو Messenger أو أي تطبيق آخر ولصق الرابط وإرساله.",

      prompt:
        "انسخ رابط موقع العيادة الإلكتروني:",

      shareDataTitle:
        "Azaad Clinic | عيادة آزاد للصحة النفسية",

      shareDataText:
        "🌐 مشاركة الموقع الإلكتروني للعيادة\n\n" +
        "🏥 Azaad Clinic - عيادة آزاد للصحة النفسية\n\n" +
        "يمكنك التعرف على خدمات العيادة وفريقها وحجز موعد بسهولة."

    },


    en: {

      servicesEmpty:
        "🩺 Our clinic services will be updated soon.",

      servicesError:
        "⚠️ Unable to load clinic services right now.\nPlease refresh the page and try again.",

      defaultService:
        "Mental health service",

      defaultServiceDescription:
        "Mental health service designed around your needs.",

      durationMinute:
        "minutes",

      doctorsEmpty:
        "🧑‍⚕️ Our clinic team will be updated soon.",

      doctorsError:
        "⚠️ Unable to load our clinic team right now.\nPlease refresh the page and try again.",

      defaultDoctor:
        "Doctor",

      defaultDoctorTitle:
        "Mental health specialist",

      defaultDoctorBio:
        "Mental health specialist working with you toward a more balanced life.",

      postsEyebrow:
        "AZAAD CLINIC",

      postsTitle:
        "News, Posts & Offers",

      postsIntro:
        "The latest news, offers, and content from Azaad Clinic for Mental Health.",

      loadingPosts:
        "Loading posts...",

      postMore:
        "View more",

      defaultPostTitle:
        "Azaad Clinic Post",

      videoUnsupported:
        "Your browser does not support video playback.",

      shareTitle:
        "Azaad Clinic | Mental Health Clinic",

      shareText:
        "🌐 Share Azaad Clinic website\n\n" +
        "🏥 Azaad Clinic for Mental Health\n\n" +
        "Explore our services and team and book an appointment easily.",

      shareButton:
        "📲 Share clinic website via WhatsApp",

      shareAria:
        "Share the clinic website via WhatsApp",

      copied:
        "The clinic website link has been copied.\n\nYou can now open WhatsApp, Messenger, or another app and paste the link to share it.",

      prompt:
        "Copy the clinic website link:",

      shareDataTitle:
        "Azaad Clinic | Mental Health Clinic",

      shareDataText:
        "🌐 Share Azaad Clinic website\n\n" +
        "🏥 Azaad Clinic for Mental Health\n\n" +
        "Explore our services and team and book an appointment easily."

    }

  };


  function t(key) {

    const language =
      getCurrentLanguage();

    return (
      TEXT[language]?.[key] ??
      TEXT.ar[key] ??
      ""
    );

  }


  /* =========================================================
     HELPERS
     ========================================================= */

  function esc(value) {

    return String(
      value ?? ""
    ).replace(
      /[&<>"']/g,
      character =>
        ({
          "&":
            "&amp;",

          "<":
            "&lt;",

          ">":
            "&gt;",

          '"':
            "&quot;",

          "'":
            "&#039;"

        }[character])
    );

  }


  function safeUrl(url) {

    const value =
      String(
        url || ""
      ).trim();


    if (!value) {
      return "";
    }


    try {

      const parsed =
        new URL(value);


      if (
        parsed.protocol ===
          "https:" ||
        parsed.protocol ===
          "http:"
      ) {

        return parsed.href;

      }

    }

    catch (_) {}


    return "";

  }


  /* =========================================================
     GENERIC PUBLIC API REQUEST
     ========================================================= */

  async function request(url) {

    const controller =
      new AbortController();


    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        20000
      );


    try {

      const response =
        await fetch(
          url,
          {
            method:
              "GET",

            cache:
              "no-store",

            signal:
              controller.signal,

            headers: {
              Accept:
                "application/json"
            }

          }
        );


      let data = {};


      try {

        data =
          await response.json();

      }

      catch (_) {

        data = {};

      }


      if (!response.ok) {

        throw new Error(
          data?.error ||
          data?.message ||
          `HTTP ${response.status}`
        );

      }


      return data;

    }

    finally {

      clearTimeout(
        timeout
      );

    }

  }


  /* =========================================================
     SERVICES
     ========================================================= */

  function getServiceName(service) {

    if (
      isEnglish()
    ) {

      return (
        service?.name_en ||
        service?.name ||
        service?.title ||
        service?.service_name ||
        t("defaultService")
      );

    }


    return (
      service?.name ||
      service?.title ||
      service?.service_name ||
      t("defaultService")
    );

  }


  function getServiceDescription(service) {

    if (
      isEnglish()
    ) {

      return (
        service?.description_en ||
        service?.description ||
        service?.short_description ||
        service?.details ||
        t("defaultServiceDescription")
      );

    }


    return (
      service?.description ||
      service?.short_description ||
      service?.details ||
      t("defaultServiceDescription")
    );

  }


  function getServiceDuration(service) {

    const duration =
      service?.duration_minutes ??
      service?.duration ??
      null;


    if (
      !duration
    ) {

      return "";

    }


    return `

      <div
        class="small-note"
        style="
          margin-top:10px;
          opacity:.8;
        "
      >
        ⏱️ ${esc(duration)} ${esc(
          t("durationMinute")
        )}
      </div>

    `;

  }


  function renderServices(
    services
  ) {

    const grid =
      document.getElementById(
        "servicesGrid"
      );


    if (!grid) {
      return;
    }


    if (
      !Array.isArray(
        services
      ) ||
      !services.length
    ) {

      grid.innerHTML = `

        <div
          class="empty"
          style="
            grid-column:1/-1;
            text-align:center;
          "
        >
          ${esc(
            t("servicesEmpty")
          )}
        </div>

      `;

      return;

    }


    grid.innerHTML =
      services
        .map(
          service => {

            const name =
              getServiceName(
                service
              );


            const description =
              getServiceDescription(
                service
              );


            const duration =
              getServiceDuration(
                service
              );


            return `

              <article
                class="card clinic-service-card"
                style="
                  height:100%;
                  box-sizing:border-box;
                "
              >

                <div
                  style="
                    font-size:34px;
                    margin-bottom:12px;
                  "
                  aria-hidden="true"
                >
                  🩺
                </div>


                <h3>
                  ${esc(name)}
                </h3>


                <p
                  style="
                    line-height:1.8;
                    margin-bottom:0;
                  "
                >
                  ${esc(description)}
                </p>


                ${duration}

              </article>

            `;

          }
        )
        .join("");

  }


  /* =========================================================
     DOCTORS / TEAM
     ========================================================= */

  function getDoctorName(
    doctor
  ) {

    if (
      isEnglish()
    ) {

      return (
        doctor?.name_en ||
        doctor?.name ||
        doctor?.full_name ||
        doctor?.display_name ||
        t("defaultDoctor")
      );

    }


    return (
      doctor?.name ||
      doctor?.full_name ||
      doctor?.display_name ||
      t("defaultDoctor")
    );

  }


  function getDoctorTitle(
    doctor
  ) {

    if (
      isEnglish()
    ) {

      return (
        doctor?.title_en ||
        doctor?.title ||
        doctor?.specialty ||
        doctor?.specialization ||
        t("defaultDoctorTitle")
      );

    }


    return (
      doctor?.title ||
      doctor?.specialty ||
      doctor?.specialization ||
      t("defaultDoctorTitle")
    );

  }


  function getDoctorBio(
    doctor
  ) {

    if (
      isEnglish()
    ) {

      return (
        doctor?.bio_en ||
        doctor?.bio ||
        doctor?.description ||
        doctor?.short_bio ||
        t("defaultDoctorBio")
      );

    }


    return (
      doctor?.bio ||
      doctor?.description ||
      doctor?.short_bio ||
      t("defaultDoctorBio")
    );

  }


  function getDoctorImage(
    doctor
  ) {

    return (
      doctor?.image_url ||
      doctor?.photo_url ||
      doctor?.avatar_url ||
      doctor?.image ||
      doctor?.photo ||
      ""
    );

  }


  function renderDoctors(
    doctors
  ) {

    const grid =
      document.getElementById(
        "doctorsGrid"
      );


    if (!grid) {
      return;
    }


    if (
      !Array.isArray(
        doctors
      ) ||
      !doctors.length
    ) {

      grid.innerHTML = `

        <div
          class="empty"
          style="
            grid-column:1/-1;
            text-align:center;
          "
        >
          ${esc(
            t("doctorsEmpty")
          )}
        </div>

      `;

      return;

    }


    grid.innerHTML =
      doctors
        .map(
          doctor => {

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


            const image =
              safeUrl(
                getDoctorImage(
                  doctor
                )
              );


            const photo =
              image
                ? `

                  <div
                    style="
                      width:100%;
                      aspect-ratio:1/1;
                      overflow:hidden;
                      border-radius:18px;
                      margin-bottom:16px;
                      background:#f3f5f9;
                    "
                  >

                    <img
                      src="${esc(image)}"
                      alt="${esc(name)}"
                      loading="lazy"
                      decoding="async"
                      style="
                        display:block;
                        width:100%;
                        height:100%;
                        object-fit:cover;
                      "
                      onerror="
                        this.parentElement.innerHTML =
                        '<div style=\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:70px;\\'>🧑‍⚕️</div>';
                      "
                    >

                  </div>

                `
                : `

                  <div
                    style="
                      width:100%;
                      aspect-ratio:1/1;
                      display:flex;
                      align-items:center;
                      justify-content:center;
                      border-radius:18px;
                      margin-bottom:16px;
                      background:#f3f5f9;
                      font-size:70px;
                    "
                  >
                    🧑‍⚕️
                  </div>

                `;


            return `

              <article
                class="card clinic-doctor-card"
                style="
                  height:100%;
                  box-sizing:border-box;
                  overflow:hidden;
                "
              >

                ${photo}


                <h3>
                  ${esc(name)}
                </h3>


                <div
                  style="
                    font-weight:700;
                    margin-top:6px;
                    margin-bottom:10px;
                  "
                >
                  🧑‍⚕️ ${esc(title)}
                </div>


                <p
                  style="
                    line-height:1.8;
                    margin-bottom:0;
                  "
                >
                  ${esc(bio)}
                </p>

              </article>

            `;

          }
        )
        .join("");

  }


  /* =========================================================
     LOAD SERVICES + DOCTORS
     ========================================================= */

  async function loadClinicTeamAndServices() {

    const servicesGrid =
      document.getElementById(
        "servicesGrid"
      );


    const doctorsGrid =
      document.getElementById(
        "doctorsGrid"
      );


    try {

      const data =
        await request(
          CLINIC_API +
          "?api=data&_=" +
          Date.now()
        );


      const services =
        Array.isArray(
          data?.services
        )
          ? data.services
          : [];


      const doctors =
        Array.isArray(
          data?.doctors
        )
          ? data.doctors
          : [];


      state.services =
        services;


      state.doctors =
        doctors;


      state.settings =
        data?.settings || {};


      window.AZAAD_PUBLIC_CLINIC_DATA = {

        services,

        doctors,

        settings:
          data?.settings || {}

      };


      renderServices(
        services
      );


      renderDoctors(
        doctors
      );

    }

    catch (error) {

      console.warn(
        "Azaad Clinic public data:",
        error
      );


      if (servicesGrid) {

        servicesGrid.innerHTML = `

          <div
            class="empty"
            style="
              grid-column:1/-1;
              text-align:center;
              white-space:pre-line;
            "
          >
            ${esc(
              t("servicesError")
            )}
          </div>

        `;

      }


      if (doctorsGrid) {

        doctorsGrid.innerHTML = `

          <div
            class="empty"
            style="
              grid-column:1/-1;
              text-align:center;
              white-space:pre-line;
            "
          >
            ${esc(
              t("doctorsError")
            )}
          </div>

        `;

      }

    }

  }


  /* =========================================================
     POSTS SECTION
     ========================================================= */

  function createPostsSection() {

    let section =
      document.getElementById(
        "clinicPosts"
      );


    if (section) {
      return section;
    }


    section =
      document.createElement(
        "section"
      );


    section.id =
      "clinicPosts";


    section.className =
      "section section-light";


    section.innerHTML = `

      <div class="container">

        <div class="eyebrow">
          ${esc(
            t("postsEyebrow")
          )}
        </div>


        <h2>
          ${esc(
            t("postsTitle")
          )}
        </h2>


        <p class="section-intro">
          ${esc(
            t("postsIntro")
          )}
        </p>


        <div
          id="clinicPostsGrid"
          class="cards"
        >

          <div class="loading">
            ${esc(
              t("loadingPosts")
            )}
          </div>

        </div>

      </div>

    `;


    const booking =
      document.getElementById(
        "booking"
      );


    const contact =
      document.getElementById(
        "contact"
      );


    const main =
      document.querySelector(
        "main"
      );


    if (
      booking &&
      booking.parentNode
    ) {

      booking.parentNode.insertBefore(
        section,
        booking
      );

    }

    else if (
      contact &&
      contact.parentNode
    ) {

      contact.parentNode.insertBefore(
        section,
        contact
      );

    }

    else if (main) {

      main.appendChild(
        section
      );

    }

    else {

      return null;

    }


    return section;

  }


  /* =========================================================
     POST LANGUAGE HELPERS
     ========================================================= */

  function getPostTitle(
    post
  ) {

    if (
      isEnglish()
    ) {

      return (
        post?.title_en ||
        post?.title ||
        t("defaultPostTitle")
      );

    }


    return (
      post?.title ||
      t("defaultPostTitle")
    );

  }


  function getPostContent(
    post
  ) {

    if (
      isEnglish()
    ) {

      return (
        post?.content_en ||
        post?.content ||
        ""
      );

    }


    return (
      post?.content ||
      ""
    );

  }


  function getPostDate(
    post
  ) {

    if (
      !post?.published_at
    ) {

      return "";

    }


    try {

      const date =
        new Date(
          post.published_at
        );


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {

        return "";

      }


      return date.toLocaleDateString(
        isEnglish()
          ? "en-US"
          : "ar-EG",
        {
          year:
            "numeric",

          month:
            "long",

          day:
            "numeric"
        }
      );

    }

    catch (_) {

      return "";

    }

  }


  function renderPosts(
    posts
  ) {

    const section =
      createPostsSection();


    if (!section) {
      return;
    }


    const grid =
      document.getElementById(
        "clinicPostsGrid"
      );


    if (!grid) {
      return;
    }


    if (
      !Array.isArray(
        posts
      ) ||
      !posts.length
    ) {

      section.style.display =
        "none";

      return;

    }


    section.style.display =
      "";


    /*
     * Update the section heading too,
     * because this section can survive
     * a language change.
     */

    const eyebrow =
      section.querySelector(
        ".eyebrow"
      );


    const heading =
      section.querySelector(
        "h2"
      );


    const intro =
      section.querySelector(
        ".section-intro"
      );


    if (eyebrow) {

      eyebrow.textContent =
        t("postsEyebrow");

    }


    if (heading) {

      heading.textContent =
        t("postsTitle");

    }


    if (intro) {

      intro.textContent =
        t("postsIntro");

    }


    grid.innerHTML =
      posts
        .map(
          post => {

            let media = "";


            /*
             * IMAGE
             */

            if (
              post.media_type ===
                "image" &&
              post.media_url
            ) {

              const imageUrl =
                safeUrl(
                  post.media_url
                );


              if (imageUrl) {

                media = `

                  <div
                    class="clinic-post-media"
                    style="
                      width:100%;
                      overflow:hidden;
                      border-radius:14px;
                      margin-bottom:16px;
                    "
                  >

                    <img
                      src="${esc(imageUrl)}"
                      alt="${esc(
                        getPostTitle(post)
                      )}"
                      loading="lazy"
                      decoding="async"
                      style="
                        display:block;
                        width:100%;
                        max-height:420px;
                        object-fit:cover;
                        border-radius:14px;
                      "
                      onerror="
                        this.closest('.clinic-post-media')
                          .style.display='none';
                      "
                    >

                  </div>

                `;

              }

            }


            /*
             * VIDEO
             */

            if (
              post.media_type ===
                "video" &&
              post.media_url
            ) {

              const videoUrl =
                safeUrl(
                  post.media_url
                );


              if (videoUrl) {

                media = `

                  <div
                    class="clinic-post-media"
                    style="
                      width:100%;
                      overflow:hidden;
                      border-radius:14px;
                      margin-bottom:16px;
                    "
                  >

                    <video
                      controls
                      preload="metadata"
                      playsinline
                      style="
                        display:block;
                        width:100%;
                        max-height:420px;
                        border-radius:14px;
                        background:#000;
                      "
                    >

                      <source
                        src="${esc(videoUrl)}"
                      >

                      ${esc(
                        t("videoUnsupported")
                      )}

                    </video>

                  </div>

                `;

              }

            }


            const externalUrl =
              safeUrl(
                post.external_url
              );


            const external =
              externalUrl
                ? `

                  <a
                    href="${esc(
                      externalUrl
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn"
                  >
                    ${esc(
                      t("postMore")
                    )}
                  </a>

                `
                : "";


            const dateText =
              getPostDate(
                post
              );


            const title =
              getPostTitle(
                post
              );


            const content =
              getPostContent(
                post
              );


            return `

              <article
                class="card clinic-post-card"
                style="
                  overflow:hidden;
                "
              >

                ${media}


                <div>

                  ${
                    dateText
                      ? `

                        <div
                          class="small-note"
                          style="
                            margin-bottom:8px;
                          "
                        >
                          ${esc(
                            dateText
                          )}
                        </div>

                      `
                      : ""
                  }


                  <h3>
                    ${esc(title)}
                  </h3>


                  ${
                    content
                      ? `

                        <p>
                          ${esc(
                            content
                          )}
                        </p>

                      `
                      : ""
                  }


                  ${external}

                </div>

              </article>

            `;

          }
        )
        .join("");

  }


  /* =========================================================
     LOAD POSTS
     ========================================================= */

  async function loadPosts() {

    const section =
      createPostsSection();


    if (!section) {
      return;
    }


    const grid =
      document.getElementById(
        "clinicPostsGrid"
      );


    if (grid) {

      grid.innerHTML = `

        <div class="loading">
          ${esc(
            t("loadingPosts")
          )}
        </div>

      `;

    }


    try {

      const response =
        await request(
          POSTS_API +
          "?t=" +
          Date.now()
        );


      const posts =
        Array.isArray(
          response?.posts
        )
          ? response.posts.filter(
              post =>
                post &&
                post.published === true
            )
          : [];


      posts.sort(
        (a, b) =>
          new Date(
            b.published_at ||
            b.created_at ||
            0
          ) -
          new Date(
            a.published_at ||
            a.created_at ||
            0
          )
      );


      state.posts =
        posts;


      renderPosts(
        posts
      );

    }

    catch (error) {

      console.warn(
        "Azaad public posts:",
        error
      );


      if (grid) {
        grid.innerHTML = "";
      }


      section.style.display =
        "none";

    }

  }


  /* =========================================================
     RE-RENDER CONTENT AFTER LANGUAGE CHANGE
     ========================================================= */

  function rerenderPublicContent() {

    renderServices(
      state.services
    );


    renderDoctors(
      state.doctors
    );


    if (
      state.posts.length
    ) {

      renderPosts(
        state.posts
      );

    }


    updateShareButtonLanguage();

  }


  function scheduleRerender() {

    if (
      state.renderTimer
    ) {

      clearTimeout(
        state.renderTimer
      );

    }


    state.renderTimer =
      setTimeout(
        () => {

          state.renderTimer =
            null;

          rerenderPublicContent();

        },
        50
      );

  }


  /* =========================================================
     LANGUAGE WATCHER
     ========================================================= */

  function watchLanguage() {

    let previous =
      getCurrentLanguage();


    state.language =
      previous;


    /*
     * localStorage changes are useful when
     * another tab changes language.
     */

    window.addEventListener(
      "storage",
      event => {

        if (
          event.key ===
          LANGUAGE_STORAGE_KEY
        ) {

          scheduleRerender();

        }

      }
    );


    /*
     * Some versions of the language
     * switcher dispatch a custom event.
     */

    [
      "azaadLanguageChanged",
      "languageChanged",
      "languagechange"
    ]
      .forEach(
        eventName => {

          window.addEventListener(
            eventName,
            () => {

              scheduleRerender();

            }
          );

        }
      );


    /*
     * Fallback watcher.
     *
     * This guarantees that if public-ui.js
     * changes localStorage without dispatching
     * an event, the public cards still update.
     */

    state.languageTimer =
      setInterval(
        () => {

          const current =
            getCurrentLanguage();


          if (
            current !==
            previous
          ) {

            previous =
              current;


            state.language =
              current;


            scheduleRerender();

          }

        },
        300
      );

  }


  /* =========================================================
     REMOVE OLD CLINIC WHATSAPP SHARE
     ========================================================= */

  function removeOldClinicWhatsAppButtons() {

    const selectors = [

      "#shareClinicWhatsApp",

      "#shareClinicWebsiteWhatsApp",

      "#whatsappClinicShare",

      "#shareWebsiteWhatsApp",

      "#clinicWhatsAppShare",

      '[data-action="share-clinic-whatsapp"]'

    ];


    selectors.forEach(
      selector => {

        document
          .querySelectorAll(
            selector
          )
          .forEach(
            element => {

              /*
               * Do not remove the actual
               * location-share button.
               */

              if (
                element.id ===
                "shareLocation"
              ) {

                return;

              }


              element.remove();

            }
          );

      }
    );

  }


  /* =========================================================
     DEVICE SHARE
     ========================================================= */

  async function shareClinicWebsite() {

    const shareTitle =
      t("shareDataTitle");


    const shareText =
      t("shareDataText");


    const shareUrl =
      WEBSITE_URL;


    /*
     * =======================================================
     * NATIVE DEVICE SHARE
     * =======================================================
     *
     * 👤 المستخدم يختار بنفسه:
     *
     * WhatsApp
     * Messenger
     * Messages
     * Telegram
     * Mail
     * AirDrop
     * وغيرها
     *
     * ولا يتم فتح محادثة مع العيادة.
     */

    if (
      typeof navigator !==
        "undefined" &&
      typeof navigator.share ===
        "function"
    ) {

      try {

        await navigator.share({

          title:
            shareTitle,

          text:
            shareText,

          url:
            shareUrl

        });


        return true;

      }

      catch (error) {

        if (
          error?.name ===
          "AbortError"
        ) {

          return false;

        }


        console.warn(
          "Azaad Clinic share error:",
          error
        );

      }

    }


    /* =======================================================
       FALLBACK — COPY LINK
       ======================================================= */

    try {

      if (
        navigator?.clipboard &&
        typeof navigator.clipboard.writeText ===
          "function"
      ) {

        await navigator.clipboard.writeText(
          shareUrl
        );


        alert(
          t("copied")
        );


        return true;

      }

    }

    catch (error) {

      console.warn(
        "Clipboard share fallback:",
        error
      );

    }


    /* =======================================================
       FINAL FALLBACK
       ======================================================= */

    try {

      window.prompt(
        t("prompt"),
        shareUrl
      );

    }

    catch (_) {}


    return false;

  }


  /* =========================================================
     UPDATE SHARE BUTTON LANGUAGE
     ========================================================= */

  function updateShareButtonLanguage() {

    const button =
      document.getElementById(
        "shareLocation"
      );


    if (!button) {
      return;
    }


    button.textContent =
      t("shareButton");


    button.setAttribute(
      "aria-label",
      t("shareAria")
    );


    button.dataset.action =
      "share-clinic-website";


    button.style.cursor =
      "pointer";

  }


  /* =========================================================
     SET SHARE LOCATION BUTTON
     ========================================================= */

  function setupWebsiteShareButton() {

    removeOldClinicWhatsAppButtons();


    const button =
      document.getElementById(
        "shareLocation"
      );


    if (!button) {

      const locationActions =
        document.querySelector(
          ".location-actions"
        );


      if (!locationActions) {
        return;
      }


      const newButton =
        document.createElement(
          "button"
        );


      newButton.id =
        "shareLocation";


      newButton.type =
        "button";


      newButton.className =
        "btn btn-light";


      newButton.textContent =
        t("shareButton");


      newButton.setAttribute(
        "aria-label",
        t("shareAria")
      );


      newButton.dataset.action =
        "share-clinic-website";


      newButton.addEventListener(
        "click",
        event => {

          event.preventDefault();

          event.stopPropagation();

          shareClinicWebsite();

        }
      );


      locationActions.appendChild(
        newButton
      );


      return;

    }


    /*
     * Remove old href because the button
     * must not navigate to a WhatsApp URL.
     */

    button.removeAttribute(
      "href"
    );


    button.removeAttribute(
      "target"
    );


    button.removeAttribute(
      "rel"
    );


    button.setAttribute(
      "type",
      "button"
    );


    button.setAttribute(
      "aria-label",
      t("shareAria")
    );


    button.dataset.action =
      "share-clinic-website";


    button.textContent =
      t("shareButton");


    button.style.cursor =
      "pointer";


    /*
     * Clone the button to remove
     * previous click handlers.
     */

    const replacement =
      button.cloneNode(
        true
      );


    replacement.removeAttribute(
      "href"
    );


    replacement.removeAttribute(
      "target"
    );


    replacement.removeAttribute(
      "rel"
    );


    replacement.setAttribute(
      "type",
      "button"
    );


    replacement.setAttribute(
      "aria-label",
      t("shareAria")
    );


    replacement.dataset.action =
      "share-clinic-website";


    replacement.textContent =
      t("shareButton");


    replacement.style.cursor =
      "pointer";


    replacement.addEventListener(
      "click",
      event => {

        event.preventDefault();

        event.stopPropagation();

        shareClinicWebsite();

      }
    );


    button.replaceWith(
      replacement
    );

  }


  /* =========================================================
     REMOVE UNWANTED MIDDLE BUTTONS
     ========================================================= */

  function removeUnwantedMiddleShareButtons() {

    const unwantedSelectors = [

      "#shareClinicWhatsApp",

      "#shareClinicWebsiteWhatsApp",

      "#whatsappClinicShare",

      "#shareWebsiteWhatsApp",

      "#clinicWhatsAppShare",

      '[data-action="share-clinic-whatsapp"]'

    ];


    unwantedSelectors.forEach(
      selector => {

        document
          .querySelectorAll(
            selector
          )
          .forEach(
            element => {

              if (
                element.id !==
                "shareLocation"
              ) {

                element.remove();

              }

            }
          );

      }
    );


    /*
     * Also remove old generated
     * buttons that explicitly point
     * to wa.me.
     */

    document
      .querySelectorAll(
        ".location-actions a"
      )
      .forEach(
        element => {

          const href =
            String(
              element.getAttribute(
                "href"
              ) || ""
            );


          if (
            href.includes(
              "wa.me/"
            ) ||
            href.includes(
              "api.whatsapp.com/"
            )
          ) {

            if (
              element.id ===
              "shareLocation"
            ) {

              element.removeAttribute(
                "href"
              );

            }

            else {

              element.remove();

            }

          }

        }
      );

  }


  /* =========================================================
     FINAL SHARE BUTTON NORMALIZATION
     ========================================================= */

  function normalizeShareArea() {

    removeUnwantedMiddleShareButtons();

    setupWebsiteShareButton();

    updateShareButtonLanguage();

  }


  /* =========================================================
     OBSERVER
     ========================================================= */

  function observeDynamicShareButtons() {

    if (
      typeof MutationObserver ===
      "undefined"
    ) {

      return;

    }


    if (
      state.shareObserver
    ) {

      return;

    }


    const observer =
      new MutationObserver(
        mutations => {

          let relevant =
            false;


          for (
            const mutation of mutations
            ) {

            if (
              mutation.addedNodes &&
              mutation.addedNodes.length
            ) {

              relevant =
                true;

              break;

            }

          }


          if (!relevant) {
            return;
          }


          setTimeout(
            () => {

              normalizeShareArea();

            },
            50
          );

        }
      );


    state.shareObserver =
      observer;


    try {

      observer.observe(
        document.body,
        {
          childList:
            true,

          subtree:
            true
        }
      );

    }

    catch (_) {}

  }


  /* =========================================================
     PUBLIC REFRESH API
     ========================================================= */

  /*
   * Allows another public UI script to
   * explicitly request a content refresh
   * without touching the booking controller.
   */

  window.AZAAD_PUBLIC_CONTENT =
    {

      version:
        state.version,

      refresh: () => {

        scheduleRerender();

        normalizeShareArea();

      },

      getLanguage:
        getCurrentLanguage

    };


  /* =========================================================
     INITIALIZATION
     ========================================================= */

  async function start() {

    if (
      state.started
    ) {

      return;

    }


    state.started =
      true;


    state.language =
      getCurrentLanguage();


    /*
     * Setup language watcher first.
     */

    watchLanguage();


    /*
     * Setup the share button immediately.
     */

    normalizeShareArea();


    /*
     * Start monitoring dynamic changes.
     */

    observeDynamicShareButtons();


    /*
     * Load public clinic data.
     */

    await loadClinicTeamAndServices();


    /*
     * Load public posts.
     */

    await loadPosts();


    /*
     * Re-check sharing controls
     * after all dynamic content
     * has finished loading.
     */

    normalizeShareArea();


    /*
     * Final render according to the
     * currently selected language.
     */

    rerenderPublicContent();

  }


  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      start,
      {
        once:
          true
      }
    );

  }

  else {

    start();

  }


})();
