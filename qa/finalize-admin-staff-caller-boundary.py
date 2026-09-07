from pathlib import Path
import re

PATH = Path('admin.js')
if not PATH.is_file():
    raise SystemExit('admin.js is required')

text = PATH.read_text(encoding='utf-8')

# Staff Management is panel-activated and independently role-gated by the
# canonical staff-management.js runtime. It must never be initialized from
# the Admin authentication critical path, because that path executes for every
# authenticated role, including SECRETARY/RECEPTION/CASHIER/MARKETING.
pattern = re.compile(
    r'\n\s*if\s*\(\s*\[[^\]]*["\']OWNER["\'][^\]]*["\']MANAGER["\'][^\]]*\]\.includes\(String\(state\.currentRole.*?\n\s*\}\s*\n',
    re.S,
)

updated, removed = pattern.subn('\n', text, count=1)

# Be exact about the canonicalized forms emitted by the Appwrite session
# transform; fail closed rather than silently leaving a privileged caller.
legacy_init = re.compile(
    r'\n\s*if\s*\(\s*window\.AZAAD_STAFF\s*&&\s*typeof\s+window\.AZAAD_STAFF\.init\s*===\s*["\']function["\']\s*\)\s*\{.*?\n\s*\}\s*\n',
    re.S,
)
updated, legacy_removed = legacy_init.subn('\n', updated, count=1)

if removed == 0 and legacy_removed == 0:
    # Idempotent success is allowed only if the executable caller is already absent.
    executable = re.sub(r'/\*.*?\*/', '', updated, flags=re.S)
    if re.search(r'window\.AZAAD_STAFF\s*&&\s*typeof\s+window\.AZAAD_STAFF\.init', executable):
        raise SystemExit('FAIL-CLOSED: legacy privileged staff init caller remains')

text = updated

# The global refresh surface must also not invoke the legacy staff runtime.
refresh_pattern = re.compile(
    r'\n\s*if\s*\(\s*\[[^\]]*["\']OWNER["\'][^\]]*["\']MANAGER["\'][^\]]*\]\.includes\(String\(state\.currentRole.*?window\.AZAAD_STAFF\.load\(\);\s*\n\s*\}',
    re.S,
)
text, refresh_removed = refresh_pattern.subn('', text, count=1)

executable = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
if re.search(r'window\.AZAAD_STAFF\s*&&\s*typeof\s+window\.AZAAD_STAFF\.(?:init|load)', executable):
    raise SystemExit('FAIL-CLOSED: legacy AZAAD_STAFF init/load caller remains in admin.js')

PATH.write_text(text, encoding='utf-8')
print(f'[AZAAD staff caller boundary] PASS: removed init={removed + legacy_removed}, refresh-load={refresh_removed}; staff runtime is panel-activation only')
