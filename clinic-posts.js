(() => {

  "use strict";

  /*
   * =========================================================
   * AZAAD CLINIC
   * PUBLIC WEBSITE CONTENT
   * clinic-posts.js
   * =========================================================
   *
   * 🏥 عرض الخدمات
   * 🧑‍⚕️ عرض فريق العيادة
   * 📣 عرض المنشورات
   * 📲 مشاركة الموقع الإلكتروني للعيادة
   *
   * IMPORTANT:
   * - لا يحتوي على Service Role Key
   * - لا يتعامل مع بيانات المرضى
   * - لا يغير نظام الحجز الموجود في app.js
   * - مشاركة الموقع لا تفتح محادثة مع رقم العيادة
   * - المستخدم هو من يختار التطبيق أو الشخص الذي يريد المشاركة معه
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

    } finally {

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
     REMOVE OLD LOCATION-SHARING BUTTONS
     =========================================================
     
     🗑️ الزر المطلوب حذفه:
     
     "مشاركة موقع العيادة عبر WhatsApp"
     
     هذا الزر لا نحتاجه بعد الآن لأن مشاركة
     الموقع أصبحت من خلال زر واحد فقط:
     
     "مشاركة الموقع الإلكتروني للعيادة عبر WhatsApp"
     
     ========================================================= */

  function removeOldLocationShareButton() {

    const possibleIds = [

      "shareLocation",

      "shareClinicLocation",

      "whatsappLocation",

      "shareLocationWhatsApp",

      "clinicLocationWhatsApp"

    ];


    possibleIds.forEach(
      id => {

        const element =
          document.getElementById(
            id
          );


        if (!element) {
          return;
        }


        /*
         * نحذف العنصر نفسه.
         */

        element.remove();

      }
    );


    /*
     * إذا كان الزر موجودًا داخل
     * location-actions فقط كزر قديم،
     * نحاول تنظيف الفراغ الناتج.
     */

    const locationActions =
      document.querySelector(
        ".location-actions"
      );


    if (locationActions) {

      const buttons =
        locationActions.querySelectorAll(
          "a, button"
        );


      buttons.forEach(
        element => {

          const text =
            String(
              element.textContent ||
              ""
            ).trim();


          if (
            text.includes(
              "مشاركة موقع العيادة"
            ) &&
            text.includes(
              "WhatsApp"
            )
          ) {

            element.remove();

          }

        }
      );

    }

  }



  /* =========================================================
     WEBSITE SHARE
     ========================================================= */

  function getWebsiteShareText() {

    return (
      "🏥 Azaad Clinic - عيادة آزاد للصحة النفسية\n\n" +
      "🌐 مشاركة الموقع الإلكتروني للعيادة\n\n" +
      "يمكنك زيارة الموقع الإلكتروني للعيادة والتعرف على خدماتنا وفريقنا وحجز موعد بسهولة."
    );

  }



  /*
   * ---------------------------------------------------------
   * PRIMARY SHARE
   * ---------------------------------------------------------
   *
   * نستخدم Web Share API أولاً.
   *
   * هذا هو السلوك المطلوب:
   *
   * 👤 المستخدم يضغط مشاركة
   * 📱 الجهاز يعرض قائمة المشاركة
   * 💬 المستخدم يختار WhatsApp
   * 👥 أو Messenger
   * ✉️ أو البريد
   * 📲 أو أي تطبيق آخر
   *
   * ولا يتم فتح محادثة العيادة تلقائيًا.
   *
   */

  async function shareClinicWebsite() {

    const shareTitle =
      "Azaad Clinic | عيادة آزاد للصحة النفسية";

    const shareText =
      getWebsiteShareText();

    const shareUrl =
      WEBSITE_URL;


    /*
     * Web Share API
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


        return;

      }

      catch (error) {

        /*
         * المستخدم قد يكون ضغط Cancel.
         * لا نظهر رسالة خطأ في هذه الحالة.
         */

        if (
          error?.name ===
          "AbortError"
        ) {

          return;

        }

        console.warn(
          "Web Share failed:",
          error
        );

      }

    }


    /*
     * -------------------------------------------------------
     * FALLBACK
     * -------------------------------------------------------
     *
     * إذا كان المتصفح لا يدعم Web Share:
     *
     * نفتح WhatsApp بدون رقم عيادة.
     *
     * هذا يعني أن WhatsApp نفسه سيطلب من
     * المستخدم اختيار جهة الإرسال.
     *
     * لا يوجد:
     *
     * wa.me/رقم_العيادة
     *
     * إطلاقًا.
     *
     */

    const whatsappUrl =
      "https://wa.me/?text=" +
      encodeURIComponent(
        `${shareText}\n\n${shareUrl}`
      );


    try {

      window.open(
        whatsappUrl,
        "_blank",
        "noopener,noreferrer"
      );

    }

    catch (_) {

      window.location.href =
        whatsappUrl;

    }

  }



  /* =========================================================
     SHARE BUTTON SETUP
     ========================================================= */

  function setupClinicWebsiteShareButton() {

    /*
     * إزالة الزر القديم أولاً.
     */

    removeOldLocationShareButton();


    const possibleIds = [

      "shareClinicWhatsApp",

      "shareClinicWebsiteWhatsApp",

      "whatsappClinicShare",

      "shareWebsiteWhatsApp",

      "clinicWhatsAppShare"

    ];


    let button = null;


    for (
      const id of possibleIds
    ) {

      const candidate =
        document.getElementById(
          id
        );


      if (candidate) {

        button =
          candidate;

        break;

      }

    }


    /*
     * دعم data-action.
     */

    if (!button) {

      button =
        document.querySelector(
          '[data-action="share-clinic-whatsapp"]'
        );

    }


    /*
     * -------------------------------------------------------
     * EXISTING BUTTON
     * -------------------------------------------------------
     */

    if (button) {

      /*
       * إزالة href القديم حتى لا
       * يفتح WhatsApp الخاص بالعيادة.
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


      button.title =
        "مشاركة الموقع الإلكتروني للعيادة";


      button.style.cursor =
        "pointer";


      /*
       * Clone removes previous event
       * listeners safely.
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


      replacement.title =
        "مشاركة الموقع الإلكتروني للعيادة";


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


      return;

    }



    /* =======================================================
       CREATE FALLBACK BUTTON
       ======================================================= */

    const contact =
      document.getElementById(
        "contact"
      );


    if (!contact) {
      return;
    }


    if (
      document.getElementById(
        "shareClinicWhatsApp"
      )
    ) {
      return;
    }


    const wrapper =
      document.createElement(
        "div"
      );


    wrapper.style.cssText = `
      margin-top:20px;
      text-align:center;
    `;


    const newButton =
      document.createElement(
        "button"
      );


    newButton.id =
      "shareClinicWhatsApp";


    newButton.type =
      "button";


    newButton.className =
      "btn";


    newButton.textContent =
      "📲 مشاركة الموقع الإلكتروني للعيادة عبر WhatsApp";


    newButton.setAttribute(
      "aria-label",
      "مشاركة الموقع الإلكتروني للعيادة عبر WhatsApp"
    );


    newButton.title =
      "مشاركة الموقع الإلكتروني للعيادة";


    newButton.addEventListener(
      "click",
      event => {

        event.preventDefault();

        shareClinicWebsite();

      }
    );


    wrapper.appendChild(
      newButton
    );


    const container =
      contact.querySelector(
        ".container"
      );


    if (container) {

      container.appendChild(
        wrapper
      );

    }

    else {

      contact.appendChild(
        wrapper
      );

    }

  }



  /* =========================================================
     INITIALIZATION
     ========================================================= */

  async function start() {

    /*
     * 🗑️ إزالة الزر القديم
     * قبل أي شيء.
     */

    removeOldLocationShareButton();


    /*
     * 📲 تجهيز زر مشاركة الموقع
     */

    setupClinicWebsiteShareButton();


    /*
     * 🏥 تحميل الخدمات والفريق
     */

    await loadClinicTeamAndServices();


    /*
     * 📣 تحميل المنشورات
     */

    await loadPosts();


    /*
     * 🔄 إعادة الفحص بعد إنشاء
     * المحتوى الديناميكي.
     */

    removeOldLocationShareButton();

    setupClinicWebsiteShareButton();

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
