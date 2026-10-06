# Test suite speed

- Feature: `test-suite-speed` (ODD, not SDD)
- Route: delegated direct, one writer (`worker-medium`). Trigger evidence: 2+ non-trivial test-infrastructure files plus preparatory reading.
- TDD: Strict TDD on (source: `openspec/config.yaml` `strict_tdd: true` and the user's global configuration). Runner: `pnpm test` through `corepack pnpm`; filter files with `pnpm test <file>`.
- Delivery: one PR to `main`. Forecast 150-300 authored lines. Strategy: ask-on-risk plus the owner's standing policy (a cohesive slice over 400 lines because of tests ships as `size:exception`; ask only if production code alone exceeds 400 lines).
- RDD: enabled globally. After the work-unit commit, run `gentle-ai review assess --cwd <repo> --agent claude-code --base-ref a8424a7 --committed-only --json` (last reviewed boundary = `main` after PR #6) and record the tier and outcome here.

## Objective

Cut the local full-suite time on the owner's Windows machine (4 cores, about 2 GB free RAM) from about 180-240 s to 90 s or less, and remove resource-induced flakiness, without weakening any test guarantee.

## Problem

Slowest files (Vitest JSON reporter, 2026-10-06, full run 179 s):

| File                                                                         | Time                                                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `src/testing/db/postgres-server.test.ts`                                     | 97.5 s (one test, 95 s, starts two embedded servers, each running initdb) |
| `src/testing/db/test-database.db.test.ts`                                    | 45.9 s                                                                    |
| `tooling/architecture/architecture.test.ts`                                  | 41.4 s                                                                    |
| `src/testing/db/global-setup.test.ts`                                        | 27.5 s                                                                    |
| `src/modules/system-status/infrastructure/drizzle-database-probe.db.test.ts` | 22.6 s                                                                    |
| `src/platform/migrate-script.test.ts`                                        | 22.4 s                                                                    |

Parallel database files exhaust memory and hit timeouts.

## Why

Every database-touching slice of the next seven changes pays this cost. The S3.1 apply batch took about 100 minutes, largely in test runs.

## Scope

- IN: a cached, pre-initialized PostgreSQL data-directory template reused for new embedded servers (copy instead of initdb); bounded parallelism for the database test project; an ESLint cache or narrower scope for the architecture test if it stays a bottleneck; before/after measurements recorded here.
- OUT: deleting tests, skipping tests locally, changing the single `pnpm test` command, CI changes beyond what the cache needs.

## Constraints

- Never skip silently. Keep the loud-failure and exit-code guarantees (embedded-postgres exit-hook workaround, `setupError` through provide/inject) and their tests.
- The template cache is keyed by the embedded-postgres version, created atomically (build in a temp dir, then rename) so concurrent first runs cannot corrupt it, and safe to delete.
- Cleanup stays EBUSY-safe on Windows.
- Commits: Conventional Commits, never Co-Authored-By or AI attribution.

## Tasks

- [x] T1 Measure the baseline: full-suite wall time and per-file durations, recorded in Progress.
- [x] T2 RED then GREEN: data-directory template cache for embedded servers (tests: a second server start reuses the template and skips initdb; the cache key includes the version; creation is atomic).
- [x] T3 Bound the database project's parallelism and re-measure.
- [ ] T4 (not done: architecture test measured 7.8 s on a quiet machine and 11-21 s under load; deferred) Speed up the architecture test (ESLint cache or narrower scope) only if it still takes more than 20 s.
- [~] T5 (partial: gates green, two consecutive green runs, 90 s target NOT met; see Progress) Final measurement (median of two full runs), full gate, commit, PR to `main`, RDD assessment recorded.

## Acceptance criteria

- Full local suite at most 90 s (median of two runs) and no failure in two consecutive full runs.
- Every existing guarantee preserved; the coverage gate still passes.
- CI green on the PR.

## Checks

`pnpm test:coverage`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`, `gh pr checks <n>`.

## Progress

- 2026-10-06: feature document created by the orchestrator.
- T1 baseline (branch `perf/test-suite-speed` from `a8424a7`): full `pnpm test` 259 s wall (240 s Vitest), 26 files, 135 tests, all green. Slowest: postgres-server.test 70.8 s, test-database.db 70.7, drizzle-database-probe.db 47.5, migrate-script.db 29.3, architecture 22.2, migrate-script.test 16.7.
- T2 RED: `data-dir-template.test.ts` failed on the missing module; the cache-reuse test failed on the missing `postgresTemplateDir`; the `shared_buffers`/`autovacuum` assertions failed with `128MB`; `stopWithEscalation` tests failed with `is not a function`. GREEN after implementing `data-dir-template.ts` and the changes in `postgres-server.ts`. Commit 8873289.
  - Findings: `fs.cp` and `robocopy` of the 970-file template cost 7-20 s (cpSync about 5 s with `--wal-segsize=1`); an uncached initdb costs about 30 s, so the copy is faster but not free on this I/O-bound machine.
  - Root cause of the intermittent 240 s hangs and leaked `postgres.exe` children: embedded-postgres stops with `taskkill /t`, the postmaster restarts its children for crash recovery and is killed mid-restart, leaving orphans that also hold the inherited output pipes (a piped command never ends). Fix: on Windows kill only the postmaster (children exit by themselves; verified 0 leftovers over 5 iterations), repeat the kill if the exit does not arrive. Also gave the exit-code test a 60 s timeout (it timed out at the 5 s default when the machine was busy).
- T3: `maxWorkers: 2` in `vitest.config.ts` (3 workers measured 132 s vs 140 s, no gain). Commit dc775cb. No behavior test is possible for a pool setting; verified by measurement.
- T4: not done (see above).
- T5 measurements (wall time of `pnpm test`, Vitest JSON reporter):
  - Quiet machine, after T2+T3 (before the stop fix): 77 s, once.
  - After the stop fix, machine busier: 139 s and 141 s (two consecutive green runs), coverage run 142 s.
  - Slowest files in the last plain run: postgres-server.test 27.7 s, test-database.db 27.5, drizzle-database-probe.db 21.9, architecture 21.1, request-services.db 15.3, migrate-script.test 13.9.
  - Remaining time is dominated by `CREATE DATABASE ... TEMPLATE` clones (2-5 s each on this machine, independent of WAL segment size) across about 25 database tests.
- Gates: `pnpm test:coverage` green (147 tests, Statements/Branches/Functions 100% on the gated scope), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` all exit 0.
- Authored lines: 461 added / 44 deleted in code (production-side test infrastructure about 240, tests about 265).
- Mirror: Engram `odd/test-suite-speed/tasks` (update pending until saved).

## Next step

Push, open the PR with the measurements, record the RDD assessment.
