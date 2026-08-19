/* AZAAD Admin Login Controller
 * Canonical submit adapter for the production admin login form.
 * Authentication remains real: it calls the deployed staff-login Edge Function
 * and then Supabase Auth setSession. No token, response, or credential is mocked.
 */
(function installAzaadAdminLoginController(){
  const SUPABASE_URL = 'https://derofsthjivlkcdnojww.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';
  const STAFF_LOGIN_FUNCTION = `${SUPABASE_URL}/functions/v1/staff-login`;
  let disposed = false;
  let ready = false;

  function markReady(){
    if (disposed || ready) return;
    if (!document.getElementById('loginForm')) return;
    ready = true;
    window.AZAAD_LOGIN_CONTROLLER_READY = true;
    window.dispatchEvent(new CustomEvent('azaad:login-controller-ready'));
  }

  async function getSupabase(){
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  function showError(message){
    const target = document.getElementById('loginError');
    if (!target) return;
    target.textContent = message || 'بيانات الدخول غير صحيحة.';
    target.classList.remove('hidden');
  }

  function clearError(){
    const target = document.getElementById('loginError');
    if (target) {
      target.textContent = '';
      target.classList.add('hidden');
    }
  }

  async function submit(event){
    const form = event.target;
    // Do not use instanceof here: the only production contract we need is the
    // real DOM target and its stable id. This also remains valid across iframe,
    // adopted-node, and generated-document realms.
    if (!form || form.id !== 'loginForm') return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    clearError();

    const username = String(form.querySelector('#username')?.value || '').trim().toLowerCase();
    const password = String(form.querySelector('#password')?.value || '');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!username || !password) {
      showError('اسم المستخدم وكلمة المرور مطلوبان.');
      return;
    }

    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(STAFF_LOGIN_FUNCTION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ username, password })
      });

      let body = {};
      try { body = await response.json(); } catch (_) {}
      if (!response.ok) throw new Error(body?.error || body?.message || `HTTP ${response.status}`);

      const session = body?.session;
      if (!session?.access_token || !session?.refresh_token) throw new Error('تعذر إنشاء جلسة تسجيل الدخول.');
      if (!body?.staff || body.staff.active === false) throw new Error('حساب الموظف غير فعال أو غير مكتمل.');

      const supabase = await getSupabase();
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });
      if (error) throw error;

      const loginPage = document.getElementById('loginPage');
      const adminPage = document.getElementById('adminPage');
      if (loginPage) loginPage.classList.add('hidden');
      if (adminPage) adminPage.classList.remove('hidden');
      try { sessionStorage.setItem('azaad_admin_token', session.access_token); } catch (_) {}
      window.dispatchEvent(new CustomEvent('azaad:authenticated', { detail: { staff: body.staff, user: body.user || null } }));
      window.location.reload();
    } catch (error) {
      console.error('Azaad admin login failed', error);
      showError(error instanceof Error ? error.message : 'تعذر تسجيل الدخول. حاول مرة أخرى.');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  }

  // The generated form has required fields. Disable native validation so the
  // canonical controller owns validation and requestSubmit always dispatches
  // the real submit event that reaches this capture listener.
  const form = document.getElementById('loginForm');
  if (form) form.noValidate = true;

  // Bind at window capture level so the canonical handler survives any
  // replacement of #loginForm by other initialization code. This is one
  // listener only; it delegates solely to the canonical login form.
  window.addEventListener('submit', submit, true);
  markReady();

  if (!ready) {
    const observer = new MutationObserver(() => {
      const currentForm = document.getElementById('loginForm');
      if (currentForm) currentForm.noValidate = true;
      markReady();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', () => {
      const currentForm = document.getElementById('loginForm');
      if (currentForm) currentForm.noValidate = true;
      markReady();
      observer.disconnect();
    }, { once: true });
  }

  window.addEventListener('pagehide', () => {
    disposed = true;
    window.removeEventListener('submit', submit, true);
  }, { once: true });
})();
