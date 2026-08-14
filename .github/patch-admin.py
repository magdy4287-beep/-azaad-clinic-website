from pathlib import Path
import re


def patch_admin_html():
    path = Path("admin.html")
    text = path.read_text(encoding="utf-8")

    pattern = re.compile(
        r'async function restoreStaff\(\)\{.*?\n\}\n\nasync function logout\(\)',
        re.S,
    )

    replacement = '''async function restoreStaff(){

  if(!state.user?.id || !state.session?.access_token){
    return false;
  }

  const request = async () => {
    return fetch(
      `${SUPABASE_URL}/functions/v1/azaad-admin?api=account`,
      {
        method:"GET",
        headers:{
          Accept:"application/json",
          Authorization:`Bearer ${state.session.access_token}`,
          apikey:SUPABASE_PUBLISHABLE_KEY
        },
        cache:"no-store"
      }
    );
  };

  try{
    let response = await request();

    // A persisted access token can be expired while its refresh token is still valid.
    // Refresh once before declaring the admin session invalid.
    if(response.status === 401){
      try{
        const refreshed = await supabase.auth.refreshSession();
        if(refreshed?.data?.session?.access_token){
          state.session = refreshed.data.session;
          state.user = refreshed.data.session.user;
          try { sessionStorage.setItem('azaad_admin_token', refreshed.data.session.access_token); } catch (_) {}
          response = await request();
        }
      }catch(refreshError){
        console.warn("Admin auth refresh failed:", refreshError);
      }
    }

    let body = {};
    try { body = await response.json(); } catch(_) {}

    if(!response.ok || !body?.admin){
      console.warn("Admin restore failed; keeping authenticated session.", body?.error || `HTTP ${response.status}`);
      return false;
    }

    if(body.admin.active === false){
      console.warn("Admin restore rejected: staff is inactive.");
      return false;
    }

    return applyStaff(body.admin);
  }catch(error){
    console.error("Admin restore request failed:", error);
    return false;
  }
}

async function logout()'''

    patched, count = pattern.subn(replacement, text, count=1)
    if count != 1:
        raise SystemExit("Expected legacy restoreStaff block was not found")

    signed_in_pattern = re.compile(
        r'      const valid =\n        await restoreStaff\(\);\n\n      if\(\n        valid\n      \)\{\n        await load\(\);\n      \}',
    )
    patched, signed_count = signed_in_pattern.subn(
        '      // Startup restoration is owned by restore(); avoid a second concurrent restore here.',
        patched,
        count=1,
    )
    if signed_count != 1:
        raise SystemExit("Expected SIGNED_IN duplicate restore block was not found")

    patched = patched.replace(
        'patient-session-bridge-v3.js?v=4.1.0',
        'patient-session-bridge-v3.js?v=4.3.0',
    )

    path.write_text(patched, encoding="utf-8")
    print("Patched admin.html restore")


def patch_admin_js():
    path = Path("admin.js")
    text = path.read_text(encoding="utf-8")

    pattern = re.compile(
        r'async function restoreStaffProfile\(\)\s*\{.*?\n\}\n\n/\* ============================================================\n   INITIALIZE\n',
        re.S,
    )

    replacement = '''async function restoreStaffProfile() {
  if (!state.user?.id || !state.session?.access_token) {
    return false;
  }

  const request = async () => fetch(
    `${SUPABASE_URL}/functions/v1/azaad-admin?api=account`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${state.session.access_token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY
      },
      cache: "no-store"
    }
  );

  try {
    let response = await request();

    if (response.status === 401) {
      try {
        const refreshed = await supabase.auth.refreshSession();
        if (refreshed?.data?.session?.access_token) {
          state.session = refreshed.data.session;
          state.user = refreshed.data.session.user;
          response = await request();
        }
      } catch (refreshError) {
        console.warn("Admin auth refresh failed:", refreshError);
      }
    }

    let body = null;
    try {
      body = await response.json();
    } catch (_) {
      body = null;
    }

    if (!response.ok || !body?.admin) {
      console.warn(
        "Admin staff restore failed:",
        body?.error || `HTTP ${response.status}`
      );
      return false;
    }

    if (body.admin.active === false) {
      console.warn("Staff account inactive.");
      return false;
    }

    return applyStaffRole(body.admin);
  } catch (error) {
    console.error("Admin staff restore request failed:", error);
    return false;
  }
}

/* ============================================================
   INITIALIZE
'''

    patched, count = pattern.subn(replacement, text, count=1)
    if count != 1:
        raise SystemExit("Expected restoreStaffProfile block was not found in admin.js")

    path.write_text(patched, encoding="utf-8")
    print("Patched admin.js restoreStaffProfile")


def patch_startup_restore():
    path = Path("admin.html")
    text = path.read_text(encoding="utf-8")
    marker = '''window.AZAAD = {
  supabase,
  state,
  hasPermission,
  refresh:load,
  logout
};'''
    replacement = marker + '''

// One shared readiness promise prevents Patient Center from racing admin restore.
window.AZAAD_READY = (async () => {
  try {
    const restored = await restore();
    if (restored !== false && state.session?.access_token && state.staff) {
      try { sessionStorage.setItem('azaad_admin_token', state.session.access_token); } catch (_) {}
      $("loginPage")?.classList.add("hidden");
      $("adminPage")?.classList.remove("hidden");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Admin startup restore failed:", error);
    return false;
  }
})();'''
    if marker not in text:
        raise SystemExit("window.AZAAD export marker was not found")

    text = text.replace(marker, replacement, 1)
    text = text.replace(
        '''// IMPORTANT: the inline module owns startup restoration.\n// The legacy bridge script is loaded before this module and cannot safely\n// discover window.AZAAD yet, so restore() must be started explicitly here.\nvoid restore().catch(error => {\n  console.error("Admin startup restore failed:", error);\n});\n\n''',
        '',
        1,
    )
    path.write_text(text, encoding="utf-8")
    print("Patched shared admin readiness promise")


def patch_patient_center():
    path = Path("patients-center.js")
    text = path.read_text(encoding="utf-8")
    marker = '''  async function init() {\n    if (state.initialized) {'''
    replacement = '''  async function init() {\n    // Wait for the admin controller to finish restoring the persisted Supabase session.\n    // This removes the reload race where Patient Center queried before the token existed.\n    try {\n      if (window.AZAAD_READY) await window.AZAAD_READY;\n    } catch (error) {\n      console.warn('Patient Center waiting for admin restore:', error);\n    }\n\n    if (state.initialized) {'''
    if marker not in text:
        raise SystemExit("Patient Center init marker was not found")
    if 'Patient Center waiting for admin restore:' not in text:
        text = text.replace(marker, replacement, 1)
    path.write_text(text, encoding="utf-8")
    print("Patched Patient Center startup synchronization")


patch_admin_html()
patch_admin_js()
patch_startup_restore()
patch_patient_center()
