# Proposal: Design Adjustments (curated client media, art-directed hero, ambient loop, cord and butterfly motifs)

Project: calmainquieta | Store: hybrid | Phase: sdd-propose | Date: 2026-10-16 | Revision 1
Inputs: exploration `openspec/changes/design-adjustments/explore.md` (Engram `sdd/design-adjustments/explore` #378), owner direction (Engram `calmainquieta/front-direction` #375, `calmainquieta/media-plan` #372, `calmainquieta/design-adjustments-plan` #321), the approved curation v2 (`CalmaInquieta-media/curation/proposal.md`, approved 2026-10-15), the owner consent decision relayed on 2026-10-16, `openspec/config.yaml`, `docs/client-proposal/proposal.md` (baseline), main specs `openspec/specs/{home-page,design-system,site-content,seo-foundation,contact-page,about-page}/spec.md`, the in-flight change-4 planning (`openspec/changes/public-catalog/{proposal,specs/*}`), and code on `main` (`src/app/ui/**`, `src/modules/site-content/**`, `src/app/seo/meta.ts`).

> **In one paragraph.** The public site still runs on low-resolution Instagram stand-ins and a desktop-first hero collage that downloads hidden images on phones. This change replaces them with the client's curated photos through a **media registry** that records variants and image rights, rebuilds the Inicio hero **mobile-first** (one art-directed 4:5 photo on phones, a split layout on desktop with no text over the photo), adds one short **self-hosted muted loop**, and gives the site two signature details: a **paper-cord ("encordado") divider** between sections and a **butterfly** on Inicio. Everything respects `prefers-reduced-motion` and Save-Data and stays light on mobile. It ships as six layered slices (S0 to S5), each under 400 authored lines, and it stays out of the catalog files that change 4 is still editing.

---

## Decisions at a glance

### Owner decisions (decided)

| # | Decision | Date |
|---|---|---|
| OD-1 | Mobile-first. Photos are chosen strategically; the curation v2 picks are approved, including `img-20260530-wa0019` for Contacto and `img-20260411-wa0013` for the Quiénes somos teaser. | 2026-10-15 |
| OD-2 | Desktop hero: **split layout**, photo on one side, title and CTAs on the other, no text over the photo. Mobile hero: **one art-directed 4:5 photo**. | 2026-10-15 |
| OD-3 | Video hosting is mixed: short muted self-hosted loops for the hero and sections; YouTube (the existing `VideoFacade`) for long videos and testimonials. | 2026-10-15 |
| OD-4 | Front details: a paper-cord "encordado" motif as a section divider, and a butterfly flying somewhere. Both respect `prefers-reduced-motion` and stay light on mobile. | 2026-10-15 |
| OD-5 | The woman in `img-20260808-130700502-hdr-portrait` must not appear anywhere (she is not the owner). | 2026-10-15 |
| OD-6 | **Face photos may be used.** The studio owner (the client) knows about and approves the use of photos with recognizable people: `img-20261015-wa0030`, `img-20261015-wa0018`, `img-20260926-144641667-hdr`, `img-20260801-182047855-hdr`. They are recorded as `consent: granted` (source: studio owner via project owner, 2026-10-16). The consent field and the content gate stay, so future photos default to `pending`. `img-20261015-wa0030` is now eligible for the hero and gallery slots where the curation proposed it. This replaces the earlier face-free default. | 2026-10-16 |
| OD-7 | Exclusions stay: photos and videos of minors (`img-20260926-153632786-hdr`, video v18 `VID_20260717_155248707`) and the portrait in OD-5. | 2026-10-16 |

### Proposed defaults (the owner can still change them)

| # | Default | Why |
|---|---|---|
| PD-1 | The hero loop (v50 `VID_20261014_185300580`, first 6 s, about 1.2 MB, 720p H.264, no audio track) ships in this change from `public/media/video/`. It uses `preload="none"`, a poster, and IntersectionObserver play and pause. It never autoplays under reduced motion or Save-Data, where it shows the poster only. | Gives the hero life without R2 (runbook R1); one small file fits static assets. |
| PD-2 | Cord divider: a static inline SVG between the main Inicio sections, with a subtle CSS draw-in only under `prefers-reduced-motion: no-preference`. No JavaScript. | Cheapest way to carry the brand craft; zero layout shift. |
| PD-3 | Butterfly: one decorative flight on Inicio, in the hero area. CSS and SVG only, `aria-hidden`. It also runs on mobile, at a small size. Under reduced motion it is static. | Meets OD-4 at near-zero weight. |
| PD-4 | Testimonials stay layout only (the existing hidden `TestimonialsSection`) until testimonial material and written consent exist. | No material yet. |
| PD-5 | The Open Graph image is a JPEG 1200x630 crop of `img-20260819-174607732-hdr`. | Some crawlers still mishandle WebP for `og:image`. |
| PD-6 | Hands-only photos (`img-20261007-194043183-hdr`, `img-20260411-wa0106`, `img-20261015-wa0029`, and the catalog picks) are recorded as `people: hands`, `consent: not-required`, and are publishable. The curation suggests confirming them anyway; flipping one to `pending` hides it through the gate. | No identifiable person; keeps the gallery complete. |

### Open product decisions (returned to the orchestrator; ask one at a time)

| # | Question | Options | Recommendation (not decided) | Blocks |
|---|---|---|---|---|
| Q1 | **Hero composition with the loop.** OD-2 fixes a single 4:5 photo on mobile and a split layout on desktop, but not where the loop lives, nor whether the desktop photo column holds one photo or a small collage (now that `img-20261015-wa0030` is eligible). | (a) Desktop column: main photo `img-20260819-174607732-hdr` plus one secondary tile that holds the loop. Mobile: the still photo is the hero; the loop sits in a 4:5 tile right after the hero text. (b) Desktop column: main photo plus two collage tiles (`img-20261007-194043183-hdr` square, `img-20261015-wa0030` 4:3); the loop moves to the section after the hero. (c) The loop replaces the hero still once ready, with the still as poster (the first frame differs, so the swap is visible). | (a): the still photo stays the LCP element on every viewport and the loop never competes with it | S1 hero design detail, S3 placement |
| Q2 | **Favicon.** The favicon stand-in comes from the Instagram profile picture. The client batch has two raster logos (1563x1563). | (a) Regenerate the favicon set from `logo-calma-inquieta-sin-fondo` in S5 and retire the stand-in. (b) Wait for vector logo files. | (a) if the owner accepts a raster source | S5 scope (small) |
| Q3 | **Delivery shape (process, for the orchestrator).** The session strategy is `single-pr` with a 400-line review budget, but the whole change forecasts about 1,400 to 1,900 authored lines. | (a) One PR per slice, merged to `main` in order (each under 400). (b) One PR for the whole change with a maintainer-approved `size:exception`. | (a) | `sdd-tasks` guard lines, apply |

---

## Intent

| Question | Answer |
|---|---|
| Problem | Every photo on the public site is a stand-in: three low-resolution Instagram images in the hero collage, two in the About gallery, an SVG teaser that is declared but never rendered, and a share image made from the profile picture. The hero collage was built desktop-first: images two and three are hidden below `md` but still load eagerly, so phones pay for pictures they never show. The site has no self-hosted video, no art direction (`<img>` only, no `<picture>`), a TrustRow that ignores each claim's icon, and nothing of the studio's own craft in the layout. The launch gate (`listStandInAssets()`) cannot move until real media replaces the stand-ins. |
| Why now | The client's material arrived (181 photos, 54 videos), the owner approved the curation v2 on 2026-10-15 and cleared the face photos on 2026-10-16. The owner says photos matter most and the small details make the difference. |
| Who it helps | Visitors on phones, who get a fast, sharp first screen. The studio, whose real pieces, space and people replace generic stand-ins. The launch, which needs the stand-in count to fall. |
| Success looks like | On a 360 px phone, Inicio paints one sharp 4:5 photo of the woven piece as its LCP element, with no layout shift and no hidden image downloads. On desktop the photo sits beside the title. The cord divider and the butterfly appear and stay still under reduced motion. The loop plays only when visible and never under reduced motion or Save-Data. The About gallery, teaser, Contacto and share image use curated photos, and every photo is in the media registry with its rights recorded. |

---

## Scope

### In Scope

| # | Deliverable | Slice |
|---|---|---|
| 1 | **Media registry** in `site-content`: each curated asset with id, source photo id, area, paths per variant (widths, format), intrinsic size, alt text, `people` (`none`, `hands`, `faces`), `consent` (`not-required`, `granted`, `pending`) and consent source. A **rights ledger** keyed by source id records OD-6 (four `granted` face photos) and OD-7 (excluded sources). A **content gate** exposes only publishable assets (`people` is `none` or `hands`, or consent is `granted`). New entries default to `pending`. Tests prove that excluded sources can never be registered and that files and entries match one to one. | S0 |
| 2 | **Curated binaries** copied from the media workspace into `public/media/<area>/` (pre-generated WebP variants and crops; no build-time image processing in the repo). | S0 |
| 3 | **Art direction**: a `Picture` atom (or an additive extension of `Image`; design decides) with `sources[]` per media query, `srcset` and `sizes`, and width and height per source so every breakpoint reserves its box. `ImageRef` grows additively (optional fields only). | S1 |
| 4 | **Mobile-first hero**: one eager, high-priority 4:5 image on phones; the split layout on desktop per OD-2 and Q1; a route-level preload with `imagesrcset`; the hidden eager images removed. | S1 |
| 5 | **Content swap**: hero, About gallery (10 photos in the curation order; reserves listed but not shipped), OG JPEG (PD-5). The retired stand-ins (`hero-1..3`, `gallery-02`, `share-default`) lose their rows and files; pinned tests are updated. | S2 |
| 6 | **`VideoLoop` molecule** and the hero loop per PD-1 and Q1: muted, `playsInline`, `loop`, `preload="none"`, poster, IntersectionObserver play and pause, reduced motion and Save-Data checked in JavaScript (poster only, no video request), `aria-hidden` with no controls because it carries no information. | S3 |
| 7 | **Cord divider** (PD-2) and **butterfly** (PD-3): inline SVG with `currentColor` and tokens, CSS keyframes only under `no-preference`, `aria-hidden`. | S4 |
| 8 | **Fidelity polish**: new Icon paths (hands, leaf, heart, group) and the TrustRow fix (render `claim.icon`); the Quiénes somos teaser renders `img-20260411-wa0013`; Contacto shows `img-20260530-wa0019`; the `about-teaser` stand-in is retired; deviation-register rows; favicon per Q2. | S5 |

### Out of Scope

| Item | Where it goes |
|---|---|
| Section loops on catalog pages (v37, v43, v53) | After C4-F2 and C4-F4 merge (follow-up) |
| Talleres and intensivos card photos (`img-20260325-wa0013`, `img-20261015-wa0029`), the catalog `fallbackImage` swap, `ActivityCard`, `taller-card`, `intensivo-card`, catalog mappers and `catalog.ts` | Follow-up after C4-F2, C4-F4, C4-B4 and C4-B5 merge |
| Testimonial media (photo or video testimonials) | Later, once material and written consent exist (PD-4) |
| R2-hosted loops, more than one self-hosted loop | After change-3 B2b and owner runbook R1 |
| Eventos privados photos (`img-20261015-wa0018`, `img-20260926-144641667-hdr`) | Change 7 (the page stays Próximamente). Their consent is recorded now. |
| Brand typefaces (the four font stand-ins) | When the client confirms the typefaces |
| Merging the `media:optimize` script and a `sharp` devDependency | Its own chore branch (`chore/media-optimize-images`); not needed here |
| Anything in change-3 admin or the change-4 catalog adapters | Changes 3 and 4 |
| Visual regression baselines, automated performance budgets in CI | Not planned (manual Lighthouse runs in verify) |

---

## Capabilities

Existing main specs: `about-page`, `contact-page`, `design-system`, `home-page`, `public-layout`, `seo-foundation`, `site-content`. Change 4 (`public-catalog`) is not archived and also has deltas for `home-page`, `public-layout` and `seo-foundation`; see "Collision avoidance".

### New Capabilities

- `media-registry`: the curated media registry, the rights ledger (people, consent, source, exclusions), the content gate, the default `pending` for new entries, file and entry parity, and the image-kind launch-gate count.
- `ambient-video`: self-hosted decorative loops: muted, no audio track, size budget, `preload="none"`, poster, play only while visible, never under reduced motion or Save-Data, hidden from assistive technology, never the LCP element.
- `decorative-motifs`: the cord divider and the butterfly: placement on Inicio, decorative semantics, CSS-only motion under `no-preference`, static under `reduce`, mobile size limits, no layout shift.

### Modified Capabilities

- `design-system`: "Image atom" gains art direction (sources per breakpoint, `srcset` and `sizes`, a reserved box per breakpoint, at most one high-priority image per page). "Component inventory and layering" adds `Picture` (if separate), `VideoLoop`, `CordDivider` and `Butterfly`. "Accessibility baseline" extends reduced motion from CSS to JavaScript-driven playback and video.
- `home-page`: "Hero" changes from a collage of stand-in slots to the mobile 4:5 photo and the desktop split layout from the media registry. "Trust row" renders each claim's own icon. "Quiénes somos teaser and contact band" adds the teaser image. The section order gains the cord dividers (by reference to `decorative-motifs`). Change 4's requirements in this spec are not touched.
- `contact-page`: "Page contents" adds a photo of the space; the no-form, no-embed rule is unchanged.
- `site-content`: "Stand-in asset registry" coexists with the media registry: a page image must be either a registered stand-in or a publishable media asset, and the launch gate counts image stand-ins separately from fonts.
- `seo-foundation`: "Open Graph and Twitter cards" takes `og:image` from the registered share image (media registry) instead of the stand-in. Change 4 modifies the same requirement (activity cover), so this delta must be written against whichever text archives first.
- `about-page`: no requirement change expected; the gallery already renders images from `site-content`.

---

## Approach

### Layering (unchanged rules)

- Registry types and the gate live in `src/modules/site-content/domain` (pure), the registry data in `infrastructure/content`, and the readers in `application`, exposed through `site-content/index.ts`.
- `Picture`, `VideoLoop`, `CordDivider` and `Butterfly` live in `src/app/ui` with structural props and React only. Route modules map registry entries to props.
- No new runtime packages. Binaries are produced outside the repo (curation workspace, ffmpeg) and committed as outputs.

### Slices

| Slice | Content | Needs | Authored lines (forecast) |
|---|---|---|---|
| **S0** | Media registry types, rights ledger (OD-6, OD-7, PD-6), content gate, parity and exclusion tests, curated binaries (about 6 to 8 MB, excluded from the line count) | — | 150-220 |
| **S1** | `Picture` (or `Image` extension), `ImageRef` additive, mobile-first hero and desktop split, route preload, no hidden eager images | S0, Q1 | 300-380 |
| **S2** | Hero, gallery and OG content swap, stand-in retirement, pinned tests (`stand-in-assets.test`, `repository-content.test`, `hero.ui.test`, `root.test`, `coming-soon.test`, `content-rules.test`) | S1 | 250-350 |
| **S3** | `VideoLoop`, hero loop and poster binaries, reduced-motion and Save-Data handling | S1, Q1 | 220-300 |
| **S4** | `CordDivider`, `Butterfly`, keyframes in the stylesheet | — (independent) | 180-260 |
| **S5** | Icons, TrustRow fix, teaser image, Contacto photo, `about-teaser` retirement, deviation-register rows, favicon (Q2) | S0; rows rebased after C4-F4 | 300-400 |
| **Total** | 6 PRs | | **~1,400-1,910** |

Split rules if a slice passes 400 lines during apply: S1 moves the route preload to S1b; S5 moves Contacto and the favicon to S5b.

### Collision avoidance with change 4 (in flight: C4-F2 talleres pages, C4-B5 real media lookup, C4-F4, C4-B4)

- **Files not touched until those merge:** `src/app/ui/molecules/{activity-card,taller-card,intensivo-card}.tsx`, `src/app/ui/organisms/catalog-grid.tsx`, `src/app/ui/templates/catalog-listing-page.tsx`, the catalog loaders and mappers, `src/modules/site-content/infrastructure/content/catalog.ts` (`fallbackImage`), the `workshops` and `media` modules, `src/app/seo/{sitemap,json-ld}.ts`.
- **Additive-only shared surfaces:** `Image` and `ImageRef` get optional props only, so change-4 components compile unchanged. `src/app/seo/meta.ts` changes only the `SHARE_IMAGE_PATH` value.
- **Stand-in kept:** `gallery-01` stays registered while it is the catalog fallback; its retirement is part of the post-change-4 follow-up.
- **Deviation register:** S5 appends its rows at the end and rebases after C4-F4, which also edits that file.
- **Spec deltas:** `home-page` deltas touch disjoint requirements (Hero, Trust row, teaser vs. change 4's showcase, intensivos and no-invented-facts). `seo-foundation` "Open Graph" overlaps; recommended order: archive change 4 first and write this delta against its text.

### Launch gate

After S5, `listStandInAssets()` keeps only:
- `gallery-01` (catalog fallback, retired in the post-change-4 follow-up);
- `favicon`, unless Q2 is (a);
- the four font stand-ins (brand typefaces not confirmed, out of this change's material).

A literal count of 0 is therefore not reachable by this change alone. The success criterion is "zero image stand-ins except the catalog fallback still needed", and the gate should count image stand-ins separately from fonts (site-content delta).

### Baseline deviations (scope adjustments to `docs/client-proposal/proposal.md`)

| # | Baseline says | This change does | Source |
|---|---|---|---|
| D1 | "Rendimiento básico" | Adds explicit mobile targets (LCP, CLS 0, no hidden downloads) | OD-1 |
| D2 | Quiénes somos: "videos, fotos y trabajos realizados" | Curated gallery of 10; long videos stay on YouTube (`VideoFacade`) | OD-3 |
| D3 | Nothing about decorative motion or self-hosted loops | Adds the cord divider, the butterfly and one hero loop: owner-requested additions | OD-3, OD-4 |
| D4 | Excludes "producción profesional de fotos o videos" | Uses only the client's own material; no new production | Media plan #372 |
| D5 | Mockups show a hero collage with text overlay | Desktop split layout, no text over the photo; mobile single photo | OD-2 |

### `config.yaml` open-decision checklist

| Decision | Status for this change |
|---|---|
| Tech stack | Settled (ADR-001). No new runtime package. |
| UI copy language | Settled: es-AR, voseo, "nosotras". New alt texts follow it. |
| Email provider | Not used. |
| Hosting and domain | `workers.dev` preview; one loop in static assets; range-request support for video verified in design. |
| Version control | Settled; PR shape per Q3. |
| Mockup asset handling | Mockups stay visual references; only client material ships. |

---

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/modules/site-content/domain/**` (new media and rights types, `content-rules.ts`, `stand-in.ts`) | New / Modified | Registry types, rights ledger, content gate, image-kind gate count |
| `src/modules/site-content/infrastructure/content/{media-assets,home,about,contact,stand-in-assets}.ts` | New / Modified | Registry data, content swap, stand-in rows removed |
| `src/modules/site-content/application/site-content.ts`, `index.ts` | Modified | Readers for publishable media |
| `public/media/<area>/**`, `public/media/video/**` | New | Curated WebP variants, OG JPEG, loop and poster |
| `public/media/stand-ins/**` | Removed (partly) | `hero-1..3`, `gallery-02`, `share-default`, `about-teaser` (and `favicon` per Q2) |
| `src/app/ui/atoms/{image,icon,divider}.tsx` (+ new `picture`, `cord-divider`, `butterfly`) | New / Modified | Art direction, icons, motifs |
| `src/app/ui/molecules/{trust-item,video-loop}.tsx` | New / Modified | TrustRow icon, loop |
| `src/app/ui/organisms/{hero-section,hero-collage,trust-row,about-teaser,gallery-grid}.tsx` | Modified | Hero layout, TrustRow fix, teaser image |
| `src/app/routes/{home,about,contact}.tsx`, `src/app/root.tsx`, `src/app/seo/meta.ts`, `src/app/app.css` | Modified | Loaders, preload, favicon, share image value, keyframes |
| `docs/design/deviation-register.md` | Modified | D1-D5 rows (S5, after C4-F4) |

---

## Dependencies

- **Media workspace outputs before S0 and S1:** the art-directed crops at the widths the design picks (the existing `*-m45` and `*-d169` crops exist at one size each), the OG JPEG, the 6 s loop encode and its poster. They are produced outside the repo.
- **Change 4:** the follow-up items wait for C4-F2, C4-F4, C4-B4 and C4-B5. Nothing in S0 to S5 waits for them.
- **Design verifications:** HTTP range requests for MP4 on Workers static assets (Safari needs them); `<link rel="preload" imagesrcset>` through React Router route `links`; `navigator.connection.saveData` availability and its fallback; whether inline SVG coordinates pass the token literal scan.

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Mobile LCP regresses (large hero, preload missing, loop or poster competing) | Medium | One eager high-priority image per page; preload with `imagesrcset`; the loop is `preload="none"` and never the LCP element (Q1 recommendation); Lighthouse mobile run in verify |
| CLS from `<picture>` sources with different aspect ratios | Medium | Width and height on every `<source>` plus a CSS aspect ratio per breakpoint; a component test asserts both |
| Reduced motion honored in CSS but not in JS or video | Medium | `VideoLoop` checks `matchMedia` and Save-Data before any `play()`; tests with mocked media queries; motifs animate only inside `@media (prefers-reduced-motion: no-preference)` |
| Collision with change-4 slices in flight | Medium | File list above is off-limits; additive-only shared props; deviation rows rebased last; `seo-foundation` delta ordered after change 4 archives |
| A photo with a person ships without a recorded right, or an excluded source slips in | Low (high impact) | Rights ledger plus gate; exclusion test over source ids; new entries default to `pending` |
| Low-resolution sources (144 of 181 photos stop at 960 px; `img-20260411-wa0106` stops at 480 px) look soft on desktop or in the lightbox | Medium | `sizes` caps display width; the lightbox shows at most the largest variant; reserves exist in the curation |
| Binary weight in git history (about 7 to 9 MB) | High (low impact) | Only shipped variants are committed; no source originals; R2 for any further video |
| Pinned tests break across slices | High (low impact) | S2 owns all pinned-test updates; each slice keeps `pnpm test` green |
| No automated performance gate | Medium | Manual Lighthouse runs at 360 px and 1280 px recorded in the verify report |
| The `single-pr` strategy conflicts with the 400-line budget | High | Q3: one PR per slice, or an approved `size:exception` |

---

## Rollback Plan

Each slice is one PR; revert with `git revert <merge-commit>` on `main`, newest first.

| Slice | Revert effect |
|---|---|
| S0 | Removes the registry and binaries. Revert S1, S2, S3 and S5 first, because they read the registry. |
| S1 | Restores `HeroCollage` and the `<img>`-only atom; the additive `ImageRef` fields disappear with it. Revert S2 and S3 first. |
| S2 | Restores the stand-in rows and files (the revert brings the binaries back) and the pinned tests. |
| S3 | Removes `VideoLoop` and the loop; the hero keeps its still photo. |
| S4 | Removes the motifs; `Divider` stays the `hr`. Independent of the others. |
| S5 | Restores the `arrow` icon in TrustRow, the text-only teaser and Contacto without a photo, and the `about-teaser` and favicon stand-ins. |

Emergency: `wrangler rollback` (owner credentials), then the revert. The preview is private and unindexed, so no public cleanup is needed. Git history keeps reverted binaries; that is accepted.

---

## Success Criteria

- [ ] On `/` at 360 px (Lighthouse mobile, default throttling, built site), LCP is at most 2.5 s and the LCP element is the hero still photo.
- [ ] CLS is 0 on `/`, `/quienes-somos` and `/contacto` at 360 px and at 1280 px.
- [ ] At 360 px no image outside the viewport loads eagerly, and no hidden image is requested (network panel check recorded in verify).
- [ ] Every new or changed component and route test runs axe with zero violations.
- [ ] Under `prefers-reduced-motion: reduce`: the cord divider and the butterfly do not animate (CSS), `VideoLoop` never calls `play()` (JS), and no video bytes are requested (poster only). The same holds with Save-Data on. Each is proved by a test.
- [ ] The hero loop is muted, has no audio track, uses `preload="none"`, plays only while visible, and weighs at most 1.5 MB.
- [ ] No asset from `img-20260808-130700502-hdr-portrait`, `img-20260926-153632786-hdr` or video v18 can be registered (test). A `pending` asset never renders (test). The four face photos render where placed, with `consent: granted` and their source recorded.
- [ ] Every file under `public/media/` outside `stand-ins/` has exactly one registry entry and every entry has its files (test).
- [ ] Image stand-ins remaining after S5: only `gallery-01` (catalog fallback), plus `favicon` unless Q2 is (a). Fonts are reported separately.
- [ ] No diff touches the change-4 files listed under "Collision avoidance" (checked per PR).
- [ ] Each PR stays at or under 400 authored lines excluding binaries, or carries an approved `size:exception`.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` and `pnpm build` pass on every PR; coverage on new `domain` and `application` code stays at 90 % or more.
