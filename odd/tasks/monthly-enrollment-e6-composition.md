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

| ID | Work unit | Status | Evidence |
| --- | --- | --- | --- |
| ME-E6-T1 | Characterize and expose the workshop enrollment-offer read boundary with strict RED → GREEN → REFACTOR | done | `54151e1`; RED missing modules; corrected GREEN 212 tests; architecture 17; typecheck; independent PASS |
| ME-E6-T2 | Characterize and expose offered-material snapshots through module APIs with strict RED → GREEN → REFACTOR | in progress | Issue #92; strict RED delegated |
| ME-E6-T3 | Add composition adapters and explicit unavailable semantics with strict RED → GREEN → REFACTOR | pending | Mapping completed; RED not started |
| ME-E6-T4 | Wire public/admin enrollment request services and prove unavailable adapters fail closed | pending | Mapping completed; RED not started |
| ME-E6-T5 | Run independent verification and repository gates | pending | Not started |
| ME-E6-T6 | Commit cohesive work units and prepare the issue-first chained delivery structure | pending | Not started |

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

Strategy: `auto-chain`, with `stacked-to-main` when the two work units remain independently reviewable. Forecast: approximately 200 production plus 260 test lines, around 460 authored lines. The honest slicing pass is:

1. Workshop enrollment-offer boundary and adapter.
2. Offered-material boundary, explicit unavailable behavior, and request-service wiring.

Tests remain with their behavior. If the second unit cannot work without the first, it will be prepared as a stacked child. No push or PR creation occurs without owner authorization.

## Progress log

- L1 (2026-10-23). PR #91 was confirmed merged into `main` as `35165fe`; the E6 worktree and branch were created from that commit.
- L2 (2026-10-23). Terminal B acknowledged Terminal A ownership of enrollment E6–E10 and reserved `request-services.ts`, `app-services.ts`, and workshop/material module APIs for A1. Terminal B's DA-7 surfaces do not overlap.
- L3 (2026-10-23). Read-only mapping found existing enrollment ports and application behavior but no cross-module adapters or public enrollment request-service wiring. The current actorless ports cannot distinguish dependency failure from ordinary absence, so order creation must gain an explicit unavailable path.
- L4 (2026-10-23). Central and OpenSpec trackers are historical: E3–E5 are complete, and PR #91 is merged. E6 follows the owner-specified order E6 → E10 → E7 → E8 → E9.
- L5 (2026-10-23). The first issue script stopped before mutation because two protected output files had not been created before `chmod`; delegated incident diagnosis proved `no_write`. The corrected one-attempt flow performed a fresh duplicate search, privacy scan, creation, and readback. Issue #92 is OPEN with `type:feature`; no protected approval label was inferred or added.
- L6 (2026-10-23). ME-E6-T1 RED failed because `enrollment-offer` and its adapter did not exist. GREEN/refactor passed 210 focused tests, architecture 17, typecheck, and diff-check. Independent verification rejected the first candidate because it trusted repository results without checking `period.workshopId` and the exact requested period.
- L7 (2026-10-23). A bounded second RED proved both identity defects, then the two guards brought the focused set to 212/212. Independent re-verification passed focused tests, architecture 17, typecheck, and diff-check. Commit `54151e1` contains 124 production and 288 test lines (412 authored lines); the slight overage is one cohesive, already honestly sliced offer-boundary unit and no tests were compressed. Native risk assessment was unassessable because untracked tracker state required declaration; inspect then stopped on `managed_assets_outdated`, and the exact sync continuation failed because `pi-mcp-adapter/index.ts` is missing. The independent high-risk verifier is therefore the review evidence.

## Next step

Implement ME-E6-T2 offered-material snapshots with strict RED → GREEN → REFACTOR.
