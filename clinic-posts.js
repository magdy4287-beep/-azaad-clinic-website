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
   * 📲 مشاركة الموقع الإلكتروني للعيادة
   *
   * IMPORTANT:
   * - لا يحتوي على Service Role Key
   * - لا يغير نظام الحجز الموجود في app.js
   * - يستخدم الـ public Edge Functions فقط
   * - لا يعرض أي بيانات مرضى
   *
   * مشاركة الموقع:
   *
   * 📱 تستخدم Web Share API في الأجهزة
   *     التي تدعم قائمة المشاركة الأصلية.
   *
   * 💬 يستطيع المستخدم اختيار:
   *     WhatsApp
   *     Messenger
   *     Messages
   *     البريد الإلكتروني
   *     أو أي تطبيق مشاركة متاح على جهازه.
   *
   * ❌ لا يتم فتح WhatsApp العيادة.
   * ❌ لا يتم استخدام رقم WhatsApp العيادة.
   * ❌ لا يتم إرسال بيانات المرضى.
   *
   * =========================================================
   */


  /* =========================================================
     PUBLIC APIs
     ========================================================= */

  const CLINIC_API =
    "https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinic";

  const POSTS_API =
    "https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-content";


  /* =========================================================
     WEBSITE
     ========================================================= */

  const WEBSITE_URL =
    "https://magdy4287-beep.github.io/-azaad-clinic-website/";


  /* =========================================================
     SHARE TEXT
     ========================================================= */

  const WEBSITE_SHARE_TITLE =
    "Azaad Clinic | عيادة أزاد للصحة النفسية";


  const WEBSITE_SHARE_TEXT =
    "🏥 عيادة أزاد للصحة النفسية\n\n" +
    "🌐 الموقع الإلكتروني للعيادة\n\n" +
    "تعرف على خدمات العيادة وفريقنا واحجز موعدك بسهولة:\n\n" +
    WEBSITE_URL;


  /* =========================================================
     HELPERS
     ========================================================= */

  function esc(value) {

    return String(value ?? "").replace(
      /[&<>"']/g,
      character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[character])
    );

  }


  function safeUrl(url) {

    const value =
      String(url || "").trim();

    if (!value) {
      return "";
    }

    try {

      const parsed =
        new URL(value);

      if (
        parsed.protocol === "https:" ||
        parsed.protocol === "http:"
      ) {

        return parsed.href;

      }

    } catch (_) {}

    return "";

  }


  /* =========================================================
     GENERIC PUBLIC API REQUEST
     ========================================================= */

  async function request(
    url
  ) {

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        20000
      );

    try {

      const response =
        await fetch(
          url,
          {
            method: "GET",
            cache: "no-store",
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

      } catch (_) {

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

      clearTimeout(timeout);

    }

  }


  /* =========================================================
     SERVICES
     ========================================================= */

  function getServiceName(service) {

    return (
      service?.name ||
      service?.title ||
      service?.service_name ||
      "خدمة نفسية"
    );

  }


  function getServiceDescription(service) {

    return (
      service?.description ||
      service?.short_description ||
      service?.details ||
      "خدمة نفسية مصممة لتناسب احتياجاتك."
    );

  }


  function getServiceDuration(service) {

    const duration =
      service?.duration_minutes ??
      service?.duration ??
      null;


    if (!duration) {

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
        ⏱️ ${esc(duration)} دقيقة
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
      !Array.isArray(services) ||
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
          🩺 خدمات العيادة سيتم تحديثها قريبًا.
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

    return (
      doctor?.name ||
      doctor?.full_name ||
      doctor?.display_name ||
      "طبيب"
    );

  }


  function getDoctorTitle(
    doctor
  ) {

    return (
      doctor?.title ||
      doctor?.specialty ||
      doctor?.specialization ||
      "متخصص في الصحة النفسية"
    );

  }


  function getDoctorBio(
    doctor
  ) {

    return (
      doctor?.bio ||
      doctor?.description ||
      doctor?.short_bio ||
      "متخصص يعمل معك للوصول إلى حياة أكثر توازنًا."
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
      !Array.isArray(doctors) ||
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
          🧑‍⚕️ فريق العيادة سيتم تحديثه قريبًا.
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


      /*
       * Save public clinic data.
       */

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


      /*
       * IMPORTANT:
       * Never leave "جاري التحميل..."
       * forever.
       */

      if (servicesGrid) {

        servicesGrid.innerHTML = `
          <div
            class="empty"
            style="
              grid-column:1/-1;
              text-align:center;
            "
          >
            ⚠️ تعذر تحميل خدمات العيادة حاليًا.
            <br>
            يرجى تحديث الصفحة والمحاولة مرة أخرى.
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
            "
          >
            ⚠️ تعذر تحميل فريق العيادة حاليًا.
            <br>
            يرجى تحديث الصفحة والمحاولة مرة أخرى.
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
          AZAAD CLINIC
        </div>


        <h2>
          المنشورات والعروض
        </h2>


        <p class="section-intro">
          آخر الأخبار والعروض والمحتوى
          من عيادة آزاد للصحة النفسية.
        </p>


        <div
          id="clinicPostsGrid"
          class="cards"
        >

          <div class="loading">
            جاري تحميل المنشورات...
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


    if (!posts.length) {

      section.style.display =
        "none";

      return;

    }


    section.style.display =
      "";


    grid.innerHTML =
      posts
        .map(
          post => {

            let media = "";


            /*
             * IMAGE
             */

            if (
              post.media_type === "image" &&
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
                        post.title ||
                        "Azaad Clinic"
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
              post.media_type === "video" &&
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

                      المتصفح لا يدعم تشغيل الفيديو.

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
                    عرض المزيد
                  </a>

                `
                : "";


            let dateText =
              "";


            if (
              post.published_at
            ) {

              try {

                const date =
                  new Date(
                    post.published_at
                  );


                if (
                  !Number.isNaN(
                    date.getTime()
                  )
                ) {

                  dateText =
                    date.toLocaleDateString(
                      "ar-EG",
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

              }

              catch (_) {}

            }


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
                          ${esc(dateText)}
                        </div>
                      `
                      : ""
                  }


                  <h3>
                    ${esc(
                      post.title ||
                      "منشور من عيادة آزاد"
                    )}
                  </h3>


                  ${
                    post.content
                      ? `
                        <p>
                          ${esc(
                            post.content
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
          جاري تحميل المنشورات...
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


      renderPosts(
        posts
      );

    }

    catch (error) {

      console.warn(
        "Azaad public posts:",
        error
      );


      /*
       * Posts are optional.
       * They must never break
       * the rest of the website.
       */

      if (grid) {

        grid.innerHTML = "";

      }


      section.style.display =
        "none";

    }

  }


  /* =========================================================
     WEBSITE SHARE
     ========================================================= */

  function getWebsiteShareData() {

    return {

      title:
        WEBSITE_SHARE_TITLE,

      text:
        WEBSITE_SHARE_TEXT,

      url:
        WEBSITE_URL

    };

  }


  /* =========================================================
     COPY WEBSITE URL
     ========================================================= */

  async function copyWebsiteUrl() {

    try {

      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
          "function"
      ) {

        await navigator.clipboard.writeText(
          WEBSITE_URL
        );

        return true;

      }

    }

    catch (_) {}


    /*
     * Fallback for older browsers.
     */

    try {

      const textarea =
        document.createElement(
          "textarea"
        );


      textarea.value =
        WEBSITE_URL;


      textarea.setAttribute(
        "readonly",
        ""
      );


      textarea.style.position =
        "fixed";


      textarea.style.opacity =
        "0";


      textarea.style.pointerEvents =
        "none";


      document.body.appendChild(
        textarea
      );


      textarea.select();


      const copied =
        document.execCommand(
          "copy"
        );


      textarea.remove();


      return copied;

    }

    catch (_) {

      return false;

    }

  }


  /* =========================================================
     WEBSITE SHARE - MAIN
     ========================================================= */

  async function shareClinicWebsite() {

    const shareData =
      getWebsiteShareData();


    /*
     * =======================================================
     * PRIMARY METHOD
     * =======================================================
     *
     * navigator.share opens the native share sheet.
     *
     * On iPhone / iPad:
     *
     * 📱 مشاركة
     *   ├── WhatsApp
     *   ├── Messenger
     *   ├── Messages
     *   ├── Mail
     *   └── other available apps
     *
     * IMPORTANT:
     *
     * We DO NOT specify a WhatsApp number.
     * We DO NOT open a clinic WhatsApp conversation.
     */

    if (
      typeof navigator.share ===
      "function"
    ) {

      try {

        await navigator.share(
          shareData
        );

        return;

      }

      catch (error) {

        /*
         * User cancellation is normal.
         * Do not show an error.
         */

        if (
          error?.name ===
          "AbortError"
        ) {

          return;

        }

        console.warn(
          "Azaad Clinic share:",
          error
        );

      }

    }


    /*
     * =======================================================
     * FALLBACK
     * =======================================================
     *
     * Some desktop browsers do not support
     * navigator.share.
     *
     * In that case we copy the website URL
     * so the user can paste it into:
     *
     * WhatsApp / Messenger / Email / etc.
     */

    const copied =
      await copyWebsiteUrl();


    if (copied) {

      showShareFallbackMessage(
        "تم نسخ رابط الموقع الإلكتروني للعيادة. يمكنك الآن لصقه ومشاركته عبر WhatsApp أو Messenger أو أي تطبيق آخر."
      );

      return;

    }


    /*
     * Final fallback:
     * show the URL visibly.
     */

    showShareFallbackMessage(
      `رابط موقع العيادة:\n${WEBSITE_URL}`
    );

  }


  /* =========================================================
     SHARE FALLBACK MESSAGE
     ========================================================= */

  function showShareFallbackMessage(
    message
  ) {

    let existing =
      document.getElementById(
        "azaadShareMessage"
      );


    if (!existing) {

      existing =
        document.createElement(
          "div"
        );


      existing.id =
        "azaadShareMessage";


      existing.style.position =
        "fixed";


      existing.style.left =
        "16px";


      existing.style.right =
        "16px";


      existing.style.bottom =
        "20px";


      existing.style.zIndex =
        "99999";


      existing.style.padding =
        "16px 18px";


      existing.style.borderRadius =
        "14px";


      existing.style.background =
        "#101b56";


      existing.style.color =
        "#fff";


      existing.style.boxShadow =
        "0 10px 35px rgba(0,0,0,.25)";


      existing.style.textAlign =
        "center";


      existing.style.lineHeight =
        "1.8";


      existing.style.fontSize =
        "15px";


      document.body.appendChild(
        existing
      );

    }


    existing.textContent =
      message;


    clearTimeout(
      existing._azaadShareTimer
    );


    existing._azaadShareTimer =
      setTimeout(
        () => {

          existing.remove();

        },
        5000
      );

  }


  /* =========================================================
     SETUP WEBSITE SHARE BUTTON
     ========================================================= */

  function setupWebsiteShareButton() {

    /*
     * The button already exists in index.html:
     *
     * #shareLocation
     *
     * We do not create a second button.
     */

    const button =
      document.getElementById(
        "shareLocation"
      );


    if (!button) {

      return;

    }


    /*
     * IMPORTANT:
     *
     * Remove the old href that opened
     * WhatsApp / any external conversation.
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
      "role",
      "button"
    );


    button.setAttribute(
      "aria-label",
      "مشاركة الموقع الإلكتروني للعيادة عبر WhatsApp"
    );


    /*
     * Exact requested visible name.
     */

    button.textContent =
      "📲 مشاركة الموقع الإلكتروني للعيادة عبر WhatsApp";


    button.style.cursor =
      "pointer";


    /*
     * Avoid duplicate listeners.
     */

    if (
      button.dataset.azaadShareReady ===
      "true"
    ) {

      return;

    }


    button.dataset.azaadShareReady =
      "true";


    button.addEventListener(
      "click",
      async event => {

        event.preventDefault();

        event.stopPropagation();


        await shareClinicWebsite();

      }
    );

  }


  /* =========================================================
     INITIALIZATION
     ========================================================= */

  async function start() {

    /*
     * IMPORTANT:
     *
     * Setup the share button FIRST.
     * This guarantees that the user can
     * use it without waiting for Supabase.
     */

    setupWebsiteShareButton();


    /*
     * Load services + team.
     */

    await loadClinicTeamAndServices();


    /*
     * Load public posts.
     */

    await loadPosts();


    /*
     * Run share setup again in case
     * another script modified the DOM.
     */

    setupWebsiteShareButton();

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
        once: true
      }
    );

  }

  else {

    start();

  }


})();
