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

  async function request(url) {

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


  function renderServices(services) {

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

  function getDoctorName(doctor) {

    return (
      doctor?.name ||
      doctor?.full_name ||
      doctor?.display_name ||
      "طبيب"
    );

  }


  function getDoctorTitle(doctor) {

    return (
      doctor?.title ||
      doctor?.specialty ||
      doctor?.specialization ||
      "متخصص في الصحة النفسية"
    );

  }


  function getDoctorBio(doctor) {

    return (
      doctor?.bio ||
      doctor?.description ||
      doctor?.short_bio ||
      "متخصص يعمل معك للوصول إلى حياة أكثر توازنًا."
    );

  }


  function getDoctorImage(doctor) {

    return (
      doctor?.image_url ||
      doctor?.photo_url ||
      doctor?.avatar_url ||
      doctor?.image ||
      doctor?.photo ||
      ""
    );

  }


  function renderDoctors(doctors) {

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


  function renderPosts(posts) {

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


      if (grid) {
        grid.innerHTML = "";
      }


      section.style.display =
        "none";

    }

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
               *
               * We will convert it below.
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
      "Azaad Clinic | عيادة آزاد للصحة النفسية";


    const shareText =
      "🌐 مشاركة الموقع الإلكتروني للعيادة\n\n" +
      "🏥 Azaad Clinic - عيادة آزاد للصحة النفسية\n\n" +
      "يمكنك التعرف على خدمات العيادة وفريقها وحجز موعد بسهولة.";


    const shareUrl =
      WEBSITE_URL;


    /*
     * =======================================================
     * NATIVE DEVICE SHARE
     * =======================================================
     *
     * هذا هو السلوك المطلوب:
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
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
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

        /*
         * المستخدم قد يكون أغلق
         * نافذة المشاركة.
         *
         * لا نعرض له رسالة خطأ
         * في هذه الحالة.
         */

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


    /*
     * =======================================================
     * FALLBACK — COPY LINK
     * =======================================================
     */

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
          "تم نسخ رابط موقع العيادة الإلكتروني.\n\nيمكنك الآن فتح WhatsApp أو Messenger أو أي تطبيق آخر ولصق الرابط وإرساله."
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


    /*
     * =======================================================
     * FINAL FALLBACK
     * =======================================================
     */

    try {

      window.prompt(
        "انسخ رابط موقع العيادة الإلكتروني:",
        shareUrl
      );

    }

    catch (_) {}


    return false;

  }


  /* =========================================================
     SET SHARE LOCATION BUTTON
     ========================================================= */

  function setupWebsiteShareButton() {

    /*
     * Remove obsolete WhatsApp-specific
     * buttons first.
     */

    removeOldClinicWhatsAppButtons();


    /*
     * The existing location-share button
     * is the button that should become
     * the general website sharing button.
     */

    const button =
      document.getElementById(
        "shareLocation"
      );


    if (!button) {

      /*
       * If it does not exist,
       * create it near the location actions.
       */

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
        "📲 مشاركة الموقع الإلكتروني للعيادة عبر WhatsApp";


      newButton.setAttribute(
        "aria-label",
        "مشاركة الموقع الإلكتروني للعيادة عبر WhatsApp"
      );


      newButton.addEventListener(
        "click",
        event => {

          event.preventDefault();

          shareClinicWebsite();

        }
      );


      locationActions.appendChild(
        newButton
      );


      return;

    }


    /*
     * =======================================================
     * EXISTING BUTTON
     * =======================================================
     */

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
      "مشاركة الموقع الإلكتروني للعيادة عبر WhatsApp"
    );


    button.dataset.action =
      "share-clinic-website";


    button.textContent =
      "📲 مشاركة الموقع الإلكتروني للعيادة عبر WhatsApp";


    button.style.cursor =
      "pointer";


    /*
     * Clone the button to remove
     * previous click handlers.
     */

    const replacement =
      button.cloneNode(true);


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
      "مشاركة الموقع الإلكتروني للعيادة عبر WhatsApp"
    );


    replacement.dataset.action =
      "share-clinic-website";


    replacement.textContent =
      "📲 مشاركة الموقع الإلكتروني للعيادة عبر WhatsApp";


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

    /*
     * Previous versions may have created
     * one or more extra WhatsApp/share
     * buttons dynamically.
     *
     * Keep:
     *
     * 1️⃣ Google Maps
     * 2️⃣ Website Share
     *
     * Remove obsolete WhatsApp-specific
     * duplicate buttons.
     */

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

              /*
               * Convert it rather than remove it.
               */

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


          /*
           * Delay slightly so dynamic
           * DOM operations finish first.
           */

          setTimeout(
            () => {

              normalizeShareArea();

            },
            50
          );

        }
      );


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
     INITIALIZATION
     ========================================================= */

  async function start() {

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
