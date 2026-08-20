# AZAAD — Patient Visibility, Event Timeline & KPI Evidence

## Objective

Every operational workspace must make the current patient journey immediately understandable without opening multiple screens, while preserving role-based privacy.

## Patient identity card

Where a staff member is authorized to see a patient, the compact patient context should show:

- Patient name
- Date of birth OR calculated age (according to UI policy)
- Patient identifier
- Appointment date/time
- Assigned doctor
- Current workflow status

Sensitive demographics not required for the workflow must not be exposed merely for convenience.

## Operational status timeline

The patient/appointment context must expose a chronological event timeline. Example:

`BOOKED → CONFIRMED → CHECKED_IN → PAYMENT_RECORDED → SENT_TO_DOCTOR → VISIT_STARTED → VISIT_COMPLETED → FOLLOW_UP_SCHEDULED`

Each event records:

- event type
- exact server timestamp
- clinic timezone representation
- actor/user ID and safe display name where permitted
- actor role/department
- source workflow/module
- related appointment/patient/transaction ID
- status/result
- metadata needed for KPI aggregation
- immutable audit linkage

The UI should show human-readable labels such as:

- 💵 Payment completed — 09:42
- 📤 Sent to Dr. [authorized display name] — 09:47
- ✅ Check-in completed — 09:50
- 🩺 Visit started — 10:03

The displayed times must come from authoritative event timestamps, not client clocks.

## Patient status strip

The patient card should provide a compact status strip that can be read at a glance from Frontdesk, Doctor and Administration contexts according to authorization:

`Patient → DOB/Age → Appointment → Doctor → Payment → Check-in → Clinical status → Next action`

On small screens it becomes a vertically stacked timeline; no authorized status is silently removed because of viewport size.

## KPI event architecture

KPI values must be derived from immutable operational events rather than manually typed report values.

Examples:

### Frontdesk
- booking count
- confirmation count
- check-in count
- payment completion count
- average booking-to-check-in time
- average check-in-to-doctor handoff time
- cancellations
- no-shows
- reschedules
- expenses entered
- invoices created

### Doctor
- patients seen
- visits started/completed
- average waiting time before clinical start
- assessments completed
- clinical notes completed
- follow-ups scheduled
- session duration
- outstanding clinical actions

### Finance
- payment events
- invoice events
- collection totals
- expense events
- refund requests/approvals/completions
- reconciliation exceptions

### Marketing
- draft/approval/publish events
- campaign activity
- channel publication evidence
- engagement/conversion metrics where connected

### Procurement
- purchase requests
- approvals
- purchases recorded
- price changes
- supplier events
- inventory movements

## KPI calculation rules

Every KPI must declare:

1. source event(s)
2. time window
3. timezone
4. aggregation method
5. role visibility
6. exclusions/cancellations policy
7. data freshness
8. missing-data behavior

The reporting layer must not infer a completed event solely because a UI button was clicked. A completed KPI event requires authoritative backend/database evidence.

## Search integration

Global Search should return authorized patient and appointment context and link directly to the relevant timeline/workflow. Search must respect RLS/permission scope before returning records.

## Date/time everywhere

All major application shells should expose the current clinic date/time context and all workflow events should display their authoritative execution time where operationally useful.

Store canonical timestamps in a consistent timezone strategy and render them using the clinic/user display policy. Avoid client-generated timestamps for audit/KPI evidence.

## Reports

Daily reports should be generated from these events. A Frontdesk daily report must include what the operator actually completed, with execution timestamps and exceptions. Doctor reports use the same event model. Management and Owner reports aggregate department-level events into KPI and exception summaries.

## Privacy

Patient identity and event details are visible only within the viewer's authorized scope. Owner/Management visibility may be broader, but broad access must still be enforced server-side.

## Certification requirements

E2E must prove at minimum:

1. booking creates authoritative appointment event
2. payment completion creates payment event
3. check-in creates check-in event
4. frontdesk handoff creates sent-to-doctor event
5. doctor start/completion creates clinical events
6. timestamps persist and render correctly
7. patient card shows authorized identity context
8. KPI aggregation reflects real events
9. unauthorized roles cannot retrieve hidden patient/event data
10. responsive views preserve authorized workflow visibility on mobile/tablet/desktop
