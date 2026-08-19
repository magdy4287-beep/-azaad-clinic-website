#!/usr/bin/env python3
"""AZAAD comprehensive system contract — fail closed."""
from __future__ import annotations
import re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
FAILURES: list[str] = []; WARNINGS: list[str] = []
def read(path: Path) -> str:
    try: return path.read_text(encoding='utf-8', errors='replace')
    except OSError as exc: FAILURES.append(f'cannot read {path}: {exc}'); return ''
def require(condition: bool, message: str) -> None:
    if not condition: FAILURES.append(message)
central = ROOT/'central-i18n.js'; stability = ROOT/'central-i18n-stability.js'; vercel = ROOT/'vercel.json'
responsive = ROOT/'azaad-responsive-shell.css'; role_ui = ROOT/'azaad-role-experience.js'; injector = ROOT/'qa/inject-responsive-shell.py'
for path, label in ((central,'central-i18n.js'),(stability,'central-i18n-stability.js'),(responsive,'azaad-responsive-shell.css'),(role_ui,'azaad-role-experience.js'),(injector,'qa/inject-responsive-shell.py')): require(path.exists(), f'{label} is missing')
central_text = read(central) if central.exists() else ''; vercel_text = read(vercel) if vercel.exists() else ''; role_text = read(role_ui) if role_ui.exists() else ''
require('window.AZAAD_I18N' in central_text, 'central I18N runtime API missing'); require('location.reload()' not in central_text, 'central I18N reloads pages'); require('MutationObserver' in central_text, 'central I18N has no dynamic-content observer'); require('azaadLanguageChanged' in central_text, 'central language-change event missing'); require('qa/inject-central-i18n.py' in vercel_text, 'Vercel build does not enforce central I18N')
require('qa/inject-responsive-shell.py' in vercel_text, 'Vercel build does not enforce responsive shell'); require('azaad-responsive-shell.css' in read(injector), 'responsive injector does not inject shared CSS'); require('azaad-role-experience.js' in read(injector), 'admin role experience is not build-injected')
for role_name in ('OWNER','ADMIN','MANAGER','SECRETARY','RECEPTION','CASHIER','MARKETING'):
    require(role_name in role_text, f'role navigation contract missing {role_name}')
require('data-role' in read(ROOT/'admin.js'), 'admin does not expose authenticated role to the UI shell')
html_files = sorted(ROOT.rglob('*.html'))
for html in html_files:
    rel = html.relative_to(ROOT).as_posix(); text = read(html)
    if '.git/' in rel: continue
    if 'central-i18n.js' not in text and 'qa/inject-central-i18n.py' not in vercel_text: FAILURES.append(f'{rel}: no central I18N runtime or build injection')
    if re.search(r'(?:lang|language)[^\n]{0,180}location\.reload\s*\(', text, re.I): FAILURES.append(f'{rel}: language switching contains location.reload()')
source_files = [p for p in ROOT.rglob('*.js') if '.git' not in p.parts]
for path in source_files:
    text = read(path); rel = path.relative_to(ROOT).as_posix()
    suspicious=[r'(?:1|01)\s*[-–]\s*(?:12|12:00)',r'(?:hour|hours|ساعة)[^\n]{0,80}(?:12|12:00)',r'(?:max|maximum|limit|حد)[^\n]{0,80}(?:12|12:00)']
    if any(re.search(pattern,text,re.I) for pattern in suspicious): WARNINGS.append(f'{rel}: review possible hard-coded 1-12 scheduling limit')
refund=ROOT/'refund-workflow-ui.js'; refund_text=read(refund) if refund.exists() else ''; require(refund.exists(),'refund-workflow-ui.js is missing')
for token in ('approve_refund_doctor','approve_refund_management','process_refund','doctor_approval_status','management_approval_status'): require(token in refund_text,f'refund workflow missing mandatory control: {token}')
require('Every refund: Request -> Doctor Approval -> Management/Owner Approval -> Processing' in refund_text,'refund hierarchy contract missing')
security_files=[p for p in ROOT.rglob('*') if p.is_file() and p.suffix.lower() in {'.js','.ts','.sql','.html','.md'} and '.git' not in p.parts]; security_text='\n'.join(read(p) for p in security_files)
for path,label in ((ROOT/'change-password.html','staff password-change page'),): require(path.exists(),f'{label} is missing')
for token,msg in [('owner_set_staff_account_status','owner staff status RPC'),('azaad-account-security','account security function'),('CANNOT_DISABLE_SELF','self-disable protection'),('LAST_OWNER_PROTECTED','last-owner protection'),('PASSWORD_UPDATE_FAILED','password recovery path')]: require(token in security_text,f'{msg} is missing')
for token in ('suspend','disable','reactivate'): require(token in security_text.lower(),f'staff {token} capability is missing')
marketing_ai=ROOT/'supabase/functions/azaad-marketing-ai/index.ts'; marketing_text=read(marketing_ai) if marketing_ai.exists() else ''; require(marketing_ai.exists(),'marketing AI function source missing'); require('allowedRoles' in marketing_text and 'MARKETING' in marketing_text,'marketing AI role scope missing'); require('local-free-fallback' in marketing_text,'marketing AI free fallback missing')
ai_hits=list(ROOT.rglob('*ai*'))+list(ROOT.rglob('*AI*')); report_hits=list(ROOT.rglob('*report*'))+list(ROOT.rglob('*Report*')); require(bool(ai_hits),'no AI surface found'); require(bool(report_hits),'no reporting surface found')
workflow_dir=ROOT/'.github/workflows'; workflow_names={p.name for p in workflow_dir.glob('*.yml')} if workflow_dir.exists() else set()
for expected in ('azaad-ai-gate.yml','azaad-department-ai-gate.yml','azaad-executive-ai-gate.yml','azaad-payments-reporting-gate.yml','azaad-integration-gate.yml'): require(expected in workflow_names,f'missing required workflow gate: {expected}')
require('ai_can_approve' in security_text,'AI approval prohibition missing'); require('clinic_ai_recommendations' in security_text,'AI recommendation persistence missing'); require('human' in security_text.lower() and 'approval' in security_text.lower(),'human approval policy missing')
admin_dirs=[p for p in ROOT.glob('admin/**/index.html') if p.is_file()]
if len(admin_dirs)>1: require('/admin/admin/:path*' in vercel_text,'duplicate admin trees lack production redirects')
paid_markers=('openai.com','anthropic.com','gemini.google.com')
for path in source_files:
    text=read(path); rel=path.relative_to(ROOT).as_posix()
    if any(marker in text for marker in paid_markers) and 'qa/' not in rel: WARNINGS.append(f'{rel}: review external AI provider reference for Free-only compliance')
print('AZAAD comprehensive system contract'); print(f'HTML pages scanned: {len(html_files)}'); print(f'JS sources scanned: {len(source_files)}'); print(f'Security/AI source files scanned: {len(security_files)}')
if WARNINGS:
    print('WARNINGS:'); [print(f'  - {x}') for x in sorted(set(WARNINGS))]
if FAILURES:
    print('FAILURES:'); [print(f'  - {x}') for x in FAILURES]; print(f'CONTRACT FAILED: {len(FAILURES)} blocking finding(s)'); sys.exit(1)
print('CONTRACT PASSED')
