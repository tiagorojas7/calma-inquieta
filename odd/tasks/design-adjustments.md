# Design adjustments

- Feature: `design-adjustments` (ODD/OpenSpec continuation; migrated from SDD by explicit owner decision on 2026-10-17).
- Documentary authority: `openspec/changes/design-adjustments/{proposal.md,explore.md,design.md,tasks.md,specs/**}`. The lean-delivery amendment in design section 9 and `tasks.md` govern slicing.
- Branch chain: stacked-to-main, one PR per slice. Current branch: `feat/design-adjustments-registry` (stacked on DA-1 PR #56).
- Delivery strategy: `auto-chain`; review budget: 400 authored changed lines per PR. Apply each declared split rule before requesting an exception for production lines.
- TDD: strict (source: `AGENTS.md`). Runner: `corepack pnpm test <path>`.
- Route: P0 is a direct documentation work unit after delegated artifact audit. Every implementation slice uses one delegated writer in an isolated worktree because it touches multiple non-trivial files.
- Engram mirror: `odd/design-adjustments/tasks`.

## Objective

Replace the public site's stand-in media and desktop-first hero with the approved curated-media registry, mobile-first art-directed hero, ambient loop, decorative motifs, and final brand polish while preserving accessibility, performance, rights controls, architecture boundaries, and the public-catalog ownership seams.

## Problem and rationale

The deployed site still shows the baseline design and stand-in media. The approved OpenSpec artifacts already define the target behavior and review slices. Native SDD execution cannot continue because the installed CLI retired `sdd-status` while the Pi package still exposes stale SDD agents; the owner explicitly chose ODD/OpenSpec continuation instead of waiting. The existing artifacts remain the product and technical authority rather than being replanned.

## Scope and constraints

- Follow the exact requirements and task order in `openspec/changes/design-adjustments/tasks.md`.
- Delivery order: P0 → DA-1 → DA-2 → DA-3 → DA-4 → DA-5 → conditional DA-5R → DA-6 → DA-7.
- DA-1 is required: current `media:optimize` has no hashed names, crop focus, JPEG, ICO, or `public/media/<area>/` output.
- Keep `src/modules/workshops/**`, workshop fakes/contracts, and the B6 migration lane untouched.
- Never stage, reset, or overwrite the sensitive local `wrangler.jsonc` in the primary checkout.
- One writer per isolated worktree; no overlapping write ownership.
- Coordinate full gates through `C:/Temp/calma-gate.lock`.
- Conventional commits only, without AI attribution.
- Owner merges; this orchestrator may commit, push, and open PRs.
- The missing source logo raster blocks only DA-7.

## Tasks

- [x] P0 — Commit the planning artifacts and this recovery tracker, verify formatting, push `docs/design-adjustments-planning`, and open the docs PR to `main`.
- [x] DA-1 — Add the minimal crop/hash/JPEG/ICO derive tooling with strict RED/GREEN/REFACTOR evidence and pipeline documentation. PR #56 is open, CI passed, and owner merge is pending.
- [ ] DA-2 — Add the media registry, rights ledger, validation, curated responsive assets, parity tests, and immutable cache rules; apply the declared DA-2a/DA-2b split if production exceeds 400 lines. Domain and gate-wiring work units complete; the 2.6 parity test is next.
- [ ] DA-3 — Add `Picture`, art-directed preload support, and the mobile-first hero.
- [ ] DA-4 — Publish the curated gallery, teaser and Contacto media, registered share image, launch gate, and retired stand-ins.
- [ ] DA-5 — Add and wire the accessible ambient loop with reduced-motion and Save-Data behavior.
- [ ] DA-5R — Only if the authorized preview range check returns 200, add the Worker range fallback.
- [ ] DA-6 — Add cord dividers and the butterfly motif with reduced-motion behavior.
- [ ] DA-7 — Add icons, TrustRow fidelity, favicon assets, launch-gate closure, and deviation documentation; wait only for the missing physical logo raster where required.

## Acceptance criteria and checks

- Every behavior task records an observed RED, GREEN, and REFACTOR result with focused tests.
- Every work unit includes its tests and documentation, produces a Conventional Commit, and records the commit identity here.
- Each PR records focused verification, runtime harness evidence or an explicit N/A, rollback boundary, manual seam checklist, authored line count, and any skipped or pending check.
- Before push, run focused tests plus `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm format:check`, and `git diff --check`; run the full gate only while holding the shared lock.
- Frontend slices complete the specified 360/1024/1440 visual checks and accessibility checks before PR creation.
- No protected public-catalog or B6-owned path enters a slice diff.

## Progress and evidence

- P0 artifact audit completed read-only. The apparent proposal/design discrepancies are historical inputs explicitly superseded by the design section 9 lean amendment and authoritative `tasks.md`; no corrective artifact rewrite was required.
- P0 work-unit commit: `9138d0e0643a8cbe6aeb166b2e5a513c4a48d032` (`docs(openspec): add design-adjustments planning artifacts`), exactly one commit over remote `main` at `3ecfaf1` when created.
- P0 checks: `corepack pnpm format:check`, `corepack pnpm typecheck`, `corepack pnpm lint`, and `git diff --check origin/main...HEAD` passed. An independent verifier confirmed 13 documentation-only paths and 2,881 additions. Focused tests and runtime harness are N/A because P0 changes no executable behavior. Rollback boundary: revert `9138d0e`.
- P0 native assessment was unavailable because its response was schema-incompatible, so the returned fail-closed plan required writer verification plus an independent verifier; both passed. Native START then failed before lineage creation with `candidate-owner-preparation-failed`, performed no mutation, and was reported at `Gentleman-Programming/gentle-ai#4952` comment `6229014577`. Delivery continues under ordinary repository policy with native review unavailable for this candidate.
- P0 delivery: PR #54 passed GitHub `verify` with `size:exception` and the owner merged it to `main` as `b71ae79`; deploy correctly skipped for the PR.
- DA-1 audit completed read-only: skip rule is false; edit scope stayed limited to `tooling/media/derive.ts`, `tooling/media/derive.test.ts`, `package.json`, and `docs/media/pipeline.md`.
- DA-1 strict TDD: initial RED failed because `./derive` was missing; EXIF-oriented crop then exposed `extract_area: bad extract area`. GREEN delivered focus-aware crops, no-upscale widths, final-byte SHA-256 names, WebP/JPEG/PNG output, stale replacement cleanup, PNG-backed ICO output, the CLI recipe, and registry fragments. Work-unit commit after rebase onto merged P0: `9143ff0`.
- DA-1 independent verification initially found unsafe recipe path segments, duplicated source width for `[32,64,96]`, and incomplete ICO proof. The correction observed RED for traversal and duplicate variants, then GREEN with safe-segment validation before filesystem effects, final width deduplication, and per-entry ICO PNG/offset/dimension assertions. The second independent verification approved all findings.
- DA-1 focused checks: derive 10/10; media tooling 29/29; typecheck, lint, targeted Prettier, build, and diff check passed. The external 64×48 runtime harness produced hashed 32×24 and 64×48 variants with matching decoded dimensions and no `src/` output. Visual check is N/A because DA-1 renders no page.
- DA-1 local full-gate evidence was inconclusive: the first full test run passed 160/161 files and 1,739/1,746 tests before a Windows native `0xC0000409` crash in `drizzle-supplier-repository.db.test.ts`; its isolated rerun passed 20/20, and one full-suite retry timed out after 900 seconds while unrelated integration processes were active. No processes were killed and the shared gate lock was released. GitHub's authoritative Linux `verify` check passed in 2m31s; OpenSpec task 1.5 is closed with the local limitation recorded.
- DA-1 review budget: 271 production lines, 302 test lines, 79 pipeline-doc lines, and one package script. Production is below 400 and cohesive; tests/docs raise the slice over 400, so the declared `size:exception` path applies without splitting tests from behavior.
- DA-1 native review: INSPECT accepted the exact committed range, but START reproduced `candidate-owner-preparation-failed` before lineage creation; no review mutation or authority exists. This is the already reported Gentle AI defect `#4952`; delivery continues with native review unavailable and the completed fail-closed writer-plus-independent-verifier evidence.
- DA-2 inventory completed read-only: all required physical image sources and the loop source are present. The wording describes 15 selections while the inventory contains 14 unique source/crop selections; implementation treats hero mobile and desktop jobs separately and must preserve the exact design recipe.
- DA-2 domain strict TDD: RED observed with missing `./media`; GREEN covers registry types, rights gating, exclusion-token containment, responsive-image helpers, every section 4.1 registry rule, and provisional `DEFAULT_SHARE_IMAGE`. Focused tests pass 27/27; all domain tests pass 86/86; typecheck, targeted ESLint/Prettier, and `git diff --check` pass.
- DA-2 domain work-unit commit: `502bbbf` (`feat(site-content): add the media registry domain`). Independent verification passed every required command and found no candidate-caused issue. Native review lineage `review-cc9bfdc57a69b49a` approved and was acknowledged; its one warning was explicitly informational and opened no correction.
- DA-2 gate wiring (2.4–2.5): the aborted writer's uncommitted diff (916 lines added, 26 removed) was inspected and discarded entirely, because none of its tests matched the exact 2.4 cases. A backup was kept outside the repository, and `media.ts` stayed byte-identical to `502bbbf`.
- Owner decision 2026-10-19: the `share-image-missing` cases and rule move from 2.4/2.5 to the 2.8 data commit. With the empty registry 2.5 requires, the rule would fail three existing "valid content has no issues" tests. In 2.8 the fake defaults to one publishable share asset.
- DA-2 gate strict TDD: RED had 11 new cases failing for the expected reasons and the 29 existing ones passing. GREEN added per-path precedence (excluded token, registered stand-in, publishable media, `rights-missing`, `unpublishable-media`, `unregistered-stand-in`, `unregistered-media`) over `src` and every `srcSet` path; registry issues are appended unchanged; duplicate asset ids are reported; `isPublishedPath`, `publishedImages` and the `getAboutPage` gallery gate are in place; the module API exports the media types and `DEFAULT_SHARE_IMAGE`; the repository and the fake both start with an empty registry. Checks: `site-content` + `src/testing` 285/285; typecheck, focused ESLint and Prettier, and `git diff --check` pass.
- DA-2 gate work-unit commit: `1e359ee` (`feat(site-content): gate content images through the media registry`); production +101/−6, tests and fake +289. Production for DA-2 so far is about 488 lines (381 in `media.ts` plus 107), already past 400, so the 2.16 DA-2a/DA-2b split will apply once 2.8 lands. The independent verifier passed all 11 items and three scratch-worktree probes. Native assess returned medium/`under_budget`; it was escalated to item 2 (consent guard), and the owner granted review lineage `review-ef122f765db221fa` (risk and reliability lenses), which was approved and acknowledged (authority burned). Before review, a stop with `managed_assets_outdated` was cleared with `gentle-ai sync --agent claude-code`. Three informational warnings opened no correction: the read-time gate covers only the gallery, since required slots are CI-enforced by spec and the loop and contact photo arrive in DA-5/DA-4; a failing `src` repeated inside `srcSet` yields duplicate issues, a candidate for 2.10; and non-stand-in paths now report `unregistered-media`, which the new unregistered-path test pins.
- Parallel route (owner request 2026-10-19, "puedes lanzar agentes en paralelo para que vayan aplicando todos los cambios"). Four writers run at once, one per worktree, with disjoint edit surfaces:
  - da2: 2.6–2.9.
  - da3 (`feat/design-adjustments-hero`, from `origin/main` d0f31d9): 3.1–3.3 (`Picture`, preload, `Image.intrinsicRatio`).
  - da6 (`feat/design-adjustments-motifs`): 7.1–7.2 (motif atoms and CSS).
  - da7 (`feat/design-adjustments-polish`): 8.1–8.2 (glyphs and TrustRow).

  The hero swap (3.4–3.6), DA-4, DA-5, the DA-6 placements and the rest of DA-7 depend on the DA-2 data and on DA-3, so they wait. The da3, da6 and da7 branches get rebased onto their stack when those land.

- Parallel units committed (each RED observed, GREEN focused + `src/app/ui` green, typecheck and lint clean):
  - da3 `662d21b` (3.1–3.3): native assess medium, `under_budget`.
  - da6 `6afc38c` (7.1–7.2): the axe case uses a static composition until the 7.3/7.4 placements; the closing cord arch is shortened because the design 5.2 span is not a whole number of half-periods.
  - da7 `f4aea36` (8.1–8.2): `Claim.icon` became required; the glyphs need the 8.12/8.14 visual check.
- DA-2 data unit (2.6–2.9) committed as `d973483` by a delegated writer (context backstop). Decisions:
  - The parent fixed two writer blockers: the `media.test.ts` hash pin moved to `0bcfa824`, and the stand-in row `share-default` was renamed `share-stand-in` for the "No double bookkeeping" rule.
  - One commit instead of a separate headers commit: the `_headers` assertions live in the parity test file.
  - The independent verifier recomputed all 33 hashes and sizes and confirmed the ledger against the curation proposal; it caught a wrong hero alt ("colgada"), which was fixed.
  - Full gate under the lock: 163 files and 1817 tests, lint, typecheck and format all green.
  - Native assess was escalated to item 2 and the owner granted review, but the bound STATUS timed out pre_native twice. The owner chose "report and continue": occurrence comment on `Gentleman-Programming/gentle-ai#5422` (`6269434580`), candidate declined, STATUS re-entered (`fresh_target_ready`).
  - Production is now over 400 lines, so the 2.16 split applies: DA-2a = 2.1–2.5 (`502bbbf`..`ebd5802`), DA-2b = 2.6–2.9 (`d973483` + docs). This deviates from the written split, which put 2.6 in DA-2a where its parity test would be red without the data.
- Admin F0a and C4-B3 are tracked as separate project lanes and are not part of this feature's write scope.
- Native SDD blocker occurrence: `Gentleman-Programming/gentle-ai#5219` comment `6228677584`.

## Next step

2.10 refactor (deduplicate a `src` repeated inside `srcSet`), 2.12 runtime harness, then the DA-2a/DA-2b PRs. In parallel: rebase da3 onto the registry branch and run the 3.4–3.7 hero swap. PR #56 (DA-1) awaits owner merge.
