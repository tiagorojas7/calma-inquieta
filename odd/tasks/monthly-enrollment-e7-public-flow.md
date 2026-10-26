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

- [ ] **E7-2 — Client draft and materials cart UI.** RED helper/UI tests for slug-scoped session storage, corrupt/missing draft fallback, line merge, domain-aligned quantity/line limits, required/optional materials, offered variants, and sticky visible total. GREEN a minimal delivery helper and structural presentational page; no client price becomes authoritative. Route: delegated multi-file writer. Expected surfaces: `src/app/enrollment/enrollment-draft.ts`, `src/app/enrollment/enrollment-draft.test.ts`, `src/app/ui/templates/enrollment-materials-page.tsx`, `src/app/routes/enrollment-materials.ui.test.tsx`. Forecast: 300–380 lines. Commit: pending.

- [ ] **E7-3 — Materials route and final submission.** RED loader/action tests for current-offer reload, whole-draft parsing, tampered material/variant/quantity refusal, server-owned prices and totals, required-material errors, unavailable fail-closed behavior, and redirect to `/pedido/:publicId`. GREEN `src/app/routes/enrollment-materials.tsx`; reuse the E7-2 helper/UI and `requestEnrollment`. Route: delegated multi-file writer. Expected surfaces: `src/app/routes/enrollment-materials.tsx`, `src/app/routes/enrollment-materials.test.tsx`, with only narrowly justified adjustments to E7-2 files. Forecast: 250–350 lines. Commit: pending.

- [ ] **E7-4 — Public order summary and WhatsApp hand-off.** RED route/UI tests for allowlisted summary, `noindex`, invalid/unknown public-id 404, no email/phone/internal IDs, pending payment steps, paid thank-you state, decoded WhatsApp contract, and hidden link for an invalid profile number. GREEN `src/app/routes/order.tsx` and structural `src/app/ui/templates/order-page.tsx`, consuming `getOrderByPublicId` and `buildOrderWhatsAppLink`. Route: delegated multi-file writer. Expected surfaces: `src/app/routes/order.tsx`, `src/app/routes/order.test.tsx`, `src/app/routes/order.ui.test.tsx`, `src/app/ui/templates/order-page.tsx`. Forecast: 280–370 lines. Commit: pending.

- [ ] **E7-5 — Register routes and integrate the workshop CTA.** Terminal B released `src/app/routes.ts` after F5a-3a. RED regression tests proving enrollment CTA only for an open current/future offer and unchanged paused, closed, unpublished, and offerless behavior. GREEN register all three routes and minimally extend the workshop detail mapper/route/UI contract. Route: delegated multi-file writer. Expected surfaces: `src/app/routes.ts`, `src/app/routes/taller.tsx`, `src/app/routes/taller.test.tsx`, `src/app/catalog/mappers.ts` and its existing test if required, `src/app/ui/templates/taller-detail-page.tsx` and its existing test only if the discriminated action contract requires it. Forecast: 150–280 lines. Commit: pending.

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
- E7-1 implementation is complete in two owner-approved review units; E7-2 has not started.
- E7-0 closed by this work-unit commit (`docs(odd): plan E7 public enrollment flow`); `.codegraph/` remained untracked and excluded.
- The first E7-1 `gentle-ai-worker` process crashed before `agent_settled` with Windows/Node/V8 `0x80000003`. It produced no source changes and no TDD evidence; the worktree remained at the planning commit with only this tracker update and excluded `.codegraph/` untracked. The crash was recorded once and was not retried until green.
- The preferred independent Pi-session fallback could not launch because Herdr 0.7.5+ is unavailable on this host. No pane or writer was created. One controlled foreground `gentle-ai-worker` recovery was permitted.
- The controlled foreground recovery wrote only `src/app/routes/enrollment.test.tsx` and `src/app/routes/enrollment.ui.test.tsx` (105 lines total). Its first focused RED command timed out after 120 seconds during pnpm preparation before test output. Per the no-retry instruction, it stopped before production implementation. Diagnosis found an empty worktree `node_modules/` with no Vitest binary and no package/lockfile changes. The owner authorized one frozen-lockfile install and one subsequent focused RED execution. `pnpm install --frozen-lockfile` completed from the content-addressable store without package/lockfile changes; the single focused run then observed RED in 9.61s because `./enrollment` and `~/app/ui/templates/enrollment-page` did not exist (2 failed suites, zero tests loaded).
- The GREEN/REFACTOR worker added the route and template. Focused tests passed (2 files, 8 tests), including a post-refactor pass after moving errors outside labels for accessible names. `git diff --check` passed. Its required `pnpm typecheck` then timed out at 120 seconds after reporting draft-test action/result narrowing errors; lint and format did not run. LSP diagnosis was inconclusive because all four probes timed out or could not confirm clean. The timeout was recorded and no blind command retry occurred.
- The subsequent bounded correction worker crashed before `agent_settled` with the same Windows/Node/V8 `0x80000003`. File counts remained unchanged at 372 lines across the four E7-1 files, but no correction or verification result is attributable to that crashed process. Package-worker retries are stopped; Herdr remains unavailable.
- The separately opened E7 Pi session removed the invalid `as never` test-helper cast and added an explicit `Response` guard. Independent verification then passed the focused suite (2 files, 8 tests), typecheck, targeted Prettier, and `git diff --check`. Full and four-file ESLint both terminated with Node `Zone Allocation failed` before producing findings, so the lint gate remains unavailable rather than passed.
- The completed 594-line source change exceeded the 400-line budget. The owner selected a natural split: structural UI plus UI tests (`9d02abe`, 203 lines), followed by route behavior plus route tests (`2ef757c`, 391 lines). No tests were compressed or removed.
- Native review inspect stopped on outdated managed assets. The exact provider sync continuation failed because `pi-mcp-adapter/index.ts` is absent; no review lineage was created or approved.

## Next step

Start E7-2 with strict RED for the slug-scoped client draft and materials cart UI. Keep the review unit below 400 authored lines and exclude `.codegraph/`.
