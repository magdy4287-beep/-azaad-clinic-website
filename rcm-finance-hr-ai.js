/* AZAAD CLINIC — RCM / FINANCE / HR AI TEAM
 * Advisory layer only. Deterministic financial totals remain authoritative.
 */
(function () {
  'use strict';

  const AzaadDepartmentAI = {
    roles: {
      rcm: ['RCM Clerk', 'RCM Analyst', 'RCM Supervisor', 'RCM Director'],
      finance: ['Finance Clerk', 'Payments Analyst', 'Expense Analyst', 'Revenue Analyst', 'Commission Analyst', 'Reconciliation Analyst', 'Financial Controller', 'Finance Manager'],
      hr: ['HR Clerk', 'Attendance Analyst', 'Workforce Analyst', 'Performance Analyst', 'Compensation Analyst', 'HR Supervisor', 'HR Manager'],
    },

    safeNumber(value) {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    },

    summarize({ revenue = 0, expenses = 0, outstanding = 0, appointments = 0, completed = 0, employees = 0 } = {}) {
      const r = this.safeNumber(revenue);
      const e = this.safeNumber(expenses);
      const ar = this.safeNumber(outstanding);
      const totalAppointments = this.safeNumber(appointments);
      const completedAppointments = this.safeNumber(completed);
      return {
        revenue: r,
        expenses: e,
        operatingResult: r - e,
        outstanding: ar,
        completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0,
        employees: this.safeNumber(employees),
      };
    },

    recommendations(metrics) {
      const m = this.summarize(metrics);
      const suggestions = [];
      if (m.outstanding > 0) suggestions.push('Review outstanding balances and prioritize follow-up according to clinic policy.');
      if (m.completionRate < 70) suggestions.push('Review appointment workflow, no-shows and scheduling bottlenecks.');
      if (m.expenses > m.revenue && m.revenue > 0) suggestions.push('Review expense categories and the current operating period before making budget decisions.');
      if (!suggestions.length) suggestions.push('No major operational exception detected from the supplied metrics. Continue monitoring trends.');
      return suggestions;
    },

    render(container, metrics = {}) {
      if (!container) return;
      const summary = this.summarize(metrics);
      const suggestions = this.recommendations(metrics);
      const isEnglish = String(document.documentElement.lang || '').toLowerCase().startsWith('en');
      const t = isEnglish ? {
        title: 'AI Department Supervisors', revenue: 'Revenue', expenses: 'Expenses', outstanding: 'Outstanding', completion: 'Completion', employees: 'Employees', suggestions: 'Suggestions',
      } : {
        title: 'مشرفو الأقسام بالذكاء الاصطناعي', revenue: 'الإيرادات', expenses: 'المصروفات', outstanding: 'المبالغ المستحقة', completion: 'نسبة الإنجاز', employees: 'الموظفون', suggestions: 'الاقتراحات',
      };
      container.innerHTML = `
        <section class="azaad-dept-ai" dir="auto" aria-label="${t.title}">
          <h3>🤖 ${t.title}</h3>
          <div class="azaad-dept-ai-grid">
            <div>💰 <b>${t.revenue}</b><strong>${summary.revenue.toLocaleString()}</strong></div>
            <div>💸 <b>${t.expenses}</b><strong>${summary.expenses.toLocaleString()}</strong></div>
            <div>🧾 <b>${t.outstanding}</b><strong>${summary.outstanding.toLocaleString()}</strong></div>
            <div>📊 <b>${t.completion}</b><strong>${summary.completionRate}%</strong></div>
            <div>👥 <b>${t.employees}</b><strong>${summary.employees}</strong></div>
          </div>
          <h4>💡 ${t.suggestions}</h4>
          <ul>${suggestions.map((s) => `<li>${s}</li>`).join('')}</ul>
          <small>AI recommendations are advisory. Financial totals and HR records remain authoritative from the clinic system.</small>
        </section>`;
    },
  };

  window.AzaadDepartmentAI = AzaadDepartmentAI;
})();
