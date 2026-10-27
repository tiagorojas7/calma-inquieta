# Material creation (F7-3)

- Objective: create `/admin/materiales/nuevo` atop `feat/admin-catalog-f7-materials`, independently reusable by F7-4.
- Scope: presentational MaterialForm and shared draft parser/error mapping, actor-first create route, image/variant editing, 422 preservation, tests, route and `materialForm` copy only.
- Constraints: strict RED → GREEN → REFACTOR (`pnpm test <path>` from AGENTS.md), native document forms/anchors, no changes to materials list/detail or composition. Base PR on `feat/admin-catalog-f7-materials`. English technical artifacts; Spanish project UI convention. B owns `materialDetail` and its route.
- Delivery: user-requested single stacked PR, first work-unit commit exports reusable form/parser and is pushed/notified immediately. Forecast about 700–1100 authored lines across two work units, above the normal review budget by explicit requested PR shape; avoid code compression. Rollback boundary: revert F7-3 commits without affecting F7-4.

## Tasks

- [ ] **F7-3a — reusable creation/editing form contract.** Delegated multi-file writer. RED parser and UI tests; GREEN `src/app/ui/admin/material-form.tsx`, `src/app/admin/material-form-data.ts`, tests and own `materialForm` microcopy; image alt and dangling-src fallback, default Única, optional unique variant rows, peso prices, swatches, availability, native submit. Checks focused tests, lint/typecheck/format where applicable. First Conventional Commit, push, notify Terminal B with hash. Commit: pending.
- [ ] **F7-3b — actor-first create route.** Delegated multi-file writer. RED route tests for authorization, success, service 422 values/errors, supplier options and failure, image handling; GREEN only `material-new.tsx`, route tests and single new route line. Checks full `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, src/app tests and diff-check; submit PR against parent feature branch, link approved issue, report CI. Commit: pending.
- [ ] **F7-3c — delivery evidence.** Parent updates `odd/tasks/admin-delivery.md` F7-3 commit identity, ensures PR/CI and notifies B. Evidence: pending.

## Progress

- 2026-10-27: Fetched and fast-forward-pulled main; created isolated `CalmaInquieta-f7-3` from origin F7 parent. Scoped exploration confirmed material domain validation and ImageField behavior. No source edits yet.
- Next: run RED and implement form/parser first. Verification pending.
