from pathlib import Path

path = Path("admin.html")
if not path.exists():
    raise SystemExit("admin.html missing")
text = path.read_text(encoding="utf-8")
marker = "AZAAD_ADMIN_AUTH_ISOLATION_V2"
if marker in text:
    print("admin auth isolation already installed")
    raise SystemExit(0)

script = r'''<script id="AZAAD_ADMIN_AUTH_ISOLATION_V2">
/* AZAAD_ADMIN_AUTH_ISOLATION_V2
 * Single canonical auth entry point. No login UI or auth bootstrap is
 * allowed to execute inside the heavy Admin application.
 */
(function(){
  "use strict";
  function hasCanonicalSession(){
    try{
      var token=sessionStorage.getItem("azaad_admin_token");
      if(token) return true;
    }catch(_){ }
    try{
      var key="sb-derofsthjivlkcdnojww-auth-token";
      var raw=localStorage.getItem(key);
      if(!raw) return false;
      var parsed=JSON.parse(raw);
      return !!(parsed && parsed.access_token && parsed.refresh_token);
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
print("admin auth isolation v2 installed")
