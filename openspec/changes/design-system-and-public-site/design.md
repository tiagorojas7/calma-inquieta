# Design: Design System and Public Site (static pages)

Change 2 of 8 | Project: calmainquieta | Store: hybrid | Phase: sdd-design | **Revision 2.1** | Date: 2026-10-06
Inputs: `proposal.md` (amended: "Quiénes somos" at `/quienes-somos`), `specs/*/spec.md` (7 capabilities), Engram #228 (resolved decisions), `platform-foundation/design.md`, `AGENTS.md`, `eslint.config.ts`, `vitest.config.ts`, `vite.config.ts`, `package.json`, `pnpm-workspace.yaml`, `tsconfig*.json`, `wrangler.jsonc`, `src/app/**`, `src/composition/request-services.ts`, `src/platform/env.ts`, `src/testing/react-router.ts`, `workers/app.ts`, `.github/workflows/ci.yml`, `tooling/{architecture/architecture.test.ts,deploy-workflow.test.ts,repo-hygiene.test.ts}`, `docs/client-proposal/mockups-analysis.md` 3.3, mockups image3/5/9/12, `docs/brand/dmr-calma-inquieta.md` 3 and 5, `docs/brand/instagram/ig-profile-picture.jpg`.

> **Design in one paragraph.** Tailwind CSS 4 (`@tailwindcss/vite`, build-time only) reads one token file (`tokens.css`, a reset `@theme` that removes the default palette). A pure WCAG function plus a declared-pairs table gate contrast in the `unit` project by parsing that same file. Presentational components live in a new boundary element `ui` (`src/app/ui/**`) that may import only `ui`, `react`, `react-dom` and `react-router`. Route modules stay the containers and compose the page bodies: they read a new `site-content` module (typed repository data behind a `SiteContentSource` port, exposed through `AppServices`) and map it to props. A pathless layout route owns the public chrome and the styled error boundary. `/status`, `/robots.txt` and `/sitemap.xml` sit outside it. SEO is a set of pure builders in `src/app/seo/`; the indexing response header is a platform helper used by the Worker. Two new validated variables, `SITE_URL` (required) and `SITE_INDEXING` (default `off`), drive the canonical URLs and the indexing gate. A new `ui` Vitest project (jsdom, Testing Library, axe-core) runs `*.ui.test.tsx` inside `pnpm test`. No new runtime package is added, and the delivery allowlist is unchanged. Two orchestrators deliver it in parallel: BACK (Claude Code) owns shared configuration, the content module and the platform; FRONT (pi) owns `src/app/**` plus listed carve-outs. The work ships as 1 planning PR, 2 BACK PRs and 9 FRONT PRs, stacked to `main`: about 2,380-3,290 authored production lines, 230-330 doc lines and 1,900-2,585 test lines.

### Revision 2 changes (validator findings and owner decisions)

| # | Finding | Where fixed |
|---|---|---|
| C1a | Split old S1: BACK adds the plugin and a throwaway spike; FRONT pilot keeps tokens, fonts and the contrast gate | DS1, section 10 (B1, F0) |
| C1b | `withIndexingHeader` moves to `src/platform/indexing-header.ts`; the Worker imports nothing under `src/app/seo` | DS9, sections 6, 7 |
| C1c | `status.test.ts` switches to `createTestServices()` in B2, the first PR that changes `AppServices` (one-file BACK carve-out) | DS13, sections 7, 10 |
| C1d | `findCopyViolations(strings)` exported by the module API; B2 scans content only; FRONT adds `src/app/copy-rules.test.ts` | DS14, sections 5.3, 8 |
| C1e | Owner column in section 7; FRONT fixtures in `src/testing/fixtures/**`; docs ownership | DS13, section 7 |
| C1f | Content rule: business facts and page copy in `site-content` (BACK, complete in B2); UI microcopy in `src/app` (FRONT) | DS14 |
| C2 | Honest per-file forecasts per PR | Section 10 |
| W3 | `@testing-library/dom` 10.x exact pin | DS10 |
| W4 | Header CTA is a sibling of the `<nav>` inside the disclosure wrapper | DS7 |
| W5 | CI: `STATUS_URL` in the deploy step env, a shape guard step, unmasked-origin note, workflow tests | DS9, section 9 |
| W6 | The https refine sets `path: ["SITE_INDEXING"]` | DS9 |
| W7 / OQ1 | Text wordmark; favicon and share image derived from `ig-profile-picture.jpg`, registered | DS12 |
| W8 | `Address.locality` = Argüello, `city` = Córdoba; JSON-LD `addressLocality` Córdoba | DS9, section 5.1 |
| W9 | `HeroSection` organism; route modules compose page bodies | Section 4 |
| W10 | Every above-the-fold hero slot is eager; `fetchPriority="high"` on slot 1 only | DS12, section 4 |
| W11 | Site-map "indexable = 3" assertion lands in F7; earlier slices assert the then-current count | Sections 8, 10 |
| W12 | Literal scan blocks `[#` colors and `-[<length>]` only; `data-[state=…]:` variants allowed | DS2, DS7, section 3.3 |
| W13 | pnpm 12 `minimumReleaseAgeExclude` only if a pin is blocked | DS10, B1 |
| N14 | tan-400 on canvas is 3.14 | Section 3.2 |
| N15 | DOM libs type-check only because `skipLibCheck` is true (known limitation) | DS11 |
| N16 | SkipLink is inert while the mobile menu is open | DS7 |
| OQ2 | "Escribinos" + visually hidden " por WhatsApp" (WCAG 2.5.3), recorded in the Deviation Register | DS7, F8 |
| R2.1 | Second validator: B2 owns every manifest row, including the four font rows; B2 matches `public/media/stand-ins/` both ways and only shape-checks font rows; F2 adds a FRONT `font-registry.test.ts`; FRONT never edits `src/modules/**` | DS12, DS13, sections 5.2, 5.3, 7, 12 |

---

## 1. Technical Approach

| Concern | Approach | Spec |
|---|---|---|
| Styling | Tailwind 4 utilities over brand tokens; CSS-first config; no runtime CSS-in-JS | design-system |
| Token source | `src/app/ui/styles/tokens.css` (`@theme`) is the only source; the contrast test parses it | design-system: Single token source |
| Fonts | 4 self-hosted WOFF2 files in `public/fonts/` with OFL texts; `fonts.css` holds `@font-face`, metric fallbacks and the `--font-*` theme vars (the one file to swap) | design-system: typography |
| Components | Atomic folders under `src/app/ui/`; props only; local UI state allowed (menu open, lightbox index) | design-system: inventory |
| Content | `src/modules/site-content` (domain rules, application reader, repository adapter with typed data files) | site-content |
| Routing | Pathless layout route for all public pages + splat 404; resource routes for robots/sitemap | public-layout, seo-foundation |
| SEO | Pure builders in `src/app/seo/` (meta, canonical, OG, JSON-LD, robots, sitemap); indexing header from `src/platform/` in the Worker | seo-foundation |
| Tests | Strict TDD for pure logic in `unit`; behavior + axe tests in the new `ui` project | all |
| Delivery | BACK and FRONT orchestrators, contract first, BACK merges first, stacked PRs to `main` | (process; section 10) |

Spec alignment: if a spec names an observable (label, status, attribute) differently from this design, the spec wins and apply aligns names. This design owns structure, layering, tooling and ownership.

---

## 2. Architecture Decisions

### DS1. Tailwind CSS 4 with a reset `@theme` as the single token source
**Choice**:
- `tailwindcss` and `@tailwindcss/vite` 4.3.3 as exact-pinned devDependencies, added by **B1 (BACK)**.
- Plugin order: `[cloudflare({ viteEnvironment: { name: "ssr" } }), tailwindcss(), reactRouter()]`. B1 verifies it.
- B1 runs a **throwaway spike** before merging. It adds a temporary CSS entry (`@import "tailwindcss"` plus a reset `@theme` with one color) and a temporary root `links` entry, then removes both; nothing from the spike is committed. The B1 PR body records:
  - `pnpm build` passes and the emitted CSS contains the test utility;
  - `pnpm dev` serves a page whose response links the processed stylesheet;
  - `pnpm typecheck` passes;
  - the verified plugin order;
  - whether `import appCss from "./ui/styles/app.css?url"` in `src/app/root.tsx` passes `pnpm lint` (boundaries resolver). If it does not, B1 adds the minimal lint configuration that makes FRONT's import pass, and records the reason.
- **F0 (FRONT pilot)** writes the real `tokens.css`, `fonts.css` and `app.css`. `tokens.css` starts with `--color-*: initial;`, so only brand colors exist as utilities. F0 re-proves `pnpm build` with the real CSS.

**Alternatives considered**: plain CSS custom properties + hand-written CSS per component (more authored lines, no utility vocabulary, zero tooling risk); CSS Modules; a TS token object that generates CSS (needs a build step, and the generated file becomes a second source).
**Rationale**: npm peers (vite `^8`) make Tailwind 4 compatible with Vite 8.3.2. A CSS-first `@theme` is both the stylesheet and machine-readable input for the contrast test, so there is one source. The reset bans off-palette colors such as agency blues. Splitting plugin (BACK) from tokens (FRONT) keeps shared config in BACK and lets the spike fail before any FRONT work. **Fallback** (only if the spike fails): B1 does not add the plugin; F0 keeps the same token names under `:root` in `tokens.css` and FRONT writes component CSS with `var(--color-*)`. Because the spike runs before any component exists, the fallback costs only F0 files.

### DS2. Contrast gate parses `tokens.css`
**Choice** (F0):
- `src/app/ui/tokens/contrast.ts` exports the pure functions `relativeLuminance(hex)`, `contrastRatio(a, b)` and `parseColorTokens(css): Map<string, string>`. The parser reads only `--color-<name>: #rrggbb;` and ignores `initial`.
- `contrast-pairs.ts` declares the pairs as `{ fg, bg, kind: "text" | "large-text" | "ui" | "decorative", usage }`, plus `RESTRICTED_TOKENS`.
- `contrast.test.ts` (unit, `node:fs` read) fails with the pair name and ratio when `text < 4.5` or `large-text|ui < 3`. It also fails when a pair names an unknown token or a restricted token appears in a `text` pair. Reference values: black/white = 21, identical = 1.
- The "no literals that bypass tokens" rule is enforced by the static scan in section 3.3: it blocks color literals (`[#…]` arbitrary colors and hex string literals) and arbitrary lengths (`-[<number><unit>]`) in `src/app/ui/**/*.tsx`. Attribute variants such as `data-[state=open]:` and `aria-[expanded=true]:` stay allowed, because they carry no color or length.

**Alternatives considered**: computing contrast in rendered pages (jsdom has no layout; axe `color-contrast` is unreliable there); a TS token object duplicated in CSS; banning every `-[` (it would also ban the attribute variants DS7 needs).
**Rationale**: It satisfies "same value observed by build and test" and "edit one place".

### DS3. New boundary element `ui` for presentational purity
**Choice** (B1):
- Add `element("ui", "src/app/ui/**/*")` to `eslint.config.ts` **before** `delivery`.
- Policies: `ui` → `ui` plus the packages `react`, `react-dom`, `react-router`. `delivery` gains `ui` in its allow list. `ui` does not get `shared`, `module-api`, `composition` or `delivery`.
- New architecture-test rows (virtual files, so B1 needs no `src/app/ui` file): `src/app/ui/x.fixture.tsx` importing `~/modules/site-content` (violation), `~/app/context` (violation), `~/composition/request-services` (violation) and `~/app/ui/atoms/button` (allowed); `src/app/routes/x.fixture.tsx` importing `~/app/ui/atoms/button` (allowed).
- `AGENTS.md` lists the new element and its allowed imports.

**Alternatives considered**: the convention alone (the spec requires a lint/architecture check); letting `ui` import module types (it breaks "imports no module from `src/modules`").
**Rationale**: The spec scenario "Presentational purity" becomes a mechanical gate. UI prop types are declared structurally in `ui`; route modules map module types to them.

### DS4. Content module with a single-load port
**Choice** (B2): `SiteContentSource { load(): Promise<RawSiteContent> }`. `createSiteContent(source)` (application) applies the domain rules and exposes async readers. The repository adapter returns `as const satisfies RawSiteContent` data from `infrastructure/content/*.ts`. Composition creates the reader once at module scope (pure static data) and puts it in `AppServices.siteContent`.
**Alternatives considered**: one port method per page (more surface for no gain now); sync readers (a later database adapter would change every call site); content in delivery (the spec requires the module API and layering).
**Rationale**: D1 with the smallest port that keeps a later database or panel-backed source a composition-only change. Async from day one keeps call sites stable.

### DS5. Facts are confirmed or absent; prose carries `approved`
**Choice** (B2):
- Raw optional facts are `{ value, confirmed: boolean }`. The reader exposes `value` only when `confirmed`, otherwise `undefined`.
- WhatsApp is `{ display: "351 739 5239", provisional: true }`, defined only in `infrastructure/content/business-profile.ts`.
- Drafted prose (history, value proposition, teaser, FAQ answers, values, trust claims) carries `approved: boolean`. Drafted prose renders on the preview (the gate is off) and is listed by `listUnapprovedContent()` (`{ id, area }[]`) for the launch checklist.
- Trust claims render only when `approved`. A claim matching `/materiales incluidos/i` must have `appliesTo: "intensivos"` (validation).
- Testimonials need `consent: { written: true; recordedOn }`. The reader drops the others.

**Rendering of the provisional number**: WhatsApp appears only as links. The digits are printed only when `provisional` is `false`, so the site never presents the number as official (public-layout: Footer; contact-page: Provisional marking).
**Rationale**: It encodes "never present unconfirmed facts as real" in types and readers, not in reviewer memory.

### DS6. Routing: pathless public layout with its own error boundary
**Choice** (`src/app/routes.ts`, final state after F4):
```ts
export default [
  route("status", "routes/status.tsx"),
  route("robots.txt", "routes/robots.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),
  layout("routes/public-layout.tsx", [
    index("routes/home.tsx"),
    route("quienes-somos", "routes/about.tsx"),
    route("contacto", "routes/contact.tsx"),
    route("talleres", "routes/coming-soon.tsx", { id: "coming-soon/talleres" }),
    route("intensivos", "routes/coming-soon.tsx", { id: "coming-soon/intensivos" }),
    route("eventos-privados", "routes/coming-soon.tsx", { id: "coming-soon/eventos-privados" }),
    route("*", "routes/not-found.tsx", { id: "routes/not-found-splat" }),
  ]),
] satisfies RouteConfig;
```
- The `public-layout` loader returns the chrome data: business name (wordmark), WhatsApp and Instagram hrefs, footer facts (confirmed only), bajada. The nav entries are the static `PUBLIC_PAGES` import, not loader data.
- Its `ErrorBoundary` renders `PublicPage` chrome around `ErrorPage`, reading `useRouteLoaderData("routes/public-layout")`. When that is `undefined` (the layout loader itself failed), it shows chrome without contact links. Error copy is UI microcopy (DS14), so the boundary never depends on a loader.
- Child errors keep their status: React Router answers 404 for the splat loader's thrown `data(null, { status: 404 })` and 500 for thrown `Error`s.
- `/nosotros` matches the splat and returns 404 (no redirect: the URL was never published).
- The root `ErrorBoundary` becomes Spanish and minimal (F3). It still applies outside the layout (for example `/status` defects). `<html lang="es-AR">` covers every page, error pages included (F0).
- Intermediate states: F2 moves the existing `index("routes/not-found.tsx")` inside the layout, so `/` keeps answering 404 until F4 (rendered by the root boundary in F2, by the styled layout boundary from F3). F3 adds the splat as `route("*", "routes/not-found.tsx", { id: "routes/not-found-splat" })` while the index still uses the same file; F4 replaces the index with `home.tsx` and the splat keeps its explicit id. `/quienes-somos` and `/contacto` answer the styled 404 until F5 and F7 add their routes.

**Alternatives considered**: public chrome in root `App` (it would wrap `/status` and nest two `<main>`); a root-level 404 (React Router does not run loaders on a no-match, so the chrome would have no profile data); an ErrorBoundary per page (seven re-exports); throwaway placeholder routes for the three static pages before their slices (dead code).
**Rationale**: One boundary keeps the chrome and the status for every public error, and `/status` keeps its loader, headers and payload (its HTML gains the stylesheet link and `lang="es-AR"`; the smoke check reads `data-status`, which is unchanged).

### DS7. One navigation list, disclosure panel, `inert` background
**Choice** (F2):
- `src/app/site-map.ts` (delivery) declares `PUBLIC_PAGES`: `{ id, path, label, indexable }` × 6, in menu order. It is the single menu definition, and it also feeds the sitemap and a route fitness test. Page titles come from content, not from the site map.
- The layout route passes the entries to `SiteHeader` as props.
- `SiteHeader` structure:
  ```
  <header>
    <a href="/">{wordmark}</a>                                  text wordmark (DS12)
    <MobileNav toggle: button aria-expanded aria-controls="menu-principal" class="lg:hidden">
    <div id="menu-principal" data-state="open|closed">          disclosure wrapper
      <nav aria-label="Principal"><ul> 6 × <li><NavLink/></li> </ul></nav>
      <ButtonLink variant="primary">Escribinos<VisuallyHidden> por WhatsApp</VisuallyHidden></ButtonLink>
    </div>
  </header>
  ```
  The CTA is a sibling of the `<nav>` inside the wrapper, so `nav ul a` yields exactly the 6 menu links and the CTA renders once (visible in the desktop header and inside the mobile panel). Below `lg`, the wrapper is a full-height panel hidden while closed (`max-lg:data-[state=closed]:hidden`, an attribute variant allowed by DS2). At `lg` and above, the wrapper is always shown inline and the toggle is hidden.
- The open state is held by `PublicPage`. While the menu is open, `PublicPage` sets `inert` on `<main>`, `<footer>` **and the SkipLink** (React 19 `inert` prop), because the skip target is inert too. This keeps focus from escaping behind the panel without a JS focus trap.
- Escape (document keydown while open) closes the panel and focuses the toggle. Activating a `NavLink` closes it. A pathname change closes it (`useLocation` in the template). A `matchMedia` change to desktop closes it (guarded for jsdom).
- `html[data-menu-open]` locks scroll (`app.css` rule added in F2).
- Active state: React Router `NavLink` (`end` for `/`) gives `aria-current="page"`. The splat 404 marks none.
- No-JS fallback: the footer repeats the six links in a second `<nav aria-label="Páginas">`.
- Header CTA label (OQ2, closed): visible "Escribinos" plus visually hidden " por WhatsApp". The accessible name starts with the visible label (WCAG 2.5.3 label in name). F8 records it in the Deviation Register (mockups vary: "Ver actividades", "Reservá tu lugar").

**Alternatives considered**: `<details>` menu (no Escape or focus return without JS); two lists (one desktop, one mobile), which duplicates landmarks and makes the "desktop and mobile agree" test trivial in the wrong way; a JS focus trap (more code than `inert`); the CTA inside the `<ul>` (breaks the "exactly six entries" read).
**Rationale**: It meets every mobile-navigation scenario with native semantics.

### DS8. Lightbox on native `<dialog>`, FAQ on `<details>`, video facade without third-party requests
**Choice**:
- **Lightbox** (F6, inside `GalleryGrid`): a native `<dialog>` with `showModal()`, which gives focus trapping, the top layer and an inert background. `aria-labelledby` points to a visible caption. The dialog offers a close button and prev/next buttons, and ArrowLeft/ArrowRight navigate. **Edges wrap around** (last → first), matching the about-page "Edges" scenario. On `close`, focus returns explicitly to the activating thumbnail button. Thumbnails are `<button>`s wrapping an `Image`.
- **jsdom**: `src/testing/ui/setup.ts` (B1) polyfills `showModal`/`close` only when missing (set/remove `open`, dispatch `close`). Tests dispatch `cancel` for Escape.
- **FAQ** (F5): `FaqList` and `FaqItem` use `<details><summary>`, render nothing when the list is empty, and emit no FAQPage JSON-LD.
- **VideoFacade** (F6): a `<button>` with a local poster (`Image`) and the label "Reproducir video: {title}". Before activation the DOM holds no `iframe` and makes no request to YouTube (local poster only, no `i.ytimg.com`). On activation it renders `<iframe src="https://www.youtube-nocookie.com/embed/{id}?autoplay=1" title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen>`. Video ids are validated by `^[A-Za-z0-9_-]{11}$`. The video list is empty now, so no video UI renders in production.

**Alternatives considered**: a custom ARIA dialog with a JS trap (more code, weaker than native); YouTube thumbnails (a third-party request before the click).
**Rationale**: Native elements carry the accessibility semantics. The polyfill tests our wiring; native behavior is checked manually on the preview.
**Descoping order**: the lightbox can drop to "open image in place" and the facade can be deferred, as listed in the proposal.

### DS9. SEO builders are pure; config is validated; the gate defaults off
**Configuration (B1)**:
```ts
export const workerEnvSchema = z
  .object({
    HYPERDRIVE: z.object({ connectionString: databaseUrl }),
    BUILD_COMMIT: z.string().min(1),
    SITE_URL: z.url({ protocol: /^https?$/ }),
    SITE_INDEXING: z.enum(["on", "off"]).default("off").transform((v) => v === "on"),
  })
  .refine((env) => !env.SITE_INDEXING || env.SITE_URL.startsWith("https://"), {
    path: ["SITE_INDEXING"],
    message: "SITE_INDEXING=on requires an https SITE_URL",
  });
```
- `path: ["SITE_INDEXING"]` makes `parseEnv` report the issue by name (`SITE_INDEXING (invalid)`); without it the name would be `(root)`.
- Zod 4 `.refine()` keeps the `ZodObject` type, so `workerEnvSchema.shape` (read by `tooling/repo-hygiene.test.ts`) still works. B1 verifies this; if it does not hold, B1 exports the unrefined object as `workerEnvShape` for the hygiene test.
- `wrangler.jsonc` vars: `SITE_URL: "http://localhost:5173"`, `SITE_INDEXING: "off"`. `.dev.vars.example` lists `SITE_URL=` and `SITE_INDEXING=` (the repo-hygiene test enforces names only).
- The Worker reads `SITE_INDEXING` directly from the parsed env for the header (B1). B2 adds `siteUrl` and `indexingEnabled` to `RuntimeConfig` and `AppServices.site = { baseUrl, indexingEnabled }`.

**CI (B1)**:
- A new step right after the deploy gate, with the gate condition, checks the secret's shape and fails by name only:
  ```yaml
  - name: Check the status URL shape
    id: status-url-shape
    if: steps.deploy-gate.outputs.ready == 'true'
    env:
      STATUS_URL: ${{ secrets.STATUS_URL }}
    run: |
      case "$STATUS_URL" in
        */status) ;;
        *)
          echo "::error::deploy misconfigured: STATUS_URL must end in /status"
          exit 1
          ;;
      esac
  ```
- The deploy step gains `STATUS_URL: ${{ secrets.STATUS_URL }}` in its `env` and runs `pnpm exec wrangler deploy --var BUILD_COMMIT:${{ github.sha }} --var "SITE_URL:${STATUS_URL%/status}"`. No new secret.
- Masking note (documented in the ADR and the workflow comment): GitHub masks the full `STATUS_URL` secret, but the derived workers.dev origin is a substring and is **not masked**; it appears in wrangler's deploy output. It is not a secret once deployed (the Worker serves it publicly).
- `tooling/deploy-workflow.test.ts` gains: a `stepScript(id)` helper (generalizing `gateScript`) that runs the shape guard in bash with `https://x.workers.dev/status` (exit 0) and `https://x.workers.dev/` (non-zero, log contains the names-only error and not the value); the deploy step env contains `STATUS_URL: ${{ secrets.STATUS_URL }}`; the run line contains `--var "SITE_URL:${STATUS_URL%/status}"`; the guard comes before `pnpm db:migrate`. Existing anchors (`wrangler deploy --var BUILD_COMMIT:`, the no-echo regex, the gate condition on every later step) keep passing.

**Indexing header (B1)**: `src/platform/indexing-header.ts` exports `withIndexingHeader(response: Response, indexingEnabled: boolean): Response`. When off, it returns a new `Response` with copied headers plus `X-Robots-Tag: noindex, nofollow`; when on, it returns the response untouched. `workers/app.ts` wraps the handler result with it and imports nothing under `src/app/seo` (worker may import `platform`).

**Builders (`src/app/seo/`, FRONT)**:
- `buildPageMeta(input)` (F3): title template `"{page} | {siteName}"` (Inicio's full title comes from content). It also emits the description (throws on empty), the canonical `<link>`, `og:*` (`og:locale` `es_AR`, `og:image` = `{base}{SHARE_IMAGE_PATH}`) and `twitter:card` `summary_large_image`. It adds robots `noindex, nofollow` when the gate is off, and `noindex` always for coming-soon pages. `SHARE_IMAGE_PATH` is a delivery constant (`/media/stand-ins/share-default.jpg`); a test asserts it is registered in the stand-in manifest.
- `canonicalUrl(base, pathOrUrl)` (F3): strips query, hash and trailing slash (except the root) and joins without a double slash.
- `buildRobotsTxt({ indexing, base })` (F3): off gives `User-agent: *\nDisallow: /`; on gives `Allow: /` plus `Sitemap: {base}/sitemap.xml`.
- `buildSitemapXml(base, paths)` (F3): the route passes `PUBLIC_PAGES.filter(p => p.indexable)`, which is exactly `/`, `/quienes-somos`, `/contacto` once F7 lands.
- `buildLocalBusinessJsonLd(profile, base)` (F7): `@type: "LocalBusiness"`, `name`, `url`, a `PostalAddress` (`streetAddress` "Albert Sabin 6079, Argüello" = street + locality, `addressLocality` "Córdoba" = city, `addressRegion` "Córdoba", `addressCountry` "AR") and `sameAs: [instagramUrl]`. It adds telephone, email, openingHours and geo only when exposed (confirmed). It never adds the provisional WhatsApp number.
- `serializeJsonLd(obj)` (F7) escapes `<`, `>`, `&`, U+2028 and U+2029 as `\u` sequences.

The page loaders return a `meta` input (`{ title, description, path, robots, siteName, baseUrl, indexingEnabled }`, built from content and `services.site`), and `meta({ loaderData, error })` calls `buildPageMeta`. The error branch returns a fixed Spanish title without the brand (for example "Página no encontrada") and `noindex`.

Resource routes (F3): `robots.ts` returns `text/plain; charset=utf-8`, `sitemap.ts` returns `application/xml; charset=utf-8`, and both send `Cache-Control: public, max-age=3600`.

**Alternatives considered**: an optional `SITE_URL` with fallback to the request origin (rejected: the spec requires a missing base to fail at startup); a new `SITE_URL` secret (rejected: the origin is derivable from the existing secret); the indexing header helper in `src/app/seo` (rejected: the Worker would import delivery internals); React Router `script:ld+json` meta descriptors (escaping not guaranteed; our serializer is tested); merging parent and child meta through `matches` (fragile across React Router majors).
**Rationale**: Every observable SEO rule becomes a table-driven unit test. The gate has three layers (robots.txt, meta, header) and stays off until change 8 changes one variable.

### DS10. DOM test environment: jsdom + axe-core directly
**Choice** (B1):
- Project `ui`: `environment: "jsdom"`, `include: ["src/**/*.ui.test.tsx"]`, `setupFiles: ["src/testing/ui/setup.ts"]`. The setup loads `@testing-library/jest-dom/vitest`, adds `afterEach(cleanup)`, the dialog polyfill and a `matchMedia` stub.
- The `unit` project excludes `**/*.ui.test.tsx`.
- `src/testing/ui/axe.ts` exports `expectNoAxeViolations(container, { page?: boolean })`. It runs `axe.run` with `color-contrast` disabled (the token gate covers contrast) and the `region` rule enabled only for page-level renders.
- `src/testing/ui/harness.ui.test.tsx` is the smoke test: it renders a JSX element, asserts a jest-dom matcher and runs the axe helper. It proves JSX compiles under the Vitest config (automatic runtime from `tsconfig` `jsx: "react-jsx"`; if not, B1 sets the transform option in `vitest.config.ts`) and measures the `ui` project overhead against the 20 s budget (section 8).
- Router-dependent renders use `createRoutesStub` from `react-router` (F2 verifies the name in React Router 8; fallback `createMemoryRouter` + `RouterProvider`).
- New devDependencies, exact pins: `@testing-library/dom` 10.x (latest 10.x patch at B1 time; it is the peer of `@testing-library/react` 16.3.3 and `@testing-library/user-event` 14.6.7, and `@testing-library/jest-dom` 7.0.1 needs `>=10 <11`), `@testing-library/react` 16.3.3, `@testing-library/user-event` 14.6.7, `@testing-library/jest-dom` 7.0.1, `jsdom` 30.1.2, `axe-core` 4.14.0 (plus `tailwindcss` and `@tailwindcss/vite` 4.3.3, DS1).
- pnpm 12 `minimumReleaseAge`: B1 installs, and only if pnpm blocks a pin, adds that exact `name@version` to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` with the existing comment style. No entry is added speculatively.

**Alternatives considered**: happy-dom (faster startup, but axe-core integrations report incompatibilities with it; verify only if the time budget is exceeded); `vitest-axe` 0.1.0 (stale); a real browser (Vitest Browser Mode): rejected for now (D7, CI weight).
**Rationale**: jsdom is the environment axe-core supports, and keeping UI tests behavioral keeps the file count and suite time bounded (section 8).

### DS11. TypeScript DOM types
**Choice** (B1): add `"DOM", "DOM.Iterable"` to `lib` in `tsconfig.base.json`, so interactive components and UI tests type-check. React Router's Cloudflare template ships the same combination.
**Known limitation**: the DOM lib and the generated `worker-configuration.d.ts` both declare globals such as `Request`, `Response` and `fetch`. They type-check cleanly together **only because `skipLibCheck` is `true`** (declaration files are not checked, so duplicate-declaration errors are not reported). Merged global types can be slightly wider than the Workers runtime; Worker code (`workers/app.ts`, `src/platform/indexing-header.ts`) uses only APIs both sides agree on. The ADR records it. If B1's typecheck still reports a conflict, the libs go only to `tsconfig.node.json` and a dedicated delivery include, and the ADR records why.

### DS12. Stand-in assets: SVG compositions, text wordmark, profile-picture-derived icons
**Choice** (B2 creates the media files and the whole manifest, including the four font rows; F0 creates the font files):
- **Wordmark (OQ1, closed)**: the header and footer show a text wordmark, the business name from the profile, in the display font. No raster logo ships.
- **Favicon and share image**: derived from `docs/brand/instagram/ig-profile-picture.jpg`, a client brand asset (the studio's own Instagram profile picture), not a mockup. B2 stores `public/media/stand-ins/favicon.png` (48 px) and `public/media/stand-ins/share-default.jpg` (1200×630, the profile picture centered at native resolution on a `sand-200` canvas; Open Graph does not accept SVG). Both are registered in the manifest with source "docs/brand/instagram/ig-profile-picture.jpg" and the tool used. No file from `docs/client-proposal/mockups/` is copied to `public/`.
- `public/media/stand-ins/` also holds abstract SVG compositions in brand colors: `hero-1.svg`, `hero-2.svg`, `hero-3.svg`, `about-teaser.svg`, `gallery-01.svg` … `gallery-06.svg`.
- The manifest (`infrastructure/content/stand-in-assets.ts`) lists every file under `public/media/stand-ins/` and every `*.woff2` under `public/fonts/` with `{ id, path, kind, source, licence, replaceWith }`. OFL `*.txt` files are licences, not stand-ins. The four font file names are fixed in section 3.3, so B2 writes their rows before the files exist. Checks across the seam: B2's registry test matches `public/media/stand-ins/` and the media rows both ways and only shape-checks the font rows (path under `/fonts/`, non-empty `source` and `replaceWith`); F0's `styles.test.ts` checks the `fonts.css` `url()` entries, the `*.woff2` files and the OFL files; F2, the first slice with both B2 and F0, adds `src/app/ui/font-registry.test.ts`, which matches the font rows against `public/fonts/*.woff2` both ways through `listStandInAssets()`.
- **`Image` atom (F1)**: requires `alt`, `width` and `height`; sets `style={{ aspectRatio }}`; defaults to `loading="lazy" decoding="async"`. `aboveTheFold` switches to `loading="eager"`; `fetchPriority="high"` is accepted only together with `aboveTheFold` (type union). It accepts optional `srcSet` and `sizes` for client photos.
- **Hero slots (F4)**: every hero slot visible above the fold on desktop (slots 1-3) is `aboveTheFold`; only slot 1 gets `fetchPriority="high"`. Slots 2-3 are hidden below `md` (`max-md:hidden`); eager loading still fetches them on phones, which is acceptable for the small SVG stand-ins and is revisited with `<picture>`/`sizes` when client photos arrive. Every other image is lazy.
- Convention for client photos (later): `public/media/<area>/<name>-{480,960,1600}.webp`, originals git-ignored (OD-6).

**Alternatives considered**: a raster logo cropped from image3 (rejected: OQ1 closed in favor of the wordmark; image3 sits in the proposal document next to mockups); stock photos (licence risk); an SVG share image (not accepted by Open Graph consumers).
**Rationale**: The SVGs are licence-clear and tiny, the profile picture is the client's own published asset, and swapping each asset is a one-entry change.

### DS13. Ownership seams: BACK and FRONT orchestrators
**Choice**:
- **BACK (Claude Code)** owns: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `eslint.config.ts`, `vitest.config.ts`, `vite.config.ts`, `tsconfig*.json`, `wrangler.jsonc`, `.dev.vars.example`, `.github/workflows/**`, `tooling/**`, `AGENTS.md`, `README.md`, `openspec/**`, `docs/adr/**`, `src/modules/**`, `src/platform/**`, `src/composition/**`, `src/testing/**` (except the FRONT carve-out below), `workers/**`, `public/media/**`, `public/_headers`.
- **FRONT (pi)** owns: `src/app/**`, plus the carve-outs `public/fonts/**`, `docs/design/**` and `src/testing/fixtures/**`.
- **FRONT UI test fixtures** live in `src/testing/fixtures/**` (FRONT carve-out): fixture data (activity lists, testimonials, gallery items, loader-data objects) and FRONT-only render helpers. The existing `testing` element already forbids production imports, so the spec scenario "No fixtures in production" stays mechanical with no new rule. Colocated fixtures under `src/app/**` were rejected: they would be `delivery`/`ui` elements that production could import. Real fixture files must not use the `.fixture.ts(x)` suffix, which `eslint.config.ts` reserves for virtual architecture-test files (type-checked linting is disabled for it).
- **Explicit carve-outs across the seam**:
  1. `src/app/routes/status.test.ts` (BACK, B2): B2 is the first PR that changes `AppServices`, so it switches line 32 from the literal `{ getSystemStatus }` to `createTestServices({ getSystemStatus })` from `src/testing/fakes/app-services.ts`. One file, no behavior change.
  2. None for fonts (revision 2.1): B2 owns every manifest row, including the four font rows, and FRONT never edits `src/modules/**`. DS12 describes how rows and files are checked across the seam regardless of merge order.
- **Docs ownership**: `docs/design/**` FRONT (Deviation Register, client inputs, brand swap guide); `docs/adr/**` BACK (ADR-0004 in B1); `README.md` BACK (content and stand-in section in B2; a one-line link to the swap guide after F8, folded into the change archive PR).
- **Contract first**: section 5.1 fixes the full `site-content` API, `AppServices` and the test fakes now, so FRONT can write fixtures and containers against it. Any change FRONT needs in a BACK file (a new content field, a config option, a dependency) goes through BACK as a small PR; FRONT does not edit BACK files outside the carve-outs.
- **Merge discipline**: BACK merges first (B1 before any FRONT slice; B2 before F2). FRONT rebases on `origin/main` before starting each slice and before opening its PR. Every PR, BACK or FRONT, leaves `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` and `pnpm build` green.

**Alternatives considered**: one orchestrator for everything (no parallelism in a 3-4 week plan); FRONT owning `src/testing/**` entirely (the DB harness and fakes are backend infrastructure); fonts as BACK assets (rejected by the owner: the F0 pilot keeps tokens, fonts and the contrast gate).
**Rationale**: Path ownership makes conflicts impossible by construction except at two named, one-file seams.

### DS14. Content rule: page copy in `site-content`, microcopy in `src/app`
**Choice**:
- **Business facts and page copy** live in `site-content` (BACK) and are delivered complete in B2 for Inicio, Quiénes somos, Contacto and the three Próximamente pages: profile facts, prefilled WhatsApp messages, SEO titles and descriptions, hero (eyebrow, h1 parts, subtitle, CTA labels "Ver talleres" / "Ver intensivos"), section headings, empty-state messages, history, value proposition, values, FAQ, teaser, contact band, Próximamente titles and messages, gallery alt texts.
- **UI microcopy** lives in `src/app/ui/microcopy.ts` (FRONT): control labels and aria text ("Abrir menú", "Cerrar menú", "Cerrar", "Anterior", "Siguiente", "Saltar al contenido", "(se abre en una pestaña nueva)", "Reproducir video: {title}", "Cómo llegar", "Escribinos" + " por WhatsApp", "Seguinos en Instagram"), section chrome, and the 404/500 error copy (the error boundary must render without loader data). Nav labels live in `src/app/site-map.ts`.
- After B2 merges, content changes go through BACK (small `fix(site-content)` or `feat(site-content)` PRs).
- **Copy rules**: the module API exports the pure `findCopyViolations(strings: readonly string[]): readonly CopyViolation[]` (forbidden `/workshop/i`; tuteo deny list `escríbenos`, `elige`, `selecciona`, `haz clic`, `debes`, `reserva tu`). B2's `repository-content.test.ts` runs it over a deep string walk of the content only. F2 adds `src/app/copy-rules.test.ts`, which runs it over `microcopy.ts` values and `PUBLIC_PAGES` labels (F2 is the first FRONT slice that has both B2 and `site-map.ts`; F1 creates `microcopy.ts` without the scan).

**Alternatives considered**: all copy in content (error copy would depend on a loader that may have failed; aria labels are component concerns); all copy in delivery (breaks D1 and the single-source profile).
**Rationale**: Content that the client approves sits behind the port that may later become panel-editable; component chrome stays with the components.

---

## 3. Tokens

### 3.1 Palette (`tokens.css`; computed WCAG 2.2 ratios, sRGB relative luminance)

| Token | Hex | Role |
|---|---|---|
| `canvas` | `#F9F6F1` | Page background (mockup cream) |
| `surface` | `#FFFFFF` | Cards |
| `sand-100` | `#F0E7DD` | Soft band (testimonials, teaser) |
| `sand-200` | `#E6D7C4` | Brand base: header, footer, contact band |
| `sand-300` | `#D5C1A9` | Tonal fills, icon circles (decorative) |
| `ink-900` | `#1F1B18` | Headings, nav text |
| `ink-700` | `#5E5B57` | Body text (mockup) |
| `ink-600` | `#6B645E` | Muted text and eyebrows, **on canvas/surface/sand-100 only** |
| `clay-600` | `#8A654C` | **Primary** (D4: mockup `#936D53` darkened), button fill, outline border |
| `clay-700` | `#7A5A44` | Primary hover/pressed |
| `clay-800` | `#6E4F3B` | Clay-colored text, links, focus ring |
| `terracotta-700` | `#8C4A2A` | Accent text (DMR terracota cobre) |
| `sage-200` | `#CED2C1` | Pill background |
| `olive-800` | `#42483C` | Text on sage |
| `tan-400` | `#A1876D` | **Restricted**: decorative rules and ornaments only (DMR tan, 3.14:1 on canvas) |
| `white` | `#FFFFFF` | On-primary text |

Not in the palette: DMR terracota rosada `#AF6347` and rosa empolvado `#D19F91` (fail AA, not needed), and agency or partner blues. Mockup `#936D53` gives white 4.61:1 (too little margin), so the primary moved to `#8A654C` (5.19:1).

### 3.2 Declared pairs (the contrast test table)

| fg on bg | Ratio | Kind | Use |
|---|---|---|---|
| ink-900 on canvas / surface / sand-200 | 15.86 / 17.10 / 12.12 | text | Headings, nav |
| ink-700 on canvas / surface / sand-100 / sand-200 | 6.26 / 6.75 / 5.52 / 4.79 | text | Body |
| ink-600 on canvas / surface / sand-100 | 5.40 / 5.82 / 4.76 | text | Muted, eyebrows (not on sand-200: 4.12) |
| white on clay-600 / clay-700 | 5.19 / 6.23 | text | Primary button label, hover |
| clay-800 on canvas / surface / sand-100 / sand-200 | 6.85 / 7.38 / 6.04 / 5.23 | text | Links, text-with-arrow |
| terracotta-700 on canvas / surface / sand-200 | 6.23 / 6.71 / 4.76 | text | Accent |
| olive-800 on sage-200 | 6.12 | text | Pills |
| clay-600 on canvas / surface / sand-200 | 4.81 / 5.19 / 3.68 | ui | Button fill and outline border vs page |
| clay-800 on canvas / surface / sand-200 | 6.85 / 7.38 / 5.23 | ui | Focus ring (2 px, 2 px offset) |
| tan-400 on canvas | 3.14 (3.141) | decorative | Ornamental rules (not gated) |

Apply recomputes every value through the test. The table above is the expected outcome.

### 3.3 Type, space, shape, motion

| Group | Tokens |
|---|---|
| Families (`fonts.css`) | `--font-display: "Cormorant Garamond", "Cormorant Fallback", Georgia, serif`; `--font-body: "Montserrat", "Montserrat Fallback", Arial, sans-serif` |
| Font files | `cormorant-garamond-latin-400-normal.woff2`, `cormorant-garamond-latin-400-italic.woff2`, `montserrat-latin-400-normal.woff2`, `montserrat-latin-600-normal.woff2`; latin subset (covers Spanish), `font-display: swap`, source @fontsource 5.3.0, copied once (no runtime dependency); `OFL-cormorant-garamond.txt`, `OFL-montserrat.txt`. Fallback faces use `local("Georgia")` / `local("Arial")` with `size-adjust`, `ascent-override`, `descent-override` and `line-gap-override` computed from the font metrics (F0 verifies the values) |
| Scale | `--text-display: clamp(2.5rem, 1.75rem + 3vw, 3.75rem)` (h1), `--text-h2: clamp(1.875rem, 1.5rem + 1.5vw, 2.5rem)`, `--text-h3: clamp(1.375rem, 1.25rem + .5vw, 1.625rem)`, `--text-lead: 1.125rem`, `--text-base: 1rem` (body, fixed: at least 16 px everywhere), `--text-sm: .875rem` (meta labels only), `--text-eyebrow: .75rem` (uppercase, `.18em` tracking, weight 600). The display font is used only at h3 size or larger |
| Space | Tailwind `--spacing: .25rem`; `--spacing-section: clamp(3rem, 2rem + 4vw, 6rem)`; `--spacing-gutter: clamp(1.25rem, .75rem + 2vw, 2rem)`; `--container-page: 90rem` |
| Radius | `--radius-sm: .5rem` (images), `--radius-md: .75rem` (cards), `--radius-pill: 9999px` (CTAs, pills) |
| Elevation | `--shadow-card: 0 1px 2px rgb(31 27 24 / .04), 0 6px 20px rgb(31 27 24 / .06)` |
| Motion | `--ease-calm: cubic-bezier(.2, 0, 0, 1)`, `--default-transition-duration: 200ms`; `app.css` sets durations to `0s`/`.01ms` under `prefers-reduced-motion: reduce` |
| Breakpoint | The desktop nav starts at `lg` (64rem). If the 1024 px manual check overflows, move to `xl` and record it in the Deviation Register |

Global base (`app.css`): `canvas` background, `ink-700` body text, `:focus-visible { outline: 2px solid var(--color-clay-800); outline-offset: 2px }`, and minimum targets (24 px for all controls; primary CTAs `min-h-11` = 44 px). Root `<meta name="theme-color">` uses the `sand-200` value; `root.test.ts` asserts it equals the parsed token, so the literal cannot drift.

Static checks (`src/app/ui/styles.test.ts`, unit, `node:fs`, F0):
- Every `url(` in `fonts.css` starts with `/fonts/`, and the root `links` point only to same-origin URLs.
- Each family has an OFL file.
- Fallback faces exist.
- `--text-base` is at least 1rem.
- `app.css` contains the reduced-motion and `:focus-visible` rules.
- Literal scan over `src/app/ui/**/*.tsx` (vacuous in F0, active from F1):
  - arbitrary colors: `/\[#[0-9a-f]{3,8}\]/i`;
  - hex string literals: `/["'`]#[0-9a-f]{3,8}["'`]/i`;
  - arbitrary lengths: `/-\[-?\d*\.?\d+(px|rem|em|%|vh|vw|svh|dvh|ch)\]/`.
  Attribute variants (`data-[state=closed]:`, `aria-[expanded=true]:`) and `style={{ aspectRatio }}` from props are allowed.

---

## 4. Components (`src/app/ui/`, element `ui`, FRONT)

| Level | Component | Slice | Mockup reference | Notes |
|---|---|---|---|---|
| Atom | Button, ButtonLink | F1 | image5 CTAs | `variant: "primary" \| "outline" \| "text-arrow"`; ButtonLink renders `<a>` (React Router `Link` for internal, `<a>` + `rel="noopener noreferrer"` + new-tab microcopy for external) |
| Atom | Heading, Text, Eyebrow | F1 | all | Heading `level` + `size` decoupled to keep the outline valid |
| Atom | Icon | F1 (+F2, F6, F7) | image5, image12 | Inline SVG set grown per slice: arrow, whatsapp, instagram (F1); menu, close (F2); chevron-left/right, play (F6); pin, clock, mail (F7); `aria-hidden` by default |
| Atom | Pill, Image, Divider, VisuallyHidden, SkipLink | F1 | image9 pill | `Image` as in DS12; SkipLink targets `#contenido` and accepts `inert` |
| Molecule | NavLink | F1 | image5 underline | Wraps React Router `NavLink` (`end` for `/`), closes the menu via `onNavigate` |
| Molecule | ContactItem, TrustItem, DateBadge, EmptyState | F1 | image12, image5 | Icon (`aria-hidden`) + label + value or link; EmptyState: message + 1-2 CTAs, no list |
| Molecule | ActivityCard, UpcomingItem, TestimonialCard | F4 | image5, image9 | Contracts used by changes 4 and 7; exercised with fixtures only here |
| Molecule | FaqItem | F5 | — | `<details><summary>` |
| Molecule | VideoFacade | F6 | — | DS8 |
| Organism | SiteHeader, MobileNav, SiteFooter | F2 | image5 header | DS7 |
| Organism | HeroSection | F4 | image5 hero | Eyebrow, one `h1` with an italic accent span (`<em>`), subtitle, two CTAs ("Ver talleres" → `/talleres`, "Ver intensivos" → `/intensivos`), composes HeroCollage |
| Organism | HeroCollage | F4 | image5 collage | 3 slots desktop, 1 below `md`; slot rules in DS12; note text = DMR bajada |
| Organism | TrustRow | F4 | image5 | Renders `null` for `[]` |
| Organism | ActivityShowcase, UpcomingList | F4 | image5 | Lists as props; empty → EmptyState |
| Organism | TestimonialsSection | F4 | image5 | Renders `null` for `[]` |
| Organism | AboutTeaser, ContactBand | F4 | image5, image12 | Teaser links to `/quienes-somos` |
| Organism | ValuesRow, FaqList | F5 | image12 | `null` when their list is empty |
| Organism | GalleryGrid (+ Lightbox) | F6 | image12 | DS8 |
| Template | PublicPage | F2 | — | SkipLink, SiteHeader, `<main id="contenido" tabIndex={-1}>`, SiteFooter; menu state + `inert` |
| Template | ComingSoonPage | F2 | — | h1, message, WhatsApp + Instagram CTAs |
| Template | ErrorPage | F3 | — | 404 and 500 copy (microcopy) with links to Inicio and Contacto |

**Container rule**: route modules in `src/app/routes/*.tsx` compose the page bodies (Inicio, Quiénes somos, Contacto have no page template; they arrange organisms inside `PublicPage`'s outlet). Only route modules call `context.get(servicesContext)`. They build hrefs (`wa.me`, directions) in the loader with the module's link builders and pass plain props. Fixtures live in `src/testing/fixtures/` (DS13).

---

## 5. `site-content` module (BACK, B2)

```
src/modules/site-content/
  domain/business-profile.ts   Fact, Address, WhatsAppLine, RawBusinessProfile, BusinessProfile, publishProfile()
  domain/page-content.ts       SeoCopy, ApprovableText, ImageRef, TrustClaim, Testimonial, GalleryImage, VideoEntry,
                               FaqEntry, ValueItem, Home/About/Contact/ComingSoon content, RawSiteContent
  domain/content-rules.ts      publishableTestimonials, approvedTrustClaims, validateSiteContent, listUnapproved
  domain/copy-rules.ts         findCopyViolations
  domain/links.ts              toWhatsAppDigits, buildWhatsAppUrl, buildDirectionsUrl, instagramUrl
  domain/stand-in.ts           StandInAsset
  application/ports.ts         SiteContentSource
  application/site-content.ts  createSiteContent(source): SiteContent
  infrastructure/repository-content-source.ts
  infrastructure/content/{business-profile,home,about,contact,coming-soon,stand-in-assets}.ts
  index.ts
```

### 5.1 Contracts

```ts
// domain/business-profile.ts
export interface Fact<T> { readonly value: T; readonly confirmed: boolean }
export interface Address {
  readonly street: string;      // "Albert Sabin 6079"
  readonly locality: string;    // "Argüello" (spec name; the neighborhood)
  readonly city: string;        // "Córdoba"
  readonly region: string;      // "Córdoba"
  readonly countryCode: "AR";
}
export interface WhatsAppLine { readonly display: string; readonly provisional: boolean }
export type WhatsAppTopic = "general" | "talleres" | "intensivos" | "eventos-privados";
export interface OpeningHoursSpec { readonly days: readonly ("Mo"|"Tu"|"We"|"Th"|"Fr"|"Sa"|"Su")[]; readonly opens: string; readonly closes: string }
export interface GeoPoint { readonly lat: number; readonly lng: number }
export interface RawBusinessProfile {
  readonly name: string; readonly bajada: string; readonly address: Address;
  readonly instagramHandle: string; readonly whatsapp: WhatsAppLine;
  readonly whatsappMessages: Readonly<Record<WhatsAppTopic, string>>;   // prefilled es-AR voseo messages
  readonly email?: Fact<string>; readonly phone?: Fact<string>;
  readonly hours?: Fact<readonly OpeningHoursSpec[]>; readonly geo?: Fact<GeoPoint>;
}
export interface BusinessProfile extends Omit<RawBusinessProfile, "email"|"phone"|"hours"|"geo"|"instagramHandle"> {
  readonly instagram: { readonly handle: string; readonly url: string };
  readonly email?: string; readonly phone?: string; readonly hours?: readonly OpeningHoursSpec[]; readonly geo?: GeoPoint;
}
export function publishProfile(raw: RawBusinessProfile): BusinessProfile; // unconfirmed -> undefined

// domain/links.ts
export type WhatsAppError = { readonly kind: "invalid-number" };
export function toWhatsAppDigits(display: string): Result<string, WhatsAppError>;
//   strip non-digits; 10 digits (AR area code + local) -> "549" + digits; 13 digits starting "549" -> as is; else error
export function buildWhatsAppUrl(display: string, message: string): Result<string, WhatsAppError>;
//   https://wa.me/5493517395239?text=<encodeURIComponent(message)>
export function buildDirectionsUrl(a: Address): string;
//   https://www.google.com/maps/dir/?api=1&destination=<encodeURIComponent("Albert Sabin 6079, Argüello, Córdoba, Argentina")>
export function instagramUrl(handle: string): string; // https://www.instagram.com/calma.inquieta/

// domain/page-content.ts
export interface SeoCopy { readonly title: string; readonly description: string }
export interface Approvable { readonly id: string; readonly approved: boolean }
export interface ApprovableText extends Approvable { readonly text: string }
export interface ImageRef { readonly src: string; readonly alt: string; readonly width: number; readonly height: number }
export interface TrustClaim extends Approvable { readonly label: string; readonly icon: "hands"|"leaf"|"heart"|"group"; readonly appliesTo: "all"|"talleres"|"intensivos" }
export interface Testimonial { readonly id: string; readonly quote: string; readonly author: string; readonly consent?: { readonly written: true; readonly recordedOn: string } }
export interface GalleryImage extends ImageRef { readonly id: string; readonly decorative?: true }
export interface VideoEntry { readonly id: string; readonly youtubeId: string; readonly title: string; readonly poster: ImageRef }
export interface ValueItem extends Approvable { readonly title: string; readonly text: string }
export interface FaqEntry extends Approvable { readonly question: string; readonly answer: string }
export interface HomePageContent {
  readonly seo: SeoCopy;
  readonly hero: {
    readonly eyebrow: string;
    readonly title: { readonly lead: string; readonly accent: string; readonly trail: string }; // accent renders italic
    readonly subtitle: string; readonly primaryCtaLabel: string; readonly secondaryCtaLabel: string;
    readonly images: readonly ImageRef[];                       // 1-3 slots, registered stand-ins
  };
  readonly trustClaims: readonly TrustClaim[];                  // reader: approved only
  readonly monthly: { readonly heading: string; readonly emptyMessage: string };
  readonly intensivos: { readonly heading: string; readonly emptyMessage: string };
  readonly teaser: { readonly heading: string; readonly body: ApprovableText; readonly image: ImageRef; readonly linkLabel: string };
  readonly testimonials: { readonly heading: string; readonly items: readonly Testimonial[] }; // reader: consented only
  readonly contactBand: { readonly heading: string; readonly body: string };
}
export interface AboutPageContent {
  readonly seo: SeoCopy; readonly heading: string;             // "Quiénes somos"
  readonly history: readonly ApprovableText[]; readonly valueProposition: ApprovableText;
  readonly values: readonly ValueItem[]; readonly gallery: readonly GalleryImage[];
  readonly videos: readonly VideoEntry[]; readonly faq: readonly FaqEntry[];
  readonly sectionHeadings: { readonly values: string; readonly gallery: string; readonly faq: string };
}
export interface ContactPageContent { readonly seo: SeoCopy; readonly heading: string; readonly intro: string }
export type ComingSoonSlug = "talleres" | "intensivos" | "eventos-privados";
export interface ComingSoonContent { readonly seo: SeoCopy; readonly title: string; readonly message: string; readonly whatsappTopic: WhatsAppTopic }
export interface RawSiteContent {
  readonly profile: RawBusinessProfile; readonly home: HomePageContent; readonly about: AboutPageContent;
  readonly contact: ContactPageContent; readonly comingSoon: Readonly<Record<ComingSoonSlug, ComingSoonContent>>;
  readonly standIns: readonly StandInAsset[];
}
export type ContentIssue = { readonly id: string; readonly rule: "alt-missing"|"claim-scope"|"video-id"|"empty-seo"|"duplicate-id"|"unregistered-stand-in" };
export function validateSiteContent(raw: RawSiteContent): readonly ContentIssue[];

// domain/copy-rules.ts
export type CopyViolation = { readonly text: string; readonly rule: "workshop" | "tuteo"; readonly match: string };
export function findCopyViolations(strings: readonly string[]): readonly CopyViolation[];

// domain/stand-in.ts
export interface StandInAsset {
  readonly id: string; readonly path: string;                  // public URL path, e.g. "/media/stand-ins/hero-1.svg"
  readonly kind: "image" | "font" | "favicon" | "share-image";
  readonly source: string; readonly licence: string; readonly replaceWith: string;
}

// application
export interface SiteContentSource { load(): Promise<RawSiteContent> }
export interface SiteContent {
  getBusinessProfile(): Promise<BusinessProfile>;
  getHomePage(): Promise<HomePageContent>;        // trustClaims approved only; testimonials consented only
  getAboutPage(): Promise<AboutPageContent>;      // values, gallery, videos, faq: [] when empty
  getContactPage(): Promise<ContactPageContent>;
  getComingSoonPage(slug: ComingSoonSlug): Promise<ComingSoonContent>;
  listUnapprovedContent(): Promise<readonly { id: string; area: string }[]>;
  listStandInAssets(): Promise<readonly StandInAsset[]>; // .length = stand-ins remaining (launch gate)
}
export function createSiteContent(source: SiteContentSource): SiteContent;

// index.ts re-exports: the types above, createSiteContent, SiteContentSource, publishProfile,
// toWhatsAppDigits, buildWhatsAppUrl, buildDirectionsUrl, instagramUrl, findCopyViolations.
```

**Composition (B2)**:
```ts
export interface SiteConfig { readonly baseUrl: string; readonly indexingEnabled: boolean }
export interface AppServices {
  readonly getSystemStatus: GetSystemStatus;
  readonly siteContent: SiteContent;
  readonly site: SiteConfig;
}
export interface RuntimeConfig { readonly databaseUrl: string; readonly buildCommit: string; readonly siteUrl: string; readonly indexingEnabled: boolean }
// module scope: const siteContent = createSiteContent(createRepositoryContentSource());
```

**Test fakes (B2, `src/testing/fakes/`)**:
- `in-memory-site-content-source.ts`: `createInMemorySiteContentSource(raw)` and `buildRawSiteContent(overrides?)` (a minimal valid `RawSiteContent`, reused by FRONT fixtures).
- `app-services.ts`: `createTestServices(overrides?: Partial<AppServices>): AppServices` with defaults: `getSystemStatus` resolving an ok view, `siteContent` over the in-memory source, `site = { baseUrl: "https://example.test", indexingEnabled: false }`.

### 5.2 Content seed (honest defaults, B2)

| Item | Seed | Status |
|---|---|---|
| Name, address (street Albert Sabin 6079, locality Argüello, city Córdoba), Instagram `calma.inquieta`, bajada "Equilibrio entre serenidad y movimiento" | DMR 2 | Confirmed (public bio and flyers) |
| WhatsApp `351 739 5239` | DMR R10 / D8 | `provisional: true` |
| Prefilled messages, for example "Hola, quiero información sobre los talleres intensivos." | Drafted, voseo | Page copy |
| Email, phone, hours, geo | — | Absent |
| Hero, history, value proposition, teaser, values, FAQ | Drafted from DMR evidence, voseo, "nosotras"; no founders, years, prices or policies | `approved: false` |
| Trust claims | e.g. "Talleres intensivos con materiales incluidos" (`appliesTo: "intensivos"`), "No necesitás experiencia" | `approved: false` → trust row hidden |
| Section headings, empty-state messages, Próximamente titles and messages, SEO copy for 6 pages | Drafted, voseo | Page copy |
| Testimonials, videos | `[]` | — |
| Gallery | 6 SVG stand-ins with descriptive alt | Stand-ins |
| Manifest | 12 media files + 4 font rows (B2 owns all rows; checks per DS12) | Stand-ins |

### 5.3 Content tests (unit, B2)

`repository-content.test.ts` runs against the real data:
- `validateSiteContent` returns `[]` (includes: every content image path is registered in the manifest).
- `findCopyViolations` over a deep string walk of all content returns `[]`.
- No file under `src/` (excluding test files) or `public/` contains or is named after `client-proposal/mockups`.
- The WhatsApp display string appears in exactly one content file (source scan).

`stand-in-assets.test.ts`: `public/media/stand-ins/` and the media rows of the manifest match both ways (the failure names the file or entry); the four font rows are shape-checked only (path under `/fonts/`); every entry has non-empty `source` and `replaceWith`. F2's FRONT `font-registry.test.ts` matches the font rows against `public/fonts/*.woff2` both ways (DS12).

---

## 6. Routes and data flow

```
Request /contacto
 Worker app.ts ── readWorkerEnv (SITE_URL, SITE_INDEXING validated) ── createRequestServices ──► context
   └─ RR handler
       ├─ routes/public-layout.tsx loader ─► siteContent.getBusinessProfile()
       │       └─► { wordmark, whatsappHref, instagramHref, footer facts (confirmed only), bajada }
       ├─ routes/contact.tsx loader ─► getContactPage() + profile ─► { page, items, directionsHref, jsonLd, meta }
       ├─ meta({ loaderData }) ─► buildPageMeta(meta input incl. site.baseUrl, site.indexingEnabled)
       └─ render: PublicPage(chrome props) > organisms composed by the route > <script type="application/ld+json">
 Worker wraps response ─► withIndexingHeader (src/platform; X-Robots-Tag when off)
Unknown /nosotros ─► splat loader throws 404 ─► layout ErrorBoundary ─► chrome + ErrorPage(404), status 404
```

| Path | Module | Slice | Loader returns | Indexable |
|---|---|---|---|---|
| `/` | `home.tsx` | F4 (404 inside chrome before) | hero, approved claims, `monthly: []`, `intensivos: []` (literal empty arrays; change 4 replaces them), teaser, testimonials, contact band, JSON-LD (F7) | yes (F4) |
| `/quienes-somos` | `about.tsx` | F5 (+F6) | h1 "Quiénes somos", history, values, gallery, videos, faq | yes (F5) |
| `/contacto` | `contact.tsx` | F7 | items, directions, JSON-LD | yes (F7) |
| `/talleres`, `/intensivos`, `/eventos-privados` | `coming-soon.tsx` (slug from `PUBLIC_PAGES` by pathname) | F2 (meta F3) | title, message, CTAs | no (always `noindex`) |
| `*` | `not-found.tsx` | F3 | throws 404 | no |
| `/robots.txt`, `/sitemap.xml` | resource routes | F3 | `Response` | — |
| `/status` | unchanged | — | unchanged | `noindex` (existing) |

Root `links` (F0): preload `cormorant-garamond-latin-400-normal.woff2` and `montserrat-latin-400-normal.woff2` (`crossOrigin="anonymous"`), plus the stylesheet through `import appCss from "./ui/styles/app.css?url"` (B1's spike decides whether lint needs configuration; the fallback is a side-effect `import "./ui/styles/app.css"`). `<meta name="theme-color">` with the `sand-200` value (F0). The favicon link (`/media/stand-ins/favicon.png`) lands in F2, after B2 ships the file.

Optional (B2 verifies Workers static-assets support): `public/_headers` with `Cache-Control: public, max-age=86400` for `/fonts/*` and `/media/*`. File names carry no version, so no `immutable`. Static assets are served before the Worker, so they never get the `X-Robots-Tag` header; while the gate is off, `robots.txt` `Disallow: /` covers them.

---

## 7. File Changes

Owner: BACK (Claude Code), FRONT (pi), or carve-out (DS13). Lines are not listed here; see section 10.

| File | Action | Owner | Slice | Description |
|---|---|---|---|---|
| `package.json`, `pnpm-lock.yaml` | Modify | BACK | B1 | 8 exact devDependencies (DS1, DS10) |
| `pnpm-workspace.yaml` | Modify (only if pnpm blocks a pin) | BACK | B1 | `minimumReleaseAgeExclude` entries |
| `vite.config.ts` | Modify | BACK | B1 | Tailwind plugin, verified order |
| `vitest.config.ts` | Modify | BACK | B1 | `ui` project; `unit` excludes `*.ui.test.tsx` |
| `tsconfig.base.json` | Modify | BACK | B1 | DOM libs (DS11) |
| `eslint.config.ts`, `tooling/architecture/architecture.test.ts`, `AGENTS.md` | Modify | BACK | B1 | `ui` element, rows, table; `?url` lint config if the spike needs it |
| `src/platform/env.ts`, `src/platform/env.test.ts` | Modify | BACK | B1 | `SITE_URL`, `SITE_INDEXING`, refine |
| `.dev.vars.example`, `wrangler.jsonc` | Modify | BACK | B1 | Names; local values |
| `src/platform/indexing-header.ts` (+ test) | Create | BACK | B1 | `withIndexingHeader` |
| `workers/app.ts` | Modify | BACK | B1, B2 | Header wrap (B1); site config into `RuntimeConfig` (B2) |
| `.github/workflows/ci.yml`, `tooling/deploy-workflow.test.ts` | Modify | BACK | B1 | Shape guard, `STATUS_URL` env, `--var SITE_URL` |
| `src/testing/ui/{setup,axe}.ts`, `src/testing/ui/harness.ui.test.tsx` | Create | BACK | B1 | Harness and smoke test |
| `docs/adr/0004-design-system-and-content.md`, `docs/adr/0001-stack.md` | Create / Modify | BACK | B1 | ADR (Tailwind, `ui` element, content port, indexing gate, DOM-lib limitation, unmasked origin); stack line |
| `src/modules/site-content/**` (+ tests) | Create | BACK | B2 | Section 5 |
| `src/composition/request-services.ts`, `request-services.db.test.ts` | Modify | BACK | B2 | `siteContent`, `site`, config fields |
| `src/testing/fakes/{app-services,in-memory-site-content-source}.ts` | Create | BACK | B2 | Fakes (5.1) |
| `src/app/routes/status.test.ts` | Modify | BACK carve-out | B2 | `createTestServices()` (DS13 seam 1) |
| `public/media/stand-ins/*` | Create | BACK | B2 | 10 SVGs, favicon, share image (binaries, not counted) |
| `public/_headers` | Create (optional) | BACK | B2 | Asset caching |
| `README.md` | Modify | BACK | B2 (+ link after F8) | Content, manifest and launch-gate section |
| `src/app/ui/styles/{tokens,fonts,app}.css` | Create | FRONT | F0 (`app.css` grows in F2) | Tokens, fonts, base |
| `src/app/ui/tokens/{contrast,contrast-pairs}.ts`, `contrast.test.ts`, `src/app/ui/styles.test.ts` | Create | FRONT | F0 | DS2, static checks |
| `src/app/root.tsx`, `src/app/root.test.ts` | Modify | FRONT | F0, F2, F3 | `es-AR`, links, theme-color (F0); favicon (F2); Spanish root boundary (F3) |
| `public/fonts/*` (4 WOFF2 + 2 OFL) | Create | FRONT carve-out | F0 | Binaries, not counted |
| `src/app/ui/font-registry.test.ts` | Create | FRONT | F2 | Font rows vs `public/fonts/*.woff2`, both ways, via `listStandInAssets()` (DS12) |
| `src/app/ui/atoms/*`, F1 molecules, `src/app/ui/microcopy.ts` | Create | FRONT | F1 | Section 4 |
| `src/app/site-map.ts` (+ test), `src/app/copy-rules.test.ts` | Create | FRONT | F2 | `PUBLIC_PAGES`, fitness test, microcopy scan |
| `src/app/routes.ts` | Modify | FRONT | F2-F7 | DS6 intermediate and final states |
| `src/app/routes/{public-layout,coming-soon}.tsx` (+ tests) | Create | FRONT | F2 (+F3 meta, boundary) | Containers |
| `src/app/ui/organisms/{site-header,mobile-nav,site-footer}.tsx`, `templates/{public-page,coming-soon-page}.tsx` | Create | FRONT | F2 | DS7 |
| `src/app/seo/{meta,canonical,robots,sitemap}.ts` (+ tests), `src/app/routes/{robots,sitemap}.ts` (+ tests) | Create | FRONT | F3 | DS9 |
| `src/app/routes/not-found.tsx`, `not-found.test.ts` | Modify | FRONT | F3 | Splat inside the layout |
| `src/app/ui/templates/error-page.tsx` | Create | FRONT | F3 | ErrorPage |
| `src/app/routes/home.tsx` (+ tests), F4 organisms and molecules | Create | FRONT | F4 | Inicio |
| `src/app/routes/about.tsx` (+ tests), ValuesRow, FaqItem, FaqList | Create | FRONT | F5 | Quiénes somos |
| GalleryGrid (+ Lightbox), VideoFacade | Create | FRONT | F6 | DS8 |
| `src/app/routes/contact.tsx` (+ tests), `src/app/seo/json-ld.ts`, `src/app/ui/json-ld-script.tsx` | Create | FRONT | F7 | Contacto, JSON-LD on Inicio and Contacto |
| `src/testing/fixtures/**` | Create | FRONT carve-out | F1-F7 | UI fixtures and render helpers |
| `docs/design/{deviation-register,client-inputs,brand-swap-guide}.md` | Create | FRONT carve-out | F8 | Deviations (incl. OQ2), inputs, swap guide |

---

## 8. Testing Strategy

| Layer | What | Approach | Project | Slice |
|---|---|---|---|---|
| Unit, Strict TDD | Env: `SITE_URL` missing/invalid → names-only error; indexing default off; `on` + `http` rejected naming `SITE_INDEXING`; `withIndexingHeader` off/on | Pure functions | unit | B1 |
| Tooling | `ui` boundary rows; deploy shape guard (pass, fail without value), `STATUS_URL` env, `--var SITE_URL`, order | ESLint `lintText`; bash runs of the step script | unit | B1 |
| Harness | JSX compiles, jest-dom matcher, axe helper, overhead measurement | Smoke test | ui | B1 |
| Unit, Strict TDD | `publishProfile`, `toWhatsAppDigits`/`buildWhatsAppUrl` (spaces, accents, `?`, no digits → error), `buildDirectionsUrl`, `publishableTestimonials`, `approvedTrustClaims`, `validateSiteContent` (each rule), `listUnapproved`, `findCopyViolations`, `createSiteContent` with the in-memory source (port substitution) | Pure functions | unit (90 % coverage gate on site-content domain/application) | B2 |
| Content | Repository data validation, copy rules on content, stand-in registry sync, no mockup paths, single WhatsApp source, `getBusinessProfile()` shape (street, locality Argüello, city Córdoba, Instagram) | `node:fs` + data import | unit | B2 |
| Unit, Strict TDD | `contrastRatio`, `parseColorTokens`, declared pairs; static CSS checks; root `lang`, links same-origin, theme-color = token | Table-driven; reads CSS files | unit | F0 |
| Copy | Microcopy and nav labels pass `findCopyViolations` | Imports `microcopy.ts`, `PUBLIC_PAGES` | unit | F2 |
| Unit, Strict TDD | `buildPageMeta` (template, empty description throws, OG set, robots per gate and per coming-soon), `canonicalUrl` (trailing slash, query), robots off/on, sitemap `<loc>` per given paths, share image registered | Pure functions | unit | F3 |
| Unit, Strict TDD | JSON-LD (minimal, confirmed hours, provisional number absent, `</script>` escaped, no FAQPage, `addressLocality` Córdoba) | Pure functions | unit | F7 |
| Delivery | Loaders and meta per route (home returns empty lists; coming-soon `noindex`; splat throws 404; `/status` unchanged); sitemap/robots content types; site-map ↔ routes fitness: every path is a route, and `indexable` count equals the then-current value (0 in F2-F3, 1 in F4, 2 in F5-F6, **3 from F7**); title/description uniqueness across the pages that exist (6 from F7) | `createLoaderArgs` + `createTestServices` | unit | F2-F7 |
| Component | Atoms (variants, disabled, Image alt/aspect/lazy/eager/fetchPriority), header (`nav ul a` = 6 links in order, `aria-current` cases, exactly one CTA with the profile `wa.me` href), mobile nav (toggle, Escape → focus on toggle, link closes, `inert` on main/footer/SkipLink), footer (confirmed-only), EmptyState, showcase/list empty vs fixtures, testimonials hidden/visible, values, gallery + lightbox (open, ArrowRight, wrap, Escape, focus return), FAQ disclosure, video facade (no iframe before, nocookie iframe after Enter/Space), contact items | Testing Library + user-event + `expectNoAxeViolations` in every test file | ui | F1-F7 |
| Page | Inicio (hero h1 with `<em>`, CTAs, hero slots eager and slot 1 high priority, no currency/clock pattern), Quiénes somos (all optional sections empty → only history, axe clean), Contacto (no form/iframe), coming-soon, 404/500 (no secret text), one `h1`, heading order | `createRoutesStub` with loader fixtures; axe with `region` on | ui | F2-F7 |
| Manual | 1672 px vs image5/image12; 360/390 px phones; 1024 px nav fit; Lighthouse mobile (LCP < 2.5 s, CLS < 0.1); dialog and `inert` in Chrome, Firefox, Safari | PR checklist | preview | F2-F7 |

**Suite time.** About 22-26 `*.ui.test.tsx` files. jsdom setup costs about 0.3-0.6 s per file and `axe.run` about 50-200 ms per call (estimate). Expected cost: about +10-15 s wall at 2 workers, on top of the accepted 77 s. Budget: the `ui` project adds at most 20 s wall. B1 measures the baseline with the smoke file and records it in the PR; FRONT records the running cost in each PR. If the budget is exceeded, apply these in order:
1. Group small atoms into one file per level.
2. Run axe once per state instead of once per assertion.
3. Use `isolate: false` for the `ui` project (cleanup already runs afterEach). This is a BACK change to `vitest.config.ts`.
4. Spike happy-dom against the axe suite (BACK).

---

## 9. Threat Matrix

The change adds application HTTP routes and one CI shell step. It adds no subprocess spawning in product code, no VCS/PR automation, and no executable-file classification. The matrix rows do not apply:

| Boundary | Applicability |
|---|---|
| Documentation-like paths | N/A: no file classification or execution |
| Git repository selection | N/A: no git automation |
| Commit state | N/A: no commit automation |
| Push state | N/A: no push automation |
| PR commands | N/A: no PR automation |

The CI shell edit is covered as a requirement with planned RED tests in `tooling/deploy-workflow.test.ts` (B1):

| Case | Safe behavior | Failure behavior | RED test |
|---|---|---|---|
| `STATUS_URL` ends in `/status` | Guard exits 0; deploy derives `SITE_URL` with `${STATUS_URL%/status}` | — | Run the guard script with `https://x.workers.dev/status`: exit 0 |
| `STATUS_URL` with another shape | — | Guard exits non-zero before migrations with `::error::deploy misconfigured: STATUS_URL must end in /status`; the value is never printed | Run with `https://x.workers.dev/`: non-zero, error text present, value absent |
| Value echo | No `echo` of `$STATUS_URL` anywhere | — | Existing no-echo regex keeps passing |
| Secret scope | Secrets referenced only in the deploy job; every later step gated | — | Existing structure tests; new assertions for the deploy step env and the guard order |

Web-specific safety rules are carried as tests: JSON-LD script escaping, no third-party requests before the video click, external links `rel="noopener noreferrer"`, no error detail in error pages, and the indexing gate defaulting off.

---

## 10. Delivery plan (stacked PRs to `main`; Conventional Commits, never `Co-Authored-By` or AI attribution)

Authored additions plus deletions. Binaries (fonts, media), the lockfile and generated types are excluded; content copy counts. Forecasts come from the per-file estimates below each slice.

### 10.1 Order and dependencies

```
P0 ──► B1 ──┬──► F0 (pilot; owner review stop) ──► F1 ──┐
            │                                            ├──► F2 ──► F3 ──► F4 ──► F5 ──► F6 ──► F7 ──► F8
            └──► B2 (developed in parallel with F0/F1) ──┘
```

- BACK merges first: B1 before any FRONT slice; B2 before F2. F0 and F1 need only B1.
- Every PR targets `main`. FRONT rebases on `origin/main` before starting each slice and before opening its PR; a slice that started on an unmerged dependency branch rebases once that dependency merges, until its diff shows only its own work.
- Every PR leaves lint, typecheck, test, format and build green, the indexing gate off, and the preview deployable.
- F0 is the owner's pilot: pi stops for owner review after it, before F1.
- Each FRONT slice is at most 400 production lines. Test-driven overage ships as `size:exception` without asking (owner standing policy). If a slice's production count passes 400 during apply, it splits along the rule given for that slice.

### 10.2 Slices

| PR | Owner | Content | Needs (merged) | Production | Tests | Example commit |
|---|---|---|---|---|---|---|
| P0 | BACK | This change's proposal, specs, design, tasks, plus a closed ODD document | — | 0 (docs only; planning artifacts, about 2,000-2,600 doc lines) | 0 | `docs(openspec): add design-system-and-public-site planning artifacts` |
| B1 | BACK | Tooling, harness, `ui` element, env, indexing header, CI; throwaway spike evidence in the PR body | P0 | 80-115 (+ ADR 50-70 docs) | 170-245 | `build(design-system): add tailwind, ui test harness and site url config` |
| B2 | BACK | Whole `site-content` module with all business content and page copy, composition wiring, fakes, `status.test.ts` carve-out, stand-in media, README section | B1 | 630-880 (`size:exception` approved) | 380-530 | `feat(site-content): add typed site content, business profile and stand-in registry` |
| F0 | FRONT | Pilot: `tokens.css`, `fonts.css`, `app.css`, contrast functions + pairs + test, `styles.test.ts`, `root.tsx` `es-AR` + links + theme-color, `root.test.ts`, `public/fonts` (WOFF2 + OFL); re-proves `pnpm build` | B1 | 220-300 | 130-180 | `feat(design-system): add brand tokens, self-hosted fonts and a wcag contrast gate` |
| F1 | FRONT | Atoms, NavLink, ContactItem, TrustItem, DateBadge, EmptyState, `microcopy.ts`, first icons, fixtures | B1 (after F0 review) | 280-380 | 220-290 | `feat(design-system): add atoms and base molecules` |
| F2 | FRONT | `site-map.ts`, `routes.ts`, public-layout route, SiteHeader, MobileNav, SiteFooter, PublicPage, ComingSoonPage + coming-soon route, favicon link, scroll-lock CSS, `copy-rules.test.ts` | B2, F1 | 290-400 | 200-270 | `feat(public-layout): add header, mobile navigation, footer and coming-soon pages` |
| F3 | FRONT | Meta/canonical/OG builders and wiring, robots and sitemap builders + routes, splat 404, layout ErrorBoundary, ErrorPage, Spanish root boundary | F2 | 180-260 | 200-260 | `feat(seo): add page metadata, robots, sitemap and styled error pages` |
| F4 | FRONT | Inicio: HeroSection, HeroCollage, TrustRow, ActivityCard, UpcomingItem, ActivityShowcase, UpcomingList, TestimonialCard, TestimonialsSection, AboutTeaser, ContactBand, `home.tsx`; `/` indexable | F3 | 300-400 | 200-270 | `feat(home): add inicio with hero and empty states` |
| F5 | FRONT | Quiénes somos: `about.tsx`, history, ValuesRow, FaqItem, FaqList; indexable | F4 | 105-145 | 110-150 | `feat(about): add quienes somos with values and faq` |
| F6 | FRONT | GalleryGrid + Lightbox, VideoFacade, icons, `about.tsx` wiring | F5 | 165-230 | 140-190 | `feat(about): add gallery lightbox and video facade` |
| F7 | FRONT | Contacto, LocalBusiness JSON-LD (builder, serializer, script component) on Inicio and Contacto, icons; indexable; "indexable = 3" assertion | F6 | 130-180 | 150-200 | `feat(contact): add contacto and local business structured data` |
| F8 | FRONT | Deviation Register (incl. OQ2 CTA label, mockup CTA variants, breakpoint, palette, removed nav items), client inputs, brand swap guide | F7 | 180-260 (docs) | 0 | `docs(design): add deviation register, client inputs and brand swap guide` |
| **Total** | | | | **~2,380-3,290 + 230-330 docs** | **~1,900-2,585** | **~4,500-6,200** (excluding P0) |

### 10.3 Per-slice estimates (production lines)

- **B1** (80-115): `package.json` 9; `pnpm-workspace.yaml` 0-12; `vite.config.ts` 2; `tsconfig.base.json` 1; `vitest.config.ts` 14-18; `eslint.config.ts` 8-12; `AGENTS.md` 3-4; `env.ts` 12-16; `.dev.vars.example` + `wrangler.jsonc` 3; `indexing-header.ts` 12-16; `workers/app.ts` 3-5; `ci.yml` 12-16. Docs: ADR-0004 + ADR-0001 line 50-70. Tests and harness: `setup.ts` 30-40, `axe.ts` 20-30, smoke 15-25, architecture rows 15-25, env tests 30-40, header tests 20-30, workflow tests 40-55. Total with docs 300-430, under or near the budget; any test-driven overage ships as `size:exception`.
- **B2** (630-880): `index.ts` 25-35; `business-profile.ts` 40-50; `page-content.ts` 75-95; `content-rules.ts` 55-75; `links.ts` 30-40; `copy-rules.ts` 20-30; `stand-in.ts` 8-12; application 45-60; repository source 12-18; content files: profile 20-28, home 45-60, about 90-120, contact 18-26, coming-soon 22-30, manifest 85-125 (16 entries); composition 18-25; `workers/app.ts` 3-5; `_headers` 6-8; README 15-25. The likely value is 700-800. The owner approved `size:exception` for B2 as one cohesive unit (band 580-750); the upper estimate exceeds that band by up to about 130 lines (section 12). Split fallback only if it passes 880: B2a (module, rules, links, profile, composition, fakes, carve-out) and B2b (page copy, manifest, media, README); F2 then needs both.
- **F0** (220-300): `tokens.css` 45-55; `fonts.css` 45-55; `app.css` 35-50; `contrast.ts` 35-45; `contrast-pairs.ts` 40-65; `root.tsx` 20-30.
- **F1** (280-380): Button/ButtonLink 45-60; Heading 20-25; Text 12-16; Eyebrow 8-10; Icon (3 icons + frame) 30-45; Pill 8-12; Image 28-36; Divider 5-8; VisuallyHidden 8-10; SkipLink 10-14; NavLink 18-25; EmptyState 22-30; ContactItem 18-24; TrustItem 12-18; DateBadge 18-24; `microcopy.ts` 15-25.
- **F2** (290-400): `site-map.ts` 22-30; `routes.ts` 12-18; `public-layout.tsx` 40-55; `coming-soon.tsx` 25-35; SiteHeader 40-55; MobileNav 40-60; SiteFooter 35-50; PublicPage 35-50; ComingSoonPage 20-30; icons 8-12; microcopy + `app.css` + root favicon 5-10. Split rule: if production passes 400, SiteFooter, ComingSoonPage and the coming-soon route move to F2b.
- **F3** (180-260): `meta.ts` 45-60; `canonical.ts` 10-15; robots builder 8-12; sitemap builder 14-20; resource routes 22-30; meta wiring 12-20; splat 2-5; layout ErrorBoundary 25-35; ErrorPage 22-30; root boundary 10-18; error microcopy 8-12.
- **F4** (300-400): HeroSection 30-40; HeroCollage 25-35; TrustRow 12-18; ActivityCard 22-30; UpcomingItem 18-24; ActivityShowcase 25-35; UpcomingList 22-30; TestimonialCard 18-24; TestimonialsSection 18-25; AboutTeaser 22-30; ContactBand 28-38; `home.tsx` 55-75. Split rule: if production passes 400, TestimonialCard and TestimonialsSection move to F4b (they are hidden in production and are first in the descoping order).
- **F5** (105-145): `about.tsx` 50-70; ValuesRow 22-30; FaqItem 14-20; FaqList 18-25.
- **F6** (165-230): GalleryGrid 40-55; Lightbox 70-95; VideoFacade 35-50; icons 10-15; `about.tsx` wiring 10-15.
- **F7** (130-180): `contact.tsx` 55-75; `json-ld.ts` 35-50; serializer 8-12; script component 10-15; `home.tsx` JSON-LD 6-10; icons 12-18.
- **F8** (180-260 docs): Deviation Register 90-130; client inputs 40-60; brand swap guide 50-70.

The total is above the proposal's 3,300-4,400 because the `ui` boundary, the static CSS checks, the separate SEO/error slice, the complete B2 copy and manifest, the CI guard tests and the two-orchestrator seams are now explicit.

### 10.4 Guard lines for `sdd-tasks`

- `Decision needed before apply: No` (the owner chose stacked-to-main and approved the B2 `size:exception`).
- `Chained PRs recommended: Yes`
- `400-line budget risk: High`

---

## 11. Migration / Rollout / Rollback

- No data migration, no database change.
- Indexing stays off: `SITE_INDEXING` is `off` in `wrangler.jsonc` and defaults to off in the schema. Change 8 flips it together with an `https` `SITE_URL`.
- Preview states between slices: after F2 the three Próximamente pages work and `/`, `/quienes-somos`, `/contacto` answer 404 (root boundary in F2, the styled 404 inside the chrome from F3) until F4, F5 and F7. The preview is not public and is not indexed.
- Per PR: `git revert <merge-commit>`, then CI redeploys. F2 moves the index not-found route into the layout and F3 replaces the English root boundary; reverting either restores the previous behavior. Reverting B1 or B2 requires reverting the FRONT slices that depend on them first (dependency order in 10.1).
- Broken deploy: `wrangler rollback` (owner runbook), then revert.
- Gate failing open: set `SITE_INDEXING=off` and redeploy.
- Brand swap: palette → `tokens.css` (the contrast test re-checks it), fonts → `fonts.css` + binaries + manifest rows, images → manifest entries.

---

## 12. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Tailwind 4 plugin interaction with the Cloudflare plugin or React Router build | Low-Med | B1 throwaway spike before any FRONT work; CSS-variable fallback (DS1) |
| DOM lib conflicts with generated Worker runtime types | Low-Med | B1 typecheck; known `skipLibCheck` limitation recorded (DS11); split-lib fallback |
| `?url` CSS import rejected by the boundaries resolver | Low | B1 spike checks lint and adds configuration; side-effect import fallback; the real-tree architecture test catches it in F0 |
| B2 exceeds the owner's approved band (forecast 630-880 vs 580-750) | Medium | Per-file estimate shown; likely 700-800; B2a/B2b split only above 880; the owner sees the overage in the B2 PR body |
| Font manifest seam (rows in B2, files in F0) | Low | DS12: B2 shape-checks the font rows; F2's `font-registry.test.ts` checks rows against files once both exist; FRONT never edits `src/modules/**` |
| Parallel drift: FRONT needs a content field or config not in the contract | Medium | Contract fixed in 5.1; changes go through small BACK PRs; FRONT rebases before each slice |
| Rebase conflicts on `routes.ts` or `root.tsx` | Low | Both are FRONT-only files; BACK never touches `src/app/**` except `status.test.ts` in B2 |
| jsdom gaps (`<dialog>`, `inert`, `matchMedia`) give false confidence | Medium | Polyfill only when missing; assert attributes and focus; manual cross-browser check |
| `ui` project slows `pnpm test` | Medium | Budget of at most 20 s wall, measured in B1 and tracked per FRONT PR; mitigation ladder in section 8 |
| Unconfirmed facts reach the page | Medium | `Fact.confirmed` readers, `approved` markers, consent type, link-only provisional WhatsApp, JSON-LD tests |
| Low-resolution profile picture makes a weak share image | Medium | Centered at native size on a sand canvas; replaced when the client delivers a vector logo (manifest `replaceWith`) |
| Wrangler `--var` parsing of a value that contains `:` | Low | B1 verifies with `wrangler deploy --dry-run --var "SITE_URL:https://example.workers.dev"` and records the bindings output |
| Derived workers.dev origin is visible in CI logs | Low (by design) | Not a secret once deployed; documented in the workflow comment and the ADR |
| Font metric overrides off, causing CLS on swap | Medium | F0 computes them from font tables; Lighthouse CLS check |
| `lg` breakpoint too tight for 6 entries + CTA | Medium | 1024 px manual check; move to `xl` |
| Line-count drift between this design and the specs (spec wins) | Low | Spec alignment rule in section 1 |

---

## 13. Open Questions and verification list

Closed in revision 2:
- [x] **OQ1**: text wordmark in the display font; favicon and share image derived from `docs/brand/instagram/ig-profile-picture.jpg` (client brand asset), stored under `public/media/stand-ins/` and registered; no mockup file in `public/` (DS12).
- [x] **OQ2**: header CTA "Escribinos" + visually hidden " por WhatsApp" (WCAG 2.5.3), recorded in the Deviation Register by F8 (DS7).

Verify in apply (owner of the check in brackets):
- [ ] Tailwind plugin order; `pnpm build`, `pnpm dev`, `pnpm typecheck` with the throwaway spike [B1].
- [ ] `?url` CSS import from `src/app` under the boundaries resolver [B1; F0 re-proves on the real file].
- [ ] DOM libs with `worker-configuration.d.ts` [B1].
- [ ] `@testing-library/jest-dom` 7 entry point `/vitest`; JSX transform in the Vitest config; jsdom 30 `HTMLDialogElement.showModal` presence (decides whether the polyfill is active) [B1].
- [ ] pnpm 12 `minimumReleaseAge` against the new pins [B1].
- [ ] Zod 4 `.refine()` keeps `workerEnvSchema.shape` [B1].
- [ ] Wrangler `--var` with a value that contains `:` [B1].
- [ ] Workers static assets `_headers` support [B2].
- [ ] Font fallback metric values [F0].
- [ ] React Router 8 `createRoutesStub` name and the route `id` option [F2].
- [ ] React Router 8 `meta` signature (`loaderData`, `error`) and the splat `id` alongside the index on the same file [F3].
- [ ] Native `<dialog>` lightbox behavior under jsdom with the polyfill, then manually in browsers [F6].
