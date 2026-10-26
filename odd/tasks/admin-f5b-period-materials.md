# Admin F5b — workshop period materials

- Feature: `admin-f5b-period-materials`.
- Base: `origin/main` at `18b355da964f82169c980213e8ad69d035c47594`.
- Objective: close the remaining deliverable period-material behavior with native admin navigation and an in-form multi-select that preserves historical material offers.
- TDD: strict; runner `corepack pnpm test <path>`.
- Delivery: reviewable Conventional Commit work units, at most ~400 authored lines each; PR chain retargeted to `main` as parents merge.
- Excluded: enrollments, F7/F8 administration, intensive behavior already merged in PRs #86–#89.
- Blocked follow-up: period project gallery persistence remains a BACK gap; the current service rejects non-empty `projectImages` and source periods with project images.
- Engram mirror: `odd/admin-f5b-period-materials/tasks`.

## Reconciliation

- F6 is functionally complete on `main` through PRs #86–#89; only stale trackers remain.
- F5a composition/list/open/detail/edit/lifecycle is complete through PRs #109 and #113–#117.
- `WorkshopPeriodForm` has no material selector and `parsePeriodDraft` preserves the current material ids without accepting form selections.
- `WorkshopPeriodsService.update` rejects every inactive/unavailable submitted material, including a material already stored historically; edits must preserve existing historical offers while still refusing newly added unselectable materials.
- `WorkshopPeriodsList` uses a React Router `Link`; admin navigation must use a document anchor because the Worker gate denies `.data` requests.

## Tasks

- [x] F5b-0 — Replace the period-row router link with a native anchor; RED/GREEN/REFACTOR the document-navigation behavior; verify focused UI tests; commit independently. RED: focused UI test failed because the router `Link` prevented default. GREEN/REFACTOR: 1 file / 6 tests PASS; targeted Prettier, ESLint (`NODE_OPTIONS=--max-old-space-size=8192`) and `git diff --check` PASS; independent verifier found no candidate-caused issue. Commit: pending.
- [ ] F5b-1 — Preserve already-enabled historical materials in `WorkshopPeriodsService.update` while refusing newly added inactive/unavailable materials; RED/GREEN/REFACTOR focused application tests; commit independently.
- [ ] F5b-2 — Add the period material multi-select: loader `materials.listSelectable`, selected/historical options, parser/action `materialIds`, Spanish validation feedback, native form UI and focused route/parser/UI tests; keep hot-file copy changes minimal and isolated; commit independently.
- [ ] F5b-3 — Run focused and non-DB gates locally, delegate independent verification, publish issue-linked PR slices with exactly one `type:feature` label, and record CI status. The local DB Vitest project is CI-only because Windows workers exit `3221226505`.

## Acceptance

- Period row navigation is a plain anchor and does not request `.data`.
- The form lists active/available materials and keeps already-enabled historical materials visible and selected even if they later became inactive/unavailable.
- Admins can add/remove/reorder material ids through the period save action; duplicate or newly unselectable ids return actionable 422 feedback.
- Saving unrelated period fields never drops or rejects a historical material solely because it later became inactive/unavailable.
- Closed periods remain read-only.
- No enrollment, supplier, material-admin, or intensive code is changed.
