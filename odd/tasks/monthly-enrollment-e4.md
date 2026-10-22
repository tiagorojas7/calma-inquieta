# Monthly Enrollment E4 — Order Persistence

Branch: `feat/monthly-enrollment-e4-persistence`  
Base: `origin/main` at `be00eac`  
Mode: ODD with strict TDD  
Risk: high (schema and migration)

## Scope

Deliver the additive enrollment schema, generated migration, and Drizzle `OrderRepository` with shared fake/Drizzle contract parity. E5 owns seat-claim transactions and concurrency. E6 owns composition. F6 owns admin intensive routes and UI.

## Acceptance

- Fake and Drizzle repositories pass the same order contract.
- Twenty parallel creators receive unique consecutive Córdoba-year numbers.
- Refused or rolled-back creation does not burn a number.
- The active-order partial unique constraint maps to `duplicate-order`.
- Database checks enforce totals, whole pesos, line quantities, and allowed states.
- Admin list filters and 50-row pagination match the application contract.
- Public lookup accepts only the public id, never the human order number.
- The generated migration is additive, drift-clean, and applies from empty and prior state.
- Production plus handwritten tests remain an honest review slice; generated Drizzle artifacts are reported separately.

## Allowed edit surfaces

- `src/modules/enrollments/infrastructure/**`
- `src/platform/db/schema/enrollments.ts`
- `src/platform/db/schema.ts`
- `src/testing/contracts/order-repository.contract.ts`
- `src/testing/fakes/enrollments-order-repository*.ts`
- `src/platform/db/*migration*.test.ts`
- `tooling/architecture/schema-ownership.test.ts` only if the existing ownership contract requires it
- generated `drizzle/**` for the new additive migration
- this tracker

Do not edit `src/app/**`, `src/composition/**`, workshops/materials modules, or F6-owned files.

## Tasks

| ID  | Work unit                                                              | Status      | Evidence                                                                |
| --- | ---------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------- |
| T1  | Extend the shared order-repository contract and capture behavioral RED | done        | RED: 2 list/pagination failures; GREEN: 39 focused and 175 module tests |
| T2  | Add the enrollment schema and database CHECK/unique/index constraints  | in progress |                                                                         |
| T3  | Implement the Drizzle order repository and contract parity             | pending     |                                                                         |
| T4  | Generate and verify the additive migration                             | pending     |                                                                         |
| T5  | Run independent verification and all repository gates                  | pending     |                                                                         |
| T6  | Commit, publish, and prepare the E4 PR                                 | pending     |                                                                         |

## Delivery strategy

One E4 PR to `main`, independently mergeable before E5. If the handwritten diff cannot stay within the existing E4 forecast without separating tests from behavior, perform one honest slicing pass and request `size:exception` rather than compressing evidence.

## Log

- L1 (2026-10-22). PRs #81, #82, and #83 are merged. E4 starts from `origin/main` merge `be00eac` in isolated worktree `CalmaInquieta-e4`.
- L2 (2026-10-22). Read-only mapping confirmed no remaining product decision for E4 after A2/A6/A7. E4 can land independently; E5 depends on its tables and owns atomic seat/order transactions.
- L3 (2026-10-22). Shared-contract RED observed two behavioral failures: the fake ignored admin filters/newest-first ordering and returned 51 rows instead of a fixed 50-row page. GREEN promoted one canonical `OrderRepositoryListQuery`, moved filtering/pagination into the repository, and preserved the admin inbox pending-confirmation default. Focused 39/39 and module 175/175 passed. Direct `tsc --noEmit` could not resolve generated route types; the canonical generated `pnpm typecheck` remains a final gate.
