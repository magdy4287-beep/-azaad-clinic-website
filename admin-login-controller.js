/* AZAAD Admin Login Controller
 * Canonical production-parity staff-login binding.
 * Uses only the public Supabase publishable key; no credentials are stored here.
 */
(function installAzaadAdminLoginController(){
  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const FORM_ID = 'loginForm';
  let busy = false;

  async function submitLogin(event){
    if (busy) return;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }

    const form = document.getElementById(FORM_ID);
    if (!form) return;

    const username = String(document.getElementById('username')?.value || '').trim().toLowerCase();
    const password = String(document.getElementById('password')?.value || '');
    const errorBox = document.getElementById('loginError');
    const button = document.getElementById(FORM_ID)?.querySelector('button[type="submit"]');

    const showError = message => {
      if (errorBox) {
        errorBox.textContent = message;
        errorBox.classList.remove('hidden');
      }
    };

    if (!username || !password) {
      showError('يرجى إدخال Username وكلمة المرور.');
      return;
    }
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
      showError('Username يجب أن يحتوي على أحرف إنجليزية صغيرة أو أرقام أو . _ - فقط.');
      return;
    }

    busy = true;
    window.AZAAD_LOGIN_LAST_ATTEMPT = 'staff-login-request';
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.classList.add('hidden');
    }
    if (button) {
      button.disabled = true;
      button.dataset.azaadLoginOriginalText = button.textContent || 'تسجيل الدخول';
      button.textContent = '⏳ جاري تسجيل الدخول...';
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/staff-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
        body: JSON.stringify({ username, password })
      });
      window.AZAAD_LOGIN_LAST_STATUS = response.status;
      let body = {};
      try { body = await response.json(); } catch (_) {}
      if (!response.ok) throw new Error(body?.error || body?.message || 'بيانات الدخول غير صحيحة.');

      const session = body?.session;
      if (!session?.access_token || !session?.refresh_token) {
        throw new Error('تعذر إنشاء جلسة الدخول.');
      }

      const client = window.AZAAD?.supabase;
      if (!client?.auth?.setSession) throw new Error('Admin authentication client is not ready.');
      const result = await client.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });
      if (result.error) throw result.error;

      try { sessionStorage.setItem('azaad_admin_token', session.access_token); } catch (_) {}
      window.AZAAD_LOGIN_LAST_ATTEMPT = 'authenticated';
      window.dispatchEvent(new CustomEvent('azaad-auth-ready'));
    } catch (error) {
      console.error('Admin login controller error:', error);
      window.AZAAD_LOGIN_LAST_ATTEMPT = 'error';
      showError(error?.message || 'بيانات الدخول غير صحيحة أو لا يوجد حساب فعال.');
      if (button) {
        button.disabled = false;
        button.textContent = button.dataset.azaadLoginOriginalText || 'تسجيل الدخول';
      }
      busy = false;
    } finally {
      const passwordInput = document.getElementById('password');
      if (passwordInput) passwordInput.value = '';
    }
  }

  function bind(){
    const form = document.getElementById(FORM_ID);
    if (!form || form.dataset.azaadLoginControllerBound === 'true') return;
    const button = form.querySelector('button[type="submit"]');
    form.dataset.azaadLoginControllerBound = 'true';

    // Intercept the user's click as well as submit. This prevents a native
    // browser form navigation from winning a race with another submit handler.
    // Authentication still goes exclusively through the real staff-login function.
    if (button) button.addEventListener('click', submitLogin, true);
    form.onsubmit = submitLogin;
    form.addEventListener('submit', submitLogin, true);

    window.AZAAD_LOGIN_CONTROLLER_READY = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }

  // Defensive late binding for injected/re-rendered login forms.
  const observer = new MutationObserver(bind);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
