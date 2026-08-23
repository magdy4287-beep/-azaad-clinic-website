# Production-critical admin recovery injector.
from pathlib import Path

path = Path("admin.html")
if not path.exists():
    raise SystemExit("admin.html missing")
text = path.read_text(encoding="utf-8")
marker = "window.__AZAAD_EARLY_ADMIN_RECOVERY__"
if marker in text:
    print("early admin recovery already installed")
    raise SystemExit(0)

script = r'''<script>
window.__AZAAD_EARLY_ADMIN_RECOVERY__=true;
(function(){
  "use strict";
  function showPanel(name,button){
    if(!name)return;
    document.querySelectorAll(".tab[data-panel]").forEach(function(x){x.classList.toggle("active",x===button);});
    document.querySelectorAll(".panel").forEach(function(x){x.classList.toggle("active",x.id===name);});
  }
  function logout(){
    try{sessionStorage.removeItem("azaad_admin_token");}catch(_){}
    try{localStorage.removeItem("azaad-clinic-admin-auth");}catch(_){}
    try{localStorage.removeItem("sb-azaad-clinic-admin-auth-token");}catch(_){}
    var login=document.getElementById("loginPage"),admin=document.getElementById("adminPage");
    if(login)login.classList.remove("hidden");
    if(admin)admin.classList.add("hidden");
  }
  document.addEventListener("click",function(event){
    var node=event.target&&event.target.closest?event.target.closest("button,a,[data-panel]"):null;
    if(!node)return;
    if(node.id==="logoutBtn"){event.preventDefault();event.stopImmediatePropagation();logout();return;}
    if(node.id==="refreshBtn"||node.id==="refreshBookings"){event.preventDefault();event.stopImmediatePropagation();window.location.reload();return;}
    if(node.id==="siteBtn"){event.preventDefault();event.stopImmediatePropagation();window.open(node.dataset.url||window.location.origin+"/","_blank","noopener,noreferrer");return;}
    var panel=node.getAttribute("data-panel");
    if(panel)showPanel(panel,node);
  },true);
})();
</script>'''

if "</head>" not in text:
    raise SystemExit("admin.html has no </head>")
text = text.replace("</head>", script + "\n</head>", 1)
path.write_text(text, encoding="utf-8")
print("early admin recovery installed")
