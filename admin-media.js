(() => {
  const SUPABASE_URL =
    'https://derofsthjivlkcdnojww.supabase.co';

  const MAX_IMAGE = 50 * 1024 * 1024;
  const MAX_VIDEO = 150 * 1024 * 1024;

  const IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

  const VIDEO_TYPES = [
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ];

  const $id = id =>
    document.getElementById(id);

  const esc = value =>
    String(value ?? '').replace(
      /[&<>"']/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[c])
    );


  function notify(message) {

    if (typeof showToast === 'function') {
      showToast(message);
    } else {
      alert(message);
    }

  }


  function setProgress(text, percent) {

    const box =
      $id('mediaUploadProgress');

    if (!box) return;

    box.classList.remove('hidden');

    box.innerHTML = `

      <div
        style="
          font-weight:700;
          margin-bottom:6px
        "
      >
        ${esc(text)}
      </div>

      <div
        style="
          height:8px;
          background:#e8ebf2;
          border-radius:20px;
          overflow:hidden
        "
      >

        <div
          id="mediaUploadBar"
          style="
            height:100%;
            width:${Math.max(
              0,
              Math.min(100, percent || 0)
            )}%;
            background:#17214f;
            transition:width .15s
          "
        ></div>

      </div>

    `;

  }


  function clearProgress() {

    const box =
      $id('mediaUploadProgress');

    if (box)
      box.classList.add('hidden');

  }


  async function uploadFile(
    file,
    kind
  ) {

    const mime =
      (file.type || '').toLowerCase();

    const isDoctor =
      kind === 'doctor';

    const isImage =
      IMAGE_TYPES.includes(mime);

    const isVideo =
      VIDEO_TYPES.includes(mime);

    const max =
      isVideo
        ? MAX_VIDEO
        : MAX_IMAGE;


    if (
      isDoctor &&
      !isImage
    ) {

      throw new Error(
        'صورة الطبيب يجب أن تكون JPG أو PNG أو WEBP أو GIF.'
      );

    }


    if (
      !isDoctor &&
      !isImage &&
      !isVideo
    ) {

      throw new Error(
        'الملف يجب أن يكون صورة أو فيديو مدعومًا.'
      );

    }


    if (file.size > max) {

      throw new Error(
        isVideo
          ? 'الحد الأقصى للفيديو 150 MB.'
          : 'الحد الأقصى للصورة 50 MB.'
      );

    }


    setProgress(
      'جاري تجهيز الملف...',
      0
    );


    /*
      Ask the protected management
      function for a signed upload URL.
    */

    const signed =
      await managementApi(
        '?api=media-sign',
        {
          method: 'POST',

          body: JSON.stringify({

            file_name:
              file.name,

            mime_type:
              mime,

            file_size:
              file.size,

            kind:
              isDoctor
                ? 'doctor'
                : undefined

          })

        }
      );


    /*
      Supabase signed upload URL.
    */

    const encodedPath =
      signed.path
        .split('/')
        .map(
          encodeURIComponent
        )
        .join('/');


    const uploadUrl =
      `${SUPABASE_URL}/storage/v1/object/upload/sign/` +
      `${encodedPath}?token=${encodeURIComponent(
        signed.token
      )}`;


    /*
      Direct browser -> Supabase upload.
      The file does NOT pass through
      the Edge Function.
    */

    await new Promise(
      (resolve, reject) => {

        const xhr =
          new XMLHttpRequest();


        xhr.open(
          'PUT',
          uploadUrl,
          true
        );


        xhr.setRequestHeader(
          'cache-control',
          '3600'
        );


        xhr.setRequestHeader(
          'content-type',
          mime ||
          'application/octet-stream'
        );


        xhr.setRequestHeader(
          'x-upsert',
          'false'
        );


        xhr.upload.onprogress =
          event => {

            if (
              !event.lengthComputable
            )
              return;


            const percent =
              (
                event.loaded /
                event.total
              ) * 100;


            setProgress(
              `جاري رفع الملف... ${percent.toFixed(0)}%`,
              percent
            );

          };


        xhr.onerror = () => {

          reject(
            new Error(
              'انقطع الاتصال أثناء رفع الملف.'
            )
          );

        };


        xhr.onabort = () => {

          reject(
            new Error(
              'تم إلغاء رفع الملف.'
            )
          );

        };


        xhr.onload = () => {

          if (
            xhr.status >= 200 &&
            xhr.status < 300
          ) {

            resolve();

            return;

          }


          let message =
            'فشل رفع الملف.';


          try {

            const data =
              JSON.parse(
                xhr.responseText ||
                '{}'
              );


            message =
              data.message ||
              data.error ||
              message;

          } catch (_) {}


          reject(
            new Error(message)
          );

        };


        xhr.send(file);

      }
    );


    /*
      Register uploaded media.
    */

    await managementApi(
      '?api=media-record',
      {
        method: 'POST',

        body: JSON.stringify({

          path:
            signed.path,

          file_name:
            file.name,

          mime_type:
            mime,

          file_size:
            file.size,

          media_type:
            isDoctor
              ? 'image'
              : (
                  isVideo
                    ? 'video'
                    : 'image'
                )

        })

      }
    );


    setProgress(
      'تم رفع الملف بنجاح.',
      100
    );


    setTimeout(
      clearProgress,
      1200
    );


    return signed.publicUrl;

  }


  /*
    Doctor image upload
  */

  function addDoctorUpload(form) {

    if (
      form.querySelector(
        '[data-media-doctor-input]'
      )
    )
      return;


    const url =
      $id('doctorImageUrl');


    if (!url)
      return;


    const wrapper =
      document.createElement('div');


    wrapper.style.marginTop =
      '8px';


    wrapper.innerHTML = `

      <div
        class="small-note"
        style="margin-bottom:6px"
      >
        أو اختر صورة من الجهاز / الموبايل
        — الحد الأقصى 50 MB.
      </div>


      <input
        data-media-doctor-input
        type="file"
        accept="
          image/jpeg,
          image/png,
          image/webp,
          image/gif
        "
        style="
          width:100%;
          padding:10px;
          border:1px dashed #cfd5e3;
          border-radius:10px;
          background:#fafbfe
        "
      >


      <div
        id="mediaUploadProgress"
        class="hidden"
        style="margin-top:10px"
      ></div>

    `;


    url.parentElement.appendChild(
      wrapper
    );


    const input =
      wrapper.querySelector('input');


    input.addEventListener(
      'change',
      async () => {

        const file =
          input.files &&
          input.files[0];


        if (!file)
          return;


        input.disabled =
          true;


        try {

          const publicUrl =
            await uploadFile(
              file,
              'doctor'
            );


          url.value =
            publicUrl;


          url.dispatchEvent(
            new Event(
              'input',
              {
                bubbles:true
              }
            )
          );


          notify(
            'تم رفع صورة الطبيب وربطها بنجاح.'
          );


        } catch (error) {

          clearProgress();

          notify(
            error.message
          );


          input.value =
            '';

        } finally {

          input.disabled =
            false;

        }

      }
    );

  }


  /*
    Post image/video upload
  */

  function addPostUpload(form) {

    if (
      form.querySelector(
        '[data-media-post-input]'
      )
    )
      return;


    const url =
      $id('postMediaUrl');


    const type =
      $id('postMediaType');


    if (!url || !type)
      return;


    const wrapper =
      document.createElement('div');


    wrapper.style.marginTop =
      '8px';


    wrapper.innerHTML = `

      <div
        class="small-note"
        style="margin-bottom:6px"
      >
        أو اختر صورة / فيديو من الجهاز
        أو الموبايل.
        الصورة حتى 50 MB والفيديو حتى 150 MB.
      </div>


      <input
        data-media-post-input
        type="file"
        accept="
          image/jpeg,
          image/png,
          image/webp,
          image/gif,
          video/mp4,
          video/webm,
          video/quicktime
        "
        style="
          width:100%;
          padding:10px;
          border:1px dashed #cfd5e3;
          border-radius:10px;
          background:#fafbfe
        "
      >


      <div
        id="mediaUploadProgress"
        class="hidden"
        style="margin-top:10px"
      ></div>

    `;


    url.parentElement.appendChild(
      wrapper
    );


    const input =
      wrapper.querySelector('input');


    input.addEventListener(
      'change',
      async () => {

        const file =
          input.files &&
          input.files[0];


        if (!file)
          return;


        const isVideo =
          VIDEO_TYPES.includes(
            (
              file.type || ''
            ).toLowerCase()
          );


        type.value =
          isVideo
            ? 'video'
            : 'image';


        input.disabled =
          true;


        try {

          const publicUrl =
            await uploadFile(
              file,
              'post'
            );


          url.value =
            publicUrl;


          url.dispatchEvent(
            new Event(
              'input',
              {
                bubbles:true
              }
            )
          );


          if (
            typeof updatePostPreview ===
            'function'
          ) {

            updatePostPreview();

          }


          notify(
            'تم رفع الملف وربطه بالمنشور.'
          );


        } catch (error) {

          clearProgress();

          notify(
            error.message
          );


          input.value =
            '';

        } finally {

          input.disabled =
            false;

        }

      }
    );

  }


  /*
    Add explicit "Publish Now" button.
  */

  function addPublishButton(form) {

    if (
      form.querySelector(
        '[data-publish-now]'
      )
    )
      return;


    const status =
      form.querySelector(
        '[name="status"]'
      );


    const actions =
      form.querySelector(
        '.modal-actions'
      );


    if (!status || !actions)
      return;


    const button =
      document.createElement(
        'button'
      );


    button.type =
      'button';


    button.className =
      'btn btn-gold';


    button.dataset.publishNow =
      '1';


    button.textContent =
      'نشر الآن';


    button.addEventListener(
      'click',
      () => {

        status.value =
          'published';


        form.requestSubmit();

      }
    );


    actions.appendChild(
      button
    );

  }


  function enhance(form) {

    if (!form)
      return;


    if (
      form.id ===
      'doctorForm'
    ) {

      addDoctorUpload(
        form
      );

    }


    if (
      form.id ===
      'postForm'
    ) {

      addPostUpload(
        form
      );


      addPublishButton(
        form
      );

    }

  }


  const observer =
    new MutationObserver(
      () => {

        const doctor =
          $id('doctorForm');


        const post =
          $id('postForm');


        if (doctor)
          enhance(doctor);


        if (post)
          enhance(post);

      }
    );


  observer.observe(
    document.body,
    {
      subtree:true,
      childList:true
    }
  );


  setInterval(
    () => {

      const doctor =
        $id('doctorForm');


      const post =
        $id('postForm');


      if (doctor)
        enhance(doctor);


      if (post)
        enhance(post);

    },
    500
  );

})();
