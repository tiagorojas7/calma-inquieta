# Admin B4: monthly workshops

- Work unit: item 8 of `openspec/changes/admin-catalog/tasks.md` (B4). ODD, BACK.
- Branch/worktree: `feat/admin-catalog-b4-monthly-workshops` from `origin/main` `8cc1fc6`, in `../CalmaInquieta-b1b`.
- Objective: deliver monthly workshops with typed domain/application behavior, fake and Drizzle repositories running one shared contract, additive schema definitions, and generated migration `0005_monthly_workshops`.
- Why: B4 is the persistence and behavior prerequisite for B5 turnos and B6 periods.
- Requirements: `openspec/changes/admin-catalog/specs/monthly-workshops/spec.md`, relevant sections of `openspec/changes/admin-catalog/design.md`, task item 8, and the existing seam in `src/modules/workshops/application/contracts.ts`.
- Constraints: strict TDD (`AGENTS.md`); hexagonal boundaries; map PostgreSQL SQLSTATE 23505 to typed results; fake and Postgres ordering must be identical including non-ASCII cases; test every normalization step; the shared repository contract must run against fake and Drizzle. Extend `src/platform/db/schema/workshops.ts` additively and do not modify `intensiveWorkshop` or `intensiveImage`. Do not edit `src/modules/workshops/{application,domain,infrastructure}/public-*` or `src/composition/request-services.ts`; any `src/modules/workshops/index.ts` change must be additive.
- Scope rule: if authored production code exceeds 400 lines, move gallery behavior and persistence to B4b rather than compressing tests or code.
- Migration: current history ends at `0004_intensive_workshops`; generate the next migration with `corepack pnpm db:generate --name monthly_workshops`. Never hand-write generated artifacts.
- TDD: enabled; source `AGENTS.md`; runner `corepack pnpm test`.
- Route: delegated direct. Mapping and multi-file writer triggers fired; one bounded writer implements the slice and self-verifies. Parent owns tracking, spot checks, gate lock, review lifecycle, and commit.
- Delivery strategy: stacked-to-main, inherited from the approved admin-catalog plan. Forecast: approximately 360–520 authored production lines before the gallery split rule; generated migration artifacts excluded.

## Tasks

- [x] B4-T1. Map requirements, contracts, B3/B7 parity lessons, migration sequence, excluded parallel-work surfaces, and writer scope.
- [x] B4-T2. RED: add domain/service/shared repository contract coverage for slug confirmation, validation and every normalization, assignment modality/percentage precision, lifecycle, publish-rule aggregation, visibility, audit, typed slug conflicts, and deterministic non-ASCII ordering.
- [x] B4-T3. GREEN/REFACTOR: implement the minimum monthly workshop domain, application service, port, fake repository, and additive module exports; run the shared contract against the fake.
- [x] B4-T4. Add monthly workshop schema definitions without touching intensivo tables; update required migration-catalog expectations; generate `0005_monthly_workshops` using the repository command.
- [x] B4-T5. Implement the Drizzle repository, map only the monthly slug constraint's SQLSTATE 23505 to the typed conflict, and run the same repository contract against embedded Postgres.
- [x] B4-T6. Apply the 400-line production rule: retain gallery in B4 only if total authored production stays at or below 400; otherwise record and defer gallery-only behavior to B4b.
- [ ] B4-T7. Verify focused tests, full project gate under `C:/Temp/calma-gate.lock`, structural readback, native review as configured, and commit the work unit with a Conventional Commit message.

## Acceptance criteria

- Monthly workshop validation, lifecycle, aggregated publish rules, visibility/no-request semantics, and actor audit match the existing public contracts and OpenSpec requirements.
- Assignment rules distinguish own versus third-party teachers and store exact basis-point percentages without floating-point drift.
- Every normalization is explicitly tested, including non-ASCII text; fake and Drizzle return the same deterministic order independent of database collation.
- Duplicate monthly slugs, including race-time PostgreSQL `23505`, return typed results; unrelated unique violations reject.
- One shared repository contract passes against the in-memory fake and Drizzle adapter.
- `src/platform/db/schema/workshops.ts` preserves the existing intensivo definitions byte-for-byte except for additive monthly definitions, and migration `0005_monthly_workshops` is generated rather than handwritten.
- Parallel C4-B2 files remain untouched; `src/modules/workshops/index.ts` edits, if any, are additive.

## Verification plan

- RED/GREEN/REFACTOR focused commands reported by the bounded writer.
- Parent spot check: focused monthly workshops test set selected from the implemented files.
- Full gate under the lock: `corepack pnpm format:check`, `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm build`, `corepack pnpm test:coverage`.
- Runtime boundary: embedded PostgreSQL repository contract and generated migration catalog tests.
- Rollback boundary: B4 monthly domain/application/fake/Drizzle files, additive monthly schema definitions, and generated `0005_monthly_workshops` artifacts; intensivo tables and public reader files are outside the rollback.

## Progress and evidence

- Worktree incident resolved without data loss: the clean B8a branch was left intact and the requested B4 branch was created at `8cc1fc6`.
- Gate lock was absent before work began.
- B4-T1 delegated exploration confirmed the contract seam exists, monthly implementation is absent, migration history ends at `0004_intensive_workshops`, and B3/B7 provide the required normalization, ordering, typed-conflict, and contract-test patterns.
- The first bounded-writer pass returned partial: observed RED on missing monthly modules, then 8 focused tests passed; it generated `0005_monthly_workshops` and added initial core, fake, port, schema and Drizzle files. The combined DB verification command timed out at 180 seconds; `git diff --check` passed.
- The continuation reports 13 focused monthly tests and 247 workshop tests passing; individual Drizzle, migration, architecture, lint and typecheck checks pass. `format:check` still fails on 10 changed files, so no implementation task is checked off yet.
- The initial 136-line count was incorrect because it missed much of the untracked production source. Independent verification recomputed 779 authored production additions against `8cc1fc6`, excluding tests, `src/testing/**`, ODD docs, and generated migration artifacts. The cohesive non-gallery core itself exceeds 400; per the plan, keep the honest core rather than code-golfing, and defer gallery wholly to B4b.
- Gallery is wholly deferred to B4b: validation, media lookup, image schema/persistence, and gallery contract coverage. Non-empty gallery writes now return typed `unavailable` rather than discarding data.
- Native assessment was unavailable (empty native output), so verification is fail-closed as high risk: writer self-verification plus an independent verifier.
- First independent verifier: BLOCKED. Corrections added a truthful `ActiveTurnoLookup`, typed gallery refusal, broader normalization/lifecycle/audit coverage, shared fake/Drizzle parity, explicit code-unit ordering, exact 23505 constraint mapping, and targeted formatting.
- Second independent verifier: all required commands pass (23 focused behavior tests, 10 Drizzle tests, 35 migration/architecture tests, lint, typecheck, format, diff check). Remaining proof gaps are explicit archive/restore data preservation, direct draft/archived visibility assertions, successful delete without periods, and an explicit nested-cause 23505 fixture. Its claimed excluded-surface failure is not applicable: the user excluded `src/composition/request-services.ts`, which is untouched; `src/composition/request-services.db.test.ts` was explicitly authorized for the migration tag and does not overlap C4-B2 production work.
- Engram mirror saved initially as observation 370 under project `calmainquieta`; the subsequent update failed on Engram's project binding and remains pending.

## Next step

Final proof pass added explicit archive/restore preservation, draft/archived visibility, successful zero-period deletion, and nested-cause 23505 characterization. Focused behavior tests pass (19), Drizzle tests pass (11; about 202 seconds), lint/typecheck/format/diff checks pass. No further production correction was needed.

Parent spot check initially ran from the wrong worktree and found no tests; read-only incident diagnosis confirmed the correct path and no new mutation. Corrected command in `CalmaInquieta-b1b`: 2 files, 19/19 PASS.

The external gate completed and released its lock. This session then acquired `C:/Temp/calma-gate.lock` atomically. First full-gate pass: format, lint, typecheck, build and `git diff --check` PASS; `test:coverage` failed 1/1585 because the database-probe contract still expected `0004_intensive_workshops`. RED was observed; both the shared contract and in-memory migrated fixture were corrected to `0005_monthly_workshops`. Focused probes then passed (fake 4/4; isolated Drizzle 6/6). Final locked gate: format, lint, typecheck and build PASS; `test:coverage` 145 files, 1585/1585 PASS in 771.55 s, coverage 95.39% statements, 93.39% branches, 94.37% functions and 97.05% lines; `git diff --check` PASS. Eight jsdom canvas warnings were non-fatal. The owned lock was released. Commit and native review remain before B5.
