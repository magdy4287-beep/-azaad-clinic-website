# AZAAD CLINIC — RCM, FINANCE & HR AI TEAM PLAN

## Goal

Create department-style AI copilots that behave like coordinated teams while keeping humans responsible for financial, payroll, HR and clinical decisions.

## RCM AI Team

### RCM Clerk AI
- Check invoice completeness.
- Detect missing patient/billing fields.
- Flag duplicate invoices.
- Track unpaid balances.
- Prioritize follow-up queues.

### RCM Analyst AI
- Daily revenue-cycle summary.
- Collections trend.
- Outstanding receivables aging.
- Payment reconciliation suggestions.
- Doctor/service revenue breakdown.

### RCM Supervisor AI
- Review exceptions.
- Identify bottlenecks.
- Prepare daily RCM report.
- Escalate unresolved items.

### RCM Director AI
- Executive RCM summary.
- Monthly/yearly trends.
- Collection performance.
- Denial/exception patterns when data exists.
- Recommended operational improvements.

No AI may automatically refund, void, alter an invoice, change a price, or write off a balance.

## Finance AI Team

Roles:

- Finance Clerk.
- Accounts/Payments Analyst.
- Expense Analyst.
- Revenue Analyst.
- Commission Analyst.
- Reconciliation Analyst.
- Financial Controller.
- Finance Manager.

Capabilities:

- Daily/monthly/yearly P&L-style operational summaries.
- Revenue vs expense trends.
- Purchase/expense categorization.
- Doctor revenue and agreed commission calculations.
- Employee compensation summaries.
- Cash/payment reconciliation suggestions.
- Budget variance alerts.
- Forecasting using historical clinic data.
- Finance Manager report to management.

Human approval is mandatory for payment release, refunds, write-offs, compensation changes and accounting adjustments.

## HR AI Team

Roles:

- HR Clerk.
- Attendance Analyst.
- Workforce Analyst.
- Performance Analyst.
- Compensation Analyst.
- HR Supervisor.
- HR Manager.

Capabilities:

- Active employee roster.
- Attendance/shift summaries.
- Patient/workload distribution.
- Training and certificate expiry reminders.
- Performance scorecards.
- Employee-of-month/year candidates based on transparent metrics.
- Staffing recommendations.
- Compensation analytics.
- HR monthly/yearly reports.

AI recommendations must be explainable and must not make discriminatory decisions based on protected characteristics.

## Executive AI

Combine authorized aggregates from RCM, Finance, HR, Operations, Marketing and Security into:

- Morning briefing.
- Daily closing report.
- Weekly executive report.
- Monthly management report.
- Yearly performance report.
- KPI dashboard.
- Risks and exceptions.
- Suggested priorities.
- Revenue opportunities.
- Quality/process improvement suggestions.

Every recommendation displays the underlying metric and time period.

## Free-first architecture

The system must continue operating when external AI generation is unavailable. Deterministic SQL calculations and reports remain authoritative for financial totals. AI is an advisory layer over verified data.

## Audit and security

Every AI-generated financial/HR recommendation must store:

- role/copilot name
- generated timestamp
- data period
- recommendation
- supporting metrics
- human reviewer
- approval/rejection status

Sensitive payroll and HR data remain role-scoped.

## Definition of Done

- Real module data integration.
- Role-based authorization.
- Server-side sensitive calculations.
- Audit trail.
- Arabic/English.
- AI-off fallback.
- Mobile/desktop UX.
- Daily/monthly/yearly reporting.
- Regression tests.
- No destructive AI automation.
