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
- latest-migration expectations in `src/composition/request-services.db.test.ts`, `src/testing/contracts/database-probe.contract.ts`, and `src/testing/fakes/in-memory-database-probe.test.ts`
- `tooling/architecture/schema-ownership.test.ts` only if the existing ownership contract requires it
- generated `drizzle/**` for the new additive migration
- this tracker

Do not edit `src/app/**`, composition production code, workshops/materials modules, or F6-owned files.

## Tasks

| ID  | Work unit                                                              | Status      | Evidence                                                                 |
| --- | ---------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| T1  | Extend the shared order-repository contract and capture behavioral RED | done        | RED: 2 list/pagination failures; GREEN: 39 focused and 175 module tests  |
| T2  | Add the enrollment schema and database CHECK/unique/index constraints  | done        | 9 schema DB tests; independent verifier PASS                             |
| T3  | Implement the Drizzle order repository and contract parity             | done        | Fake/Drizzle contract 23/23; 20-creator and rollback probes pass         |
| T4  | Generate and verify the additive migration                             | done        | Generated `0011_many_martin_li`; empty/prior-state path and catalog pass |
| T5  | Run independent verification and all repository gates                  | done        | Verifier PASS; full suite 2993/2993; typecheck/lint/format/build pass    |
| T6  | Commit, publish, and prepare the E4 PR                                 | in progress | Local commits `032f381`, `a4d096b`; delivery commit pending              |

## Delivery strategy

One E4 PR to `main`, independently mergeable before E5. If the handwritten diff cannot stay within the existing E4 forecast without separating tests from behavior, perform one honest slicing pass and request `size:exception` rather than compressing evidence.

## Log

- L1 (2026-10-22). PRs #81, #82, and #83 are merged. E4 starts from `origin/main` merge `be00eac` in isolated worktree `CalmaInquieta-e4`.
- L2 (2026-10-22). Read-only mapping confirmed no remaining product decision for E4 after A2/A6/A7. E4 can land independently; E5 depends on its tables and owns atomic seat/order transactions.
- L3 (2026-10-22). Shared-contract RED observed two behavioral failures: the fake ignored admin filters/newest-first ordering and returned 51 rows instead of a fixed 50-row page. GREEN promoted one canonical `OrderRepositoryListQuery`, moved filtering/pagination into the repository, and preserved the admin inbox pending-confirmation default. Focused 39/39 and module 175/175 passed. Direct `tsc --noEmit` could not resolve generated route types; the canonical generated `pnpm typecheck` remains a final gate.
- L4 (2026-10-22). Schema/migration RED observed 10 failures before the five tables existed. Independent verification then found that paid cancellations could not retain payment evidence and that prior-state application was unproven. A regression reproduced SQLSTATE 23514, the paid-state check was corrected, and migration tests now apply through 0010 before 0011. Regenerated `0011_many_martin_li` is purely additive. Final schema/migration verification passed 39 DB/architecture tests plus 187 enrollment/fake tests.
- L5 (2026-10-22). The owner explicitly approved `size:exception` for one cohesive E4 PR because the contract/fake work unit alone was 409 changed lines and splitting schema from the Drizzle adapter would separate tests from behavior.
- L6 (2026-10-22). Drizzle repository RED produced 11 named contract failures. GREEN passed fake/Drizzle parity (23/23), 20 parallel creators, rollback number reuse, snapshots, filters and transitions. Final verifier found seven lint issues and three stale latest-migration fixtures; remediation preserved behavior and all gates passed: enrollments 186, schema/migration/architecture 56, full suite 2993, typecheck, lint, format, build and diff-check.
