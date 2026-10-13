# Admin F0b: UI primitives

- Feature: `admin-f0b-ui-primitives` (ODD, not SDD). Change 3 `admin-catalog`, FRONT slice F0b.
- Branch: `feat/admin-f0b-ui-primitives`, from `origin/main` `31e7550`.
- Route: delegated direct, one FRONT writer, task by task. Trigger evidence: 6 new component files plus tests (2+ non-trivial files) and preparatory reading.
- TDD: strict (source: `AGENTS.md`). Runner: `corepack pnpm test <path>`; only focused runs plus `corepack pnpm typecheck` and `corepack pnpm lint` per commit. The parent schedules the full gate.
- Delivery: one PR to `main`, stacked-to-main chain (change 3 `tasks.md`). Forecast 250-350 production lines (design row F0b); advisory ceiling 400.
- Engram mirror: `odd/admin-f0b-ui-primitives/tasks` (pending; saved by the parent).

## Objective

Ship the pure admin UI primitives that every FRONT admin slice (F0a, F1-F8) reuses: StatusBadge, admin EmptyState, DataTable, form atoms, ConfirmDialog and a row-editor primitive, under `src/app/ui/admin/**`.

## Scope

- IN: `src/app/ui/admin/**` components, their `*.ui.test.tsx` tests, a minimal `src/app/ui/admin/microcopy.ts` holding only the strings these primitives need (F0a extends it).
- OUT: admin routes, layout, nav, middleware (F0a); image field, gallery editor, turnos and variants editors (F1-F8); any change to `src/modules`, `src/platform`, `src/composition`, `workers`, `src/app/routes`, change-2 components, the test setup, tokens.

## Constraints

- `ui` element: imports only `ui`, `react`, `react-dom`, `react-router`. Structural props; no module, request context or composition. `src/app/ui/admin/**` already matches `src/app/ui/**/*` in `eslint.config.ts`, so no config change.
- Reuse change-2 `Button`, `ButtonLink`, `Heading`, `Text`, `VisuallyHidden`, `Icon`, native `<dialog>` pattern of `gallery-grid.tsx`, `expectNoAxeViolations`, the `showModal`/`close` polyfill in `src/testing/ui/setup.ts`.
- Colors only from declared contrast pairs: `olive-800/sage-200`, `ink-900/sand-200`, `terracotta-700/sand-200`, `ink-900/surface`.
- Copy: es-AR voseo; the word "workshop" never appears (`findCopyViolations` is run by F0a over admin microcopy; the F0b strings are written to pass it).
- Usable at 360 px: tables scroll inside their own container, never the page.
- Conventional Commits only; no Co-Authored-By or AI attribution.
- Planning heuristic: about 400 authored changed lines per task is advisory only.

## Sources

- `design.md` (admin-catalog, BACK worktree `CalmaInquieta-plan`): line 69 (Admin UI: full-page routes, `ui/admin/**`, voseo); 396 (F0b may merge after B0a); 924-925 (confirmations guard archive, pause, cancel, retire, delete; copy in `ui/admin/microcopy.ts`); 962 (`src/app/ui/admin/**` Create, FRONT); 989 (component tests: empty states, ConfirmDialog, form atoms, Testing Library + axe in every file); 1082 (F0b row, forecast 250-350 production lines, 190-270 test lines); 702-703 (status unions `WorkshopStatus`, `IntensiveStatus`); 572, 575 (transition tables).
- `specs/admin-shell/spec.md`: "Empty, loading-failure and validation states" (lines 112-132: empty state with call to action to create the first record; per-field messages and a form-level error; confirmation before archive, nothing changes until confirmed); "Copy rules" (134-148); "Phone usability and accessibility" (150-164: 360 px, keyboard, axe).
- `specs/{monthly-workshops,intensive-workshops}/spec.md`: states draft, published, paused, cancelled, archived (paused is stored and visible).
- `proposal.md`: context only.

## Decision gaps (not invented, conservative defaults)

- Status labels are not specified. Default: the literal Spanish of each stored state: Borrador, Publicado, Pausado, Cancelado, Archivado; teachers/suppliers/materials use Activo / Archivado. Owner may rename.
- Status colors are not specified. Default: published = sage/olive, draft and archived = sand/ink, paused and cancelled = terracotta on sand. The label text always carries the meaning (color is never the only signal).
- "Row-editor primitive" is not specified. Default: a controlled, generic ordered list of editable rows with add, remove and move up/down buttons, an optional maximum, no drag and drop.

## Tasks

Each task: RED test, GREEN minimum code, REFACTOR, focused test + typecheck + lint, one Conventional Commit, evidence below. Route per task: delegated writer (single writer thread).

- [ ] T1 StatusBadge + minimal admin microcopy. Accept: renders the label text for each of the 7 states (`draft`, `published`, `paused`, `cancelled`, `archived`, `active`, plus tone `data-tone`), is plain text (no color-only meaning), axe clean in every state. Commit `feat(admin-ui): add status badge`.
- [ ] T2 Admin EmptyState. Accept: heading + message + one call-to-action link to the create URL (spec scenario "Empty list"), link named by its label, axe clean. Commit `feat(admin-ui): add empty state`.
- [ ] T3 DataTable. Accept: `<table>` with caption, `scope="col"` headers, one row per record keyed by `rowKey`, cell renderers, scroll container labelled and keyboard focusable (360 px), empty rows render the admin EmptyState instead of a table, axe clean in both states. Commit `feat(admin-ui): add data table`.
- [ ] T4 Form atoms. Accept: TextField, TextAreaField, SelectField, CheckboxField plus FormError; label bound to control, hint and per-field error linked with `aria-describedby`, `aria-invalid` and `role="alert"` only on error, entered value kept (controlled/default value untouched), form-level error with `role="alert"`, axe clean in default, hint and error states. Commit `feat(admin-ui): add form atoms`.
- [ ] T5 ConfirmDialog. Accept: native `<dialog>` named by its title, opened with `showModal`, confirm and cancel buttons, nothing happens until confirm (spec "Confirmation before archive"), Escape and Cancelar call `onCancel`, destructive tone focuses Cancelar first, closed dialog is not exposed, axe clean open and closed. Commit `feat(admin-ui): add confirm dialog`.
- [ ] T6 RowEditor. Accept: fieldset + legend with an ordered list of rows rendered by the caller, add / remove / move up / move down buttons with row-numbered accessible names, first row cannot move up and last cannot move down (disabled), add disabled at `max`, callbacks receive the index, axe clean. Commit `feat(admin-ui): add row editor`.

## Acceptance criteria

- Every task's focused tests pass; `corepack pnpm typecheck` and `corepack pnpm lint` pass before each commit.
- Production under 400 authored changed lines outside tests (advisory).
- No file outside `src/app/ui/admin/**` and this document changes.

## Checks

`corepack pnpm test src/app/ui/admin/<file>.ui.test.tsx`, `corepack pnpm typecheck`, `corepack pnpm lint`, Prettier on touched files. Heavy gates (full test, coverage, build) are scheduled by the parent.

## Progress and evidence

(updated after each task)
