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
