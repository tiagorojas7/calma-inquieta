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

- [x] T1 Container, gutters, section rhythm, header and footer. Visual-only except landmark wrappers. Commit 74754d6.
- [x] T2 Hero two columns on `lg+`, title spaces, CTA spacing, skip link hidden until focus. RED/GREEN for title text and skip link classes. Commit see git log (fix(home)).
- [x] T3 Inicio sections (trust row, activity showcase, upcoming list, about teaser, testimonials, contact band) plus icon sizing. Visual-only except the Icon classes.
- [x] T4 Quiénes somos, Contacto, coming-soon, error page, mobile nav panel. Visual-only.
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

- T1: RED `public-page.ui.test.tsx > centers the header, main and footer in the page container with gutters` failed (1 failed | 3 passed). GREEN after adding `mx-auto max-w-page px-gutter` on the header inner div, `main`, and footer inner div (11 passed across public-page, site-header, site-footer tests). Header and footer get a `bg-sand-200` band (design token note: sand-200 = header, footer). Class layout itself is not observable in jsdom; only the container classes are asserted. typecheck 0, lint 0.
- T2: RED `home.ui.test.tsx > keeps the spaces around the italic accent in the hero title`: `Expected "Un espacio para crear con calma y un poquito de inquietud"`, `Received "Un espacio para crear concalmay un poquito de inquietud"`; RED `small-atoms.ui.test.tsx` (SkipLink missing `sr-only`, `focus:not-sr-only`). GREEN: 7 passed (home, small-atoms, hero). Cause: content has `lead`/`trail` without the spaces; fixed in the route composition (trimEnd lead, one space, em, one space + trimStart trail), so content that already carries spaces does not double them (second test). Two-column hero (`lg:grid-cols-2`) and CTA spacing are class-only: visual, no fake test. Built CSS check: compiled `app.css` with `@tailwindcss/node` for `focus:not-sr-only`, `focus:fixed`, `focus:bg-canvas`, `lg:grid-cols-2`, `md:row-span-2`, `max-md:hidden`: all generated.
- T3: Found `Icon` rendered a bare `<svg>` with no size or stroke (it would fill its container in a browser). RED `icon.ui.test.tsx > sizes and strokes every icon...` failed on the old file (1 failed | 11 passed), GREEN with `size-6 fill-none stroke-current` plus round strokes (12 passed). Section rhythm (`py-section`), the Inicio grids (trust row 3 columns, activity cards `md:grid-cols-3`, monthly 2/3 + upcoming 1/3 pairing on `lg`, testimonials 3 columns), cards, empty state and contact band are class-only: visual, no fake test. `corepack pnpm test src/app/ui src/app/routes` 191 passed. typecheck 0, lint 0.
- T4: Class-only changes (section rhythm, values 4-column grid, FAQ and history `max-w-prose`, gallery thumbnails as a square-cropped grid, lightbox dialog sizing, video facade aspect and centered play icon, contact two-column items, coming-soon and error `py-section`, redundant `px-6` removed because `main` already has gutters). jsdom cannot observe layout, so no fake tests; the existing suites guard behavior: `corepack pnpm test src/app` 219 passed (axe, landmarks, heading order, focus management, `inert`). The mobile nav panel already carried `px-gutter py-24` and a `fixed inset-0` overlay; unchanged. typecheck 0, lint 0.
