# Admin B5: workshop turnos

- Work unit: item 9 of `openspec/changes/admin-catalog/tasks.md` (B5). ODD, BACK.
- Branch/worktree: `feat/admin-catalog-b5-turnos`, stacked on B4 commit `9b826ad`, in `../CalmaInquieta-b1b`.
- Objective: deliver monthly workshop turnos with normalized case-insensitive labels, weekday/time/capacity rules, deterministic display order, lifecycle/history protection, shared fake/Drizzle repository parity, and generated migration `0006_workshop_turnos`.
- Why: B5 replaces B4's turno placeholders and unblocks B6 period capacity/snapshot behavior.
- Requirements: item 9 of `openspec/changes/admin-catalog/tasks.md`, turno requirements in `openspec/changes/admin-catalog/specs/monthly-workshops/spec.md`, relevant design sections, and the existing contracts in `src/modules/workshops/application/contracts.ts`.
- Constraints: strict TDD (`AGENTS.md`); hexagonal boundaries; map only the expected PostgreSQL SQLSTATE 23505 label constraint to a typed result; fake and PostgreSQL ordering must be identical; test every normalization including non-ASCII case behavior. Do not edit workshop `public-*`, `src/composition/request-services.ts`, `src/app/**`, or B6 period persistence. `src/modules/workshops/index.ts` edits must be additive.
- Unicode decision: persist an NFC + `toLocaleLowerCase("es")` `labelKey` and enforce uniqueness on `(workshop_id, label_key)`; do not rely on PostgreSQL `lower()` or collation for non-ASCII races.
- Audit decision: preserve the existing public `Turno` contract without per-row audit fields. Every successful turno mutation updates the owning monthly workshop's `updatedBy`/`updatedAt`; refused mutations do not change audit. This keeps audit at the aggregate boundary and avoids an unrequested API expansion.
- History decision: B5 introduces a read-only `TurnoUsageLookup` for `usedByPeriods`; B6 will provide the real period-backed implementation. B5 does not create period tables.
- Migration: current history ends at `0005_monthly_workshops`; generate `0006_workshop_turnos` with `corepack pnpm db:generate --name workshop_turnos`. Never hand-write generated artifacts.
- TDD: enabled; source `AGENTS.md`; runner `corepack pnpm test`.
- Route: delegated direct. Mapping and multi-file writer triggers fired. Two sequential bounded work units keep behavior/fake separate from generated persistence; the parent owns tracking, gates, review and commits.
- Delivery strategy: stacked-to-main. Forecast 600–850 authored production lines excluding generated migration; split as B5a behavior/fake and B5b schema/Drizzle/migration rather than compressing.

## Tasks

- [x] B5-T1. Map the contract seam, turno requirements, B4 integration, Unicode uniqueness, B6 history boundary, migration sequence, excluded parallel-work surfaces, and reviewable split.
- [x] B5-T2. B5a RED: add exhaustive domain/service/shared-contract tests for label/weekday/time/capacity normalization, non-ASCII conflict keys, lifecycle/refusals, aggregate audit, history rules, typed races, and deterministic weekday/time/id order.
- [x] B5-T3. B5a GREEN/REFACTOR: implement turno domain helpers, repository port, in-memory fake, usage seam, and the five service operations; hydrate workshop turnos and replace B4's active-turno placeholder through the real turno repository seam.
- [x] B5-T4. Verify B5a, assess/review as configured, and commit the behavior/fake work unit.
- [x] B5-T5. B5b RED: run the shared repository contract against an absent Drizzle adapter and add exact PostgreSQL constraint/cause-chain, round-trip, order, FK/check, and rollback cases.
- [x] B5-T6. B5b GREEN/REFACTOR: add `workshop_turno` schema additively, update migration expectations, generate `0006_workshop_turnos`, and implement the Drizzle adapter without touching B6 tables.
- [x] B5-T7. Verify focused and full project gates under `C:/Temp/calma-gate.lock`, assess/review as configured, and commit the persistence work unit.

## Acceptance criteria

- Labels are trimmed, NFC-normalized, and uniquely keyed case-insensitively for non-ASCII input in fake and PostgreSQL, including race-time enforcement.
- Weekday is 1–7; time is `HH:MM` with end strictly after start; capacity is an integer from 1 to 500; all validation issues aggregate.
- Add/update/retire/reactivate/delete return typed results and preserve state on refusal.
- A published workshop cannot lose its last active turno; used turnos retain history and cannot be deleted; reactivation rechecks label uniqueness.
- Every successful turno mutation updates owning-workshop audit; refused writes do not.
- Fake and Drizzle run one shared contract and return weekday/time/id order calculated explicitly rather than delegated to database collation.
- Exact/nested SQLSTATE 23505 on the turno label constraint maps to typed conflict; unrelated unique violations reject.
- Migration is generated as `0006_workshop_turnos`; existing monthly and intensivo schema declarations remain unchanged except additive turno definitions.
- Parallel C4-B2 production files, B6 period persistence, and FRONT files remain untouched.

## Verification plan

- B5a: focused domain/service/fake contract; workshops module; lint; typecheck; format; diff check.
- B5b: fake + Drizzle shared contract; migration/catalog/schema ownership; focused workshops module; lint; typecheck; format; diff check.
- Parent spot check after each work unit.
- Final full gate under the shared lock: `corepack pnpm format:check`, `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm build`, `corepack pnpm test:coverage`.
- Runtime boundary: embedded PostgreSQL Drizzle turno contract.
- Rollback boundary: B5 turno domain/application/fake/Drizzle files, additive turno schema declarations, generated `0006_workshop_turnos` artifacts, and latest-migration expectations; B4 monthly and intensivo records remain.

## Progress and evidence

- B4 closed with commits `42cfec1` and `0cfd778`; runbook drift fixed in `9b826ad` before this branch.
- B5-T1 delegated exploration found existing five-method placeholders, B4 `ActiveTurnoLookup`, no turno persistence, current journal at `0005`, and a Unicode-collation mismatch in the old design suggestion. The decisions above resolve those gaps without touching B6.
- The first B5a bounded writer was externally aborted after 56 turns and left uncommitted edits in the authorized domain/application/fake/contract surfaces. Read-only incident diagnosis found the implementation broadly present but not acceptance-ready: delete could bypass the published last-active-turno invariant, the fake trusted caller-supplied `labelKey`, mutation/audit writes were not atomic, and normalization/refusal/actor-first proof was incomplete.
- Fresh correction RED proved label-key bypass, non-atomic audit failure, and published last-active deletion. GREEN: the fake derives keys from labels, repository mutations own aggregate audit atomically with rollback, and delete returns the additive typed last-active refusal. Focused 29/29 tests pass.
- Independent verification confirmed the corrected defects and B5a acceptance. Slow checks with extended budgets: workshops 9 files / 268 tests PASS in 556.53 s; lint PASS (only the existing boundaries deprecation warning); typecheck PASS; format PASS; `git diff --check` PASS. Parent spot check reran the focused trio: 29/29 PASS.
- Authored B5a production diff: 284 additions / 17 deletions across `contracts.ts`, `monthly-workshop-service.ts`, `index.ts`, `turno-repository.ts`, and `turno-core.ts`, excluding tests, `src/testing/**`, and ODD docs. Changed-path inspection found no public reader, composition production, app, schema, Drizzle, migration, or B6 files.

## Next step

- B5a work-unit commit: `d610ed4` (`feat(workshops): add turno lifecycle behavior`), 11 files, 923 additions and 26 deletions including tests and this task document.
- Native review: committed-range ASSESS for `10ca8c4..d610ed4` was schema-incompatible/unassessable. INSPECT prepared a candidate, but START failed before authority with `candidate-owner-preparation-failed` (`lineage_created: false`, no mutation). No retry, lineage, receipt or approval is claimed. Final ASSESS with `nativeReviewOutcome: unavailable` requires writer self-verification plus an independent verifier; both are recorded above.
- B5a rollback boundary: revert `d610ed4`; it contains no schema or migration.
- B5b writer completed the additive schema, generated `0006_workshop_turnos`, Drizzle adapter and migration expectations. Writer checks pass: fake 6/6, Drizzle 15/15, migration/architecture 36/36, workshops 283 tests, lint/typecheck/format/diff clean.
- Independent B5b verification confirmed schema, contract parity, Unicode key, ordering, time conversion, exact/nested 23505 handling, rollback, migration expectations and excluded-path compliance. It found one proof gap: the successful atomic mutate test does not directly reread and assert the persisted owning-workshop audit. Its aggregate workshops run also hit the known Windows embedded-Postgres worker crash (`3221226505`) after the same Drizzle file passed 15/15 in isolation.

- Persisted-audit proof RED exposed PostgreSQL's raw timestamp string representation; GREEN normalizes the direct assertion. Drizzle now passes 16/16 and directly rereads both the child turno and owning-workshop audit after commit.
- Independent final verification: Drizzle 16/16, workshops 284/284, lint/typecheck/format/diff checks PASS. Parent DB spot check encountered the known Windows Vitest worker exit `3221226505` after 7/16 assertions; it is contradicted by the two complete independent Drizzle runs (15/15 then 16/16) and the complete 284-test aggregate run. Parent then spot-checked the fake contract: 6/6 PASS. The locked full gate remains authoritative for closure.
- B5b authored production: 228 additions excluding tests/docs/generated migration. Changed paths remain inside authorized schema/adapter/test/migration/catalog/runbook surfaces; no B6, public reader, app, or composition production file changed.

- Final locked gate PASS: format, lint, typecheck, build, coverage and diff check all exited 0. Coverage ran 148 files / 1616 tests, all passed in 926.76 s; 94.30% statements, 91.51% branches, 96.59% functions and 96.57% lines. Build completed client and SSR in 13.44 s. Non-fatal warnings: Wrangler update notice, boundaries `mode` deprecation, build plugin timings, and eight jsdom canvas messages. No Windows worker crash occurred. The owned gate lock was released.

- B5b work-unit commit: `ab150b3` (`feat(workshops): persist workshop turnos`), 15 files, 1,521 additions and 33 deletions including generated migration/snapshot and tests.
- Native review: committed-range ASSESS for `74c35ad..ab150b3` was schema-incompatible/unassessable. INSPECT prepared a candidate, but START failed before authority with `candidate-owner-preparation-failed` (`lineage_created: false`, no mutation). No retry, lineage, receipt or approval is claimed. Final ASSESS with `nativeReviewOutcome: unavailable` requires writer self-verification plus an independent verifier; both and the full locked gate are recorded above.
- B5b rollback boundary: revert `ab150b3`; if migration `0006` was applied, retain it or remove with a new forward migration rather than editing history.

B5 is complete. Next dependency slice is B6 periods and “Abrir mes”, on a new stacked feature branch.
