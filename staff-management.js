/* ============================================================
   AZAAD CLINIC
   STAFF MANAGEMENT CENTER
   File: staff-management.js

   Production Staff Administration UI

   Backend:
   https://derofsthjivlkcdnojww.supabase.co/functions/v1/staff-admin

   Supported backend actions:
   - list
   - create
   - update
   - update_role
   - reset_password
   - disable
   - enable

   SECURITY
   ------------------------------------------------------------
   - NEVER contains the Supabase Service Role Key.
   - Uses ONLY the Supabase Publishable Key.
   - Password operations are handled by staff-admin Edge Function.
   - clinic_staff uses "active", NOT "is_active".
   - Real authorization is enforced by staff-admin backend.
   - Owner protection is enforced by backend.
   - Passwords are never stored in browser state.
   - Temporary passwords are displayed only once after creation/reset.
   - Existing #staff panel in admin.html is reused.
   - No duplicate staff tab is created.
   ============================================================ */

(function () {
  "use strict";

  /* ==========================================================
     CONFIGURATION
     ========================================================== */

  const SUPABASE_URL =
    "https://derofsthjivlkcdnojww.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa";

  const STAFF_ADMIN_FUNCTION =
    `${SUPABASE_URL}/functions/v1/staff-admin`;

  const WEBSITE_URL =
    "https://magdy4287-beep.github.io/-azaad-clinic-website/";

  /* ==========================================================
     STATE
     ========================================================== */

  const state = {
    client: null,
    staff: [],
    loading: false,
    initialized: false,
    authListenerReady: false,
    currentSession: null,
    currentUser: null,
    currentRole: null
  };

  /* ==========================================================
     ROLE DEFINITIONS
     ========================================================== */

  const ROLES = {
    OWNER: {
      label: "👑 Owner",
      description: "صلاحيات المالك الكاملة"
    },

    ADMIN: {
      label: "🛡️ Admin",
      description: "إدارة النظام والموظفين"
    },

    MANAGER: {
      label: "👨‍💼 Manager",
      description: "إدارة تشغيل العيادة"
    },

    SECRETARY: {
      label: "👩‍💼 Secretary",
      description:
        "الحجوزات والمرضى والمتابعة حسب الصلاحيات"
    },

    CASHIER: {
      label: "💰 Cashier",
      description:
        "المدفوعات والتحصيل والفواتير"
    },

    RECEPTION: {
      label: "🧑‍💼 Reception",
      description:
        "استقبال المرضى والحجوزات"
    },

    DOCTOR: {
      label: "🧑‍⚕️ Doctor",
      description:
        "المواعيد والمهام الطبية المصرح بها"
    },

    MARKETING: {
      label: "📣 Marketing",
      description:
        "التسويق والمحتوى والحملات والـ Leads"
    }
  };

  const ROLE_LEVEL = {
    OWNER: 100,
    ADMIN: 80,
    MANAGER: 60,
    SECRETARY: 40,
    CASHIER: 40,
    RECEPTION: 40,
    DOCTOR: 40,
    MARKETING: 40
  };

  /* ==========================================================
     DOM HELPERS
     ========================================================== */

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHTML(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value).replace(
      /[&<>"']/g,
      function (character) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        }[character];
      }
    );
  }

  function normalizeRole(role) {
    return String(role || "")
      .trim()
      .toUpperCase();
  }

  function isStaffActive(staff) {
    return staff?.active === true;
  }

  function getCurrentRole() {
    if (state.currentRole) {
      return normalizeRole(
        state.currentRole
      );
    }

    const metadataRole =
      state.currentUser?.app_metadata?.role ||
      state.currentUser?.user_metadata?.role;

    return normalizeRole(
      metadataRole
    );
  }

  function isOwner() {
    return (
      getCurrentRole() === "OWNER"
    );
  }

  function formatDateTime(value) {
    if (!value) {
      return "—";
    }

    try {
      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return escapeHTML(
          value
        );
      }

      return date.toLocaleString(
        "ar-EG",
        {
          dateStyle: "medium",
          timeStyle: "short"
        }
      );
    } catch (_) {
      return escapeHTML(
        value
      );
    }
  }

  function showMessage(
    message,
    type = "info"
  ) {
    let box =
      $("staffMessage");

    if (!box) {
      box =
        document.createElement(
          "div"
        );

      box.id =
        "staffMessage";

      box.style.cssText = `
        position:fixed;
        top:20px;
        right:20px;
        left:20px;
        margin-left:auto;
        max-width:520px;
        z-index:999999;
        padding:15px 18px;
        border-radius:14px;
        color:#fff;
        font-weight:700;
        line-height:1.7;
        white-space:pre-line;
        box-shadow:0 12px 35px rgba(0,0,0,.22);
        font-family:inherit;
        direction:rtl;
      `;

      document.body.appendChild(
        box
      );
    }

    box.style.background =
      type === "error"
        ? "#a32939"
        : type === "success"
        ? "#167345"
        : "#17214f";

    box.textContent =
      message;

    box.style.display =
      "block";

    clearTimeout(
      window.__AZAAD_STAFF_MESSAGE_TIMER
    );

    window.__AZAAD_STAFF_MESSAGE_TIMER =
      setTimeout(
        function () {
          box.style.display =
            "none";
        },
        5000
      );
  }

  function generateClientId() {
    return (
      "staff-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .slice(2, 9)
    );
  }

  /* ==========================================================
     SUPABASE CLIENT
     ========================================================== */

  async function createSupabaseClient() {
    if (state.client) {
      return state.client;
    }

    /*
      admin.js currently creates its own Supabase client
      inside module scope.

      If another project script exposes it, reuse it.
    */

    const existing =
      window.AZAAD?.supabase;

    if (
      existing &&
      existing.auth &&
      typeof existing.auth.getSession ===
        "function"
    ) {
      state.client =
        existing;

      return state.client;
    }

    /*
      Compatibility client.

      This uses the SAME publishable key.
      It does NOT use a Service Role Key.
    */

    try {
      const module =
        await import(
          "https://esm.sh/@supabase/supabase-js@2"
        );

      if (
        !module ||
        typeof module.createClient !==
          "function"
      ) {
        throw new Error(
          "تعذر تحميل Supabase Client."
        );
      }

      state.client =
        module.createClient(
          SUPABASE_URL,
          SUPABASE_PUBLISHABLE_KEY,
          {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true
            }
          }
        );

      return state.client;
    } catch (error) {
      console.error(
        "Azaad Staff: Supabase client initialization failed.",
        error
      );

      throw new Error(
        "تعذر تشغيل اتصال Supabase لإدارة الموظفين."
      );
    }
  }

  async function getSession() {
    const client =
      await createSupabaseClient();

    const result =
      await client.auth.getSession();

    if (result.error) {
      throw result.error;
    }

    return (
      result.data?.session ||
      null
    );
  }

  async function getAccessToken() {
    const session =
      await getSession();

    if (
      !session?.access_token
    ) {
      throw new Error(
        "يجب تسجيل الدخول أولاً."
      );
    }

    state.currentSession =
      session;

    state.currentUser =
      session.user ||
      null;

    state.currentRole =
      normalizeRole(
        session.user?.app_metadata?.role ||
        session.user?.user_metadata?.role ||
        state.currentRole
      );

    return session.access_token;
  }

  /* ==========================================================
     STAFF ADMIN API
     ========================================================== */

  async function callStaffAdmin(
    action,
    payload = {}
  ) {
    if (!action) {
      throw new Error(
        "Staff action غير محدد."
      );
    }

    const token =
      await getAccessToken();

    const response =
      await fetch(
        STAFF_ADMIN_FUNCTION,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",

            Authorization:
              `Bearer ${token}`,

            apikey:
              SUPABASE_PUBLISHABLE_KEY
          },

          body:
            JSON.stringify({
              action,
              ...payload
            })
        }
      );

    let result =
      null;

    try {
      result =
        await response.json();
    } catch (_) {
      result =
        null;
    }

    if (!response.ok) {
      throw new Error(
        result?.error ||
        result?.message ||
        `Staff API Error ${response.status}`
      );
    }

    if (
      result &&
      result.error
    ) {
      throw new Error(
        result.error
      );
    }

    return result;
  }

  /* ==========================================================
     PANEL
     ========================================================== */

  function getStaffPanel() {
    return (
      $("staff") ||
      $("staffPanel")
    );
  }

  /* ==========================================================
     RENDER STAFF MANAGEMENT
     ========================================================== */

  function renderStaffManagement() {
    const panel =
      getStaffPanel();

    if (!panel) {
      return false;
    }

    let container =
      $("staffManagementCenter");

    if (!container) {
      container =
        document.createElement(
          "div"
        );

      container.id =
        "staffManagementCenter";

      container.className =
        "card";

      container.style.cssText = `
        margin-bottom:15px;
        direction:rtl;
      `;

      panel.appendChild(
        container
      );
    }

    container.innerHTML = `
      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
          margin-bottom:18px;
        "
      >

        <div>

          <h2
            style="
              margin:0 0 6px;
              font-size:24px;
            "
          >
            👥 إدارة الموظفين
          </h2>

          <div
            class="muted"
            style="line-height:1.8"
          >
            إنشاء الحسابات وإدارة الوظائف
            والحالة وكلمات المرور.
          </div>

        </div>

        <button
          id="staffAddButton"
          class="btn btn-primary"
          type="button"
        >
          ➕ إضافة موظف
        </button>

      </div>

      <div
        id="staffManagementStats"
        style="
          display:grid;
          grid-template-columns:
            repeat(auto-fit,minmax(180px,1fr));
          gap:12px;
          margin-bottom:20px;
        "
      >

        <div class="stat">

          <div
            id="staffTotal"
            class="stat-number"
          >
            0
          </div>

          <div class="muted">
            👥 إجمالي الموظفين
          </div>

        </div>

        <div class="stat">

          <div
            id="staffActive"
            class="stat-number"
          >
            0
          </div>

          <div class="muted">
            🟢 حسابات نشطة
          </div>

        </div>

        <div class="stat">

          <div
            id="staffInactive"
            class="stat-number"
          >
            0
          </div>

          <div class="muted">
            🔴 حسابات موقوفة
          </div>

        </div>

        <div class="stat">

          <div
            id="marketingCount"
            class="stat-number"
          >
            0
          </div>

          <div class="muted">
            📣 Marketing
          </div>

        </div>

      </div>

      <div
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-bottom:15px;
        "
      >

        <input
          id="staffSearch"
          type="search"
          autocomplete="off"
          placeholder="🔎 الاسم / Username / Email / الهاتف"
          style="
            flex:1;
            min-width:240px;
          "
        />

        <select
          id="staffRoleFilter"
          style="
            min-width:190px;
          "
        >

          <option value="">
            🎯 كل الوظائف
          </option>

          ${Object.entries(
            ROLES
          )
            .map(
              ([key, value]) => `
                <option
                  value="${escapeHTML(
                    key
                  )}"
                >
                  ${value.label}
                </option>
              `
            )
            .join("")}

        </select>

        <button
          id="refreshStaffButton"
          class="btn btn-secondary"
          type="button"
        >
          🔄 تحديث
        </button>

      </div>

      <div
        id="staffTableContainer"
      >
        <div class="empty">
          ⏳ جاري تحميل الموظفين...
        </div>
      </div>
    `;

    $("staffAddButton")
      ?.addEventListener(
        "click",
        openCreateStaffModal
      );

    $("refreshStaffButton")
      ?.addEventListener(
        "click",
        loadStaff
      );

    $("staffSearch")
      ?.addEventListener(
        "input",
        renderStaffTable
      );

    $("staffRoleFilter")
      ?.addEventListener(
        "change",
        renderStaffTable
      );

    return true;
  }

  /* ==========================================================
     LOAD STAFF
     ========================================================== */

  async function loadStaff() {
    const table =
      $("staffTableContainer");

    if (table) {
      table.innerHTML = `
        <div class="empty">
          ⏳ جاري تحميل بيانات الموظفين...
        </div>
      `;
    }

    state.loading =
      true;

    try {
      const result =
        await callStaffAdmin(
          "list"
        );

      let staff =
        Array.isArray(result)
          ? result
          : Array.isArray(
              result?.staff
            )
          ? result.staff
          : Array.isArray(
              result?.data
            )
          ? result.data
          : [];

      /*
        Never keep password values.
      */

      state.staff =
        staff.map(
          function (item) {
            const copy =
              {
                ...item
              };

            delete copy.password;
            delete copy.encrypted_password;
            delete copy.temporary_password;

            return copy;
          }
        );

      renderStaffTable();
      updateStaffStats();

    } catch (error) {
      console.error(
        "Load staff error:",
        error
      );

      state.staff =
        [];

      if (table) {
        table.innerHTML = `
          <div
            style="
              padding:20px;
              border-radius:14px;
              background:#fff0f2;
              color:#8e2534;
              font-weight:700;
              line-height:1.8;
            "
          >

            ❌ تعذر تحميل الموظفين.

            <br><br>

            ${escapeHTML(
              error?.message ||
              "حدث خطأ غير معروف."
            )}

          </div>
        `;
      }

    } finally {
      state.loading =
        false;
    }
  }

  /* ==========================================================
     STATS
     ========================================================== */

  function updateStaffStats() {
    const total =
      state.staff.length;

    const active =
      state.staff.filter(
        function (staff) {
          return isStaffActive(
            staff
          );
        }
      ).length;

    const inactive =
      total - active;

    const marketing =
      state.staff.filter(
        function (staff) {
          return (
            normalizeRole(
              staff.role
            ) === "MARKETING"
          );
        }
      ).length;

    if ($("staffTotal")) {
      $("staffTotal").textContent =
        total;
    }

    if ($("staffActive")) {
      $("staffActive").textContent =
        active;
    }

    if ($("staffInactive")) {
      $("staffInactive").textContent =
        inactive;
    }

    if ($("marketingCount")) {
      $("marketingCount").textContent =
        marketing;
    }
  }

  /* ==========================================================
     FILTER
     ========================================================== */

  function getFilteredStaff() {
    const search =
      (
        $("staffSearch")
          ?.value ||
        ""
      )
        .trim()
        .toLowerCase();

    const role =
      normalizeRole(
        $("staffRoleFilter")
          ?.value ||
        ""
      );

    return state.staff.filter(
      function (staff) {
        const searchable =
          [
            staff.full_name,
            staff.username,
            staff.email,
            staff.phone,
            staff.role
          ]
            .join(" ")
            .toLowerCase();

        const matchesSearch =
          !search ||
          searchable.includes(
            search
          );

        const matchesRole =
          !role ||
          normalizeRole(
            staff.role
          ) === role;

        return (
          matchesSearch &&
          matchesRole
        );
      }
    );
  }

  /* ==========================================================
     ROLE HELPERS
     ========================================================== */

  function getRoleLabel(role) {
    const key =
      normalizeRole(
        role
      );

    return (
      ROLES[key]?.label ||
      `🎯 ${escapeHTML(
        role ||
        "غير محدد"
      )}`
    );
  }

  function canManageTarget(
    staff
  ) {
    const current =
      getCurrentRole();

    const target =
      normalizeRole(
        staff?.role
      );

    if (!current) {
      return false;
    }

    if (
      current === "OWNER"
    ) {
      return (
        target !== "OWNER" ||
        isOwner()
      );
    }

    const currentLevel =
      ROLE_LEVEL[current] ||
      0;

    const targetLevel =
      ROLE_LEVEL[target] ||
      0;

    return (
      target !== "OWNER" &&
      targetLevel <
        currentLevel
    );
  }

  /* ==========================================================
     TABLE
     ========================================================== */

  function renderStaffTable() {
    const container =
      $("staffTableContainer");

    if (!container) {
      return;
    }

    const rows =
      getFilteredStaff();

    if (!rows.length) {
      container.innerHTML = `
        <div class="empty">
          📭 لا توجد سجلات موظفين مطابقة.
        </div>
      `;

      updateStaffStats();

      return;
    }

    container.innerHTML = `
      <div
        style="
          overflow-x:auto;
          border:1px solid #e5e8f0;
          border-radius:14px;
        "
      >

        <table
          style="
            width:100%;
            border-collapse:collapse;
            min-width:1120px;
          "
        >

          <thead>

            <tr>

              <th>
                👤 الموظف
              </th>

              <th>
                🔑 Username
              </th>

              <th>
                📧 Email
              </th>

              <th>
                🎯 الوظيفة
              </th>

              <th>
                🚦 الحالة
              </th>

              <th>
                🕐 آخر دخول
              </th>

              <th>
                ⚙️ الإجراءات
              </th>

            </tr>

          </thead>

          <tbody>

            ${rows
              .map(
                function (staff) {
                  const active =
                    isStaffActive(
                      staff
                    );

                  const owner =
                    normalizeRole(
                      staff.role
                    ) === "OWNER";

                  const manageable =
                    canManageTarget(
                      staff
                    );

                  return `
                    <tr>

                      <td>

                        <strong>
                          ${escapeHTML(
                            staff.full_name ||
                            "-"
                          )}
                        </strong>

                        ${
                          staff.phone
                            ? `
                              <div
                                class="muted"
                                dir="ltr"
                                style="margin-top:4px"
                              >
                                📱
                                ${escapeHTML(
                                  staff.phone
                                )}
                              </div>
                            `
                            : ""
                        }

                      </td>

                      <td dir="ltr">
                        ${escapeHTML(
                          staff.username ||
                          "-"
                        )}
                      </td>

                      <td dir="ltr">
                        ${escapeHTML(
                          staff.email ||
                          "-"
                        )}
                      </td>

                      <td>

                        <span class="badge">
                          ${getRoleLabel(
                            staff.role
                          )}
                        </span>

                      </td>

                      <td>

                        ${
                          active
                            ? `
                              <span
                                class="badge confirmed"
                              >
                                🟢 Active
                              </span>
                            `
                            : `
                              <span
                                class="badge cancelled"
                              >
                                🔴 Disabled
                              </span>

                              ${
                                staff.terminated_at
                                  ? `
                                    <div
                                      class="muted"
                                      style="margin-top:5px"
                                    >
                                      🕐
                                      ${formatDateTime(
                                        staff.terminated_at
                                      )}
                                    </div>
                                  `
                                  : ""
                              }
                            `
                        }

                      </td>

                      <td>

                        ${
                          staff.last_login
                            ? `
                              🕐
                              ${formatDateTime(
                                staff.last_login
                              )}
                            `
                            : `
                              <span class="muted">
                                لم يسجل دخول
                              </span>
                            `
                        }

                      </td>

                      <td>

                        <div
                          style="
                            display:flex;
                            flex-wrap:wrap;
                            gap:6px;
                          "
                        >

                          <button
                            type="button"
                            class="btn btn-secondary"
                            data-staff-action="edit"
                            data-staff-id="${escapeHTML(
                              staff.id
                            )}"
                            ${
                              manageable
                                ? ""
                                : "disabled"
                            }
                            title="${
                              manageable
                                ? "تعديل"
                                : "لا توجد صلاحية"
                            }"
                          >
                            ✍️ تعديل
                          </button>

                          <button
                            type="button"
                            class="btn btn-secondary"
                            data-staff-action="role"
                            data-staff-id="${escapeHTML(
                              staff.id
                            )}"
                            ${
                              manageable
                                ? ""
                                : "disabled"
                            }
                            title="${
                              manageable
                                ? "تغيير الوظيفة"
                                : "لا توجد صلاحية"
                            }"
                          >
                            🎯 Role
                          </button>

                          <button
                            type="button"
                            class="btn btn-secondary"
                            data-staff-action="password"
                            data-staff-id="${escapeHTML(
                              staff.id
                            )}"
                            ${
                              manageable
                                ? ""
                                : "disabled"
                            }
                            title="${
                              manageable
                                ? "إعادة تعيين كلمة المرور"
                                : "لا توجد صلاحية"
                            }"
                          >
                            🔐 Reset
                          </button>

                          ${
                            owner
                              ? `
                                <button
                                  type="button"
                                  class="btn btn-secondary"
                                  disabled
                                  style="
                                    opacity:.55;
                                    cursor:not-allowed;
                                  "
                                >
                                  👑 Owner محمي
                                </button>
                              `
                              : active
                              ? `
                                <button
                                  type="button"
                                  class="btn btn-danger"
                                  data-staff-action="disable"
                                  data-staff-id="${escapeHTML(
                                    staff.id
                                  )}"
                                  ${
                                    manageable
                                      ? ""
                                      : "disabled"
                                  }
                                >
                                  ⛔ تعطيل
                                </button>
                              `
                              : `
                                <button
                                  type="button"
                                  class="btn btn-success"
                                  data-staff-action="enable"
                                  data-staff-id="${escapeHTML(
                                    staff.id
                                  )}"
                                  ${
                                    manageable
                                      ? ""
                                      : "disabled"
                                  }
                                >
                                  🟢 تفعيل
                                </button>
                              `
                          }

                        </div>

                      </td>

                    </tr>
                  `;
                }
              )
              .join("")}

          </tbody>

        </table>

      </div>
    `;

    container
      .querySelectorAll(
        "[data-staff-action]"
      )
      .forEach(
        function (button) {
          button.addEventListener(
            "click",
            function () {
              if (
                button.disabled
              ) {
                return;
              }

              handleStaffAction(
                button.dataset
                  .staffAction,
                button.dataset
                  .staffId
              );
            }
          );
        }
      );

    updateStaffStats();
  }

  /* ==========================================================
     MODAL BASE
     ========================================================== */

  function closeModal() {
    [
      "staffModal",
      "staffEditModal",
      "staffActionModal"
    ].forEach(
      function (id) {
        $(id)?.remove();
      }
    );
  }

  function createModal(
    id,
    content
  ) {
    closeModal();

    const modal =
      document.createElement(
        "div"
      );

    modal.id =
      id;

    modal.style.cssText = `
      position:fixed;
      inset:0;
      z-index:99999;
      background:rgba(10,18,45,.68);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
      direction:rtl;
    `;

    modal.innerHTML =
      content;

    document.body.appendChild(
      modal
    );

    modal.addEventListener(
      "click",
      function (event) {
        if (
          event.target ===
          modal
        ) {
          closeModal();
        }
      }
    );

    return modal;
  }

  /* ==========================================================
     CREATE STAFF MODAL
     ========================================================== */

  function openCreateStaffModal() {
    if (
      !getCurrentRole()
    ) {
      showMessage(
        "❌ لا يمكن التحقق من صلاحيات الحساب.",
        "error"
      );
      return;
    }

    closeModal();

    const roleOptions =
      Object.entries(
        ROLES
      )
        .filter(
          function ([key]) {
            return (
              key !== "OWNER" ||
              isOwner()
            );
          }
        )
        .map(
          function ([key, value]) {
            return `
              <option
                value="${escapeHTML(
                  key
                )}"
              >
                ${value.label}
              </option>
            `;
          }
        )
        .join("");

    const modal =
      createModal(
        "staffModal",
        `
          <div
            style="
              width:min(760px,100%);
              max-height:92vh;
              overflow:auto;
              background:#fff;
              border-radius:22px;
              padding:25px;
              box-shadow:0 25px 70px rgba(0,0,0,.3);
            "
          >

            <div
              style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:10px;
                margin-bottom:20px;
              "
            >

              <div>

                <h2 style="margin:0">
                  ➕ إضافة موظف جديد
                </h2>

                <div class="muted">
                  إنشاء حساب دخول وصلاحيات للموظف
                </div>

              </div>

              <button
                id="closeStaffModal"
                type="button"
                class="btn btn-secondary"
              >
                ✖
              </button>

            </div>

            <form
              id="createStaffForm"
              autocomplete="off"
            >

              <div
                style="
                  display:grid;
                  grid-template-columns:
                    repeat(auto-fit,minmax(230px,1fr));
                  gap:14px;
                "
              >

                <label>
                  👤 الاسم الكامل

                  <input
                    id="newStaffName"
                    type="text"
                    required
                    autocomplete="name"
                    placeholder="مثال: Sara Mohamed"
                  >
                </label>

                <label>
                  🔑 Username

                  <input
                    id="newStaffUsername"
                    type="text"
                    required
                    autocomplete="off"
                    pattern="[A-Za-z0-9._-]{3,40}"
                    placeholder="مثال: sara"
                    dir="ltr"
                  >
                </label>

                <label>
                  📧 Email

                  <input
                    id="newStaffEmail"
                    type="email"
                    required
                    autocomplete="email"
                    placeholder="employee@example.com"
                    dir="ltr"
                  >
                </label>

                <label>
                  📱 الهاتف

                  <input
                    id="newStaffPhone"
                    type="tel"
                    autocomplete="tel"
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                  >
                </label>

                <label>
                  🎯 الوظيفة

                  <select
                    id="newStaffRole"
                    required
                  >

                    <option value="">
                      اختر الوظيفة
                    </option>

                    ${roleOptions}

                  </select>
                </label>

                <label>
                  🔐 Temporary Password

                  <input
                    id="newStaffPassword"
                    type="password"
                    minlength="10"
                    autocomplete="new-password"
                    placeholder="اتركه فارغًا للتوليد التلقائي"
                    dir="ltr"
                  >

                  <small
                    class="muted"
                    style="
                      display:block;
                      margin-top:5px;
                    "
                  >
                    الحد الأدنى 10 أحرف.
                  </small>

                </label>

              </div>

              <div
                id="marketingPermissionNotice"
                style="
                  display:none;
                  margin-top:15px;
                  padding:14px;
                  border-radius:12px;
                  background:#f4f0ff;
                  color:#493276;
                  font-weight:700;
                  line-height:1.8;
                "
              >
                📣 هذا حساب Marketing.

                <br><br>

                سيحصل على صلاحيات التسويق
                والمحتوى والحملات والـ Leads
                حسب ما يسمح به النظام.

                <br>

                🙅‍♀️ لا يحصل تلقائيًا على
                البيانات الطبية أو المالية
                أو إدارة الموظفين.
              </div>

              <div
                style="
                  margin-top:15px;
                  padding:14px;
                  border-radius:12px;
                  background:#f5f7fb;
                  color:#46516b;
                  line-height:1.8;
                "
              >

                🔐 <strong>الأمان:</strong>

                <br>

                كلمة المرور يتم التعامل معها
                بواسطة Edge Function الآمنة.

                <br>

                لا يتم تخزين Service Role Key
                أو كلمة المرور داخل هذا الملف.

              </div>

              <div
                style="
                  display:flex;
                  justify-content:flex-end;
                  gap:10px;
                  margin-top:20px;
                "
              >

                <button
                  id="cancelStaffCreation"
                  type="button"
                  class="btn btn-secondary"
                >
                  إلغاء
                </button>

                <button
                  id="createStaffSubmit"
                  type="submit"
                  class="btn btn-primary"
                >
                  ➕ إنشاء حساب الموظف
                </button>

              </div>

            </form>

          </div>
        `
      );

    $("closeStaffModal")
      ?.addEventListener(
        "click",
        closeModal
      );

    $("cancelStaffCreation")
      ?.addEventListener(
        "click",
        closeModal
      );

    $("newStaffRole")
      ?.addEventListener(
        "change",
        updateMarketingNotice
      );

    $("createStaffForm")
      ?.addEventListener(
        "submit",
        createStaff
      );

    updateMarketingNotice();

    return modal;
  }

  /* ==========================================================
     MARKETING NOTICE
     ========================================================== */

  function updateMarketingNotice() {
    const role =
      $("newStaffRole")
        ?.value;

    const notice =
      $("marketingPermissionNotice");

    if (!notice) {
      return;
    }

    notice.style.display =
      role === "MARKETING"
        ? "block"
        : "none";
  }

  /* ==========================================================
     CREATE STAFF
     ========================================================== */

  async function createStaff(
    event
  ) {
    event.preventDefault();

    const name =
      $("newStaffName")
        ?.value
        ?.trim();

    const username =
      $("newStaffUsername")
        ?.value
        ?.trim()
        .toLowerCase();

    const email =
      $("newStaffEmail")
        ?.value
        ?.trim()
        .toLowerCase();

    const phone =
      $("newStaffPhone")
        ?.value
        ?.trim();

    const role =
      normalizeRole(
        $("newStaffRole")
          ?.value
      );

    const password =
      $("newStaffPassword")
        ?.value ||
        "";

    const submit =
      $("createStaffSubmit");

    if (!name) {
      showMessage(
        "❌ الاسم مطلوب.",
        "error"
      );
      return;
    }

    if (
      !/^[a-z0-9._-]{3,40}$/i.test(
        username
      )
    ) {
      showMessage(
        "❌ Username يجب أن يحتوي على 3 إلى 40 حرفًا أو رقمًا، ويمكن استخدام . _ - فقط.",
        "error"
      );
      return;
    }

    if (!email) {
      showMessage(
        "❌ Email مطلوب.",
        "error"
      );
      return;
    }

    if (!role) {
      showMessage(
        "❌ اختر وظيفة الموظف.",
        "error"
      );
      return;
    }

    if (
      password &&
      password.length <
        10
    ) {
      showMessage(
        "❌ كلمة المرور يجب أن تكون 10 أحرف على الأقل.",
        "error"
      );
      return;
    }

    if (
      role === "OWNER" &&
      !isOwner()
    ) {
      showMessage(
        "❌ فقط Owner يمكنه إنشاء Owner.",
        "error"
      );
      return;
    }

    if (submit) {
      submit.disabled =
        true;

      submit.textContent =
        "⏳ جاري إنشاء الحساب...";
    }

    try {
      const result =
        await callStaffAdmin(
          "create",
          {
            full_name:
              name,

            username:
              username,

            email:
              email,

            phone:
              phone ||
              null,

            role:
              role,

            password:
              password ||
              null
          }
        );

      closeModal();

      await loadStaff();

      let message =
        "✅ تم إنشاء حساب الموظف بنجاح.";

      if (
        result?.temporary_password
      ) {
        message +=
          "\n\n🔐 كلمة المرور المؤقتة:";
        message +=
          `\n${result.temporary_password}`;
        message +=
          "\n\n⚠️ احتفظ بها وأرسلها للموظف بأمان.";
      }

      showMessage(
        message,
        "success"
      );

    } catch (error) {
      console.error(
        "Create staff error:",
        error
      );

      showMessage(
        `❌ تعذر إنشاء الموظف:\n${error?.message || "حدث خطأ."}`,
        "error"
      );

      if (submit) {
        submit.disabled =
          false;

        submit.textContent =
          "➕ إنشاء حساب الموظف";
      }
    }
  }

  /* ==========================================================
     STAFF ACTIONS
     ========================================================== */

  async function handleStaffAction(
    action,
    staffId
  ) {
    const staff =
      state.staff.find(
        function (item) {
          return (
            String(
              item.id
            ) ===
            String(
              staffId
            )
          );
        }
      );

    if (!staff) {
      showMessage(
        "❌ الموظف غير موجود.",
        "error"
      );
      return;
    }

    if (
      !canManageTarget(
        staff
      )
    ) {
      showMessage(
        "🛡️ لا توجد لديك صلاحية لإدارة هذا الموظف.",
        "error"
      );
      return;
    }

    switch (
      action
    ) {
      case "edit":
        openEditStaffModal(
          staff
        );
        break;

      case "role":
        openRoleModal(
          staff
        );
        break;

      case "password":
        await resetStaffPassword(
          staff
        );
        break;

      case "disable":
        await disableStaff(
          staff
        );
        break;

      case "enable":
        await enableStaff(
          staff
        );
        break;

      default:
        showMessage(
          "❌ الإجراء غير معروف.",
          "error"
        );
    }
  }

  /* ==========================================================
     EDIT STAFF MODAL
     ========================================================== */

  function openEditStaffModal(
    staff
  ) {
    const currentRole =
      getCurrentRole();

    const currentLevel =
      ROLE_LEVEL[
        currentRole
      ] || 0;

    const staffLevel =
      ROLE_LEVEL[
        normalizeRole(
          staff.role
        )
      ] || 0;

    const roleOptions =
      Object.entries(
        ROLES
      )
        .filter(
          function ([key]) {
            if (
              key ===
              "OWNER"
            ) {
              return (
                currentRole ===
                "OWNER"
              );
            }

            if (
              currentRole ===
              "OWNER"
            ) {
              return true;
            }

            return (
              (
                ROLE_LEVEL[
                  key
                ] || 0
              ) <
              currentLevel
            );
          }
        )
        .map(
          function ([key, value]) {
            return `
              <option
                value="${escapeHTML(
                  key
                )}"
                ${
                  normalizeRole(
                    staff.role
                  ) ===
                  key
                    ? "selected"
                    : ""
                }
              >
                ${value.label}
              </option>
            `;
          }
        )
        .join("");

    createModal(
      "staffEditModal",
      `
        <div
          style="
            width:min(650px,100%);
            max-height:92vh;
            overflow:auto;
            background:#fff;
            border-radius:22px;
            padding:25px;
          "
        >

          <div
            style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:10px;
              margin-bottom:20px;
            "
          >

            <div>

              <h2 style="margin:0">
                ✍️ تعديل بيانات الموظف
              </h2>

              <div class="muted">
                ${escapeHTML(
                  staff.full_name ||
                  ""
                )}
              </div>

            </div>

            <button
              id="closeStaffEdit"
              type="button"
              class="btn btn-secondary"
            >
              ✖
            </button>

          </div>

          <form id="editStaffForm">

            <div
              style="
                display:grid;
                grid-template-columns:
                  repeat(auto-fit,minmax(230px,1fr));
                gap:14px;
              "
            >

              <label>
                👤 الاسم الكامل

                <input
                  id="editStaffName"
                  type="text"
                  required
                  value="${escapeHTML(
                    staff.full_name ||
                    ""
                  )}"
                >
              </label>

              <label>
                📧 Email

                <input
                  id="editStaffEmail"
                  type="email"
                  required
                  value="${escapeHTML(
                    staff.email ||
                    ""
                  )}"
                  dir="ltr"
                >
              </label>

              <label>
                📱 الهاتف

                <input
                  id="editStaffPhone"
                  type="tel"
                  value="${escapeHTML(
                    staff.phone ||
                    ""
                  )}"
                  dir="ltr"
                >
              </label>

              <label>
                🎯 الوظيفة

                <select
                  id="editStaffRole"
                  required
                >
                  ${roleOptions}
                </select>
              </label>

            </div>

            <div
              style="
                margin-top:15px;
                padding:14px;
                border-radius:12px;
                background:#f5f7fb;
                line-height:1.8;
              "
            >

              🔑 Username:

              <strong dir="ltr">
                ${escapeHTML(
                  staff.username ||
                  "—"
                )}
              </strong>

              <br>

              🔐 كلمة المرور لا يتم تعديلها
              من هذه الشاشة.

              <br>

              استخدم زر Reset لإنشاء كلمة مرور جديدة.

            </div>

            ${
              normalizeRole(
                staff.role
              ) === "OWNER"
                ? `
                  <div
                    style="
                      margin-top:15px;
                      padding:14px;
                      border-radius:12px;
                      background:#fff8e8;
                      color:#765400;
                      line-height:1.8;
                    "
                  >
                    👑 هذا حساب Owner.

                    <br>

                    لا يمكن إزالة دور Owner
                    إذا كان هذا آخر Owner نشط
                    في النظام.
                  </div>
                `
                : ""
            }

            <div
              style="
                display:flex;
                justify-content:flex-end;
                gap:10px;
                margin-top:20px;
              "
            >

              <button
                id="cancelStaffEdit"
                type="button"
                class="btn btn-secondary"
              >
                إلغاء
              </button>

              <button
                id="saveStaffEdit"
                type="submit"
                class="btn btn-primary"
              >
                💾 حفظ التعديلات
              </button>

            </div>

          </form>

        </div>
      `
    );

    $("closeStaffEdit")
      ?.addEventListener(
        "click",
        closeModal
      );

    $("cancelStaffEdit")
      ?.addEventListener(
        "click",
        closeModal
      );

    $("editStaffForm")
      ?.addEventListener(
        "submit",
        function (event) {
          saveStaffEdit(
            event,
            staff
          );
        }
      );
  }

  /* ==========================================================
     SAVE STAFF EDIT
     ========================================================== */

  async function saveStaffEdit(
    event,
    staff
  ) {
    event.preventDefault();

    const full_name =
      $("editStaffName")
        ?.value
        ?.trim();

    const email =
      $("editStaffEmail")
        ?.value
        ?.trim()
        .toLowerCase();

    const phone =
      $("editStaffPhone")
        ?.value
        ?.trim();

    const role =
      normalizeRole(
        $("editStaffRole")
          ?.value
      );

    const submit =
      $("saveStaffEdit");

    if (!full_name) {
      showMessage(
        "❌ الاسم مطلوب.",
        "error"
      );
      return;
    }

    if (!email) {
      showMessage(
        "❌ Email مطلوب.",
        "error"
      );
      return;
    }

    if (!role) {
      showMessage(
        "❌ الوظيفة مطلوبة.",
        "error"
      );
      return;
    }

    if (
      role === "OWNER" &&
      !isOwner()
    ) {
      showMessage(
        "❌ فقط Owner يمكنه تعيين Owner.",
        "error"
      );
      return;
    }

    if (submit) {
      submit.disabled =
        true;

      submit.textContent =
        "⏳ جاري الحفظ...";
    }

    try {
      await callStaffAdmin(
        "update",
        {
          staff_id:
            staff.id,

          full_name:
            full_name,

          email:
            email,

          phone:
            phone ||
            null,

          role:
            role
        }
      );

      closeModal();

      await loadStaff();

      showMessage(
        "✅ تم تحديث بيانات الموظف بنجاح.",
        "success"
      );

    } catch (error) {
      console.error(
        "Update staff error:",
        error
      );

      showMessage(
        `❌ تعذر تحديث الموظف:\n${error?.message || "حدث خطأ."}`,
        "error"
      );

      if (submit) {
        submit.disabled =
          false;

        submit.textContent =
          "💾 حفظ التعديلات";
      }
    }
  }

  /* ==========================================================
     ROLE MODAL
     ========================================================== */

  function openRoleModal(
    staff
  ) {
    if (
      normalizeRole(
        staff.role
      ) === "OWNER"
    ) {
      showMessage(
        "👑 حساب Owner محمي ولا يمكن تغيير وظيفته من شاشة الموظفين.",
        "error"
      );
      return;
    }

    const currentRole =
      getCurrentRole();

    const currentLevel =
      ROLE_LEVEL[
        currentRole
      ] || 0;

    const options =
      Object.entries(
        ROLES
      )
        .filter(
          function ([key]) {
            if (
              key ===
              "OWNER"
            ) {
              return (
                currentRole ===
                "OWNER"
              );
            }

            if (
              currentRole ===
              "OWNER"
            ) {
              return true;
            }

            return (
              (
                ROLE_LEVEL[
                  key
                ] || 0
              ) <
              currentLevel
            );
          }
        )
        .map(
          function ([key, value]) {
            return `
              <option
                value="${escapeHTML(
                  key
                )}"
                ${
                  normalizeRole(
                    staff.role
                  ) ===
                  key
                    ? "selected"
                    : ""
                }
              >
                ${value.label}
              </option>
            `;
          }
        )
        .join("");

    createModal(
      "staffActionModal",
      `
        <div
          style="
            width:min(500px,100%);
            background:#fff;
            border-radius:20px;
            padding:24px;
          "
        >

          <h2>
            🎯 تغيير وظيفة الموظف
          </h2>

          <p>
            👤
            <strong>
              ${escapeHTML(
                staff.full_name ||
                "-"
              )}
            </strong>
          </p>

          <label>
            الوظيفة الجديدة

            <select
              id="changeStaffRole"
            >
              ${options}
            </select>
          </label>

          <div
            style="
              margin-top:15px;
              padding:12px;
              border-radius:12px;
              background:#f5f7fb;
              line-height:1.7;
            "
          >

            🔐 تغيير الوظيفة يتم من خلال
            Edge Function الآمنة.

            <br><br>

            🛡️ الـ backend هو صاحب القرار
            النهائي في الصلاحيات.

          </div>

          <div
            style="
              display:flex;
              justify-content:flex-end;
              gap:10px;
              margin-top:20px;
            "
          >

            <button
              id="cancelRoleChange"
              class="btn btn-secondary"
              type="button"
            >
              إلغاء
            </button>

            <button
              id="saveRoleChange"
              class="btn btn-primary"
              type="button"
            >
              💾 حفظ الوظيفة
            </button>

          </div>

        </div>
      `
    );

    $("cancelRoleChange")
      ?.addEventListener(
        "click",
        closeModal
      );

    $("saveRoleChange")
      ?.addEventListener(
        "click",
        async function () {
          const role =
            normalizeRole(
              $("changeStaffRole")
                ?.value
            );

          if (!role) {
            showMessage(
              "❌ اختر الوظيفة الجديدة.",
              "error"
            );
            return;
          }

          if (
            role ===
              "OWNER" &&
            !isOwner()
          ) {
            showMessage(
              "❌ فقط Owner يمكنه تعيين Owner.",
              "error"
            );
            return;
          }

          const button =
            $("saveRoleChange");

          if (button) {
            button.disabled =
              true;

            button.textContent =
              "⏳ جاري الحفظ...";
          }

          try {
            await callStaffAdmin(
              "update_role",
              {
                staff_id:
                  staff.id,

                role:
                  role
              }
            );

            closeModal();

            await loadStaff();

            showMessage(
              "✅ تم تحديث وظيفة الموظف.",
              "success"
            );

          } catch (error) {
            console.error(
              "Update role error:",
              error
            );

            showMessage(
              `❌ ${error?.message || "حدث خطأ."}`,
              "error"
            );

            if (button) {
              button.disabled =
                false;

              button.textContent =
                "💾 حفظ الوظيفة";
            }
          }
        }
      );
  }

  /* ==========================================================
     RESET PASSWORD
     ========================================================== */

  async function resetStaffPassword(
    staff
  ) {
    if (
      normalizeRole(
        staff.role
      ) === "OWNER" &&
      !isOwner()
    ) {
      showMessage(
        "👑 لا يمكنك إدارة كلمة مرور Owner.",
        "error"
      );
      return;
    }

    const confirmed =
      window.confirm(
        `🔐 هل تريد إعادة تعيين كلمة مرور ${staff.full_name || "الموظف"}؟\n\nسيتم إنشاء كلمة مرور مؤقتة جديدة للحساب.`
      );

    if (!confirmed) {
      return;
    }

    try {
      const result =
        await callStaffAdmin(
          "reset_password",
          {
            staff_id:
              staff.id
          }
        );

      let message =
        "✅ تم إعادة تعيين كلمة المرور.";

      if (
        result?.temporary_password
      ) {
        message +=
          "\n\n🔐 كلمة المرور المؤقتة:";
        message +=
          `\n${result.temporary_password}`;
        message +=
          "\n\n⚠️ احتفظ بها وأرسلها للموظف بأمان.";
      }

      showMessage(
        message,
        "success"
      );

    } catch (error) {
      console.error(
        "Reset password error:",
        error
      );

      showMessage(
        `❌ تعذر إعادة تعيين كلمة المرور:\n${error?.message || "حدث خطأ."}`,
        "error"
      );
    }
  }

  /* ==========================================================
     DISABLE STAFF
     ========================================================== */

  async function disableStaff(
    staff
  ) {
    if (
      normalizeRole(
        staff.role
      ) === "OWNER"
    ) {
      showMessage(
        "🛡️ لا يمكن تعطيل حساب Owner من شاشة الموظفين.",
        "error"
      );
      return;
    }

    const confirmed =
      window.confirm(
        `⛔ هل أنت متأكد من تعطيل ${staff.full_name || "هذا الموظف"}؟\n\nسيتم إلغاء وصوله مع الاحتفاظ بسجل الموظف والعمليات السابقة.`
      );

    if (!confirmed) {
      return;
    }

    try {
      await callStaffAdmin(
        "disable",
        {
          staff_id:
            staff.id
        }
      );

      await loadStaff();

      showMessage(
        "⛔ تم تعطيل حساب الموظف وإلغاء الوصول.",
        "success"
      );

    } catch (error) {
      console.error(
        "Disable staff error:",
        error
      );

      showMessage(
        `❌ تعذر تعطيل الموظف:\n${error?.message || "حدث خطأ."}`,
        "error"
      );
    }
  }

  /* ==========================================================
     ENABLE STAFF
     ========================================================== */

  async function enableStaff(
    staff
  ) {
    if (
      normalizeRole(
        staff.role
      ) === "OWNER"
    ) {
      showMessage(
        "👑 حساب Owner محمي.",
        "error"
      );
      return;
    }

    const confirmed =
      window.confirm(
        `🟢 هل تريد إعادة تفعيل حساب ${staff.full_name || "هذا الموظف"}؟`
      );

    if (!confirmed) {
      return;
    }

    try {
      await callStaffAdmin(
        "enable",
        {
          staff_id:
            staff.id
        }
      );

      await loadStaff();

      showMessage(
        "🟢 تم تفعيل حساب الموظف.",
        "success"
      );

    } catch (error) {
      console.error(
        "Enable staff error:",
        error
      );

      showMessage(
        `❌ تعذر تفعيل الموظف:\n${error?.message || "حدث خطأ."}`,
        "error"
      );
    }
  }

  /* ==========================================================
     AUTH LISTENER
     ========================================================== */

  async function setupAuthListener() {
    if (
      state.authListenerReady
    ) {
      return;
    }

    const client =
      await createSupabaseClient();

    if (
      !client?.auth ||
      typeof client.auth
        .onAuthStateChange !==
        "function"
    ) {
      return;
    }

    state.authListenerReady =
      true;

    client.auth.onAuthStateChange(
      async function (
        event,
        session
      ) {
        if (
          event ===
            "SIGNED_IN" ||
          event ===
            "TOKEN_REFRESHED" ||
          event ===
            "USER_UPDATED"
        ) {
          if (session) {
            state.currentSession =
              session;

            state.currentUser =
              session.user ||
              null;

            state.currentRole =
              normalizeRole(
                session.user?.app_metadata?.role ||
                session.user?.user_metadata?.role ||
                state.currentRole
              );

            /*
              Do not call loadStaff immediately
              on every token refresh if another load
              is already in progress.
            */

            if (
              !state.loading
            ) {
              await loadStaff();
            }
          }
        }

        if (
          event ===
          "SIGNED_OUT"
        ) {
          state.staff =
            [];

          state.currentSession =
            null;

          state.currentUser =
            null;

          state.currentRole =
            null;

          renderStaffTable();
          updateStaffStats();
        }
      }
    );
  }

  /* ==========================================================
     WAIT FOR SUPABASE
     ========================================================== */

  async function waitForSupabase() {
    let attempts =
      0;

    while (
      attempts < 80
    ) {
      try {
        const client =
          await createSupabaseClient();

        if (client) {
          return client;
        }
      } catch (_) {
        /*
          Continue waiting.
        */
      }

      await new Promise(
        function (resolve) {
          setTimeout(
            resolve,
            100
          );
        }
      );

      attempts++;
    }

    throw new Error(
      "Supabase client unavailable."
    );
  }

  /* ==========================================================
     INITIALIZATION
     ========================================================== */

  async function initialize() {
    if (
      state.initialized
    ) {
      return;
    }

    try {
      await waitForSupabase();

      const session =
        await getSession();

      if (session) {
        state.currentSession =
          session;

        state.currentUser =
          session.user ||
          null;

        state.currentRole =
          normalizeRole(
            session.user?.app_metadata?.role ||
            session.user?.user_metadata?.role ||
            ""
          );
      }

      /*
        admin.html already contains:

        <section id="staff" class="panel">

        Therefore we NEVER create another staff tab.
      */

      const panel =
        getStaffPanel();

      if (!panel) {
        console.warn(
          "Azaad Staff Management: #staff panel not found."
        );

        return;
      }

      renderStaffManagement();

      await setupAuthListener();

      if (session) {
        await loadStaff();
      } else {
        const table =
          $("staffTableContainer");

        if (table) {
          table.innerHTML = `
            <div class="empty">
              🔐 قم بتسجيل الدخول أولاً.
            </div>
          `;
        }
      }

      state.initialized =
        true;

    } catch (error) {
      console.error(
        "Azaad Staff Management initialization error:",
        error
      );

      showMessage(
        `❌ تعذر تشغيل إدارة الموظفين:\n${error?.message || "حدث خطأ."}`,
        "error"
      );
    }
  }

  /* ==========================================================
     PUBLIC API
     ========================================================== */

  window.AZAAD_STAFF = {
    init:
      initialize,

    load:
      loadStaff,

    refresh:
      loadStaff,

    openCreate:
      openCreateStaffModal,

    state:
      state,

    roles:
      ROLES
  };

  /* ==========================================================
     START
     ========================================================== */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true
      }
    );
  } else {
    initialize();
  }

})();