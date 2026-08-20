# AZAAD — Central Scheduling + Clinical AI V2

## Clinical AI session assessment

The Doctor/Therapist workspace must support an AI-assisted, clinician-controlled question center for psychiatry, addiction treatment and behavioral/psychological therapy workflows.

### Evidence rules
- Questions come from approved clinic libraries, permitted open/licensed evidence-based instruments, clinician-authored questions, or AI candidate questions.
- Every question shows source organization, publication/title, URL or citation metadata, instrument/version, evidence type and license/reuse status where applicable.
- Copyrighted/restricted books and journals are not copied into the system without permission. Metadata/link may be retained.
- AI-generated candidates are clearly labeled and require clinician approval before entering a shared clinical library.
- Validated instruments retain their official scoring rules. Arbitrary AI-generated questions must never be presented as a validated diagnostic score.

### Session behavior
At session start, show a prominent measurement summary when valid data exists:
- current score
- baseline score
- previous-session score
- change from baseline
- change from previous visit
- completion percentage
- trend state: improving / stable-mixed / worsening / insufficient data
- chart of historical measurements by visit/date

As answers are entered, update the configured score and chart in real time when the instrument supports it.

### Question management
Authorized clinicians can:
- favorite/unfavorite
- add
- edit
- archive/delete according to policy
- pin to templates
- categorize
- view source/provenance
- view version history
- approve/reject AI candidates

All shared-library changes are audited.

### Adaptive questions
The AI may propose a different question set for each session using authorized longitudinal context, session type, previous unanswered domains, clinician preferences and approved evidence sources. The clinician remains in control.

### Clinical alerts
Rules can flag:
- worsening score trend
- repeated worsening
- missing required assessment/follow-up
- missed appointment
- explicitly documented safety concern
- insufficient data

Every alert includes the evidence/reason and instructs the clinician to follow the clinic's approved safety workflow. AI never autonomously diagnoses, prescribes, determines suicide/self-harm disposition, changes treatment, closes a case, or transfers a patient.

### Follow-up
From the same session/patient view the clinician can select a next date/time, request an AI slot suggestion, select service/session type and create a follow-up through the central scheduling workflow.

## Central scheduling

AZAAD must have one authoritative appointment model and scheduling service. Doctor, Frontdesk/Secretary, Patient Dashboard and central Calendar all call the same workflow/API.

### Universal calendar
Every authorized employee has a role-scoped calendar with:
- past appointments
- current/in-progress appointments
- future appointments
- date
- time
- clinician
- service/session
- status
- follow-up state

Views: day, week, month, and mobile agenda.

### Appointment creation
Appointments may originate from:
- Doctor workspace
- Frontdesk/Secretary workspace
- Patient Dashboard where allowed
- Patient 360
- Central Calendar

All paths use the same authorization, conflict detection, audit and notification behavior.

### Patient/Admin synchronization
Patient Dashboard and Administration must read/write the same authoritative appointment record. A booking created from one side must become visible on the other side after the normal consistency path, with no duplicate shadow appointment stores.

### Universal search
Every authorized workspace has a central search control for permitted:
- patients
- appointments
- booking IDs
- clinicians
- dates/times
- services

Search results are authorization-filtered before display. Opening an appointment deep-links to the appropriate scoped patient/appointment context.

### Date/time everywhere
The global application shell/page header must display current clinic-local date/time context. Appointment records store an unambiguous instant plus timezone policy and display clinic-local time consistently across desktop, laptop, tablet and mobile.

## Responsive UX

Calendar and clinical assessment must be application-grade at mobile, tablet, laptop and desktop sizes. Critical actions remain discoverable; responsive layouts reorganize controls rather than silently removing authorized functionality.

## Certification gates

Clinical:
- patient-scope authorization
- role authorization
- evidence/source provenance
- licensing/reuse checks
- official scoring where applicable
- live score/chart calculation
- longitudinal trend persistence
- adaptive AI candidate labeling
- clinician approval gate
- safety-alert evidence
- follow-up integration
- AI-off fallback
- audit
- responsive E2E

Scheduling:
- central appointment record
- doctor-created appointment E2E
- frontdesk-created appointment E2E
- patient-to-admin synchronization E2E
- conflict/overlap test
- search authorization test
- past/current/future calendar test
- timezone consistency
- responsive calendar test

## AI governance

AI follows:
`Observe → Analyze → Recommend → Prepare → Human Approval → Execute only if policy permits → Audit`

Healthcare AI must augment rather than replace clinical judgement and must provide transparency, accountability and human oversight. This is consistent with WHO AI-for-health guidance.
