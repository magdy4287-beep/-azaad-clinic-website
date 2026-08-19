/* AZAAD Admin Login Controller
 * Canonical readiness/submit adapter for the production admin login form.
 * Authentication remains real and is owned by the canonical admin.html login()
 * implementation, which calls staff-login and Supabase Auth setSession.
 */
(function installAzaadAdminLoginController(){
  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const STAFF_LOGIN_FUNCTION = `${SUPABASE_URL}/functions/v1/staff-login`;
  let disposed = false;
  let ready = false;

  function prepareForm(){
    const form = document.getElementById('loginForm');
    if (!form) return false;
    form.noValidate = true;
    if (!ready) {
      ready = true;
      window.AZAAD_LOGIN_CONTROLLER_READY = true;
      window.dispatchEvent(new CustomEvent('azaad:login-controller-ready'));
    }
    return true;
  }

  async function canonicalLoginFallback(event){
    const form = event.target;
    const username = String(form.querySelector('#username')?.value || '').trim().toLowerCase();
    const password = String(form.querySelector('#password')?.value || '');
    if (!username || !password) throw new Error('اسم المستخدم وكلمة المرور مطلوبان.');

    const response = await fetch(STAFF_LOGIN_FUNCTION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ username, password })
    });
    let body = {};
    try { body = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(body?.error || body?.message || `HTTP ${response.status}`);
    if (!body?.session?.access_token || !body?.session?.refresh_token) {
      throw new Error('تعذر إنشاء جلسة تسجيل الدخول.');
    }
    if (!body?.staff || body.staff.active === false) {
      throw new Error('حساب الموظف غير فعال أو غير مكتمل.');
    }
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { error } = await supabase.auth.setSession({
      access_token: body.session.access_token,
      refresh_token: body.session.refresh_token
    });
    if (error) throw error;
    window.location.reload();
  }

  async function submit(event){
    const form = event.target;
    if (!form || form.id !== 'loginForm' || disposed) return;

    // The existing admin.html login() is the canonical production auth owner.
    // Stop the second listener from running twice, then invoke that exact flow.
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

    try {
      if (typeof window.login === 'function') {
        await window.login(event);
      } else {
        await canonicalLoginFallback(event);
      }
    } catch (error) {
      console.error('Azaad canonical login adapter failed', error);
      const target = document.getElementById('loginError');
      if (target) {
        target.textContent = error?.message || 'تعذر تسجيل الدخول.';
        target.classList.remove('hidden');
      }
    }
  }

  prepareForm();
  window.addEventListener('submit', submit, true);

  const observer = new MutationObserver(prepareForm);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prepareForm, { once: true });
  }

  window.addEventListener('pagehide', () => {
    disposed = true;
    window.removeEventListener('submit', submit, true);
    observer.disconnect();
  }, { once: true });
})();