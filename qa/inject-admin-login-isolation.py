from pathlib import Path

path = Path("admin.html")
if not path.exists():
    raise SystemExit("admin.html missing")
text = path.read_text(encoding="utf-8")
marker = "AZAAD_ADMIN_AUTH_ISOLATION_V3"
if marker in text:
    print("admin auth isolation already installed")
    raise SystemExit(0)

script = r'''<script id="AZAAD_ADMIN_AUTH_ISOLATION_V3">
/* AZAAD_ADMIN_AUTH_ISOLATION_V3
 * One canonical authentication entry point. The heavy Admin application
 * never owns a second login surface. Session detection uses the same
 * Supabase storage contract as admin.html itself.
 */
(function(){
  "use strict";
  const STORAGE_KEY = "azaad-clinic-admin-auth";
  function hasCanonicalSession(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw) return false;
      const parsed=JSON.parse(raw);
      const accessToken=parsed?.access_token || parsed?.currentSession?.access_token;
      const refreshToken=parsed?.refresh_token || parsed?.currentSession?.refresh_token;
      return !!(accessToken && refreshToken);
    }catch(_){ return false; }
  }
  if(!hasCanonicalSession() && location.pathname !== "/admin-auth.html"){
    location.replace("/admin-auth.html");
  }
})();
</script>'''

if "</head>" not in text:
    raise SystemExit("admin.html has no </head>")
text = text.replace("</head>", script + "\n</head>", 1)
path.write_text(text, encoding="utf-8")
print("admin auth isolation v3 installed")
