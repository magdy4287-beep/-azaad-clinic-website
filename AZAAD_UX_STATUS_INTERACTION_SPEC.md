# AZAAD — UX Status, Inline Workflow & Interaction Specification

## 1. One-page patient workflow

Where role permissions allow it, clicking/tapping a patient's name opens the patient context without forcing the user through unnecessary page changes.

The preferred flow is:

`Patient Name → Patient Context → Appointment → Payment → Check-in → Doctor Handoff → Visit → Follow-up`

Actions that can safely complete in the current workflow should update the same page/context immediately and refresh the authoritative state. Navigation to a dedicated screen is reserved for workflows that genuinely need a larger workspace.

## 2. Patient identity header

The patient header remains visible while operating on the current patient when practical and includes:

- Patient name
- DOB / age according to permission
- Patient identifier
- appointment date/time
- assigned doctor
- current status
- next action

The patient name is a first-class interactive target with keyboard and touch support.

## 3. Universal date/time

Every operational page must have access to the clinic's current date/time context. Workflow events show their authoritative execution time.

Use:
- canonical server timestamps for audit/KPI events
- clinic timezone for display
- explicit date/time formatting
- no client clock as the source of truth

Important actions display their completion time immediately after successful backend confirmation.

## 4. Immediate feedback

Every command must provide visible feedback:

`User Action → Pending → Backend Confirmation → Success/Error`

Use status semantics:

- `⏳` Pending / processing
- `✅` Successfully completed
- `❌` Failed / rejected / not completed
- `⚠️` Warning / attention required
- `ℹ️` Informational

Never display `✅` before authoritative backend confirmation.

Example:

`💵 Payment: ❌ Not paid`

becomes

`💵 Payment: ⏳ Processing`

then, after confirmation:

`💵 Payment: ✅ Paid · 10:42`

If payment is rejected, retain:

`💵 Payment: ❌ Failed · 10:42`

with an actionable reason when safe to expose.

## 5. Appointment state system

Appointment status is represented by semantic state tokens rather than relying on color alone.

Canonical states:

- `AVAILABLE` — available slot
- `PENDING` — booking/request pending confirmation
- `CONFIRMED` — confirmed appointment
- `CHECKED_IN` — patient checked in
- `WAITING_FOR_DOCTOR` — checked in and waiting for clinical handoff/start
- `IN_SESSION` — visit/session in progress
- `COMPLETED` — visit completed
- `FOLLOW_UP_REQUIRED` — completed visit with follow-up required
- `FOLLOW_UP_SCHEDULED` — next appointment scheduled
- `CANCELLED` — cancelled
- `NO_SHOW` — patient did not attend
- `PAST_COMPLETED` — historical completed appointment

The UI must show both a label/icon and an accessible semantic state. Color is a secondary visual cue, never the only signal.

Recommended visual token mapping:

- AVAILABLE → neutral/teal
- PENDING → amber
- CONFIRMED → blue
- CHECKED_IN → green
- WAITING_FOR_DOCTOR → purple
- IN_SESSION → indigo
- COMPLETED → dark green
- FOLLOW_UP_REQUIRED → orange
- FOLLOW_UP_SCHEDULED → teal
- CANCELLED → red
- NO_SHOW → red/orange
- PAST_COMPLETED → neutral gray

Exact theme colors must come from the central design token system and pass contrast/accessibility checks.

## 6. Status interaction

Appointment cards should expose the current state at a glance and provide only the actions authorized for the current user.

Examples:

`🟡 PENDING · 17:30`
`🔵 CONFIRMED · 17:30`
`🟢 CHECKED-IN · 17:31`
`🟣 WAITING FOR DOCTOR · 17:36`
`🔷 IN SESSION · 17:45`
`✅ COMPLETED · 18:20`
`🟠 FOLLOW-UP REQUIRED`
`📅 FOLLOW-UP SCHEDULED · Aug 26 17:30`

## 7. Action history

Important actions should append to the patient/appointment timeline rather than silently changing a badge.

Example:

`💵 Payment ✅ · 17:02 · Frontdesk`
`📤 Sent to Dr. X ✅ · 17:08 · Frontdesk`
`🟢 Check-in ✅ · 17:10 · Frontdesk`
`🩺 Session started ✅ · 17:18 · Doctor`

Each event is backed by an authoritative event/audit record.

## 8. Fast interaction

UX should minimize unnecessary navigation and repeated loading:

- preserve patient context during multi-step work
- update only affected data after successful mutations
- use optimistic visual pending state only when safe, then reconcile with server truth
- avoid full-page reloads for ordinary workflow transitions
- disable duplicate submission while a command is processing
- provide clear retry behavior after failure
- keep search context where possible

Performance targets should be measured rather than promised. Core UI interactions should feel immediate, while authoritative completion is explicitly tied to backend confirmation.

## 9. Search + patient navigation

Search results should expose enough context to choose the correct patient/appointment without opening multiple pages, subject to role permissions.

Click/tap on the patient name should open the patient context and preserve the originating workflow where possible.

## 10. Responsive behavior

Desktop, laptop, tablet and mobile must retain the same workflow semantics.

On narrow screens:
- status remains visible
- date/time remains visible for the active workflow
- actions move into explicit reachable controls
- patient name remains a primary navigation target
- timelines become vertical
- appointment states remain labeled

No authorized function may disappear silently because of viewport width.

## 11. Accessibility

Status must not rely on color alone. Every status requires:

- text label
- accessible name
- icon/semantic indicator where appropriate
- keyboard focus
- touch target suitable for mobile

Animations must not be required to understand state.

## 12. Certification

E2E must verify:

1. patient name opens patient context
2. multi-step actions can continue without unnecessary page navigation
3. payment displays pending then confirmed failure/success from server evidence
4. check-in displays success and authoritative time
5. doctor handoff displays success and time
6. appointment state transitions render correctly
7. follow-up state is represented after session completion
8. all status states remain understandable without color
9. duplicate actions are prevented during processing
10. responsive layouts preserve authorized actions
11. unauthorized users cannot perform hidden state transitions through direct requests
12. KPI/report events use the same authoritative transition events
