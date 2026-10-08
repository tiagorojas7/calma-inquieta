# Apply Progress

## F1 remediation

- Native status consumed: `gentle-ai.sdd-status` v2, change `design-system-and-public-site`, `nextRecommended: apply`, `applyState: ready`, repo-local workspace. Allowed edit roots were respected.
- Remediation scope: accessibility safety nets, native Button keyboard behavior, token utility contracts, and behavioral assertions identified in the read-only verification report.
- Files changed: `src/app/ui/atoms/button.tsx`, `heading.tsx`, `button.ui.test.tsx`, `typography.ui.test.tsx`, `icon.ui.test.tsx`, `small-atoms.ui.test.tsx`, `src/app/ui/molecules/{nav-link,empty-state,info-items}.ui.test.tsx`.
- Task checkboxes: no historical task was falsely marked complete; task `4.18` remains unchecked because push/PR are deferred, and `4.19` remains owner work.

## TDD Cycle Evidence

| Contract | RED evidence | GREEN / triangulation | Safety net |
|---|---|---|---|
| Button native keyboard and disabled suppression | Remediation RED: focused user-event test initially observed `0` calls because the test did not focus the control; this was corrected before implementation changes. Historical original RED was not captured. | Removed duplicate `onKeyDown`; native button activation now passes focused Enter/Space user interactions and disabled click suppression. | Focused UI suite rerun after correction. |
| Token utility contracts | Remediation RED: prior tests only asserted data hooks; no historical RED was captured for the original implementation. | Added meaningful variant/type utility class contracts in production; typography now maps sizes and tones to token utilities. | Focused UI suite. |
| Axe and behavioral assertions | Axe additions are safety-net tests and passed immediately; they are not RED evidence. Added axe calls and assertions for five previously uncovered UI test files, plus external rel, decorative divider, clipping, type-name, and date-label checks. | Focused UI suite passed after test corrections. | Full gate remains to be run. |

## Verification

- Initial remediation focused run: failed as genuine test feedback (Button focus setup, incorrect presentation/time role queries, and test fixture using a mailto link for an external-rel assertion); these were corrected.
- Latest focused run after corrections: pending rerun; no full gate is claimed.
- Historical limitation: original RED observations were not captured and cannot be reconstructed.
- Production authored additions remain intended below the 400-line limit; final `git diff --numstat origin/main...HEAD` receipt is still required.

## Remaining

- [ ] 4.18 [FRONT] Run the full local gate; push/PR remain deferred by instruction.
- [ ] 4.19 [OWNER] Review and merge PR F1.

## Workload / PR boundary

F1 remediation only; tests and production fixes stay together. Delivery remains stacked-to-main with ask-on-risk. No push, PR, history rewrite, or `.gentle-ai-instance` edit was performed.
