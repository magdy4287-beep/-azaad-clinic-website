(() => {

  const API =
    'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-content';


  const esc = value =>
    String(value ?? '').replace(
      /[&<>"']/g,
      c => ({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#039;'
      }[c])
    );


  async function loadPosts() {

    try {

      const response =
        await fetch(
          API,
          {
            cache:'no-store'
          }
        );


      if (!response.ok)
        return;


      const data =
        await response.json();


      const posts =
        (data.posts || [])
          .filter(
            post =>
              post.published === true
          );


      if (!posts.length)
        return;


      let section =
        document.getElementById(
          'clinicPosts'
        );


      /*
        Create the section automatically.
        No changes to the booking form.
      */

      if (!section) {

        section =
          document.createElement(
            'section'
          );


        section.id =
          'clinicPosts';


        section.className =
          'section section-light';


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
              من العيادة.
            </p>


            <div
              id="clinicPostsGrid"
              class="cards"
            ></div>

          </div>

        `;


        const booking =
          document.getElementById(
            'booking'
          );


        const main =
          document.querySelector(
            'main'
          );


        if (booking) {

          booking.parentNode.insertBefore(
            section,
            booking
          );

        } else if (main) {

          main.appendChild(
            section
          );

        } else {

          return;

        }

      }


      const grid =
        document.getElementById(
          'clinicPostsGrid'
        );


      if (!grid)
        return;


      grid.innerHTML =
        posts.map(
          post => {

            let media =
              '';


            if (
              post.media_type ===
                'image' &&
              post.media_url
            ) {

              media = `

                <img
                  src="${esc(
                    post.media_url
                  )}"
                  alt=""
                  loading="lazy"
                  style="
                    width:100%;
                    max-height:320px;
                    object-fit:cover;
                    border-radius:12px
                  "
                >

              `;

            }


            if (
              post.media_type ===
                'video' &&
              post.media_url
            ) {

              media = `

                <video
                  controls
                  preload="metadata"
                  style="
                    width:100%;
                    max-height:320px;
                    border-radius:12px
                  "
                >

                  <source
                    src="${esc(
                      post.media_url
                    )}"
                  >

                </video>

              `;

            }


            const external =
              post.external_url
                ? `

                  <a
                    href="${esc(
                      post.external_url
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn"
                  >
                    عرض المزيد
                  </a>

                `
                : '';


            return `

              <article
                class="card"
              >

                ${media}


                <h3>
                  ${esc(
                    post.title ||
                    'منشور'
                  )}
                </h3>


                <p>
                  ${esc(
                    post.content ||
                    ''
                  )}
                </p>


                ${external}

              </article>

            `;

          }
        ).join('');


    } catch (error) {

      console.warn(
        'Azaad public posts:',
        error
      );

    }

  }


  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      loadPosts
    );

  } else {

    loadPosts();

  }

})();
