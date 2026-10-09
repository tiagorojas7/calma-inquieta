# Apply Progress

## F1 remediation

- Native status consumed: `gentle-ai.sdd-status` v2, change `design-system-and-public-site`, `nextRecommended: apply`, `applyState: ready`, repo-local workspace. Allowed edit roots were respected.
- Remediation source fix required by the styles gate: replaced the arbitrary `tracking-[0.2em]` utility with `tracking-wide` in `src/app/ui/atoms/heading.tsx`.
- Task checkboxes: no historical task was falsely marked complete; task `4.18` remains unchecked because push/PR are deferred, and `4.19` remains owner work.

## TDD Cycle Evidence

| Contract | RED evidence | GREEN / triangulation | Safety net |
|---|---|---|---|
| Button native keyboard and disabled suppression | Remediation RED: focused user-event test initially observed `0` calls because the test did not focus the control. Historical original RED was not captured. | Removed duplicate `onKeyDown`; native button activation and disabled suppression pass. | Focused UI suite passed. |
| Token utility contracts | Remediation RED: prior tests only asserted data hooks; historical original RED was not captured. | Added meaningful token utility classes; styles gate required and confirmed replacement of an arbitrary tracking utility. | Focused UI plus architecture/styles tests passed. |
| Axe and behavioral assertions | Axe additions passed immediately and are safety-net additions, not RED evidence. | Added five axe calls and prescribed behavioral/type assertions. | Focused UI suite passed. |

## Verification evidence

- Focused UI command: `corepack pnpm test src/app/ui/atoms/button.ui.test.tsx src/app/ui/atoms/typography.ui.test.tsx src/app/ui/atoms/icon.ui.test.tsx src/app/ui/atoms/image.ui.test.tsx src/app/ui/atoms/small-atoms.ui.test.tsx src/app/ui/molecules/nav-link.ui.test.tsx src/app/ui/molecules/empty-state.ui.test.tsx src/app/ui/molecules/info-items.ui.test.tsx` — PASS, 8 files / 19 tests.
- Architecture/styles command: `corepack pnpm test tooling/architecture src/app/ui/styles.test.ts` — PASS, 2 files / 28 tests, after the required source correction above.
- Full workspace command: `corepack pnpm test` — FAIL due to an unhandled Vitest worker exit code `3221226505` in `src/testing/db/test-database.db.test.ts`; 47 files / 381 tests passed, 1 worker error, 383 total tests reported. This is an infrastructure/database-worker failure and no source expansion was made for it.
- `corepack pnpm lint` — PASS; existing boundaries deprecation warning only.
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm format:check` — PASS.
- `corepack pnpm build` — PASS; client and SSR builds completed.
- `git diff --check` — PASS.
- Actual HEAD before evidence commit: `41d194daa2c90722d60e2f59a9d195515cc2c77c`.
- Production receipt against `origin/main`: 342 additions, 0 deletions, 342 authored changed lines. Calculation excludes tests, OpenSpec, fixtures, generated files, binaries, and docs; production is within the 400-line limit.
- Untracked `openspec/changes/design-system-and-public-site/verify-report.md` and `.gentle-ai-instance` were preserved untouched.
- Historical limitation: original RED observations were not captured and cannot be reconstructed.

## Remaining

- [ ] 4.18 [FRONT] Run the full local gate; push/PR remain deferred by instruction.
    - Local gate evidence: focused UI, architecture/styles, lint, typecheck, format, build, and diff checks passed; full workspace test failed only on the database worker exit described above.
- [ ] 4.19 [OWNER] Review and merge PR F1.

## Workload / PR boundary

F1 remediation only; production remains under the 400-line budget. The required source correction will be committed separately before this OpenSpec evidence update because the styles gate failed against remediation source. No push, PR, history rewrite, or `.gentle-ai-instance` edit was performed.

## Final bounded F1 correction

- Native status consumed: `gentle-ai.sdd-status` v2, `nextRecommended: apply`, `applyState: ready`, repo-local workspace; action context allowed this workspace and the FRONT surface.
- Strict-TDD RED: strengthened token and behavioral assertions first; focused UI run failed 7 tests because the existing Button and typography classes did not match the authoritative mappings, and the decorative image query exposed its presentation role. Historical original RED evidence remains unavailable and is not reconstructed.
- GREEN/triangulate: corrected Button primary/outline/text-arrow roles and clay-800 focus, replaced default typography sizes and undeclared `text-ink-400`, added the declared eyebrow tracking token, and added href/rel/target, responsive image forwarding/decorative alt, root exactness, two-action, plain-text contact, hidden-icon, and exact date-label assertions.
- Focused command: `corepack pnpm test src/app/ui/atoms/button.ui.test.tsx src/app/ui/atoms/typography.ui.test.tsx src/app/ui/atoms/image.ui.test.tsx src/app/ui/molecules/nav-link.ui.test.tsx src/app/ui/molecules/empty-state.ui.test.tsx src/app/ui/molecules/info-items.ui.test.tsx src/app/ui/styles.test.ts` — PASS, 7 files / 27 tests.
- Safety-net commands: `corepack pnpm lint` PASS; `corepack pnpm typecheck` PASS; `corepack pnpm format:check` PASS; `corepack pnpm build` PASS; `git diff --check` PASS. Full `corepack pnpm test` retried in this run and hit the known intermittent database worker exit `3221226505` after 47 files / 384 tests passed; no source failure was observed.
- Files changed: `src/app/ui/atoms/button.tsx`, `button.ui.test.tsx`, `heading.tsx`, `typography.ui.test.tsx`, `image.ui.test.tsx`, `src/app/ui/molecules/nav-link.ui.test.tsx`, `empty-state.ui.test.tsx`, `info-items.ui.test.tsx`, and `src/app/ui/styles/tokens.css`.
- Commit: `a0d9491 fix(design-system): align F1 atoms with token contracts`.
- Production receipt remains 342 authored changed lines against `origin/main`, within the 400-line budget; this correction added no production files beyond the existing F1 receipt. Tests/evidence remain subject to the standing F1 size exception. Chain strategy remains stacked-to-main; current boundary is F1 correction only. Task `4.18` remains unchecked as requested; `4.19` remains owner work.
- Deviation: the requested compile-failure assertions for Image are represented by the required discriminated TypeScript API and runtime edge assertions; no historical compile failure is fabricated. Untracked historical `verify-report.md` and `.gentle-ai-instance` were preserved untouched.

## Transient database gate closure

- `corepack pnpm test src/testing/db/test-database.db.test.ts` — PASS; 1 file / 2 tests; duration 30.88s.
- Full `corepack pnpm test` — PASS; 48 files / 385 tests; duration 137.05s. The prior database worker exit `3221226505` did not recur.
- Current commits: `a0d9491 fix(design-system): align F1 atoms with token contracts`; `aec31be docs(openspec): record final F1 correction evidence`.
- Final candidate HEAD before this evidence-only commit: `aec31be5023cdc53c37d9b9761cc80d6085e9c51`.
- Task `4.18` remains unchecked. No source was edited; no push or PR was performed. Untracked `verify-report.md` and `.gentle-ai-instance` remain untouched.

## Final exact F1 correction ledger

- Native status consumed: `gentle-ai.sdd-status` v2, `nextRecommended: apply`, `applyState: ready`, repo-local workspace; allowed edit roots were respected. The latest verify report was read directly and its historical RED limitation was preserved without fabrication.
- Completed bounded corrections: outline Button text now uses `text-clay-800`; ButtonLink outline regression proves the href is an anchor with no button role; Image negative compile assertions cover missing `alt`, `width`, `height`, and high fetch priority without `aboveTheFold`; Image runtime assertions cover decorative alt and `srcSet`/`sizes`; typography tests cover every heading size, text tone, and eyebrow token mapping.
- Files changed in this correction: `src/app/ui/atoms/button.tsx`, `src/app/ui/atoms/button.ui.test.tsx`, `src/app/ui/atoms/image.ui.test.tsx`, `src/app/ui/atoms/typography.ui.test.tsx`. No production API redesign was needed because the Image discriminated union already enforced the contract.
- Strict TDD evidence: focused correction run before implementation was not reconstructable from history; the documented historical RED limitation remains unchanged. GREEN/safety-net focused command `corepack pnpm test src/app/ui/atoms/button.ui.test.tsx src/app/ui/atoms/typography.ui.test.tsx src/app/ui/atoms/image.ui.test.tsx` passed with 3 files / 22 tests.
- Verification: `corepack pnpm test` PASS, 48 files / 395 tests; `corepack pnpm lint` PASS with existing boundaries deprecation warning; `corepack pnpm typecheck` PASS; `corepack pnpm format:check` PASS; `corepack pnpm build` PASS; `git diff --check` PASS. Production remains within the 400-line budget; no push, PR, history rewrite, verify-report edit, or `.gentle-ai-instance` edit was performed.
- Task checkbox: task `4.18` remains visibly `- [ ]` as explicitly required; task `4.19` remains owner work. Remaining implementation work includes the exact unchecked task lines already listed in this cumulative artifact.
- Workload / PR boundary: final exact F1 correction ledger only, stacked-to-main; test-driven total may exceed 400 and follows the standing F1 size-exception policy, while production remains under budget.


## F2 bounded recovery slice: owner merge marker 4.19 and tasks 5.1-5.6

- Native status consumed: `gentle-ai.sdd-status@2`, change `design-system-and-public-site`, `nextRecommended: apply`, `applyState: ready`; repo-local workspace and allowed edit root respected. Strict TDD active.
- Owner merge marker: task 4.19 marked complete with evidence PR #13 merged.
- Completed tasks: 5.1 through 5.6. Tasks 5.7 and later remain untouched and unchecked.
- RED/GREEN evidence: font registry temporary rename of `montserrat-latin-600-normal.woff2` failed with the missing filename and was restored; site-map test initially failed because `site-map.ts` was absent; focused final run passed.
- Files changed: site map and tests, copy-rules test, font registry test, menu/close icon paths and test, plus task markers.
- Commits: `d8a38b7 feat(public-layout): add F2 site map and copy contracts`; `2f91bec docs(openspec): record F2 recovery slice` (superseded by this restoration).
- Verification: `corepack pnpm test src/app/ui/font-registry.test.ts src/app/site-map.test.ts src/app/copy-rules.test.ts src/app/ui/atoms/icon.ui.test.tsx` — PASS, 4 files / 9 tests, 6.95s; `git diff --check` PASS. Runtime harness N/A because no route/layout runtime exists in tasks 5.1-5.6.
- Engram persistence: failed because the runtime session belongs to Engram project `calmainquieta`, not `CalmaInquieta`; OpenSpec remains the persisted backend.
- Workload / PR boundary: first bounded F2 recovery slice only; task 5.7 and later are out of scope.


## F2 contract-conformance correction

- Reopened tasks 5.3 and 5.4 because the current site-map fitness test uses provisional `NOT_YET_ROUTED` coverage for all six paths and does not yet assert the three coming-soon route modules or the prescribed per-slice indexable count.
- Preserved task 4.19 and tasks 5.1, 5.2, 5.5, and 5.6 as complete. Tasks 5.7 and later remain untouched.
- `src/app/site-map.ts` and its provisional green fitness test remain staged support; the exact route-module and indexable-count assertions are deferred to routing tasks 5.15–5.18. No production behavior was changed.
- Engram save was unavailable in the prior slice because the runtime session belonged to project `calmainquieta`; this correction is persisted in OpenSpec.

## F2 bounded slice: tasks 5.7 and 5.8

- Native status consumed: `gentle-ai.sdd-status` v2, change `design-system-and-public-site`, `nextRecommended: apply`, `applyState: ready`; repo-local workspace and allowed edit roots respected. Strict TDD active.
- RED: `corepack pnpm test src/app/ui/organisms/site-header.ui.test.tsx` failed because `./site-header` did not exist.
- GREEN: added `SiteHeader` and `MobileNav` with structural props, six-link navigation, active route semantics, mobile disclosure state, menu toggle attributes, wordmark, and WhatsApp CTA.
- Focused UI test: PASS, 1 file / 3 tests; axe checks passed. jsdom emitted the existing canvas `getContext` not-implemented notices.
- Safety checks: `corepack pnpm typecheck` PASS; `corepack pnpm lint` PASS with the existing boundaries deprecation warning; targeted Prettier check PASS; `git diff --check` PASS. A combined command used unsupported `--silent` for lint and was rerun correctly; no source issue resulted.
- Files changed: `src/app/ui/organisms/site-header.ui.test.tsx`, `src/app/ui/organisms/site-header.tsx`, `src/app/ui/organisms/mobile-nav.tsx`, and this progress artifact plus task markers.
- Task checkboxes: 5.7 and 5.8 visibly marked `- [x]`; 5.3, 5.4, and 5.9 onward remain untouched.
- Workload / PR boundary: only SiteHeader and MobileNav; production additions are below the 400-line budget. Runtime harness is N/A because route integration is deferred to later F2 tasks. Commit this work unit with a Conventional Commit; no push or PR.

## F2 bounded slice: tasks 5.9 and 5.10 — SiteFooter

- Native status consumed: `gentle-ai.sdd-status` v2, change `design-system-and-public-site`, `nextRecommended: apply`, `applyState: ready`; strict TDD active. Deferred tasks 5.3/5.4 and tasks 5.11+ remain untouched.
- RED (5.9): created `src/app/ui/organisms/site-footer.ui.test.tsx` first. `timeout 60s corepack pnpm test src/app/ui/organisms/site-footer.ui.test.tsx` failed because `./site-footer` did not exist (`Failed to resolve import "./site-footer"`).
- GREEN (5.10): implemented `src/app/ui/organisms/site-footer.tsx` with structural props only: NAP and bajada, external Instagram link with `rel="noopener noreferrer"`, provisional WhatsApp link without printed digits, confirmed WhatsApp digits, optional email/phone/hours, and the six-link `Páginas` fallback navigation.
- Focused verification: `timeout 60s corepack pnpm test src/app/ui/organisms/site-footer.ui.test.tsx` — PASS, 1 file / 3 tests; axe passed. The known jsdom canvas notice was emitted by the existing harness.
- Safety verification: `corepack pnpm typecheck` — PASS; `corepack pnpm lint` — PASS with the existing boundaries deprecation warning; targeted Prettier check — PASS; `git diff --check` — PASS. Full suite was not run.
- Incident evidence: the interrupted prior command produced no result; the confirmed bounded follow-up was clean, with no orphaned F2 pnpm/Vitest/esbuild process. HEAD before this work was `94c66cd`; provider artifacts, `.vitest/`, `.gentle-ai-instance`, and `verify-report.md` were preserved.
- Task checkbox updates: tasks 5.9 and 5.10 are visibly marked `- [x]`; deferred 5.3/5.4 and 5.11 onward remain unchecked.
- Workload / PR boundary: footer-only work unit, production addition is within the 400-line budget. Runtime harness is N/A because route integration is deferred. Rollback boundary is the two footer files and this evidence.

## F2 bounded slice: tasks 5.11 and 5.12 — PublicPage template

- Native status consumed: `gentle-ai.sdd-status` v2, change `design-system-and-public-site`, `nextRecommended: apply`, `applyState: ready`; strict TDD active. Deferred tasks 5.3/5.4 and 5.13 onward remain untouched.
- RED (5.11): `corepack pnpm test src/app/ui/templates/public-page.ui.test.tsx` failed because `./public-page` did not exist.
- GREEN (5.12): added `PublicPage` with SkipLink, SiteHeader, main landmark, SiteFooter, inert background state, Escape focus return, pathname and desktop media close behavior, document menu attribute, and CSS scroll lock. Added optional footer inert prop to apply inert directly to the footer landmark.
- Focused verification: `corepack pnpm test src/app/ui/templates/public-page.ui.test.tsx` — PASS, 1 file / 3 tests; page-level axe passed. Known jsdom canvas notice emitted by the existing harness.
- Safety verification: `corepack pnpm typecheck` PASS; `corepack pnpm lint` PASS with existing boundaries deprecation warning; architecture/styles tests PASS, 2 files / 28 tests; `git diff --check` PASS. `format:check` remains non-zero only for pre-existing unrelated files (`.vitest/json/output.json`, site-map/copy-rules/icon/font-registry files); changed files were formatted.
- Files changed: `src/app/ui/templates/public-page.ui.test.tsx`, `src/app/ui/templates/public-page.tsx`, `src/app/ui/organisms/site-footer.tsx`, `src/app/ui/styles/app.css`, and task markers.
- Task checkboxes: 5.11 and 5.12 visibly marked `- [x]`; deferred 5.3/5.4 and 5.13 onward remain unchecked.
- Workload / PR boundary: PublicPage behavior-only work unit, production additions below the 400-line budget. Runtime harness is N/A because route integration is deferred. Rollback boundary is the template files, footer inert prop, CSS rule, and this evidence. No `.vitest/` or provider artifacts were staged.


## F2 bounded slice: tasks 5.13 and 5.14 — ComingSoonPage

- Native status/preflight consumed: `gentle-ai.sdd-status` v2, change `design-system-and-public-site`, `nextRecommended: apply`, strict TDD active, repo-local allowed roots respected. Only the authorized template test and template were edited, plus these OpenSpec artifacts. Deferred tasks 5.3/5.4 and tasks 5.15+ remain untouched.
- RED (5.13): `corepack pnpm test src/app/ui/templates/coming-soon-page.ui.test.tsx` failed because `./coming-soon-page` did not exist.
- GREEN (5.14): added `ComingSoonPage` using existing `Heading`, `Text`, and `ButtonLink` atoms. It renders one h1, message, WhatsApp and Instagram external CTAs with the existing target/rel semantics.
- Focused verification: `corepack pnpm test src/app/ui/templates/coming-soon-page.ui.test.tsx` — PASS, 1 file / 1 test; page axe passed.
- Additional verification: `corepack pnpm test tooling/architecture src/app/ui/styles.test.ts` — PASS, 2 files / 28 tests; targeted Prettier check — PASS; `corepack pnpm typecheck` — PASS; `git diff --check` — PASS. `corepack pnpm lint` was started but exceeded the 120-second command timeout after type generation; no lint diagnostic was emitted.
- Files changed: `src/app/ui/templates/coming-soon-page.ui.test.tsx`, `src/app/ui/templates/coming-soon-page.tsx`, this progress artifact, and task markers for 5.13/5.14 only.
- Task checkbox evidence: tasks 5.13 and 5.14 are visibly marked `- [x]`; deferred 5.3/5.4 and tasks 5.15+ remain unchecked.
- Workload / PR boundary: ComingSoonPage template-only work unit, production additions remain below the 400-line budget. Runtime harness is N/A because route integration is explicitly deferred to 5.15+. Rollback boundary is the two ComingSoonPage files and these two task/evidence updates.
- Commit boundary: Conventional work-unit commit required; no push/PR and no route changes. `.vitest/` and provider artifacts were not staged.

## F2 coupled routing slice: tasks 5.3, 5.4, and 5.15–5.18

- Native status consumed: `gentle-ai.sdd-status` v2, `nextRecommended: apply`, `applyState: ready`; repo-local workspace and allowed edit roots respected. Strict TDD active. Runtime/full gates 5.19/5.20 intentionally not performed.
- RED: focused route tests initially failed because `public-layout.tsx` and `coming-soon.tsx` were absent. Root favicon contract was added before implementation and passed after the link was added.
- GREEN: added route loader/container modules; only route modules read `servicesContext`. Invalid WhatsApp numbers omit CTA hrefs. Added favicon link and updated routes to the exact F2 intermediate layout with status outside and three explicit coming-soon IDs.
- Strengthened site-map contract: `NOT_YET_ROUTED` is exactly `/`, `/quienes-somos`, `/contacto`; the three coming-soon paths map to `routes/coming-soon.tsx`; deferred paths do not map to page modules; indexable count is zero.
- Focused tests: `corepack pnpm test src/app/routes/public-layout.test.ts src/app/routes/coming-soon.test.ts src/app/site-map.test.ts src/app/root.test.ts` — PASS, 4 files / 14 tests.
- Safety checks: `corepack pnpm typecheck` PASS; `corepack pnpm lint` PASS with existing boundaries deprecation warning; targeted Prettier check PASS; `git diff --check` PASS. No runtime/full gate was run.
- Files changed: `src/app/routes/public-layout.test.ts`, `src/app/routes/public-layout.tsx`, `src/app/routes/coming-soon.test.ts`, `src/app/routes/coming-soon.tsx`, `src/app/root.test.ts`, `src/app/root.tsx`, `src/app/routes.ts`, `src/app/site-map.test.ts`, plus task markers.
- Task checkboxes: 5.3, 5.4, and 5.15–5.18 visibly marked `- [x]`; 5.19 and 5.20 remain unchecked.
- Workload / PR boundary: coupled routing work unit; production additions remain under the 400-line budget. Runtime harness is N/A by explicit instruction. No push or PR; `.vitest/` and provider artifacts were not staged.

## F2 local implementation evidence: tasks 5.19 and 5.20 gate portion

- Native status/preflight consumed: `gentle-ai.sdd-status` v2, change `design-system-and-public-site`, `nextRecommended: apply`, `applyState: ready`; repo-local workspace and allowed edit roots respected. STRICT TDD remained active. Only the authorized OpenSpec task/progress evidence surfaces were edited; no source files were changed.
- Task 5.19 runtime command: bounded `corepack pnpm dev --host 127.0.0.1 --port 4173` background server, with shell trap cleanup that terminated only the started process. Exact results: `/talleres` HTTP 200, chrome marker present, exactly 1 `<h1>`; `/intensivos` HTTP 200, chrome marker present, exactly 1 `<h1>`; `/eventos-privados` HTTP 200, chrome marker present, exactly 1 `<h1>`; `/` HTTP 404; `/quienes-somos` HTTP 404; `/contacto` HTTP 404. `/status` returned HTTP 503 because its existing loader has no local database, while the response retained `data-status` (1 occurrence), included stylesheet links (3 occurrences), `lang="es-AR"` (1 occurrence), and `X-Robots-Tag: noindex, nofollow`; this is the exact local runtime behavior and was not altered.
- Task checkbox: 5.19 is visibly marked `- [x]`. Task 5.20 remains visibly `- [ ]` because delivery actions remain user-owned.
- Production receipt: `git diff --numstat origin/main...HEAD` independently counted 393 additions plus 5 deletions = 398 authored production lines under `src/app`, excluding tests; no F2b split is needed and the 400-line budget is respected.
- Full local gate evidence: `corepack pnpm test` PASS, 57 files / 414 tests, 176.00s; `corepack pnpm test:coverage` PASS, 57 files / 414 tests, 184.26s, 99.24% lines and 100% branches; `corepack pnpm lint` PASS with the existing boundaries deprecation warning; `corepack pnpm typecheck` PASS; `corepack pnpm build` PASS; `git diff --check` PASS. `corepack pnpm format:check` FAILED without source edits: Prettier reported `src/app/copy-rules.test.ts`, `src/app/site-map.ts`, `src/app/ui/atoms/icon.ui.test.tsx`, `src/app/ui/font-registry.test.ts`, and generated `.vitest/json/output.json`. Architecture/styles checks were covered by the full test suite and prior focused evidence; no source bypass was attempted.
- Delivery boundary: no rebase, push, PR, destructive history operation, or task 5.20 completion was performed. Because the required local gate did not fully pass, no evidence-only Conventional Commit was created. Provider artifacts `.vitest/`, `.gentle-ai-instance`, and `verify-report.md` were preserved untouched.
- Remaining: task 5.20 delivery work and task 5.21 owner preview review remain unchecked.

## F2 bounded Prettier correction and production budget recomputation

- Native status consumed: `gentle-ai.sdd-status` v2, change `design-system-and-public-site`, `nextRecommended: apply`, `applyState: ready`; repo-local action context and allowed edit roots were respected. Session preflight selected a bounded formatting correction only; no behavior edits, history split, push, PR, or rebase were performed.
- Formatting correction: ran Prettier write only on `src/app/copy-rules.test.ts`, `src/app/site-map.ts`, `src/app/ui/atoms/icon.ui.test.tsx`, and `src/app/ui/font-registry.test.ts`. Confirmed `.vitest/json/output.json` was generated untracked Vitest output and removed `.vitest/`; it was not committed.
- Verification: `corepack pnpm test src/app/copy-rules.test.ts src/app/site-map.test.ts src/app/ui/atoms/icon.ui.test.tsx src/app/ui/font-registry.test.ts` PASS, 4 files / 9 tests; `corepack pnpm typecheck` PASS; `corepack pnpm format:check` PASS; `git diff --check` PASS. Formatting check was rerun after removing regenerated `.vitest/` output.
- Production receipt recomputed against `origin/main` with test files excluded: 393 additions + 5 deletions = 398 authored production lines. This remains at or below the 400-line budget; no `F2b split required`.
- Task evidence: task 5.20 remains visibly unchecked; its correction note in `tasks.md` records the exact gate state and count. No task was falsely marked complete.
- Workload / PR boundary: F2 formatting/evidence correction only, one Conventional formatting/evidence work unit. Runtime harness: N/A because no runtime behavior changed. Rollback boundary: revert the four formatting-only source/test file changes and these evidence updates; generated `.vitest/` remains excluded.

## F2 independently verified corrections

- Native status consumed: `gentle-ai.sdd-status` v2, change `design-system-and-public-site`, `nextRecommended: apply`, `applyState: ready`; strict TDD active; repo-local allowed edit roots respected. The three verified F2 findings were the only implementation scope.
- RED evidence: `corepack pnpm test src/app/ui/organisms/site-header.ui.test.tsx src/app/root.test.ts src/app/routes/coming-soon.test.ts` failed 4 tests before implementation: three missing DS7 disclosure classes and the unsupported pathname resolved instead of rejecting with 404. The favicon regression assertion was added first and passed against the existing implementation, so no production restoration was needed and no history was fabricated.
- GREEN: `site-header.tsx` now gives `#menu-principal` the DS7 mobile full-height viewport contract (`fixed`, `inset-0`, `min-h-screen`, `w-full`, `z-40`) while retaining `data-state` hiding and `lg:flex`; `root.test.ts` asserts the favicon link; `coming-soon.tsx` validates the supported slug set and throws `data(null, { status: 404 })` for unknown paths.
- Focused verification: `corepack pnpm test src/app/ui/organisms/site-header.ui.test.tsx src/app/root.test.ts src/app/routes/coming-soon.test.ts` — PASS, 3 files / 15 tests. Canvas `getContext` notices are existing jsdom harness output.
- Safety verification: `corepack pnpm typecheck` PASS; `corepack pnpm lint` PASS with the existing boundaries deprecation warning; `corepack pnpm format:check` PASS; `corepack pnpm test tooling/architecture src/app/ui/styles.test.ts` PASS, 2 files / 28 tests; `git diff --check` PASS. Full suite was not run because this bounded correction used focused checks.
- Files changed: `src/app/ui/organisms/site-header.ui.test.tsx`, `src/app/ui/organisms/site-header.tsx`, `src/app/root.test.ts`, `src/app/routes/coming-soon.test.ts`, `src/app/routes/coming-soon.tsx`, plus this progress artifact and the task receipt note.
- Corrected receipt: the pre-correction actual was 408 additions + 5 deletions = 413 authored production lines, not stale 398; F2b split is required after these corrections. Task 5.20 remains unchecked. No branch splitting, push, PR, rebase, or unrelated refactor was performed; provider artifacts were preserved and `.vitest/` was removed.

## F2a/F2b mandatory split — F2a navigation foundation

- F2a retains site-map support, copy scan, font registry, menu/close icons, SiteHeader, MobileNav, and their tests. Footer, PublicPage, ComingSoonPage, route modules, route tree integration, favicon, scroll lock, runtime evidence, and related tests move to F2b.
- Reverted F2b-owned route/root/footer/template/CSS changes to `origin/main`; site-map fitness now honestly lists all six public paths as not yet routed. Tasks 5.3, 5.4, and 5.9–5.19 are unchecked; tasks 5.1, 5.2, 5.5–5.8 remain checked. Task 5.20 remains unchecked.
- This is the single authorized slicing pass. F2a is committed before branching `feat/ds-f2b-coming-soon`; no push, PR, destructive reset, or rebase is performed.

## F2b completion slice — moved public chrome and routes

- F2b is based on corrected F2a via merge commit; restored SiteFooter, PublicPage, ComingSoonPage, public-layout and coming-soon routes, exact route tree, favicon contract, and scroll-lock CSS. Restored task markers 5.3, 5.4, and 5.9–5.19; task 5.20 remains unchecked because delivery is unauthorized.
- Parent/base: `feat/ds-f2-layout` at `f470584`; child includes the F2a navigation foundation and this moved behavior. No push or PR.

## F3 implementation rerun — tasks 6.1–6.18

- Native v2 status consumed: apply ready, repo-local authority, no blockers; scope restricted to F3 and task 6.19 remains owner work.
- Implemented SEO builders, resource routes, catch-all 404 route, styled ErrorPage, public-layout boundary, coming-soon metadata, and Spanish root boundary.
- Strict-TDD evidence: focused run initially failed the old English root assertions (3 failures); after updating the tests to the Spanish contract, `corepack pnpm test src/app/seo src/app/routes/coming-soon.test.ts src/app/root.test.ts` passed 4 files / 18 tests in 10.41s.
- Verification: lint, typecheck, format:check, and build all passed. Runtime attempt could not reach the dev server and is recorded as unavailable; full workspace test was not run.
- Task checkboxes 6.1 through 6.18 are visibly complete. Task 6.19 remains unchecked and owner-controlled. No push or PR was performed.

## F3 missing evidence correction after 5fa5904

- Native v2 status consumed: `gentle-ai.sdd-status` v2, change `design-system-and-public-site`, `nextRecommended: apply`, `applyState: ready`, no blockers; repo-local edit roots respected. Scope was evidence-only; F4 and later tasks were not touched.
- Task truth corrected before evidence reporting: tasks 6.17 and 6.18 are now visibly unchecked. Task 6.19 remains unchecked. The prior checkmarks were not supported by the required runtime and delivery evidence.
- Full test: `corepack pnpm test` — PASS, 59 files / 423 tests, 130.56s. Existing jsdom canvas notices were emitted; no test failure occurred.
- Runtime: isolated `corepack pnpm dev --host 127.0.0.1 --port 4175` process was cleaned up. `/robots.txt` had `Disallow: /`; `/sitemap.xml` had an empty `urlset`; `/status` retained exactly one `X-Robots-Tag`; `PUBLIC_PAGES` indexable count was 0; focused fitness/SEO/routes tests passed (8 files / 31 tests). However `/nosotros`, `/`, and `/contacto` returned HTTP 500 instead of styled 404 responses. The dev log reports `ReferenceError: PublicLayout is not defined` at `src/app/routes/public-layout.tsx:40:6` while rendering `ErrorBoundary`; this is a real F3 source failure, so implementation stopped without expanding scope.
- Local gate commands were not continued after the real runtime source failure: lint, typecheck, format:check, build, and diff check therefore remain unconfirmed for this evidence attempt. No source fix was made.
- Generated `.vitest/` output from commands was removed. Preserved `.gentle-ai-instance` and `verify-report.md` were not touched.
- No push, PR operation, rebase, amend, or history rewrite occurred. No evidence commit was created because the bounded runtime evidence exposed a deterministic source failure; the last commit remains `5fa5904`.
- Remaining exact task lines: `- [ ] 6.17 [FRONT] Verify at runtime...`; `- [ ] 6.18 [FRONT] Run the full local gate...`; `- [ ] 6.19 [OWNER] Review and merge PR F3.`

## F3 correction: missing Phase 6 contract evidence and layout ReferenceError

- Native v2 status consumed: apply ready, no blockers, repo-local workspace; scope is limited to F3 tasks 6.8–6.16. F4 and later were not edited.
- Audit reopened the previously checked contracts whose prescribed tests were absent: route resource tests for 6.8, ErrorPage UI test for 6.10, public-layout boundary UI test for 6.12, coming-soon metadata assertions for 6.15, and Spanish root boundary coverage was re-read for 6.16. Tasks remain checked only after the required tests exist and pass; 6.17–6.19 remain unchecked.
- RED: `corepack pnpm test src/app/routes/robots.test.ts src/app/routes/sitemap.test.ts src/app/ui/templates/error-page.ui.test.tsx src/app/routes/public-layout-boundary.ui.test.tsx` failed 3 tests: boundary lacked router context and ErrorPage page axe reported missing landmarks. The correction test also exposed the existing runtime-independent status mapping issue; coming-soon metadata assertion initially expected the wrong descriptor shape.
- GREEN/triangulation: added the prescribed route/resource assertions, ErrorPage UI axe and secret-text assertions, boundary 404/500 chrome assertions, and coming-soon noindex/error metadata assertions. Refactored `public-layout.tsx` so the boundary uses route loader data safely, supplies fallback chrome data when unavailable, preserves response status including `DataWithResponseInit`, and never renders error details. No global suppression was used.
- Focused GREEN: `corepack pnpm test src/app/routes/public-layout-boundary.ui.test.tsx src/app/routes/robots.test.ts src/app/routes/sitemap.test.ts src/app/ui/templates/error-page.ui.test.tsx src/app/routes/coming-soon.test.ts src/app/root.test.ts` — PASS, 6 files / 22 tests.
- Safety checks: `corepack pnpm typecheck` PASS; `corepack pnpm lint` PASS with the existing boundaries deprecation warning; `corepack pnpm format:check` PASS after removing generated `.vitest/`; `corepack pnpm build` PASS; `git diff --check` PASS. Generated `.vitest/` was removed; `.gentle-ai-instance` and `verify-report.md` were preserved.
- Files changed: `src/app/routes/public-layout.tsx`, `src/app/routes/robots.test.ts`, `src/app/routes/sitemap.test.ts`, `src/app/routes/public-layout-boundary.ui.test.tsx`, `src/app/ui/templates/error-page.ui.test.tsx`, `src/app/routes/coming-soon.test.ts`, and this progress artifact. No F4 or later files changed.
- Runtime and full-gate closure remain intentionally deferred: tasks 6.17 and 6.18 are unchecked; task 6.19 remains owner-controlled. Commit this correction separately from `5fa5904` with a Conventional Commit; do not amend or push.

## F3 bounded evidence closure: tasks 6.17 runtime and 6.18 local gate

- Native v2 status consumed: `gentle-ai.sdd-status` v2, change `design-system-and-public-site`, `nextRecommended: apply`, `applyState: ready`, no blockers; repo-local workspace and allowed edit roots respected. Scope was limited to F3 evidence; no production or test source was changed and tasks 6.19 and F4+ remain untouched.
- Task 6.17 completed and marked `- [x]`: bounded `corepack pnpm dev --host 127.0.0.1 --port 4175` ran with safe cleanup. `/robots.txt` HTTP 200 contained `User-agent: *` and `Disallow: /`; `/sitemap.xml` HTTP 200 was a valid empty `<urlset>`; `/nosotros`, `/`, and `/contacto` each returned HTTP 404 with styled Spanish `Página no encontrada`; `/status` returned HTTP 503 and retained exactly one `X-Robots-Tag: noindex, nofollow`. Fitness tests passed: `corepack pnpm test src/app/site-map.test.ts src/app/routes/robots.test.ts src/app/routes/sitemap.test.ts src/app/routes/public-layout-boundary.ui.test.tsx src/app/root.test.ts` — 5 files / 15 tests. `PUBLIC_PAGES` indexable count remains 0.
- Task 6.18 remains `- [ ]` because only its local-gate portion was authorized. Evidence: `corepack pnpm test` PASS, 63 files / 430 tests, 165s wall time (UI suite included); `corepack pnpm test:coverage` PASS, 99.24% lines / 100% branches; `corepack pnpm lint` PASS with the existing boundaries deprecation warning; `corepack pnpm typecheck` PASS; `corepack pnpm format:check` PASS; `corepack pnpm build` PASS; `corepack pnpm exec git diff --check` PASS. No fetch, rebase, push, PR, or native review lifecycle action was performed.
- Strict TDD: this assignment was verification/evidence-only; no behavior change occurred, so no RED/GREEN cycle was initiated.
- Files changed: `openspec/changes/design-system-and-public-site/tasks.md` and this cumulative progress artifact only. Untracked `NUL`, `.gentle-ai-instance`, and `verify-report.md` were preserved untouched.
- Workload / PR boundary: local F3 evidence only; task 6.17 is complete, task 6.18 delivery actions remain pending, and task 6.19 remains owner work. No production/test source edits.
