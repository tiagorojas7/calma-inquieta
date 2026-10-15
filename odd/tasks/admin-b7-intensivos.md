# Admin B7: intensivos

- Work unit: task 11 of `openspec/changes/admin-catalog/tasks.md` (B7). ODD, BACK.
- Branch/worktree: `feat/admin-catalog-b7-intensivos` from `origin/main` `ae210a4`, in `../CalmaInquieta-front`.
- Objective: deliver intensivos (one-date time range, deposit bounds, capacity and minimum seats, teacher assignment with percentage, lifecycle, future reschedule, visibility, draft-only delete) with a fake and a Drizzle repository that pass one shared contract, plus the schema extension and generated migration.
- Why: B7 unblocks the change-4 intensivos chain (C4-B2 reader, C4-F1 listing and detail).
- Spec and design: `openspec/changes/admin-catalog/specs/intensive-workshops/spec.md`, the intensivo sections of `design.md`, and the existing contract seam in `src/modules/workshops/application/contracts.ts` (B0b).
- Constraints: strict TDD (`AGENTS.md`); hexagonal boundaries. Paused stays visible but rejects new requests; cancellation preserves history; policy text only, with no cancellation-deadline field. Lessons from the B3 review apply from the start: map SQLSTATE 23505 to typed results, keep fake and Postgres ordering identical (including non-ASCII), and test every normalization step.
- Migration sequencing: Pi's B8a generates `0003_suppliers`. This slice writes its schema and generates its migration only after B8a merges, so phase 1 is domain, application, fake and contract only.
- TDD: enabled; source `AGENTS.md`; runner `corepack pnpm test`.
- Route: delegated direct, one bounded writer per phase; the parent spot-checks, commits, gates and opens the PR. Owner autonomy rule (2026-10-14) and gate lock `C:/Temp/calma-gate.lock` apply.

## Tasks

- [x] T1. Map spec, design and the B0b seam; record scope, deferred items and forecast.
- [x] T2. Domain rules (time range, deposit bounds, capacity and minimum seats, percentage precision, lifecycle, reschedule, visibility) RED then GREEN.
- [x] T3. Application service with the in-memory fake, including actor audit and the teacher lookup.
- [x] T4. Shared repository contract run by the fake.
- [ ] T5. After B8a merges: rebase, schema, generated migration, Drizzle repository passing the contract on embedded Postgres (checklist below).
- [ ] T6. Close: full gate, commits, PR.

## Evidence and progress

- Branch created.
- T1 scope (mapped, phase 1): domain `domain/intensive-core.ts` (field validation, single-date schedule, Córdoba "future start", assignment-percentage rule, transition table, publish rules); application `intensive-repository.ts` (port), `intensive-service.ts` (`createIntensivesService`: the 12 `IntensivesService` use cases, actor audit, `TeacherLookup` and `MediaLookup` hydration); `InMemoryIntensiveRepository`; shared contract `intensive-repository.contract.ts`; `parsePercentage` fix. No schema, migration, Drizzle repository or db test (migrations are serialized behind B8a). Route: delegated direct (single writer).
- Forecast: phase 1 is about 840 non-blank production lines (domain 333, port 62, service 431, index 6, `contracts.ts` 4+/3-) plus 67 in the fake; phase 2 about 170 (schema ~40, adapter ~130). Total about 1,000-1,050, far above the 400 heuristic (the design forecast was 260-340; the service and the publish/future rules came out larger than planned). Suggested PR split: PR1 "intensivos core and persistence" = `intensive-core.ts` validation and assignment rule, port, fake, contract, create/get/list/update/delete, schema, migration, Drizzle adapter; PR2 "intensivo lifecycle" = `checkTransition`, `unmetPublishRules`, `cordobaLocalOf`/`startsInFuture`, publish/pause/cancel/archive/restore/reschedule (about 250 lines, no schema, no migration). PR1 is still over 400 (size:exception pattern as in B3) unless the gallery also moves to PR2.
- T0 (precision bug found in B0b): `parsePercentage("1.15")` returned 114.99999999999999 basis points (`Number(text) * 100`); also 0.29, 4.35, 0.07. RED: `contracts.test.ts` failed (`expected 115, received 114.99999999999999`). GREEN: integer arithmetic on the digits; 7 tests pass.
- T2 RED: `domain/intensive-core.test.ts` failed (module missing). GREEN: 90 tests pass (one expectation corrected: price 0 with deposit 5 also reports `exceeds-price`, which is right).
- T3 RED: `application/intensive-service.test.ts` failed (Cannot find module `in-memory-intensive-repository`). GREEN: 167 workshops tests pass after writing port, fake and service (typecheck then forced splitting `transition` so `rules-unmet` only types on `publish`).
- T4 RED: `in-memory-intensive-repository.test.ts` failed (Cannot find module the contract). GREEN: 21 contract tests pass against the fake.
- Verification: `corepack pnpm test src/modules/workshops src/modules/teachers src/testing`: 22 files, 327 tests pass; scoped coverage of `src/modules/workshops/**`: 98.99 % statements, 97.74 % branches; `prettier --check`, `lint`, `typecheck`, `git diff --check` clean.

### Decisions taken in phase 1 (not settled by spec or design; revisit if the owner disagrees)

- B3 lessons applied: the port returns a typed `slug-conflict` (insert, update); the service maps it to `invalid slug/duplicate` exactly like its pre-check, with create and update tests that simulate the lost race. A duplicate id still rejects (defect). A slug conflict on a status-only write throws (`unexpected slug conflict`), tested.
- List order (documented in the port and the contract): event date descending, start time descending, id ascending by code unit. Names are deliberately not part of it, so no collation can diverge; a contract case inserts `Zeta`, `Álamo` and `Ñandú` on one date and asserts id order. Newest-first is a presentation choice that FRONT F6 may change.
- `list({ status: "live" })` means every status except `archived` (cancelled included, since it can still be archived). `listVisible` is published and paused; `acceptsNewRequests` stays the pure function from B0b (the read model has no flag).
- Normalization, each tested: trim of name, slug, summary, description, policy, date, times, money and count text, gallery alt; a blank slug derives from `slugify(name)` (an uppercase explicit slug is refused, not lowercased); percentage comma to dot; `33,33` stores 3333.
- Summary and description are required (spec: "MUST have"); policy text is optional, at most 2000. Capacity 1-500 (D-A2). Name 120, slug 80, summary 200, description 5000 (design table).
- Assignment: no teacher plus a percentage is `teacherId/required`; own teacher plus a percentage is `percentage/percentage-not-applicable`; unknown teacher `unknown-reference`; archived teacher `not-selectable` only for a new assignment (an assignment already in place survives her archiving on later edits). Publish requires an active teacher and, for a third-party teacher, a stored percentage, against her current modality.
- Future rule: `reschedule` and `update` (when the schedule changes) refuse a start not strictly after the current Córdoba minute on `published`/`paused` with `eventDate/in-past`; draft, cancelled and archived may take any date; `create` takes any date (always a draft). Publish checks range validity only, not "in the future" (the spec lists a valid date range).
- `update` is allowed in every status and keeps status and id. Publish rules are re-checked on every `draft`/`paused` to `published`.
- Gallery: validated with `validateGallery` through `MediaLookup`, alt trimmed and at most 200 (`images/too-long`), stored as `{ assetId, alt }` in position order; an asset that vanished reads as `asset: null`.

### Deferred (not in phase 1)

- Schema, migration, Drizzle repository, db tests (phase 2). Composition wiring of `IntensivesService` into `AppServices` and the public `PublicIntensivoRecords` adapter (C4-B2) are separate slices.
- `listAssignmentsOfTeacher` needs an intensivos-by-teacher query; B4 owns that method, so the port gets `listByTeacher(teacherId)` when B4 lands.
- Open product questions (none blocking): whether `update` should be refused on `cancelled`/`archived`; whether publish should require a future start; whether newest-first is the wanted admin order.

## Phase 2 checklist (after B8a merges and `0003_suppliers` exists)

1. Rebase on `origin/main`; confirm the next free migration number.
2. Schema file under `src/platform/db/schema/` (new `workshops.ts` if B4 has not created it; relative imports only; satisfy the schema-ownership test):
   - `intensive_workshop`: `id uuid pk`, `slug text not null`, `name`, `summary`, `description`, `teacher_id uuid null` references `teacher` RESTRICT, `agreed_percentage_bp integer null`, `event_date date`, `starts_at time`, `ends_at time`, `price_centavos bigint` (number mode), `deposit_centavos bigint` (number mode), `capacity integer`, `min_seats integer`, `policy_text text` (empty allowed), `materials_included boolean`, `status text`, `updated_by text`, `updated_at timestamptz` (milliseconds must round trip). No cancellation-deadline column.
   - CHECKs: slug `^[a-z0-9]+(-[a-z0-9]+)*$` and length at most 80; `ends_at > starts_at`; `price_centavos > 0`; `deposit_centavos > 0 AND deposit_centavos <= price_centavos`; `capacity BETWEEN 1 AND 500`; `min_seats BETWEEN 1 AND capacity`; `agreed_percentage_bp IS NULL OR BETWEEN 0 AND 10000`; `agreed_percentage_bp IS NULL OR teacher_id IS NOT NULL`; status in the five values.
   - Indexes: named `UNIQUE(slug)` (all statuses), `(teacher_id)`, `(status)`.
   - `intensive_image`: `intensive_id` references `intensive_workshop` CASCADE, `media_asset_id` references `media_asset` RESTRICT, `alt text` (non-blank, at most 200), `position smallint`, `PK(intensive_id, position)`, `position BETWEEN 0 AND 5`.
3. Generate with `corepack pnpm db:generate --name intensive_workshops`; update the stale tag expectations (they fail first, as in B3): `database-probe.contract.ts`, `in-memory-database-probe.test.ts`, `migration-catalog.test.ts`, `request-services.db.test.ts`, the migrate db test table list, `docs/runbooks/cloud-provisioning.md`.
4. `infrastructure/drizzle-intensive-repository.ts` implementing `IntensiveRepository`, passing `runIntensiveRepositoryContract` in `drizzle-intensive-repository.db.test.ts`:
   - `insert`/`update`: one transaction for the row plus the whole gallery (delete and reinsert by position); SQLSTATE 23505 on the slug unique index returns `{ ok: false, error: { kind: "slug-conflict" } }` (any other 23505, such as the primary key, rejects); `update` returns `not-found` when no row matched.
   - Read `starts_at`/`ends_at` back as `HH:MM` (Postgres `time` returns `HH:MM:SS`), `event_date` as `YYYY-MM-DD` text (no `Date` timezone shift), bigint as number (safe range), `updated_at` as `Date`.
   - `list(statuses)`: `status = ANY(...)`, an empty array returns `[]` without querying; `ORDER BY event_date DESC, starts_at DESC, id ASC` with ids compared byte-wise (uuid column or `COLLATE "C"`); load galleries ordered by `position` for all ids in one query.
   - `deleteDraft`: one `DELETE ... WHERE id = $1 AND status = 'draft'`, then distinguish `not-draft` from `not-found` by a read in the same transaction; images cascade.
   - Extra db cases: CHECK violations reject (deposit above price, min seats above capacity, percentage without teacher, bad slug); `RESTRICT` when deleting a teacher or media asset in use; a race on the slug index.
5. Wire nothing into `src/composition/**` in this slice unless the PR needs it (`createUnavailableService` stays until the admin routes slice).

## PR1 delivery (phase 1, owner approved size:exception 2026-10-15)

- Work-unit commits: `baa84a1` fix(workshops): parse percentages without float drift; `c0165cd` feat(workshops): add intensivo rules, service and repository contract.
- Parent spot check: `corepack pnpm test src/modules/workshops src/testing/fakes/in-memory-intensive-repository.test.ts`: 5 files, 188/188 pass.
- Full gate (under `C:/Temp/calma-gate.lock`): `format:check`, `lint`, `typecheck`, `build` PASS; `test:coverage` 1417/1419, the two failures are the known W1 full-load flakes (`src/platform/migrate-script.test.ts` subprocess `status: null`, `tooling/architecture/architecture.test.ts` 120 s timeout). Isolated rerun of both files: 2 files, 19/19 PASS. The coverage table is not printed when a test fails, so CI's `test:coverage` on the PR is the coverage proof; the writer's scoped run of `src/modules/workshops/**` reported 98.99 % statements, 97.74 % branches.
- Owner decisions 2026-10-15: publish MUST require a start strictly after the current Córdoba minute (implement with TDD in PR2); editing cancelled or archived intensivos IS allowed (keep); admin list newest-first (keep).
- RDD: assess `medium`, review due (`slice_budget_reached`); owner granted; `review-reliability` **approved**, acknowledged (`review-9a1f69d0b3cb20f3`, authority burned). Non-blocking findings, both scheduled for PR2 with TDD:
  - R3-update-bypasses-publish-rules: `update` on a `published`/`paused` intensivo does not re-check the publish rules, so clearing the teacher leaves it published without an assignment. PR2: re-apply the publish rules on `update` for `published`/`paused` and refuse with the typed `rules-unmet` result.
  - R3-publish-no-future-check: the owner's future-start rule (above) is not yet enforced.
