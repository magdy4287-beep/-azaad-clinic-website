staff-management.js

/* ============================================================
   AZAAD CLINIC
   STAFF MANAGEMENT CENTER
   File: staff-management.js
   Purpose:
   - Employee creation
   - Employee listing
   - Employee editing
   - Role management
   - Enable / Disable employee
   - Password reset
   - Staff permissions information
   - Last login display
   - Secure communication with staff-admin Edge Function
   IMPORTANT:
   - This file does NOT contain the Supabase Service Role Key.
   - Password operations are handled by the secure Edge Function.
   - clinic_staff uses "active", NOT "is_active".
   - The real authorization is enforced by staff-admin backend.
   - The existing #staff panel in admin.html is reused.
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
  const MANAGER_ROLES = new Set([
    "OWNER",
    "ADMIN",
    "MANAGER"
  ]);
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
  function formatDateTime(value) {
    if (!value) {
      return "—";
    }
    try {
      const date = new Date(value);
      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return escapeHTML(value);
      }
      return date.toLocaleString(
        "ar-EG",
        {
          dateStyle: "medium",
          timeStyle: "short"
        }
      );
    } catch (_) {
      return escapeHTML(value);
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
      Prefer an already exposed project client if available.
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
      The current admin.html keeps its Supabase client
      inside a module scope. Therefore this file uses a
      dynamic import as a safe compatibility layer.
      This creates another client using the SAME project
      and SAME publishable key. Supabase Auth persists the
      session in browser storage, so the authenticated
      session is shared.
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
      session.user || null;
    return session.access_token;
  }
  /* ==========================================================
     SECURE STAFF ADMIN API
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
          body: JSON.stringify({
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
     ACCESS CHECK
     ========================================================== */
  async function checkManagementAccess() {
    try {
      const result =
        await callStaffAdmin(
          "list"
        );
      /*
        The list action itself is protected by the
        backend. If it succeeds, the authenticated
        account has staff-management permission.
      */
      state.currentRole =
        normalizeRole(
          result?.currentRole ||
          state.currentRole
        );
      return {
        allowed: true,
        result
      };
    } catch (error) {
      const message =
        String(
          error?.message || ""
        );
      if (
        /ليس لديك صلاحية|Unauthorized|غير نشط|غير مرتبط|إدارة الموظفين/i.test(
          message
        )
      ) {
        return {
          allowed: false,
          result: null,
          error
        };
      }
      throw error;
    }
  }
  /* ==========================================================
     FIND EXISTING STAFF PANEL
     ========================================================== */
  function getStaffPanel() {
    return (
      $("staff") ||
      $("staffPanel")
    );
  }
  /* ==========================================================
     HIDE LEGACY STAFF UI
     ========================================================== */
  function hideLegacyStaffContent() {
    const panel =
      getStaffPanel();
    if (!panel) {
      return;
    }
    /*
      admin.html already contains a built-in staff card.
      This external file becomes the dedicated Staff
      Management Center.
      We hide the old card instead of creating another
      tab or another panel.
    */
    Array.from(
      panel.children
    ).forEach(function (child) {
      if (
        child.id !==
        "staffManagementCenter"
      ) {
        child.style.display =
          "none";
      }
    });
  }
  /* ==========================================================
     RENDER MANAGEMENT CENTER
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
    hideLegacyStaffContent();
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
          ${Object.entries(ROLES)
            .map(
              function ([key, role]) {
                return `
                  <option value="${escapeHTML(
                    key
                  )}">
                    ${role.label}
                  </option>
                `;
              }
            )
            .join("")}
        </select>
        <button
          id="staffRefreshButton"
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
    $("staffRefreshButton")
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
      const rows =
        Array.isArray(
          result
        )
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
      state.staff =
        rows.map(
          function (item) {
            const clean = {
              ...item
            };
            /*
              Never retain password material.
            */
            delete clean.password;
            delete clean.temp_password;
            delete clean.temporary_password;
            delete clean.encrypted_password;
            delete clean.password_hash;
            return clean;
          }
        );
      renderStaffTable();
      updateStaffStats();
      return state.staff;
    } catch (error) {
      console.error(
        "Azaad Staff load error:",
        error
      );
      state.staff = [];
      if (table) {
        table.innerHTML = `
          <div
            style="
              padding:20px;
              border-radius:14px;
              background:#fff0f2;
              color:#a32939;
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
      throw error;
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
        isStaffActive
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
        String(total);
    }
    if ($("staffActive")) {
      $("staffActive").textContent =
        String(active);
    }
    if ($("staffInactive")) {
      $("staffInactive").textContent =
        String(inactive);
    }
    if ($("marketingCount")) {
      $("marketingCount").textContent =
        String(marketing);
    }
  }
  /* ==========================================================
     FILTER
     ========================================================== */
  function getFilteredStaff() {
    const search =
      String(
        $("staffSearch")?.value ||
        ""
      )
        .trim()
        .toLowerCase();
    const selectedRole =
      normalizeRole(
        $("staffRoleFilter")?.value ||
        ""
      );
    return state.staff.filter(
      function (staff) {
        const searchable = [
          staff.full_name,
          staff.username,
          staff.email,
          staff.phone,
          staff.role
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch =
          !search ||
          searchable.includes(
            search
          );
        const matchesRole =
          !selectedRole ||
          normalizeRole(
            staff.role
          ) === selectedRole;
        return (
          matchesSearch &&
          matchesRole
        );
      }
    );
  }
  /* ==========================================================
     ROLE LABEL
     ========================================================== */
  function getRoleLabel(role) {
    const normalized =
      normalizeRole(role);
    return (
      ROLES[normalized]?.label ||
      `🎯 ${escapeHTML(
        role || "غير محدد"
      )}`
    );
  }
  /* ==========================================================
     ROLE DESCRIPTION
     ========================================================== */
  function getRoleDescription(role) {
    const normalized =
      normalizeRole(role);
    return (
      ROLES[normalized]?.description ||
      "الصلاحيات يحددها النظام الآمن."
    );
  }
  /* ==========================================================
     STAFF TABLE
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
        class="table-wrap"
        style="
          overflow-x:auto;
          border:1px solid #e3e6ed;
          border-radius:12px;
        "
      >
        <table
          style="
            width:100%;
            min-width:1200px;
            border-collapse:collapse;
          "
        >
          <thead>
            <tr>
              <th>👤 الموظف</th>
              <th>🔑 Username</th>
              <th>📧 Email</th>
              <th>🎯 الوظيفة</th>
              <th>🚦 الحالة</th>
              <th>🕐 آخر دخول</th>
              <th>⚙️ الإجراءات</th>
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
                  return `
                    <tr>
                      <td>
                        <strong>
                          ${escapeHTML(
                            staff.full_name ||
                            "—"
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
                          "—"
                        )}
                      </td>
                      <td dir="ltr">
                        ${escapeHTML(
                          staff.email ||
                          "—"
                        )}
                      </td>
                      <td>
                        <span
                          class="badge"
                          title="${escapeHTML(
                            getRoleDescription(
                              staff.role
                            )
                          )}"
                        >
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
                                      style="margin-top:4px"
                                    >
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
                          class="item-actions"
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
                              owner
                                ? "disabled"
                                : ""
                            }
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
                                  title="Owner محمي"
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
     HANDLE STAFF ACTION
     ========================================================== */
  async function handleStaffAction(
    action,
    staffId
  ) {
    const staff =
      state.staff.find(
        function (item) {
          return (
            String(item.id) ===
            String(staffId)
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
    switch (action) {
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
          "❌ إجراء غير معروف.",
          "error"
        );
    }
  }
  /* ==========================================================
     MODAL HELPERS
     ========================================================== */
  function closeModal() {
    document
      .querySelectorAll(
        ".azaad-staff-modal"
      )
      .forEach(
        function (modal) {
          modal.remove();
        }
      );
  }
  function createModal(
    title,
    content
  ) {
    closeModal();
    const modal =
      document.createElement(
        "div"
      );
    modal.className =
      "azaad-staff-modal";
    modal.style.cssText = `
      position:fixed;
      inset:0;
      z-index:999999;
      background:rgba(10,18,45,.68);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
      direction:rtl;
    `;
    modal.innerHTML = `
      <div
        style="
          width:min(760px,100%);
          max-height:92vh;
          overflow:auto;
          background:#fff;
          border-radius:22px;
          padding:24px;
          box-shadow:0 25px 70px rgba(0,0,0,.3);
        "
      >
        <div
          style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            margin-bottom:20px;
          "
        >
          <div>
            <h2 style="margin:0">
              ${escapeHTML(title)}
            </h2>
          </div>
          <button
            type="button"
            class="btn btn-secondary"
            data-staff-modal-close
          >
            ✖️ إغلاق
          </button>
        </div>
        <div>
          ${content}
        </div>
      </div>
    `;
    document.body.appendChild(
      modal
    );
    modal
      .querySelector(
        "[data-staff-modal-close]"
      )
      ?.addEventListener(
        "click",
        closeModal
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
    const roleOptions =
      Object.entries(ROLES)
        .filter(
          function ([key]) {
            /*
              OWNER creation is deliberately excluded
              from this UI. The backend also enforces it.
            */
            return key !== "OWNER";
          }
        )
        .map(
          function ([key, role]) {
            return `
              <option value="${escapeHTML(
                key
              )}">
                ${role.label}
              </option>
            `;
          }
        )
        .join("");
    const modal =
      createModal(
        "➕ إضافة موظف جديد",
        `
          <form id="createStaffForm">
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
                  maxlength="200"
                  autocomplete="name"
                  placeholder="اسم الموظف"
                >
              </label>
              <label>
                🔑 Username
                <input
                  id="newStaffUsername"
                  type="text"
                  required
                  maxlength="40"
                  autocomplete="username"
                  pattern="[A-Za-z0-9._-]{3,40}"
                  placeholder="example.user"
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
                  placeholder="اتركه فارغًا للتوليد الآمن"
                  dir="ltr"
                >
                <small
                  class="muted"
                  style="
                    display:block;
                    margin-top:5px;
                    line-height:1.6;
                  "
                >
                  الحد الأدنى 10 أحرف.
                  إذا تركته فارغًا سيولد النظام كلمة
                  مرور عشوائية آمنة.
                </small>
              </label>
            </div>
            <div
              id="newStaffRoleInfo"
              style="
                margin-top:15px;
                padding:14px;
                border-radius:12px;
                background:#f5f7fb;
                line-height:1.8;
              "
            >
              🎯 اختر الوظيفة لعرض وصف الصلاحيات.
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
              كلمة المرور لا يتم تخزينها في هذا الملف
              أو في واجهة الموظفين.
              <br>
              عملية إنشاء الحساب تتم داخل
              <strong>staff-admin Edge Function</strong>.
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
                type="button"
                class="btn btn-secondary"
                data-staff-modal-close
              >
                إلغاء
              </button>
              <button
                id="createStaffSubmit"
                type="submit"
                class="btn btn-primary"
              >
                ➕ إنشاء الحساب
              </button>
            </div>
          </form>
        `
      );
    const roleSelect =
      $("newStaffRole");
    const roleInfo =
      $("newStaffRoleInfo");
    function updateRoleInfo() {
      const role =
        normalizeRole(
          roleSelect?.value
        );
      if (!roleInfo) {
        return;
      }
      if (!role) {
        roleInfo.innerHTML =
          "🎯 اختر الوظيفة لعرض وصف الصلاحيات.";
        return;
      }
      roleInfo.innerHTML = `
        ${getRoleLabel(role)}
        <br>
        <span class="muted">
          ${escapeHTML(
            getRoleDescription(
              role
            )
          )}
        </span>
        ${
          role === "MARKETING"
            ? `
              <br><br>
              📣 Marketing لا يحصل تلقائيًا
              على البيانات الطبية أو المالية أو
              إدارة الموظفين.
            `
            : ""
        }
      `;
    }
    roleSelect?.addEventListener(
      "change",
      updateRoleInfo
    );
    updateRoleInfo();
    $("createStaffForm")
      ?.addEventListener(
        "submit",
        function (event) {
          createStaff(
            event
          );
        }
      );
    return modal;
  }
  /* ==========================================================
     CREATE STAFF
     ========================================================== */
  async function createStaff(
    event
  ) {
    event.preventDefault();
    const submit =
      $("createStaffSubmit");
    const full_name =
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
      $("newStaffRole")
        ?.value;
    const password =
      $("newStaffPassword")
        ?.value || "";
    if (!full_name) {
      showMessage(
        "❌ الاسم الكامل مطلوب.",
        "error"
      );
      return;
    }
    if (
      !/^[a-z0-9._-]{3,40}$/i.test(
        username || ""
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
      normalizeRole(role) ===
      "OWNER"
    ) {
      showMessage(
        "👑 لا يمكن إنشاء Owner من شاشة الموظفين.",
        "error"
      );
      return;
    }
    if (
      password &&
      password.length < 10
    ) {
      showMessage(
        "❌ كلمة المرور يجب أن تكون 10 أحرف على الأقل.",
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
            full_name,
            username,
            email,
            phone:
              phone || null,
            role,
            password:
              password || null
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
          `\n\n🔐 كلمة المرور المؤقتة:\n${result.temporary_password}\n\n⚠️ احفظها الآن. لن يتم عرضها مرة أخرى.`;
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
          "➕ إنشاء الحساب";
      }
    }
  }
  /* ==========================================================
     EDIT STAFF MODAL
     ========================================================== */
  function openEditStaffModal(
    staff
  ) {
    const modal =
      createModal(
        "✍️ تعديل بيانات الموظف",
        `
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
                  maxlength="200"
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
                  ${
                    normalizeRole(
                      staff.role
                    ) === "OWNER"
                      ? "disabled"
                      : ""
                  }
                >
                  ${Object.entries(
                    ROLES
                  )
                    .filter(
                      function ([key]) {
                        return (
                          key !==
                          "OWNER"
                        );
                      }
                    )
                    .map(
                      function ([key, role]) {
                        return `
                          <option
                            value="${escapeHTML(
                              key
                            )}"
                            ${
                              normalizeRole(
                                staff.role
                              ) === key
                                ? "selected"
                                : ""
                            }
                          >
                            ${role.label}
                          </option>
                        `;
                      }
                    )
                    .join("")}
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
              🔒 Username:
              <strong dir="ltr">
                ${escapeHTML(
                  staff.username ||
                  "—"
                )}
              </strong>
              <br>
              🔐 كلمة المرور لا يتم تعديلها من هنا.
              <br>
              استخدم 🔐 Reset Password لتعيين
              كلمة مرور جديدة.
              ${
                normalizeRole(
                  staff.role
                ) === "OWNER"
                  ? `
                    <br><br>
                    👑 حساب Owner محمي.
                    لا يمكن تغيير دوره أو تعطيله
                    من هذه الشاشة.
                  `
                  : ""
              }
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
                type="button"
                class="btn btn-secondary"
                data-staff-modal-close
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
        `
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
    return modal;
  }
  /* ==========================================================
     SAVE EDIT
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
      $("editStaffRole")
        ?.value ||
      normalizeRole(
        staff.role
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
          full_name,
          email,
          phone:
            phone || null,
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
        "👑 حساب Owner محمي.",
        "error"
      );
      return;
    }
    const options =
      Object.entries(ROLES)
        .filter(
          function ([key]) {
            return (
              key !==
              "OWNER"
            );
          }
        )
        .map(
          function ([key, role]) {
            return `
              <option
                value="${escapeHTML(
                  key
                )}"
                ${
                  normalizeRole(
                    staff.role
                  ) === key
                    ? "selected"
                    : ""
                }
              >
                ${role.label}
              </option>
            `;
          }
        )
        .join("");
    createModal(
      "🎯 تغيير وظيفة الموظف",
      `
        <div
          style="
            margin-bottom:15px;
            line-height:1.8;
          "
        >
          👤
          <strong>
            ${escapeHTML(
              staff.full_name ||
              "-"
            )}
          </strong>
          <br>
          الوظيفة الحالية:
          ${getRoleLabel(
            staff.role
          )}
        </div>
        <label>
          🎯 الوظيفة الجديدة
          <select
            id="changeStaffRole"
          >
            ${options}
          </select>
        </label>
        <div
          id="roleChangeDescription"
          style="
            margin-top:15px;
            padding:14px;
            border-radius:12px;
            background:#f5f7fb;
            line-height:1.8;
          "
        ></div>
        <div
          style="
            display:flex;
            justify-content:flex-end;
            gap:10px;
            margin-top:20px;
          "
        >
          <button
            type="button"
            class="btn btn-secondary"
            data-staff-modal-close
          >
            إلغاء
          </button>
          <button
            id="saveRoleChange"
            type="button"
            class="btn btn-primary"
          >
            💾 حفظ الوظيفة
          </button>
        </div>
      `
    );
    const roleSelect =
      $("changeStaffRole");
    const description =
      $("roleChangeDescription");
    function updateDescription() {
      const role =
        normalizeRole(
          roleSelect?.value
        );
      if (!description) {
        return;
      }
      description.innerHTML = `
        ${getRoleLabel(role)}
        <br>
        <span class="muted">
          ${escapeHTML(
            getRoleDescription(
              role
            )
          )}
        </span>
      `;
    }
    roleSelect?.addEventListener(
      "change",
      updateDescription
    );
    updateDescription();
    $("saveRoleChange")
      ?.addEventListener(
        "click",
        async function () {
          const role =
            normalizeRole(
              roleSelect?.value
            );
          if (!role) {
            showMessage(
              "❌ اختر الوظيفة.",
              "error"
            );
            return;
          }
          if (
            role ===
            "OWNER"
          ) {
            showMessage(
              "👑 لا يمكن نقل موظف إلى Owner من هذه الشاشة.",
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
              `❌ ${error?.message || "تعذر تحديث الوظيفة."}`,
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
     RESET PASSWORD MODAL
     ========================================================== */
  async function resetStaffPassword(
    staff
  ) {
    const confirmed =
      window.confirm(
        `🔐 هل تريد إعادة تعيين كلمة مرور ${staff.full_name || "هذا الموظف"}؟\n\nسيتم إنشاء كلمة مرور جديدة للحساب.`
      );
    if (!confirmed) {
      return;
    }
    const modal =
      createModal(
        "🔐 إعادة تعيين كلمة المرور",
        `
          <form id="resetPasswordForm">
            <div
              style="
                padding:14px;
                border-radius:12px;
                background:#f5f7fb;
                line-height:1.8;
                margin-bottom:15px;
              "
            >
              👤
              <strong>
                ${escapeHTML(
                  staff.full_name ||
                  "-"
                )}
              </strong>
              <br>
              🔑
              <span dir="ltr">
                ${escapeHTML(
                  staff.username ||
                  "-"
                )}
              </span>
              <br><br>
              اترك الحقل فارغًا ليقوم النظام
              بتوليد كلمة مرور آمنة تلقائيًا.
            </div>
            <label>
              🔐 كلمة المرور الجديدة
              <input
                id="resetStaffPasswordInput"
                type="password"
                minlength="10"
                autocomplete="new-password"
                placeholder="اتركه فارغًا للتوليد التلقائي"
                dir="ltr"
              >
            </label>
            <div
              style="
                display:flex;
                justify-content:flex-end;
                gap:10px;
                margin-top:20px;
              "
            >
              <button
                type="button"
                class="btn btn-secondary"
                data-staff-modal-close
              >
                إلغاء
              </button>
              <button
                id="resetStaffPasswordSubmit"
                type="submit"
                class="btn btn-primary"
              >
                🔐 تغيير كلمة المرور
              </button>
            </div>
          </form>
        `
      );
    $("resetPasswordForm")
      ?.addEventListener(
        "submit",
        async function (event) {
          event.preventDefault();
          const submit =
            $("resetStaffPasswordSubmit");
          const password =
            $("resetStaffPasswordInput")
              ?.value || "";
          if (
            password &&
            password.length < 10
          ) {
            showMessage(
              "❌ كلمة المرور يجب أن تكون 10 أحرف على الأقل.",
              "error"
            );
            return;
          }
          if (submit) {
            submit.disabled =
              true;
            submit.textContent =
              "⏳ جاري التغيير...";
          }
          try {
            const result =
              await callStaffAdmin(
                "reset_password",
                {
                  staff_id:
                    staff.id,
                  password:
                    password || null
                }
              );
            closeModal();
            let message =
              "✅ تم تغيير كلمة المرور بنجاح.";
            if (
              result?.temporary_password
            ) {
              message +=
                `\n\n🔐 كلمة المرور الجديدة:\n${result.temporary_password}\n\n⚠️ احفظها الآن. لن يتم عرضها مرة أخرى.`;
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
              `❌ تعذر تغيير كلمة المرور:\n${error?.message || "حدث خطأ."}`,
              "error"
            );
            if (submit) {
              submit.disabled =
                false;
              submit.textContent =
                "🔐 تغيير كلمة المرور";
            }
          }
        }
      );
    return modal;
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
        "👑 لا يمكن تعطيل حساب Owner.",
        "error"
      );
      return;
    }
    const confirmed =
      window.confirm(
        `⛔ هل أنت متأكد من تعطيل حساب ${staff.full_name || "هذا الموظف"}؟\n\nسيتم إلغاء وصول الحساب مع الاحتفاظ بسجل الموظف والعمليات السابقة.`
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
     AUTH STATE LISTENER
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
      typeof client.auth.onAuthStateChange !==
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
        state.currentSession =
          session || null;
        state.currentUser =
          session?.user ||
          null;
        if (
          event ===
            "SIGNED_IN" ||
          event ===
            "TOKEN_REFRESHED"
        ) {
          if (session) {
            setTimeout(
              function () {
                initializeStaffCenter(
                  true
                );
              },
              0
            );
          }
        }
        if (
          event ===
          "SIGNED_OUT"
        ) {
          state.currentSession =
            null;
          state.currentUser =
            null;
          state.staff = [];
          state.currentRole =
            null;
          const table =
            $("staffTableContainer");
          if (table) {
            table.innerHTML = `
              <div class="empty">
                🔐 سجل الدخول لعرض إدارة الموظفين.
              </div>
            `;
          }
          updateStaffStats();
        }
      }
    );
  }
  /* ==========================================================
     INITIALIZE STAFF CENTER
     ========================================================== */
  async function initializeStaffCenter(
    silent = false
  ) {
    try {
      await createSupabaseClient();
      const session =
        await getSession();
      if (!session) {
        if (!silent) {
          renderStaffManagement();
          const table =
            $("staffTableContainer");
          if (table) {
            table.innerHTML = `
              <div class="empty">
                🔐 إدارة الموظفين متاحة بعد تسجيل الدخول.
              </div>
            `;
          }
        }
        return false;
      }
      state.currentSession =
        session;
      state.currentUser =
        session.user || null;
      renderStaffManagement();
      /*
        The backend performs the real authorization.
      */
      let result;
      try {
        result =
          await callStaffAdmin(
            "list"
          );
      } catch (error) {
        const message =
          String(
            error?.message ||
            ""
          );
        if (
          /ليس لديك صلاحية|Unauthorized|غير نشط|غير مرتبط|إدارة الموظفين/i.test(
            message
          )
        ) {
          const table =
            $("staffTableContainer");
          if (table) {
            table.innerHTML = `
              <div
                style="
                  padding:20px;
                  border-radius:14px;
                  background:#fff0f2;
                  color:#a32939;
                  font-weight:700;
                  line-height:1.8;
                "
              >
                ⛔ ليس لديك صلاحية لإدارة الموظفين.
                <br><br>
                الصلاحيات الفعلية يتم تطبيقها
                من النظام الآمن وليس من JavaScript.
              </div>
            `;
            updateStaffStats();
          }
          return false;
        }
        throw error;
      }
      state.currentRole =
        normalizeRole(
          result?.currentRole ||
          state.currentRole
        );
      const rows =
        Array.isArray(
          result?.staff
        )
          ? result.staff
          : [];
      state.staff =
        rows.map(
          function (item) {
            const clean = {
              ...item
            };
            delete clean.password;
            delete clean.temp_password;
            delete clean.temporary_password;
            delete clean.encrypted_password;
            delete clean.password_hash;
            return clean;
          }
        );
      renderStaffTable();
      updateStaffStats();
      state.initialized =
        true;
      return true;
    } catch (error) {
      console.error(
        "Azaad Staff initialization error:",
        error
      );
      if (!silent) {
        const table =
          $("staffTableContainer");
        if (table) {
          table.innerHTML = `
            <div
              style="
                padding:20px;
                border-radius:14px;
                background:#fff0f2;
                color:#a32939;
                font-weight:700;
                line-height:1.8;
              "
            >
              ❌ تعذر تشغيل إدارة الموظفين.
              <br><br>
              ${escapeHTML(
                error?.message ||
                "حدث خطأ غير معروف."
              )}
            </div>
          `;
        }
      }
      return false;
    }
  }
  /* ==========================================================
     WAIT FOR EXISTING ADMIN PANEL
     ========================================================== */
  async function waitForStaffPanel(
    maxAttempts = 80
  ) {
    for (
      let attempt = 0;
      attempt < maxAttempts;
      attempt++
    ) {
      if (
        getStaffPanel()
      ) {
        return true;
      }
      await new Promise(
        function (resolve) {
          setTimeout(
            resolve,
            100
          );
        }
      );
    }
    return false;
  }
  /* ==========================================================
     PUBLIC API
     ========================================================== */
  window.AZAAD_STAFF = {
    init:
      initializeStaffCenter,
    load:
      loadStaff,
    refresh:
      loadStaff,
    openCreate:
      openCreateStaffModal,
    closeModal:
      closeModal,
    state
  };
  /* ==========================================================
     START
     ========================================================== */
  async function start() {
    try {
      await createSupabaseClient();
      await setupAuthListener();
      await waitForStaffPanel();
      /*
        Do not force a login.
        admin.html owns authentication.
      */
      const session =
        await getSession();
      if (session) {
        await initializeStaffCenter(
          true
        );
      } else {
        renderStaffManagement();
        const table =
          $("staffTableContainer");
        if (table) {
          table.innerHTML = `
            <div class="empty">
              🔐 سجل الدخول أولاً لعرض إدارة الموظفين.
            </div>
          `;
        }
      }
    } catch (error) {
      console.error(
        "Azaad Staff start error:",
        error
      );
    }
  }
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
  } else {
    start();
  }
})();
