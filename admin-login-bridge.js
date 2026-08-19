/* AZAAD Admin Login Bridge
 * Canonical browser boundary for username/password -> staff-login -> Supabase Auth session.
 * This is intentionally a thin bridge: it never accepts or fabricates an access token.
 */
(() => {
  const SUPABASE_URL = "https://derofsthjivlkcdnojww.supabase.co";
  const STAFF_LOGIN_FUNCTION = `${SUPABASE_URL}/functions/v1/staff-login`;
  const PUBLISHABLE_KEY = "sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa";
  let installed = false;

  function findForm() {
    return document.getElementById("loginForm") || document.querySelector("form[action*='login'], form");
  }
  function findField(form, names, ids) {
    for (const name of names) {
      const el = form.querySelector(`[name="${name}"]`);
      if (el) return el;
    }
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }
  function setError(message) {
    const el = document.getElementById("loginError");
    if (el) {
      el.textContent = message;
      el.classList.remove("hidden");
    }
  }

  async function submit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const form = event.currentTarget;
    const username = String(findField(form, ["username", "user"], ["username", "loginUsername"])?.value || "").trim();
    const password = String(findField(form, ["password", "pass"], ["password", "loginPassword"])?.value || "");
    if (!username || !password) {
      setError("اسم المستخدم وكلمة المرور مطلوبان.");
      return;
    }
    const button = form.querySelector("button[type='submit'], input[type='submit']");
    if (button) button.disabled = true;
    try {
      const response = await fetch(STAFF_LOGIN_FUNCTION, {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          apikey: PUBLISHABLE_KEY
        },
        body: JSON.stringify({ username, password })
      });
      let body = {};
      try { body = await response.json(); } catch (_) {}
      if (!response.ok || !body?.session?.access_token || !body?.session?.refresh_token) {
        throw new Error(body?.error || `HTTP ${response.status}`);
      }
      const client = window.AZAAD?.supabase;
      if (!client?.auth?.setSession) throw new Error("Admin authentication client is unavailable.");
      const { error } = await client.auth.setSession({
        access_token: body.session.access_token,
        refresh_token: body.session.refresh_token
      });
      if (error) throw error;
      try { sessionStorage.setItem("azaad_admin_token", body.session.access_token); } catch (_) {}
      window.location.reload();
    } catch (error) {
      console.error("AZAAD staff login failed:", error);
      setError(error?.message || "تعذر تسجيل الدخول. حاول مرة أخرى.");
      if (button) button.disabled = false;
    }
  }

  function install() {
    if (installed) return true;
    const form = findForm();
    if (!form) return false;
    installed = true;
    form.addEventListener("submit", submit, true);
    return true;
  }

  const timer = setInterval(() => {
    if (install()) clearInterval(timer);
  }, 50);
  if (document.readyState !== "loading") install();
  else document.addEventListener("DOMContentLoaded", install, { once: true });
  setTimeout(() => clearInterval(timer), 10000);
})();
