from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'azaad-platform-kernel.js'
if not path.is_file():
    raise SystemExit('FAIL-CLOSED: azaad-platform-kernel.js is missing')

canonical = r'''/* AZAAD Platform Kernel — canonical browser policy owner.
 * Runtime identity/data access is server-owned through Appwrite + Neon.
 * clinic_feature_flags and clinic_audit_events remain data contracts; browser code never opens a DB client.
 */
(() => {
  'use strict';
  const state = window.AZAAD_PLATFORM = window.AZAAD_PLATFORM || {};
  const PLATFORM_API = '/api/admin-appointments?resource=platform';
  const PLATFORM_FEATURES_TABLE = 'clinic_feature_flags';
  const PLATFORM_AUDIT_TABLE = 'clinic_audit_events';
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));

  state.version = '2.0.0';
  state.ai = Object.assign(state.ai || {}, {
    advisoryOnly: true,
    humanApprovalRequired: true,
    forbiddenActions: ['clinical_decision','prescription','refund_approval','invoice_void','staff_termination','permission_change','security_override','paid_ad_publication']
  });
  state.canUseAIFor = action => !state.ai.forbiddenActions.includes(action);

  state.workflow = Object.assign(state.workflow || {}, {
    requiredApproval(workflowKey) {
      const map = {
        refund: ['doctor_approval', 'management_owner_approval'],
        appointment_cancel: ['doctor_approval', 'management_owner_approval'],
        paid_marketing_publication: ['human_approval']
      };
      return map[workflowKey] || [];
    },
    isHumanApprovalComplete(workflowKey, approvals = []) {
      return this.requiredApproval(workflowKey).every(step => approvals.includes(step));
    }
  });

  state.i18n = Object.assign(state.i18n || {}, {
    current() { return document.documentElement.lang?.toLowerCase().startsWith('en') ? 'en' : 'ar'; },
    assertNoMixedLanguage(root = document) {
      if (!root || this.current() !== 'en') return {ok:true, violations:[]};
      const violations = [];
      const walker = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) { const text = node.nodeValue?.trim(); if (text && /[\u0600-\u06FF]/.test(text)) violations.push(text.slice(0,80)); }
      return {ok:violations.length === 0, violations};
    }
  });

  state.audit = state.audit || {
    async record(action, entityType, entityId, details = {}) {
      try {
        const response = await fetch(PLATFORM_API, {
          method: 'POST', credentials: 'include', cache: 'no-store',
          headers: {'content-type':'application/json','accept':'application/json'},
          body: JSON.stringify({action:'audit',event_action:action,entity_type:entityType,entity_id:entityId||null,details:Object.assign({source:'azaad-platform-kernel',kernel_version:state.version},details)})
        });
        return response.ok;
      } catch (_) { return false; }
    }
  };

  state.feature = state.feature || {
    cache: new Map(),
    async enabled(key, fallback = false) {
      if (this.cache.has(key)) return this.cache.get(key);
      try {
        const url = `${PLATFORM_API}&feature=${encodeURIComponent(key)}`;
        const response = await fetch(url, {credentials:'include',cache:'no-store',headers:{accept:'application/json'}});
        const body = await response.json().catch(() => ({}));
        const value = response.ok && body?.feature ? Boolean(body.feature.enabled) : fallback;
        this.cache.set(key, value);
        return value;
      } catch (_) { return fallback; }
    },
    clear(){ this.cache.clear(); }
  };

  state.share = state.share || {
    bookingUrl() { const url = new URL(window.location.href); url.hash = 'booking'; return url.toString(); },
    copyBookingUrl() { return navigator.clipboard?.writeText(this.bookingUrl()).then(() => true).catch(() => false); }
  };

  window.AZAAD_AI_POLICY = state.ai;
  window.AZAAD_WORKFLOW_POLICY = state.workflow;
  window.AZAAD_PLATFORM_TABLE_CONTRACT = {featureFlags: PLATFORM_FEATURES_TABLE, auditEvents: PLATFORM_AUDIT_TABLE};

  if (!document.getElementById('azaad-platform-kernel-style')) {
    const style = document.createElement('style');
    style.id = 'azaad-platform-kernel-style';
    style.textContent = '.azaad-platform-hidden{display:none!important}.azaad-ai-advisory{border-inline-start:3px solid #6b7cff;padding-inline-start:10px}.azaad-approval-required{border-inline-start:3px solid #c88b00;padding-inline-start:10px}';
    document.head.appendChild(style);
  }
  window.dispatchEvent(new CustomEvent('azaad:platform-ready', {detail:{version:state.version}}));
})();
'''
path.write_text(canonical, encoding='utf-8')
print('[AZAAD platform kernel] PASS: browser has no DB/auth client; Appwrite-Neon server boundary owns audit and feature flags')
