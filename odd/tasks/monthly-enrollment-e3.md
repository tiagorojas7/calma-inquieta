# Monthly enrollment E3: admin application and seat claim

- Objective: add the admin enrollment application service with authorization-first payment confirmation, seat claiming/release, cancellation, materials transitions, audit and deterministic fake concurrency.
- Branch: `feat/monthly-enrollment-e3-admin`, based on `origin/main` `24ad28d`.
- Source requirement: E3 in `openspec/changes/monthly-enrollment/tasks.md`; relevant specs are `seat-claim`, `orders` and `admin-enrollments`.
- Delivery strategy: one PR with reviewable internal work-unit commits; production must remain below 400 changed lines or the slice is reconsidered.
- Test runner: `corepack pnpm test <path>` (strict TDD).

## Owner decisions

Accepted for v1 on 2026-10-21:

- A2. One order represents one student, workshop, turno and month.
- A6. Orders do not expire automatically; a closed or past period blocks payment confirmation.
- A7. Materials are mandatory only when the selected period requires them.

Previously accepted decisions remain binding: pending orders do not reserve seats; payment must exactly equal the order total; over-capacity confirmation has no override; cancellation is admin-only and paid cancellation releases one seat; student data is snapshotted on the order.

## Specs

- S1. Missing, malformed or non-admin actors are denied before repository or ledger access.
- S2. Payment confirmation validates exact whole-peso amount, future date, period openness and capacity; success atomically claims one seat, marks paid and writes one audit event.
- S3. Repeated confirmation is idempotent; the counter, paid timestamp and audit do not change.
- S4. Pending cancellation changes no seat count; paid cancellation releases one seat; repeated cancellation is idempotent; terminal/material states refuse illegal cancellation.
- S5. Materials transitions enforce lines, process bulk items independently and write audit only for successful transitions.
- S6. Fake concurrency allows exactly the remaining capacity and only one claim for a double-click on the same order.
- S7. The unavailable admin service fails closed after authorization.

## Tasks

| ID  | Work unit                                                                        | Status      | Evidence                                                                                                       |
| --- | -------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| T1  | Add RED admin-service tests for authorization, confirmation and cancellation     | done        | Valid behavioral RED: 6 failures / 22 tests after the first partial writer was rejected                        |
| T2  | Extend repository/ledger contracts and fakes for atomic admin outcomes           | done        | `AdminEnrollmentStore` is the atomic application boundary; reusable seat-ledger contract added                 |
| T3  | Implement confirmation and cancellation behavior                                 | done        | One captured clock instant, validation, idempotence, audit and rollback covered                                |
| T4  | Add materials transitions, bulk behavior and fake concurrency                    | done        | Bulk isolation, 8-for-3 capacity, double-click and independent-turno cases covered                             |
| T5  | Add the unavailable placeholder and coordinate AppServices registration after F6 | done        | Composition RED observed, then `AppServices.enrollments` fails closed; F6 hunks documented as disjoint         |
| T6  | Run independent verification and full gates                                      | done        | Independent verifier PASS; 175 module tests, 12 fake tests, typecheck, lint, format, build and diff-check pass |
| T7  | Commit, publish and prepare the E3 PR                                            | in progress | Work-unit commit `6040b2d`; push and PR remain owner decisions                                                 |

## Parallel ownership

- The other Pi terminal owns admin F6 routes/UI and its `src/composition/request-services.ts` wiring.
- E3 owns `src/modules/enrollments/**`, enrollment fakes/contracts and the unavailable enrollment placeholder.
- F6 handed off stable wiring commit `973913c` and explicitly released adjacent `request-services.ts` hunks; E3 adds only the `enrollments` type, field and unavailable placeholder.

## Log

- L1 (2026-10-21). GitHub confirmed E0 PR #70, E1 PR #74 and E2 PR #77 are merged; no E3 implementation or PR exists.
- L2 (2026-10-21). The owner explicitly accepted assumptions A2, A6 and A7 as v1 behavior, resolving the only product uncertainty found by exploration.
- L3 (2026-10-21). The first writer produced only a syntax-error failure, so its TDD evidence was rejected. A read-only gap audit found missing atomicity, clock capture, validation codes, list/detail, complete auth coverage and concurrency probes. Test-only remediation then produced valid behavioral RED: 6 failures / 22 tests (clock capture, calendar/future codes, unavailable rollback, and missing list/detail).
- L4 (2026-10-21). The corrected application uses `AdminEnrollmentStore` as the single atomic mutation boundary for future E4/E5 Drizzle transactions. Focused core/ledger tests reached 23/23, then additional regression coverage for default inbox, Córdoba dates, bulk clock capture, cancellation rollback, keyed isolation and read failure handling brought the focused suite to 29/29. The additional subagent exhausted credits before returning its RED transcript; the parent directly re-ran and observed the final 29/29 GREEN result.
- L5 (2026-10-21). Composition coordination: F6 wiring is isolated in `973913c`; the other terminal explicitly released adjacent hunks. `request-services.enrollments.test.ts` failed RED because `services.enrollments` was undefined, then passed after adding the fail-closed placeholder.
- L6 (2026-10-21). Independent verification found a same-turno rollback race, a bulk placeholder shape mismatch, a missing fake `AppServices` member and lint-safe Córdoba formatting. Behavioral regressions were added before remediation; the unavailable placeholder also gained authorization-first coverage after a second verifier finding. Final independent verification passed: focused 33, module 175 and fake 12 tests; typecheck, lint, format, build and diff-check all passed. Production remains within budget at 338 added / 4 removed lines.
- L7 (2026-10-21). Work-unit commit: `6040b2d feat(enrollments): add admin order operations`.
