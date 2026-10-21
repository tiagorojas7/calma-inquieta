# Retire public catalog placeholders

- Objective: remove the obsolete `talleres` and `intensivos` coming-soon content now that both public catalog routes are live, while preserving the `eventos-privados` placeholder.
- Branch: `chore/public-catalog-retire-coming-soon`, based on `origin/main` merge `24ad28d` after the owner merged PR #80.
- Source requirement: public-catalog C4-B4 in `openspec/changes/public-catalog/tasks.md`.
- Test runner: `corepack pnpm test src/modules/site-content` (strict TDD).

## Specs

- S1. `ComingSoonSlug` contains only `"eventos-privados"`.
- S2. The repository exposes exactly one coming-soon page, for private events.
- S3. The retained page keeps non-empty SEO, message and the `eventos-privados` WhatsApp topic.
- S4. Catalog content and WhatsApp message topics for talleres and intensivos remain unchanged; only their obsolete placeholder pages are removed.

## Tasks

| ID  | Work unit                                                           | Status      | Evidence                                                                                                            |
| --- | ------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| T1  | Add RED site-content assertions for the single retained placeholder | done        | Key-set assertion failed with all three legacy slugs                                                                |
| T2  | Narrow the slug type and content registry                           | done        | Only `eventos-privados` remains in the type and registry                                                            |
| T5  | Repair narrowed-slug consumers                                      | done        | Three tests and the in-memory fake updated                                                                          |
| T3  | Run focused and independent verification                            | done        | Focused, typecheck, lint, format, build and runtime pass; isolated DB file passes after one full-suite worker crash |
| T4  | Commit the work unit and prepare its stacked PR                     | in progress | Pending work-unit commit and publication authorization                                                              |

## Log

- L1 (2026-10-21). GitHub confirmed the public Inicio and Intensivos work was already merged, correcting stale planning checkboxes. The owner selected immediate C4-B4 development stacked on PR #80 instead of waiting for its merge.
- L2 (2026-10-21). Parallel ownership is disjoint: the other Pi terminal owns admin F6 intensivos and confirmed it will not touch `src/modules/site-content/**`, `page-content.ts` or repository-content tests.
- L3 (2026-10-21). Full verification exposed that PR #80's branch was 29 commits behind `origin/main`; its old checkout still routed `/talleres` through Coming Soon. The owner authorized merging green PR #80. The branch was then rebased onto merge `24ad28d`, preserving the current public talleres routes and removing the stale-base type failure. Consumer remediation remains limited to site-content tests and its in-memory fake.
- L4 (2026-10-21). Independent verification after the rebase: site-content 10 files / 274 tests pass; targeted consumers 3 files / 89 tests pass; typecheck, lint, format, build and `git diff --check` pass. Runtime `/eventos-privados` returns 200 with both the `x-robots-tag` header and HTML meta set to `noindex, nofollow`; the dev process stopped cleanly. The full suite passed 241/242 files and 2887/2892 tests before a Windows Vitest worker crashed in `request-services.db.test.ts` with exit 3221226505; the verifier ran that file once in isolation and all 12/12 tests passed, classifying the crash as environmental rather than candidate-caused.
