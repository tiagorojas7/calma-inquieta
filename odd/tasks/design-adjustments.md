# Design adjustments

- Feature: `design-adjustments` (ODD/OpenSpec continuation; migrated from SDD by explicit owner decision on 2026-10-17).
- Documentary authority: `openspec/changes/design-adjustments/{proposal.md,explore.md,design.md,tasks.md,specs/**}`. The lean-delivery amendment in design section 9 and `tasks.md` govern slicing.
- Branch chain: stacked-to-main, one PR per slice. Current branch: `docs/design-adjustments-planning`.
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
- [ ] DA-1 — Add the minimal crop/hash/JPEG/ICO derive tooling with strict RED/GREEN/REFACTOR evidence and pipeline documentation.
- [ ] DA-2 — Add the media registry, rights ledger, validation, curated responsive assets, parity tests, and immutable cache rules; apply the declared DA-2a/DA-2b split if production exceeds 400 lines.
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
- P0 delivery: branch `docs/design-adjustments-planning` pushed; PR #54 opened to `main` with `size:exception`; GitHub `verify` completed successfully and deploy correctly skipped for the PR. Owner merge remains pending under OpenSpec task 0.3.
- DA-1 audit completed read-only: skip rule is false; expected edit surfaces are `tooling/media/derive.ts`, `tooling/media/derive.test.ts`, `package.json`, and `docs/media/pipeline.md`.
- DA-2 inventory completed read-only: all required physical image sources and the loop source are present. The wording describes 15 selections while the inventory contains 14 unique source/crop selections; implementation treats hero mobile and desktop jobs separately and must preserve the exact design recipe.
- Admin F0a and C4-B3 are tracked as separate project lanes and are not part of this feature's write scope.
- Native SDD blocker occurrence: `Gentleman-Programming/gentle-ai#5219` comment `6228677584`.

## Next step

Create an isolated DA-1 worktree stacked on the current P0 branch head and delegate its strict-TDD implementation while the owner reviews PR #54.
