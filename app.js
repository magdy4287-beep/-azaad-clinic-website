(() => {
  "use strict";

  const API =
    "https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinic";

  const $ = (id) => document.getElementById(id);

  let selectedSlot = "";

  let clinicData = {
    doctors: [],
    services: [],
    settings: {}
  };

  /* =========================================================
     HELPERS
  ========================================================= */

  function escapeHtml(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]
    );
  }

  function showMessage(message, success = false) {
    const element = $("message");

    if (!element) {
      alert(message);
      return;
    }

    element.textContent = message;
    element.style.display = "block";
    element.style.color = success ? "#16734a" : "#a13a3a";
    element.style.background = success
      ? "#eaf8f1"
      : "#fff1f1";
    element.style.padding = "12px 16px";
    element.style.borderRadius = "10px";
    element.style.marginTop = "12px";
  }

  function clearMessage() {
    const element = $("message");

    if (!element) return;

    element.textContent = "";
    element.style.display = "none";
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      cache: "no-store"
    });

    let body = {};

    try {
      body = await response.json();
    } catch (_) {
      body = {};
    }

    if (!response.ok) {
      throw new Error(
        body.error ||
        body.message ||
        `HTTP ${response.status}`
      );
    }

    return body;
  }

  /* =========================================================
     DATE
  ========================================================= */

  function getToday() {
    const now = new Date();

    now.setMinutes(
      now.getMinutes() -
      now.getTimezoneOffset()
    );

    return now.toISOString().slice(0, 10);
  }

  function setupDate() {
    const dateInput = $("date");

    if (!dateInput) return;

    const today = getToday();

    dateInput.min = today;

    if (!dateInput.value) {
      dateInput.value = today;
    }
  }

  /* =========================================================
     SELECTORS
  ========================================================= */

  function populateSelectors() {
    const doctorSelect = $("doctor");
    const serviceSelect = $("service");

    if (!doctorSelect || !serviceSelect) return;

    const oldDoctor = doctorSelect.value;
    const oldService = serviceSelect.value;

    const doctors = Array.isArray(clinicData.doctors)
      ? clinicData.doctors
      : [];

    const services = Array.isArray(clinicData.services)
      ? clinicData.services
      : [];

    doctorSelect.innerHTML = `
      <option value="">
        اختر الطبيب
      </option>
    `;

    doctors.forEach((doctor) => {
      const option = document.createElement("option");

      option.value = String(doctor.id ?? "");

      const name =
        doctor.name ||
        doctor.full_name ||
        "طبيب";

      const title =
        doctor.title
          ? ` — ${doctor.title}`
          : "";

      option.textContent =
        `${name}${title}`;

      doctorSelect.appendChild(option);
    });

    serviceSelect.innerHTML = `
      <option value="">
        اختر الخدمة
      </option>
    `;

    services.forEach((service) => {
      const option = document.createElement("option");

      option.value = String(service.id ?? "");

      const name =
        service.name ||
        service.title ||
        "خدمة";

      const duration =
        service.duration_minutes
          ? ` — ${service.duration_minutes} دقيقة`
          : "";

      option.textContent =
        `${name}${duration}`;

      serviceSelect.appendChild(option);
    });

    if (
      oldDoctor &&
      doctors.some(
        (doctor) =>
          String(doctor.id) ===
          String(oldDoctor)
      )
    ) {
      doctorSelect.value = oldDoctor;
    }

    if (
      oldService &&
      services.some(
        (service) =>
          String(service.id) ===
          String(oldService)
      )
    ) {
      serviceSelect.value = oldService;
    }
  }

  /* =========================================================
     LOAD CLINIC DATA
  ========================================================= */

  async function loadClinicData() {
    const result = await request(
      API +
      "?api=data&_=" +
      Date.now()
    );

    clinicData = {
      doctors: Array.isArray(result?.doctors)
        ? result.doctors
        : [],

      services: Array.isArray(result?.services)
        ? result.services
        : [],

      settings:
        result?.settings &&
        typeof result.settings === "object"
          ? result.settings
          : {}
    };

    window.clinicData = clinicData;

    populateSelectors();
    setupDate();

    await loadAvailableSlots();
  }

  /* =========================================================
     AVAILABLE SLOTS
  ========================================================= */

  async function loadAvailableSlots() {
    const slotsContainer = $("slots");

    if (!slotsContainer) return;

    const doctor = $("doctor")?.value || "";
    const service = $("service")?.value || "";
    const date = $("date")?.value || "";

    selectedSlot = "";

    if (!doctor || !service || !date) {
      slotsContainer.innerHTML = `
        <div class="slots-empty">
          اختر الطبيب والخدمة والتاريخ
          لعرض المواعيد المتاحة.
        </div>
      `;

      return;
    }

    slotsContainer.innerHTML = `
      <div class="slots-loading">
        جاري تحميل المواعيد...
      </div>
    `;

    try {
      const url =
        API +
        "?api=slots" +
        "&doctor=" +
        encodeURIComponent(doctor) +
        "&service=" +
        encodeURIComponent(service) +
        "&date=" +
        encodeURIComponent(date) +
        "&_=" +
        Date.now();

      const result = await request(url);

      const slots =
        Array.isArray(result?.slots)
          ? result.slots
          : [];

      if (!slots.length) {
        slotsContainer.innerHTML = `
          <div class="slots-empty">
            لا توجد مواعيد متاحة لهذا اليوم.
          </div>
        `;

        return;
      }

      slotsContainer.innerHTML =
        slots
          .map(
            (time) => `
              <button
                type="button"
                class="slot"
                data-slot="${escapeHtml(time)}"
              >
                ${escapeHtml(time)}
              </button>
            `
          )
          .join("");

      slotsContainer
        .querySelectorAll(".slot")
        .forEach((button) => {
          button.addEventListener(
            "click",
            () => {
              slotsContainer
                .querySelectorAll(".slot")
                .forEach((item) => {
                  item.classList.remove(
                    "selected"
                  );
                });

              button.classList.add(
                "selected"
              );

              selectedSlot =
                button.dataset.slot || "";

              clearMessage();
            }
          );
        });
    } catch (error) {
      console.error(
        "Azaad Clinic slots error:",
        error
      );

      slotsContainer.innerHTML = `
        <div class="slots-error">
          تعذر تحميل المواعيد.
          يرجى المحاولة مرة أخرى.
        </div>
      `;

      showMessage(
        error.message ||
        "تعذر تحميل المواعيد."
      );
    }
  }

  /* =========================================================
     BOOKING VALIDATION
  ========================================================= */

  function validateBooking() {
    const doctor = $("doctor")?.value || "";
    const service = $("service")?.value || "";
    const date = $("date")?.value || "";
    const name = $("name")?.value.trim() || "";
    const phone = $("phone")?.value.trim() || "";

    if (!doctor) {
      showMessage(
        "من فضلك اختر الطبيب."
      );
      return false;
    }

    if (!service) {
      showMessage(
        "من فضلك اختر الخدمة."
      );
      return false;
    }

    if (!date) {
      showMessage(
        "من فضلك اختر التاريخ."
      );
      return false;
    }

    if (!selectedSlot) {
      showMessage(
        "من فضلك اختر أحد المواعيد المتاحة."
      );
      return false;
    }

    if (!name) {
      showMessage(
        "من فضلك اكتب الاسم بالكامل."
      );
      return false;
    }

    if (!phone) {
      showMessage(
        "من فضلك اكتب رقم الهاتف."
      );
      return false;
    }

    return true;
  }

  /* =========================================================
     BOOKING
  ========================================================= */

  async function submitBooking(event) {
    event.preventDefault();

    clearMessage();

    if (!validateBooking()) {
      return;
    }

    const doctor = $("doctor").value;
    const service = $("service").value;
    const date = $("date").value;
    const name = $("name").value.trim();
    const phone = $("phone").value.trim();
    const email =
      $("email")?.value.trim() || "";
    const notes =
      $("notes")?.value.trim() || "";
    const mode =
      $("mode")?.value || "clinic";

    const payload = {
      doctor_id: doctor,
      service_id: service,
      appointment_date: date,
      appointment_time: selectedSlot,
      mode: mode,
      patient_name: name,
      patient_phone: phone,
      patient_email: email || null,
      notes: notes || null
    };

    const submitButton =
      document.querySelector(
        '#bookingForm button[type="submit"]'
      );

    const originalText =
      submitButton
        ? submitButton.textContent
        : "";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent =
        "جاري تأكيد الحجز...";
    }

    try {
      const result =
        await request(
          API + "?api=book",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(payload)
          }
        );

      const bookingCode =
        result?.booking_code ||
        result?.booking?.booking_code ||
        "";

      if (bookingCode) {
        showMessage(
          `تم إرسال طلب الحجز بنجاح. رقم الحجز: ${bookingCode}`,
          true
        );
      } else {
        showMessage(
          "تم إرسال طلب الحجز بنجاح.",
          true
        );
      }

      const form =
        $("bookingForm");

      if (form) {
        form.reset();
      }

      selectedSlot = "";

      setupDate();

      const slots =
        $("slots");

      if (slots) {
        slots.innerHTML = `
          <div class="slots-empty">
            اختر الطبيب والخدمة والتاريخ
            لعرض المواعيد المتاحة.
          </div>
        `;
      }

    } catch (error) {
      console.error(
        "Azaad Clinic booking error:",
        error
      );

      let message =
        error.message ||
        "تعذر إرسال طلب الحجز.";

      const lower =
        message.toLowerCase();

      if (
        lower.includes("duplicate") ||
        lower.includes("unique") ||
        lower.includes("already booked") ||
        lower.includes("already exists")
      ) {
        message =
          "هذا الموعد تم حجزه بالفعل. يرجى اختيار موعد آخر.";
      }

      showMessage(message);

      /*
       * تحديث المواعيد بعد الخطأ
       * حتى لا يظل Slot محجوزًا ظاهرًا
       */
      await loadAvailableSlots();
    } finally {
      if (submitButton) {
        submitButton.disabled = false;

        submitButton.textContent =
          originalText ||
          "تأكيد طلب الحجز";
      }
    }
  }

  /* =========================================================
     EVENTS
  ========================================================= */

  function initializeEvents() {
    const form =
      $("bookingForm");

    if (!form) return;

    const doctor =
      $("doctor");

    const service =
      $("service");

    const date =
      $("date");

    if (doctor) {
      doctor.addEventListener(
        "change",
        loadAvailableSlots
      );
    }

    if (service) {
      service.addEventListener(
        "change",
        loadAvailableSlots
      );
    }

    if (date) {
      date.addEventListener(
        "change",
        loadAvailableSlots
      );
    }

    form.addEventListener(
      "submit",
      submitBooking
    );
  }

  /* =========================================================
     INITIALIZATION
  ========================================================= */

  async function initialize() {
    const form =
      $("bookingForm");

    if (!form) return;

    setupDate();
    initializeEvents();

    try {
      await loadClinicData();
    } catch (error) {
      console.error(
        "Azaad Clinic initialization error:",
        error
      );

      showMessage(
        "تعذر تحميل بيانات العيادة. يرجى تحديث الصفحة والمحاولة مرة أخرى."
      );
    }
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
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

})();
