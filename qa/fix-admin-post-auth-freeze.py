from pathlib import Path

path = Path('admin.js')
if not path.exists():
    raise SystemExit('admin.js not found')

js = path.read_text(encoding='utf-8')

old_state = '''  initialized: false,\n  loadingBookings: false\n};'''
new_state = '''  initialized: false,\n  loadingBookings: false,\n  initializing: false\n};'''
if old_state in js and 'initializing: false' not in js:
    js = js.replace(old_state, new_state, 1)

old_init = '''async function initializeApplication() {\n  if (\n    state.initialized\n  ) {\n    return;\n  }\n\n  if (\n    !state.session ||\n    !state.user ||\n    !state.staff ||\n    !state.currentRole\n  ) {\n    return;\n  }\n\n  state.initialized =\n    true;\n\n  const loginPage =\n    $("loginPage");\n\n  const adminPage =\n    $("adminPage");\n\n  if (loginPage) {\n    loginPage.classList.add(\n      "hidden"\n    );\n  }\n\n  if (adminPage) {\n    adminPage.classList.remove(\n      "hidden"\n    );\n  }\n\n  updateUserIdentity();\n\n  await loadBookings();\n\n  bindTabs();\n\n  bindBookingFilters();\n\n  bindLogout();\n\n  bindPatientPage();\n\n  buildCommandCenter();\n\n  if (\n    window.AZAAD_STAFF &&\n    typeof window.AZAAD_STAFF.init ===\n      "function"\n  ) {\n    try {\n      await window.AZAAD_STAFF.init();\n    } catch (error) {\n      console.error(\n        "Staff management init error:",\n        error\n      );\n    }\n  }\n\n  showToast(\n    `🟢 تم تسجيل الدخول بنجاح — ${state.currentRole}`,\n    "success"\n  );\n}'''
new_init = '''async function initializeApplication() {\n  if (state.initialized || state.initializing) {\n    return;\n  }\n\n  if (!state.session || !state.user || !state.staff || !state.currentRole) {\n    return;\n  }\n\n  state.initializing = true;\n\n  const loginPage = $("loginPage");\n  const adminPage = $("adminPage");\n\n  if (loginPage) loginPage.classList.add("hidden");\n  if (adminPage) adminPage.classList.remove("hidden");\n\n  updateUserIdentity();\n  bindTabs();\n  bindBookingFilters();\n  bindLogout();\n  bindPatientPage();\n  buildCommandCenter();\n\n  state.initialized = true;\n  state.initializing = false;\n\n  void loadBookings().catch(error =>\n    console.error("Background booking load error:", error)\n  );\n\n  if (window.AZAAD_STAFF && typeof window.AZAAD_STAFF.init === "function") {\n    Promise.resolve()\n      .then(() => window.AZAAD_STAFF.init())\n      .catch(error => console.error("Staff management init error:", error));\n  }\n\n  showToast(`🟢 تم تسجيل الدخول بنجاح — ${state.currentRole}`, "success");\n\n  if (typeof loadAfterAuthRuntimes === "function") {\n    window.setTimeout(() => {\n      Promise.resolve()\n        .then(() => loadAfterAuthRuntimes())\n        .catch(error => console.error("Post-auth Admin runtime load error:", error));\n    }, 1500);\n  }\n}'''
if old_init in js:
    js = js.replace(old_init, new_init, 1)
elif 'state.initializing = true;' not in js:
    raise SystemExit('initializeApplication contract not found')

old_safe = '''async function safeQuery(\n  query\n) {\n  try {\n    return await query;\n  } catch (error) {\n    console.error(\n      "Supabase query error:",\n      error\n    );\n\n    return {\n      data: null,\n      error\n    };\n  }\n}'''
new_safe = '''async function safeQuery(\n  query,\n  timeoutMs = 8000\n) {\n  try {\n    return await Promise.race([\n      query,\n      new Promise(resolve => setTimeout(() => resolve({ data: null, error: new Error("REQUEST_TIMEOUT") }), timeoutMs))\n    ]);\n  } catch (error) {\n    console.error("Supabase query error:", error);\n    return { data: null, error };\n  }\n}'''
if old_safe in js:
    js = js.replace(old_safe, new_safe, 1)

old_logout = '''async function logout() {\n  try {\n    await supabase.auth.signOut();\n  } catch (error) {\n    console.error(\n      "Logout error:",\n      error\n    );\n  }\n\n  state.session = null;\n  state.user = null;\n  state.staff = null;\n  state.currentRole = null;\n  state.permissions = new Set();\n  state.initialized = false;\n\n  window.location.reload();\n}'''
new_logout = '''async function logout() {\n  let signOutError = null;\n\n  try {\n    const result = await Promise.race([\n      supabase.auth.signOut(),\n      new Promise(resolve => setTimeout(() => resolve({ error: new Error("LOGOUT_TIMEOUT") }), 2500))\n    ]);\n    signOutError = result?.error || null;\n  } catch (error) {\n    signOutError = error;\n  }\n\n  if (signOutError) {\n    console.error("Logout error:", signOutError);\n    showToast("تعذر تسجيل الخروج. يرجى المحاولة مرة أخرى.", "error");\n    return;\n  }\n\n  state.session = null;\n  state.user = null;\n  state.staff = null;\n  state.currentRole = null;\n  state.permissions = new Set();\n  state.initialized = false;\n  state.initializing = false;\n\n  const loginPage = $("loginPage");\n  const adminPage = $("adminPage");\n\n  if (adminPage) adminPage.classList.add("hidden");\n  if (loginPage) {\n    loginPage.classList.remove("hidden");\n    loginPage.removeAttribute("aria-hidden");\n  }\n\n  const form = $("loginForm");\n  if (form) {\n    form.reset();\n    form.querySelector("input")?.focus({ preventScroll: true });\n  }\n\n  showToast("تم تسجيل الخروج بنجاح.", "success");\n}'''
if old_logout in js:
    js = js.replace(old_logout, new_logout, 1)
else:
    raise SystemExit('logout contract not found')

path.write_text(js, encoding='utf-8')
print('[AZAAD] post-auth Admin freeze/logout hardening applied')