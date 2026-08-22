#!/usr/bin/env bash
set -euo pipefail

# Free-only, provider-neutral integrity gate.
# Usage: ./scripts/azaad-dr-preflight.sh <artifact> <expected-sha256>
# No secrets are accepted or printed by this script.

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <artifact> <expected-sha256>" >&2
  exit 2
fi

artifact="$1"
expected="$2"

if [[ ! -f "$artifact" ]]; then
  echo "FAIL-CLOSED: artifact not found: $artifact" >&2
  exit 1
fi

if [[ ! "$expected" =~ ^[0-9a-fA-F]{64}$ ]]; then
  echo "FAIL-CLOSED: expected SHA-256 must be exactly 64 hexadecimal characters" >&2
  exit 1
fi

actual="$(shasum -a 256 "$artifact" | awk '{print tolower($1)}')"
expected="$(printf '%s' "$expected" | tr '[:upper:]' '[:lower:]')"

if [[ "$actual" != "$expected" ]]; then
  echo "FAIL-CLOSED: SHA-256 mismatch" >&2
  echo "Expected: $expected" >&2
  echo "Actual:   $actual" >&2
  exit 1
fi

echo "PASS: artifact SHA-256 verified"
echo "Artifact: $artifact"
