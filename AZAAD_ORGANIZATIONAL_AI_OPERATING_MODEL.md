# AZAAD — Organizational AI Operating Model

## Purpose

Define the actual clinic operating model so that the UI, permissions, workflows, reports, AI agents and certification tests implement one coherent system.

## 1. Unified Frontdesk Role

AZAAD treats the **Secretary / Reception / Cashier** function as one operational Frontdesk role for the clinic's current staffing model.

The Frontdesk user may perform, subject to explicit permission scopes:

- patient registration and controlled patient updates
- appointment search, booking, rescheduling and cancellation
- check-in / frontdesk workflow
- invoice creation and controlled invoice operations
- payment recording and verification
- expense entry
- daily operational closing tasks
- patient communications and administrative follow-up
- operational reports assigned to Frontdesk

This does NOT grant clinical privileges, HR administration, security administration, owner controls, unrestricted finance administration, or AI approval authority.

## 2. Doctor Workspace

Doctors receive a dedicated Doctor experience rather than the Administration dashboard.

Doctor scope includes:

- own schedule and assigned clinical workload
- authorized patient/visit context
- assessment, clinical notes and treatment/progress workflows
- clinical follow-up
- clinical reports relevant to the doctor
- doctor operational metrics
- AI clinical assistance as recommendations only

AI must never replace the doctor's clinical judgment or approve a financial/clinical gate.

## 3. Marketing — Hybrid Human + AI

Marketing is a hybrid department:

**Human marketer + AI copilot + governed campaign workflow**

AI can assist with:

- content ideas
- bilingual copy suggestions
- campaign variants
- audience/lead analysis
- performance analysis
- trend detection
- content calendar suggestions
- campaign reporting

Human approval remains required for publication and sensitive campaign decisions.

External paid AI is optional. Marketing must retain a local/free fallback for core assistance.

## 4. Finance — AI-Assisted Finance Operations

Finance uses AI heavily for analysis and reporting, but AI is not the financial authority.

AI can produce:

- daily financial summaries
- revenue/collection/expense trends
- reconciliation warnings
- outstanding AR prioritization suggestions
- anomaly detection
- doctor/clinic share analysis
- cash-flow analysis
- management recommendations

Human authorization remains mandatory for privileged financial actions, especially refunds.

Refund policy is immutable at the workflow level:

`REQUESTED → DOCTOR_APPROVED → MANAGEMENT_OR_OWNER_APPROVED → PROCESSING → COMPLETED`

`ai_can_approve = false`

## 5. HR — AI-Assisted Workforce Operations

HR can use AI for:

- attendance summaries
- staffing trends
- workload analysis
- performance summaries
- compensation trend analysis
- document/expiry reminders
- workforce risk signals
- management recommendations

AI does not autonomously hire, terminate, change compensation, change roles, or grant permissions.

## 6. Central Reports & Intelligence Department

AZAAD should have a **Reports & Intelligence Center** rather than scattering management reporting across every module.

It aggregates governed reports from:

- Frontdesk
- Doctors / Clinical
- Finance / RCM
- HR
- Marketing
- Scheduling
- Patient operations
- Security / IT
- Purchasing
- Administration

The center produces:

### Daily
- Frontdesk daily activity report
- Doctor activity report
- appointments / check-ins / no-shows
- invoices / collections / expenses
- clinical workload signals
- marketing activity
- HR operational signals
- security events

### Weekly
- operational trends
- revenue and collection trends
- patient flow
- doctor productivity
- employee workload
- marketing conversion
- open workflow backlog

### Monthly
- financial performance
- operational KPIs
- doctor/employee performance
- patient retention/follow-up
- campaign performance
- workforce analysis
- risk and exception summary

### Executive Report
Owner/Management receives one consolidated report containing:

1. What happened
2. What changed
3. Why it changed
4. What needs attention
5. Recommended actions
6. Evidence/source metrics
7. Items requiring human approval

AI-generated recommendations must identify their source metrics and confidence/limitations. Reports must never invent missing data.

## 7. Proposed Departments / Capabilities

### A. Operations Command Center
Merge general Administration + Workflow + daily operations into one operating layer.

### B. Reports & Intelligence Center
New central reporting/analytics layer. This should be a capability/department in the platform even if no dedicated employee exists.

### C. IT / Security & Compliance
Keep separate from normal Administration because security events, permissions, audit and recovery require restricted access.

### D. Procurement & Inventory
Expand Purchasing into Procurement/Inventory if the clinic begins tracking consumables, stock levels, reorder points and supplier performance.

### E. Patient Experience / Communications
Recommended as a capability rather than necessarily a staffed department. Owns patient notifications, follow-up, feedback, satisfaction and service recovery.

### F. Quality & Clinical Governance
Recommended capability for future growth. It aggregates clinical quality indicators, follow-up completion, documentation completeness and safety exceptions. AI may summarize; clinicians/management own decisions.

### G. Business Development / CRM
Can remain under Marketing initially. Split only when lead volume, referral partnerships or multi-channel sales justify it.

## 8. AI Governance Rule

Every AI action belongs to one of four classes:

1. **Observe** — read authorized data and summarize.
2. **Recommend** — propose an action with evidence.
3. **Prepare** — draft content/report/work item for human review.
4. **Execute** — only permitted when the workflow policy explicitly allows it.

AI cannot bypass:

- authentication
- authorization
- RLS
- approval gates
- audit requirements
- human clinical judgment
- owner/security protections

## 9. Free-First Architecture

Core operation must remain functional without paid AI/API services.

Preferred order:

1. deterministic application logic
2. SQL/database analytics
3. local/free AI heuristics/models where available
4. optional external free-tier AI
5. paid AI only as an optional future enhancement, never as a core dependency

If an AI provider fails, the workflow must degrade gracefully to deterministic reports or a clearly labeled unavailable state.

## 10. Daily Accountability

Every operational role produces a governed activity summary from actual audit/business events.

Examples:

**Frontdesk:** registrations, bookings, changes, check-ins, invoices, payments, expenses, cancellations, follow-ups.

**Doctor:** patients seen, visits completed, assessments, notes, follow-ups, no-shows, clinical workload.

**Finance:** collections, expenses, reconciliation, outstanding AR, exceptions.

**HR:** staffing changes, attendance, documents, performance signals.

**Marketing:** content, campaigns, leads, conversions, performance.

No employee report should be manually fabricated. It must be derived from source events and reconciled records.

## 11. UI Principle

Role determines the workspace, not merely which buttons are hidden.

Every workspace must be responsive across:

- desktop
- laptop
- tablet
- mobile

Critical actions must remain visible and reachable. Responsive navigation may reorganize controls, but must not silently remove authorized functionality.

Arabic/English presentation remains centralized for the Patient and Administration dashboards, with RTL/LTR handled by the same i18n authority.

## 12. Certification Requirement

For every role/department:

`Role → Workspace → Permissions → Real Data → Workflow → Audit → AI Governance → Responsive UI → E2E`

A role is not considered complete because a dashboard renders. Its authorized workflows must be proven end-to-end.
