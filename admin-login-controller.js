/* AZAAD Admin Login Controller
 * Canonical submit adapter for the production admin login form.
 * The form is wired here because admin.js is an ES module and its login()
 * function is module-scoped; no window.login contract exists.
 * Authentication remains real: staff-login -> Supabase setSession.
 */
(function installAzaadAdminLoginController(){
  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const STAFF_LOGIN_FUNCTION = `${SUPABASE_URL}/functions/v1/staff-login`;
  let disposed = false;
  let bound = false;

  function prepareForm(){
    if (disposed) return false;
    const form = document.getElementById('loginForm');
    if (!form) return false;
    form.noValidate = true;
    if (!window.AZAAD_LOGIN_CONTROLLER_READY) {
      window.AZAAD_LOGIN_CONTROLLER_READY = true;
      window.dispatchEvent(new CustomEvent('azaad:login-controller-ready'));
    }
    return true;
  }

  async function authenticate(event){
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== 'loginForm' || disposed) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

    const username = String(form.querySelector('#username')?.value || '').trim().toLowerCase();
    const password = String(form.querySelector('#password')?.value || '');
    const errorBox = document.getElementById('loginError');
    const button = form.querySelector('button[type="submit"]');

    if (errorBox) {
      errorBox.textContent = '';
      errorBox.classList.add('hidden');
    }
    if (!username || !password) {
      if (errorBox) {
        errorBox.textContent = !username ? 'اسم المستخدم مطلوب.' : 'كلمة المرور مطلوبة.';
        errorBox.classList.remove('hidden');
      }
      return;
    }
    if (button) button.disabled = true;

    try {
      const response = await fetch(STAFF_LOGIN_FUNCTION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({ username, password })
      });

      let result = {};
      try { result = await response.json(); } catch (_) {}
      if (!response.ok) throw new Error(result?.error || result?.message || `HTTP ${response.status}`);
      if (!result?.session?.access_token || !result?.session?.refresh_token) {
        throw new Error('تعذر إنشاء جلسة تسجيل الدخول.');
      }
      if (!result?.staff || result.staff.active === false) {
        throw new Error('حساب الموظف غير فعال أو غير مكتمل.');
      }

      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      const { error } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token
      });
      if (error) throw error;

      const loginPage = document.getElementById('loginPage');
      const adminPage = document.getElementById('adminPage');
      if (loginPage) loginPage.classList.add('hidden');
      if (adminPage) adminPage.classList.remove('hidden');
      window.dispatchEvent(new CustomEvent('azaad:authenticated', { detail: { staff: result.staff, user: result.user || null } }));
      window.location.reload();
    } catch (error) {
      console.error('Azaad admin login failed', error);
      if (errorBox) {
        errorBox.textContent = error?.message || 'تعذر تسجيل الدخول. حاول مرة أخرى.';
        errorBox.classList.remove('hidden');
      }
    } finally {
      if (button) button.disabled = false;
    }
  }

  function bind(){
    if (disposed || bound) return;
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.noValidate = true;
    window.addEventListener('submit', authenticate, true);
    bound = true;
    prepareForm();
  }

  // Bind against the initial DOM and also recover if a renderer replaces the form.
  bind();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  const observer = new MutationObserver(() => {
    const form = document.getElementById('loginForm');
    if (form) {
      form.noValidate = true;
      prepareForm();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('pagehide', () => {
    disposed = true;
    window.removeEventListener('submit', authenticate, true);
    observer.disconnect();
  }, { once: true });
})();