# AZAAD CLINIC — NEXT-GEN SOCIAL + CLINICAL AI PLAN

## 1. Marketing Studio — social channels

The Marketing Studio must support the channels already represented in the admin workspace and explicitly include:

- Instagram
- Facebook
- TikTok
- LinkedIn
- Website

The publishing composer should remain a large, fast, media-first workspace with:

- Image upload and preview.
- Video upload and preview.
- Drag and drop.
- Caption/description.
- Channel selection per post.
- Per-channel caption variants when needed.
- Drafts.
- Scheduled posts.
- Published history.
- Archive/delete.
- Edit existing posts.
- Search and filtering.
- Media library.
- CTA/link fields.
- Hashtag suggestions.
- AI-generated content suggestions.
- Human review before publication.

### Channel-aware content

The AI Marketing Team should adapt recommendations to the selected channel instead of blindly copying one post everywhere:

- Instagram: visual-first caption, hashtags, carousel/reel concepts.
- Facebook: community-oriented copy, offers, longer context.
- TikTok: short-form video hook, scene/script suggestions and concise caption.
- LinkedIn: professional/clinical education, employer branding and clinic expertise.
- Website: SEO-friendly article/offer/landing-page content.

The core system must not require paid social APIs. Publishing integrations are optional adapters; the content management workflow continues to work without them.

## 2. Patient-facing professional identity

### Patient avatar refresh

Replace the current sick/patient-style green emoji with a friendly, attractive, modern patient icon/avatar:

- Friendly smiling face.
- Warm, welcoming appearance.
- Accessible and professional.
- No illness or distress symbolism.
- Works in light/dark backgrounds.
- Consistent with the clinic visual identity.

Use a local SVG/CSS asset where practical so it is fast and does not depend on a remote image service.

### RCM Director profile

Add a dedicated professional profile slot alongside doctor profiles in the patient-facing experience:

**RCM Director**

The profile must support later configuration of:

- Employee photo.
- Full name.
- Job title.
- Short professional biography.
- Contact/communication role where authorized.
- Department.
- Display order.
- Active/inactive state.

Do not hard-code a real person's identity until management supplies the approved profile data/photo.

The UI should visually distinguish clinical staff from operational/RCM leadership while keeping the presentation cohesive.

## 3. AI Clinical Knowledge & Education Center

AI gets a dedicated professional workspace for continuous clinical education. It is not a replacement for clinicians and it must never silently change patient care.

### Daily knowledge workflow

The system should periodically discover and summarize new, authoritative clinical information from sources that explicitly permit reuse/AI processing or provide suitable machine-readable/open-access content.

Priority domains:

- Psychiatry.
- Depression.
- Anxiety.
- Addiction and substance-use disorders.
- Psychotherapy.
- CBT and structured psychological interventions.
- Suicide/self-harm safety guidance.
- Bipolar and psychotic disorders.
- Sleep and mental health.
- Child/adolescent mental health where relevant to clinic scope.
- Recovery, relapse prevention and psychosocial care.
- Measurement-based care and longitudinal outcomes.

### Source hierarchy

Prefer, in order:

1. Official open guidelines and evidence resources from WHO and other public health authorities.
2. Official guideline updates and evidence summaries with explicit reuse/AI permissions.
3. Open-access peer-reviewed research and repositories.
4. Conference material only when the material is publicly available and reuse/processing is permitted.
5. Other sources only when licensing and provenance are clear.

Never scrape or ingest copyrighted books, paid journals, conference recordings, or restricted material into a model merely because it is accessible to a browser.

### Daily briefing

Each clinician can receive a concise daily briefing:

- 🆕 What changed?
- 📚 Source and publication date.
- 🧠 Why it matters.
- 👨‍⚕️ Which clinical area it affects.
- 📈 Strength/certainty of evidence when available.
- ⚠️ Important limitations.
- 📝 Suggested discussion/learning question.
- 🔗 Source link.

The system must distinguish:

- Guideline recommendation.
- Evidence summary.
- Research finding.
- Educational interpretation.
- AI-generated suggestion.

### Clinician-friendly behavior

The AI should be intelligent, calm, respectful and pleasant:

- Never shame a clinician.
- Never claim certainty it does not have.
- Explain why a recommendation appeared.
- Allow “save for later”, “mark as reviewed”, “not relevant”, and “discuss with team”.
- Support Arabic and English.
- Avoid notification spam by grouping related updates.

## 4. Clinical safety

AI may educate and summarize but cannot autonomously:

- Diagnose a patient.
- Prescribe medication.
- Change medication.
- Decide a suicide/self-harm risk disposition.
- Change a treatment plan.
- Close a clinical case.
- Replace clinician review.

Clinical suggestions must show their source and remain clinician-owned.

## 5. Evidence update strategy

The AI Knowledge Center should maintain a source registry containing:

- Source name.
- Organization.
- Topic.
- Publication/update date.
- URL.
- License/reuse status.
- Last checked time.
- Evidence type.
- Language.
- Processing status.
- Hash/version where appropriate.

The updater should be idempotent and avoid duplicating the same source/update.

Recommended initial authoritative source families include WHO mhGAP and evidence resources. WHO's third-edition mhGAP guideline includes updated and new evidence-based recommendations across depression, anxiety, drug/alcohol use, psychosis/bipolar disorder and self-harm/suicide modules. citehttps://www.who.int/publications/i/item/9789240084278

WHO also publishes evidence resources for depression and structured psychological interventions, including CBT-based approaches. citehttps://www.who.int/teams/mental-health-and-substance-use/treatment-care/mental-health-gap-action-programme/evidence-centre/depression citehttps://www.who.int/teams/mental-health-and-substance-use/treatment-care/mental-health-gap-action-programme/evidence-centre/anxiety/brief-structured-psychological-interventions

The system should also monitor public guideline update pages. For example, NICE's adult depression guidance records subsequent amendments, including changes made in December 2025 and October 2025. citehttps://www.nice.org.uk/guidance/ng222/chapter/Update-information

APA clinical-practice-guideline pages should be treated carefully: APA states that its content is copyright protected and does not permit its content to be input into generative AI without written permission. Therefore the system should link to APA material and track metadata rather than ingesting restricted text without permission. citehttps://www.psychiatry.org/psychiatrists/practice/clinical-practice-guidelines

## 6. Free-first architecture

The knowledge center must continue to work with free/public sources and local deterministic processing where possible.

External AI models are optional adapters. If a model quota ends or an API becomes unavailable:

- Existing clinical records remain available.
- Existing operational AI insights remain available.
- The daily education feed shows the last verified knowledge set.
- The UI clearly indicates that fresh AI generation is temporarily unavailable.

## 7. Long-term enhancements

Add later, when the underlying data and permissions are ready:

- Evidence-diff alerts.
- Guideline version comparison.
- Topic watchlists per clinician specialty.
- Team journal club queue.
- Clinical education completion metrics.
- CME/CPD tracking where legally and operationally appropriate.
- De-identified outcome trends linked to treatment modalities.
- Measurement-based-care reminders.
- Patient education library reviewed by clinicians.
- Arabic medical education summaries with source links.
- Management dashboard for knowledge-update coverage.

## Definition of Done

A feature is not complete merely because the UI exists. It requires:

1. Role-based authorization.
2. Privacy-safe data boundaries.
3. Arabic/English support.
4. Auditability.
5. Deterministic fallback.
6. Source provenance for clinical knowledge.
7. Copyright/licensing checks before AI ingestion.
8. Human clinical approval where patient care could be affected.
9. Mobile and desktop verification.
10. Regression tests and production verification.
