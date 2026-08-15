# AZAAD CLINIC — CLINICIAN AI SESSION ASSESSMENT SPEC

## Purpose

Add a clinician-controlled AI-assisted session assessment workspace inside the Doctor/Therapist patient view. It supports structured questioning, live session scoring, longitudinal trends, follow-up scheduling, clinician transfer, and safety-aware alerts without allowing AI to diagnose, prescribe, or independently change care.

## 1. Session Question Center

During an active session, the clinician sees a focused question queue generated from:

1. Approved clinic question libraries.
2. Licensed/open-access evidence-based instruments where reuse is permitted.
3. Clinician-authored questions.
4. AI-generated candidate questions that require clinician approval before entering the clinic library.

Every question displays:

- Question text.
- Clinical domain/topic.
- Source/reference metadata.
- Version.
- Optional explanation for why it was suggested.
- Response controls: ✅ Yes/Present/Improved and ❌ No/Absent/Not improved where appropriate.
- Optional structured response such as frequency/severity when the instrument supports it.
- Optional clinician note.
- Skip / Not assessed.

The system must not invent a validated score by pretending an arbitrary AI question is a validated instrument. Validated instruments retain their official scoring rules and licensing constraints.

## 2. Live Session Dashboard

As the clinician records answers, calculate the configured score immediately when the selected instrument permits real-time scoring.

Show:

- Current score.
- Baseline score.
- Previous-session score.
- Change from baseline.
- Change from previous visit.
- Completion percentage.
- Answered / remaining questions.
- Domain-level summary.
- Trend chart.

Use clear states:

- 🟢 improving trend.
- 🟡 stable / mixed trend.
- 🔴 worsening trend.
- ⚪ insufficient data.

These are trend/measurement signals, not autonomous diagnoses.

## 3. Longitudinal Patient View

Patient 360 should show the approved assessment history by visit:

- Date.
- Clinician.
- Instrument/question set.
- Score.
- Baseline comparison.
- Previous-visit comparison.
- Trend graph.
- Clinician interpretation.
- Follow-up date.
- Safety flags when explicitly documented.

Allow the clinician and authorized management roles to compare multiple visits while preserving patient-scope and role permissions.

## 4. Clinical Alerts

Generate non-diagnostic alerts from explicit rules and recorded measurements, for example:

- Significant worsening compared with configured baseline.
- Repeated worsening across visits.
- Missing required follow-up assessment.
- Missed appointment / no-show.
- Documented safety concern requiring clinician review.
- Treatment-response trend not improving as expected according to the selected measurement framework.

Alerts must state the reason and evidence. They must never silently label a patient with a diagnosis or make a disposition decision.

For safety-related responses, the system must explicitly instruct the clinician to follow the clinic's approved emergency/safety workflow rather than giving an autonomous disposition.

## 5. Clinician Question Library

Doctors/therapists can:

- Add question.
- Edit question.
- Archive/delete question according to permissions.
- Favorite ⭐.
- Pin to a session template.
- Categorize by domain.
- Create session templates.
- Duplicate an approved question.
- Mark AI-generated candidate as approved/rejected.
- View source/provenance.
- View version history.

Changes to shared clinical libraries are audited with actor, timestamp, previous value, new value, and reason where required.

## 6. AI Question Generation

AI may propose questions based on:

- Session type.
- Patient's documented goals.
- Previous unanswered domains.
- Previous measurement trends.
- Approved clinician preferences.
- Approved clinical knowledge sources.

AI-generated questions must be labeled `AI candidate` until a clinician approves them for clinical use.

AI must not generate a question that implies a diagnosis as fact, pressures the patient toward a specific answer, or substitutes for a validated instrument.

## 7. Evidence and Source Management

Each question/instrument stores provenance:

- Source organization.
- Publication title.
- URL.
- Publication/update date.
- License/reuse status.
- Evidence type.
- Instrument/version.
- Last verification date.

Do not ingest copyrighted books, paid journals, or restricted conference material merely because a browser can access them. For restricted material, store metadata/link only unless permission exists.

## 8. Follow-up Scheduling

From the same patient/session view, the clinician can:

- Select next session date/time.
- Request AI scheduling suggestion based on clinic rules and available slots.
- Choose session/service type.
- Add follow-up reason.
- Set reminder preference where supported.
- See upcoming appointments.
- See overdue follow-ups.

The existing follow-up widget already provides a doctor-side scheduling path and creates the appointment for front desk/management visibility. Extend it rather than duplicating scheduling logic.

## 9. Clinician Transfer

From Patient 360/session view, authorized clinicians can:

- Select another active doctor/therapist.
- Select transfer reason.
- Add transfer notes.
- Request an AI scheduling suggestion.
- Create the next appointment after approval.
- Notify the appropriate team.
- Preserve longitudinal history.

The existing clinician-transfer widget already supports this workflow and should be extended rather than replaced.

## 10. Treatment Response and Encouragement

The clinician workspace should communicate trends respectfully:

- If measurements improve: `🟢 التحسن مستمر — راجع العوامل التي قد تكون ساعدت.`
- If stable: `🟡 المؤشرات مستقرة — راجع الخطة والأهداف مع المريض.`
- If worsening: `🔴 توجد مؤشرات تراجع — يرجى مراجعة التقييم السريري وخطة المتابعة.`
- If incomplete: `⚪ البيانات غير كافية لتحديد اتجاه واضح.`

The AI must avoid congratulating a clinician for a clinical outcome as though it were responsible for the treatment. It should support reflective review.

## 11. Session UX

The active session view should be fast and low-distraction:

- One-question-at-a-time mode.
- Compact checklist mode.
- Keyboard shortcuts where appropriate.
- Large touch targets.
- Sticky score/trend summary.
- Autosave with clear saved state.
- Offline-safe draft state only when technically safe; never pretend a clinical submission was saved remotely when it was not.
- Arabic/English.
- Mobile/tablet/desktop.

## 12. Roles

### Doctor/Therapist

- Conduct session.
- Answer questions.
- Review trends.
- Add clinical notes.
- Approve AI candidate questions.
- Schedule follow-up.
- Request transfer.

### Clinical Supervisor

- Review templates.
- Approve shared question libraries.
- Review aggregate measurement trends.
- Audit unusual changes.

### Administration

- View permitted operational summaries.
- View appointment/follow-up compliance.
- Never edit clinical answers unless explicitly authorized by policy.

## 13. AI Safety Boundary

AI cannot autonomously:

- Diagnose.
- Prescribe/change medication.
- Change treatment plan.
- Determine suicide/self-harm disposition.
- Close a clinical case.
- Override clinician documentation.
- Transfer a patient without authorized human approval.

Every clinical AI suggestion must be visibly marked as AI-generated and traceable to its source/rule when applicable.

## 14. Definition of Done

A clinician assessment feature is complete only when it has:

- Patient-scope authorization.
- Role-based authorization.
- Audit trail.
- Source provenance.
- Instrument licensing checks.
- Live score calculations using official scoring rules where applicable.
- Longitudinal trend storage.
- Follow-up integration.
- Clinician transfer integration.
- Arabic/English UI.
- Mobile/desktop verification.
- AI-off fallback.
- Regression tests.
- Production verification.
