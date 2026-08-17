# AZAAD API Contract — Core Edge Functions

Source of truth: implementation at commit `a196c61a9f9f06481b541b367841872ee7ee5a32`.

## `azaad-frontdesk-checkin`

### POST
Authentication: `Authorization: Bearer <token>` is required.

Request JSON:
- `booking_id` — required string after trim.
- `notes` — optional.

Responses:
- `200` — `{ "ok": true, "data": <RPC result> }`
- `400` — `invalid_json` or `booking_id_required`.
- `401` — `authentication_required`.
- `403` — RPC authorization failure (`NOT_AUTHORIZED` / `permission_denied`).
- `404` — RPC `NOT_FOUND`.
- `409` — other RPC failure.

### OPTIONS
CORS preflight is supported.

## `azaad-patient-lookup`

### GET
Query parameter:
- `phone` — required.

### POST
JSON field:
- `phone` — required; when present it overrides the query value.

Responses:
- `200` not found — `{ "found": false, "normalized_phone": "..." }`.
- `200` found — `{ "found": true, "patient": { "id": "...", "mrn": "...", "patient_name": "...", "patient_phone": "...", "active": true }, "upcoming_bookings": [...] }`.
- `400` — `PATIENT_PHONE_REQUIRED` or `INVALID_PHONE`.
- `405` — `{ "error": "Method not allowed" }`.
- `500` — `{ "error": "..." }`.

### OPTIONS
CORS preflight is supported.

## Security contract

- Service-role access is server-side only.
- `azaad-frontdesk-checkin` requires an authenticated bearer token before invoking the privileged RPC.
- No production patient, booking, payment, or refund data is used as CI test fixtures.
