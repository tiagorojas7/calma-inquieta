# Admin F5b — workshop period materials

- Feature: `admin-f5b-period-materials`.
- Base: rebased cleanly onto `origin/main` at `556d440`; original development base was `18b355d`.
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

- [x] F5b-0 — Replace the period-row router link with a native anchor; RED/GREEN/REFACTOR the document-navigation behavior; verify focused UI tests; commit independently. RED: focused UI test failed because the router `Link` prevented default. GREEN/REFACTOR: 1 file / 6 tests PASS; targeted Prettier, ESLint (`NODE_OPTIONS=--max-old-space-size=8192`) and `git diff --check` PASS; independent verifier found no candidate-caused issue. Commit: `85b13f9` (rebased from `c9a5d91`).
- [x] F5b-1 — Preserve already-enabled historical materials in `WorkshopPeriodsService.update` while refusing newly added inactive/unavailable materials; RED/GREEN/REFACTOR focused application tests; commit independently. RED: 1/28 failed because adding a selectable material revalidated the historical inactive id. GREEN/REFACTOR: existing snapshots are preserved in submitted order, only added ids are looked up, and explicit reorder/removal is covered; 1 file / 28 tests, targeted Prettier, ESLint and `git diff --check` PASS. Independent verification found the initial missing reorder/removal assertions and formatting issue; both were corrected, while follow-up verifier processes crashed before settling. Commit: `85e4d81` (rebased from `6c31ef2`).
- [x] F5b-2 — Add the period material multi-select: loader `materials.listSelectable`, selected/historical options, parser/action `materialIds`, Spanish validation feedback, native form UI and focused route/parser/UI tests; keep hot-file copy changes minimal and isolated; commit independently. RED: 7 initial failures proved missing loader/parser/action/UI behavior; 2 follow-up failures proved closed history depended on current materials and duplicate copy was misleading. GREEN/REFACTOR: 3 files / 19 tests, targeted Prettier, generated-type-aware ESLint and `git diff --check` PASS; LSP reported zero findings but all seven paths were silent/inconclusive-on-clean. Independent verifier PASS after one bounded correction, with 277 additions / 19 deletions (<400). Commit: `1cf0c3b` (rebased from `8736ad9`).
- [ ] F5b-3 — Run focused and non-DB gates locally, delegate independent verification, publish issue-linked PR slices with exactly one `type:feature` label, and record CI status. The local DB Vitest project is CI-only because Windows workers exit `3221226505`. Approved issue: #128. After clean rebase onto `origin/main` `556d440`, focused F5b tests PASS (4 files / 47 tests), typecheck PASS, format check PASS, build PASS, and branch diff-check PASS. Full lint is blocked by the merged-base E9 file `src/app/ui/admin/enrollment-consolidation.ui.test.tsx:73` (`no-non-null-assertion`) and timed out after reporting it; targeted F5b ESLint PASS. Independent final verifier confirmed scope, ancestry, generated cleanliness and code-work-unit additions of 47, 89 and 277 lines.

## Acceptance

- Period row navigation is a plain anchor and does not request `.data`.
- The form lists active/available materials and keeps already-enabled historical materials visible and selected even if they later became inactive/unavailable.
- Admins can add/remove/reorder material ids through the period save action; duplicate or newly unselectable ids return actionable 422 feedback.
- Saving unrelated period fields never drops or rejects a historical material solely because it later became inactive/unavailable.
- Closed periods remain read-only.
- No enrollment, supplier, material-admin, or intensive code is changed.
