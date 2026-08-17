# AZAAD Free Password Security Control

## Purpose

Provide a free replacement for Supabase's Pro-only leaked-password control without sending a user's password or full password hash to a third party.

## Control

For password-change and future signup flows, AZAAD must:

1. Require at least 12 characters.
2. Check the complete candidate password locally with SHA-1.
3. Send only the first 5 hexadecimal SHA-1 characters to the free Have I Been Pwned Pwned Passwords range API.
4. Compare the returned suffixes locally.
5. Reject the password when the full hash suffix is present.
6. Never log, persist, or transmit the plaintext password or full SHA-1 hash.
7. Never run this check on ordinary login, because the purpose is to prevent selecting a compromised password, not to disclose whether an existing credential is compromised.

## Current implementation

- `password-security.js` — reusable k-anonymity checker.
- `change-password.html` — authenticated password-change flow using the checker before `supabase.auth.updateUser({ password })`.

## Limitation

This is an AZAAD application-level control. It does **not** make Supabase's native `Prevent use of leaked passwords` setting show as enabled on a Free Supabase plan. The Supabase Advisor item remains a documented plan limitation until the project is moved to a plan that supports the native control.

## Evidence

Have I Been Pwned documents that the Pwned Passwords API is free, does not require an API key, and uses k-anonymity by sending only the first five SHA-1 characters of the password hash.
