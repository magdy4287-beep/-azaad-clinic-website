/* AZAAD Admin Login Controller
 * Canonical submit adapter for the production admin login form.
 * Authentication remains real: staff-login -> Supabase setSession.
 */
(function installAzaadAdminLoginController(){
  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const STAFF_LOGIN_FUNCTION = `${SUPABASE_URL}/functions/v1/staff-login`;
  let disposed = false;
  let installed = false;
  let supabase = null;

  const supabaseReady = import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) => {
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    window.AZAAD = window.AZAAD || {};
    window.AZAAD.supabase = supabase;
    return supabase;
  });

  function prepareForm(){
    if (disposed) return false;
    const form = document.getElementById('loginForm');
    if (!form || !supabase) return false;
    form.noValidate = true;
    if (!window.AZAAD_LOGIN_CONTROLLER_READY) {
      window.AZAAD_LOGIN_CONTROLLER_READY = true;
      window.dispatchEvent(new CustomEvent('azaad:login-controller-ready'));
    }
    return true;
  }

  async function authenticate(event){
    if (disposed) return;
    const form = event?.target;
    if (!form || form.id !== 'loginForm') return;

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
      await supabaseReady;
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

      const { error } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token
      });
      if (error) throw error;

      // Keep the legacy admin-session contract used by the authenticated shell
      // and downstream frontdesk bridges. Never expose the refresh token here.
      try {
        sessionStorage.setItem('azaad_admin_token', result.session.access_token);
      } catch (_) {}

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

  function install(){
    if (disposed || installed) return;
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.noValidate = true;
    window.addEventListener('submit', authenticate, true);
    installed = true;
    prepareForm();
  }

  supabaseReady.then(() => {
    if (disposed) return;
    prepareForm();
    install();
  }).catch(error => console.error('Azaad Supabase client initialization failed', error));

  install();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });

  const observer = new MutationObserver(() => {
    prepareForm();
    if (!installed) install();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('pagehide', () => {
    disposed = true;
    window.removeEventListener('submit', authenticate, true);
    observer.disconnect();
  }, { once: true });
})();
