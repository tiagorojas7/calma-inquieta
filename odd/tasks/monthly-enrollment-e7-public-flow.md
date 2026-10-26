# Monthly Enrollment E7 — Public Flow

## Objective

Deliver the public monthly-enrollment routes and presentational UI on top of the already-merged E6 composition and E10 capacity contracts, without reopening backend, schema, seat-ledger, material-offer, or admin work.

## Problem and why

The public workshop catalog still hands visitors to an interim WhatsApp inquiry. The enrollment backend now supports actorless fail-closed offer lookup, student validation, honeypot handling, server-owned prices, atomic pending-order creation, allowlisted public order reads, and the WhatsApp hand-off. E7 must expose those capabilities through accessible public routes while preserving privacy and the existing behavior of paused, closed, unpublished, and offerless workshops.

## Reconciled baseline

- Base: `origin/main` at `c6aeabc5986f7852401408fba4ede88aba820fbb`.
- Branch: `feat/monthly-enrollment-e7-public-flow`.
- Worktree: `C:/Proyectos/TR_WebStudio/CalmaInquieta-e7`.
- PRs #102–#106 and #109–#111 are merged. Historical OpenSpec and ODD delivery checkboxes for E6/E10 are stale and will not be reopened or rewritten.
- E7 is not implemented on the baseline.
- Terminal B released `src/app/routes.ts` to E7 after F5a-3a work-unit `1d7492c` and evidence commit `6d94419`; Terminal B will not edit it again during F5a-3b/F5a-4 without renewed coordination.
- Terminal B retains all admin/F5a paths. Existing shared atoms or composites require advance coordination before any E7 edit.
- `.codegraph/` is excluded from commits and delivery.

## Scope

### In scope

- `/talleres/:slug/inscripcion` offer loader, student form, aggregate validation feedback, honeypot behavior, paused state, and actorless fail-closed action.
- `/talleres/:slug/inscripcion/materiales` offered-material selection, merged cart lines, sticky total, safe corrupt-draft fallback, and whole-payload server revalidation.
- `/pedido/:publicId` allowlisted summary, `noindex`, public 404, privacy, live status, payment steps, and optional `wa.me` hand-off.
- Workshop-detail CTA replacement only when a current open enrollment offer exists.
- Public route/UI tests, route-local public microcopy, and the minimum public draft/form helpers.
- Operational documentation for a managed Cloudflare per-IP rate-limit rule at the order-creation boundary.

### Out of scope

- E8 admin enrollments, E9 supplier consolidation, F5a admin, schema or migrations, E10 seat-ledger/capacity changes, material-offer backend, Turnstile, pushes, pull requests, or merges.
- Reimplementing pricing, cart rules, offer eligibility, order creation, order privacy, or WhatsApp message construction already owned by `modules/enrollments`.
- An in-memory Worker rate limiter; it is not durable across isolates.

## Accepted decisions

- Client draft: `sessionStorage` JSON keyed by workshop slug; missing or corrupt data becomes an empty cart.
- Cart limits: consume the merged domain contract (quantity 1–20, at most 30 lines) without redefining it in delivery code.
- WhatsApp message: consume `buildOrderWhatsAppLink`; E7 does not fork the merged message contract.
- Rate limiting: managed Cloudflare rule. E7 records the operational requirement and keeps the action boundary compatible; no process-local counter is added.
- Delivery artifacts use English; public UI copy follows the existing es-AR/voseo product convention.

## TDD and verification contract

- Mode: strict RED → GREEN → REFACTOR.
- Source: repository `AGENTS.md` and owner instruction.
- Focused runner: `pnpm test <paths>`.
- Each behavior unit records the observed RED failure before production implementation, then GREEN and REFACTOR results.
- Typecheck and lint always run sequentially.
- Applicable closure checks: focused tests, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `git diff --check`, and a 360px/manual public-flow preview where a runtime boundary exists.
- Windows crashes/timeouts are recorded once and are never retried until green. A read-only exploration scout already crashed with native Node/V8 `0x80000003`; a narrowed recovery completed without source changes.
- Multi-file writes route to `gentle-ai-worker`. Independent command verification routes to `gentle-ai-verify` when required; if the Windows Pi/V8 crash recurs or native review is blocked by the known `pi-mcp-adapter` issue, record it and use the required independent fallback without blind retries.

## Workload and delivery

- Forecast: approximately 1,500–1,900 authored changed lines across six reviewable work units; generated files excluded.
- Per-unit heuristic: fewer than 400 authored changed lines, without compressing or deleting tests/docs.
- Delivery strategy: `ask-on-risk`.
- Chain strategy: `stacked-to-main`, selected by the owner. No branch publication or PR creation is authorized.
- No push, issue, PR, or merge is authorized.
- Each completed work unit gets one Conventional Commit with tests and documentation beside its behavior.
- Native review candidates are work-unit commits or later PR slices, never task checkboxes or the accumulated branch.

## Tasks

- [x] **E7-0 — Persist the reconciled ODD plan.** Created this tracker and its Engram mirror, reconciled the visible todo projection, recorded the owner-selected rate-limit and stacked-delivery decisions, and committed the planning unit. Route: inline documentation write; no source code. Checks: both durable copies read back with a normalized exact match; `git diff --check` passed. Commit: this work-unit commit (`docs(odd): plan E7 public enrollment flow`); Git history resolves its immutable SHA without creating an impossible self-hash dependency.

- [x] **E7-1 — Enrollment offer and student form.** Strict RED was observed after dependency recovery because the route and template did not exist. GREEN/REFACTOR covers valid offer projection, aggregate named errors, honeypot handling, paused/unavailable states, and direct no-material order creation. The owner selected one honest review split after the completed unit measured 594 source lines: presentational form and UI tests (`9d02abe`, 203 lines), then loader/action and route tests (`2ef757c`, 391 lines). Focused tests passed (2 files, 8 tests), typecheck passed, targeted Prettier and `git diff --check` passed. Full and targeted ESLint were unavailable because Node reproducibly exhausted memory before reporting a lint finding. Native review was unavailable because managed-asset sync could not find `pi-mcp-adapter`.

- [x] **E7-2 — Client draft and materials cart UI.** Strict RED failed because both production modules were absent. GREEN/REFACTOR adds slug-scoped `sessionStorage` serialization with corrupt/missing/domain-invalid fallback, reuses the public cart API for merge and limits, and provides a structural required/optional materials selector with a sticky summary. The submitted payload contains only material ID, variant ID, and quantity; client totals remain display-only. Focused tests passed (2 files, 5 tests), typecheck and targeted Prettier passed, `git diff --check` passed, and independent read-only code verification found no issues. ESLint remained unavailable due the recorded Node OOM; native review remained unavailable due the missing `pi-mcp-adapter`. Commit: `6014886` (385 lines).

- [x] **E7-3 — Materials route and final submission.** Delivered in three work units: draft hand-off from the student form (`76feed6`), materials action with whole-payload revalidation and server-owned totals (`312e5c0`), and materials loader (`8917517`). A follow-up correction binds the session draft to the displayed offer period, refuses a draft from another period, maps every `RequestEnrollmentError` to actionable copy, and renders a recovery link when the draft is missing (`9c5f26d`). Focused tests passed (6 files, 31 tests), typecheck, targeted Prettier, and `git diff --check` passed. ESLint ran for the first time with `NODE_OPTIONS=--max-old-space-size=8192` on every E7 source file and reported 15 mechanical errors in E7-1/E7-2 code; they were fixed in `ca7744b` and the rerun is clean.

- [x] **E7-4 — Public order summary and WhatsApp hand-off.** Strict RED failed because `order.tsx` and `order-page.tsx` did not exist. GREEN covers the allowlisted summary (no email, phone, or internal ID serialized), `noindex`/`no-store` headers and meta, 404 for an unknown or malformed public ID, 503 when the store is unavailable, four payment steps while pending, a thank-you state once settled, and the `wa.me` link built with `buildOrderWhatsAppLink` (hidden for an invalid profile number or a non-pending order). Focused tests passed (2 files, 11 tests); typecheck, ESLint, and Prettier passed. Commits: `ec86bda` (page, 158 lines) and `5d34167` (loader, 289 lines).

- [x] **E7-5 — Register routes and integrate the workshop CTA.** Strict RED failed on the new enrollment action. GREEN registers the three public routes in `src/app/routes.ts` and adds an `enrollment` detail action ("Inscribirme", `/talleres/:slug/inscripcion?period=YYYY-MM`) only for an open taller with a current offering and at least one turno. Paused, offerless, and turnoless tallers keep their previous action. Existing taller tests that asserted the inquiry action for an open offered taller were updated to the approved CTA rule. Focused tests passed (9 files, 101 tests). Commit: `c7a6749` (54 insertions, 13 deletions).

## Acceptance criteria

- Every user-visible requirement in the public-enrollment, materials-cart, and orders delta specs is covered by a focused route or UI test where E7 owns the behavior.
- Public actions remain actorless and fail closed through request composition.
- The server never accepts client prices or totals as authority.
- `/pedido/:publicId` serializes no email, phone, internal ID, or unrelated student data.
- Existing paused, closed, unpublished, and offerless workshop behavior changes only where the approved enrollment CTA rule requires it.
- UI modules import no composition, request context, or module APIs.
- All committed work-unit diffs exclude `.codegraph/` and stay reviewable without test compression.

## Progress and evidence

- Exploration and coordination completed read-only.
- Exact base and prior merges verified.
- Isolated worktree created and registered.
- Terminal B confirmed no overlap outside `src/app/routes.ts` and potential shared atoms/composites, then explicitly released `src/app/routes.ts` after F5a-3a.
- Managed Cloudflare rate limiting selected by the owner.
- E7-1 through E7-5 are complete.
- E7-0 closed by this work-unit commit (`docs(odd): plan E7 public enrollment flow`); `.codegraph/` remained untracked and excluded.
- The first E7-1 `gentle-ai-worker` process crashed before `agent_settled` with Windows/Node/V8 `0x80000003`. It produced no source changes and no TDD evidence; the worktree remained at the planning commit with only this tracker update and excluded `.codegraph/` untracked. The crash was recorded once and was not retried until green.
- The preferred independent Pi-session fallback could not launch because Herdr 0.7.5+ is unavailable on this host. No pane or writer was created. One controlled foreground `gentle-ai-worker` recovery was permitted.
- The controlled foreground recovery wrote only `src/app/routes/enrollment.test.tsx` and `src/app/routes/enrollment.ui.test.tsx` (105 lines total). Its first focused RED command timed out after 120 seconds during pnpm preparation before test output. Per the no-retry instruction, it stopped before production implementation. Diagnosis found an empty worktree `node_modules/` with no Vitest binary and no package/lockfile changes. The owner authorized one frozen-lockfile install and one subsequent focused RED execution. `pnpm install --frozen-lockfile` completed from the content-addressable store without package/lockfile changes; the single focused run then observed RED in 9.61s because `./enrollment` and `~/app/ui/templates/enrollment-page` did not exist (2 failed suites, zero tests loaded).
- The GREEN/REFACTOR worker added the route and template. Focused tests passed (2 files, 8 tests), including a post-refactor pass after moving errors outside labels for accessible names. `git diff --check` passed. Its required `pnpm typecheck` then timed out at 120 seconds after reporting draft-test action/result narrowing errors; lint and format did not run. LSP diagnosis was inconclusive because all four probes timed out or could not confirm clean. The timeout was recorded and no blind command retry occurred.
- The subsequent bounded correction worker crashed before `agent_settled` with the same Windows/Node/V8 `0x80000003`. File counts remained unchanged at 372 lines across the four E7-1 files, but no correction or verification result is attributable to that crashed process. Package-worker retries are stopped; Herdr remains unavailable.
- The separately opened E7 Pi session removed the invalid `as never` test-helper cast and added an explicit `Response` guard. Independent verification then passed the focused suite (2 files, 8 tests), typecheck, targeted Prettier, and `git diff --check`. Full and four-file ESLint both terminated with Node `Zone Allocation failed` before producing findings, so the lint gate remains unavailable rather than passed.
- The completed 594-line source change exceeded the 400-line budget. The owner selected a natural split: structural UI plus UI tests (`9d02abe`, 203 lines), followed by route behavior plus route tests (`2ef757c`, 391 lines). No tests were compressed or removed.
- Native review inspect stopped on outdated managed assets. The exact provider sync continuation failed because `pi-mcp-adapter/index.ts` is absent; no review lineage was created or approved.
- E7-2 strict RED was observed with both production modules missing. GREEN/REFACTOR passed 2 focused files and 5 tests, typecheck, targeted Prettier, and `git diff --check`. The 385-line candidate stayed below budget. An independent read-only review found no blocker or non-blocker findings; native review remained unavailable for the already-recorded managed-assets failure. Commit: `6014886`.

- Closure checks: `vitest run --project unit --project ui` passed (254 files, 2868 tests); `pnpm typecheck`, full `eslint .` (with `NODE_OPTIONS=--max-old-space-size=8192`), `pnpm format:check`, and `pnpm build` passed. The `db` project (embedded PostgreSQL) failed broadly in this environment; E7 touches no schema or repository code, so it is recorded as an environmental failure and was not retried.

## Operational requirement: rate limiting

Order creation (`POST /talleres/:slug/inscripcion` and `/inscripcion/materiales`) must sit behind a managed Cloudflare per-IP rate-limit rule. The Worker adds no in-memory limiter because it would not be durable across isolates.

## Next step

Manual 360px preview of the public flow, then owner decision on pushing and opening stacked PRs.
