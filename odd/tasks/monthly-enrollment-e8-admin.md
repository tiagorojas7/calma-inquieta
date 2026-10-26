# Monthly Enrollment E8 — Admin Routes and UI

Objective: admin screens `/admin/inscripciones` and `/admin/inscripciones/:id` over the merged `AdminEnrollmentUseCases`. Branch `feat/monthly-enrollment-e8-admin`, stacked on `feat/monthly-enrollment-e7-5-integration` (PRs #118-#122). Delivery: stacked-to-main, ask-on-risk. Test runner: `pnpm test <paths>`; ESLint needs `NODE_OPTIONS=--max-old-space-size=8192`.

## Specs

- S1: "Every admin use case MUST refuse a missing, malformed or non-admin actor with `denied` before reading or writing data, and an unavailable service MUST fail closed." Routes live under `/admin/inscripciones/**` behind the existing `/admin` gate; use cases do not trust the route alone.
- S2: The list shows, newest first, order number, student name, taller, month, turno, status, total and requested date (Córdoba); filters by status, period month, workshop and text (order number, name or email); paginated at 50; "The default filter is `pending_confirmation`."
- S3: The detail shows every stored field including email and phone, lines, totals, payment fields, seat state (confirmed / capacity) and the audit trail. Phone and email appear only in admin views.
- S4: Confirm payment: amount (whole pesos), payment date, optional note; surfaces `turno-full`, `period-closed`, `amount-mismatch`, `illegal-transition` and `alreadyConfirmed` as distinct Spanish messages; "The UI MUST disable the submit while pending."
- S5: Cancel with a mandatory reason (3 to 300 characters) after a confirmation dialog.
- S6: Materials progress on a paid order: `materials_requested` then `materials_received`, singly on the detail page (bulk belongs to E9).
- S7: "Mutating admin routes MUST be POST actions subject to the existing same-origin rule; a cross-origin POST MUST be refused."
- S8 (assumption): `AdminListItem` lacks an order id, so list rows cannot link to the detail; add `id` to the list item (store, Drizzle, fake).

## Tasks

- [x] E8-1 (S1, S2, S7, S8): list item `id`, `/admin/inscripciones` loader + UI, nav entry. Route: inline. Commits: `e2b3e34` (id exposed in the earlier `feat(enrollments): expose order id in admin list items`).
- [x] E8-2 (S3-S7): detail loader, confirm/cancel/materials actions, detail UI. High risk (auth + money). Route: inline. Commits: `d91f61f` (view, 632 lines) and `6b4100d` (route + actions, 695 lines).

## Log

- L1 (2026-10-26): "pasemos directo, luego cuando termines tienes que avanzar con otras tareas"; then owner chose to start E8 stacked on E7-5.
- Closure: unit+ui projects 259 files / 2914 tests pass; typecheck, eslint on `src/app` and `src/modules/enrollments`, and format:check pass. The Drizzle `id` mapping is covered by the type only; the `db` project could not run locally.
- Independent verifier (whole document, probes in a scratch copy): S1-S8 PASS, no blockers. Advisories: a non-UUID `:id` or `taller` filter returns 503 instead of 404 (the store maps the Postgres error to unavailable); a non-form POST content type returns 500 instead of 400 after the admin gate; `hasNext` can show an empty last page when exactly 50 rows remain; the workshop filter lists only live workshops; the search text travels in the URL.
- `src/app/routes.ts` was edited (admin block) and needs the Terminal B coordination the owner already acknowledged.
