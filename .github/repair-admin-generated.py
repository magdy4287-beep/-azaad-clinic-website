from pathlib import Path
import re

path = Path('admin.js')
if not path.exists():
    raise SystemExit('admin.js not found')
text = path.read_text(encoding='utf-8')
# patch-admin.py was incorrectly appending finance.view to SECRETARY without
# comma-separating the preceding followups.view entry. Repair only that
# generated artifact defect; SECRETARY must not gain finance permission.
pattern = r'(SECRETARY\s*:\s*\[.*?)(\s+"followups\.view")\s+("finance\.view",\s*)'
text, count = re.subn(pattern, r'\1\2,', text, count=1, flags=re.S)
# Also remove a standalone finance.view immediately inside SECRETARY if the
# malformed generator has already emitted it in a comma-safe form.
text = re.sub(r'(SECRETARY\s*:\s*\[.*?)(\s+"finance\.view",)(.*?\])', r'\1\3', text, count=1, flags=re.S)
path.write_text(text, encoding='utf-8')
print(f'Admin generated-artifact repair complete; repaired={count > 0}')
