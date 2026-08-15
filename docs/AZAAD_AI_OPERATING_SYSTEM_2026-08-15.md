# AZAAD CLINIC — AI OPERATING SYSTEM

## Objective

AI is a cross-cutting operating layer across the clinic, not a single "AI" tab. Every department gets role-specific assistance while the clinic remains fully usable when AI is unavailable.

## Free-first architecture

1. **Core workflows never depend on AI.** Booking, patient records, clinical documentation, invoices, payments, HR, finance and security remain deterministic.
2. **Prefer the existing local/rules-based `azaad-ai-insights` foundation.** It can produce deterministic operational insights without a paid external API.
3. **Optional external/free-tier models may be adapters, never dependencies.** A quota or API outage must fall back to local rules and clear "AI unavailable" states.
4. **AI never gets a Supabase service-role key.** Protected data is accessed only through authenticated Edge Functions with role enforcement.
5. **Minimum-data principle.** Send only the fields required for the requested task. Avoid patient identifiers and clinical text when the task does not need them.
6. **Human approval is mandatory for clinical, financial, HR, security and destructive actions.** AI recommends; authorized staff decide and execute.
7. **Every AI recommendation is traceable.** Store source type, generated time, role/context, confidence/priority when available, and the underlying metrics/signals.

## AI team model

### 1. 🧠 AI Front Desk Assistant — Secretary / Reception

Acts like a senior front-desk supervisor, not an autonomous employee.

- Required-field checklist before creating a patient/booking.
- Duplicate-patient warnings.
- Search guidance for name/phone/MRN/booking number.
- Appointment conflict explanations.
- Follow-up and no-show queues.
- Daily task list with overdue items.
- Missing-payment reminders.
- Script suggestions for patient communication.
- Arabic/English response templates.
- End-of-shift checklist.
- Escalation when an item is overdue or outside the employee's permissions.
- Quality score based on measurable workflow compliance, never secret surveillance.

**Guardrail:** it must not invent clinical facts, approve exceptions, change permissions, or bypass required fields.

### 2. 🧑‍⚕️ AI Doctor Copilot

Clinical assistance is advisory only.

- Visit preparation summary from authorized historical records.
- Timeline of previous visits and assessment scores.
- Follow-up reminder suggestions.
- Missing-documentation prompts.
- Structured note/checklist suggestions.
- Longitudinal progress visualization.
- Appointment/follow-up scheduling suggestions.
- Non-diagnostic trend summaries.
- Patient education draft suggestions that require clinician review.

**Guardrails:** no autonomous diagnosis, prescription, treatment change, safety decision, or medical claim. Safety flags always remain visible and clinician-owned.

### 3. 🤢 AI Patient 360 Assistant

For authorized doctors and management.

- Summarize appointments, visits, invoices, payments and follow-ups.
- Highlight outstanding balance.
- Highlight upcoming appointment.
- Highlight missed/no-show history.
- Highlight unresolved follow-up tasks.
- Explain progress trends from recorded assessment scores.
- Suggest the next administrative action.

Never expose information beyond the user's role.

### 4. 📅 AI Scheduling Supervisor

- Recommend open slots.
- Detect overloaded/underutilized periods.
- Identify conflicts and closure interactions.
- Suggest balanced schedules by doctor/service.
- Highlight likely no-show periods from historical operational data.
- Suggest follow-up windows.

The scheduling engine remains authoritative; AI cannot silently book or modify schedules.

### 5. 🧾 AI RCM / Billing Team

Model the department as a virtual team:

- **RCM Agent:** identifies unpaid/partial/overdue invoices.
- **Collections Agent:** prioritizes follow-up queues.
- **Billing QA Agent:** detects inconsistent totals/statuses.
- **Reconciliation Agent:** compares invoices, payments and daily closing totals.
- **RCM Supervisor:** produces a daily/weekly/monthly management summary.

Outputs:
- AR aging priorities.
- Collection opportunities.
- Missing payment documentation.
- Unusual refunds/voids/discounts for review.
- Doctor/service revenue summaries.

No AI agent may issue a refund, void an invoice, alter a price, or change a payment without explicit authorized action.

### 6. 💰 AI Finance Department

Virtual team structure:

- **Finance Clerk:** categorizes and summarizes daily transactions.
- **Reconciliation Clerk:** compares expected vs actual closing.
- **Expense Analyst:** identifies unusual or rising expenses.
- **Revenue Analyst:** analyzes revenue/collection trends.
- **Commission Analyst:** applies configured compensation rules and flags exceptions.
- **Financial Controller:** creates daily/monthly/yearly reports.
- **Finance Manager:** sends the management brief with risks, opportunities and recommended actions.

Reports:
- Revenue.
- Collection.
- Expenses.
- Doctor share.
- Clinic share.
- Employee compensation where authorized.
- Net cash flow.
- Outstanding receivables.
- Daily closing differences.
- Month-to-date / year-to-date comparisons.

AI may calculate and explain; source-of-truth financial records and configured formulas remain authoritative.

### 7. 👥 AI Human Resources Team

Virtual team structure:

- **HR Clerk:** maintains profile/document reminders.
- **Attendance Analyst:** summarizes shifts/attendance where data exists.
- **Performance Analyst:** summarizes measurable KPIs.
- **Compensation Analyst:** checks configured salary/commission rules.
- **HR Supervisor:** produces monthly workforce report.
- **HR Manager:** sends management recommendations.

Capabilities:
- Certificate expiry alerts.
- Missing HR data alerts.
- Staffing/capacity signals.
- Employee KPI summaries.
- Employee-of-month/year candidates based on explicit metrics.
- Training and workflow improvement suggestions.

AI must not make discriminatory or opaque employment decisions. Final HR decisions remain human and policy-based.

### 8. 📊 AI Management / Executive Office

The management assistant consumes reconciled operational summaries and produces:

- Daily executive brief.
- Weekly operational report.
- Monthly management report.
- Annual trend report.
- Booking/completion/no-show analysis.
- Revenue and profitability signals.
- Doctor/service performance.
- Staff productivity signals.
- Patient follow-up backlog.
- RCM/AR risks.
- Purchasing/expense trends.
- Marketing performance.
- Security event summaries.
- Recommended priorities for tomorrow/week/month.

Every recommendation should show the metrics/signals behind it.

### 9. 📣 AI Marketing Team

Virtual team:

- Content strategist.
- Copywriter.
- Campaign analyst.
- Offer planner.
- Lead analyst.
- Marketing supervisor.

Capabilities:
- Instagram/Facebook post ideas.
- Arabic/English captions.
- Hashtag suggestions.
- Offer ideas.
- Campaign calendars.
- Reusable content templates.
- Image/video brief suggestions.
- Lead-source analysis.
- Conversion analysis.
- Best-time suggestions based on available internal data.

The existing large media workspace remains the human publishing surface: image/video upload, preview, edit, archive/delete, draft, schedule and published history.

### 10. 🛡️ AI Security Analyst

AI is a summarization/detection helper only.

- Group security events.
- Identify unusual login/error patterns.
- Summarize failed-login bursts.
- Flag repeated permission violations.
- Produce daily security brief.
- Recommend investigation priorities.

AI is never the firewall, authentication system, RLS policy, rate limiter or incident-response authority.

## Universal workflow

**Data → deterministic calculation → AI insight → explanation → recommended action → authorized human approval → audited action → result measurement.**

## Notification model

Every department can have:

- 🔴 Critical.
- 🟠 High priority.
- 🟡 Needs attention.
- 🔵 Informational.
- 🟢 Completed.

The system should avoid notification spam by grouping related alerts and presenting a single actionable queue.

## AI availability states

- **Local / Rules:** core free mode.
- **Optional Model:** external adapter available.
- **Fallback:** external model unavailable; local insights continue.
- **Human only:** task requires authorized human judgment.

The UI must never block core operations because an AI endpoint is unavailable.

## Privacy and safety

- Clinical AI receives only authorized patient scope.
- Patient identifiers are excluded from generic analytics prompts.
- Financial/HR data is role-scoped.
- Security data is restricted to authorized management/security roles.
- No secrets or service-role keys in frontend code.
- No autonomous clinical diagnosis or treatment decisions.
- No autonomous financial posting, refunds, invoice voids or compensation changes.
- No autonomous HR termination/hiring decisions.
- No autonomous security blocking based only on an AI score.

## Acceptance gates

An AI feature is DONE only when:

1. It has a deterministic fallback.
2. Its input is role-scoped.
3. Its output is clearly marked as AI/recommendation when appropriate.
4. It cannot silently perform a privileged/destructive action.
5. The recommendation can be traced to source metrics/signals.
6. Arabic and English are supported.
7. Failure/timeout is handled gracefully.
8. Core clinic workflow still works with AI disabled.
9. Regression tests cover the AI-off fallback.
10. Production verification confirms the deployed behavior.
