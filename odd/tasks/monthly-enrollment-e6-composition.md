# Monthly Enrollment E6 — Cross-Module Composition

Branch: `feat/monthly-enrollment-e6-composition`
Base: `35165fe` (PR #91 merged into `main`)
Mode: ODD with strict TDD
TDD source: direct owner instruction
Runner: `pnpm test <focused paths>`
Risk: high (public order creation, cross-module availability, fail-closed behavior)
Route: delegated direct; mapping trigger fired because understanding spans more than four files, and the writer trigger applies to every implementation work unit.

## Objective

Connect enrollment application ports to workshop offers, period material offers, material snapshots, order persistence, and request-scoped services through module APIs and composition. Dependency failures must never create an order from incomplete or stale availability data.

## Scope

- Add the smallest actorless module-API reads required by enrollment.
- Adapt workshop/period and material data to enrollment-owned ports in composition.
- Compose the public enrollment service and the existing administrative enrollment service.
- Preserve actor-first authorization for administrative operations.
- Represent unavailable dependencies explicitly for order creation while allowing safe public read degradation.
- Add module, adapter, and request-service tests.

## Non-goals

- No routes or UI (E7/E8).
- No capacity editing or public availability projection (E10).
- No supplier consolidation (E9).
- No schema or migration changes unless a failing E6 contract proves they are unavoidable.
- No generic design-system or unrelated catalog changes.

## Acceptance

- Enrollment resolves only published, unpaused workshops with an open, non-past Córdoba period and an offered turno.
- Enrollment offer snapshots include the authoritative fee, material requirement, turno schedule, and capacity.
- Offered materials come only from enabled period offers and retain material, variant, price, availability, and supplier snapshots.
- An unavailable workshop, period, material, order, or database dependency cannot be interpreted as an absent offer and cannot create an order.
- Public read degradation does not expose infrastructure errors; order creation returns an explicit unavailable result.
- Administrative authorization happens before any lookup or mutation, including unavailable fallbacks.
- `createRequestServices` exposes real public and administrative enrollment services when dependencies are available and a fail-closed service otherwise.
- Architecture boundaries remain green.

## Allowed edit surfaces

- `src/modules/workshops/application/contracts.ts`
- `src/modules/workshops/application/monthly-workshop-service.ts`
- `src/modules/workshops/application/workshop-period-service.ts`
- focused enrollment-read tests under `src/modules/workshops/application/**`
- `src/modules/workshops/index.ts`
- `src/modules/materials/application/contracts.ts`
- `src/modules/materials/application/material-service.ts`
- focused enrollment-read tests under `src/modules/materials/application/**`
- `src/modules/materials/index.ts`
- `src/modules/enrollments/application/offer-lookup.ts`
- `src/modules/enrollments/application/offered-materials.ts`
- `src/modules/enrollments/application/public-enrollment-service.ts`
- focused E6 tests under `src/modules/enrollments/application/**`
- `src/modules/enrollments/index.ts`
- E6-specific adapters and tests under `src/composition/**`
- `src/composition/request-services.ts`
- `src/composition/request-services.enrollments.test.ts`
- `src/testing/fakes/app-services.ts`
- `odd/tasks/monthly-enrollment-e6-composition.md`
- `odd/tasks/monthly-enrollment.md`

Do not edit routes, UI, schemas, migrations, generic design components, supplier screens, media/R2 files, or unrelated workshop/material administration behavior.

## Tasks

| ID       | Work unit                                                                                                 | Status | Evidence                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| ME-E6-T1 | Characterize and expose the workshop enrollment-offer read boundary with strict RED → GREEN → REFACTOR    | done   | `54151e1`; RED missing modules; corrected GREEN 212 tests; architecture 17; typecheck; independent PASS |
| ME-E6-T2 | Characterize and expose offered-material snapshots through module APIs with strict RED → GREEN → REFACTOR | done   | `f81070f`; module APIs 237; architecture 17; typecheck; independent PASS                                |
| ME-E6-T3 | Add composition adapters and explicit unavailable semantics with strict RED → GREEN → REFACTOR            | done   | `e0d3ca6`, `f77f5b6`; focused 37; architecture 17; typecheck; independent PASS                          |
| ME-E6-T4 | Wire public/admin enrollment request services and prove unavailable adapters fail closed                  | done   | `349d585`; focused 13 + regressions 3; architecture 17; typecheck; independent PASS                     |
| ME-E6-T5 | Run independent verification and repository gates                                                         | done   | Focused 65; unit 2257; UI 553; DB targets 43+28; type/lint/format/build/diff pass                       |
| ME-E6-T6 | Commit cohesive work units and prepare the issue-first chained delivery structure                         | done   | Seven local slices prepared; issue #92 approval and publication authorization pending                   |

## Verification

Focused checks first, then:

- `pnpm test src/modules/workshops`
- `pnpm test src/modules/materials`
- `pnpm test src/modules/enrollments`
- focused composition tests
- `pnpm test tooling/architecture/architecture.test.ts`
- `pnpm typecheck`
- `pnpm lint` (never concurrently with typecheck)
- `pnpm format:check`
- relevant full unit/UI/DB projects with DB workers limited to one and sequential cleanup
- `pnpm build`
- `git diff --check`
- independent verifier
- Linux CI before delivery is declared ready

## Delivery strategy

Strategy: `auto-chain`, `stacked-to-main`. One honest slicing pass produced seven cohesive local branches, each within the 400-line review budget and containing its tests:

| Position | Branch                                             | Head      | Base   | Review budget                         |
| -------- | -------------------------------------------------- | --------- | ------ | ------------------------------------- |
| 1        | `feat/monthly-enrollment-e6a-offer-api`            | `bf7c896` | `main` | 316                                   |
| 2        | `feat/monthly-enrollment-e6b-offer-adapter`        | `3138148` | E6a    | 96                                    |
| 3        | `feat/monthly-enrollment-e6c-material-ports`       | `a92b86a` | E6b    | 332                                   |
| 4        | `feat/monthly-enrollment-e6d-material-adapter`     | `c2f89ee` | E6c    | 336                                   |
| 5        | `feat/monthly-enrollment-e6e-request-services`     | `4804160` | E6d    | 170                                   |
| 6        | `chore/monthly-enrollment-e6f-application-quality` | `76e1f30` | E6e    | 271                                   |
| 7        | `chore/monthly-enrollment-e6g-composition-quality` | local tip | E6f    | ~190 including final tracker evidence |

Each child PR targets its immediate predecessor until the parent merges, then is retargeted to `main` so GitHub shows only the current slice. Issue #92 exists but lacks the protected `status:approved` label; no branch is pushed and no PR is opened until the owner explicitly authorizes that exact label and the publication batch.

## Progress log

- L1 (2026-10-23). PR #91 was confirmed merged into `main` as `35165fe`; the E6 worktree and branch were created from that commit.
- L2 (2026-10-23). Terminal B acknowledged Terminal A ownership of enrollment E6–E10 and reserved `request-services.ts`, `app-services.ts`, and workshop/material module APIs for A1. Terminal B's DA-7 surfaces do not overlap.
- L3 (2026-10-23). Read-only mapping found existing enrollment ports and application behavior but no cross-module adapters or public enrollment request-service wiring. The current actorless ports cannot distinguish dependency failure from ordinary absence, so order creation must gain an explicit unavailable path.
- L4 (2026-10-23). Central and OpenSpec trackers are historical: E3–E5 are complete, and PR #91 is merged. E6 follows the owner-specified order E6 → E10 → E7 → E8 → E9.
- L5 (2026-10-23). The first issue script stopped before mutation because two protected output files had not been created before `chmod`; delegated incident diagnosis proved `no_write`. The corrected one-attempt flow performed a fresh duplicate search, privacy scan, creation, and readback. Issue #92 is OPEN with `type:feature`; no protected approval label was inferred or added.
- L6 (2026-10-23). ME-E6-T1 RED failed because `enrollment-offer` and its adapter did not exist. GREEN/refactor passed 210 focused tests, architecture 17, typecheck, and diff-check. Independent verification rejected the first candidate because it trusted repository results without checking `period.workshopId` and the exact requested period.
- L7 (2026-10-23). A bounded second RED proved both identity defects, then the two guards brought the focused set to 212/212. Independent re-verification passed focused tests, architecture 17, typecheck, and diff-check. Commit `54151e1` contains 124 production and 288 test lines (412 authored lines); the slight overage is one cohesive, already honestly sliced offer-boundary unit and no tests were compressed. Native risk assessment was unassessable because untracked tracker state required declaration; inspect then stopped on `managed_assets_outdated`, and the exact sync continuation failed because `pi-mcp-adapter/index.ts` is missing. The independent high-risk verifier is therefore the review evidence.
- L8 (2026-10-23). ME-E6-T2 RED failed because the workshop offer-ID boundary, material snapshot boundary, and composition adapter did not exist. GREEN passed 239 focused tests, architecture 17, typecheck after correcting incomplete test fixtures, and diff-check. Independent verification rejected the first candidate: dropping a B9-offered ID whose current material disappeared incorrectly produced `material-not-offered`, and inactive material validation occurred after variant lookup. A bounded correction preserved B9 membership as an unavailable sentinel and made material availability precede variant resolution; all checks passed.
- L9 (2026-10-23). Re-verification accepted the corrected semantics but rejected task scope because the composition adapter and public-service integration belong to ME-E6-T3, while ME-E6-T2 is the module-API boundary. The honest split kept the eight workshop/material API and test files in T2 and held the adapter plus enrollment integration uncommitted for T3. This preserves behavior and reviewability without deleting or compressing tests.
- L10 (2026-10-23). The first staged T2 verifier process exited before `agent_settled` with Windows `0xC0000409`, without a test or assertion result. One bounded replacement verifier passed: 3 focused tests, 237 module tests, architecture 17, typecheck, and staged diff-check. Commit `f81070f` contains 93 production and 109 test lines (202 authored). Native assessment remained unassessable because of untracked selection and inspect again stopped on the already-proven missing managed asset; independent high-risk verification is the review evidence.
- L11 (2026-10-24). The adapter/sentinel staged candidate passed 34 focused tests, architecture 17, typecheck, diff-check and semantic inspection. A broad enrollment command improperly included DB tests without `maxWorkers 1`; it reached 207/213 before an unrelated DB worker exited Windows `0xC0000409` without assertion failure. One corrected non-DB unit command then timed out without assertions and was not retried again. Commit `e0d3ca6` contains 46 production additions/5 deletions and 142 test additions/3 deletions.
- L12 (2026-10-24). Explicit rejected-dependency guards went RED with five promise rejections escaping as `Error: offline`; GREEN returned typed `unavailable` without order creation or infrastructure detail. Focused tests passed 37/37, architecture 17, typecheck and diff-check. Independent verification passed and confirmed synchronous/domain logic remains unswallowed. Commit `f77f5b6` contains production +54/-19 and tests +64/-3. The known broad unit-run timeout remains environmental evidence for final slice verification, not a focused assertion failure.
- L13 (2026-10-24). ME-E6-T4 RED found `publicEnrollments` undefined in three request-service tests. GREEN composed request-scoped public/admin Drizzle dependencies and fail-closed no-DB placeholders. The first verifier caught two fallback assertions accidentally using an unreachable configured database; the correction switched them to empty config, removing local-network dependence. Final focused tests passed 13/13 plus 3 unrelated composition regressions, architecture 17, typecheck and diff-check. Independent verification passed. Commit `349d585` contains production +74/-3 and test/support +87/-7.
- L14 (2026-10-24). Final verification passed focused E6 65/65, full unit 2257/2257, UI 553/553, typecheck, build and diff-check. Lint found 11 `require-await` errors in E6 test doubles and format-check found eight E6/tracker files; bounded remediation is active. The one full DB run used maxWorkers 1 and no file parallelism but timed out after 600 seconds after reporting 20 intensive-repository and 9 public-taller-record assertion failures. Those test/repository paths are unchanged by E6; assertion bodies were not retained, so causality remained uncertain. The full DB command was not rerun.
- L15 (2026-10-24). Read-only diagnosis found the two failed DB suites use disjoint tables and per-file cloned databases but share one embedded PostgreSQL/template/process lifecycle. One targeted sequential process per file, with maxWorkers 1, no file parallelism, verbose output and no retry, passed: intensive repository 43/43 in 283.38s and public taller records 28/28 in 152.06s, both with clean setup/teardown. This localizes the earlier full-project failures to combined Windows DB process sequencing/environment rather than E6 assertions. The lint/format worker later timed out without a report, but inspection found changes confined to its ten authorized E6 files and no remaining relevant process.
- L16 (2026-10-24). Lint/format remediation changed only no-await test doubles to equivalent `Promise.resolve` returns plus Prettier layout. Replacement verification passed E6 focused 65/65, lint, typecheck and diff-check; one file still failed format, was formatted once, and a final bounded verifier passed repository format-check and diff-check. Final local evidence is focused 65, full unit 2257, UI 553, targeted DB 43 + 28, architecture 17, typecheck, lint, format, build and diff-check. The combined Windows DB project remains a documented environmental failure; Linux CI is still mandatory after authorized publication.
- L17 (2026-10-24). Local delivery preparation rebuilt the verified tree into seven stacked branches with exact immediate-parent diffs of 316, 96, 332, 336, 170, 271 and about 190 lines after final tracker evidence. This split keeps behavior with tests and avoids both `size:exception` and review compression. The final delivery branch and verified development head have identical Git trees; only commit topology differs.

## Next step

Request one owner decision authorizing `status:approved` on issue #92 plus push/opening the seven-PR publication batch. Linux CI remains required before E6 is deliverable.
