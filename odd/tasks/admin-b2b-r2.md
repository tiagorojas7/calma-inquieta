# admin-b2b-r2: bind R2 without making unrelated pages fail (B2b)

## Objective

Bind the R2 bucket `MEDIA` to the Worker behind the `ImageStorage` port. An absent binding keeps every public page working; upload answers `storage-unavailable` and serving answers 404.

## Scope

`src/platform/r2.ts`, the R2 `ImageStorage` adapter, an unavailable adapter and a media service factory, composition and Worker wiring, `wrangler.jsonc` `r2_buckets`, Vitest project separation (`*.r2.test.ts`), ADR-0005 and runbook step R1. No migration. No Cloudflare command is run.

## TDD

Enabled. Source: `AGENTS.md`. Runner: `corepack pnpm test <files>` (focused files only).

## Authorized scope and constraints

Local only (wrangler/miniflare simulation through `getPlatformProxy`). No suppressions, casts or boundary edits. About 400 production lines is a planning heuristic.

## Tasks

- [x] T1 `readMediaBinding` + `R2BucketLike` (`src/platform/r2.ts`) with structural tests (absent, partial, valid). Route: inline.
- [x] T2 `ImageStorage` contract extended (delete, duplicate put) and R2 adapter + unavailable adapter, run against the fake (unit) and local R2 (`*.r2.test.ts`). Route: inline.
- [x] T3 Vitest project separation (`unit` excludes `**/*.r2.test.ts`, `db` includes it) with a tooling test.
- [x] T4 Media service factory, composition and Worker wiring (`mediaBucket`), absent-binding tests.
- [x] T5 `wrangler.jsonc` `r2_buckets`, ADR-0005 update, runbook R1.

## Acceptance

Absent binding returns storage-unavailable / 404 and the R2-backed contract tests pass.

## Checks

Focused tests, `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm format:check`, `git diff --check origin/main`.

## Progress and evidence

- Routes: all tasks inline (writer task itself is the single bounded delegate; 2+ files by design of the slice).
- T1 RED: `corepack pnpm test src/platform/r2.test.ts` failed, `./r2` module missing. GREEN: 8 passed.
- T2 RED: `r2-image-storage.r2.test.ts` could not load (adapter module missing; a contract syntax slip was fixed first). GREEN: fake contract 7 passed (unit); local R2 simulation 6 passed (`getPlatformProxy`, `persist: false`, 72 s on this machine).
- T3: `tooling/vitest-projects.test.ts` passes; `*.r2.test.ts` excluded from `unit`, included in `db`.
- T4: `media-service.test.ts`, `composition/media-binding.test.ts` (absent binding -> storage-unavailable / unavailable serve) and a worker test without `MEDIA` (public page 200) pass.
- T5: `wrangler.jsonc` `r2_buckets`, ADR-0005 section and runbook R1 written. No new secret or binding beyond the R1 buckets.
- Next: final checks and commits.

## Delivery

- Full gate (2026-10-16, under `C:/Temp/calma-gate.lock`): `format:check`, `lint`, `typecheck`, `build` PASS; `test:coverage` 158/158 files, 1714/1714 tests, coverage 98.12 % statements, 96.96 % branches.
- TDD disclosure (parent review): observed RED exists for `readMediaBinding` (missing module) and for the R2 adapter (missing module, after a syntax slip in the contract edit). The media service, composition, worker and Vitest-project tests were written together with their code, without a separately observed RED; they pass and cover the behavior, but strict RED-first was not followed for them.
- Merge precondition: the owner runs runbook step R1 (create the private buckets `calma-inquieta-media` and `calma-inquieta-media-preview`) before this merges, because CI deploys `wrangler.jsonc` with the `MEDIA` binding and a deploy that names a missing bucket fails.
- RDD (2026-10-16): assess `high` (`vitest.config.ts` process boundary). The owner granted the review. On gentle-ai 3.4.0 the bound STATUS timed out twice, so the owner stopped there and upgraded to 4.2.0. On 4.2.0 a 4-lens review ran and was **approved**, then acknowledged (`review-55d28c38711ca4dc`, authority burned).
- Non-blocking follow-ups from the review (separate later work):
  - [ ] R3-orphan-object-on-metadata-failure (WARNING): an upload that stores the R2 object and then fails to write the metadata row leaves an orphan object (`request-services.ts`).
  - [ ] R3-overwrite-guard-sim-only (WARNING): the `etagDoesNotMatch` no-overwrite guard is only proven on the local simulation.
  - [x] R4-silent-binding-degradation (WARNING): complete; an absent or malformed `MEDIA` binding logs the fixed names-only warning once per Worker isolate while public requests remain fail-soft.
  - [x] R4-r2-proxy-startup-timeout (WARNING): complete; `src/modules/media/infrastructure/r2-image-storage.r2.test.ts` already sets an explicit `beforeAll(..., 60_000)` timeout.
  - [x] R2-runbook-teardown-order (WARNING): complete; the full-teardown guidance now requires emptying and verifying both private buckets before deleting preview, then production.
  - [ ] Suggestions: `db` project name now also covers the R2 suite; duplicated image-type literals in the adapter; `media-binding.test.ts` catches all errors; the worker test does not prove that the binding is absent; the R2 suite is coupled to the db global setup.
