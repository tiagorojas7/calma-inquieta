# Front redesign

- Objective: rebuild the public front so it reads like the client mockups. That means a collage hero, varied image sizes, layered sections, more typographic voices, visible motifs and clean modern transitions, replacing the flat result of design-adjustments.
- Branch chain: stacked to `main`, one PR per work unit (`feat/front-redesign-*`). Delivery strategy: `auto-chain`. Test runner: `corepack pnpm test <path>` (strict TDD per `AGENTS.md`).

## Specs

- S1. Owner review, verbatim: "no me gusto mucho, necesito mas transiciones, mejores componentes, y las imaganes que varien de tamaño, se ve todo muy monotono, image cuadrada y texto plano, se utiliza siempre la misma tipografia y los componentes de mariposa y tejidos son muy chicos, casi inperseptibles, quuero que vuelvas analizar las imagenes de referencia guardada de la web, necesito transacciones mas limpias, modernas y el hero en movil es horrible, una imagen solitaria y despeus le sigue texto, necesito una mejora exponencial de este front actual".
- S2. Hero, owner decision verbatim: "combinemos la opcion 1, pero en movil, que la imagen este de fondo, se puede buscar unan ueva imagen en la carpte de drive para que quede mejor".
  - Option 1 is the image5 collage: 3 to 4 real photos of different sizes, overlapping, with a handwritten paper note and a botanical sprig.
  - Desktop shows the collage. Mobile shows a new photo from the Drive folder (`../CalmaInquieta-media/Materia visual Calma-Inquieta/Materia visual Calma-Inquieta`, read-only) as a full-bleed background behind the H1 and CTAs.
- S3. Typography, owner choice: "Manuscrita suave de acento".
  - A soft handwriting accent face (Caveat 600, OFL, self-hosted) for notes, highlighted phrases and some eyebrows, always 24 px or larger.
  - Cormorant Garamond gains weights 500 and 600, and the H1 becomes larger and fluid, mixing roman and italic.
- S4. Motifs, owner choice: "Ambos: ramitas + mariposa".
  - Large botanical sprigs (60 to 150 px) cross photos and section edges.
  - A large butterfly (120 to 220 px) accents the hero and the contact band.
  - The woven cord, which has no mockup counterpart, becomes a thicker divider or is retired.
- S5. Photos, owner choice: "Grado cálido unificado". The client photos are re-derived with one warm grade (balance, contrast, gentle saturation) so they read as one family. Registry, hashes and rights stay valid.
- S6. Transitions: scroll reveals (transform and opacity only), image reveals, card hover lift with a gentle image zoom, header transparent then solid on scroll, a full-screen mobile menu with staggered links, and route cross-fades. All of it under `prefers-reduced-motion: no-preference`, with no LCP or CLS regression.
- S7. Varied image system:
  - mixed aspect ratios and sizes;
  - overlapping frames and paper or torn edges;
  - a bento gallery instead of the square grid;
  - full-bleed tone bands (canvas, sand, deep clay) instead of a single container.
- S8. Constraints:
  - `AGENTS.md` dependency rules, with `ui` structural;
  - no new npm package;
  - AA contrast for text;
  - every new string in es-AR passing `findCopyViolations`;
  - the AD14 catalog files (`activity-card`, `taller-card`, `intensivo-card`, `catalog-grid`, catalog routes) need an owner check before they are edited.
- S9. Mobile hero, owner review verbatim: "la foto del hero en movil, actualmente esa foto no transmite nada, y los compoentnes no tiene mucho contraste, hay que buscar una que encaje perfecto y sume mucho contraste visual". A new Drive photo replaces the `home-hero-backdrop` stool, and the overlaid components (scrim, note, subtitle card, CTAs) gain contrast.
- S10. Brand logo, verbatim: "tambien tienes que agregar la imagen del negocio, en la carpeta de drive esta el logo sin fondo, tiene que estar en el navbar". Source: `Logo Calma Inquieta (Sin fondo).png` in the Drive folder.
- S11. Flat sections, verbatim: "la parte de quienes somos me gusto mucho, luego la de queres sumarte y demas se siente muy plano, yo agregaria alguna imagen ahi apr asumar contraste visual". The Inicio contact band ("¿Querés sumarte?") and the other flat bands after the teaser get photos.
- S12. Footer icons, verbatim: "tmabien agregaria iconos de whatssap, ig, maps al pie de pagina".
- S13. Gallery carousel, verbatim: "luego en quienes somos, en la seccio nde un viustaso, agregaria un efecto carrousel con esas imaganes, que se vayan mostrando dinamicamente". It respects `prefers-reduced-motion` and stays keyboard and screen-reader usable.
- S14. About videos, verbatim: "tambien agregaria los videos que se reporiducen automaticamente, en la parte de quienes somos, donde estan als tres imagenes". Videos autoplay muted, inline and looped, with a poster and a pause control, and respect `prefers-reduced-motion`.
- S15. Component quality, verbatim: "tambien lso ocmponentes tieje que ser de mejro calidad visual, pero leugo lo otro se ve muy bien, ajustaria bien eso al detalle".
- S16. Hero height, verbatim: "admeas el hero debe ocupar el 100% vh". The Inicio hero fills the viewport height on phones and desktop (`100svh` including the transparent header).
- Reference: `docs/client-proposal/mockups/image5.webp`, `image8`, `image9`, `image12`, `image13`; the design gap analysis in the Log (L3).

## Tasks

| ID  | Specs             | Work unit                                                                                                                                                                                                             | Route                                      | Status  | Commit               |
| --- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------- | -------------------- |
| T1  | S3, S6, S7, S8    | Foundations: fonts and tokens, fluid type, `Section` tone bands with full bleed, `Reveal` motion primitive, button and card transitions, route view transitions, header transparent to solid, full-screen mobile menu | delegated (parallel with T2)               | done    | `c67089c`            |
| T2  | S2, S5, S8        | Media: warm grade in `media:derive`, re-derived curated images, new mobile hero backdrop from Drive, registry and ledger updates                                                                                      | delegated (parallel with T1)               | done    | `54c0e0c`, `fc780cf` |
| T3  | S2, S4, S6, S7    | Hero and motifs: desktop collage with `Frame`, `PaperNote`, sprigs and big butterfly; mobile backdrop hero; dividers; preload for the new LCP                                                                         | delegated (after T1, T2)                   | done    | `d09b484`            |
| T4  | S4, S6, S7        | Pages: Quiénes somos collage intro, bento gallery, pull-quote, value discs; overlapping home teaser; Contacto sand band with bleeding photo                                                                           | delegated (after T1, T2; parallel with T3) | done    | `e9607ee`            |
| T5  | S6, S7, S8        | Catalog cards (date tile, pill, hover)                                                                                                                                                                                | pending an owner check of the AD14 files   | pending |                      |
| T6  | S10, S12          | Brand: derived logo in the navbar (registry `brand` area), WhatsApp, Instagram and Maps icons in the footer                                                                                                           | delegated (parallel)                       | pending |                      |
| T7  | S9, S11, S16, S15 | Inicio: new high-contrast mobile backdrop, stronger hero components, 100svh hero, photos in the contact band and other flat bands                                                                                     | delegated (parallel)                       | pending |                      |
| T8  | S13, S14, S15     | Quiénes somos: "Un vistazo" carousel, autoplay muted videos in the intro collage                                                                                                                                      | delegated (parallel)                       | pending |                      |
| T9  | S9, S10, S11, S14 | Media: curate and derive the new backdrop, logo, band photos and video loops, with registry and ledger rows                                                                                                           | inline, before T6–T8                       | pending |                      |

## Log

- L1 (2026-10-19). Owner request, verbatim: see S1.
- L2 (2026-10-19). Owner decisions, from four questions:
  - hero (S2), typography (S3), motifs (S4) and photos (S5);
  - the font download was authorized: Caveat 600 and Cormorant 500/600 from @fontsource 5.3.0 via jsdelivr. Caveat is 51,220 bytes, so only one weight ships.
- L3 (2026-10-19). Design gap analysis, read-only. Mockups image5–image13 are desktop-only 1672x941 canvases with no mobile and no motion spec. Root causes found:
  - the single `aspect-4/5` still in `hero-section.tsx`;
  - every heading in Cormorant 400 (`heading.tsx`);
  - an `aspect-square` gallery (`gallery-grid.tsx`);
  - a 28 px butterfly and a 24 px cord;
  - no transitions anywhere;
  - everything inside `max-w-page` (`public-page.tsx`).
- L4 (2026-10-19). Route: T1 and T2 run as parallel writers with disjoint surfaces in worktrees `CalmaInquieta-fr1` and `CalmaInquieta-fr2`. T3 and T4 follow on top of both.
- L5 (2026-10-19). T1 and T2 verified and committed. A full `media:derive` recipe run still stops at `home-loop-poster` (its PNG source is missing); this predates the redesign.
- L6 (2026-10-19). T3 and T4 delivered by parallel writers in `CalmaInquieta-fr3` and `CalmaInquieta-fr4`, each with RED observed before GREEN (the CSS-structure assertions in `styles.test.ts` were written after the visual loop set the numbers).
  - Merge: T4 rebased onto T3. The Inicio `BotanicalSprig` (named sizes sm/md/lg, variants olive/sage/wheat) is the one kept; T4 call sites now use it, its duplicate atom and test were dropped, and the Contacto butterfly uses `Butterfly size="lg"` instead of a scale wrapper.
  - Checks on the stack head: `corepack pnpm test src/app src/modules/site-content src/testing` 110 files / 1002 tests pass; typecheck and lint exit 0; format clean. The full gate is left to CI verify (owner decision, low memory).
  - Native review: the T3 assessment returned `medium`, `review_due: false` (`under_budget`).
  - Open for the owner (before L7): the about pull-quote reuses the brand caption (R14 forbids a new tagline) and stays unapproved; three intro photos also appear in the gallery; `home-hero-mobile` is registered but unused; the mobile header looked solid at the top in some screenshots; at 1024 px the collage leaves a gap at the lower left.
- L7 (2026-10-19). Owner review of the local preview, verbatim: "me gusot la mejora, agregaria un cambio, la foto del hero en movil, actualmente esa foto no transmite nada, y los compoentnes no tiene mucho contraste, hay que buscar una que encaje perfecto y sume mucho contraste visual, tambien tienes que agregar la imagen del negocio, en la carpeta de drive esta el logo sin fondo, tiene que estar en el navbar, la parte de quienes somos me gusto mucho, luego la de queres sumarte y demas se siente muy plano, yo agregaria alguna imagen ahi apr asumar contraste visual, tmabien agregaria iconos de whatssap, ig, maps al pie de pagina, luego en quienes somos, en la seccio nde un viustaso, agregaria un efecto carrousel con esas imaganes, que se vayan mostrando dinamicamente, tambien agregaria los videos que se reporiducen automaticamente, en la parte de quienes somos, donde estan als tres imagenes, tambien lso ocmponentes tieje que ser de mejro calidad visual, pero leugo lo otro se ve muy bien, ajustaria bien eso al detalle." Then: "admeas el hero debe ocupar el 100% vh". New specs S9–S16 and tasks T6–T9 on branch `feat/front-redesign-polish` (worktree `CalmaInquieta-fr5`), stacked on `feat/front-redesign-pages`.
