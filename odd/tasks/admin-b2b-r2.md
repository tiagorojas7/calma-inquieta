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
