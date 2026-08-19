#!/usr/bin/env python3
"""AZAAD comprehensive system contract — fail closed."""
from __future__ import annotations
import re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; FAILURES=[]; WARNINGS=[]
def read(p):
    try:return p.read_text(encoding='utf-8',errors='replace')
    except OSError as e:FAILURES.append(f'cannot read {p}: {e}');return ''
def require(c,m):
    if not c:FAILURES.append(m)
central=ROOT/'central-i18n.js'; stability=ROOT/'central-i18n-stability.js'; vercel=ROOT/'vercel.json'; responsive=ROOT/'azaad-responsive-shell.css'; role_ui=ROOT/'azaad-role-experience.js'; injector=ROOT/'qa/inject-responsive-shell.py'; finance=ROOT/'rcm-finance-center.js'
for p,l in ((central,'central-i18n.js'),(stability,'central-i18n-stability.js'),(responsive,'azaad-responsive-shell.css'),(role_ui,'azaad-role-experience.js'),(injector,'qa/inject-responsive-shell.py')):require(p.exists(),f'{l} is missing')
ct=read(central); vt=read(vercel); rt=read(role_ui); ft=read(finance)
for token,msg in [('window.AZAAD_I18N','central I18N runtime API'),('MutationObserver','central I18N dynamic observer'),('azaadLanguageChanged','central language-change event')]:require(token in ct,f'{msg} missing')
require('location.reload()' not in ct,'central I18N reloads pages');require('qa/inject-central-i18n.py' in vt,'Vercel does not enforce central I18N');require('qa/inject-responsive-shell.py' in vt,'Vercel does not enforce responsive shell');require('azaad-responsive-shell.css' in read(injector),'responsive CSS injection missing');require('azaad-role-experience.js' in read(injector),'admin role UI injection missing')
for r in ('OWNER','ADMIN','MANAGER','SECRETARY','RECEPTION','CASHIER','MARKETING'):require(r in rt,f'role navigation contract missing {r}')
# Authenticated-role provenance is checked structurally after whitespace normalization.
# This deliberately avoids depending on one JavaScript spelling while remaining fail-closed.
normalized=re.sub(r'\s+',' ',rt).strip()
role_source_patterns=(
    r'window\.AZAAD\s*&&\s*window\.AZAAD\.state\s*;?\s*const\s+authenticatedRole\s*=\s*authenticatedState\s*&&\s*authenticatedState\.role',
    r'window\.AZAAD(?:\?\.)?state(?:\?\.)?role',
    r'window\[\s*[\"\']AZAAD[\"\']\s*\]\s*(?:\?\.)?state(?:\?\.)?role',
)
role_source=any(re.search(p,normalized) for p in role_source_patterns)
require('data-role' in normalized and ('getAuthenticatedRole' in normalized) and role_source,'admin role shell does not expose the authenticated role')
require(all(x in ft for x in ('OWNER','ADMIN','MANAGER','CASHIER')),'RCM finance role scope missing')
htmls=sorted(ROOT.rglob('*.html'))
for h in htmls:
    rel=h.relative_to(ROOT).as_posix();t=read(h)
    if '.git/' in rel:continue
    if 'central-i18n.js' not in t and 'qa/inject-central-i18n.py' not in vt:FAILURES.append(f'{rel}: no central I18N runtime or build injection')
    if re.search(r'(?:lang|language)[^\n]{0,180}location\.reload\s*\(',t,re.I):FAILURES.append(f'{rel}: language switching contains location.reload()')
refund=ROOT/'refund-workflow-ui.js'; rf=read(refund) if refund.exists() else '';require(refund.exists(),'refund workflow missing')
for x in ('approve_refund_doctor','approve_refund_management','process_refund','doctor_approval_status','management_approval_status'):require(x in rf,f'refund control missing: {x}')
require('Every refund: Request -> Doctor Approval -> Management/Owner Approval -> Processing' in rf,'refund hierarchy missing')
sec=[p for p in ROOT.rglob('*') if p.is_file() and p.suffix.lower() in {'.js','.ts','.sql','.html','.md'} and '.git' not in p.parts]; st='\n'.join(read(p) for p in sec)
require((ROOT/'change-password.html').exists(),'password page missing')
for x,m in [('owner_set_staff_account_status','owner staff status RPC'),('azaad-account-security','account security function'),('CANNOT_DISABLE_SELF','self-disable protection'),('LAST_OWNER_PROTECTED','last-owner protection'),('PASSWORD_UPDATE_FAILED','password recovery')]:require(x in st,f'{m} missing')
for x in ('suspend','disable','reactivate'):require(x in st.lower(),f'staff {x} capability missing')
mai=ROOT/'supabase/functions/azaad-marketing-ai/index.ts'; mt=read(mai) if mai.exists() else '';require(mai.exists(),'marketing AI source missing');require('allowedRoles' in mt and 'MARKETING' in mt,'marketing AI role scope missing');require('local-free-fallback' in mt,'marketing AI free fallback missing')
require(bool(list(ROOT.rglob('*ai*'))+list(ROOT.rglob('*AI*'))),'no AI surface found');require(bool(list(ROOT.rglob('*report*'))+list(ROOT.rglob('*Report*'))),'no reporting surface found')
wd=ROOT/'.github/workflows'; names={p.name for p in wd.glob('*.yml')} if wd.exists() else set()
for x in ('azaad-ai-gate.yml','azaad-department-ai-gate.yml','azaad-executive-ai-gate.yml','azaad-payments-reporting-gate.yml','azaad-integration-gate.yml'):require(x in names,f'missing workflow gate: {x}')
require('ai_can_approve' in st,'AI approval prohibition missing');require('clinic_ai_recommendations' in st,'AI recommendation persistence missing');require('human' in st.lower() and 'approval' in st.lower(),'human approval policy missing')
admins=[p for p in ROOT.glob('admin/**/index.html') if p.is_file()]
if len(admins)>1:require('/admin/admin/:path*' in vt,'duplicate admin trees lack redirects')
for p in [p for p in ROOT.rglob('*.js') if '.git' not in p.parts]:
    t=read(p);rel=p.relative_to(ROOT).as_posix()
    if any(x in t for x in ('openai.com','anthropic.com','gemini.google.com')) and 'qa/' not in rel:WARNINGS.append(f'{rel}: review external AI provider for Free-only compliance')
print('AZAAD comprehensive system contract');print(f'HTML pages scanned: {len(htmls)}');print(f'JS sources scanned: {len([p for p in ROOT.rglob("*.js") if ".git" not in p.parts])}');print(f'Security/AI source files scanned: {len(sec)}')
if WARNINGS:
 print('WARNINGS:');[print(f'  - {x}') for x in sorted(set(WARNINGS))]
if FAILURES:
 print('FAILURES:');[print(f'  - {x}') for x in FAILURES];print(f'CONTRACT FAILED: {len(FAILURES)} blocking finding(s)');sys.exit(1)
print('CONTRACT PASSED')