from pathlib import Path

path = Path('admin.js')
if not path.exists():
    raise SystemExit('admin.js not found')

js = path.read_text(encoding='utf-8')

# Prevent duplicate initialization races caused by setSession() firing SIGNED_IN
# while the explicit login() path is still continuing.
old_state = '''  initialized: false,
  loadingBookings: false
};'''
new_state = '''  initialized: false,
  loadingBookings: false,
  initializing: false
};'''
if old_state in js and 'initializing: false' not in js:
    js = js.replace(old_state, new_state, 1)

old_init = '''async function initializeApplication() {
  if (
    state.initialized
  ) {
    return;
  }

  if (
    !state.session ||
    !state.user ||
    !state.staff ||
    !state.currentRole
  ) {
    return;
  }

  state.initialized =
    true;

  const loginPage =
    $("loginPage");

  const adminPage =
    $("adminPage");

  if (loginPage) {
    loginPage.classList.add(
      "hidden"
    );
  }

  if (adminPage) {
    adminPage.classList.remove(
      "hidden"
    );
  }

  updateUserIdentity();

  await loadBookings();

  bindTabs();

  bindBookingFilters();

  bindLogout();

  bindPatientPage();

  buildCommandCenter();

  if (
    window.AZAAD_STAFF &&
    typeof window.AZAAD_STAFF.init ===
      "function"
  ) {
    try {
      await window.AZAAD_STAFF.init();
    } catch (error) {
      console.error(
        "Staff management init error:",
        error
      );
    }
  }

  showToast(
    `🟢 تم تسجيل الدخول بنجاح — ${state.currentRole}`,
    "success"
  );
}'''
new_init = '''async function initializeApplication() {
  if (state.initialized || state.initializing) {
    return;
  }

  if (
    !state.session ||
    !state.user ||
    !state.staff ||
    !state.currentRole
  ) {
    return;
  }

  state.initializing = true;

  const loginPage = $("loginPage");
  const adminPage = $("adminPage");

  if (loginPage) loginPage.classList.add("hidden");
  if (adminPage) adminPage.classList.remove("hidden");

  // Critical UI bindings happen before any network or optional feature work.
  updateUserIdentity();
  bindTabs();
  bindBookingFilters();
  bindLogout();
  bindPatientPage();
  buildCommandCenter();

  // The shell is now interactive. Nothing below is allowed to block Login/Logout.
  state.initialized = true;
  state.initializing = false;

  void loadBookings().catch(error =>
    console.error("Background booking load error:", error)
  );

  if (
    window.AZAAD_STAFF &&
    typeof window.AZAAD_STAFF.init === "function"
  ) {
    Promise.resolve()
      .then(() => window.AZAAD_STAFF.init())
      .catch(error =>
        console.error("Staff management init error:", error)
      );
  }

  showToast(
    `🟢 تم تسجيل الدخول بنجاح — ${state.currentRole}`,
    "success"
  );

  // Optional post-auth runtimes are explicitly outside the critical path.
  // Delay their start so the browser can paint and accept interaction first.
  if (typeof loadAfterAuthRuntimes === "function") {
    window.setTimeout(() => {
      Promise.resolve()
        .then(() => loadAfterAuthRuntimes())
        .catch(error =>
          console.error("Post-auth Admin runtime load error:", error)
        );
    }, 1500);
  }
}'''
if old_init in js:
    js = js.replace(old_init, new_init, 1)
elif 'state.initializing = true;' not in js:
    raise SystemExit('initializeApplication contract not found')

old_safe = '''async function safeQuery(
  query
) {
  try {
    return await query;
  } catch (error) {
    console.error(
      "Supabase query error:",
      error
    );

    return {
      data: null,
      error
    };
  }
}'''
new_safe = '''async function safeQuery(
  query,
  timeoutMs = 8000
) {
  try {
    return await Promise.race([
      query,
      new Promise(resolve =>
        setTimeout(
          () =>
            resolve({
              data: null,
              error: new Error("REQUEST_TIMEOUT")
            }),
          timeoutMs
        )
      )
    ]);
  } catch (error) {
    console.error(
      "Supabase query error:",
      error
    );

    return {
      data: null,
      error
    };
  }
}'''
if old_safe in js:
    js = js.replace(old_safe, new_safe, 1)

old_logout = '''async function logout() {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error(
      "Logout error:",
      error
    );
  }

  state.session = null;
  state.user = null;
  state.staff = null;
  state.currentRole = null;
  state.permissions = new Set();
  state.initialized = false;

  window.location.reload();
}'''
new_logout = '''async function logout() {
  state.initialized = false;
  state.initializing = false;
  state.session = null;
  state.user = null;
  state.staff = null;
  state.currentRole = null;
  state.permissions = new Set();

  try {
    await Promise.race([
      supabase.auth.signOut(),
      new Promise(resolve => setTimeout(resolve, 2500))
    ]);
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    window.location.replace("/admin.html");
  }
}'''
if old_logout in js:
    js = js.replace(old_logout, new_logout, 1)

path.write_text(js, encoding='utf-8')
print('[AZAAD] post-auth Admin freeze hardening applied')