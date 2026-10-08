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
