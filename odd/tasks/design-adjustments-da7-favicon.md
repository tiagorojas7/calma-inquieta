# DA-7 favicon and launch-gate completion

- Feature: `design-adjustments-da7-favicon`.
- Base: `origin/main` at `35165fea50a2d9f7614ed1f3d1152cc0782a4ec5`.
- Branch/worktree: `feat/design-adjustments-da7-favicon` in `../CalmaInquieta-da7-favicon`.
- Objective: replace the remaining stand-in favicon with a registered, rights-tracked favicon set derived from the supplied transparent brand logo, link the assets from the document root, and close the favicon launch-gate criterion.
- Non-goals: Enrollment code, `src/composition/**`, supplier UI, public catalog readers, Cloudflare deployment, and unrelated design changes.
- TDD: strict, required by `AGENTS.md`; runner `pnpm test <path>`.
- Route: delegated direct; the multi-file writer trigger applies.
- Delivery strategy: `auto-chain`, inherited from design-adjustments. Forecast: 300–390 authored text lines plus binary outputs. Start as one independent PR; if authored text exceeds 400 after the honest slicing pass, move deviation-register documentation to a second docs-only PR while keeping behavior and tests together. A size exception is only acceptable if focused tests make the cohesive favicon behavior exceed 400 after that split.
- Engram mirror: `odd/design-adjustments-da7-favicon/tasks`.

## Reconciliation

GitHub merged history is authoritative over stale OpenSpec and ODD checkboxes:

- B1b Worker fail-closed safeguards merged through PRs #40 and #41.
- R2 binding and warning hardening merged through PRs #52 and #53.
- Admin F4 turnos merged through PR #81.
- B6 workshop periods, B8b materials, and B9 period material offers merged through PRs #58, #66, and #73.
- DA-1 through DA-6 and the DA-7 TrustRow icons have merged evidence through PRs #56 and #59–#65, despite stale task checkboxes.
- The favicon remains genuinely pending on current `origin/main`: `src/app/root.tsx` links `/media/stand-ins/favicon.png`, the stand-in registry still contains the favicon row, and no curated favicon files exist. The required transparent source logo exists in the external media workspace.
- Supplier admin UI is implemented but unmerged on `feat/admin-catalog-f8-suppliers`; it is deferred because Terminal A temporarily owns `src/composition/request-services.ts` for Enrollment E6.

## Allowed edit surfaces

- `odd/tasks/design-adjustments-da7-favicon.md`
- `src/app/root.tsx`
- `src/app/root.test.ts`
- `src/modules/site-content/infrastructure/content/media-assets.ts`
- `src/modules/site-content/infrastructure/content/media-rights.ts`
- `src/modules/site-content/infrastructure/content/stand-in-assets.ts`
- `src/modules/site-content/infrastructure/media-assets.test.ts`
- `src/modules/site-content/infrastructure/repository-content.test.ts`
- `src/modules/site-content/infrastructure/stand-in-assets.test.ts`
- `tooling/media/recipes/design-adjustments.json`
- `public/favicon.ico`
- `public/media/brand/icon-192-*`
- `public/media/brand/apple-touch-icon-*`
- `public/media/stand-ins/favicon.png`
- `docs/media/pipeline.md`
- `docs/design/deviation-register.md`

## Tasks

- [x] T1 — RED: pin root links, curated asset/rights parity, source recipe, and stand-in retirement with focused tests; record the observed failures.
- [x] T2 — GREEN/REFACTOR: derive the favicon set from the supplied transparent logo, register and link it, retire the stand-in, document provenance, and keep focused tests green. The parent owns commits and delivery.
- [x] T3 — Verify focused tests, accessibility/static metadata behavior, authored-line budget, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, relevant full tests, `pnpm build`, and `git diff --check`; obtain an independent verifier and record every exact result.
- [x] T4 — Reconcile native-review availability, prepare issue-first delivery evidence, and stop for owner publication authorization.

## Progress and evidence

- Read-only reconciliation completed against current `origin/main`, merged PR history, OpenSpec task files, ODD trackers, existing branches, and current source.
- Terminal A confirmed this slice does not overlap Enrollment E6; `src/composition/request-services.ts` remains exclusively reserved by Terminal A.
- T1 RED (2026-10-23): `pnpm test src/app/root.test.ts src/modules/site-content/infrastructure/media-assets.test.ts src/modules/site-content/infrastructure/repository-content.test.ts src/modules/site-content/infrastructure/stand-in-assets.test.ts` ran 128 tests; 8 expected failures proved the missing root links, favicon registry and recipe rows, and retired stand-in manifest/file state.
- The parent removed `public/media/stand-ins/favicon.png` in this worktree under the explicitly authorized retirement scope.
- The parent removed the two erroneous trim-derived intermediates under explicit scope. T2 regenerated square assets without trim: `icon-192-192.37f5439a.png` (192x192) and `apple-touch-icon-180.21a05b9a.png` (180x180). The root ICO contains 16, 32, and 48 px PNG entries from the same source.
- T2 GREEN/REFACTOR (2026-10-23): `pnpm test src/app/root.test.ts src/modules/site-content/infrastructure/media-assets.test.ts src/modules/site-content/infrastructure/repository-content.test.ts src/modules/site-content/infrastructure/stand-in-assets.test.ts` passed 127 tests in 4 files. Static tests assert all three root links, same-origin URLs, registry/rights/recipe parity, and favicon stand-in retirement.
- T3 complete (2026-10-23): `pnpm test src/modules/site-content src/app/root.test.ts` passed 282 tests in 11 files; `pnpm typecheck` passed; earlier `pnpm lint` and repeat `pnpm format:check` attempts timed out, but the independent verifier's correction replaced four unsafe Vitest matcher assignments with narrow template-literal fixture paths. The rerun focused 127-test command, `pnpm lint`, `pnpm format:check`, and `git diff --check` all passed; `pnpm build` passed.
- Final `git diff --numstat` reported 197 additions and 55 deletions across tracked text paths. With this 60-line tracker, authored changed text totals 312 lines. Binary paths are the deleted stand-in plus `public/favicon.ico`, `public/media/brand/icon-192-192.37f5439a.png`, and `public/media/brand/apple-touch-icon-180.21a05b9a.png`. `docs/design/deviation-register.md` remains unchanged.
- Independent verification initially blocked the candidate on four `@typescript-eslint/no-unsafe-assignment` findings in two tests. The bounded correction replaced matcher-derived `any` values with typed literal paths. Independent re-verification passed 127/127 focused tests, lint, format check, `git diff --check`, and decoded every ICO payload at 16x16, 32x32, and 48x48; both PNG dimensions and SHA-256 filename prefixes also matched.
- Work-unit commit: `96033f5` (`feat(brand): replace stand-in favicon set`), 15 paths, 257 additions and 55 deletions including this tracker, plus the three added binaries and one retired binary stand-in.
- Native assessment was unavailable with a schema-incompatible response. Native INSPECT then timed out in `pre_native` before evaluation (`mutation_outcome: not_started`, no lineage or authority). With owner consent, a privacy-scrubbed occurrence was added to the existing provider tracker: `Gentleman-Programming/gentle-ai#5464` comment `6378218696`. No retry or substitute decline was possible because INSPECT never produced a consent envelope.
- Manual browser-tab cache refresh and Apple touch-icon discovery on a device/simulator remain advisable but are not local commit blockers. Lighthouse and 360/1024/1440 page-layout checks are N/A: this slice changes document icon metadata and binary icons, not rendered page layout.
- Issue-first publication: owner authorized the batch; issue #93 (`[Feature]: Replace the stand-in favicon set`) was created from the repository Feature Request form and atomically approved with `status:approved`; it retains `type:feature`. Branch push and PR creation are authorized; merge remains separately owner-controlled.
