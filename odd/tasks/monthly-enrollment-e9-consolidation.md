# Monthly Enrollment E9 — Supplier Consolidation

Objective: admin read model and screen that totals, per supplier, the materials to buy for a month, with a deterministic copyable summary and a bulk "Marcar como solicitado". Branch `feat/monthly-enrollment-e9-consolidation`, stacked on `feat/monthly-enrollment-e8-admin` (PR #123). Spec: `openspec/changes/monthly-enrollment/specs/supplier-consolidation/spec.md`. Risk: low (admin-gated read model; the bulk action reuses the existing `markMaterialsRequestedBulk`).

## Tasks

- [x] E9-1: `AdminEnrollmentStore.consolidationLines` (port, in-memory fake, Drizzle query) with a shared contract test for stored period, excluded states and the pending count; `createSupplierConsolidationService` (grouping, Money sums, deterministic summary, `denied`/`invalid`/`unavailable`). Commit `dce3bd2`.
- [x] E9-2: consolidation view (`fca5e13`) and `/admin/inscripciones/materiales` route wired in composition, `routes.ts` and the list header link (`c23e6ce`).

## Evidence

- Unit+ui projects: 262 files / 2947 tests pass; typecheck (needs `NODE_OPTIONS=--max-old-space-size=8192` now), eslint on `src`, and format:check pass.
- The Drizzle `consolidationLines` query is covered by the shared store contract in `drizzle-admin-enrollment-store.db.test.ts`, which could not run locally: the `db` project crashes its worker with native exit code `3221226505` (0xC0000409) on this Windows host. Confirm in CI.
- Supplier grouping keys on supplier id plus the snapshot name, so a renamed supplier keeps its snapshot group.
