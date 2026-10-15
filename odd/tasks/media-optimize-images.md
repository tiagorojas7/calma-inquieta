# Media optimize images

- Feature: `media-optimize-images` (ODD, not SDD)
- Route: delegated direct, one writer. Trigger evidence: 2+ non-trivial files plus preparatory reading.
- TDD: on (source: `AGENTS.md`). Runner: `corepack pnpm test`.
- Branch: `chore/media-optimize-images`. Delivery: no push.

## Objective

A repeatable `pnpm media:optimize <inputDir> <outputDir>` that turns raw client photos into `<base>-{480,960,1600}.webp` variants (convention in `docs/design/brand-swap-guide.md`), with a manifest and a contact sheet. Originals never enter the repo.

## Scope and constraints

- `sharp` as a devDependency; code under `tooling/media/`; no upscaling; EXIF auto-orientation.
- Not run on the real client folder here. Videos are not processed.

## Tasks

- [x] T1 Install `sharp`
- [x] T2 Pure planning module (`variantWidths`, `outputBaseName`, supported inputs) with unit tests
- [x] T3 CLI `tooling/media/optimize-images.ts` with `run(input, output)` and integration test
- [x] T4 Docs note in the brand swap guide, `.gitignore` if needed

## Evidence

- T1: `sharp` 0.35.5 installed; no build script was blocked, so `pnpm.onlyBuiltDependencies` is unchanged. `require('sharp')` works on Windows.
- T2: RED was `Failed Suites 1` (the `./plan` module did not exist); GREEN was 17 passed. Commit `d93cf4f`.
- T3: RED was `Cannot find module './optimize-images'`; GREEN was 19 passed in `tooling/media`. Commit `08578d6`. A 1000 px wide oriented source gets 480 and 960 variants only (no 1600, since that would upscale).
- T4: note in `docs/design/brand-swap-guide.md`; `.gitignore` gets `media-originals/`.
- Route: delegated direct, one writer. Review tier: not assessed here (parent owns it).
