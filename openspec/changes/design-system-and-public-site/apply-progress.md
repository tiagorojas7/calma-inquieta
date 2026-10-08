

## F2 bounded recovery slice: owner merge marker 4.19 and tasks 5.1-5.6

- Native status consumed: `gentle-ai.sdd-status@2`, change `design-system-and-public-site`, `nextRecommended: apply`, `applyState: ready`; repo-local workspace and allowed edit root respected. Session preflight was auto, artifact store both, ask-on-risk, 400 authored production-line budget. Strict TDD active.
- Owner merge marker: task 4.19 marked complete with evidence PR #13 merged.
- Completed tasks: 5.1 setup/contract review; 5.2 font registry test; 5.3 site-map test; 5.4 site-map implementation; 5.5 copy-rules test; 5.6 menu/close icon implementation and UI test. Tasks 5.7 and later remain untouched and unchecked.
- TDD evidence:
  - 5.2 RED: temporarily renamed `public/fonts/montserrat-latin-600-normal.woff2`; `corepack pnpm test src/app/ui/font-registry.test.ts` failed naming the missing file; the file was restored immediately. GREEN focused test passed.
  - Site-map RED: initial focused run failed because `src/app/site-map.ts` did not exist. GREEN passed after adding the map and test.
  - Copy scan RED was exercised by the contract setup and the focused scan now passes; temporary violating copy was not retained.
  - Icon RED contract was added first; the focused UI command exposed the existing permissive runtime behavior, then menu/close SVG paths were implemented. Focused UI tests pass.
- Files changed: `src/app/site-map.ts`, `src/app/site-map.test.ts`, `src/app/copy-rules.test.ts`, `src/app/ui/font-registry.test.ts`, `src/app/ui/atoms/icon.tsx`, `src/app/ui/atoms/icon.ui.test.tsx`, and task markers in `openspec/changes/design-system-and-public-site/tasks.md`.
- Commit: `d8a38b7 feat(public-layout): add F2 site map and copy contracts` (Conventional Commit; tests kept with implementation).
- Verification: `corepack pnpm test src/app/ui/font-registry.test.ts src/app/site-map.test.ts src/app/copy-rules.test.ts src/app/ui/atoms/icon.ui.test.tsx` — PASS, 4 files / 9 tests, 11.24s. Temporary rename RED output was restored; no temporary file remains.
- Workload / PR boundary: first bounded F2 recovery slice only; no production budget concern (two icon paths plus map). Runtime harness: N/A; no route/layout runtime exists in tasks 5.1-5.6. Rollback boundary is commit `d8a38b7` and the six listed source/test files. Tasks 5.7 onward are explicitly out of scope.
- Action-context warning: task 5.1 contract wording references module-level `listStandInAssets`, while the existing B2 API exposes the reader method; the font test uses the existing manifest export without editing forbidden module files.
