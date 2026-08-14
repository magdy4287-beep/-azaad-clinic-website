from pathlib import Path
import re

p = Path("admin.html")
s = p.read_text(encoding="utf-8")

new_restore = r'''async function restoreStaff(){

  if(!state.user?.id || !state.session?.access_token){
    return false;
  }

  try{
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/azaad-admin?api=account`,
      {
        method:"GET",
        cache:"no-store",
        headers:{
          Accept:"application/json",
          Authorization:`Bearer ${state.session.access_token}`,
          apikey:SUPABASE_PUBLISHABLE_KEY
        }
      }
    );

    let result = {};
    try{ result = await response.json(); }catch(_){ }

    if(!response.ok || !result?.admin){
      console.warn("Admin restore failed:", result?.error || `HTTP ${response.status}`);
      return false;
    }

    const staff = result.admin;
    if(!staff.active){
      console.warn("Admin restore rejected: staff is inactive.");
      return false;
    }

    return applyStaff(staff);
  }catch(error){
    console.error("Admin restore error:", error);
    return false;
  }
}'''

pattern = r'async function restoreStaff\(\)\{.*?\n\}\n\nasync function logout\(\)\{'
patched, count = re.subn(pattern, new_restore + '\n\nasync function logout(){', s, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f"restoreStaff replacement count={count}; refusing to modify admin.html")

old = '''      const valid =\n        await restoreStaff();\n\n      if(\n        valid\n      ){\n        await load();\n      }'''
new = '''      // Startup restoration is owned by restore().\n      // Do not launch a second concurrent staff restore here.'''
if old not in patched:
    raise SystemExit("SIGNED_IN block not found; refusing to modify admin.html")
patched = patched.replace(old, new, 1)

p.write_text(patched, encoding="utf-8")
print("Patched admin.html: single authenticated staff restore; no restore-triggered signOut().")
