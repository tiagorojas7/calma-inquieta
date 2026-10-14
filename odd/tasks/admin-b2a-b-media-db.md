# Admin B2a-b: media persistence, migration 0001 and serving

- Work unit: task 5 of `openspec/changes/admin-catalog/tasks.md` minus subtask 5a (B2a-a, merged in #33). ODD, one BACK PR slice.
- Branch/worktree: `feat/admin-catalog-b2a-b-media-db` from `origin/main` `e5c0ce4`, in `../CalmaInquieta-front`.
- Objective: persist media asset metadata in Postgres with a Drizzle repository that passes the same contract as the in-memory fake, add the first real migration (`0001_media_assets`) with journal hygiene and a CI drift check, enforce schema ownership, and implement the `serve` use case (design file table lists "upload, serve, Drizzle repo" under B2a).
- Why: B3 (teachers), B4 (workshops) and B7 (intensivos) depend on task 5; B7 unblocks the change-4 intensivos chain (C4-B2, C4-F1).
- Constraints: strict TDD (`AGENTS.md`), RED then GREEN then REFACTOR with `corepack pnpm test <paths>`. Hexagonal boundaries enforced by `pnpm lint`; no boundary suppression. Migration slices are serialized; this is the only one in flight. Full gate only after checking no other worktree runs one. No AI attribution in commits.
- TDD: enabled; source `AGENTS.md` (Strict TDD) and owner rule; runner `corepack pnpm test` (db project for `*.db.test.ts`).
- Route: delegated direct. Mapping trigger fired (4+ files) and was delegated to one read-only mapper; writer trigger fires (2+ non-trivial files), so one bounded writer implements T1-T5; the parent spot-checks, commits and runs the gate.
- Forecast: production about 190-270 authored lines (repository, schema, port reconciliation, serve), tests about 450-550, generated SQL/snapshot excluded. One slice under 400 production lines. Delivery strategy `ask-on-risk`; size:exception only if tests push the total over 400 (owner-approved pattern).
- RDD: on (global). Assess each work-unit commit with `gentle-ai review assess`.

## Decisions (technical, from design)

- `MediaAssetRepository` becomes `insert` + `findByIds(ids): Promise<ReadonlyMap<string, MediaAsset>>` (design.md:670); `findById` is removed and its callers and fake move to `findByIds` (B2a-a open item).
- Table `media_asset` per design.md:413: `id uuid` PK set by the app, `storage_key` UNIQUE, `content_type` in the three types, `byte_size` 1..5242880, `width`/`height` NOT NULL 1..10000 (design.md:1189), `created_by`, `created_at`. No update or delete (spec: no automatic cleanup of old assets).
- `serve` is part of this slice per the design file table; serving through R2 stays in B2b. `MediaLookup.findAssets` is not implemented here: it is wired with composition in C4-B5.
- Hard-coded `0000_baseline` expectations move to `0001_media_assets` (database-probe contract, request-services db test, runbook smoke line).

## Tasks

- [x] T1. Port reconciliation and shared contract: RED `runMediaAssetRepositoryContract` in `src/testing/contracts/media-asset-repository.contract.ts` run by the fake; GREEN `findByIds` on the port and fake.
- [x] T2. Schema and migration: RED journal-hygiene checks in `src/platform/db/migration-catalog.test.ts` (contiguous tags, `.sql` present, name pattern, increasing `when`) and the `0001_media_assets` expectation; GREEN `src/platform/db/schema/media.ts` re-exported by `schema.ts`, `corepack pnpm db:generate --name media_assets`, baseline expectations updated.
- [x] T3. Drizzle repository: RED `drizzle-media-asset-repository.db.test.ts` running the shared contract on embedded Postgres plus CHECK and `23505` cases; GREEN `createDrizzleMediaAssetRepository`.
- [x] T4. Serve use case: RED serve tests (found, unknown file name, storage unavailable, immutable headers model); GREEN `serve` in `src/modules/media/application/**`.
- [x] T5. Schema ownership and upload end to end: RED/GREEN `tooling/architecture/schema-ownership.test.ts` with a planted-violation fixture; db test for `uploadImage` with the Drizzle repository (success, insert failure removes the object).
- [x] T6. CI drift gate: RED `tooling/deploy-workflow.test.ts` assertion; GREEN `verify` step `pnpm db:generate --name drift-check` then fail on `git status --porcelain -- drizzle`. Note: Pi's B1b slice B also edits `ci.yml` and `deploy-workflow.test.ts`; whichever merges second rebases.
- [x] T7. Close: focused tests, lint, typecheck, format; full gate in a free window; work-unit commit(s); PR after owner confirmation.

## Evidence and progress

- Mapping done (read-only): scope, platform, contract pattern and boundaries confirmed; no source edits.
- T1 RED: `corepack pnpm test src/testing/fakes/in-memory-media-asset-repository.test.ts` gave `4 failed | 1 passed` (no `findByIds`; same file name accepted). GREEN: port `findByIds`, fake with id and file-name uniqueness; same command plus `src/modules/media` gave `185 passed`.
- T2 RED: `corepack pnpm test src/platform/db/migration-catalog.test.ts` gave `1 failed | 5 passed` (latest tag `0000_baseline`; hygiene cases are characterization). GREEN: `schema/media.ts`, `corepack pnpm db:generate --name media_assets` (when 1792015858428 > 1791287377079). The migrated template then failed the probe contract and request-services db test (2 failed); after moving `0000_baseline` to `0001_media_assets` (contract, in-memory probe test, request-services test, runbook line 186) and `migrate.db.test.ts` ("only media_asset table"), 74 passed. `test-database.db.test.ts` asserted an empty public schema; it now asserts `only_in_first` presence and absence instead (outside the stated paths, required by the new migration).
- T3 RED: `corepack pnpm test src/modules/media/infrastructure` failed with `Cannot find module './drizzle-media-asset-repository'`. GREEN: `createDrizzleMediaAssetRepository`; 16 db tests passed (shared contract, key `img/<file name>`, 23505, seven CHECK cases with 23514, boundary values, session closing).
- T4 RED: `corepack pnpm test src/modules/media/application/serve.test.ts` failed with `Cannot find module './serve'`. GREEN: `serveImage` (strict name regex, row file name must match, `failGet` switch added to the storage fake); 14 passed.
- T5: `schema-ownership.test.ts` passes (7); mutation proof: a planted `src/modules/media/infrastructure/leak.ts` importing `~/platform/db/schema/teachers` gave `1 failed | 6 passed`, then removed. `upload.db.test.ts` (success row readable back; insert failure removes the object and rethrows) passes (2) and is characterization: no new production code was needed.
- T6 RED: `corepack pnpm test tooling/deploy-workflow.test.ts` gave `1 failed | 17 passed`. GREEN: drift step in `verify` after install; 18 passed. Local `pnpm db:generate --name drift-check` printed "No schema changes" and left `git status --porcelain -- drizzle` unchanged.
- Verification: `corepack pnpm test src/modules/media src/testing src/platform/db tooling src/composition/request-services.db.test.ts src/modules/system-status` gave `363 passed (32 files)`; `prettier --check` clean; `corepack pnpm lint` exit 0; `corepack pnpm typecheck` exit 0; `git diff --check` exit 0. Full suite and gate not run.

## Delivery evidence

- Work-unit commits on `feat/admin-catalog-b2a-b-media-db`: `686a0a6` feat(media): persist media assets in Postgres (T1-T3, T5); `91bd427` feat(media): serve stored images by file name (T4); `ad4b6cc` ci: fail when migrations drift from the schema (T6).
- Parent spot check: `corepack pnpm test src/modules/media src/platform/db tooling/architecture/schema-ownership.test.ts tooling/deploy-workflow.test.ts`: 12 files, 252/252 pass.
- RDD: `gentle-ai review assess --base-ref e5c0ce4 --committed-only` (unrelated untracked files excluded): risk `high` (shell process in `ci.yml`), review due. Owner granted the review; START created the lineage, but the bound STATUS failed with `operation_timeout` (pre_native, `next_action: stop`). Owner chose to report and continue: occurrence posted on gentle-ai#5422, the candidate was declined (`declined_this_candidate`), and delivery follows ordinary repository policy. No review approval is claimed.

- Full gate 1 (2026-10-14): `format:check`, `lint`, `typecheck`, `build` PASS; `test:coverage` FAIL 1094/1095: `src/platform/migrate-script.db.test.ts` hard-coded one applied migration. Fixed to compare with `journal.entries.length` (RED observed in the gate, GREEN 1/1 focused).
- Full gate 2: `typecheck` PASS; `test:coverage` 125 files, 1095/1095 PASS, coverage 99.27 % statements, 98.97 % branches (threshold 90 %).
- [x] T7 closed by the gate above; PR opened after this commit.

## Next step

Owner review and merge. B1b PRs touch `.github/workflows/ci.yml` and `tooling/deploy-workflow.test.ts` too; whichever merges second rebases.
