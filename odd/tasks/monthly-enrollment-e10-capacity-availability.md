# Monthly Enrollment E10 — Capacity floor and availability

## Objective

Prevent workshop period capacity from being reduced below confirmed enrollment seats and expose an internal availability read per `(periodId, turnoId)` without changing public catalog output.

## Problem

Workshop period updates currently validate positive capacities and turno membership but do not consult confirmed enrollment seats. The enrollment seat ledger already owns confirmed counts, while `availableSeats(capacity, confirmed)` already clamps availability at zero. E10 must connect those capabilities through consumer-owned ports without crossing module boundaries or treating infrastructure failure as zero confirmed seats.

## Why

Confirmed seats are a hard invariant. A capacity edit must not invalidate paid enrollment state, and downstream readers need a deterministic, non-negative availability value that ignores pending orders.

## Scope

In scope:

- consumer-owned `ConfirmedSeatsLookup` in `workshops`;
- capacity-floor validation before workshop-period persistence;
- internal enrollment availability reader using the existing seat ledger and `availableSeats` domain function;
- composition adapters and request-scoped wiring;
- focused regression tests and repository gates.

Out of scope:

- public catalog contract/output changes;
- routes or UI;
- admin error-copy mapping;
- schema or migrations;
- pending-order seat holds;
- Terminal B F5a routes, UI, helpers, or tracker.

## Constraints and decisions

- Strict RED → GREEN → REFACTOR for every behavior change.
- Lookup and availability keys are exactly `(periodId, turnoId)`.
- No counter row means `confirmed = 0`, matching the existing `SeatLedger` contract and fake/Drizzle implementations.
- A lookup rejection or unavailable dependency fails closed as `{ kind: "unavailable" }`; capacity is not persisted.
- `capacity-below-confirmed` is the minimal `{ kind }` error unless an existing consumer proves more detail is required.
- Unrelated fee, material, project, and snapshot edits preserve current behavior.
- Public catalog remains `available: null` and displays `"Cupo limitado"`.
- Composition ownership was released after E6; Terminal B was notified before E10 writes and is staying in admin routes/UI.
- Keep each review unit below about 400 changed lines; do not compress tests.
- Never run typecheck and lint concurrently.
- DB verification uses one worker, no file parallelism, sequential cleanup, and no retry-until-green.

## Acceptance criteria

1. Reducing a turno capacity below confirmed seats returns `{ kind: "capacity-below-confirmed" }` and does not persist.
2. Capacity equal to or above confirmed seats succeeds.
3. Lookup rejection returns `{ kind: "unavailable" }` and does not persist.
4. Availability is `Math.max(0, capacity - confirmed)` per `(periodId, turnoId)`.
5. Pending orders do not reduce availability.
6. Independent periods and turnos do not share counts.
7. Unrelated period edits behave as before.
8. Public catalog output and UI copy remain unchanged.
9. Architecture, type, lint, format, build, and relevant test gates pass.

## Tasks

| ID        | Work unit                                                                       | Status | Evidence                                                                                    |
| --------- | ------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| ME-E10-T1 | Add the workshop-owned capacity-floor port and update guard with strict TDD     | done   | `a4f4e83`; RED 22/25; corrected GREEN 25/25; architecture 17; typecheck and diff-check PASS |
| ME-E10-T2 | Expose the enrollment availability reader with strict TDD                       | done   | `accc917`; missing-module RED; GREEN 6/6; architecture 17; typecheck and diff-check PASS    |
| ME-E10-T3 | Add composition adapters and request-scoped wiring with fail-closed semantics   | done   | `874d7b8`; RED; corrected GREEN 5/5; architecture 17; typecheck and diff-check PASS         |
| ME-E10-T4 | Run independent verification, repository gates, and prepare reviewable delivery | done   | Issues #107/#108 approved; PRs #109–#111 OPEN/MERGEABLE; exact heads passed Linux CI        |

## Delivery strategy

Strategy: `auto-chain`, `stacked-to-main`, with the shared F5a composition prerequisite as the immediate local base.

| Position     | Branch                                                   | Head      | Base          | Review budget                                  |
| ------------ | -------------------------------------------------------- | --------- | ------------- | ---------------------------------------------- |
| prerequisite | `feat/admin-catalog-f5a-composition-prereq`              | `9dbd584` | E6 final head | independently verified F5a wiring              |
| 1            | `feat/monthly-enrollment-e10-capacity-availability-code` | `cd4d3c8` | prerequisite  | 346                                            |
| 2            | `docs/monthly-enrollment-e10-delivery-evidence`          | local tip | E10 code      | tracker only, 127 before final evidence update |

The code slice keeps all behavior with its tests below 400 changed lines. The documentation follow-up contains only this ODD recovery/evidence tracker. The prerequisite, code, and documentation branches are published as PRs #109–#111 under approved issues #107/#108; no merge is authorized.

## Verification plan

Focused first:

- `pnpm test src/modules/workshops/application/workshop-period-service.test.ts`
- focused enrollment availability tests;
- focused composition adapter/request-service tests;
- `pnpm test tooling/architecture/architecture.test.ts`;
- `pnpm typecheck`;
- `pnpm lint` after typecheck completes;
- `pnpm format:check`;
- relevant broader workshop/enrollment/composition tests;
- `pnpm build`;
- `git diff --check`;
- independent verifier per work unit;
- Linux CI before delivery is declared ready.

## Progress

- 2026-10-24: E10 mapping confirmed that workshop period updates do not consult confirmed seats; the existing fake and Drizzle seat ledgers return zero when no counter row exists; availability arithmetic already lives in the enrollment domain.
- 2026-10-24: Owner selected fail-closed behavior for lookup failure: return `unavailable` and persist nothing.
- 2026-10-24: Terminal B confirmed F5a stays outside workshop/enrollment application APIs and E10 tests.
- 2026-10-24: The first T1 writer crashed at the Windows process level after writing only tests. Independent read-only verification ran the focused file once: 22 passed and 3 failed exactly because production does not consult or enforce confirmed seats; diff-check passed. The verifier also caught an unrelated-edit test that accidentally supplied a different capacity, so a bounded replacement worker must correct that test before GREEN.
- 2026-10-24: Engram accepted the initial tracker mirror, but the incident update and its readback timed out; the local tracker is authoritative and mirror resynchronization remains pending.
- 2026-10-24: The first GREEN verifier rejected the candidate: 24/25 focused tests because the independent-key fixture mixed an own-modality period with a third-party percentage, and the dependency catch covered loop logic beyond the awaited lookup. Architecture passed 17/17; typecheck timed out after 180 seconds without a result; diff-check passed.
- 2026-10-24: The bounded correction asserted both updates succeed with matching modality input and narrowed the catch to the dependency await only. Independent re-verification passed focused 25/25, typecheck, and diff-check; semantic inspection confirmed exact keys and catch scope. Combined with the prior architecture 17/17, T1 implementation checks are complete.
- 2026-10-24: T1 was committed as `a4f4e83` with the port, guard, focused tests, and tracker evidence. Generated `.codegraph/` state remains excluded.
- 2026-10-24: Native review inspection for the T1 work-unit commit timed out in `pre_native`; mutation was not started and authority was not evaluated. No retry was permitted, so independent verification remains the review evidence.
- 2026-10-24: The T2 writer hit the same Windows process crash after creating only the availability tests. Independent verification confirmed a valid missing-module RED and diff-check PASS, while identifying a low-value pending-order assertion. The bounded inline fallback strengthened that test, added the reader over `SeatLedger.confirmedSeats`, reused the domain availability function, preserved rejection for T3, and exported the module API.
- 2026-10-25: Independent T2 verification passed focused 6/6, architecture 17/17, typecheck, and diff-check. Static inspection confirmed exact keys, domain-function reuse, non-negative clamp, missing-row behavior, pending-order independence, rejection propagation, and unchanged public catalog surfaces.
- 2026-10-25: T2 was committed as `accc917` with the reader, tests, module API export, and tracker evidence. Generated `.codegraph/` remains excluded.
- 2026-10-25: T3 mapping found that the E6 base still exposed workshop periods as unavailable. Terminal B rebuilt its independently verified F5a-1 composition prerequisite from E6 head `5946cdc` as local head `9dbd584`; E10 integrated it with merge `01f85cd`. The prerequisite supplies the real period service without routes/UI and is the shared ancestor intended for both E10 and F5a delivery.
- 2026-10-25: Terminal B explicitly released the four T3 composition paths and confirmed F5a-3 writes only routes/UI/admin helpers/tests plus its tracker. T3 may now add the confirmed-seat adapter and reuse one request-scoped seat ledger without overlap.
- 2026-10-25: The T3 writer completed without the prior runtime crash. RED failed on the missing adapter module; GREEN passed adapter plus workshop-period composition 5/5, architecture 17/17, and diff-check. The implementation forwards exact keys and reuses one request-scoped Drizzle seat ledger for workshop capacity validation and public enrollment while preserving no-database fallbacks.
- 2026-10-25: Native ASSESS was unassessable because generated `.codegraph/.gitignore` remains explicitly excluded untracked state. The returned high-risk fallback requires separate independent verification.
- 2026-10-25: The first independent T3 verifier passed focused 5/5, architecture 17/17, and diff-check but rejected typecheck: adapter tests supplied only the method actually consumed while the adapter parameter required the full `SeatLedger`.
- 2026-10-25: The correction narrowed the dependency to `Pick<SeatLedger, "confirmedSeats">`, preserving runtime behavior and expressing the true port requirement. Independent re-verification passed focused 5/5, typecheck, diff-check, and direct whitespace inspection of both new adapter files. Combined with architecture 17/17, T3 checks are complete.
- 2026-10-25: T3 was committed as `874d7b8` with the adapter, exact forwarding/rejection tests, shared request-scoped ledger wiring, and tracker evidence. Generated `.codegraph/` remains excluded.
- 2026-10-25: Native review inspection excluded `.codegraph/.gitignore` and stopped on `managed_assets_outdated`. The exact provider sync continuation failed because `pi-mcp-adapter/index.ts` is missing, so no lineage or native verdict is available; independent high-risk verification is required.
- 2026-10-25: First T4 verifier passed focused 36/36, unit 2273/2273, architecture 17/17, typecheck, lint, build, and diff-check. Format-check rejected four E10 tracker/test files. The UI project exited from an unchanged `src/testing/ui/harness.ui.test.tsx` worker without an assertion or test summary after canvas warnings; retained evidence cannot establish candidate causality, so the result is unknown rather than a product failure. No DB project was run because E10 changes no DB adapter/schema/query.
- 2026-10-25: Accumulated E10 diff against prerequisite `9dbd584` is 452 lines including 110 tracker lines and 342 code/test lines. Delivery must separate tracker documentation from code or preserve the three verified work units as review slices; no size exception or test compression is needed.
- 2026-10-25: Prettier normalized the four rejected files. Bounded independent verification then passed focused E10 36/36, repository format-check, branch and working-tree diff-check, and the unchanged UI harness 9/9. The earlier full-UI worker exit did not reproduce and touched no E10 path; its exact cause remains indeterminate, so local evidence records full UI as unavailable rather than PASS. Unit 2273/2273, architecture 17/17, typecheck, lint, and build remain PASS from the same normalized candidate except for layout-only test/tracker formatting; Linux CI is mandatory.
- 2026-10-25: Final formatting/evidence was committed on the development branch as `735307d`. The reviewable code/tests tree was rebuilt once from prerequisite `9dbd584` as branch `feat/monthly-enrollment-e10-capacity-availability-code`, commit `cd4d3c8`, with 341 additions and 5 deletions (346 lines).
- 2026-10-25: Tracker-only child branch `docs/monthly-enrollment-e10-delivery-evidence` restored this document in initial commit `de126b2` (127 lines before this final evidence update). Its tree matched development head `2eeca8c`.
- 2026-10-25: The owner authorized one coordinated issue-first publication batch without merges. Approved issues #107 (F5a composition prerequisite) and #108 (E10) were created. PR #109 targets the E6 final branch with prerequisite head `9dbd584`; PR #110 targets #109's branch with E10 code head `cd4d3c8`; PR #111 targets #110's branch with an evidence-only tracker head. All three are OPEN, MERGEABLE, and below 400 lines.
- 2026-10-25: Linux `ci/verify` passed on the exact behavior heads: run 40215465512 for `9dbd584` and 40215473450 for `cd4d3c8`. The initial tracker head `ddce2ce` passed run 40215482791 and evidence update `9c16a8d` passed run 40216015597. Later tracker-only evidence commits change no behavior and must still pass PR #111 CI before closure. No merge is authorized.

## Next step

Human review and explicit merge decisions for PRs #109–#111 in dependency order. After each parent merge, retarget the child to the merged base and verify its diff and Linux CI again.
