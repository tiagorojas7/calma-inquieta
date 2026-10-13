# Public layout pass

Branch: `feat/ds-layout-pass` (from `origin/main` 31e7550). Base for line counts: 31e7550.

## Objective

Give the public pages their structural layout: page container, side gutters, section rhythm, a two-column hero on `lg+`, a skip link that is hidden until focused, and real studio photos in place of the abstract SVG stand-ins.

## Problem (owner, real browser, about 1900 px wide on `/`)

- No `max-w-page` / `mx-auto`, no `px-gutter`, no `py-section`. Content touches the left edge. The header has no padding.
- `HeroSection` stacks everything without spacing: the CTAs overlap the subtitle; the collage sits under the text instead of in a right column on `lg+`.
- The hero title renders "concalmay": the content has `lead` and `trail` without the spaces around the italic accent, and the route composes `{lead}<em>{accent}</em>{trail}`.
- The "Saltar al contenido" skip link is always visible.
- The same missing structure in Inicio sections, Quiénes somos, Contacto, footer, coming-soon and error templates, and the mobile nav panel.

## Scope

- `src/app/**` (organisms, templates, route composition, class strings, tests).
- `src/modules/site-content/**`: stand-in manifest and image content only (owner-authorized exception for this slice).
- `public/media/stand-ins/**` and fixtures that name the old SVG paths.
- Out of scope: platform, composition, workers, other modules, admin UI, new copy, new components beyond layout wrappers.

## Constraints

- Hexagonal rules unchanged (`pnpm lint` boundaries). UI stays presentational.
- Mobile first; desktop breakpoint `lg` (1024 px).
- Tokens: `py-section`, `px-gutter`, `max-w-page`.
- Every existing a11y test stays green (axe, landmarks, heading order, focus management, `inert`).
- Photos stay registered as stand-ins (`listStandInAssets()` lists them; launch gate still forces replacement).
- Only focused tests; typecheck and lint before each commit. The parent runs the gate and takes screenshots.
- No push, PR, fetch, rebase, stash, reset, branch switching.
- ODD size heuristic: about 400 authored lines of production code; advisory only.

## TDD

Strict (AGENTS.md). Runner: `corepack pnpm test <path>`. Tailwind class layout that jsdom cannot observe gets no fake test; this is stated per task.

## Tasks

- [ ] T1 Container, gutters, section rhythm, header and footer. Visual-only except landmark wrappers.
- [ ] T2 Hero two columns on `lg+`, title spaces, CTA spacing, skip link hidden until focus. RED/GREEN for title text and skip link classes.
- [ ] T3 Inicio sections (trust row, activity showcase, upcoming list, about teaser, testimonials, contact band). Visual-only.
- [ ] T4 Quiénes somos, Contacto, coming-soon, error page, mobile nav panel. Visual-only.
- [ ] T5 Photo stand-ins (hero and gallery). RED/GREEN for manifest, files and dimensions.

## Route per task

All tasks: delegated direct writer (this worker) executes inline; the work is class-string edits and one content swap, one writer, no parallel writers. Trigger evidence: writer trigger fired for the slice and was satisfied by this single bounded writer.

## Acceptance criteria

- Page content is centered in a `max-w-page` container with `px-gutter`; sections breathe with `py-section`.
- Hero: text left, collage right from `lg`; stacked on mobile; CTAs do not overlap the subtitle.
- Hero title text content reads "Un espacio para crear con calma y un poquito de inquietud".
- Skip link has `sr-only` and `focus:not-sr-only` plus a visible focused style.
- Stand-in manifest points at existing JPGs with real dimensions; photos are real studio photos with Spanish alt text.
- Typecheck, lint and the focused tests are green.

## Evidence

(filled per task)
