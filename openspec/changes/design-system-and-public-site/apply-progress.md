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
