# Post-Scan Continuation Boundary

After each merged root-scan repair, the next task starts from the resulting `main` SHA. Completed evidence is carried forward; it is not re-run without a new change or an explicit release gate.

## Required sequence

1. Root scan current `main`.
2. Compare findings with the canonical ownership map.
3. Separate active defects from historical evidence.
4. Remove duplicate ownership and stale instructions before adding new implementation.
5. Make the smallest bounded repair.
6. Verify the changed boundary with fresh evidence.
7. Merge only after the relevant gate is proven.
8. Re-scan from the new `main` SHA.

## Parallel work rule

Independent investigations may proceed in parallel when the available tooling supports it, but writes to the same file, branch, runtime boundary, or database target must remain serialized. Parallelism must never create competing canonical owners or unverified overlapping mutations.

## No-loop rule

Do not reopen a closed DR phase, repeat a successful historical certification run, recreate a removed Supabase runtime, add a duplicate controller/service/workflow, or weaken a failing gate merely to obtain green status.
