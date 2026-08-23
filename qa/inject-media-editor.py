from pathlib import Path

def inject(path_name, tag):
    p=Path(path_name)
    text=p.read_text(encoding='utf-8')
    if tag not in text:
        text=text.replace('</body>', tag+'\n</body>', 1)
        p.write_text(text, encoding='utf-8')

inject('admin.html','<script src="admin-media-editor.js?v=2026.08.23.1" defer></script>')
inject('index.html','<script src="public-media-transforms.js?v=2026.08.23.1" defer></script>')
print('Media editor injection complete')
