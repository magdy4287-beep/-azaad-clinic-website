# AZAAD — Cross-Department Operational Contract

## Scheduling
- Unified secretary view: one row per active doctor, showing photo, name, job title and that doctor's appointments in chronological order.
- Calendar/date navigation is the source of the displayed date; no artificial 1–12 appointment ceiling.
- Free slots are explicit and bookable by authorized front-desk/doctor users.
- Waiting list is first-class and connected to doctor/service/date preferences.
- Clicking an appointment opens an inline workflow; check-in, payment verification, sending to doctor, start/end session and follow-up actions do not require leaving the schedule page.
- Early/late arrival may be checked in when the doctor is available; the system records actual timestamps and does not rewrite the original appointment time.

## Doctor transfer
- Patient or treating doctor may request transfer to another in-clinic doctor.
- Treating doctor approval is mandatory before completion.
- Transfer preserves patient, booking and audit history.

## Doctor working time
- Weekly schedule, closures, breaks and overrides determine availability.
- Attendance clock-in/out and breaks are stored separately from scheduled hours.
- Attendance, lateness and absence flow into daily/monthly/yearly reports and authorized compensation calculations.

## Compensation
- Owner/management controls doctor compensation.
- Supported models: percentage only, fixed salary, salary + percentage, fixed-per-visit.
- Compensation is effective-dated and auditable.
- Pricing may be controlled globally or per doctor/service by authorized management/owner roles.

## Services
- One canonical service catalog is used across booking, doctor workspace, invoices and reports.
- Duplicate definitions must be merged/archived safely, preserving historical invoice references.
- Authorized users can add, edit, archive and reorder services.

## Reporting / AI
- Daily operational reports combine appointments, check-ins, waiting list, invoices, collections, refunds, expenses, attendance and compensation signals.
- Monthly/yearly rollups derive from the same source facts.
- Central free/local AI reads report facts and produces traceable recommendations; it never autonomously approves refunds, transfers, clinical decisions, payroll changes or pricing changes.
- Employee-of-month/year recommendations are based on explicit measurable criteria and remain management decisions.

## Acceptance
A feature is not complete merely because a table, button or tab exists. It must work end-to-end through UI → authorization → database/function → validation → audit → bilingual UI → verification, consistent with the AZAAD master definition of done.