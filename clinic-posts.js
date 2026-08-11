(() => {

  "use strict";

  const API =
    "https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-content";

  const esc = value =>
    String(value ?? "").replace(
      /[&<>"']/g,
      c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[c])
    );


  function createSection() {

    let section =
      document.getElementById("clinicPosts");

    if (section)
      return section;


    section =
      document.createElement("section");

    section.id = "clinicPosts";
    section.className = "section section-light";


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
          class="cards">

          <div class="loading">
            جاري تحميل المنشورات...
          </div>

        </div>

      </div>

    `;


    const booking =
      document.getElementById("booking");

    const contact =
      document.getElementById("contact");

    const main =
      document.querySelector("main");


    /*
      Put posts before booking.
      This keeps the existing booking
      system completely untouched.
    */

    if (booking && booking.parentNode) {

      booking.parentNode.insertBefore(
        section,
        booking
      );

    }

    else if (contact && contact.parentNode) {

      contact.parentNode.insertBefore(
        section,
        contact
      );

    }

    else if (main) {

      main.appendChild(section);

    }

    else {

      return null;

    }


    return section;

  }


  function renderPosts(posts) {

    const section =
      createSection();

    if (!section)
      return;


    const grid =
      document.getElementById(
        "clinicPostsGrid"
      );

    if (!grid)
      return;


    if (!posts.length) {

      /*
        Hide the section when there
        are currently no published posts.
      */

      section.style.display = "none";

      return;

    }


    section.style.display = "";


    grid.innerHTML =
      posts.map(post => {

        let media = "";


        /*
          IMAGE
        */

        if (
          post.media_type === "image" &&
          post.media_url
        ) {

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
                src="${esc(post.media_url)}"
                alt="${esc(post.title || "Azaad Clinic")}"
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


        /*
          VIDEO
        */

        if (
          post.media_type === "video" &&
          post.media_url
        ) {

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
                  src="${esc(post.media_url)}"
                >

                المتصفح لا يدعم تشغيل الفيديو.

              </video>

            </div>

          `;

        }


        /*
          EXTERNAL LINK
        */

        const external =
          post.external_url
            ? `

              <a
                href="${esc(post.external_url)}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn"
              >
                عرض المزيد
              </a>

            `
            : "";


        /*
          DATE
        */

        let dateText = "";

        if (post.published_at) {

          try {

            const date =
              new Date(post.published_at);

            dateText =
              date.toLocaleDateString(
                "ar-EG",
                {
                  year:"numeric",
                  month:"long",
                  day:"numeric"
                }
              );

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
                ?
                `
                <div
                  class="small-note"
                  style="margin-bottom:8px"
                >
                  ${esc(dateText)}
                </div>
                `
                :
                ""
              }


              <h3>
                ${esc(
                  post.title ||
                  "منشور من عيادة آزاد"
                )}
              </h3>


              ${
                post.content
                ?
                `
                <p>
                  ${esc(post.content)}
                </p>
                `
                :
                ""
              }


              ${external}

            </div>

          </article>

        `;

      }).join("");

  }


  async function loadPosts() {

    const section =
      createSection();

    if (!section)
      return;


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
        await fetch(
          API + "?t=" + Date.now(),
          {
            method:"GET",
            cache:"no-store",
            headers:{
              "Accept":"application/json"
            }
          }
        );


      if (!response.ok) {

        throw new Error(
          "HTTP " + response.status
        );

      }


      const data =
        await response.json();


      /*
        The public API already returns
        published posts only.

        We keep this extra check as
        protection in case the API
        returns another record.
      */

      const posts =
        Array.isArray(data.posts)
          ?
          data.posts.filter(
            post =>
              post &&
              post.published === true
          )
          :
          [];


      /*
        Sort newest published content first.
      */

      posts.sort(
        (a,b) =>
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


      renderPosts(posts);


    }

    catch (error) {

      console.warn(
        "Azaad public posts:",
        error
      );


      /*
        Do not break the rest of
        the clinic website if posts
        temporarily fail.
      */

      if (grid) {

        grid.innerHTML = "";

      }

      section.style.display = "none";

    }

  }


  function start() {

    loadPosts();

  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      start,
      {
        once:true
      }
    );

  }

  else {

    start();

  }


})();
