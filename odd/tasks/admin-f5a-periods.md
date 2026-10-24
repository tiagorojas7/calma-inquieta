# Admin F5a — workshop period management

- Feature: `admin-f5a-periods`.
- Base: Terminal A's completed E6 delivery head `702a79ec9def1b522167d0cc84b15a0e3d542b51`; this keeps shared composition changes conflict-free while E6 publication is pending.
- Branch/worktree: `feat/admin-catalog-f5a-periods` in `../CalmaInquieta-f5a-periods`.
- Objective: let admins list, open, inspect, edit, publish, close, and delete workshop periods through actor-first native document routes while preserving historical data and unavailable/conflict behavior.
- Non-goals: Enrollment behavior; material offer editing; project gallery upload/reordering; backend workshop-period behavior already delivered by B6/B9; supplier administration.
- Product decision: F5a shows already-enabled materials as a read-only historical summary. F5b adds material multi-select/editing. Project gallery editing remains deferred.
- TDD: strict, required by `AGENTS.md`; runner `pnpm test <path>`.
- Route: delegated direct for every work unit; the multi-file writer trigger applies.
- Delivery strategy: `auto-chain`, stacked behavior PRs. Each work unit targets at most 400 authored changed lines after one honest slicing pass. F5a branches remain stacked on the E6 delivery head until E6 is integrated; before any child merge, retarget to `main`, verify ancestry and a clean diff, then require Linux CI PASS.
- Engram mirror: `odd/admin-f5a-periods/tasks`.

## Reconciliation

Merged Git history is stronger than stale OpenSpec checkboxes:

- B6 workshop-period application/domain/persistence merged through PR #58.
- B8b material catalog merged through PR #66.
- B9 period material-offer persistence and validation merged through PR #73.
- F4 turnos merged through PR #81.
- The genuine F5a gap is admin delivery plus composition: `request-services.ts` still exposes `workshopPeriods` as unavailable, and no period routes/screens exist.
- Terminal A explicitly released `src/composition/request-services.ts`, shared composition tests, `src/testing/fakes/app-services.ts`, and workshops/material APIs after closing E6 locally. Terminal B owns F5a composition lines from this point.

## Review workload and slices

| Work unit | Behavior                                                                                  | Forecast production | Forecast tests/docs | Forecast total | Delivery |
| --------- | ----------------------------------------------------------------------------------------- | ------------------: | ------------------: | -------------: | -------- |
| F5a-1     | Wire the real `WorkshopPeriodsService` in request composition                             |               15–30 |               25–50 |          40–80 | PR 1     |
| F5a-2     | Period list and open-next-month route/UI                                                  |             150–190 |             100–150 |        250–340 | PR 2     |
| F5a-3     | Period detail/edit: fee, capacities, project fields, snapshot, read-only material summary |             180–230 |             130–160 |        310–390 | PR 3     |
| F5a-4     | Lifecycle controls, closed read-only state, accessibility and 360px hardening             |             100–140 |             140–190 |        260–330 | PR 4     |

The material editor and gallery remain F5b. Tests stay with behavior; no compression or omission is allowed to meet the line budget.

## Authorized surfaces by work unit

### F5a-1

- `odd/tasks/admin-f5a-periods.md`
- `src/composition/request-services.ts`
- `src/composition/request-services.workshop-periods.test.ts`

### F5a-2 to F5a-4 (reserved; narrow before each writer)

- `odd/tasks/admin-f5a-periods.md`
- `openspec/changes/admin-catalog/tasks.md`
- `src/app/routes.ts`
- `src/app/routes/admin/workshop-detail.tsx`
- `src/app/routes/admin/workshop-detail.test.ts`
- `src/app/routes/admin/workshop-periods.tsx`
- `src/app/routes/admin/workshop-periods.test.ts`
- `src/app/routes/admin/workshop-period-detail.tsx`
- `src/app/routes/admin/workshop-period-detail.test.ts`
- `src/app/routes/admin/workshop-period-screens.ui.test.tsx`
- `src/app/ui/admin/workshop-periods-list.tsx`
- `src/app/ui/admin/workshop-period-form.tsx`
- `src/app/ui/admin/workshop-period-state-panel.tsx`
- `src/app/admin/workshop-period-form-data.ts`
- `src/app/admin/workshop-period-action-data.ts`
- `src/app/admin/issue-messages.ts`
- `src/app/ui/admin/microcopy.ts`

## Tasks

- [x] F5a-1 — RED/GREEN/REFACTOR the real workshop-period composition service;
      prove actor-first database-backed behavior and preserve explicit unavailable behavior
      when infrastructure is absent. RED observed: placeholder returned unavailable before
      actor validation. GREEN/REFACTOR: dedicated composition test passes 2/2. Independent
      verification passed the 52-test composition suite, typecheck, lint, format check,
      build, and `git diff --check`. Commit one wiring work unit.
- [ ] F5a-2 — RED/GREEN/REFACTOR period list and open-next-month routes/UI, including authorization-first, duplicate conflict, unavailable state, native forms, empty state, axe, and 360px table containment. Commit one list/open work unit.
- [ ] F5a-3 — RED/GREEN/REFACTOR period detail/edit for fee, capacities, project fields, snapshot, audit data, and read-only historical material summary. Preserve submitted values and field/form errors. Commit one detail/edit work unit.
- [ ] F5a-4 — RED/GREEN/REFACTOR publish/close/delete controls, closed-period read-only behavior, history visibility, responsive action wrapping, keyboard access, and final accessibility coverage. Commit one lifecycle/hardening work unit.
- [ ] F5a-5 — Run final independent verification, reconcile native review, prepare issue-first chained delivery evidence, and stop for owner publication authorization.

## Acceptance criteria and checks

- Every loader/action calls `requireAdmin` before service access; denial performs no dependency work.
- Unavailable services return the established `503` state and never render partial success.
- Duplicate opening and validation conflicts preserve existing periods and submitted values.
- Closed periods remain readable and expose no mutation controls.
- Existing enabled materials are visible but not editable until F5b.
- Native document forms preserve the admin gate; no `.data` mutation navigation.
- UI tests are axe-clean; controls are labelled; tables scroll inside labelled regions; actions and long copy remain usable at 360px.
- Per work unit: focused tests, relevant route/UI/application tests, `pnpm typecheck`, `pnpm lint` sequentially, `pnpm format:check`, relevant full tests, `pnpm build`, and `git diff --check`.
- Each work unit receives independent verification according to native risk assessment and records exact outcomes, commit identity, changed-line count, rollback boundary, and blockers.

## Progress and evidence

- Read-only reconciliation and exact F5a/F5b boundary completed on base `702a79e`.
- Owner selected the read-only historical material summary for F5a.
- Terminal A released the shared composition surfaces and was notified of F5a-1's exact paths before any composition edit.
- F5a-1 changed 153 authored lines including the new tracker and test (151 additions, 2 deletions). Rollback restores the `workshopPeriods` unavailable placeholder and removes the dedicated composition test; Enrollment is unaffected.
