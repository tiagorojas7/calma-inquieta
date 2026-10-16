# Admin B6: workshop periods

- Work unit: item 10 of `openspec/changes/admin-catalog/tasks.md` (B6). ODD, BACK.
- Branch/worktree: `feat/admin-catalog-b6-workshop-periods`, stacked on completed B5 commit `4799693`, in `../CalmaInquieta-b1b`.
- Objective: deliver workshop periods and “Abrir mes” with Córdoba month semantics, deterministic prefill, per-turno capacities, assignment-isolated teacher/id/name/modality and initial-percentage snapshots, editable non-closed period percentage, effective closure, transactional fake/Drizzle parity, and generated migration `0007_workshop_periods`.
- Why: B6 makes monthly workshop configuration historical and is the dependency for B9 offers and later enrollment/renewal flows.
- Requirements: item 10 of `openspec/changes/admin-catalog/tasks.md`, period requirements in `openspec/changes/admin-catalog/specs/workshop-periods/spec.md`, relevant design sections, and existing `WorkshopPeriodsService` contracts/builders.
- Constraints: strict TDD (`AGENTS.md`); hexagonal boundaries; fixed `Clock`; America/Argentina/Cordoba month boundaries; all opening-rule failures aggregate; opening and compound writes are atomic; fake and Drizzle run one shared contract. Do not edit workshop `public-*`, `src/composition/request-services.ts`, `src/app/**`, unrelated intensivo tables, or B9 material-offer persistence. `src/modules/workshops/index.ts` edits must be additive.
- Effective-closure decision: derive `closed` from the stored state plus `Clock` on every read and mutation. Reads remain side-effect free; any update/publish/delete after the Córdoba boundary is refused as closed even if the stored row still says `open`. Explicit close persists `closed`.
- Prefill decision: select the greatest existing period strictly earlier than the target. Copy eligible project text and per-turno capacities; include every currently active turno, using the previous capacity when that turno existed and its current default otherwise. Retired turnos never enter the new period, while older periods retain them. B9 owns materials and is not implemented here.
- Snapshot decision: opening copies teacher id/name/modality and the initial agreed percentage separately from the assignment. Later workshop/teacher edits never drift an existing period's snapshot. An admin may edit a non-closed period's snapshot percentage; it freezes once the period is effectively closed.
- Size rule: if authored production exceeds the B6 budget, move only project-image validation/copy/persistence to B6b. Do not compress the opening transaction, lifecycle, capacities or snapshot rules. A deferred non-empty image write must fail explicitly rather than discard data.
- Migration: current history ends at `0006_workshop_turnos`; generate `0007_workshop_periods` with `corepack pnpm db:generate --name workshop_periods`. Never hand-write generated artifacts.
- TDD: enabled; source `AGENTS.md`; runner `corepack pnpm test`.
- Route: delegated direct. Mapping and multi-file writer triggers fired. Behavior/fake and persistence are sequential work units; parent owns tracking, gates, review and commits.
- Delivery strategy: stacked-to-main. Forecast: core 300–390 production lines before repository/service growth; monitor honestly and apply the project-image-only split when required.

## Tasks

- [x] B6-T1. Map requirements, contracts/builders, B4/B5 integration, Córdoba/time semantics, history/snapshot boundaries, B9 exclusion, migration sequence, transaction risks and split rule.
- [x] B6-T2. RED domain/service coverage for period keys, suggested month, allowed range, aggregated opening rules, latest-earlier/default prefill, active-turno capacities, snapshot immutability, lifecycle/effective closure, read-only closed state and audit.
- [x] B6-T3. GREEN/REFACTOR period core, repository port, fake, service, fixed-clock behavior, B5 usage adapter seam and additive exports; shared repository contract runs against fake.
- [x] B6-T4. Verify, assess/review as configured, and commit the B6 behavior/fake work unit.
- [ ] B6-T5. RED Drizzle shared-contract and transaction tests: duplicate race, FK/checks, rollback, ordering, snapshots, capacities, effective-state reads and draft deletion.
- [ ] B6-T6. GREEN/REFACTOR additive period schema, generated `0007_workshop_periods`, Drizzle adapter and all migration expectations, without B9 material tables.
- [ ] B6-T7. Apply the production-line rule. If over budget, defer only project-image behavior/schema/tests to a separately tracked B6b work unit; otherwise complete images in B6.
- [ ] B6-T8. Run focused and full locked gates, assess/review as configured, and commit the persistence work unit.

## Acceptance criteria

- Period keys are strict `YYYY-MM`; month calculations and effective closure use Córdoba boundaries through the injected clock.
- `suggestedNext` is one month after the greatest existing period, with a clock-based first suggestion when none exists.
- Opening returns all unmet rules together, refuses duplicates with a typed result, and atomically persists root/capacities/snapshot/audit.
- Prefill uses the greatest earlier period, current active turnos only, previous matching capacity or current defaults, and immutable copied values.
- Teacher id/name/modality and the initial percentage snapshot never drift from later assignment or teacher edits; the period percentage remains admin-editable until effectively closed and is frozen thereafter.
- Draft/open/closed transitions are typed; effectively closed periods reject every write and remain readable; only drafts delete.
- Fake and Drizzle run one shared contract with newest-first deterministic order and complete rollback on compound failure.
- B6 implements period-backed `TurnoUsageLookup` without making B5 import B6 infrastructure.
- Migration is generated as `0007_workshop_periods`; existing monthly/turno/intensivo definitions remain unchanged except additive period declarations.
- B9 materials, C4-B2 public readers, composition production and FRONT files remain untouched.

## Verification plan

- Behavior/fake: focused domain/service/fake contract, whole workshops module, lint, typecheck, format, diff check.
- Persistence: fake + Drizzle contract, migration/catalog/schema ownership, whole workshops module, lint, typecheck, format, diff check.
- Parent spot check after each work unit.
- Final full gate under `C:/Temp/calma-gate.lock`: format, lint, typecheck, build, coverage and diff check.
- Runtime boundary: embedded PostgreSQL period repository contract and generated migrations.
- Rollback boundary: B6 period domain/application/fake/Drizzle files, additive period schema declarations, generated `0007` artifacts and latest-migration expectations; B4/B5 history remains.

## Progress and evidence

- B5 completed with behavior commit `d610ed4`, persistence commit `ab150b3`, evidence commit `4799693`, and a 1616-test locked gate.
- B6-T1 delegated exploration confirmed the contracts/builders exist but implementation is unavailable, the journal ends at `0006`, period opening needs one compound transaction, and B5's usage seam can be backed by period-turno rows without reversing module dependencies.
- First behavior/fake writer returned partial: it observed domain RED, then 12 focused tests passed, but did not capture service/fake RED and left snapshot editing, complete update/prefill validation, compound atomicity proof and exhaustive coverage incomplete. Typecheck/format/diff checks pass; lint timed out after 300 s; the aggregate workshops run hit the unrelated Windows embedded-Postgres worker exit `3221226505` in the intensivo DB test.
- Current B6 core production is 507 authored lines excluding tests/ODD after refactor. This exceeds the budget, so B6-T7's rule is triggered: project-image validation/copy/persistence moves wholly to B6b. Non-empty image input is explicitly unavailable; updates preserve existing deferred data, and prefill refuses deferred source data rather than discarding it. No code/test compression.
- Independent audit found fake duplicate races, shallow rollback proof, silent deferred-data loss and broad coverage gaps. Correction RED/GREEN fixed atomic duplicate claim, configurable post-write rollback, nested isolation, deferred-data preservation/refusal and precise own-percentage validation. Focused 22 tests, workshops 297 tests, lint/typecheck/format/diff pass.
- The exhaustive proof batch now covers actor-first denial, aggregated key/range/opening failures, latest-earlier gap/future prefill, assignment-isolated initial snapshots with editable non-closed percentage, lifecycle/effective-close/refusal/audit behavior, list/get/totals/not-found/read-after-close, usage lookup, repository ordering/isolation/missing outcomes and every configured fake insert rollback stage. The batch's only RED was an incorrect test expectation for `"0.5"`; the existing parser correctly classifies it as `invalid-format`, so no production correction was needed. Focused result: 30 tests passed.
- Independent verifier's high finding to remove editable `snapshotPercentage` is a false positive: it consulted the wrong monthly-workshops pointer. The authoritative period requirement at `openspec/changes/admin-catalog/specs/workshop-periods/spec.md:142-168` requires opening to capture the current assignment, later assignment edits not to drift existing periods, admin editing of a non-closed snapshot, and refusal once closed. `openspec/changes/admin-catalog/proposal.md:121,248` likewise keeps all period fields and an open-month snapshot editable; `openspec/changes/admin-catalog/design.md:767-779` includes `snapshotPercentage` in `WorkshopPeriodDraft` and `update`. The correction preserves product behavior and repairs traceability only.
- Independent re-verification resolved the first high finding as a false positive (the verifier read `monthly-workshops/spec.md` instead of the authoritative `workshop-periods/spec.md`, which requires the non-closed snapshot to stay editable); traceability was corrected to cite `specs/workshop-periods/spec.md` (snapshot requirement and Open/Closed scenarios).
- Second independent verification exposed two real B6a defects, both fixed GREEN: TS2339 non-narrowed `parsed.value` in `openMonth`, and Prettier drift in three files. A follow-up inspection finding was also addressed: B6 now exports `createWorkshopPeriodLookup` (read-only `WorkshopPeriodLookup.hasPeriods` backed by `listForWorkshop`) so B4's draft-without-periods deletion guard is period-backed without any reverse dependency. The fake's staged post-write failure seam was simplified to one aggregate insert/update rollback, matching its single `Map.set` reality.
- Final gate evidence for B6a: focused period suite 3 files / 30 tests PASS; whole workshops module 12 files / 304 tests PASS (includes the B4 DB file, 11 tests, 57.3 s — the earlier five DB failures were a transient embedded-Postgres environment issue, not reproducible isolated); lint PASS after fixing four candidate-caused ESLint errors in the service test; typecheck PASS; format:check PASS; git diff --check PASS. Native assess remains unavailable/unassessable, so writer self-verification plus this independent verifier evidence stand in.

- Native review lifecycle for the B6a candidate: lineage `review-4ac485f98c7c8f12` (medium tier, lens review-reliability, 11 files / 1718 lines) found one candidate-caused CRITICAL, `R3-draft-effective-closure`: effective closure only converted stored `open` periods, so an elapsed-month `draft` still accepted update/publish/delete. One bounded correction was submitted (42-line plan, 33 authored diff lines) and applied with strict-TDD RED/GREEN: `effectivePeriodStatus` now derives every elapsed lifecycle to `closed`, with elapsed-draft read/refusal/no-write coverage in the domain and service tests. The targeted validator approved the correction and the approval was acknowledged and burned (`gentle-ai.review-acknowledged/v1`). Focused suite after correction: 30 tests PASS across the three period test files; typecheck, format:check and diff check PASS.

## Next step

Commit the B6a behavior/fake work unit, then start B6-T5 RED Drizzle shared-contract and transaction tests.
