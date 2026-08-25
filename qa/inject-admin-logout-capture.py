from pathlib import Path

path = Path('admin.html')
if not path.exists():
    raise SystemExit('admin.html missing')
text = path.read_text(encoding='utf-8')
marker = 'window.__AZAAD_ADMIN_LOGOUT_CAPTURE__'
if marker in text:
    print('admin logout capture already installed')
    raise SystemExit(0)

script = r'''<script>
window.__AZAAD_ADMIN_LOGOUT_CAPTURE__ = true;
document.addEventListener('click', function(event) {
  const button = event.target && event.target.closest ? event.target.closest('#logoutBtn') : null;
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (typeof window.logout === 'function') {
    Promise.resolve(window.logout()).catch(error => console.error('Admin logout capture error:', error));
  }
}, true);
</script>'''

if '</head>' not in text:
    raise SystemExit('admin.html has no </head>')
text = text.replace('</head>', script + '\n</head>', 1)
path.write_text(text, encoding='utf-8')
print('admin logout capture installed')
