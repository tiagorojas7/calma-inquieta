# Design: Design Adjustments (curated client media, art-directed hero, ambient loop, cord and butterfly motifs)

Change: design-adjustments | Project: calmainquieta | Store: hybrid | Phase: sdd-design | Revision 2 (corrective pass after the fresh-context validation, items N4-N11) | Date: 2026-10-16
Inputs: `proposal.md` (revision 1, Engram #380), `explore.md` (Engram #378), owner decisions relayed on 2026-10-16 (Q1, Q2, Q3, OD-6), `AGENTS.md`, `package.json`, `wrangler.jsonc`, `workers/app.ts`, `public/_headers`, `src/app/root.tsx`, `src/app/seo/meta.ts`, `src/app/routes/{home,about,contact}.tsx`, `src/app/ui/**` (atoms `image`, `icon`, `small-atoms`; molecules `contact-item`, `video-facade`; organisms `hero-section`, `hero-collage`, `trust-row`, `about-teaser`, `gallery-grid`; `styles/{app,tokens}.css`; `styles.test.ts`), `src/modules/site-content/**`, `src/testing/{fakes,fixtures}/**`, the archived change-2 design (DS3, DS12, DS13) and the change-4 design and tasks (`openspec/changes/public-catalog/{design,tasks}.md`), the media workspace (`CalmaInquieta-media/curation/proposal.md` v2, `optimized/manifest.json`), the media tool worktree (`CalmaInquieta-media-tool/tooling/media/{plan,optimize-images}.ts`), and the installed packages (`react-router` 8.4.0, `react-dom` 19.3.0, `miniflare` asset worker).

> **Design in one paragraph.** Curated client media enters the site through a **media registry** in `site-content`: pure types, the publishability gate and validation in `domain/media.ts`; the asset list and a **rights ledger** keyed by source photo in `infrastructure/content/`. Every published file lives under `public/media/<area>/` with a **content hash in its name**, so `/media/<area>/*` can be cached as `immutable`; a parity test ties files, registry entries, hashes, dimensions and byte budgets together. Images are produced by a recipe-driven `pnpm media:derive` command that extends the `media:optimize` tooling (sharp); the loop is encoded with documented ffmpeg commands. `ImageRef` grows by one optional field (`srcSet`). A new `Picture` atom renders art direction (`<source media>` with `width`/`height` per source, per-breakpoint aspect classes), and the hero becomes **mobile-first**: on phones one 4:5 still photo is the first element and the LCP; on desktop a split layout with the 3:4 still and a small overlapping loop tile. The hero preload is emitted through the route **`meta`** function (React Router 8.4 `links` cannot read loader data), as two `<link rel="preload" imagesrcset>` with mutually exclusive `media`. A `VideoLoop` molecule renders only a lazy poster on the server and mounts the `<video>` after hydration, only when motion is allowed, Save-Data is off and the tile is visible; it has a pause control (WCAG 2.2.2). A `CordDivider` (two twined strands, scroll-linked draw-in) and a `Butterfly` (one 4.5 s flight to a perch on the hero photo) are inline SVG with CSS motion only under `prefers-reduced-motion: no-preference`. The share image is read from the registry at request time (`getShareImage()`), so a missing or unpublishable share image throws in its builder and fails CI first. The work ships as three tooling PRs (a seam guard that fails any PR of this change touching a protected change-4 path, then the derive pipeline in two parts) and ten product PRs stacked to `main` (plus one conditional range-fallback PR), each at or under 400 authored lines, and stays out of the change-4 catalog files.

---

## 0. Inputs fixed before this design

### 0.1 Owner decisions applied

| # | Decision | Where it lands |
|---|---|---|
| OD-1 | Mobile-first; curation v2 picks approved (`img-20260530-wa0019` Contacto, `img-20260411-wa0013` teaser) | AD7, section 6 |
| OD-2 / Q1 | Desktop: split layout; the photo column holds the still plus a smaller secondary tile with the muted loop. Mobile: the 4:5 still is the hero; the loop is a 4:5 tile right after the hero text. The still is always the LCP; the loop never is | AD7, section 5.1 |
| OD-3 | Short self-hosted muted loops; YouTube (`VideoFacade`) for long videos | AD10 |
| OD-4 | Paper-cord divider and a butterfly; reduced motion respected; light on mobile | AD11, AD12, sections 5.2, 5.3 |
| OD-5, OD-7 | Excluded sources: `img-20260808-130700502-hdr-portrait`, `img-20260926-153632786-hdr`, video v18 `VID_20260717_155248707` | AD2 (ledger `excluded`) |
| OD-6 | Four face photos recorded `consent: granted` (studio owner via project owner, 2026-10-16); the gate stays; new entries default to `pending` | AD2 |
| Q2 | Favicon regenerated from the raster logo `logo-calma-inquieta-sin-fondo` (client batch, 1563x1563 PNG, not in the repo) in S5 | AD6, section 6 |
| Q3 | One PR per slice, merged to `main` in order | Section 9 |
| PD-1..PD-6 | Proposed defaults, applied as written except where AD10 adds the pause control | AD10-AD12 |

### 0.2 Design assumptions (each is one isolated rule; the owner or the spec may override)

| # | Assumption | Isolated in |
|---|---|---|
| AS1 | On phones the still photo renders **before** the hero text (visual order), so it is fully above the fold at 360x740 and wins LCP over the `h1`. DOM order stays text first (reading order unchanged; the image is not focusable). | `HeroSection` classes |
| AS2 | The desktop still uses the source's native 3:4 frame (no crop job); only the mobile still is a 4:5 crop. | Recipe, registry |
| AS3 | The loop is one 4:5 encode (720x900) shown in both tiles (mobile 4:5 tile, desktop small overlapping tile). | Recipe, `VideoLoop` |
| AS4 | The butterfly flies once per mount of Inicio (a client navigation back to `/` replays it) and then rests perched. | `motifs.css` |
| AS5 | Single image slots (hero still, teaser) are gated at build time by validation; list and optional slots (gallery, contact photo, loop) are also gated at read time. | AD3 |
| AS6 | Root-level `/favicon.ico` is the only curated file without a hash in its name (browser convention). | AD5 |

### 0.3 Verifications done for this design

| Question | Finding | Evidence |
|---|---|---|
| Can the route `links` export emit the hero preload? | **No.** In React Router 8.4.0 `LinksFunction` is `(): LinkDescriptor[]`: it receives no loader data, and the registry lives in `site-content/infrastructure`, which delivery cannot import. `HtmlLinkPreloadImage` does type `imageSrcSet`/`imageSizes` but not `fetchPriority`. | `react-router/dist/production/lib/dom/ssr/routeModules.d.ts` L97-99; `lib/router/links.d.ts` L62-97 |
| Can `meta` emit it? | **Yes.** `<Meta>` renders any descriptor with `tagName: "link"` as `<link {...rest}>`; `meta` receives `loaderData`. `buildPageMeta` already emits the canonical link this way. | `react-router/dist/production/lib/dom/ssr/components.js` L390-402; `src/app/seo/meta.ts` |
| Does React preload the hero automatically? | React 19.3 server rendering auto-preloads every non-lazy `<img>` **outside** `<picture>`/`<noscript>` (`tagScope & 3`). Today this preloads the three eager collage slots, including the two hidden on phones. Inside `<picture>` there is no automatic preload, so the art-directed hero needs the explicit preloads above. | `react-dom/cjs/react-dom-server.edge.development.js` L3054-3093 |
| MP4 range requests on Workers static assets | **Not verifiable locally, and absent locally.** The local asset worker (miniflare, built from `workers-shared/asset-worker`) never answers 206 and has no `Content-Range` handling; it only drops the browser cache header for `Range` requests. Production behavior must be checked on the preview (AD10, S3b verify step; fallback F2). | `miniflare/dist/src/workers/assets/assets.worker.js` L513-527 |
| `navigator.connection.saveData` | Chromium only (Network Information API); absent in Safari and Firefox and in the TypeScript DOM lib. Read through a structural cast; absent means "no Save-Data". | AD10 |
| Inline SVG and the token literal scan | The scan (`styles.test.ts`) flags `[#hex]`, quoted hex strings and `-[<number><unit>]` only. SVG path data, `viewBox`, numeric `strokeWidth` and `currentColor` pass. Motif keyframes live in CSS, which the scan does not read. | `src/app/ui/styles.test.ts` L34-36 |
| Tailwind 4.3 utilities used | `aspect-4/5`, `aspect-3/4`, `overflow-x-clip`, `contents`, negative spacing (`-left-8`), `ring-canvas` are scale or fraction utilities, not arbitrary values. | Tailwind 4 utility set |

---

## 1. Technical Approach

| Concern | Approach | Capability |
|---|---|---|
| Registry | Pure types, gate and validation in `site-content/domain/media.ts`; data in `infrastructure/content/{media-assets,media-rights}.ts`; part of `RawSiteContent` | media-registry |
| Rights | Ledger keyed by **source id** (one record per client file, shared by all its crops); no record means `pending`; exclusions are explicit records | media-registry |
| Gate | Build time: `validateSiteContent` flags any content path that is unregistered, pending or excluded. Read time: the reader drops unpublishable gallery entries, contact photo and loop | media-registry, site-content |
| Files | `public/media/<area>/<id>-<width>.<hash8>.<ext>`, produced outside the build; parity test (files, entries, hash, dimensions, budgets, headers) | media-registry |
| Pipeline | `pnpm media:derive <recipe> <sourceDir>` (sharp, recipe JSON in the repo); ffmpeg commands documented for the loop | (tooling) |
| Art direction | `ImageRef.srcSet?` (additive); `Picture` atom; per-breakpoint aspect classes plus `width`/`height` on every `<source>` | design-system |
| Hero | Mobile-first split layout; one eager `fetchpriority="high"` image per page; preload via `meta` | home-page, design-system |
| Loop | `VideoLoop` molecule: poster-only SSR, JS gate (reduced motion, Save-Data, visibility), pause control | ambient-video |
| Motifs | `CordDivider` atom and `Butterfly` atom (inline SVG, `aria-hidden`); all motion in `styles/motifs.css` inside `prefers-reduced-motion: no-preference` | decorative-motifs |
| Caching | `immutable` for hashed curated folders; stand-ins and fonts keep one day | (platform config) |
| Share image | Registry asset in area `share`; `shareImageOf(registry)` throws unless exactly one publishable 1200x630 JPEG exists; `getShareImage()` feeds `PageMetaInput.shareImage`; `og:image:width` and `og:image:height` emitted | media-registry, seo-foundation |
| Launch gate | `getLaunchGate()` splits image stand-ins from font stand-ins and lists unpublished media | site-content |
| Seam guard | `tooling/change-seams.test.ts` fails a design-adjustments PR whose diff touches a protected change-4 path | process |
| Delivery | 3 tooling PRs + 10 product PRs (+1 conditional), stacked to `main` in order, each at or under 400 authored lines | process |

**Spec alignment.** The spec phase may run in parallel. When a spec names an observable (label, attribute, rule id) differently, the spec wins and apply aligns the name. This design owns structure, layering, file layout, test placement and slicing. Section 15 lists the points a spec should confirm.

---

## 2. Architecture Decisions

### AD1. The registry lives in `site-content`: types and rules in `domain`, data in `infrastructure`

**Choice**:
- `src/modules/site-content/domain/media.ts` (new, pure, no packages): `MediaAsset` (image or video), `RightsEntry`, `ExcludedSource`, `MediaRegistry`, and the functions `isPublishable`, `publishedPaths`, `toImageRef`, `largestVariant`, `srcSetPaths` and `validateMediaRegistry` (section 4.1).
- `src/modules/site-content/infrastructure/content/media-assets.ts` (new): `MEDIA_ASSETS` as `as const satisfies readonly MediaAsset[]`, so `MediaAssetId` is a literal union and an unknown id in a content file is a compile error.
- `src/modules/site-content/infrastructure/content/media-rights.ts` (new): `MEDIA_RIGHTS` and `EXCLUDED_SOURCES`.
- `src/modules/site-content/infrastructure/content/media-refs.ts` (new): `imageRef(id)`, `artDirected(mobileId, desktopId)` and `loopRef(id)`, which content files (`home.ts`, `about.ts`, `contact.ts`) call to build `ImageRef` values with `srcSet`. Same layer, so no boundary change.
- `RawSiteContent` gains `media: MediaRegistry`; `repository-content-source.ts` wires `{ assets: MEDIA_ASSETS, rights: MEDIA_RIGHTS, excluded: EXCLUDED_SOURCES }`.
- The stand-in registry (`stand-in.ts`, `STAND_IN_ASSETS`) is unchanged in shape. The two registries coexist: a content path is valid when it is a registered stand-in **or** a path of a publishable media asset.

**Alternatives considered**:
- Registry data in `domain` (constants next to the rules). It would make the domain depend on concrete client files and break the DS4 rule that `infrastructure` holds the swappable source (a later panel or database source replaces data, not rules).
- A new `media-library` module. The existing `media` module belongs to change 3 (R2 uploads, admin) and is off-limits; a third module would need its own port into `site-content` for content validation, for no gain.
- Generating the registry from `manifest.json` at build time. It adds a build step and hides the curated choice (alt text, area, rights) in generated code.

**Rationale**: It follows the layering already used by the stand-in registry, keeps every rule pure and testable at 90 % coverage, and the module API (`index.ts`) only re-exports domain types and the application reader, as `AGENTS.md` requires.

### AD2. Rights are a ledger keyed by source id; no record means `pending`

**Choice**:
- `RightsEntry = { sourceId, people: "none" | "hands" | "faces", consent: "not-required" | "granted" | "pending", consentSource? }`. `sourceId` is the media-workspace base name (`img-20261015-wa0030`, `vid-20261014-185300580`, `logo-calma-inquieta-sin-fondo`).
- `isPublishable(asset, registry)` is true only when: the source is not in `excluded`; a rights entry exists; and either `consent === "granted"` with a `consentSource`, or `consent === "not-required"` with `people` other than `"faces"`.
- An asset whose source has no entry is **pending** (not publishable). This is the "new entries default to `pending`" rule: adding a file never makes it publishable by itself.
- Ledger content for this change: the four OD-6 face photos as `granted` with `consentSource: { by: "Studio owner, relayed by the project owner", recordedOn: "2026-10-16" }`; the PD-6 hands-only sources as `hands` + `not-required`; every other source this change publishes as `none` + `not-required`; `EXCLUDED_SOURCES` lists the three OD-5/OD-7 sources with `reason` (`"not-the-owner"` or `"minor"`) and the decision date.

**Alternatives considered**: rights fields on each asset (two crops of one photo could disagree; OD-6 is a decision about a photo, not a crop); a boolean `approved` (it cannot tell hands from faces, and PD-6 needs that distinction to flip a source to `pending` later).

**Rationale**: One record per decision, mirrored from the owner's words. Flipping a source to `pending` hides every crop of it at once.

### AD3. The gate runs twice: validation at build time, filtering at read time

**Choice**:
- `validateSiteContent(content)` (domain, existing) extends its image walk: for every content image it checks `src` and every path in `srcSet` (and, from S3b, the loop poster and sources). Per path, first match wins:
  - the path contains an exclusion token (section 4.1, `exclusionToken`) → `excluded-source`, naming the path (a page reference to an excluded source fails even when the path is not registered);
  - a registered stand-in path → valid;
  - a path of a registered media asset → valid only if `isPublishable`, otherwise `rights-missing` (no ledger record) or `unpublishable-media` (excluded, `pending`, or faces without a recorded grant);
  - under `/media/stand-ins/` but unregistered → `unregistered-stand-in` (existing rule, unchanged);
  - anything else → `unregistered-media`.
- It also appends `validateMediaRegistry(content.media)` issues (section 4.1) and checks asset ids in `duplicate-id`.
- `repository-content.test.ts` already asserts `validateSiteContent(raw)` is `[]`, so a pending or excluded asset referenced anywhere fails CI.
- The application reader (`createSiteContent`) filters at read time with the same rule (`isPublishedPath`): `getAboutPage()` drops gallery entries with an unpublishable path; `getContactPage()` drops `photo`; `getHomePage()` drops `hero.loop`. Single required slots (hero still, teaser) rely on validation (AS5).

**Alternatives considered**: read-time filtering only (a required slot would silently render empty); validation only (a future panel or database source, DS4, would not run the CI test).

**Rationale**: The repository source is protected by CI, and the reader stays safe if the source is ever replaced. It mirrors `publishableTestimonials`, the existing consent pattern.

### AD4. `ImageRef` gains only `srcSet?`; `sizes` belongs to the `ui` layout

**Choice**:
- `ImageRef = { src, alt, width, height, srcSet? }`. `src` is the variant closest to 960 px wide (the largest at or below 960, else the smallest); `width`/`height` are that variant's.
- `sizes` is not content: it describes the layout box, so the component that owns the box declares it. `HeroSection`, `GalleryGrid`, `AboutTeaser`, the contact route and `VideoLoop` each own a `sizes` constant. `HeroSection` exports its constants so the route preload uses the same string.
- New content type `ArtDirectedImage = { mobile: ImageRef; desktop: ImageRef }` (both carry `srcSet`; the `<img>` uses `mobile.alt`, and both assets share the alt text).
- Nothing else is added to `ImageRef`, because `GalleryGrid` spreads its entries into `<img>`: any non-attribute field would reach the DOM.

**Alternatives considered**: `ImageRef` with `sizes` and `sources[]` (the explore note): it puts breakpoints and layout widths into content, and `sources` spread into `<img>` would be an invalid attribute.

**Rationale**: Change-4 components keep compiling unchanged (optional field), and layout knowledge stays in `ui`.

### AD5. File naming, hashing and caching: `/media/<area>/<id>-<width>.<hash8>.<ext>`, `immutable`

**Choice**:
- Areas: `home`, `about`, `contact`, `share`, `brand`, `video`. Asset ids are kebab case, unique, at most 40 characters (`home-hero-mobile`, `about-espacio`, `home-loop`).
- File names: `<id>-<width>.<hash8>.<ext>`, where `hash8` is the first 8 hex characters of the SHA-256 of the file bytes (`/media/home/home-hero-mobile-720.3fa9c1d2.webp`). Video files use the encode width (`home-loop-720.<hash8>.mp4`).
- Exception: `/favicon.ico` at the root (browsers request it by convention; AS6).
- `public/_headers` becomes non-overlapping (Cloudflare joins the values of overlapping rules):

  ```
  /fonts/*
    Cache-Control: public, max-age=86400
  /media/stand-ins/*
    Cache-Control: public, max-age=86400
  /media/home/*
    Cache-Control: public, max-age=31536000, immutable
  ```
  plus the same immutable rule for `/media/about/*`, `/media/contact/*`, `/media/share/*`, `/media/brand/*` and `/media/video/*`. The old `/media/*` rule is removed.
- The parity test recomputes every hash, so a byte change without a rename fails CI, which makes `immutable` safe.
- The share image is **not** a delivery literal: it is read from the registry at request time (AD15), so a re-derive that renames it needs no delivery edit. The favicon links (`src/app/root.tsx`) stay literal paths, because the root `links` export receives no loader data (section 0.3) and browsers request `/favicon.ico` by convention (AS6); `root.test.ts` asserts each link is a registered, publishable path.

**Alternatives considered**: keep one day for everything (repeat visitors re-validate about 3 MB of photos daily); versioned names `-v2` (a byte change at the same name cannot be detected); Vite-imported assets with build hashes (the `ui` and content layers would import binaries, and the registry could not be validated as data).

**Rationale**: Content-addressed names are the standard precondition for `immutable`, and the test makes the convention mechanical.

### AD6. Asset pipeline: a recipe-driven `media:derive` command for images, documented ffmpeg for the loop

**Choice**:
- **T0a and T0b (two tooling PRs, split up front because one PR forecasts 396-511 lines; section 9)** extend the `media:optimize` tooling once `chore/media-optimize-images` merges (sharp is then a devDependency). T0a ships the pure plan and its tests; T0b ships the sharp I/O, the script and the doc.
  - `tooling/media/derive-plan.ts` (pure, unit-tested; T0a): `cropBox(sourceSize, aspect, focus)` (largest box of the aspect centered on the focus point, clamped to the frame); `deriveWidths(sourceWidth, requested)` (keeps the requested widths at or below the source width, never upscales, and adds the source width as the top variant when the source is narrower than the next requested width, so `img-20260411-wa0106` (900 px) gets 480 and 900); `hashedName(id, width, hash, ext)`; `encodeIco(pngs)` (ICO container with embedded PNG entries).
  - Recipe parsing and validation (`parseRecipe`: unknown keys, missing `id`/`source`/`widths`, an `id` over 40 characters, a `source` matching an exclusion token) also lives in the pure plan, so a recipe job for an excluded source fails before any file is written.
  - `tooling/media/derive.ts` (sharp I/O; T0b): EXIF rotate, crop, resize, encode (WebP quality from the recipe, default 78; JPEG mozjpeg quality 82; PNG), hash, write to `public/media/<area>/`, delete older hashed files of the same id and width, and print the registry fragment (`id`, `variants` with `width`, `height`, `path`) as JSON for the author to paste into `media-assets.ts`. Nothing is generated into `src/`.
  - `package.json` script `media:derive`; `docs/media/pipeline.md` (how to run it, the recipe format, the ffmpeg commands, the size budgets) (T0b).
  - **Favicon origin note (Q2)**: `docs/media/pipeline.md` gets a "Brand assets" section in S5 that names the origin `logo-calma-inquieta-sin-fondo` (client batch, 1563x1563 PNG with transparency, kept outside the repo like every source), the outputs (`/favicon.ico` with 16, 32 and 48 px entries, `icon-192`, `apple-touch-icon` on `sand-200` with 12 % padding), the mark-crop fallback of section 15 question 2, and the date of the owner decision. The same origin is machine-checked in two places: each brand recipe job has `"source": "logo-calma-inquieta-sin-fondo"`, and the three brand registry entries carry `sourceId: "logo-calma-inquieta-sin-fondo"` with a ledger row (`none`, `not-required`). The doc is the human-readable record; the registry is the authority.
  - Usage: `corepack pnpm media:derive tooling/media/recipes/design-adjustments.json "<sourceDir>"`. The source folder stays outside the repo (machine-specific path passed as an argument).
- **Recipe** `tooling/media/recipes/design-adjustments.json` (one line per job), added by the slice that adds the assets: `{ id, source, area, aspect?, focus?, widths, format, quality?, background? }`. The crop focus points are reviewable data.
- **Loop (ffmpeg, documented, not scripted)**: the 6 s cut, 4:5 crop, 720x900, no audio track, `faststart`:

  ```
  ffmpeg -ss 0 -t 6 -i VID_20261014_185300580.mp4 -an -map_metadata -1 \
    -vf "crop=1080:1350:0:285,scale=720:900:flags=lanczos,fps=30,format=yuv420p" \
    -c:v libx264 -profile:v high -preset slow -crf 28 -movflags +faststart home-loop.mp4
  ffmpeg -ss 0 -t 6 -i VID_20261014_185300580.mp4 -an -map_metadata -1 \
    -vf "crop=1080:1350:0:285,scale=720:900:flags=lanczos,fps=30" \
    -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -deadline good home-loop.webm
  ffmpeg -ss 0 -i VID_20261014_185300580.mp4 -frames:v 1 \
    -vf "crop=1080:1350:0:285,scale=720:900" home-loop-poster.png
  ```
  The crop offset (`285`, vertical center of the 1920 frame) is adjusted to the mirror and recorded in the doc. The poster PNG then goes through `media:derive` (WebP 480 and 720). The author renames the two video files to the hashed form (`docs/media/pipeline.md` gives the `sha256sum` one-liner). Expected size: about 0.9 MB MP4 and 0.7 MB WebM (the curation measured 1.7 MB for 8 s at 720x1280, CRF 29).

**Alternatives considered**:
- Manual sharp-cli or ImageMagick commands per file: about 45 output files with hashes and dimensions copied by hand; error-prone.
- Scripting ffmpeg from Node: it adds a subprocess boundary (threat matrix) and a system dependency to CI for a one-off encode.
- Extending `media:optimize` with flags instead of a recipe: crop focus per asset needs data, not flags.

**Rationale**: Reproducible crops, correct hashes and dimensions by construction, and a small reviewable recipe. **Fallback** if `chore/media-optimize-images` does not merge in time: run `media:derive` from the `CalmaInquieta-media-tool` worktree (only the outputs and the recipe are committed by S0b), and land T0a and T0b when the chore merges.

### AD7. Hero: mobile-first art direction with a split desktop layout

**Choice** (section 5.1 has the class-level layout):
- Phones: one 4:5 still (`home-hero-mobile`, crop centered on the woven disc), visually first, `w-full max-w-md`, eager, `fetchpriority="high"`. Text follows, then the loop tile (from S3b).
- Desktop (`lg`, 64rem): two columns; the text on the left; on the right the 3:4 still (`home-hero-desktop`, native frame) at most 28rem wide, right-aligned, with the loop tile overlapping its lower-left corner and the butterfly perched on its upper-right corner.
- `HeroCollage` is deleted; no image is hidden with CSS at any breakpoint, so nothing downloads unseen.
- Constants exported by `src/app/ui/organisms/hero-section.tsx`:

  | Constant | Value |
  |---|---|
  | `HERO_DESKTOP_MEDIA` | `(min-width: 64rem)` |
  | `HERO_MOBILE_MEDIA` | `not all and (min-width: 64rem)` (exact complement; used only by the preload) |
  | `HERO_STILL_SIZES` | `(min-width: 30rem) 28rem, calc(100vw - 2.5rem)` |

  `calc(100vw - 2.5rem)` matches the 1.25rem gutter at 360 px; 28rem matches `max-w-md`. At Lighthouse's 412 px, DPR 1.75 the browser picks the 720w mobile variant (about 100 KB).
- Variant widths: mobile 4:5 at 480, 720 and 1080 (DPR 3 phones); desktop 3:4 at 480, 960 and 1600.

**Alternatives considered**: the desktop collage of the mockup (text overlay over faces and the busy background, rejected by OD-2); one asset with `object-position` (no true art direction; the explore approach C); a 16:9 desktop crop (curation: the 16:9 frame leaves no air and needs a wider column than the split allows).

**Rationale**: It meets OD-2 and Q1 exactly, keeps one LCP candidate per viewport, and the still stays fully above the fold at 360x740 and at 1024x768 (section 5.1 arithmetic).

### AD8. `Picture` atom over the existing `Image` atom

**Choice**:
- `src/app/ui/atoms/picture.tsx` renders `<picture>` with one `<source>` per entry (`media`, `srcSet`, shared `sizes`, `width`, `height`, `type="image/webp"`) and the `Image` atom as the fallback `<img>`.
- `Image` gains one optional prop, `intrinsicRatio?: boolean` (default `true`). `Picture` passes `false`, so the inline `aspect-ratio` (taken from the fallback's dimensions) does not override the desktop source; the caller supplies static per-breakpoint classes (`aspect-4/5 lg:aspect-3/4`), and every `<source>` carries `width`/`height` so the browser also maps the selected source's ratio.
- `Picture` forwards `aboveTheFold` and `fetchPriority` with the existing type union (high priority only above the fold).

**Alternatives considered**: extending `Image` with a `sources` prop (the atom's job is one `<img>`; `GalleryGrid` and `VideoFacade` would carry a prop they never use); a `Picture` that renders its own `<img>` (duplicates the loading and priority rules the `Image` tests pin).

**Rationale**: Additive, one tested place for loading rules, and the existing `Image` tests stay green.

### AD9. The hero preload is emitted by the route `meta`, not `links`

**Choice**:
- `src/app/media/preload.ts` (delivery, pure): `artDirectedPreloads(image, { sizes, mobileMedia, desktopMedia })` returns two descriptors:

  ```ts
  { tagName: "link", rel: "preload", as: "image", imageSrcSet: image.mobile.srcSet, imageSizes: sizes, media: mobileMedia, fetchPriority: "high" }
  { tagName: "link", rel: "preload", as: "image", imageSrcSet: image.desktop.srcSet, imageSizes: sizes, media: desktopMedia, fetchPriority: "high" }
  ```
- `src/app/routes/home.tsx` `meta` returns `[...buildPageMeta(metaInput), ...artDirectedPreloads(loaderData.hero.image, HERO_PRELOAD)]`. The error branch adds nothing.
- `srcSet` and `sizes` are the same strings the `<source>`/`<img>` use, so the browser reuses the preloaded response.

**Alternatives considered**: route `links` (no loader data in RR 8.4.0, section 0.3); `react-dom`'s `preload()` inside the component (works with React 19 hoisting, but it is imperative render-time side effect code in a route component and untestable as a pure function); no preload (with `<picture>` React emits none, so discovery waits for the HTML body).

**Rationale**: Verified against the installed router; pure and table-testable; the canonical link already uses the same mechanism.

### AD10. `VideoLoop`: poster-only SSR, JavaScript gate, pause control

**Choice** (`src/app/ui/molecules/video-loop.tsx`, React only):
1. **Server and first client render**: a wrapper `div` (`relative overflow-hidden rounded-sm`, inline `aspect-ratio` from `width`/`height`, caller classes) holding a lazy decorative poster `<Image alt="" loading="lazy">`. No `<video>` element, so no poster double fetch and no video bytes; hydration matches.
2. **After mount** (`useEffect`): `allowMotion = matchMedia("(prefers-reduced-motion: no-preference)").matches && !saveData()`, where `saveData()` reads `(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true`. If motion is not allowed, or `IntersectionObserver` is missing, it stays on the poster and renders no control. A `change` listener on the media query unmounts the video if the user switches to `reduce`.
3. **Visibility**: an `IntersectionObserver` (`threshold: 0.25`). The first intersection **arms** the tile: it mounts `<video muted loop playsInline preload="none" disablePictureInPicture disableRemotePlayback aria-hidden="true" tabIndex={-1}>` with `<source type="video/webm">` then `<source type="video/mp4">`, absolutely positioned over the poster, `opacity-0` until `playing`, then `opacity-100`. The effect also sets `video.muted = true` and `video.defaultMuted = true` before `play()`, because React does not render the `muted` attribute. Intersecting calls `play()` (a rejected promise keeps the poster); leaving calls `pause()`. An `error` event unmounts the video.
4. **Pause control (WCAG 2.2.2 Pause, Stop, Hide, Level A; owner decision 2026-10-16, option a)**: the loop moves for more than 5 s and starts automatically, so a small button sits in the tile's lower-right corner once armed (44 px target, `microcopy.pauseAnimation` "Pausar animación" and `microcopy.playAnimation` "Reproducir animación"). A user pause sets `userPaused`, and the observer never resumes it.
5. **Semantics**: the poster and the video are `aria-hidden` (decorative, no audio, no information); the wrapper is not, because it contains the focusable button (axe `aria-hidden-focus`).
6. **Never the LCP**: below the fold on phones; on desktop a 10rem tile; the poster is lazy; the video mounts after hydration.
7. **Range requests**: the MP4 has `faststart`. Locally there is no 206 (section 0.3). **S3b verify step**: on the deployed preview (owner session, behind Access), `curl -sI -H "Range: bytes=0-1" <preview>/media/video/<file>.mp4` must answer `206` with `Content-Range`. If it answers `200`:
   - degraded but safe: Safari may refuse the MP4; `VideoLoop` keeps the poster on `error` or on a rejected `play()`;
   - **F2 (S3c, conditional)**: `wrangler.jsonc` `assets: { binding: "ASSETS", run_worker_first: ["/media/video/*"] }` and a pure `rangeResponse(request, full)` helper in `src/platform/range.ts` (single `bytes=a-b` range, 206 with `Content-Range`, 416 on unsatisfiable ranges, `Accept-Ranges: bytes`), called from `workers/app.ts` before React Router;
   - **F3**: move the loop to R2 after runbook R1 (native ranges).

**Alternatives considered**:
- `<video autoplay>` rendered by the server with `preload="none"`: autoplay ignores `preload` and fetches on load; CSS cannot stop it under reduced motion.
- No control and a loop of at most 5 s (WCAG exemption): the 6 s clip would be cut, and a looping clip never stops; a 5 s single play then a still frame is the lighter alternative if the owner rejects the button (section 15, question 1).
- The `Save-Data` request header read by the loader: covers the same Chromium browsers and couples the loader to a client hint; not needed when the client check exists.

**Rationale**: Zero video bytes unless motion is allowed and the tile is visible, SSR-safe, and Level A conformant. The pause control is a deviation from the proposal's "no controls" (PD-1 wording); the owner accepted it on 2026-10-16 (section 15).

### AD11. `CordDivider`: two twined strands, static by default, scroll-linked draw-in

**Choice** (`src/app/ui/atoms/cord-divider.tsx`; visual spec in section 5.2):
- Inline SVG, `aria-hidden="true"`, `focusable="false"`, `stroke="currentColor"` with `text-tan-400` (the token reserved for ornaments). Fixed box (`h-6 w-full max-w-80`, `viewBox="0 0 320 24"`): zero layout shift.
- The default state is the **fully drawn** cord. The draw-in exists only inside `@media (prefers-reduced-motion: no-preference)` and `@supports (animation-timeline: view())` in `styles/motifs.css`, so reduced motion and browsers without scroll-driven animations show the static cord. No JavaScript.
- Placement: Inicio only, between the main sections (section 5.2). The existing `Divider` (`<hr>`) is unchanged.

**Alternatives considered**: a time-based draw-in on load (dividers below the fold would finish before anyone sees them); an IntersectionObserver trigger (JavaScript for decoration); an `<hr>` with a background image (an extra request, and `<hr>` announces a separator for decoration).

**Rationale**: Brand craft at a few hundred bytes of markup, no requests, and progressive enhancement.

### AD12. `Butterfly`: one CSS flight of 4.5 s, perched afterwards

**Choice** (`src/app/ui/atoms/butterfly.tsx`; visual spec in section 5.3):
- Inline SVG, `aria-hidden`, `pointer-events-none`, placed through a `HeroSection` `ornament` slot (structural `ReactNode`) inside the still photo's wrapper, perched on the photo's upper-right corner. `size-7` on phones, `lg:size-10`.
- Motion only in `styles/motifs.css` inside `prefers-reduced-motion: no-preference`: a flight keyframe on the wrapper (`transform` and `opacity` only, 4.5 s, one iteration, 0.8 s delay so it starts after the first paint) and a wing flap on the two wing groups (`scaleX`, 0.28 s alternate, 16 iterations, ending open). Total motion under 5 s, so WCAG 2.2.2 needs no control.
- Reduced motion: no animation is declared, so the butterfly is static at its perch (PD-3: static, not hidden).
- The hero section gets `overflow-x-clip` so the flight path never creates horizontal scroll.

**Alternatives considered**: CSS Motion Path `offset-path` (smoother curve, but it adds a support matrix for a decoration; waypoint keyframes are universal); a Lottie or JavaScript animation (a runtime package or script for decoration); a looping flight (needs a pause control and distracts while reading).

**Rationale**: Compositor-only animation (no layout, no CLS), zero JavaScript, and a finite run.

### AD13. Launch gate: image stand-ins counted apart from fonts

**Choice**:
- Lands in S2b (moved out of S0a by the up-front split, section 9). Domain `summarizeLaunchGate(standIns, media)` and reader `getLaunchGate(): Promise<LaunchGate>` with `imageStandIns` (kinds `image`, `favicon`, `share-image`), `fontStandIns` and `unpublishedMedia` (registered asset ids that are not publishable). `listStandInAssets()` stays unchanged for compatibility.
- **Criterion for this change** (asserted in S5): `imageStandIns` ids equal `["gallery-01"]` (the catalog fallback, retired in the post-change-4 follow-up); `unpublishedMedia` is empty; the four font stand-ins are reported, not counted against this change.

**Alternatives considered**: keep "length must reach 0" (unreachable by this change: fonts and the catalog fallback are outside its material); drop fonts from the stand-in list (they are still stand-ins until the client confirms typefaces).

**Rationale**: The launch checklist reads three honest numbers instead of one misleading count.

### AD14. Ownership seams with change 4

**Choice**:
- **Untouched** (proposal list): `src/app/ui/molecules/{activity-card,taller-card,intensivo-card}.tsx`, `src/app/ui/organisms/catalog-grid.tsx`, `src/app/ui/templates/catalog-listing-page.tsx`, `src/app/catalog/**`, the catalog routes (`talleres`, `taller`, `intensivos`, `intensivo`, `sitemap`), `src/app/routes.ts`, `src/app/site-map.ts`, `src/app/seo/{sitemap,json-ld}.ts`, `src/modules/site-content/infrastructure/content/{catalog,coming-soon}.ts`, `src/modules/{workshops,media,teachers}/**`, `src/composition/**`.
- **Conditionally untouched**: the catalog routes `src/app/routes/{talleres,taller,intensivos,intensivo}.tsx` (C4-F1, C4-F2, not on `main` yet) call `buildPageMeta`. S2b makes `PageMetaInput.shareImage` required (AD15). If S2b merges first, change 4 adds the two `shareImage` lines when it rebases (its own files). If those routes are already on `main` when S2b is ready, S2b needs a two-line hunk in each one, which requires owner acceptance (section 15, question 3). Until then they are on the untouched list, and the seam guard (AD16) enforces it.
- **Shared files, line-disjoint hunks** (named seams; whichever PR lands second rebases; neither edits the other's lines). The owner accepted line-disjoint seams for shared files on 2026-10-16. "Hunk" names the lines each slice adds or replaces; "C4 owns" names what this change must not edit.

  | File | Change 4 owns | This change's hunks (slice) |
  |---|---|---|
  | `src/modules/site-content/domain/page-content.ts` | `CatalogContent` types (C4-B1), `ComingSoonSlug` (C4-B4) | `ImageRef.srcSet?` field (S0a); `RawSiteContent.media` field and `ContentIssue.rule` union member `MediaRule` (S0a); new `ArtDirectedImage` interface and the `HomePageContent.hero.images` → `image` line (S1b); new `AmbientLoop` interface and `hero.loop?` line (S3b); `ContactPageContent.photo?` line (S5) |
  | `src/modules/site-content/domain/content-rules.ts` | catalog SEO, fallback image and intro rules (C4-B1) | `isPublishedPath`, `publishedImages` and the per-path check called from the existing image walk (S0a); `validateMediaRegistry` issues appended to the issue list (S0a); `share-image-missing` and `summarizeLaunchGate` (S2b); loop paths added to the walk (S3b); contact photo added to the walk (S5) |
  | `src/modules/site-content/application/site-content.ts` | `getCatalogContent` (C4-B1) | `getAboutPage()` gallery filtered through `publishedImages` (S0a); new members `getShareImage()` and `getLaunchGate()` (S2b); `getHomePage()` loop gate (S3b); `getContactPage()` photo gate (S5) |
  | `src/modules/site-content/index.ts` | `fillCopyTemplate`, catalog type exports (C4-B1) | one new `export type { … } from "./domain/media"` line (S0a), extended in place by S1b (`ArtDirectedImage`), S2b (`ShareImage`, `LaunchGate`) and S3b (`AmbientLoop`); never the C4 export lines |
  | `src/modules/site-content/infrastructure/repository-content-source.ts` | `catalog` wiring (C4-B1) | one `media: { assets: MEDIA_ASSETS, rights: MEDIA_RIGHTS, excluded: EXCLUDED_SOURCES }` property and its imports (S0a wires an empty registry; S0b switches it to the real constants) |
  | `src/modules/site-content/infrastructure/repository-content.test.ts` | catalog and coming-soon assertions (C4-B1, C4-B4) | hero (S1b), gallery and stand-in counts (S2), share image and launch gate (S2b), teaser and favicon counts (S5), each in an appended `describe` block; the "offers the two Inicio calls to action" test changes only its `hero.images` line (S1b) |
  | `src/modules/site-content/infrastructure/stand-in-assets.test.ts` | content walk over the catalog fallback `gallery-01` (C4-B1) | image-size readers moved out to `src/testing/media/image-size.ts`, replaced by one import line (S0b); per-row expectations for retired rows (S1b, S2, S2b, S5; section 7); the `gallery-01` expectations stay untouched |
  | `src/testing/fakes/in-memory-site-content-source.ts` | catalog content fixture (C4-B1) | `media` default (an empty registry in S0a; one share asset added in S2b); hero fixture shape (S1b); loop (S3b); contact photo (S5) |
  | `src/app/routes/home.tsx` | `readCatalog`, the catalog part of the loader `Promise.all`, the activity sections JSX, the `~/app/catalog/mappers` import (C4-F3) | imports of `artDirectedPreloads` and the hero constants, the `HeroSection` `images` → `image` prop line, and the `meta` return line (S1b); a separate `const shareImage = await services.siteContent.getShareImage();` statement before the `return` and one `shareImage` line in `metaInput` (S2b; never inside the C4 `Promise.all`); the `loop` prop line (S3b); the `CordDivider`/`Butterfly` imports, the `ornament` prop and three `<CordDivider />` lines inserted between existing section elements, never inside the catalog block (S4) |
  | `src/app/routes/home.ui.test.tsx`, `home.test.ts` | catalog loader and section tests (C4-F3) | the fixture `hero.images` → `hero.image` line (S1b); appended `describe` blocks for the preload (S1b), `og:image` (S2b), the loop (S3b) and the divider positions (S4) |
  | `src/app/routes/coming-soon.tsx` | `supportedSlugs` (C4-F2) | a separate `const shareImage = …` statement and one `shareImage` line in the `buildPageMeta` call (S2b) |
  | `src/app/routes/coming-soon.test.ts` | supported slugs (C4-F2) | the `og:image` expectation, rewritten once from the fake source's share asset so it never pins a path again; one appended `og:image:width`/`og:image:height` assertion (S2b) |
  | `src/app/seo/meta.ts` | `ogImage` override and `truncateDescription` (C4-F1) | the `SHARE_IMAGE_PATH` constant line is replaced by the `ShareImage` type; one `shareImage` field in `PageMetaInput`; one guard line; the `og:image:width` and `og:image:height` entries (S2b). **One shared line**: the `og:image` `content` expression. Its merged form is fixed here, `canonicalUrl(input.baseUrl, input.ogImage ?? input.shareImage.path)`, and whichever PR lands second writes exactly that |
  | `src/app/seo/meta.test.ts` | `ogImage` and truncation cases (C4-F1) | appended share-image cases (S2b); the shared input fixture gains one `shareImage` line |
  | `src/app/ui/organisms/gallery-grid.tsx`, `gallery-grid.ui.test.tsx` | the props `ProjectSection` passes (C4-F0b) | additive optional `srcSet` on `GalleryEntry` and the two `sizes` constants; appended `srcset`/`sizes` cases (S2). `ProjectSection` uses it unchanged |
  | `docs/design/deviation-register.md` | rows (C4-F1, C4-F2, C4-F4) | rows appended at the end, after C4-F4 merges (S5) |

**Rationale**: The proposal's off-limits list holds. The shared files cannot be avoided without duplicating types or readers, and line-disjoint hunks rebase cleanly. The one shared line in `meta.ts` has a fixed merged form, so its rebase is mechanical in either order. The seam guard (AD16) turns the untouched list into a failing test; hunk discipline inside shared files stays a review item, listed per slice above.

### AD15. The share image comes from the registry; a missing one throws

**Choice**:
- **Data**: the asset `share-default` (area `share`, one 1200x630 JPEG variant, source `img-20260819-174607732-hdr`, ledger `none`) is registered in S2b.
- **Builder** (domain, pure, S2b): `shareImageOf(registry): ShareImage` in `media.ts`. It returns `{ path, width, height, alt }` of the only image asset with `area: "share"`. It **throws** `Error("media registry: no publishable 1200x630 JPEG share image")` when there is no such asset, when there is more than one, when the asset is not publishable, when its format is not `jpeg`, or when its single variant is not 1200x630. `imageRef` in `media-refs.ts` follows the same pattern (it throws on a programming error).
- **CI first**: `validateSiteContent` reports `share-image-missing` (id `"share"`) under the same conditions, so `repository-content.test.ts` fails before a request can ever throw.
- **Reader** (application, S2b): `SiteContent.getShareImage(): Promise<ShareImage>` returns `shareImageOf(raw.media)`.
- **Delivery** (S2b): `meta.ts` drops the `SHARE_IMAGE_PATH` literal. `PageMetaInput` gains a required `shareImage: { path: string; width: number; height: number }` (structural). `buildPageMeta` throws `Error("Share image must not be empty")` when `shareImage.path` is blank, mirroring its description guard, so no page can emit an empty `og:image`. Each page loader (`home`, `about`, `contact`, `coming-soon`) reads `await services.siteContent.getShareImage()` in a separate statement and passes it in `metaInput` (AD14 hunks).
- **Tags**: `og:image` is `canonicalUrl(baseUrl, ogImage ?? shareImage.path)`. When no `ogImage` override is given (every page of this change), `buildPageMeta` also emits `og:image:width` `"1200"` and `og:image:height` `"630"` from the `shareImage` values, which meets the seo-foundation SHOULD. When change 4's activity cover overrides `ogImage`, the size of the override is unknown to the builder, so the two size tags are omitted rather than stated wrongly.

**Alternatives considered**:
- Keep `SHARE_IMAGE_PATH` as a literal checked by a test (revision 1): the test catches drift, but the value does not come from the registry, and nothing fails at the call site. The validator rejected it.
- Import the registry from delivery: `src/app/**` may import only module APIs and composition, and `index.ts` may not re-export `infrastructure` (`AGENTS.md`). Blocked by the dependency rule.
- Expose the share image from a new `src/composition/` helper: delivery may import composition, but `src/composition/**` is on the change-4 untouched list.
- Render the default `og:image` in the root `Layout` from root loader data: route `meta` replaces parent meta in React Router, so the root would duplicate or fight change 4's `ogImage` override.

**Rationale**: The value has one source (the registry), a missing or wrong share image fails in the builder at request time and in CI before that, and the delivery change is one field per page loader. The cost is a required field that the change-4 catalog routes must also pass (AD14, question 3).

### AD16. A seam guard test replaces the manual per-PR diff check

**Choice** (T1, the first PR of the change, before S0a):
- `tooling/change-seams.ts` (pure data and functions):
  - `UNTOUCHED`: the AD14 untouched list as exact file paths and directory prefixes ending in `/` (no glob library; brace sets are expanded in the data). It covers `src/composition/`, `src/modules/{workshops,media,teachers}/`, `src/app/catalog/`, the catalog routes, `src/app/routes.ts`, `src/app/site-map.ts`, `src/app/seo/{sitemap,json-ld}.ts`, `content/{catalog,coming-soon}.ts`, the catalog molecules, organism and template.
  - `OWNED`: paths only this change creates (`src/modules/site-content/domain/media`, `…/infrastructure/content/media-`, `src/app/media/`, `src/app/ui/atoms/{picture,cord-divider,butterfly}`, `src/app/ui/molecules/video-loop`, `src/app/ui/styles/motifs.css`, `public/media/{home,about,contact,share,brand,video}/`, `public/favicon.ico`, `tooling/media/`, `tooling/change-seams`, `docs/media/`, `openspec/changes/design-adjustments/`).
  - `isGuardActive({ branch, changed })`: true when the branch name contains `design-adjustments`, or when any changed path is in `OWNED`. A change-4 PR (which touches its own files and never an owned path) is therefore not blocked.
  - `protectedChanges(changed)`: the changed paths that equal an `UNTOUCHED` file or start with an `UNTOUCHED` prefix, sorted.
  - `isSafeRef(ref)`: `^[A-Za-z0-9][A-Za-z0-9._/-]*$`, without `..`, so a ref can never be read as a git option.
- `tooling/change-seams.test.ts`:
  - Unit tables for the three pure functions.
  - One integration test that collects the changed paths and asserts `protectedChanges(changed)` is `[]` when the guard is active (otherwise it records why it is inactive and passes). The changed paths are the union of: `git diff --name-only --no-renames <base>...HEAD` (committed on the branch), `git diff --name-only --no-renames HEAD` (staged and unstaged), and `git ls-files --others --exclude-standard` (untracked). `--no-renames` reports both sides of a rename, so moving a protected file is caught.
  - The base is `SEAM_BASE_REF` or `origin/main`, checked with `isSafeRef`, then `git rev-parse --verify --quiet <base>^{commit}`. An unsafe or unresolvable base **fails** the test with "seam guard: base ref not found; fetch origin/main or set SEAM_BASE_REF". It fails closed and never skips.
  - The branch is `GITHUB_HEAD_REF` (CI pull requests, where `HEAD` is a detached merge commit) or `git branch --show-current`.
  - Every git call is `spawnSync("git", [...args])` with an argument array, no shell, and `cwd` set to the repository root (resolved from the test file's directory, never from the environment). This follows the precedent of `tooling/repo-hygiene.test.ts`.
- It runs in the existing gate (`pnpm test`, and `pnpm test:coverage` in CI). CI checks out with `fetch-depth: 0`, so `origin/main` exists. On a push to `main` the committed range is empty and the guard passes.
- Lifetime: `UNTOUCHED` shrinks when change 4 archives (its paths stop being protected). The archive of this change deletes both files.
- Slice branches are named `<type>/design-adjustments-<slice>` (for example `feat/design-adjustments-s1b`). This is the primary activation signal; `OWNED` is the backstop.

**Alternatives considered**: the manual `git diff --name-only` procedure (revision 1; it depends on someone remembering it); a CI-only workflow step (it does not run in the local gate, and a YAML change is broader than a test); a pre-commit hook (local only, easy to bypass, and the repository has no hook tooling).

**Rationale**: It is mechanical, it runs everywhere the gate runs, it fails closed, and it cannot block change 4's own PRs.

---

## 3. Data Flow

```
Client batch (CalmaInquieta-media, outside the repo)
   │  recipe (tooling/media/recipes/design-adjustments.json)      ffmpeg (docs/media/pipeline.md)
   ▼                                                              ▼
pnpm media:derive ──► public/media/<area>/<id>-<w>.<hash8>.webp   public/media/video/home-loop-720.<hash8>.{mp4,webm}
   │  prints registry fragment
   ▼
site-content/infrastructure/content/media-assets.ts  +  media-rights.ts (ledger, exclusions)
   │                     │
   │   media-refs.ts ────┴──► home.ts / about.ts / contact.ts build ImageRef { src, srcSet, alt, width, height }
   ▼
repository-content-source ──► RawSiteContent { …pages, standIns, media }
   │
   ├─► validateSiteContent (domain): stand-in OR publishable media for every src/srcSet path ──► CI (repository-content.test)
   └─► createSiteContent (application): read-time gate on gallery, contact photo, loop; getLaunchGate();
           getShareImage() = shareImageOf(media) (throws) ──► every page loader ──► metaInput.shareImage
           ──► buildPageMeta: og:image, og:image:width, og:image:height
           │
           ▼
routes/home.tsx loader ──► { hero: { image: { mobile, desktop }, loop? }, … }  (plain, serializable)
   │                                │
   │ meta: buildPageMeta + artDirectedPreloads(hero.image)   ──► <link rel=preload imagesrcset media=…> ×2
   ▼
HeroSection (ui) ──► Picture (<source media=(min-width:64rem)> + <img eager high>)
                 ├─► VideoLoop (SSR: lazy poster; client: gate → IO → <video muted loop playsinline>)
                 └─► ornament: Butterfly (CSS only)
Inicio route ──► CordDivider between sections (CSS only)
```

Browser at 360 px: HTML → preload (mobile media matches) → hero 720w WebP (LCP) → fonts, CSS → lazy images and the loop poster only near the viewport → loop bytes only after hydration, motion allowed, Save-Data off and visible.

---

## 4. Contracts

### 4.1 `site-content` domain (S0a)

```ts
// src/modules/site-content/domain/media.ts
export type MediaArea = "home" | "about" | "contact" | "share" | "brand" | "video";
export type PeopleInFrame = "none" | "hands" | "faces";
export type ConsentStatus = "not-required" | "granted" | "pending";

export interface RightsEntry {
  readonly sourceId: string;                     // media-workspace base name
  readonly people: PeopleInFrame;
  readonly consent: ConsentStatus;
  /** Required when consent is "granted". */
  readonly consentSource?: { readonly by: string; readonly recordedOn: string };
}
export interface ExcludedSource {
  readonly sourceId: string;
  readonly reason: "not-the-owner" | "minor";
  readonly decidedOn: string;                    // "2026-10-16"
}
export interface ImageVariant { readonly width: number; readonly height: number; readonly path: string }
export interface ImageAsset {
  readonly kind: "image";
  readonly id: string;
  readonly sourceId: string;
  readonly area: MediaArea;
  /** Page copy (es-AR). Empty only when decorative. */
  readonly alt: string;
  readonly decorative?: true;
  readonly format: "webp" | "jpeg" | "png" | "ico";
  /** Ascending width, one aspect ratio (±1 px rounding). The largest is computed, never stored. */
  readonly variants: readonly [ImageVariant, ...ImageVariant[]];
}
export interface VideoAsset {
  readonly kind: "video";
  readonly id: string;
  readonly sourceId: string;
  readonly area: "video";
  readonly width: number;
  readonly height: number;
  readonly durationSeconds: number;
  /** Literal false: a loop never carries an audio track. */
  readonly audio: false;
  readonly sources: readonly { readonly path: string; readonly type: "video/webm" | "video/mp4" }[];
  readonly posterId: string;                     // an ImageAsset id
}
export type MediaAsset = ImageAsset | VideoAsset;
export interface MediaRegistry {
  readonly assets: readonly MediaAsset[];
  readonly rights: readonly RightsEntry[];
  readonly excluded: readonly ExcludedSource[];
}
export type MediaRule =
  | "unregistered-media" | "unpublishable-media" | "excluded-source" | "rights-missing"
  | "consent-source-missing" | "consent-required" | "alt-missing" | "variant-size"
  | "variant-order" | "media-path" | "poster-missing" | "share-image-missing";
export interface MediaIssue {
  readonly id: string;          // asset id, or the ledger row's sourceId, or "share"
  readonly rule: MediaRule;
  readonly path?: string;       // the offending variant, source or content path
  readonly sourceId?: string;   // the offending source id
}
export interface ShareImage { readonly path: string; readonly width: number; readonly height: number; readonly alt: string }

/** Lower case, with runs of "_" and whitespace turned into "-": "VID_20260717_155248707" → "vid-20260717-155248707". */
export function exclusionToken(value: string): string;
/** True when exclusionToken(value) contains the token of any excluded source. */
export function mentionsExcludedSource(value: string, excluded: readonly ExcludedSource[]): boolean;
export function isPublishable(asset: MediaAsset, registry: MediaRegistry): boolean;
export function publishedPaths(registry: MediaRegistry): ReadonlySet<string>;    // every path of every publishable asset
export function largestVariant(asset: ImageAsset): ImageVariant;
export function srcSetOf(asset: ImageAsset): string;                             // "p1 480w, p2 960w"
export function srcSetPaths(srcSet: string): readonly string[];
export function toImageRef(asset: ImageAsset, preferredWidth?: number): {        // structural ImageRef
  readonly src: string; readonly alt: string; readonly width: number; readonly height: number; readonly srcSet: string;
};
export function validateMediaRegistry(registry: MediaRegistry): readonly MediaIssue[];
/** S2b. Throws unless exactly one publishable image asset in area "share" is a single 1200x630 JPEG. */
export function shareImageOf(registry: MediaRegistry): ShareImage;
```

`validateMediaRegistry` rules (one issue per offending asset, path or ledger row; all rules run, so one asset can yield several issues):

| Rule | Fires when | Names |
|---|---|---|
| `excluded-source` | (a) an asset's `sourceId` is excluded; (b) an asset's `id`, any variant `path`, any video source `path` or its `posterId` mentions an excluded source (`mentionsExcludedSource`); (c) a **ledger row** (`RightsEntry`) has an excluded `sourceId`. It fires whatever the consent says, including `granted` | `id`, plus `sourceId` (a, c) or `path` (b) |
| `consent-source-missing` | `consent: "granted"` without `consentSource`, or with a blank `by` or `recordedOn` | `sourceId` |
| `consent-required` | `people: "faces"` with `consent: "not-required"` | `sourceId` |
| `alt-missing` | an image asset that is not `decorative` has an empty or whitespace-only `alt` | `id` |
| `variant-size` | an image variant, or a video asset, whose `width` or `height` is missing, not an integer, or not greater than 0 (the types require both; the rule protects a future non-TypeScript source, DS4) | `id`, `path` |
| `variant-order` | widths not strictly ascending, or a variant's ratio differs from the first by more than 1 px of rounding (evaluated only when `variant-size` passed) | `id` |
| `media-path` | a path not matching `^/media/<area>/<id>-\d+\.[0-9a-f]{8}\.(webp\|jpg\|png\|mp4\|webm)$` with `<area>` and `<id>` equal to the asset's, except the brand `ico` asset at `/favicon.ico` | `id`, `path` |
| `poster-missing` | a video's `posterId` is not a registered image asset | `id` |

Duplicate asset ids are reported by the existing `duplicate-id` rule of `validateSiteContent` (AD3). `share-image-missing` is a content-level rule (from S2b): `validateSiteContent` reports it with id `"share"` under exactly the conditions where `shareImageOf` throws, so CI fails before any request can.

The exclusion check is layered. `EXCLUDED_SOURCES` is the only place an excluded id may appear, and every other place a visitor or the repository could see one is checked: registry entries and ledger rows (`validateMediaRegistry`), page references (`validateSiteContent`, AD3, first rule), file names under `public/media/**` including `stand-ins/` and every recipe `source` (parity test, S0b; `parseRecipe`, T0a).

`rights-missing` is reported by the content walk in `validateSiteContent`, not by `validateMediaRegistry`: a path referenced by content whose asset has no `RightsEntry` yields `rights-missing` (more precise than `unpublishable-media`). Registering a pending asset is allowed; it fails CI only when content references it, and until then it is listed in `getLaunchGate().unpublishedMedia`.

```ts
// src/modules/site-content/domain/page-content.ts (additive hunks)
export interface ImageRef { readonly src: string; readonly alt: string; readonly width: number; readonly height: number; readonly srcSet?: string }
export interface ArtDirectedImage { readonly mobile: ImageRef; readonly desktop: ImageRef }                 // S1b
export interface AmbientLoop {                                                                               // S3b
  readonly poster: ImageRef;                                                                                 // alt ""
  readonly sources: readonly { readonly src: string; readonly type: "video/webm" | "video/mp4" }[];
  readonly width: number; readonly height: number;
}
// HomePageContent.hero: `images: readonly ImageRef[]` → `image: ArtDirectedImage` (S1b) and `loop?: AmbientLoop` (S3b)
// ContactPageContent: `photo?: ImageRef` (S5)
// RawSiteContent: `media: MediaRegistry` (S0a)
// ContentIssue.rule: existing rules | MediaRule (S0a)

// src/modules/site-content/domain/content-rules.ts (S0a, except where marked)
export function isPublishedPath(path: string, content: RawSiteContent): boolean;   // stand-in or publishable media
export function publishedImages<T extends ImageRef>(images: readonly T[], content: RawSiteContent): readonly T[];
export function summarizeLaunchGate(standIns: readonly StandInAsset[], media: MediaRegistry): LaunchGate;   // S2b
export interface LaunchGate {
  readonly imageStandIns: readonly StandInAsset[];
  readonly fontStandIns: readonly StandInAsset[];
  readonly unpublishedMedia: readonly string[];
}
```

### 4.2 `site-content` application and module API

```ts
// src/modules/site-content/application/site-content.ts
export interface SiteContent {
  /* existing members */
  /** Image stand-ins, font stand-ins and unpublished media, for the launch checklist. */
  getLaunchGate(): Promise<LaunchGate>;                                         // S2b
  /** The registered share image; throws when the registry has no publishable 1200x630 JPEG (AD15). */
  getShareImage(): Promise<ShareImage>;                                         // S2b
}
// getAboutPage(): gallery = publishedImages(about.gallery, raw)                // S0a
// getHomePage(): hero.loop dropped unless every path is published              // S3b
// getContactPage(): photo dropped unless published                             // S5
```

`index.ts` re-exports the new domain types (`ArtDirectedImage`, `AmbientLoop`, `LaunchGate`, `ShareImage`, `MediaAsset`, `ImageAsset`, `VideoAsset`, `RightsEntry`, `MediaRegistry`) and nothing from `infrastructure`.

### 4.3 Infrastructure content helpers

```ts
// src/modules/site-content/infrastructure/content/media-assets.ts
export const MEDIA_ASSETS = [ /* section 6 */ ] as const satisfies readonly MediaAsset[];
export type MediaAssetId = (typeof MEDIA_ASSETS)[number]["id"];

// src/modules/site-content/infrastructure/content/media-refs.ts
export function imageRef(id: ImageAssetId, preferredWidth?: number): ImageRef;            // throws on a video id (programming error)
export function artDirected(mobile: ImageAssetId, desktop: ImageAssetId): ArtDirectedImage;
export function loopRef(id: VideoAssetId): AmbientLoop;                                   // poster from posterId, alt ""
```

### 4.4 `ui` components (structural props; React and `react-router` only)

```ts
// atoms/image.tsx (S1a): existing props + `intrinsicRatio?: boolean` (default true)

// atoms/picture.tsx (S1a)
type PictureSource = { media: string; srcSet: string; width: number; height: number };
type PictureProps = ImageProps & {                // ImageProps = the Image atom's props (src, alt, width, height, srcSet, …)
  sources: readonly PictureSource[];
  sizes: string;                                   // required: applies to every source and the img
  pictureClassName?: string;
};

// organisms/hero-section.tsx (S1b, S3b, S4)
type Img = { src: string; alt: string; width: number; height: number; srcSet?: string };
type HeroProps = {
  eyebrow: string; title: ReactNode; subtitle: string; bajada: string;
  image: { mobile: Img; desktop: Img };
  loop?: { poster: Img; sources: readonly { src: string; type: string }[]; width: number; height: number };   // S3b
  ornament?: ReactNode;                                                                                       // S4
};
export const HERO_DESKTOP_MEDIA: string;
export const HERO_MOBILE_MEDIA: string;
export const HERO_STILL_SIZES: string;

// molecules/video-loop.tsx (S3a)
type VideoLoopProps = {
  poster: { src: string; width: number; height: number; srcSet?: string };   // rendered with alt=""
  sizes: string;
  sources: readonly { src: string; type: string }[];
  width: number; height: number;                                            // tile aspect ratio
  className?: string;
};

// atoms/cord-divider.tsx, atoms/butterfly.tsx (S4): no props except optional className

// organisms/about-teaser.tsx (S5): existing props + `image?: Img`
// organisms/trust-row.tsx (S5): Claim = { id: string; label: string; icon: "hands" | "leaf" | "heart" | "group" }
// organisms/gallery-grid.tsx (S2): GalleryEntry gains `srcSet?: string`
```

`GalleryGrid` sizes: thumbnails `(min-width: 90rem) 28rem, (min-width: 48rem) 31vw, 46vw`; lightbox `(min-width: 48rem) 46rem, 100vw` (the browser picks at most the largest variant, which is the lightbox cap).

### 4.5 Delivery

```ts
// src/app/media/preload.ts (S1a)
export type PreloadDescriptor = { tagName: "link"; rel: "preload"; as: "image"; imageSrcSet: string;
  imageSizes: string; media: string; fetchPriority: "high" };
export function artDirectedPreloads(
  image: { mobile: { srcSet?: string; src: string }; desktop: { srcSet?: string; src: string } },
  options: { sizes: string; mobileMedia: string; desktopMedia: string },
): readonly PreloadDescriptor[];     // without srcSet, `src` is used as a single-candidate imageSrcSet

// src/app/seo/meta.ts (S2b; AD14 hunks, AD15)
export type ShareImage = { path: string; width: number; height: number };   // structural
export type PageMetaInput = { /* existing fields, change 4's ogImage? */ shareImage: ShareImage };
// buildPageMeta(input):
//   throws "Share image must not be empty" when input.shareImage.path is blank
//   { property: "og:image", content: canonicalUrl(input.baseUrl, input.ogImage ?? input.shareImage.path) }
//   when input.ogImage is absent: { property: "og:image:width", content: "1200" }, { property: "og:image:height", content: "630" }
//   (the values are String(shareImage.width) and String(shareImage.height))
```

---

## 5. Visual direction (for the front-end implementer)

### 5.1 Hero layout (final state after S4)

```tsx
<section aria-labelledby="hero-title"
  className="relative grid items-center gap-8 overflow-x-clip py-section lg:grid-cols-12 lg:gap-x-12">
  <div className="flex flex-col items-start gap-6 lg:col-span-6 xl:col-span-5">…eyebrow, h1, subtitle, CTAs, bajada…</div>
  <div className="contents lg:relative lg:col-span-6 lg:block lg:w-full lg:max-w-md lg:justify-self-end xl:col-span-7">
    <div className="relative order-first mx-auto w-full max-w-md lg:order-none">
      <Picture … className="h-auto w-full rounded-sm object-cover aspect-4/5 lg:aspect-3/4"
        aboveTheFold fetchPriority="high" sizes={HERO_STILL_SIZES} />
      {ornament /* Butterfly: absolute -top-5 right-6 z-10, lg:-top-6 */}
    </div>
    {loop && <VideoLoop … className="order-last mx-auto w-full max-w-md
        lg:absolute lg:-bottom-8 lg:-left-8 lg:w-40 lg:ring-8 lg:ring-canvas xl:w-48" />}
  </div>
</section>
```

- `contents` makes the still and the loop direct grid items on phones, so `order-first` puts the still above the text and `order-last` puts the loop after it. From `lg` the wrapper is a positioned block, and the loop overlaps the still's lower-left corner by 2rem, framed by an 8 px `canvas` ring, collage-style.
- Fit check: at 360x740 the still is 320x400 and ends near y = 72 (header) + 48 (padding) + 400 = 520 < 740. At 1024x768 the still is 448x597 and ends near 72 + 73 + 597 = 742 < 768. At 1440x900 it ends near 759 < 900.
- Until S3b there is no loop; until S4 there is no ornament. The still keeps its final geometry from S1b.
- Loop tile `sizes`: `(min-width: 80rem) 12rem, (min-width: 64rem) 10rem, (min-width: 30rem) 28rem, calc(100vw - 2.5rem)`.

### 5.2 `CordDivider`

- **Look**: a paper cord seen from the side: two strands twined around each other, like the cord the studio weaves. Two sine strands of the same period with opposite phase cross every 15 px along a 320x24 box; each strand is a stroke of 1.5 px, round caps, no fill. At each end a small knot: a circle of radius 2.5 at x = 6 and x = 314 (stroke only). Color `text-tan-400` via `currentColor`.
- **Geometry**: strand A starts at (12, 12) and alternates cubic curves with control points 7.5 px above and below the axis (amplitude 6 px) every 15 px up to x = 308; strand B is the mirror (starts below). The component builds the two `d` strings once at module scope with a small pure helper `twinedStrand(phase)` (unit-tested for start, end and period), so no long literal sits in the source.
- **Box**: `<div aria-hidden="true" className="flex justify-center py-2">` with `<svg className="h-6 w-full max-w-80" viewBox="0 0 320 24" focusable="false">`; narrower containers scale the drawing down (`xMidYMid meet`).
- **Motion** (`motifs.css`, inside `@media (prefers-reduced-motion: no-preference)` and `@supports (animation-timeline: view())`): each strand has `pathLength="1"`; `stroke-dasharray: 1`, `animation: motif-draw linear both`, `animation-timeline: view()`, `animation-range: entry 10% cover 35%`; strand B uses `entry 20% cover 45%`, so the second strand follows the first like a cord being wound. Without support or under `reduce`, the full cord is static.
- **Placement on Inicio (decided in revision 2)**: a cord separates the major sections. The trust row is **not** a major section: it is a slim strip of claims that closes the hero. So the hero and the trust row form one opening group, and there is **never a cord between the hero and the trust row**. When the trust row renders, the first cord sits **between the trust row and the showcases**; when it does not render, that same cord sits directly after the hero. Reasons: the claims back up the hero's promise and read as its footnote, and a cord between them would put two ornaments (the butterfly and a cord) inside the first phone viewport and split the claims from what they support.
  - JSX positions in `home.tsx`, all outside the change-4 catalog block (AD14): (1) right after `<TrustRow …/>`; (2) right after the catalog block (`{data.catalogFailed ? null : (…)}`), rendered only when `!data.catalogFailed`; (3) right after `<TestimonialsSection …/>`, before `<ContactBand …/>`. `TrustRow` renders nothing without claims, so position 1 falls right after the hero without a condition. `TestimonialsSection` renders nothing without items, so position 3 falls after the teaser.
  - Resulting order:

    | Catalog | Trust row | Testimonials | Order |
    |---|---|---|---|
    | read | renders | any | hero, trust row, **cord**, showcases, **cord**, teaser, (testimonials), **cord**, contact band |
    | read | empty | any | hero, **cord**, showcases, **cord**, teaser, (testimonials), **cord**, contact band |
    | failed | renders | any | hero, trust row, **cord**, teaser, (testimonials), **cord**, contact band |
    | failed | empty | any | hero, **cord**, teaser, (testimonials), **cord**, contact band |

  - There are never two cords in a row, no cord between the teaser and the testimonials, and none after the contact band (never directly above the footer). `home.ui.test.tsx` (S4) pins the four rows of the table: the cord count (3, 3, 2, 2), and through `compareDocumentPosition`, that the first cord follows the trust row when it renders and that no cord sits between the `h1` section and the trust row.

### 5.3 `Butterfly`

- **Look**: a line-drawn butterfly in the icon style: `viewBox="0 0 48 40"`, `stroke="currentColor"` (`text-clay-800`), stroke 1.5, round joins. Body: a capsule from (24, 11) to (24, 31), 3 px wide. Antennae: two short curves from (24, 11) to (20, 4) and (28, 4), each ending in a dot of radius 1. Forewings: rounded teardrops from the body at y = 14-20 out to the upper corners (tips near (5, 7) and (43, 7)); hindwings: smaller lobes from y = 21-28 down to (11, 34) and (37, 34). Wings filled with `fill-sand-300`, one vein line per forewing. Left wings in `<g className="motif-wing motif-wing-left">`, right wings in `<g className="motif-wing motif-wing-right">`.
- **Size and perch**: `size-7` on phones, `lg:size-10`; absolutely positioned on the still's upper-right corner (`-top-5 right-6`, `lg:-top-6`), above the photo (`z-10`), `pointer-events-none`.
- **Flight** (`motif-flight`, 4.5 s, `cubic-bezier(.45, .05, .35, 1)`, delay 0.8 s, one iteration, `both`): from `translate(calc(var(--motif-fly) * -140px), calc(var(--motif-fly) * 120px)) rotate(-10deg)` at opacity 0, through three waypoints (−90/30, −40/70, −8/6 times the factor, with small rotations of +8, −6 and +4 degrees), to `translate(0, 0) rotate(0)` at the perch. `--motif-fly` is `.5` on phones and `1` from `lg`, so the path stays over the photo and never crosses the `h1`. `will-change: transform` only on the flying wrapper.
- **Flap** (`motif-flap`): `scaleX(1)` to `scaleX(.35)`, 0.28 s, `alternate`, 16 iterations, `transform-box: fill-box`, `transform-origin` at the body edge of each wing; it ends with the wings open.
- **Reduced motion**: no animation declared; the butterfly rests at the perch.

### 5.4 Other visual changes

- **TrustRow**: renders each claim's own icon; `Icon` gains `hands` (two cupped hands), `leaf` (leaf with a midrib), `heart` and `group` (three heads and shoulders), drawn on the 24x24 grid in the existing 1.75 stroke style. (The row stays hidden on the live site until the claims are approved.)
- **AboutTeaser**: from `lg`, two columns (text, then a 4:5 image at most 24rem wide); on phones the image follows the text. Lazy. `sizes`: `(min-width: 64rem) 24rem, calc(100vw - 2.5rem)`.
- **Contacto**: from `lg`, the contact block on the left and the facade photo (3:4, at most 28rem) on the right; on phones the photo follows the directions button. Lazy (it is below the fold on phones).

---

## 6. Asset plan

| Asset id | Source | Area | Frame | Widths | Rights | Slice |
|---|---|---|---|---|---|---|
| `home-hero-mobile` | `img-20260819-174607732-hdr` | home | 4:5 crop, focus on the disc | 480, 720, 1080 | none | S0b |
| `home-hero-desktop` | same | home | native 3:4 | 480, 960, 1600 | none | S0b |
| `share-default` | same | share | 1200x630 crop, JPEG (PD-5) | 1200 | none | S2b |
| `about-espacio` | `img-20260530-wa0021` | about | native 3:4 | 480, 960 | none | S2 |
| `about-manos-aro` | `img-20260411-wa0106` | about | native (900x1600) | 480, 900 | hands | S2 |
| `about-espejo-flecos` | `img-20260530-wa0026` | about | native 3:4 | 480, 960 | none | S2 |
| `about-mesa-taller` | `img-20260419-wa0044` | about | native 3:4 | 480, 960 | none | S2 |
| `about-macrame` | `img-20260530-wa0032` | about | native 3:4 | 480, 960 | none | S2 |
| `about-ceramica-manos` | `img-20261015-wa0029` | about | native 3:4 | 480, 960 | hands | S2 |
| `about-cuenco-tejido` | `img-20260709-wa0009` | about | native 3:4 | 480, 960 | none | S2 |
| `about-acuarela` | `img-20260912-131514909-hdr` | about | native 3:4 | 480, 960, 1600 | none | S2 |
| `about-comunidad` | `img-20261015-wa0030` | about | native 4:3 | 480, 960, 1600 | faces, granted (OD-6) | S2 |
| `about-jarrones` | `img-20260511-wa0019` | about | native (1280x1038) | 480, 960 | none | S2 |
| `home-loop-poster` | `vid-20261014-185300580`, frame 0 | video | 4:5 | 480, 720 | none (first 6 s) | S3b |
| `home-loop` | `vid-20261014-185300580` | video | 720x900, 6 s, WebM + MP4 | 720 | none (first 6 s) | S3b |
| `home-teaser` | `img-20260411-wa0013` | home | 4:5 crop | 480, 800 | none | S5 |
| `contact-fachada` | `img-20260530-wa0019` | contact | native 3:4 | 480, 960 | none | S5 |
| `favicon` | `logo-calma-inquieta-sin-fondo` | brand | ICO 16, 32, 48 at `/favicon.ico` | 48 | none | S5 |
| `icon-192` | same | brand | PNG, transparent | 192 | none | S5 |
| `apple-touch-icon` | same | brand | PNG on `sand-200`, 12 % padding | 180 | none | S5 |

- Gallery order follows the curation (1 to 10). The curation reserves are **not** registered or shipped.
- Alt texts are drafted in es-AR by the slice that registers the asset, from the curation descriptions, and pass the copy rules. Example (hero): "Pieza circular tejida con cuerda de papel kraft, con el centro oscuro, colgada frente a una reja".
- The ledger records all four OD-6 face sources (only `img-20261015-wa0030` is placed), the PD-6 hands sources (including the catalog picks, which are not placed here), and every placed `none` source, including `logo-calma-inquieta-sin-fondo`. The three exclusions live only in `EXCLUDED_SOURCES`, never as ledger rows (`excluded-source`, section 4.1).
- The favicon origin note lives in `docs/media/pipeline.md` § "Brand assets" (S5; AD6), backed by the recipe `source` and the registry `sourceId`.

**Budgets** (asserted by the parity test): each image file at most 500 KB; each video file at most 1.5 MB (1,572,864 bytes); all curated files together at most 8 MB. Expected total about 6.3 MB (hero 1.0, gallery 2.8, OG 0.13, teaser 0.16, contact 0.08, loop 1.7 with poster, brand 0.04). No Git LFS (revisit above 20 MB). Retired stand-ins stay in history (accepted).

**Video checks** (parity test, no decoder needed): the MP4 has no `hdlr` box whose handler type is `soun`; the WebM contains no `A_OPUS` or `A_VORBIS` codec id; both at most 1.5 MB; `durationSeconds` at most 6.

---

## 7. Content swap plan and pinned tests

| Slot | Before | After | Slice | Pinned tests that change |
|---|---|---|---|---|
| Hero | 3 stand-ins (`hero-1..3`), collage, two hidden eager on phones | `artDirected("home-hero-mobile", "home-hero-desktop")`, `Picture`, preload | S1b | `src/app/ui/organisms/hero.ui.test.tsx` (rewritten: one `img`, `<source>` attributes, eager and high, no `max-md:hidden`); `src/app/routes/home.ui.test.tsx` (fixture `hero.images` → `hero.image`); `src/modules/site-content/infrastructure/repository-content.test.ts` ("offers the two Inicio calls to action": `hero.images` length 3 → the art-directed paths are published); `src/modules/site-content/infrastructure/stand-in-assets.test.ts` ("the studio photos": the content walk drops the hero); `src/modules/site-content/domain/content-rules.test.ts` ("flags a hero image without alt" uses `hero.image.mobile`); `src/testing/fakes/in-memory-site-content-source.ts` (fake hero shape) |
| Gallery | 5 stand-in entries (`gallery-01`, `gallery-02`, and `hero-1..3` reused) | 10 curated, `srcSet`, lightbox at the largest variant | S2 | `repository-content.test.ts` (gallery 5 → 10; stand-ins 12 → 8); `stand-in-assets.test.ts` (photo rows → `["gallery-01"]`; media rows 8 → 4; content walk → none); `src/app/ui/organisms/gallery-grid.ui.test.tsx` (new `srcset`/`sizes` cases) |
| Retired in S2 | `hero-1`, `hero-2`, `hero-3`, `gallery-02` rows and files | — | S2 | (above) |
| Share image | `/media/stand-ins/share-default.jpg` (profile picture on sand) via the `SHARE_IMAGE_PATH` literal | `getShareImage()` → `/media/share/share-default-1200.<hash>.jpg`, plus `og:image:width`/`og:image:height` | S2b | `src/app/seo/meta.test.ts` (input fixture gains `shareImage`; size tags; blank path throws); `src/app/routes/coming-soon.test.ts` (`og:image` from the fake share asset); `home.test.ts`, `about` and `contact` route tests (`og:image` present); `repository-content.test.ts` (`getShareImage()` is a 1200x630 JPEG under `/media/share/`; stand-ins 8 → 7; launch gate); `stand-in-assets.test.ts` ("registers one favicon and one share image" → favicon only; "ships a 48 px favicon and a 1200 by 630 share image" → favicon only; media rows 4 → 3) |
| Retired in S2b | `share-default` stand-in row and file | — | S2b | (above) |
| Loop | none | `loopRef("home-loop")` | S3b | `hero.ui.test.tsx` (loop tile present, after the text in DOM order); `home.ui.test.tsx` |
| Teaser | `about-teaser.svg` declared, not rendered | `imageRef("home-teaser")`, rendered | S5 | `src/app/ui/organisms/home-sections.ui.test.tsx` (teaser with image); `stand-in-assets.test.ts` ("the SVG compositions" removed: no SVG left; media rows 3 → 2); `repository-content.test.ts` (stand-ins 7 → 6) |
| Contacto | no photo | `imageRef("contact-fachada")` | S5 | `src/app/routes/contact.ui.test.tsx`, `src/app/routes/contact.test.ts` (photo present, lazy) |
| Favicon | `/media/stand-ins/favicon.png` (48 px) | `/favicon.ico` + `icon-192` + `apple-touch-icon` | S5 | `src/app/root.test.ts` ("includes the stand-in favicon" → the three registered links); `stand-in-assets.test.ts` (profile-picture `describe` removed; media rows 2 → 1); `repository-content.test.ts` (stand-ins 6 → 5) |
| TrustRow | `icon="arrow"` for every claim | `claim.icon` | S5 | `home-sections.ui.test.tsx` (icon per claim); `src/app/ui/atoms/icon.ui.test.tsx` (four new names) |

Test fixtures in `src/testing/fixtures/ui.ts` keep their stand-in-like strings: they are fake data and load no file.

---

## 8. Launch gate

| After | `imageStandIns` | `fontStandIns` | `unpublishedMedia` |
|---|---|---|---|
| main today | `hero-1..3`, `about-teaser`, `gallery-01`, `gallery-02`, `favicon`, `share-default` (8) | 4 | — |
| S2b (first slice where `getLaunchGate` exists) | `about-teaser`, `gallery-01`, `favicon` (3) | 4 | `[]` |
| S5 | **`gallery-01`** (catalog fallback; post-change-4 follow-up) | 4 (brand typefaces not confirmed) | `[]` |

The S5 PR adds the assertion `imageStandIns` ids `== ["gallery-01"]` and `unpublishedMedia == []` to `repository-content.test.ts`. The launch itself (change 8) still needs fonts and the fallback resolved; this change does not claim a zero count.

---

## 9. Slice plan (one PR each, stacked to `main` in order)

### Lean delivery (owner decision 2026-10-16)

The owner wants this change shipped fast this week. Every user-visible outcome is kept (art-directed hero and LCP rules, curated photos and content swap, hero loop with pause and reduced-motion/Save-Data handling, cord dividers, butterfly, trust icons and TrustRow fix, favicon from the raster logo, the registry with its consent ledger and validation rules, the launch-gate criterion). Only process and plumbing change. `tasks.md` is the authoritative slicing; the slice table below is superseded for slicing and kept for line-forecast history.

| Dropped or replaced | Replacement |
|---|---|
| **AD16 and slice T1** (`tooling/change-seams.ts` and its test) | A manual PR checklist item: `git diff --name-only origin/main...HEAD` is pasted in the PR body and checked against the AD14 lists (each `tasks.md` phase carries its seam sheet). The two threat-matrix rows that exist only because of the guard (section 12: "Git repository selection" and "Commit state") are dropped; every row of section 12 is now N/A. Hunk discipline in shared files stays a review item, as before |
| **T0a and T0b** (derive pipeline split in two) | At most one small optional tooling PR (`DA-1`): only what `pnpm media:optimize` (PR #51) does not already do (art-directed crops, the OG JPEG, the favicon ICO set, hashed names). The loop uses the documented ffmpeg commands in `docs/media/pipeline.md`. If it is smaller, `DA-1` is skipped and the same steps are documented as manual commands in `pipeline.md` (carried by DA-2) |
| 13 slices (T1, T0a, T0b, S0a, S0b, S1a, S1b, S2, S2b, S3a, S3b, S4, S5; S3c conditional) | 7 PRs, stacked to `main`: `DA-1` (optional tooling), `DA-2` (S0a + S0b: registry, ledger, validation, all curated images, parity test), `DA-3` (S1a + S1b: `Picture`, preload, hero), `DA-4` (S2 + S2b + the teaser and Contacto parts of S5: content swap, OG, launch gate), `DA-5` (S3a + S3b: loop), `DA-6` (S4: motifs), `DA-7` (rest of S5: icons, TrustRow, favicon). S3c (Worker range fallback) stays conditional (`DA-5b`). Each PR targets about 400 authored production lines, tests and docs on top (`size:exception` only when tests or docs push the total over budget) |

**Share image default (replaces AD15's reader path and question 3).** The default share image is a constant exported by the `site-content` module API (`DEFAULT_SHARE_IMAGE`, declared in `domain/media.ts` as `{ path, width: 1200, height: 630, alt }`). The registry asset `share-default` is built from that constant's path, so there is one source for the value. `buildPageMeta` reads the default itself: `og:image` is `canonicalUrl(baseUrl, input.ogImage ?? DEFAULT_SHARE_IMAGE.path)`, and `og:image:width`/`og:image:height` are emitted whenever no `ogImage` override is given. `PageMetaInput` gains no field, `getShareImage()` and the four page-loader statements are dropped, and **no route file is edited**: the catalog routes (`talleres`, `taller`, `intensivos`, `intensivo`) that call `buildPageMeta` without a share image get the registry share image for free, so AD14's conditional catalog-route seam and open question 3 disappear. The AD15 CI guarantee is kept through registry validation: `validateSiteContent` reports `share-image-missing` (id `"share"`) when the registry does not hold exactly one publishable 1200x630 JPEG in area `share` whose path equals `DEFAULT_SHARE_IMAGE.path`, so a missing, pending, excluded or mismatched share image fails `repository-content.test.ts` before deploy. The `og:image` content expression in `meta.ts` stays the one shared line with change 4, with the fixed merged form above.

Forecasts are authored lines (additions plus deletions), excluding binaries, split into production / tests / docs and config. The review budget is 400 per PR.

| Slice | Content | Needs | Prod | Tests | Docs/config | Total |
|---|---|---|---|---|---|---|
| **T1** | Seam guard: `tooling/change-seams.ts` (`UNTOUCHED`, `OWNED`, `isGuardActive`, `protectedChanges`, `isSafeRef`) and `change-seams.test.ts` (AD16) | — (lands first) | 50-70 | 70-100 | — | 120-170 |
| **T0a** | `tooling/media/derive-plan.ts`: `cropBox`, `deriveWidths`, `hashedName`, `encodeIco`, `parseRecipe`, with `derive-plan.test.ts` | `chore/media-optimize-images` merged | 95-115 | 120-150 | — | 215-265 |
| **T0b** | `tooling/media/derive.ts` (sharp I/O), one I/O test on a generated 64x48 image in a temp folder, `media:derive` script, `docs/media/pipeline.md` | T0a | 80-110 | 40-60 | 60-80 | 180-250 |
| **S0a** | `domain/media.ts` (types, gate, helpers, `validateMediaRegistry` with all section 4.1 rules, exclusion tokens), `content-rules` integration, `page-content` hunks (`srcSet`, `media`, rules), `getAboutPage` gate, empty fake registry | T1 | 140-185 | 160-205 | — | 300-390 |
| **S0b** | `media-rights.ts`, `media-assets.ts` + `media-refs.ts` (hero assets), recipe, `_headers`, parity test (hash, dimensions, budgets, headers, excluded tokens in every file name and recipe source), image-size test helper | S0a (T0b or the worktree fallback) | 90-130 | 120-160 | 30-40 | 240-330 (+1.0 MB) |
| **S1a** | `Picture`, `Image.intrinsicRatio`, `artDirectedPreloads` | T1 | 50-70 | 90-120 | — | 140-190 |
| **S1b** | `HeroSection` rewrite, `HeroCollage` deleted, `ArtDirectedImage` content, `home.ts` hero, `home.tsx` meta preload, pinned hero tests | S0b, S1a | 130-180 | 140-190 | — | 270-370 |
| **S2** | 10 gallery assets, `about.ts`, `GalleryGrid` `srcSet` and `sizes`, 4 stand-ins retired (`hero-1..3`, `gallery-02`), pinned tests | S1b | 135-185 | 80-130 | 5 | 220-320 (+2.8 MB) |
| **S2b** | Share asset, `shareImageOf`, `share-image-missing`, `getShareImage`, `meta.ts` (`shareImage`, size tags), `shareImage` in the four page loaders, `summarizeLaunchGate` and `getLaunchGate`, `share-default` stand-in retired, pinned tests | S2; question 3 answered if C4-F1 or C4-F2 is on `main` | 105-140 | 185-230 | 1 | 290-370 (+0.13 MB) |
| **S3a** | `VideoLoop` molecule, microcopy, browser stubs for tests | S1a | 100-130 | 160-210 | — | 260-340 |
| **S3b** | Loop and poster assets, `AmbientLoop`, `loopRef`, reader gate, hero loop slot, preview range check | S3a, S1b | 60-90 | 60-90 | 10 | 130-190 (+1.8 MB) |
| **S3c** (conditional) | Only if the S3b range check answers `200`: `src/platform/range.ts` (`rangeResponse`), the `workers/app.ts` call before React Router, `wrangler.jsonc` `run_worker_first: ["/media/video/*"]`, RED tests for single, suffix, open-ended, multiple (full 200), unsatisfiable (416) and HEAD ranges | S3b verify result | 60-90 | 80-110 | 5 | 145-205 |
| **S4** | `CordDivider`, `Butterfly`, `motifs.css`, hero `ornament` slot, Inicio placements (5.2 table), CSS scan test | S1b | 130-180 | 80-135 | — | 210-315 |
| **S5** | Icons, TrustRow fix, teaser image, Contacto photo, favicon set and its `pipeline.md` "Brand assets" section, 2 stand-ins retired (`about-teaser`, `favicon`), launch-gate assertion, deviation rows | S0b, S1b, S2, S2b; deviation rows after C4-F4 | 130-180 | 110-160 | 20-30 | 260-370 (+0.3 MB) |
| **Total** | 13 PRs (14 with S3c) | | | | | **2,835-3,870** (2,980-4,075 with S3c) |

The proposal forecast 1,400-1,910; the difference is mostly tests (strict TDD), the registry data, the seam guard and the registry-backed share image, now counted.

**Why S5 needs S2 and S2b**: S5 rewrites the stand-in counts and the `stand-in-assets.test.ts` rows that S2 and S2b leave behind (7 → 5, media rows 3 → 1), and its launch-gate assertion calls `getLaunchGate()`, which S2b introduces.

**T0 re-check (revision 2)**: a line-by-line forecast of revision 1's single T0 gives prod 175-220 (plan 95-115, I/O 80-110), tests 160-210 (plan 120-150, I/O 40-60) and docs 61-81, so 396-511 lines. That passes 400 in most of its range, and the old split rule (move `encodeIco` to S5) would have put tooling into a product slice already near its own limit. T0 is therefore split up front into T0a (pure plan) and T0b (I/O and docs). Both are independent of the product slices except through S0b's outputs.

**Split rules if a slice still passes 400 during apply**: T0b moves the ffmpeg section of `pipeline.md` to S3b; S0a moves `publishedImages` and the `getAboutPage` gate to S0b; S0b moves `_headers` and its test to S1a; S1b moves the `meta` preload wiring to S1c; S2b moves `summarizeLaunchGate` and `getLaunchGate` to S2c (S5 then needs S2c); S4 moves `Butterfly` and the `ornament` slot to S4b; S5 moves Contacto and the favicon to S5b. Each split keeps the moved tests with the moved code.

**Rollback** (`git revert <merge>` on `main`, newest first; the preview is private and unindexed):

| Slice | Revert effect | Revert first |
|---|---|---|
| T1 | Removes the seam guard; no runtime effect | — |
| T0a | Removes the derive plan | T0b |
| T0b | Removes `media:derive`; committed outputs stay valid | — |
| S0a | Removes the registry types and gate | S0b and everything after |
| S0b | Removes the hero assets, ledger, header rules | S1b, S2, S2b, S3b, S5 |
| S1a | Removes `Picture` and the preload builder | S1b |
| S1b | Restores `HeroCollage` and the stand-in hero | S2, S2b, S3b, S4, S5 |
| S2 | Restores the stand-in gallery and its four files | S2b, S5 |
| S2b | Restores the `SHARE_IMAGE_PATH` literal and the stand-in share image; removes `getShareImage` and `getLaunchGate` | S5; any change-4 route that passes `shareImage` drops it in the same revert (question 3) |
| S3a | Removes `VideoLoop` | S3b |
| S3b | Removes the loop; the hero keeps the still | S3c |
| S3c | Removes the Worker range fallback; Safari keeps the poster | — |
| S4 | Removes the motifs; `Divider` unchanged | — |
| S5 | Restores the arrow icons, text-only teaser, Contacto without photo, the `about-teaser` and favicon stand-ins | — |

Emergency: `wrangler rollback` (owner credentials), then the revert.

**Collision check per PR (automated)**: the T1 seam guard (AD16) runs in every gate and in CI. It fails a design-adjustments PR whose committed, staged, unstaged or untracked changes include an AD14 untouched path, naming each path. Hunk discipline inside the shared files (AD14 table) stays a review item: the PR body lists the shared files touched and the hunk names from AD14.

---

## 10. File Changes

| File | Action | Slice | Description |
|---|---|---|---|
| `tooling/change-seams.ts`, `change-seams.test.ts` | Create | T1 | Seam guard (AD16) |
| `tooling/media/derive-plan.ts`, `derive-plan.test.ts` | Create | T0a | Crop box, widths, hashed names, ICO encoder, recipe parsing with the exclusion check |
| `tooling/media/derive.ts`, `derive.test.ts` | Create | T0b | sharp I/O, writes `public/media/<area>/`, prints the registry fragment |
| `package.json` | Modify | T0b | `media:derive` script |
| `docs/media/pipeline.md` | Create / Modify | T0b, S5 | How to run derive, recipe format, ffmpeg commands, budgets; "Brand assets" section with the favicon origin (S5) |
| `tooling/media/recipes/design-adjustments.json` | Create / Modify | S0b, S2, S2b, S3b, S5 | One job per asset |
| `src/modules/site-content/domain/media.ts`, `media.test.ts` | Create / Modify | S0a, S2b | Types, gate, helpers, registry validation, exclusion tokens; `shareImageOf` (S2b) |
| `src/modules/site-content/domain/content-rules.ts`, `.test.ts` | Modify | S0a, S1b, S2b, S3b, S5 | Path rule per image, media issues, `publishedImages`; `share-image-missing` and launch gate (S2b) |
| `src/modules/site-content/domain/page-content.ts` | Modify | S0a, S1b, S3b, S5 | Additive hunks (AD14) |
| `src/modules/site-content/application/site-content.ts`, `.test.ts` | Modify | S0a, S2b, S3b, S5 | Read-time gate; `getShareImage`, `getLaunchGate` (S2b) |
| `src/modules/site-content/index.ts` | Modify | S0a, S1b, S2b, S3b | Type re-exports |
| `src/modules/site-content/infrastructure/content/media-assets.ts` | Create / Modify | S0b, S2, S2b, S3b, S5 | Registry data |
| `src/modules/site-content/infrastructure/content/media-rights.ts` | Create / Modify | S0b, S2, S2b, S3b, S5 | Ledger and exclusions; rows for the sources each slice places |
| `src/modules/site-content/infrastructure/content/media-refs.ts` | Create | S0b | `imageRef`, `artDirected`, `loopRef` |
| `src/modules/site-content/infrastructure/media-assets.test.ts` | Create | S0b | Parity, hash, dimensions, budgets, audio, headers, excluded tokens in file names and recipe sources |
| `src/modules/site-content/infrastructure/repository-content-source.ts` | Modify | S0a, S0b | `media` wiring (empty in S0a, real constants in S0b) |
| `src/modules/site-content/infrastructure/content/{home,about,contact}.ts` | Modify | S1b, S2, S3b, S5 | Content swap |
| `src/modules/site-content/infrastructure/content/stand-in-assets.ts` | Modify | S2, S2b, S5 | Rows retired |
| `src/modules/site-content/infrastructure/{stand-in-assets,repository-content}.test.ts` | Modify | S0b, S1b, S2, S2b, S5 | Pinned assertions (section 7); image-size import (S0b) |
| `src/testing/fakes/in-memory-site-content-source.ts` | Modify | S0a, S1b, S2b, S3b, S5 | Empty registry default, hero shape, share asset, loop, contact photo |
| `src/testing/media/image-size.ts` | Create | S0b | JPEG, PNG, WebP dimension readers (moved from `stand-in-assets.test.ts`) |
| `src/testing/ui/browser-stubs.ts` | Create | S3a | `matchMedia`, `IntersectionObserver`, Save-Data, media playback stubs |
| `public/media/{home,about,contact,share,brand,video}/**`, `public/favicon.ico` | Create | S0b, S2, S3b, S5 | Curated binaries |
| `public/media/stand-ins/{hero-1,hero-2,hero-3,gallery-02}.jpg` | Delete | S2 | Retired |
| `public/media/stand-ins/share-default.jpg` | Delete | S2b | Retired |
| `public/media/stand-ins/{about-teaser.svg,favicon.png}` | Delete | S5 | Retired |
| `public/_headers` | Modify | S0b | Non-overlapping rules, `immutable` for curated areas |
| `src/app/ui/atoms/image.tsx`, `image.ui.test.tsx` | Modify | S1a | `intrinsicRatio` |
| `src/app/ui/atoms/picture.tsx`, `picture.ui.test.tsx` | Create | S1a | Art direction |
| `src/app/media/preload.ts`, `preload.test.ts` | Create | S1a | Preload descriptors |
| `src/app/ui/organisms/hero-section.tsx`, `hero.ui.test.tsx` | Modify | S1b, S3b, S4 | Split layout, loop slot, ornament slot, constants |
| `src/app/ui/organisms/hero-collage.tsx` | Delete | S1b | Replaced |
| `src/app/routes/home.tsx`, `home.ui.test.tsx`, `home.test.ts` | Modify | S1b, S2b, S3b, S4 | Hero props, meta preload, `shareImage`, loop, dividers, butterfly (AD14 hunks) |
| `src/app/routes/{about,contact}.tsx` and their route tests | Modify | S2b | `shareImage` statement and `metaInput` line |
| `src/app/routes/coming-soon.tsx`, `coming-soon.test.ts` | Modify | S2b | `shareImage` in the `buildPageMeta` call; `og:image` expectation from the fake share asset; size tags |
| `src/app/ui/organisms/gallery-grid.tsx`, `.ui.test.tsx` | Modify | S2 | `srcSet` and `sizes` |
| `src/app/seo/meta.ts`, `meta.test.ts` | Modify | S2b | `SHARE_IMAGE_PATH` literal replaced by the required `shareImage` input; blank-path guard; `og:image:width`/`og:image:height` (AD15) |
| `src/app/ui/molecules/video-loop.tsx`, `.ui.test.tsx` | Create | S3a | Loop molecule |
| `src/app/ui/microcopy.ts` | Modify | S3a | Pause and play labels |
| `src/app/ui/atoms/cord-divider.tsx`, `butterfly.tsx`, `motifs.ui.test.tsx` | Create | S4 | Motifs |
| `src/app/ui/styles/motifs.css` | Create | S4 | All motif motion |
| `src/app/ui/styles/app.css`, `src/app/ui/styles.test.ts` | Modify | S4 | Import `motifs.css`; scan that motion sits inside `no-preference` |
| `src/app/ui/atoms/icon.tsx`, `icon.ui.test.tsx` | Modify | S5 | Four icons |
| `src/app/ui/organisms/trust-row.tsx`, `about-teaser.tsx`, `home-sections.ui.test.tsx` | Modify | S5 | Icon fix, teaser image |
| `src/app/routes/contact.tsx`, `contact.ui.test.tsx`, `contact.test.ts` | Modify | S5 | Facade photo |
| `src/app/root.tsx`, `root.test.ts` | Modify | S5 | Favicon links |
| `docs/design/deviation-register.md` | Modify | S5 | D1-D5 rows, appended after C4-F4 |
| `wrangler.jsonc`, `src/platform/range.ts`, `range.test.ts`, `workers/app.ts` | Modify / Create | S3c (conditional) | Range fallback F2 only |

---

## 11. Testing Strategy and verification

### 11.1 Automated (strict TDD; `corepack pnpm test <path>` for RED and GREEN)

| Layer | What | Approach | Slice |
|---|---|---|---|
| Tooling | Seam guard: `protectedChanges` flags an exact untouched file, a path under an untouched prefix (`src/composition/x.ts`), both sides of a rename out of a protected folder, and passes shared and owned paths; `isGuardActive` is true for `feat/design-adjustments-s1b`, true for a branch `main` with a changed `public/media/home/…` path, false for a change-4 branch touching only catalog files; `isSafeRef` rejects `--output=x`, `-p`, `a..b`, an empty string and a space, and accepts `origin/main`; the integration test fails with the "base ref not found" message when `SEAM_BASE_REF` names a missing ref (run in a child process with the variable set), and reports an untracked protected file (temporary file under an untouched prefix, removed in `finally`) | `tooling/change-seams.test.ts` | T1 |
| Domain unit | `isPublishable` truth table (excluded, missing rights, faces granted with and without source, faces not-required, hands, none); `toImageRef` fallback width; `srcSetPaths`; `exclusionToken` (`VID_20260717_155248707` → `vid-20260717-155248707`) | Table tests in `media.test.ts`; coverage at least 90 % | S0a |
| Domain unit | `validateMediaRegistry`, at least one RED case per rule, each asserting the named `id` and `path` or `sourceId`: **`alt-missing`** for a non-decorative image with `alt: ""` and with `alt: "  "`, and no issue for a `decorative` poster with `alt: ""`; **`variant-size`** for a variant with `width` removed, `height` removed, `width: 0`, `height: -1` and `width: 480.5` (fixtures cast through `unknown`, as a future untyped source would send), each naming the variant path, and for a video with `height` missing; `variant-order` is not reported for those assets; **`excluded-source`** for (a) an asset with `sourceId: "img-20260926-153632786-hdr"` whose ledger row says `granted`, (b) an otherwise valid asset whose variant path contains `img-20260808-130700502-hdr-portrait`, naming the path, (c) a video whose source path contains `vid_20260717_155248707` (case and separator variant), (d) a ledger row `{ sourceId: "VID_20260717_155248707", consent: "granted" }`, naming the source id; `consent-source-missing` (missing, blank `by`); `consent-required`; `variant-order`; `media-path`; `poster-missing`; and a clean registry yields `[]` | `media.test.ts` | S0a |
| Domain unit | Every OD-5/OD-7 source id, registered under any asset, yields `excluded-source`; a content path containing an excluded token yields `excluded-source` before `unregistered-media`; a pending asset referenced by the hero yields `unpublishable-media`; an unregistered `/media/home/x.webp` yields `unregistered-media`; a `srcSet` path is checked like `src`; registry issues reach `validateSiteContent` | `content-rules.test.ts` | S0a |
| Application | Gallery entry with a pending asset is dropped by `getAboutPage()` | `site-content.test.ts` with the in-memory source | S0a |
| Domain unit | `shareImageOf` returns path, 1200, 630 and alt for one publishable JPEG; throws for no share asset, two share assets, a pending share asset, an excluded source, a WebP, and a 1200x628 variant; `share-image-missing` is reported by `validateSiteContent` in the same six cases and not otherwise; `summarizeLaunchGate` splits image and font stand-ins and lists unpublished ids | `media.test.ts`, `content-rules.test.ts` | S2b |
| Application | `getShareImage()` returns the fake share asset; it rejects when the source registry has none; `getLaunchGate()` splits kinds | `site-content.test.ts` | S2b |
| Delivery | `buildPageMeta` emits `og:image` as the absolute URL of `shareImage.path`, `og:image:width` `"1200"` and `og:image:height` `"630"`; it throws "Share image must not be empty" for a blank path; with change 4's `ogImage` (once C4-F1 is on `main`) it uses the override and omits the size tags; the home, about, contact and coming-soon `meta` output contains the three tags from the loader's share image | `meta.test.ts`, `home.test.ts`, `about`, `contact` and `coming-soon` route tests | S2b |
| Infrastructure | Files ⇄ entries one to one under `public/media/**` (except `stand-ins/`) plus `/favicon.ico`; hash in name equals SHA-256 prefix; declared dimensions equal decoded ones; budgets; MP4 without `soun`, WebM without audio codec ids; `_headers` rules non-overlapping and immutable for every curated area folder; `validateMediaRegistry` on the shipped registry is `[]`; no file name anywhere under `public/media/**` (including `stand-ins/`) and no recipe `source` mentions an excluded source (the check is proven by a RED case that feeds it a fake listing containing `img-20260808-130700502-hdr-portrait-480.0a1b2c3d.webp`); the repository content validates clean | `media-assets.test.ts`, `repository-content.test.ts` | S0b on |
| Tooling | `cropBox` (centered, clamped, exact aspect), `deriveWidths` (no upscale, source-width top variant), `hashedName`, `encodeIco` header bytes; `parseRecipe` rejects unknown keys, a missing `widths`, an `id` over 40 characters and a `source` naming an excluded id | `derive-plan.test.ts` | T0a |
| Tooling | `derive` writes the hashed variants of a generated 64x48 PNG into a temporary `public/media/<area>/`, removes the older hash of the same id and width, and prints a fragment whose dimensions match the files | `derive.test.ts` | T0b |
| UI | `Picture`: one `<source>` per entry with `media`, `srcset`, `sizes`, `width`, `height`; fallback `img` eager and high when asked; no inline aspect ratio; axe | `picture.ui.test.tsx` | S1a |
| UI | Hero: exactly one `img`, inside `picture`, `loading="eager"`, `fetchpriority="high"`, classes `aspect-4/5` and `lg:aspect-3/4`; source ratio 3:4 and img ratio 4:5 from attributes; no `max-md:hidden` anywhere; one `h1`; loop after text in DOM; axe | `hero.ui.test.tsx` | S1b, S3b |
| Delivery | `artDirectedPreloads` returns two descriptors with the picture's srcsets, the shared sizes and complementary media; home `meta` includes them; the error branch has none; rendered Inicio has exactly one `img[fetchpriority=high]` and every other `img` is lazy | `preload.test.ts`, `home.test.ts`, `home.ui.test.tsx` | S1a, S1b |
| UI (jsdom) | `VideoLoop`: server markup (`renderToStaticMarkup`) has no `<video` and a lazy poster with `alt=""`; `reduce` → no video element, `play` never called, no button; Save-Data on → same; `no-preference` and intersecting → video with `muted` (property), `playsinline`, `loop`, `preload="none"`, `aria-hidden`; leaving → `pause`; pause button → paused and not resumed on the next intersection; rejected `play()` → poster stays; `error` → video removed; switching to `reduce` mid-play → video removed; axe | `video-loop.ui.test.tsx` with `src/testing/ui/browser-stubs.ts` (`vi.stubGlobal("matchMedia")`, a fake `IntersectionObserver` with a manual `trigger`, `Object.defineProperty(navigator, "connection")`, `vi.spyOn(HTMLMediaElement.prototype, "play" / "pause")`) | S3a |
| UI | Motifs: SVGs are `aria-hidden` and `focusable="false"`, use `currentColor`, carry the hook classes; `twinedStrand` start, end and period; axe on Inicio with motifs | `motifs.ui.test.tsx` | S4 |
| Delivery (UI) | Divider positions (section 5.2 table): with the catalog read and claims, 3 cords and the first follows the trust row; with no claims, 3 cords and the first follows the hero section; with the catalog failed, 2 cords; never a cord between the hero and the trust row, never two adjacent cords, none after the contact band | `home.ui.test.tsx` | S4 |
| Static CSS | `motifs.css`: every `animation` and `animation-*` declaration sits inside a `@media (prefers-reduced-motion: no-preference)` block; `app.css` imports it; the token literal scan still passes | `styles.test.ts` | S4 |
| Copy | New microcopy and alt texts pass `findCopyViolations` | existing scans | S2, S3a, S5 |

jsdom cannot evaluate CSS media queries or play media, so reduced motion is proven in three ways: the JS gate (unit tests), the stylesheet scan (motion declared only under `no-preference`), and the manual check below.

### 11.2 Manual verification (recorded in each visual PR and in the verify report)

| Check | Method | Target |
|---|---|---|
| Mobile LCP | Lighthouse CLI, mobile preset, default throttling, on the built site (`corepack pnpm build`, then `corepack pnpm exec wrangler dev`), plus a 360x740 DPR 3 emulation run | LCP at most 2.5 s; LCP element is the hero still `img` |
| CLS | Lighthouse and the Performance panel at 360 and 1280 (and 1024, 1440) on `/`, `/quienes-somos`, `/contacto` | 0; any non-zero shift is attributed (fonts) and recorded; none from media or motifs |
| Hidden downloads | DevTools Network at 360, cache disabled | One image request above the fold; no request for an image that is not rendered; no video request before scrolling to the tile |
| Reduced motion | DevTools Rendering "Emulate prefers-reduced-motion: reduce" | Cord static and fully drawn; butterfly at perch; loop shows the poster and zero video bytes |
| Save-Data | Unit test is the proof (no desktop toggle exists) | — |
| Screenshots | Real browser at 360, 1024, 1440 for S1b, S2, S3b, S4, S5; motion on and off for S3b and S4 | Attached to each PR |
| Range requests | `curl -sI -H "Range: bytes=0-1"` on the preview MP4 (owner session behind Access; remote action needs explicit authorization) | `206` + `Content-Range`, else S3c |
| Accessibility | axe in every new or changed component test; keyboard pass on the loop control | Zero violations; visible focus |

Every PR also passes `corepack pnpm lint`, `typecheck`, `test`, `format:check` and `build`.

---

## 12. Threat Matrix

The shipped site code has no shell commands, subprocesses, VCS or PR automation, executable-file classification or process integration. `media:derive` is a local developer tool that reads image files with sharp and spawns nothing; ffmpeg is run by hand from documented commands. **One boundary is in scope since revision 2**: the T1 seam guard (AD16) runs `git` as a subprocess inside the test gate and reads its output to decide pass or fail.

| Boundary | Minimum adversarial cases | Applicability | Design response | Planned RED tests (T1) |
|---|---|---|---|---|
| Documentation-like paths | `requirements.txt`, `CMakeLists.txt`, executable Markdown | N/A: the guard compares path strings with a list; it never classifies a file by type or executes one | — | — |
| Git repository selection | `git -C`, relative paths, absolute paths | **Applicable** | Every call is `spawnSync("git", args)` with an argument array, no shell, no `-C`, and `cwd` = the repository root resolved from the test file's own directory (`fileURLToPath(new URL("..", import.meta.url))`), never from the environment or `process.cwd()`. The base ref comes from `SEAM_BASE_REF` or `origin/main` and must pass `isSafeRef` (no leading `-`, no `..`, no spaces), so it cannot become an option or a range. Failure: an unsafe or unresolvable ref fails the test by name; it never falls back to a different ref or skips | `isSafeRef` table (`--output=x`, `-p`, `a..b`, `""`, `"a b"` rejected; `origin/main`, `feat/design-adjustments-s1b` accepted); the integration test run in a child process with `SEAM_BASE_REF=does-not-exist` fails with the "base ref not found" message; the git helper is asserted to pass `cwd` equal to the resolved root |
| Commit state | staged, unstaged, untracked, empty index | **Applicable** | The changed set is the union of the committed range (`<base>...HEAD`), the index and worktree against `HEAD` (`git diff --name-only HEAD`) and untracked files (`git ls-files --others --exclude-standard`), all with `--no-renames`, so a protected path cannot hide in an uncommitted or renamed state. An empty set passes | Pure `protectedChanges` cases for a committed, a staged-only, an untracked and a renamed protected path (the union is built by a pure `changedSet(committed, worktree, untracked)` helper); one integration case with a temporary untracked file under `src/composition/`, removed in `finally` |
| Push state | tracking branch, first push, explicit refspec | N/A: the guard never pushes or reads remote state beyond the already fetched `origin/main` | — | — |
| PR commands | explicit `--head`, environment prefix, composed commands | N/A: the guard does not call `gh` or compose PR commands; `GITHUB_HEAD_REF` is read only as a branch-name string for `isGuardActive` | — | — |

The conditional S3c fallback changes request routing for `/media/video/*` (Worker first). If it is triggered, its design note must cover range parsing edge cases (multiple ranges rejected with a full 200, suffix ranges, unsatisfiable ranges 416, HEAD) with RED tests; it is outside this matrix's boundary classes.

---

## 13. Migration / Rollout

No data migration. Rollout is the slice order of section 9; each PR is independently revertible after its dependents. The cache change (S0b) only affects new hashed paths; stand-ins keep one day. After S2b merges, crawlers see the new `og:image` URL and its size tags; the preview is unindexed (`SITE_INDEXING=off`), so no cleanup is needed.

---

## 14. Proposal coverage check (fresh-context pass, re-run for revision 2)

| Proposal item | Covered by |
|---|---|
| Scope 1: registry (id, source, area, variants, size, alt, people, consent, consent source), ledger (OD-6, OD-7), gate, default `pending`, exclusion and parity tests | AD1-AD3, 4.1 (now with `alt-missing`, `variant-size` and the layered exclusion check over ids, paths, ledger rows, page references, file names and recipe sources), 6, 11.1 (S0a, S0b, T0a) |
| Scope 2: binaries under `public/media/<area>/`, pre-generated, no build-time processing | AD5, AD6 (T0a, T0b), 6 |
| Scope 3: art direction, `sources[]`, `srcset`/`sizes`, dimensions per source, `ImageRef` optional fields only | AD4, AD8, 4.4 |
| Scope 4: mobile-first hero, one eager high image, desktop split, preload with `imagesrcset`, hidden eager images removed | AD7, AD9, 5.1 (route `meta` instead of `links`, verified in 0.3) |
| Scope 5: hero, gallery (10, reserves not shipped), OG JPEG; stand-ins retired with files; pinned tests | 6, 7 (hero in S1b; gallery in S2; OG in S2b, now read from the registry with size tags, AD15) |
| Scope 6: `VideoLoop` (muted, `playsInline`, `loop`, `preload="none"`, poster, IntersectionObserver, reduced motion and Save-Data in JS, `aria-hidden`) | AD10 (with the pause control the owner accepted, item 4) |
| Scope 7: cord divider and butterfly, inline SVG, `currentColor`, tokens, CSS only under `no-preference`, `aria-hidden` | AD11, AD12, 5.2 (positions decided, including the trust row), 5.3 |
| Scope 8: icons, TrustRow fix, teaser image, Contacto photo, `about-teaser` retired, deviation rows, favicon (Q2) | 5.4, 6 (favicon origin note: AD6, `docs/media/pipeline.md` "Brand assets"), 7, S5 |
| Capabilities `media-registry`, `ambient-video`, `decorative-motifs`; deltas to design-system, home-page, contact-page, site-content, seo-foundation | 1, AD1-AD15 |
| Success: LCP, CLS, no hidden downloads, axe, reduced motion and Save-Data tests, loop budget and no audio, exclusions, pending never renders, face photos with source, parity, image stand-ins, no change-4 files, 400 per PR, gates, coverage | 8, 9 (every row at or under 400, T0 split up front), 11, AD16 (no change-4 files, now automated) |
| Dependencies: range requests, preload through the router, Save-Data availability, SVG and the literal scan | 0.3 |
| Risks and rollback | 9, 16 |
| Out of scope respected (catalog cards, `fallbackImage`, section loops, testimonials, R2, eventos, fonts, change-3 and change-4 files) | AD14 (extended seam table), AD16, 6 (catalog picks only recorded in the ledger) |

**Validator items (revision 2)**:

| Item | Resolution | Where |
|---|---|---|
| N4 `media-registry` validation | `alt-missing` and `variant-size` rules; `excluded-source` also fires on asset ids, variant, source and poster paths, and ledger rows, case- and separator-insensitive; file names and recipe sources are checked too; RED cases listed | 4.1, AD3, AD6, 11.1 |
| N5 `seo-foundation` | Share image read from the registry (`shareImageOf` throws, `share-image-missing` fails CI, `getShareImage` feeds a required `shareImage`); `og:image:width` and `og:image:height` emitted | AD15, 4.5, 7, 11.1, S2b |
| N6 favicon origin | `docs/media/pipeline.md` § "Brand assets" (S5), backed by recipe `source` and registry `sourceId` | AD6, 6 |
| N7 divider positions | No cord between the hero and the trust row; the first cord follows the trust row when it renders, otherwise the hero; four-case table and test | 5.2, 11.1 |
| N8 automated seam check | T1 seam guard test in the gate, fail-closed base ref, committed, staged, unstaged and untracked paths | AD16, 9, 12 |
| N9 slice plan | S5 needs S2 and S2b; S3c has a forecast row; T0 re-forecast at 396-511 and split up front into T0a and T0b; split rules updated | 9 |
| N10 AD14 seam table | Ten more shared files with per-slice hunks, plus the conditional catalog-route seam | AD14, question 3 |
| N11 cross-reference | "AD10 item 4" | 15 |

Gaps found and resolved in this re-run: (5) the share image could not come from the registry through delivery imports (dependency rule), so it travels at request time; this makes `PageMetaInput.shareImage` required and creates the conditional catalog-route seam (question 3). (6) The one `meta.ts` line both changes touch (`og:image` content) is given a fixed merged form (AD14). (7) A guard keyed only on branch names could be bypassed by a misnamed branch, so `OWNED` paths also activate it. A guard that is always active would fail change 4's own PRs, so activation is required.

Gaps found and resolved in revision 1: (1) `meta.ts` and `coming-soon.test.ts` are change-4-adjacent; handled as named seams (AD14). (2) The proposal said `media:optimize` was "not needed here"; the owner reopened it, and AD6 records the fallback if it does not merge. (3) The proposal's "no controls" for the loop conflicts with WCAG 2.2.2; raised as question 1. (4) The proposal's S0 forecast (150-220) did not count tests or registry data; section 9 re-forecasts honestly.

---

## 15. Open questions and verify items

**Owner decisions (2026-10-16), resolving the items below:**

- Question 1 is resolved as (a): the loop keeps looping and gets the small "Pausar animación" / "Reproducir animación" button described in AD10 item 4. This unblocks S3a.
- The AD14 shared-file seams are accepted. The five change-4-adjacent files (`page-content.ts`, `meta.ts`, `repository-content.test.ts`, `coming-soon.test.ts`, `deviation-register.md`) may receive the line-disjoint hunks listed in AD14. Every other change-4 path stays untouched.

*Revision 2 note (outside the decisions block above, which is preserved as recorded):* the coordinator relayed on 2026-10-16 that the owner's acceptance of line-disjoint seams covers shared files in general. AD14 therefore lists ten more shared files with their hunks (N10). The catalog routes stay untouched unless question 3 below is answered with option (a).

**Open product questions** (returned to the orchestrator; ask one at a time):

1. **Loop pause control (resolved: option a).** The muted loop starts by itself and repeats past 5 s, which WCAG 2.2.2 (Level A) treats as moving content that needs a pause mechanism. Options: (a) a small "Pausar animación" button on the tile (recommended; keeps the ambient loop); (b) play the clip once for at most 5 s and stop on the last frame (no control, no loop). Blocks S3a.
2. **Favicon legibility** (non-blocking, S5). The raster logo may not read at 16-32 px. If the generated set is illegible, use only the logo's mark (a crop) for the 16/32/48 sizes and keep the full logo for the 180 and 192 icons. The owner reviews the generated set in the S5 PR.
3. **Share image in the catalog routes** (blocks S2b only if C4-F1 or C4-F2 is on `main` by then). AD15 makes `PageMetaInput.shareImage` required, so every page that calls `buildPageMeta` must pass it, including change 4's `talleres`, `taller`, `intensivos` and `intensivo` routes. Options: (a) accept a two-line hunk in each catalog route (a separate `const shareImage = await services.siteContent.getShareImage();` statement and one `shareImage` line in `metaInput`), added by S2b and moved from `UNTOUCHED` to the shared list in the seam guard (recommended; mechanical and line-disjoint); (b) hold S2b until change 4 adds those lines in its own PR. If S2b merges before C4-F1 and C4-F2, the question disappears: change 4 adds the lines when it rebases.

**Verify items for apply**:

- [ ] S3b: range request status on the preview (`206` expected; otherwise S3c, F2).
- [ ] S1b: the 4:5 crop focus of `home-hero-mobile` keeps the whole disc at 360 px (screenshot), and the LCP is the still in Lighthouse.
- [ ] S4: `animation-timeline` support in the target browsers at apply time (progressive enhancement either way).
- [ ] T0a/T0b: `chore/media-optimize-images` merged, or the worktree fallback used and recorded in the S0b PR body.
- [ ] T1: the seam guard passes on `main`, fails on a scratch branch named `chore/design-adjustments-guard-check` that touches `src/composition/request-services.ts` (local only, never pushed), and is inactive on a change-4 branch.
- [ ] S2b: whether C4-F1 or C4-F2 is on `main` (question 3), and the merged `og:image` line of AD14 if C4-F1 landed first.
- [ ] Spec phase: confirm the rule ids (`unregistered-media`, `unpublishable-media`, `excluded-source`, `alt-missing`, `variant-size`, `share-image-missing`, …), the `getLaunchGate` and `getShareImage` names, the preload-through-`meta` mechanism, the hero DOM order (AS1), and that the seo-foundation scenario "Only the path value changes" accepts the registry-derived form of AD15 (a required `shareImage` input and two size tags, with `sitemap.ts` and `json-ld.ts` unchanged).

---

## 16. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Mobile LCP over 2.5 s on throttled 4G | Medium | 720w variant (about 100 KB) at Lighthouse DPR; preload with matching `srcset`/`sizes`; poster lazy; video after hydration; WebP quality knob in the recipe (76 for the hero) |
| Safari refuses the MP4 if production ignores ranges | Medium | Poster fallback on error; verify step; S3c Worker range fallback; R2 later |
| Hashed favicon paths in `root.tsx` drift after a re-derive | Medium | `root.test.ts` asserts each is a registered publishable path; derive prints the new names. The share image cannot drift: it is read from the registry (AD15) |
| A missing share image takes every page down at request time (`getShareImage` throws in each loader) | Low | `share-image-missing` fails CI first (`repository-content.test.ts`); the throw is a programming-error backstop, never reached by a green build |
| Required `shareImage` couples change 4's catalog routes to S2b | Medium | Merge-order rule and question 3 (AD14); the type error makes the two-line fix mechanical either way |
| The seam guard fails open on a misnamed slice branch that touches no `OWNED` path | Low | Branch naming rule in AD16; `OWNED` backstop; the guard's unit tests pin the activation rules |
| The seam guard fails a local run on a clone without `origin/main` | Low | Fail-closed by design, with a message naming the fix (`git fetch origin main` or `SEAM_BASE_REF`); CI checks out with full history |
| `display: contents` and `order` confuse assistive tech | Low | Only non-focusable media are reordered; DOM order keeps the `h1` first; axe and a screen-reader spot check |
| Scroll-driven animation unsupported | High (low impact) | Static cord by default; `@supports` gate |
| Loop seam visible (first and last frames differ) | Medium (low impact) | Choose the cut point by eye; optional 0.3 s crossfade recipe in `docs/media/pipeline.md` |
| Soft images in the lightbox (most sources stop at 960 px; `img-20260411-wa0106` at 900) | Medium | Source-width top variant; lightbox `sizes` cap |
| Forecast of about 2,800-3,900 lines over 13 PRs (14 with S3c) strains review | Medium | Each PR at or under 400 with split rules; pure-data and pure-tooling PRs are fast to review |
| Shared files with change 4 conflict | Medium | Line-disjoint hunks per slice (AD14), one shared `meta.ts` line with a fixed merged form, rebase rule, automated seam guard (AD16) |
| T0a/T0b blocked by the unmerged media chore | Low | Worktree fallback (AD6) |
