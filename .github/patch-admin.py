from pathlib import Path
import re

# Idempotent build-time admin/session patch.
# Older versions failed the build when patients-center.js had already changed.
# This version keeps the admin startup fixes, but treats every patch as optional
# when the source is already modern or structurally different.


def patch_admin_html():
    path = Path("admin.html")
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")

    legacy = re.compile(r'async function restoreStaff\(\).*?\n\}\n\nasync function logout\(\)', re.S)
    modern = '''async function restoreStaff(){
  if(!state.user?.id || !state.session?.access_token) return false;
  const request = async () => fetch(`${SUPABASE_URL}/functions/v1/azaad-admin-auth`, {
    method:"GET",
    headers:{Accept:"application/json",Authorization:`Bearer ${state.session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY},
    cache:"no-store"
  });
  try{
    let response = await request();
    if(response.status === 401){
      try{
        const refreshed = await supabase.auth.refreshSession();
        if(refreshed?.data?.session?.access_token){
          state.session = refreshed.data.session;
          state.user = refreshed.data.session.user;
          response = await request();
        }
      }catch(error){ console.warn("Admin auth refresh failed:",error); }
    }
    let body={}; try{ body=await response.json(); }catch(_){ }
    if(!response.ok || !body?.admin) return false;
    if(body.admin.active === false) return false;
    return applyStaff(body.admin);
  }catch(error){ console.error("Admin restore request failed:",error); return false; }
}

async function logout()'''
    if legacy.search(text):
        text = legacy.sub(modern, text, count=1)

    duplicate = re.compile(r'\s*const valid =\s*await restoreStaff\(\);\s*if\(\s*valid\s*\)\{\s*await load\(\);\s*\}', re.S)
    text = duplicate.sub('\n      // Startup restoration is owned by restore().', text, count=1)

    text = text.replace('patient-session-bridge-v3.js?v=4.1.0','patient-session-bridge-v3.js?v=4.3.1')

    path.write_text(text, encoding="utf-8")


def patch_admin_js():
    path = Path("admin.js")
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    legacy = re.compile(r'async function restoreStaffProfile\(\)\s*\{.*?\n\}\n\n/\* ============================================================\n   INITIALIZE\n', re.S)
    modern = '''async function restoreStaffProfile() {
  if (!state.user?.id || !state.session?.access_token) return false;
  const request = async () => fetch(`${SUPABASE_URL}/functions/v1/azaad-admin-auth`, {
    method:"GET",
    headers:{Accept:"application/json",Authorization:`Bearer ${state.session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY},
    cache:"no-store"
  });
  try{
    let response = await request();
    if(response.status === 401){
      try{
        const refreshed = await supabase.auth.refreshSession();
        if(refreshed?.data?.session?.access_token){
          state.session = refreshed.data.session;
          state.user = refreshed.data.session.user;
          response = await request();
        }
      }catch(error){ console.warn("Admin auth refresh failed:",error); }
    }
    let body={}; try{ body=await response.json(); }catch(_){ }
    if(!response.ok || !body?.admin) return false;
    if(body.admin.active === false) return false;
    return applyStaffRole(body.admin);
  }catch(error){ console.error("Admin staff restore request failed:",error); return false; }
}

/* ============================================================
   INITIALIZE
'''
    if legacy.search(text):
        text = legacy.sub(modern, text, count=1)
    path.write_text(text, encoding="utf-8")


def patch_startup_restore():
    path = Path("admin.html")
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    if 'window.AZAAD_READY' in text:
        return
    marker = '''window.AZAAD = {
  supabase,
  state,
  hasPermission,
  refresh:load,
  logout
};'''
    if marker not in text:
        print("Admin readiness marker not found; leaving source unchanged")
        return
    replacement = marker + '''

window.AZAAD_READY = (async () => {
  try {
    const restored = await restore();
    if (restored !== false && state.session?.access_token && state.staff) {
      $("loginPage")?.classList.add("hidden");
      $("adminPage")?.classList.remove("hidden");
      return true;
    }
  } catch (error) {
    console.error("Admin startup restore failed:", error);
  }
  return false;
})();'''
    text = text.replace(marker,replacement,1)
    path.write_text(text, encoding="utf-8")


def patch_patient_center():
    path = Path("patients-center.js")
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    if 'Patient Center waiting for admin restore:' in text:
        return
    marker = '  async function init() {\n    if (state.initialized) {'
    if marker not in text:
        print("Patient Center init marker not found; source is already patched or structurally changed")
        return
    replacement = '''  async function init() {
    try {
      if (window.AZAAD_READY) await window.AZAAD_READY;
    } catch (error) {
      console.warn('Patient Center waiting for admin restore:', error);
    }

    if (state.initialized) {'''
    path.write_text(text.replace(marker,replacement,1),encoding="utf-8")


patch_admin_html()
patch_admin_js()
patch_startup_restore()
patch_patient_center()
print("patch-admin.py completed successfully")
