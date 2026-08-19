/* AZAAD Admin Login Controller
 * Canonical production-parity staff-login binding.
 * Uses only the public Supabase publishable key; no credentials are stored here.
 */
(function installAzaadAdminLoginController(){
  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const FORM_ID = 'loginForm';

  function bind(){
    const form = document.getElementById(FORM_ID);
    if (!form || form.dataset.azaadLoginControllerBound === 'true') return;
    form.dataset.azaadLoginControllerBound = 'true';

    form.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const username = String(document.getElementById('username')?.value || '').trim().toLowerCase();
      const password = String(document.getElementById('password')?.value || '');
      const errorBox = document.getElementById('loginError');
      const button = event.submitter || form.querySelector('button[type="submit"]');

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
        window.dispatchEvent(new CustomEvent('azaad-auth-ready'));
      } catch (error) {
        console.error('Admin login controller error:', error);
        showError(error?.message || 'بيانات الدخول غير صحيحة أو لا يوجد حساب فعال.');
        if (button) {
          button.disabled = false;
          button.textContent = button.dataset.azaadLoginOriginalText || 'تسجيل الدخول';
        }
      } finally {
        const passwordInput = document.getElementById('password');
        if (passwordInput) passwordInput.value = '';
      }
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
