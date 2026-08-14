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

  try{
    const response = await fetch(
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

  try {
    const response = await fetch(
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


patch_admin_html()
patch_admin_js()
