# Monthly Enrollment E5 — Atomic Seat Transactions

Branch: `feat/monthly-enrollment-e5-seat-ledger`
Base: E4 branch at `27ba9e3` (PR #84 merged as `802a744`)
Mode: ODD with strict TDD
Risk: high (money state, seat capacity, PostgreSQL concurrency)

## Scope

Deliver a standalone Drizzle `SeatLedger` plus a transactional `DrizzleAdminEnrollmentStore`. Administrative confirm/cancel/material mutations must lock and mutate order, counter, and audit in one PostgreSQL transaction. E6 owns composition. F6 owns admin intensive routes and UI.

## Acceptance

- Fake and Drizzle admin stores satisfy the same mutation/read contract.
- Eight simultaneous confirmations against three remaining places produce exactly three payments and five `turno-full` results.
- Concurrent duplicate confirmation consumes one seat and writes one successful payment audit.
- Concurrent cancel/confirm on one order never desynchronizes order, counter, or audit.
- Different turnos progress independently under deterministic probes.
- Audit insertion failure rolls back order and counter.
- Manual oversell violates the database CHECK.
- Capacity below confirmed blocks new claims without corrupting the existing count.
- Concurrency suite passes twenty consecutive runs without retry-until-green.
- No production composition, route, UI, workshops, or materials files change.

## Allowed edit surfaces

- `src/modules/enrollments/infrastructure/drizzle-seat-ledger.ts`
- `src/modules/enrollments/infrastructure/drizzle-admin-enrollment-store.ts`
- enrollment infrastructure DB tests under `src/modules/enrollments/infrastructure/**`
- `src/testing/contracts/seat-ledger.contract.ts`
- `src/testing/contracts/admin-enrollment-store.contract.ts`
- `src/testing/fakes/enrollments-seat-ledger*.ts`
- `src/testing/fakes/enrollments-order-repository*.ts`
- enrollment application ports/tests only when contract parity requires a narrow type correction
- `src/modules/enrollments/index.ts` for module API exports
- this tracker

Do not edit `src/app/**`, `src/composition/**`, workshops/materials modules, schema/migration artifacts, or F6-owned files.

## Tasks

| ID  | Work unit                                                                 | Status      | Evidence                                                                 |
| --- | ------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| T1  | Define shared admin-store/ledger contracts and characterize fake behavior | done        | 17/17 shared contract tests; independent verifier PASS                   |
| T2  | Make fake contracts GREEN and preserve E3 regressions                     | done        | Existing E3 fake already satisfied contract; admin service 27/27         |
| T3  | Implement and verify `DrizzleSeatLedger`                                  | done        | Fake/Drizzle ledger 12/12; module 192; architecture 17; typecheck pass   |
| T4  | Implement transactional `DrizzleAdminEnrollmentStore`                     | done        | Shared DB contract and full DB file 19/19; atomic rollback verified      |
| T5  | Add and repeat PostgreSQL concurrency/rollback probes                     | done        | Blob evidence: 7 selected probes × 20 repeats = 140/140 PASS             |
| T6  | Run independent verification and all repository gates                     | done        | Unit 2202, UI 536, E5 DB 19; type/lint/format/build/diff pass            |
| T7  | Commit, publish, and prepare the E5 PR                                    | in progress | Local commits complete; push/PR and Linux CI require owner authorization |

## Delivery strategy

E5 depends on E4; PR #84 is merged and the E5 base is now an ancestor of `origin/main`. The forecast is approximately 260 production plus 430 test lines. Tests will not be compressed. The owner approved `size:exception` for one cohesive E5 PR.

## Log

- L1 (2026-10-22). E5 worktree created from E4 head `27ba9e3`; PR #84 later merged as `802a744`, making the E5 base an ancestor of `origin/main`.
- L2 (2026-10-22). Read-only architecture mapping selected `DrizzleAdminEnrollmentStore` as the production atomic boundary plus a standalone `DrizzleSeatLedger`. Calling independent ledger and repository transactions from the admin service is explicitly rejected.
- L3 (2026-10-22). The owner explicitly approved `size:exception` for one cohesive E5 PR because the atomic store and its concurrency evidence cannot be separated honestly under 400 lines.
- L4 (2026-10-22). Shared contract characterization was GREEN because E3 already implemented the fake semantics: seat ledger plus admin store passed 17/17, and admin service regressions passed 27/27. Independent verification found no contract weakness; PostgreSQL lock/CHECK/rollback probes remain deliberately RED work for T3-T5.
- L5 (2026-10-22). Drizzle ledger RED progressed from missing import to four named behavioral failures. GREEN passed fake/Drizzle ledger 12/12, module 192/192, architecture 17/17 and canonical typecheck. Independent inspection found no ledger SQL defect; its reported FAIL refers only to intentionally pending T4/T5 admin atomicity and concurrency probes.
- L6 (2026-10-22). Drizzle admin store RED progressed from missing import to 11 named contract failures. GREEN passed the shared contract, then the first expanded DB run exposed two incorrect test expectations and a Windows embedded-PostgreSQL lifecycle crash. Sequential per-test database cleanup eliminated the crash. Corrected serializable cancel/confirm outcomes and nested SQLSTATE assertion brought the full DB file to 17/17.
- L7 (2026-10-22). Independent audit rejected the weak different-turno probe. The strengthened suite now uses an advisory-lock trigger plus `pg_stat_activity` to prove the second turno commits while the first waits, uses exact capacity 8 with 5 preloaded seats, and proves amount-mismatch/closed-period no-op behavior. Strengthened probes 4/4 and full DB file 19/19 passed.
- L8 (2026-10-23). The first 20-run command was invalid because its anchored pattern selected zero tests. The corrected fresh-process proof passed preflight plus four runs (35/35 executions), then the fifth Vitest process crashed with Windows `0xC0000409` before executing probes and without assertion or teardown errors. A single-process `--repeats 19` run then passed all seven selected probes with `repeatCount: 19`, proving 140/140 executions in 661.55s with no worker crash, unhandled error, retry or teardown failure. Machine-readable evidence is `C:/Temp/e5-stability-seven-v1.json`; this isolates the earlier failure to repeated Windows process lifecycle rather than product concurrency behavior.
- L9 (2026-10-23). Final independent review found and remediated sequential cleanup, exact optional audit notes and strict fake lint before delivery. Typecheck, lint, format, build and diff-check pass. Unit passed 2202/2202 and UI passed 536/536. The DB project passed 21/22 files and 276 tests before a Windows worker crashed with `0xC0000409` in an unchanged workshop test; that exact file then passed 18/18 in isolated monoworker execution with no leftover postgres/Vitest process. The E5 DB file separately passed 19/19 and its concurrency core passed 140/140. The remaining delivery gate is Linux PR CI because the combined Windows harness cannot provide one clean all-project invocation.
