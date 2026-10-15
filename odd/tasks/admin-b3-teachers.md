# Admin B3: teachers with persistence parity

- Work unit: task 7 of `openspec/changes/admin-catalog/tasks.md` (B3). ODD, one BACK PR slice.
- Branch/worktree: `feat/admin-catalog-b3-teachers` from `origin/main` `9b1282e`, in `../CalmaInquieta-front`.
- Objective: deliver the teachers module (validation, active-name uniqueness, archive/reactivate, assignment warnings, audit with the actor, absent actor refused) with a fake and a Drizzle repository that pass one shared contract, plus `src/platform/db/schema/teachers.ts` and the generated `drizzle/0002_teachers*`.
- Why: B4 (monthly workshops) and B7 (intensivos) depend on B3; B7 unblocks the change-4 intensivos chain.
- Spec and design: `openspec/changes/admin-catalog/specs/teachers/spec.md`, design sections on teachers, the `teacher` table and the repository contract pattern. Existing contract seam: `src/modules/teachers/**` (from B0a).
- Constraints: strict TDD (`AGENTS.md`); hexagonal boundaries; no percentage field on teachers (percentages live on assignments, D2). Migration slices are serialized; this is the only one in flight. Owner autonomy rule 2026-10-14: fix mechanical failures without asking; stop only for product, scope, security or architecture decisions. Gate coordination through `C:/Temp/calma-gate.lock`.
- TDD: enabled; source `AGENTS.md`; runner `corepack pnpm test` (db project for `*.db.test.ts`).
- Route: delegated direct (4+ files to read and 2+ non-trivial files to write): one bounded writer maps and implements; the parent spot-checks, commits, gates and opens the PR.
- Delivery: `ask-on-risk`; size:exception only when tests push the total over 400 (owner-approved pattern).

## Tasks

- [x] T1. Map the spec, design and existing B0a seam; record the exact scope and forecast below.
- [x] T2. Domain and application behavior with the in-memory fake (RED then GREEN).
- [x] T3. Shared repository contract run by the fake.
- [x] T4. Schema `teachers.ts` and generated migration `0002_teachers`; journal checks stay green.
- [x] T5. Drizzle repository passing the shared contract on embedded Postgres.
- [ ] T6. Close: focused checks, lint, typecheck, full gate, commits, PR.

## Evidence and progress

- Branch created.
- T1 scope (mapped): domain `teacher-core.ts` (validation, name key); application `teacher-repository.ts` (port), `teacher-service.ts` (`createTeachersService`, `createTeacherLookup`); `schema/teachers.ts` + generated `drizzle/0002_teachers.sql`; `InMemoryTeacherRepository`; shared contract `teacher-repository.contract.ts`; Drizzle repository. Forecast ~420-450 production lines. Route: delegated direct (single writer).
- T2 RED: `domain/teacher-core.test.ts` failed (module missing); `application/teacher-service.test.ts` failed (Cannot find module ./teacher-service). GREEN: 11 + 21 tests pass.
- T3 RED: `in-memory-teacher-repository.test.ts` failed (Cannot find module). GREEN: 16 contract tests pass.
- T4: `corepack pnpm db:generate --name teachers` produced `0002_teachers.sql` and snapshot. Stale tag expectations (probe contract, probe fake test, request-services db test, runbook, migration-catalog test, migrate db test table list) updated; they failed before the update (3 failures) and pass after.
- T5 RED: `drizzle-teacher-repository.db.test.ts` failed (module missing). GREEN: 20 db tests pass after one fix (see deferred).
- Verification: scoped test run 36 files / 282 tests pass; lint, typecheck, diff --check and prettier --check clean. One native crash 0xC0000409 on request-services.db.test.ts, rerun once, passed.
- Design deviation (owner-approved 2026-10-14): the design's `UNIQUE INDEX ON (lower(name)) WHERE active` is replaced by a `name_key text NOT NULL` column (`teacherNameKey`: trim, NFC, `toLocaleLowerCase("es")`, accents kept) with the partial unique index on `name_key` WHERE active, because C-locale `lower()` does not fold non-ASCII capitals. RED: 5 db tests failed (LUCIA/Lucia and Nandu cases, column list, SQLSTATE 23505, find by name). GREEN after regenerating the single `0002_teachers` migration.
- Deferred: (1) assignment warning is built by B4 from `listAssignmentsOfTeacher`; B3 archive never consults assignments and always succeeds. (2) resolved by the name_key deviation above. (3) Max name/bio length not specified: no too-long rule.
