"""Fail-closed contract for the AZAAD universal database identity.

The UUID is a logical, non-secret identity for the canonical AZAAD database.
Physical database connection identity remains a separate runtime concern and is
verified by the existing target-fingerprint controls.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "azaad-database-identity.json"
CORE = ROOT / "azaad-core-context.js"
UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def fail(message: str) -> None:
    raise SystemExit(f"DATABASE IDENTITY CONTRACT FAILED: {message}")


if not CONFIG.is_file():
    fail(f"missing canonical identity file: {CONFIG}")
if not CORE.is_file():
    fail(f"missing core context: {CORE}")

try:
    identity = json.loads(CONFIG.read_text(encoding="utf-8"))
except json.JSONDecodeError as exc:
    fail(f"identity file is not valid JSON: {exc}")

uuid_value = identity.get("database_uuid")
if not isinstance(uuid_value, str) or not UUID_RE.fullmatch(uuid_value):
    fail("database_uuid must be a valid UUID")

if identity.get("schema") != "azaad.database-identity.v1":
    fail("unsupported identity schema")
if identity.get("identity_scope") != "logical-production-database":
    fail("identity_scope must be logical-production-database")
if identity.get("authority") != "AZAAD":
    fail("authority must be AZAAD")

core = CORE.read_text(encoding="utf-8")
expected_literal = f"const DATABASE_UUID = '{uuid_value}';"
if core.count(expected_literal) != 1:
    fail("core context must expose exactly one canonical DATABASE_UUID")
if "databaseUuid: DATABASE_UUID" not in core:
    fail("core context must publish databaseUuid")

# Optional CI/runtime override is useful for environments that keep configuration
# in a secret manager. If supplied, it must be exactly the same UUID.
override = os.environ.get("AZAAD_DATABASE_UUID", "").strip()
if override and override.lower() != uuid_value.lower():
    fail("AZAAD_DATABASE_UUID does not match canonical database_uuid")

print(f"Universal AZAAD database UUID contract: PASS ({uuid_value})")
print("Logical identity is centralized; physical target remains separately fingerprint-gated.")
