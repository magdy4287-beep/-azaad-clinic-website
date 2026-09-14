/* ============================================================
   AZAAD CLINIC
   ADMIN CONTROL CENTER
   File: admin.js

   Production Admin Controller
   Appwrite session + API boundaries
   Username/password login through the Admin Auth API

   IMPORTANT
   ------------------------------------------------------------
   - Authentication is handled by the Appwrite-backed Admin Auth API.
   - Browser sessions use the server-owned HttpOnly session cookie.
   - clinic_staff uses "active", NOT "is_active".
   - Authenticated session alone is NOT sufficient.
   - Active clinic_staff record + valid role are required.
   - Time is displayed using 12-hour format.
   ============================================================ */
/* ============================================================
   WEBSITE
   ============================================================ */

const WEBSITE_URL =
  "https://magdy4287-beep.github.io/-azaad-clinic-website/";

const WEBSITE_MESSAGE =
  `🏥 عيادة أزاد للصحة النفسية

📅 لحجز موعد يمكنك الدخول من هنا:

${WEBSITE_URL}`;

/* ============================================================
   STATE
   ============================================================ */

const state = {
  session: null,
  user: null,
  staff: null,
  bookings: [],
  currentRole: null,
  permissions: new Set(),
  initialized: false,
  loadingBookings: false,
  initializing: false
};

/* ============================================================
   ROLE PERMISSIONS
   ============================================================ */

const ROLE_PERMISSIONS = {
  OWNER: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view",
    "marketing.view",
    "finance.view",
    "staff.view",
  ],

  ADMIN: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view",
    "marketing.view",
    "finance.view",
    "staff.view",
  ],

  MANAGER: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view",
    "marketing.view",
    "finance.view",
    "staff.view",
  ],

  SECRETARY: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view"
  ],

  RECEPTION: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view",
  ],

  CASHIER: [
    "dashboard.view",
    "finance.view",
  ],

  DOCTOR: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view",
  ],

  MARKETING: [
    "dashboard.view",
    "marketing.view",
  ]
};

/* ============================================================
   DOM HELPERS
   ============================================================ */

const $ = id =>
  document.getElementById(id);

const firstElement = (...ids) => {
  for (const id of ids) {
    const element = $(id);

    if (element) {
      return element;
    }
  }

  return null;
};

const escapeHTML = value => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

/* ============================================================
   DATE
   ============================================================ */

function todayISO() {
  const canonical = window.AZAAD_CORE_CONTEXT?.todayISO;

  if (typeof canonical !== "function") {
    throw new Error(
      "AZAAD_CORE_CONTEXT.todayISO is required for Admin business dates."
    );
  }

  return canonical();
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  try {
    return new Date(
      `${value}T00:00:00`
    ).toLocaleDateString(
      "ar-EG",
      {
        year: "numeric",
        month: "short",
        day: "numeric"
      }
    );
  } catch {
    return value;
  }
}

/* ============================================================
   12-HOUR TIME
   ============================================================ */

function formatTime(value) {
  if (!value) {
    return "-";
  }

  const raw =
    String(value)
      .trim()
      .slice(0, 5);

  const match =
    raw.match(
      /^(\d{1,2}):(\d{2})$/
    );

  if (!match) {
    return escapeHTML(value);
  }

  let hour =
    Number(match[1]);

  const minute =
    match[2];

  if (
    Number.isNaN(hour) ||
    hour < 0 ||
    hour > 23
  ) {
    return escapeHTML(value);
  }

  const suffix =
    hour < 12
      ? "AM"
      : "PM";

  let displayHour =
    hour % 12;

  if (
    displayHour === 0
  ) {
    displayHour = 12;
  }

  return `${displayHour}:${minute} ${suffix}`;
}

/* ============================================================
   PHONE
   ============================================================ */

function normalizePhone(phone) {
  if (!phone) {
    return "";
  }

  let value =
    String(phone)
      .trim()
      .replace(/[^\d+]/g, "");

  if (
    value.startsWith("00")
  ) {
    value =
      "+" +
      value.slice(2);
  }

  if (
    value.startsWith("01") &&
    value.length === 11
  ) {
    value =
      "+20" +
      value.slice(1);
  }

  value =
    value.replace(
      /^\+/,
      ""
    );

  return value.replace(
    /\s/g,
    ""
  );
}

function whatsappURL(
  phone,
  message = ""
) {
  const normalized =
    normalizePhone(phone);

  if (!normalized) {
    return "#";
  }

  return (
    `https://wa.me/${normalized}` +
    `?text=${encodeURIComponent(
      message
    )}`
  );
}

/* ============================================================
   TOAST
   ============================================================ */

function showToast(
  message,
  type = "info"
) {
  let toast =
    $("adminToast");

  if (!toast) {
    toast =
      document.createElement(
        "div"
      );

    toast.id =
      "adminToast";

    toast.className =
      "toast";

    toast.style.cssText = `
      position:fixed;
      right:20px;
      bottom:20px;
      z-index:99999;
      max-width:420px;
      padding:14px 18px;
      border-radius:12px;
      color:#fff;
      font-weight:700;
      box-shadow:0 10px 30px rgba(0,0,0,.2);
      opacity:0;
      transform:translateY(15px);
      transition:.25s ease;
      pointer-events:none;
    `;

    document.body.appendChild(
      toast
    );
  }

  toast.textContent =
    message;

  toast.style.background =
    type === "error"
      ? "#a32939"
      : type === "success"
      ? "#167345"
      : "#17214f";

  requestAnimationFrame(() => {
    toast.style.opacity =
      "1";

    toast.style.transform =
      "translateY(0)";
  });

  clearTimeout(
    window.__AZAAD_TOAST_TIMER
  );

  window.__AZAAD_TOAST_TIMER =
    setTimeout(() => {
      toast.style.opacity =
        "0";

      toast.style.transform =
        "translateY(15px)";
    }, 3500);
}

/* ============================================================
   SAFE QUERY
   ============================================================ */

async function safeQuery(
  query
) {
  try {
    return await query;
  } catch (error) {
    console.error(
      "Database query error:",
      error
    );

    return {
      data: null,
      error
    };
  }
}

/* ============================================================
   PERMISSIONS
   ============================================================ */

function hasPermission(
  permission
) {
  return state.permissions.has(
    permission
  );
}

function requirePermission(
  permission
) {
  if (
    hasPermission(permission)
  ) {
    return true;
  }

  showToast(
    "⛔ ليس لديك صلاحية لتنفيذ هذا الإجراء.",
    "error"
  );

  return false;
}

/* ============================================================
   APPLY STAFF ROLE
   ============================================================ */

function applyStaffRole(
  staff
) {
  if (!staff) {
    return false;
  }

  const role =
    String(
      staff.role || ""
    )
      .toUpperCase()
      .trim();

  if (
    !ROLE_PERMISSIONS[role]
  ) {
    console.error(
      "Invalid staff role:",
      staff.role
    );

    return false;
  }

  state.staff =
    staff;

  state.currentRole =
    role;

  state.permissions =
    new Set(
      ROLE_PERMISSIONS[role]
    );

  document.body.dataset.role =
    role;

  updateUserIdentity();

  return true;
}

/* ============================================================
   DOCTOR ROUTING
   ------------------------------------------------------------
   DOCTOR accounts must never land in the Admin UI.
   They authenticate through the same staff login form, then
   continue directly to the doctor dashboard.
   ============================================================ */

function redirectDoctorIfNeeded() {
  const role = String(
    state.currentRole || state.staff?.role || ''
  ).toUpperCase().trim();

  if (role !== 'DOCTOR') {
    return false;
  }

  const target = 'doctor-dashboard.html';

  if (
    !window.location.pathname.endsWith(
      '/' + target
    )
  ) {
    window.location.replace(
      target
    );
  }

  return true;
}

/* ============================================================
   FINAL ADMIN INTERACTION SAFETY
   ------------------------------------------------------------
   Optional modules must never be able to freeze the shell.
   Authentication and Logout remain owned exclusively by the
   Admin controller; this guard only restores document interactivity.
   It does not perform authentication and does not bypass security.
   ============================================================ */

(function installAdminInteractionSafety() {
  const restoreInteraction = () => {
    try {
      document.documentElement.removeAttribute(
        "inert"
      );

      document.body?.removeAttribute(
        "inert"
      );

      if (document.body) {
        document.body.style.pointerEvents =
          "";
      }
    } catch (error) {
      console.error(
        "Admin interaction safety error:",
        error
      );
    }
  };

  const install = () => {
    restoreInteraction();
  };

  window.AZAAD_RESTORE_ADMIN_INTERACTION =
    restoreInteraction;

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      install,
      {
        once: true
      }
    );
  } else {
    install();
  }
})();

/* ============================================================
   STAFF PROFILE
   ============================================================ */

async function restoreStaffProfile() {
  const retryDelays = [
    0,
    150,
    350
  ];

  let lastStatus =
    null;

  try {
    for (
      const delay of retryDelays
    ) {
      if (delay) {
        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              delay
            )
        );
      }

      const response =
        await fetch(
          "/api/admin-auth",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
              Accept:
                "application/json"
            }
          }
        );

      lastStatus =
        response.status;

      if (response.ok) {
        const result =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (
          !result?.authenticated ||
          result?.provider !==
            "appwrite" ||
          !result?.staff ||
          result.staff.active ===
            false
        ) {
          return false;
        }

        state.session =
          Object.freeze({
            provider:
              "appwrite"
          });

        state.user =
          result.user || {
            id:
              result.staff
                .auth_user_id ||
              null,

            email:
              result.staff
                .email ||
              null
          };

        state.provider =
          "appwrite";

        return applyStaffRole(
          result.staff
        );
      }

      if (
        ![
          401,
          408,
          429,
          500,
          502,
          503,
          504
        ].includes(
          response.status
        )
      ) {
        return false;
      }
    }

    console.warn(
      "Appwrite session restore unavailable after bounded retries:",
      lastStatus
    );

    return false;
  } catch (error) {
    console.warn(
      "Appwrite session restore failed:",
      error
    );

    return false;
  }
}

window.AZAAD_RESTORE_STAFF_PROFILE =
  restoreStaffProfile;

/* ============================================================
   LOGIN
   ============================================================ */

async function login(
  username,
  password
) {
  const cleanUsername =
    String(
      username || ""
    )
      .trim()
      .toLowerCase();

  const cleanPassword =
    String(
      password || ""
    );

  if (!cleanUsername) {
    throw new Error(
      "اسم المستخدم مطلوب."
    );
  }

  if (!cleanPassword) {
    throw new Error(
      "كلمة المرور مطلوبة."
    );
  }

  const response =
    await fetch(
      "/api/admin-auth",
      {
        method: "POST",
        credentials: "include",
        cache: "no-store",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json"
        },

        body:
          JSON.stringify({
            username:
              cleanUsername,

            password:
              cleanPassword
          })
      }
    );

  const result =
    await response
      .json()
      .catch(
        () => ({})
      );

  if (!response.ok) {
    throw new Error(
      result?.error ===
        "invalid_credentials"
        ? "بيانات الدخول غير صحيحة."
        : (
            result?.message ||
            "تعذر تسجيل الدخول."
          )
    );
  }

  if (
    result?.provider !==
      "appwrite" ||
    !result?.authenticated ||
    !result?.staff
  ) {
    throw new Error(
      "جلسة Appwrite غير صالحة."
    );
  }

  if (
    result.staff.active ===
    false
  ) {
    throw new Error(
      "حساب الموظف غير فعال."
    );
  }

  if (
    !applyStaffRole(
      result.staff
    )
  ) {
    throw new Error(
      "دور الموظف غير صالح."
    );
  }

  state.session =
    Object.freeze({
      provider:
        "appwrite"
    });

  state.user =
    result.user || {
      id:
        result.staff
          .auth_user_id ||
        null,

      email:
        result.staff.email ||
        null
    };

  state.provider =
    "appwrite";

  if (
    redirectDoctorIfNeeded()
  ) {
    return;
  }

  await initializeApplication();
}

/* ============================================================
   LOGOUT
   ============================================================ */

async function logout() {
  state.session = null;
  state.user = null;
  state.staff = null;
  state.currentRole = null;
  state.permissions =
    new Set();
  state.initialized = false;
  state.initializing = false;
  state.provider = null;

  const request =
    fetch(
      "/api/admin-auth",
      {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",

        headers: {
          Accept:
            "application/json"
        }
      }
    ).catch(
      error => {
        console.warn(
          "Appwrite logout request failed:",
          error
        );

        return null;
      }
    );

  try {
    await Promise.race([
      request,

      new Promise(
        resolve =>
          setTimeout(
            resolve,
            2500
          )
      )
    ]);
  } catch (error) {
    console.warn(
      "Appwrite logout boundary failed:",
      error
    );
  }

  window.location.replace(
    "/admin.html"
  );
}

/* ============================================================
   RESTORE SESSION
   ============================================================ */

async function restoreSession() {
  return restoreStaffProfile();
}

/* ============================================================
   USER IDENTITY
   ============================================================ */

function updateUserIdentity() {
  const staff =
    state.staff || {};

  const name =
    staff.full_name ||
    staff.name ||
    staff.username ||
    state.user?.email ||
    "";

  const username =
    staff.username ||
    "";

  const role =
    state.currentRole ||
    staff.role ||
    "";

  const nameElements =
    document.querySelectorAll(
      "[data-admin-user-name], #adminUserName, #userName"
    );

  nameElements.forEach(
    element => {
      element.textContent =
        name;
    }
  );

  const usernameElements =
    document.querySelectorAll(
      "[data-admin-username], #adminUsername, #usernameDisplay"
    );

  usernameElements.forEach(
    element => {
      element.textContent =
        username;
    }
  );

  const roleElements =
    document.querySelectorAll(
      "[data-admin-role], #adminRole, #userRole"
    );

  roleElements.forEach(
    element => {
      element.textContent =
        role;
    }
  );
}

/* ============================================================
   VISIBILITY / ROLE UI
   ============================================================ */

function applyPermissionVisibility() {
  document
    .querySelectorAll(
      "[data-permission]"
    )
    .forEach(
      element => {
        const permission =
          element.dataset
            .permission;

        const allowed =
          hasPermission(
            permission
          );

        element.hidden =
          !allowed;

        element.setAttribute(
          "aria-hidden",
          allowed
            ? "false"
            : "true"
        );
      }
    );

  document
    .querySelectorAll(
      "[data-role]"
    )
    .forEach(
      element => {
        const roles =
          String(
            element.dataset
              .role || ""
          )
            .split(",")
            .map(
              role =>
                role
                  .trim()
                  .toUpperCase()
            )
            .filter(Boolean);

        if (
          roles.length === 0
        ) {
          return;
        }

        const allowed =
          roles.includes(
            String(
              state.currentRole ||
                ""
            ).toUpperCase()
          );

        element.hidden =
          !allowed;
      }
    );
}

/* ============================================================
   BOOKINGS
   ============================================================ */

async function loadBookings() {
  if (
    !requirePermission(
      "bookings.view"
    )
  ) {
    return;
  }

  if (
    state.loadingBookings
  ) {
    return;
  }

  state.loadingBookings =
    true;

  try {
    const response =
      await fetch(
        "/api/admin-appointments?from=2000-01-01&to=2100-12-31&limit=500",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",

          headers: {
            Accept:
              "application/json"
          }
        }
      );

    const result =
      await response
        .json()
        .catch(
          () => ({})
        );

    if (
      !response.ok
    ) {
      throw new Error(
        result?.message ||
          result?.error ||
          "تعذر تحميل الحجوزات."
      );
    }

    state.bookings =
      Array.isArray(
        result?.bookings
      )
        ? result.bookings
        : Array.isArray(
            result?.appointments
          )
        ? result.appointments
        : Array.isArray(
            result?.data
          )
        ? result.data
        : [];

    renderBookings();
    updateStatistics();
  } catch (error) {
    console.error(
      "Bookings load error:",
      error
    );

    showToast(
      error?.message ||
        "تعذر تحميل الحجوزات.",
      "error"
    );
  } finally {
    state.loadingBookings =
      false;
  }
}

/* ============================================================
   BOOKING HELPERS
   ============================================================ */

function bookingDate(
  booking
) {
  return (
    booking?.appointment_date ||
    booking?.booking_date ||
    booking?.date ||
    ""
  );
}

function bookingTime(
  booking
) {
  return (
    booking?.appointment_time ||
    booking?.booking_time ||
    booking?.time ||
    ""
  );
}

function bookingStatus(
  booking
) {
  return String(
    booking?.status ||
      booking?.appointment_status ||
      ""
  )
    .toUpperCase()
    .trim();
}

function bookingPatientName(
  booking
) {
  return (
    booking?.patient_name ||
    booking?.patient_full_name ||
    booking?.name ||
    booking?.full_name ||
    "غير معروف"
  );
}

function bookingPatientPhone(
  booking
) {
  return (
    booking?.patient_phone ||
    booking?.phone ||
    booking?.mobile ||
    ""
  );
}

function bookingCode(
  booking
) {
  return (
    booking?.booking_code ||
    booking?.appointment_code ||
    booking?.code ||
    booking?.id ||
    ""
  );
}

/* ============================================================
   BOOKING FILTER
   ============================================================ */

function getFilteredBookings() {
  const search =
    firstElement(
      "search",
      "bookingSearch"
    );

  const status =
    firstElement(
      "statusFilter",
      "bookingStatus"
    );

  const searchValue =
    String(
      search?.value || ""
    )
      .trim()
      .toLowerCase();

  const statusValue =
    String(
      status?.value || ""
    )
      .trim()
      .toUpperCase();

  return state.bookings.filter(
    booking => {
      const haystack =
        [
          bookingPatientName(
            booking
          ),
          bookingPatientPhone(
            booking
          ),
          bookingCode(
            booking
          ),
          bookingDate(
            booking
          ),
          bookingStatus(
            booking
          )
        ]
          .join(" ")
          .toLowerCase();

      const matchesSearch =
        !searchValue ||
        haystack.includes(
          searchValue
        );

      const matchesStatus =
        !statusValue ||
        statusValue ===
          "ALL" ||
        bookingStatus(
          booking
        ) === statusValue;

      return (
        matchesSearch &&
        matchesStatus
      );
    }
  );
}

/* ============================================================
   BOOKING STATUS LABEL
   ============================================================ */

function bookingStatusLabel(
  status
) {
  const normalized =
    String(
      status || ""
    )
      .toUpperCase()
      .trim();

  const labels = {
    PENDING:
      "قيد الانتظار",

    CONFIRMED:
      "مؤكد",

    CANCELLED:
      "ملغي",

    COMPLETED:
      "مكتمل",

    NO_SHOW:
      "لم يحضر"
  };

  return (
    labels[
      normalized
    ] ||
    status ||
    "-"
  );
}

/* ============================================================
   RENDER BOOKINGS
   ============================================================ */

function renderBookings() {
  const container =
    firstElement(
      "bookingsList",
      "bookingsTableBody",
      "appointmentsList"
    );

  if (!container) {
    return;
  }

  const bookings =
    getFilteredBookings();

  if (
    bookings.length === 0
  ) {
    container.innerHTML = `
      <div class="empty-state">
        لا توجد حجوزات مطابقة.
      </div>
    `;

    return;
  }

  const html =
    bookings
      .map(
        booking => {
          const name =
            escapeHTML(
              bookingPatientName(
                booking
              )
            );

          const phone =
            escapeHTML(
              bookingPatientPhone(
                booking
              )
            );

          const code =
            escapeHTML(
              bookingCode(
                booking
              )
            );

          const date =
            escapeHTML(
              formatDate(
                bookingDate(
                  booking
                )
              )
            );

          const time =
            escapeHTML(
              formatTime(
                bookingTime(
                  booking
                )
              )
            );

          const status =
            bookingStatus(
              booking
            );

          const statusLabel =
            escapeHTML(
              bookingStatusLabel(
                status
              )
            );

          const whatsapp =
            whatsappURL(
              bookingPatientPhone(
                booking
              ),
              WEBSITE_MESSAGE
            );

          return `
            <article
              class="booking-card"
              data-booking-code="${code}"
              data-booking-status="${escapeHTML(status)}"
            >
              <div class="booking-card-main">
                <h3>${name}</h3>

                <div class="booking-meta">
                  <span>${date}</span>
                  <span>${time}</span>
                  <span>${statusLabel}</span>
                </div>

                ${
                  phone
                    ? `<div class="booking-phone">${phone}</div>`
                    : ""
                }

                ${
                  code
                    ? `<div class="booking-code">${code}</div>`
                    : ""
                }
              </div>

              <div class="booking-actions">
                ${
                  phone
                    ? `
                      <a
                        href="${escapeHTML(whatsapp)}"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        WhatsApp
                      </a>
                    `
                    : ""
                }

                ${
                  code
                    ? `
                      <button
                        type="button"
                        data-no-show-booking-code="${code}"
                      >
                        No-Show
                      </button>
                    `
                    : ""
                }
              </div>
            </article>
          `;
        }
      )
      .join("");

  if (
    container.tagName ===
    "TBODY"
  ) {
    container.innerHTML =
      bookings
        .map(
          booking => {
            const name =
              escapeHTML(
                bookingPatientName(
                  booking
                )
              );

            const phone =
              escapeHTML(
                bookingPatientPhone(
                  booking
                )
              );

            const code =
              escapeHTML(
                bookingCode(
                  booking
                )
              );

            const date =
              escapeHTML(
                formatDate(
                  bookingDate(
                    booking
                  )
                )
              );

            const time =
              escapeHTML(
                formatTime(
                  bookingTime(
                    booking
                  )
                )
              );

            const status =
              bookingStatus(
                booking
              );

            return `
              <tr>
                <td>${name}</td>
                <td>${phone}</td>
                <td>${date}</td>
                <td>${time}</td>
                <td>${escapeHTML(
                  bookingStatusLabel(
                    status
                  )
                )}</td>
                <td>${code}</td>
              </tr>
            `;
          }
        )
        .join("");

    return;
  }

  container.innerHTML =
    html;

  bindNoShowButtons();
}

/* ============================================================
   STATISTICS
   ============================================================ */

function updateStatistics() {
  const bookings =
    state.bookings || [];

  const total =
    bookings.length;

  const pending =
    bookings.filter(
      booking =>
        bookingStatus(
          booking
        ) === "PENDING"
    ).length;

  const confirmed =
    bookings.filter(
      booking =>
        bookingStatus(
          booking
        ) === "CONFIRMED"
    ).length;

  const completed =
    bookings.filter(
      booking =>
        bookingStatus(
          booking
        ) === "COMPLETED"
    ).length;

  const cancelled =
    bookings.filter(
      booking =>
        bookingStatus(
          booking
        ) === "CANCELLED"
    ).length;

  const noShow =
    bookings.filter(
      booking =>
        bookingStatus(
          booking
        ) === "NO_SHOW"
    ).length;

  const mappings = {
    totalBookings:
      total,

    totalAppointments:
      total,

    pendingBookings:
      pending,

    confirmedBookings:
      confirmed,

    completedBookings:
      completed,

    cancelledBookings:
      cancelled,

    noShowBookings:
      noShow
  };

  Object.entries(
    mappings
  ).forEach(
    ([id, value]) => {
      const element =
        $(id);

      if (element) {
        element.textContent =
          String(value);
      }
    }
  );
}

/* ============================================================
   COMMAND CENTER
   ============================================================ */

function refreshCommandCenter() {
  const dateElement =
    firstElement(
      "todayDate",
      "currentDate"
    );

  if (dateElement) {
    try {
      dateElement.textContent =
        new Date()
          .toLocaleDateString(
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
    } catch {
      dateElement.textContent =
        todayISO();
    }
  }

  applyPermissionVisibility();
  updateUserIdentity();
}

/* ============================================================
   INITIALIZE APPLICATION
   ============================================================ */

async function initializeApplication() {
  if (
    state.initializing
  ) {
    return;
  }

  if (
    state.initialized
  ) {
    return;
  }

  state.initializing =
    true;

  try {
    updateUserIdentity();
    applyPermissionVisibility();
    refreshCommandCenter();

    if (
      redirectDoctorIfNeeded()
    ) {
      return;
    }

    if (
      hasPermission(
        "bookings.view"
      )
    ) {
      await loadBookings();
    }

    updateStatistics();
    refreshCommandCenter();

    state.initialized =
      true;

    await loadAfterAuthRuntimes();
  } catch (error) {
    console.error(
      "Application initialization error:",
      error
    );

    showToast(
      error?.message ||
        "تعذر تهيئة لوحة الإدارة.",
      "error"
    );
  } finally {
    state.initializing =
      false;
  }
}

/* ============================================================
   NO-SHOW BUTTONS
   ============================================================ */

function bindNoShowButtons() {
  document
    .querySelectorAll(
      "[data-no-show-booking-code]"
    )
    .forEach(
      button => {
        if (
          button.dataset
            .azaadBound ===
          "true"
        ) {
          return;
        }

        button.dataset
          .azaadBound =
          "true";

        button.addEventListener(
          "click",
          () =>
            markNoShowFollowup(
              button.dataset
                .noShowBookingCode
            )
        );
      }
    );
}

/* ============================================================
   FOLLOW-UP
   ============================================================ */

async function markNoShowFollowup(
  bookingCode
) {
  if (
    !requirePermission(
      "followups.view"
    )
  ) {
    return;
  }

  showToast(
    `🔔 تم تجهيز متابعة للحجز ${bookingCode}.`,
    "success"
  );
}

/* ============================================================
   SHARE
   ============================================================ */

async function shareWhatsApp() {
  window.open(
    `https://wa.me/?text=${encodeURIComponent(
      WEBSITE_MESSAGE
    )}`,
    "_blank",
    "noopener,noreferrer"
  );
}

async function copyWebsite() {
  try {
    if (
      navigator.clipboard &&
      typeof navigator
        .clipboard
        .writeText ===
        "function"
    ) {
      await navigator.clipboard.writeText(
        WEBSITE_URL
      );
    } else {
      throw new Error(
        "Clipboard unavailable"
      );
    }

    showToast(
      "🔗 تم نسخ رابط الموقع.",
      "success"
    );
  } catch {
    const input =
      document.createElement(
        "input"
      );

    input.value =
      WEBSITE_URL;

    input.style.position =
      "fixed";

    input.style.opacity =
      "0";

    document.body.appendChild(
      input
    );

    input.select();

    try {
      document.execCommand(
        "copy"
      );
    } catch {
      /* ignored */
    }

    input.remove();

    showToast(
      "🔗 تم نسخ رابط الموقع.",
      "success"
    );
  }
}

async function nativeShare() {
  if (
    navigator.share &&
    typeof navigator.share ===
      "function"
  ) {
    try {
      await navigator.share({
        title:
          "Azaad Clinic for Mental Health",

        text:
          WEBSITE_MESSAGE,

        url:
          WEBSITE_URL
      });

      return;
    } catch (error) {
      if (
        error?.name ===
        "AbortError"
      ) {
        return;
      }
    }
  }

  await copyWebsite();
}

async function shareWebsite() {
  await nativeShare();
}

/* ============================================================
   NO SHOW CENTER
   ============================================================ */

function showNoShowCenter() {
  if (
    !requirePermission(
      "bookings.view"
    )
  ) {
    return;
  }

  const panel =
    firstElement(
      "bookings",
      "bookingsPanel"
    );

  if (panel) {
    panel.hidden =
      false;
  }

  const status =
    firstElement(
      "statusFilter",
      "bookingStatus"
    );

  if (status) {
    status.value =
      "no_show";

    renderBookings();
  }

  showToast(
    "🔴 تم عرض حجوزات No-Show.",
    "info"
  );
}

/* ============================================================
   PANELS
   ============================================================ */

function requestPanel(
  panelId
) {
  if (!panelId) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      "azaad:admin-panel-requested",
      {
        detail: {
          panel:
            String(
              panelId
            )
        }
      }
    )
  );
}

function showFeatureNotice(
  feature
) {
  showToast(
    `${feature} — الوحدة متاحة حسب صلاحيات الحساب.`,
    "info"
  );
}

/* ============================================================
   TABS
   ============================================================ */

function bindTabs() {
  document
    .querySelectorAll(
      "[data-admin-panel]"
    )
    .forEach(
      button => {
        if (
          button.dataset
            .azaadBound ===
          "true"
        ) {
          return;
        }

        button.dataset
          .azaadBound =
          "true";

        button.addEventListener(
          "click",
          () => {
            const panel =
              button.dataset
                .adminPanel;

            requestPanel(
              panel
            );
          }
        );
      }
    );
}

/* ============================================================
   BOOKING FILTERS
   ============================================================ */

function bindBookingFilters() {
  const search =
    firstElement(
      "search",
      "bookingSearch"
    );

  const status =
    firstElement(
      "statusFilter",
      "bookingStatus"
    );

  const refresh =
    firstElement(
      "refreshBookings",
      "refreshBtn"
    );

  search?.addEventListener(
    "input",
    renderBookings
  );

  status?.addEventListener(
    "change",
    renderBookings
  );

  refresh?.addEventListener(
    "click",
    async () => {
      await loadBookings();

      showToast(
        "🔄 تم تحديث الحجوزات.",
        "success"
      );
    }
  );
}

/* ============================================================
   PATIENT PAGE
   ============================================================ */

function bindPatientPage() {
  const button =
    firstElement(
      "patientPageBtn"
    );

  button?.addEventListener(
    "click",
    () => {
      window.location.href =
        "./index.html";
    }
  );
}

/* ============================================================
   LOGOUT
   ============================================================ */

function bindLogout() {
  const button =
    firstElement(
      "logoutBtn"
    );

  if (!button) {
    return;
  }

  if (
    button.dataset
      .azaadBound ===
    "true"
  ) {
    return;
  }

  button.dataset
    .azaadBound =
    "true";

  button.addEventListener(
    "click",
    async () => {
      const confirmed =
        window.confirm(
          "هل تريد تسجيل الخروج من لوحة الإدارة؟"
        );

      if (!confirmed) {
        return;
      }

      await logout();
    }
  );
}

/* ============================================================
   LOGIN
   ============================================================ */

function bindLogin() {
  const form =
    $("loginForm");

  if (!form) {
    return;
  }

  if (
    form.dataset
      .azaadBound ===
    "true"
  ) {
    return;
  }

  form.dataset
    .azaadBound =
    "true";

  form.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const username =
        $("username")
          ?.value
          ?.trim()
          .toLowerCase();

      const password =
        $("password")
          ?.value ||
        "";

      const errorBox =
        $("loginError");

      const submitButton =
        event.submitter ||
        form.querySelector(
          'button[type="submit"]'
        );

      if (errorBox) {
        errorBox.textContent =
          "";

        errorBox.classList.add(
          "hidden"
        );
      }

      if (
        !username ||
        !password
      ) {
        if (errorBox) {
          errorBox.textContent =
            "يرجى إدخال Username وكلمة المرور.";

          errorBox.classList.remove(
            "hidden"
          );
        }

        return;
      }

      if (
        !/^[a-z0-9._-]{3,40}$/.test(
          username
        )
      ) {
        if (errorBox) {
          errorBox.textContent =
            "Username يجب أن يحتوي على أحرف إنجليزية صغيرة أو أرقام أو . _ - فقط.";

          errorBox.classList.remove(
            "hidden"
          );
        }

        return;
      }

      const originalText =
        submitButton?.textContent ||
        "تسجيل الدخول";

      if (submitButton) {
        submitButton.disabled =
          true;

        submitButton.textContent =
          "⏳ جاري تسجيل الدخول...";
      }

      try {
        await login(
          username,
          password
        );
      } catch (error) {
        console.error(
          "Login error:",
          error
        );

        if (errorBox) {
          errorBox.textContent =
            error?.message ||
            "بيانات الدخول غير صحيحة أو لا يوجد حساب فعال.";

          errorBox.classList.remove(
            "hidden"
          );
        }

        showToast(
          error?.message ||
            "❌ تعذر تسجيل الدخول.",
          "error"
        );
      } finally {
        if (
          submitButton &&
          !state.session
        ) {
          submitButton.disabled =
            false;

          submitButton.textContent =
            originalText;
        }
      }
    }
  );
}

/* ============================================================
   GLOBAL API
   ============================================================ */

window.AZAAD = {
  state,

  refresh: async () => {
    await loadBookings();

    updateStatistics();

    refreshCommandCenter();
  },

  shareWebsite,

  shareWhatsApp,

  copyWebsite,

  nativeShare,

  markNoShowFollowup,

  logout,

  hasPermission,

  formatTime,

  formatDate
};

/* ============================================================
   POST-AUTH RUNTIME LOADER
   ------------------------------------------------------------
   Non-critical feature scripts are deliberately loaded only after
   the Admin shell is interactive. Loading them is never awaited by
   authentication or initialization.
   ============================================================ */

async function loadAfterAuthRuntimes() {
  if (
    window.__AZAAD_AFTER_AUTH_RUNTIMES_LOADED
  ) {
    return;
  }

  window.__AZAAD_AFTER_AUTH_RUNTIMES_LOADED =
    true;

  const manifests =
    Array.from(
      document.querySelectorAll(
        "script[data-azaad-after-auth-src]"
      )
    );

  for (
    const manifest of manifests
  ) {
    const src =
      manifest.dataset
        .azaadAfterAuthSrc;

    if (!src) {
      continue;
    }

    await new Promise(
      resolve => {
        const script =
          document.createElement(
            "script"
          );

        script.src =
          src;

        if (
          manifest.dataset
            .azaadAfterAuthType ===
          "module"
        ) {
          script.type =
            "module";
        }

        script.onload =
          resolve;

        script.onerror =
          resolve;

        document.body.appendChild(
          script
        );
      }
    );

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          0
        )
    );
  }
}

/* ============================================================
   START
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    bindLogin();
    bindLogout();
    bindBookingFilters();
    bindPatientPage();
    bindTabs();

    try {
      const validStaff =
        await window.AZAAD_RESTORE_STAFF_PROFILE();

      if (validStaff) {
        await initializeApplication();
      }
    } catch (error) {
      console.error(
        "Application startup error:",
        error
      );

      showToast(
        error?.message ||
          "تعذر استعادة جلسة الدخول.",
        "error"
      );
    }
  }
);

window.AZAAD_LOGIN_CONTROLLER_READY =
  true;