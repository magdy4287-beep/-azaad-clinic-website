# AZAAD — Procurement + Marketing Studio Specification

## 1. Procurement & Inventory — Hybrid Operations

Procurement is a governed hybrid capability:

**Human requester/operator + AI procurement copilot + management/owner controls**

### Frontdesk purchasing

The unified Frontdesk/Secretary may create purchase requests and, where explicitly permitted, record purchases made for:
- clinic operations
- administration
- approved office/consumable needs

The Secretary must NOT be able to change the authoritative price/catalog/supplier pricing rules.

### Price governance

Only authorized Management/Owner users may:
- create or edit item master pricing
- change approved purchase prices
- change supplier pricing
- approve exceptional price overrides
- change budget/category controls

Secretary/Frontdesk can enter the actual transaction details they observed, but cannot rewrite the authoritative catalog price.

### Procurement item model

Every item should support:
- item name
- SKU/code
- category
- unit
- description
- supplier
- supplier SKU
- approved unit price
- tax/discount fields where applicable
- minimum stock
- reorder point
- current quantity
- requested quantity
- requestor
- department/purpose
- clinic/admin/owner allocation
- purchase date
- receipt/document attachment
- status
- approval history
- audit history

### AI Procurement Copilot

AI may:
- classify items
- detect duplicate items
- compare historical prices
- flag unusual price changes
- suggest reorder quantities
- identify low stock
- summarize supplier performance
- prepare purchase requests
- summarize monthly procurement spend

AI may NOT:
- approve its own purchase recommendation
- change authoritative prices
- silently create financial commitments
- bypass approval/budget controls

### New items

Authorized Management/Owner users can add new item categories, products, suppliers and rules. The UI must not assume a fixed product list.

---

## 2. Marketing Studio — Instagram-class Media Workspace

Marketing Studio is a first-class application surface, not a small text form.

### Access

Visible only to:
- Marketing role
- Management/Admin
- Owner

Marketing users receive marketing-only navigation and data scope. They do not see unrelated Administration, HR, Finance, Security or Owner controls.

### Media creation

Support:
- long-form video
- short video
- images
- multiple images
- captions
- campaign metadata
- hashtags
- links
- thumbnails/covers
- drafts
- revisions
- scheduling
- approval state

The media composer should use the largest practical workspace area and preserve a large preview/editor surface so long videos are usable.

### Media sources

Users can:
- upload from phone
- upload from tablet
- upload from laptop/desktop
- paste a URL to supported public media
- add image/video assets from future connected sources

URL imports must be validated and treated as untrusted input. Never execute remote content in the application context. Store normalized metadata and an approved media reference rather than blindly embedding arbitrary HTML.

### Workflow

`DRAFT → AI_ASSISTED → READY_FOR_REVIEW → MANAGEMENT_APPROVAL → SCHEDULED/PUBLISHED`

Management/Owner can approve publication.

Marketing employee can prepare, edit and submit campaigns but cannot approve their own sensitive publication when policy requires management approval.

### Campaigns

Support:
- campaign creation
- campaign objectives
- target audience
- channels
- content variants
- media assets
- start/end date
- budget metadata
- approval workflow
- scheduled posts
- performance metrics
- campaign report

### Connected channels

Existing configured channels should be represented through a provider abstraction rather than hard-coded one-off buttons:
- Facebook
- Instagram
- LinkedIn
- TikTok
- Website

Future channels can be added by registering a provider/capability without redesigning the Marketing Studio.

The UI must show connection status and required permissions. It must not claim a post was published unless the channel integration returns verified publication evidence.

### AI Marketing Copilot

AI can prepare:
- captions
- hooks
- creative variants
- hashtags
- campaign concepts
- content calendar
- audience insights
- performance summaries
- A/B test suggestions
- repurposing plans

Human approval controls publication.

### Free-first requirement

Core Marketing Studio works without paid AI. AI features degrade gracefully to deterministic templates/rules or clearly show unavailable AI assistance.

---

## 3. Unified Media/Content Architecture

Use a reusable media asset model across Marketing, Patient communications and future modules.

Suggested lifecycle:

`UPLOADED → VALIDATED → READY → USED_IN_DRAFT → APPROVED → PUBLISHED → ARCHIVED`

Track:
- uploader
- source
- MIME/type
- size/duration
- checksum
- dimensions
- thumbnail
- storage reference
- source URL when applicable
- created/updated timestamps
- audit events

Large video upload should use resumable/direct-to-storage upload where supported rather than routing large media through the application server.

---

## 4. Responsive Marketing UX

Marketing Studio must work as a true application on:
- mobile
- tablet
- laptop
- desktop

On mobile, controls reorganize into reachable navigation and panels. On desktop, the editor/preview gets maximum practical width.

No authorized Marketing action should disappear merely because the viewport is narrow; actions move into explicit menus/drawers with visible labels and accessible touch targets.

---

## 5. Certification

Procurement tests:
- Secretary can create allowed request/transaction
- Secretary cannot change authoritative price
- Management/Owner can change price
- New item creation works
- Audit records price changes
- AI cannot approve/commit purchase
- RLS and role scope are enforced

Marketing tests:
- Marketing sees only Marketing workspace
- Marketing cannot access unrelated Admin/Finance/HR data
- Media upload works
- URL import validation works
- Long video UI remains usable
- Draft/edit workflow works
- Marketing cannot self-approve restricted publication
- Management/Owner approval works
- Publication evidence is verified
- Unknown/future channel can be registered without changing core UI
- AI assistance remains non-authoritative
- Mobile/tablet/desktop layouts pass overflow/touch/accessibility checks
