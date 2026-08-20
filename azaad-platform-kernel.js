/* AZAAD Platform Kernel
 * Cross-cutting guardrails: feature flags, workflow policy, AI advisory boundaries,
 * centralized language hooks, audit helpers, and future-safe extension seams.
 * No core clinical/financial action is executed by this file.
 */
(() => {
  'use strict';
  const state = window.AZAAD_PLATFORM = window.AZAAD_PLATFORM || {};
  const getClient = () => window.AZAAD?.supabase || window.supabaseClient || window.supabase;
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));

  state.version = '1.0.0';
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
      const required = this.requiredApproval(workflowKey);
      return required.every(step => approvals.includes(step));
    }
  });

  state.i18n = Object.assign(state.i18n || {}, {
    current() {
      return document.documentElement.lang?.toLowerCase().startsWith('en') ? 'en' : 'ar';
    },
    assertNoMixedLanguage(root = document) {
      if (!root || this.current() !== 'en') return {ok:true, violations:[]};
      const violations = [];
      const walker = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const text = node.nodeValue?.trim();
        if (text && /[\u0600-\u06FF]/.test(text)) violations.push(text.slice(0,80));
      }
      return {ok:violations.length === 0, violations};
    }
  });

  state.audit = state.audit || {
    async record(action, entityType, entityId, details = {}) {
      const client = getClient();
      if (!client?.auth) return false;
      const {data:{session}} = await client.auth.getSession();
      if (!session?.user?.id) return false;
      const {error} = await client.from('clinic_audit_events').insert({
        actor_user_id: session.user.id,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details: Object.assign({source:'azaad-platform-kernel',kernel_version:state.version}, details)
      });
      return !error;
    }
  };

  state.feature = state.feature || {
    cache: new Map(),
    async enabled(key, fallback = false) {
      if (this.cache.has(key)) return this.cache.get(key);
      const client = getClient();
      if (!client) return fallback;
      const {data,error} = await client.from('clinic_feature_flags').select('enabled').eq('key',key).maybeSingle();
      const value = error || !data ? fallback : Boolean(data.enabled);
      this.cache.set(key,value);
      return value;
    },
    clear(){ this.cache.clear(); }
  };

  state.share = state.share || {
    bookingUrl() {
      const url = new URL(window.location.href);
      url.hash = 'booking';
      return url.toString();
    },
    copyBookingUrl() {
      return navigator.clipboard?.writeText(this.bookingUrl()).then(() => true).catch(() => false);
    }
  };

  window.AZAAD_AI_POLICY = state.ai;
  window.AZAAD_WORKFLOW_POLICY = state.workflow;

  if (!document.getElementById('azaad-platform-kernel-style')) {
    const style = document.createElement('style');
    style.id = 'azaad-platform-kernel-style';
    style.textContent = '.azaad-platform-hidden{display:none!important}.azaad-ai-advisory{border-inline-start:3px solid #6b7cff;padding-inline-start:10px}.azaad-approval-required{border-inline-start:3px solid #c88b00;padding-inline-start:10px}';
    document.head.appendChild(style);
  }

  window.dispatchEvent(new CustomEvent('azaad:platform-ready', {detail:{version:state.version}}));
})();
