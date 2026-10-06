# Proposal: Design System and Public Site (static pages)

Change 2 of 8 | Project: calmainquieta | Store: hybrid | Phase: sdd-propose | Date: 2026-10-06
Inputs: Engram `calmainquieta/approved-plan` (#207), `public-site-scope` (#197), `monthly-renewal-model` (#198), `test-speed-and-naming` (#226), `brand-dmr` (#201), `mockups-analysis` (#196); `docs/client-proposal/proposal.md` (baseline); `docs/client-proposal/mockups-analysis.md` sections 2 and 3.3; `docs/brand/dmr-calma-inquieta.md`; `openspec/changes/platform-foundation/{design.md, exploration.md 4.11 and 5}`; `AGENTS.md`.

> **In one paragraph.** This change turns the walking skeleton into a real, mobile-first public site that looks like the mockups and speaks with the brand's voice. It ships one AA-verified token set, self-hosted stand-in fonts, an atomic component library in the delivery layer, the public layout (header with the 6-entry menu, mobile navigation, footer), the static pages Inicio, Quiénes somos (history, values, gallery, FAQ) and Contacto, a styled 404, temporary "Próximamente" pages for the three catalog-driven entries, and the SEO base (meta, canonical, Open Graph, `es-AR`, sitemap, robots, LocalBusiness JSON-LD). Page content lives in typed repository files behind a small `site-content` module. Nothing shows invented prices, schedules, testimonials or facts. Every brand asset is a registered, swappable stand-in. Search indexing stays off until launch.

---

## Intent

| Question | Answer |
|---|---|
| Problem | `main` has a deployed skeleton with no pages (`/` is a 404, `lang="en"`, English error page). The client must validate the look and feel on a preview URL this week. Changes 4 to 7 need a shared design system so each one adds data, not styling. |
| Why now | Week 1 of the approved 3-4 week plan. Every later public screen (catalog, enrollment, materials cart, events form) and the admin panel reuse these tokens and atoms. Building them once avoids per-change visual drift. |
| Who it helps | Future students: a clear, warm site that works on a phone. The owners: a credible preview to approve. Later changes: ready atoms and layout. |
| Success looks like | The preview URL shows Inicio, Quiénes somos and Contacto on phone and desktop with the mockups' visual language. Text contrast passes WCAG 2.2 AA by an automated test. The six menu entries work. No fact on screen is invented. Search engines do not index the preview. |

---

## Scope

### In Scope

| # | Deliverable | Notes |
|---|---|---|
| 1 | **Design tokens** | Palette reconciled from the mockups (mockups-analysis 3.3) and the DMR (3.1), with darkened AA-safe variants. One type scale (fluid on public pages), spacing, radius, elevation and motion tokens. One source, consumed by CSS and by a contrast test. |
| 2 | **Contrast gate** | A unit test computes the WCAG contrast of every declared text/background pair and UI-component pair. It fails below 4.5:1 for text, 3:1 for large text and non-text UI. |
| 3 | **Typography stand-ins** | Self-hosted WOFF2 files (no third-party font CDN): a light display serif with italics and a humanist sans (defaults in D5). OFL licence files committed. A font-metric fallback limits layout shift. Swapping to the brand fonts changes one file. |
| 4 | **Atomic component library** (delivery layer, `src/app/ui/`) | Container/presentational split: route modules and small containers own data; presentational components receive props only. **Atoms:** Button and ButtonLink (primary, outline, text-with-arrow), Heading, Text, Eyebrow, Icon (inline SVG set), Pill/Badge, Image (fixed aspect ratio, lazy, required `alt`), Divider, VisuallyHidden, SkipLink. **Molecules:** NavLink, ContactItem, TrustItem, ActivityCard, DateBadge, UpcomingItem, TestimonialCard, FaqItem, VideoFacade, EmptyState. **Organisms:** SiteHeader, MobileNav, SiteFooter, HeroCollage, ActivityShowcase, UpcomingList, TestimonialsSection, ValuesRow, GalleryGrid with lightbox, FaqList, ContactBand. **Templates:** PublicPage, ComingSoonPage. Only atoms and organisms needed by this change; the catalog, cart and admin organisms come with their changes. |
| 5 | **Public layout** | Header with logo stand-in, exactly 6 entries in this order: Inicio (`/`), Talleres (`/talleres`), Intensivos (`/intensivos`, page title "Talleres intensivos"), Eventos privados (`/eventos-privados`), Quiénes somos (`/quienes-somos`), Contacto (`/contacto`). Active-entry state, one header CTA, mobile navigation (keyboard and screen-reader operable, Escape closes, focus returns), footer with NAP, Instagram, WhatsApp and the existing bajada (DMR R14). Skip link. |
| 6 | **Inicio** (`/`) | Hero (eyebrow, H1 with italic accent word, subtitle, CTAs "Ver talleres" and "Ver intensivos", collage of stand-in image slots), trust row (client-approved claims only), a "Talleres mensuales" showcase and a "Próximos intensivos" list that take data as props and render a calm empty state with a WhatsApp or Instagram CTA when the list is empty (D3), a Quiénes somos teaser, a contact band. Testimonials section built and tested but not rendered while the testimonial list is empty. |
| 7 | **Quiénes somos** (`/quienes-somos`) | History and value proposition (copy drafted only from verified DMR evidence, marked for client approval), values row, gallery section (images, plus videos per D6), FAQ section (`<details>`-based, plain semantic markup, no FAQPage rich-result promise). Sections with no content are not rendered. |
| 8 | **Contacto** (`/contacto`) | No form (exploration Q23 default). Address Albert Sabin 6079, Argüello, Córdoba; a "Cómo llegar" link to a maps directions URL (no embedded map); WhatsApp click-to-chat (`wa.me` with a prefilled Spanish message); Instagram `@calma.inquieta`; hours and email shown only once the client confirms them. |
| 9 | **"Próximamente" pages** for `/talleres`, `/intensivos`, `/eventos-privados` (D2) | One template with a short message and WhatsApp and Instagram CTAs. `noindex`, excluded from the sitemap. Changes 4 and 7 replace each one. |
| 10 | **Styled 404 and error pages** | Spanish copy in the public layout, correct status (404 or 500), no internal detail (keeps the platform-foundation rule). Replaces the English root `ErrorBoundary` and the temporary `not-found` index route. |
| 11 | **SEO base** | `<html lang="es-AR">`; per-route title and description; canonical URL built from a configured site URL; Open Graph and Twitter card tags with a default share image (stand-in); `sitemap.xml` and `robots.txt` resource routes; LocalBusiness JSON-LD (name, address, URL, `sameAs` Instagram; phone, hours and geo only when confirmed); semantic headings and landmarks; mandatory alt text. **Indexing gate:** while the site runs on `workers.dev`, `robots.txt` disallows everything and pages send `noindex`. Change 8 flips the gate with the custom domain. |
| 12 | **Static content storage** (D1) | A `site-content` module: typed content (business profile, page copy, values, FAQ, gallery and testimonial lists) in repository files, read through a module API. The business profile is reused by the footer, Contacto, JSON-LD and, later, by `wa.me` messages (change 5) and emails (change 6). |
| 13 | **Stand-in asset registry** | One manifest lists every stand-in (logo raster, fonts, hero and gallery images, share image) with its replacement requirement. A test keeps the manifest in sync with the stand-in folder. Change 8 makes "no stand-ins left" a launch gate. |
| 14 | **UI test harness** | A Vitest project for components (DOM environment, Testing Library, axe-core checks) under the single `pnpm test` command. |
| 15 | **Deviation Register and asset list** | `docs/design/deviation-register.md` (seeded from exploration 5.8) and the list of client inputs below. |

### Out of Scope

| Item | Where it goes |
|---|---|
| Talleres, Intensivos and Eventos privados pages with data, dynamic Inicio sections fed by the database, Event JSON-LD, sitemap entries for activities | Changes 4 (public catalog) and 7 (events) |
| Admin panel, admin identity, editing page content from the panel | Change 3 (admin) or later (see D1) |
| Enrollment, materials cart, order confirmation, `wa.me` order hand-off | Change 5 |
| Email (Resend), notifications | Change 6 |
| R2 media pipeline and uploads | Change 3 (materials images). Not needed here: stand-ins and client photos ship as static assets; videos use a facade (D6) |
| Analytics, custom domain, DNS, legal pages, turning indexing on | Change 8 (launch) |
| Storybook or a component workbench | Not planned. Component tests plus the preview URL are enough for a 3-4 week plan. |
| Visual regression baselines | Deferred (D7) |
| Contact form, newsletter, search, cart icon, account icon, Tienda, Diario | Excluded by owner decisions |
| Google Business Profile and Maps embeds | Excluded by the client proposal |

---

## Capabilities

`openspec/specs/` does not exist yet (platform-foundation has not been archived), so there are no existing capability names to modify. The `runtime-configuration` spec leaves the variable list to design, so the new site-URL and indexing variables do not change its requirements.

### New Capabilities

- `design-system`: tokens (palette, AA-safe variants, type scale, spacing, radius, motion), the contrast gate, typography stand-ins and loading, the atomic component inventory with its accessibility baseline (focus-visible, 24 px targets, reduced motion, required alt text).
- `public-layout`: header with the 6-entry menu and its order, labels and URLs, active state, header CTA, mobile navigation behavior, footer, skip link, "Próximamente" pages, styled 404 and error pages.
- `home-page`: Inicio sections, their data contracts, empty states, and the hidden-until-real testimonials rule.
- `about-page`: Quiénes somos history, values, gallery (images and videos), FAQ, and the hide-when-empty rule per section.
- `contact-page`: Contacto details, directions link, `wa.me` click-to-chat with a prefilled message, the "show only confirmed facts" rule.
- `site-content`: content storage and access (D1), the business profile as the single source for NAP, links and hours, the stand-in asset registry, copy rules (es-AR voseo, "nosotras", "taller" and "taller intensivo", never "workshop" in UI copy).
- `seo-foundation`: language, titles and descriptions, canonical, Open Graph, sitemap, robots, LocalBusiness JSON-LD, and the indexing gate.

### Modified Capabilities

- None.

---

## Approach

1. **Tokens first, with a test.** Write the palette and scale as tokens (Tailwind 4 `@theme` is the working default from exploration 5.1; design confirms that it works with Vite 8 and the Cloudflare plugin, otherwise use plain CSS custom properties). Derive AA-safe values by rule. The contrast test is the first Strict TDD RED in this change: a pure WCAG contrast function plus a table of declared pairs.
2. **Palette reconciliation.** Base: the mockup system (sand `#E6D7C4`, cream page, warm surfaces, sage and olive accents, body text `#5E5B57`). Primary: the mockup clay, darkened until white text passes 4.5:1 with margin (D4). DMR colors that fail AA on cream (terracota rosada, tan, rosa empolvado) are limited to large text or decoration. Agency and partner blues stay out.
3. **Components in the delivery layer.** `src/app/ui/` holds presentational components. Routes in `src/app/routes/` are the containers: loaders read `site-content` through its module API and pass props down. No new runtime UI library is needed: the mobile menu, lightbox and FAQ use native elements (`<details>`, a disclosure button, `<dialog>` where jsdom support allows, otherwise an accessible fallback chosen in design). Icons are inline SVG. This keeps the delivery package allowlist unchanged (only React, React DOM and React Router). Radix-style primitives can come in change 3 for admin drawers if needed.
4. **Content as typed files (D1).** `src/modules/site-content/` exposes `getBusinessProfile()` and page-content readers. The domain holds the content types and rules (for example, optional facts stay `undefined` until confirmed, a testimonial needs consent to be listed). The infrastructure adapter returns the repository data. Keeping the port means a later move to database-backed, panel-editable content does not touch routes or components.
5. **Placeholder discipline.** Components are tested with fixtures. Production routes never render fixtures. Lists come from `site-content`, and in this change the catalog lists are empty, so Inicio shows empty states (D3). Unconfirmed facts (hours, email, phone, founding story details) are omitted, never guessed.
6. **Mobile-first.** No mobile mockups exist. Columns stack, the hero collage collapses to one or two images, the menu becomes a full-height panel, and touch targets are at least 24 px (44 px for primary CTAs). Desktop matches the mockups at 1672 px width as closely as the stand-in assets allow, and each gap goes to the Deviation Register.
7. **SEO and the indexing gate.** A small pure meta builder (title template, description, canonical, Open Graph) used by every route's `meta` export. JSON-LD built from the business profile. Two new validated configuration values: site base URL and indexing on/off (default off). Sitemap and robots are resource routes.
8. **Tests proportionate to UI** (see Test Strategy). Strict TDD on pure logic (contrast, meta and JSON-LD builders, content rules, `wa.me` URL builder). Component tests on behavior and accessibility, not markup snapshots.
9. **Delivery.** Stacked PR slices, each green and deployable to the preview. Conventional Commits, never `Co-Authored-By` or AI attribution.

### Baseline deviations (scope adjustments to `docs/client-proposal/proposal.md`)

| # | Proposal says | This change does | Source |
|---|---|---|---|
| A1 | Page "Workshops" | Menu "Intensivos", title "Talleres intensivos", URL `/intensivos`; UI copy never says "workshop" | Owner decision (#226), DMR R12 |
| A2 | Page "Quienes somos" | Menu "Quiénes somos", URL `/quienes-somos` (owner decision 2026-10-06); gallery and FAQ are sections inside it | Owner decision (#197) |
| A3 | No FAQ | FAQ added as a Quiénes somos section | Owner decision (#197) |
| A4 | No testimonials | Testimonials section built, hidden until real consented testimonials exist | Mockup image5; exploration Q21 default |
| A5 | "Sitio ... administrable desde el panel" | In v1, activities are panel-managed (changes 3 and 4); static page copy, FAQ and gallery are repository content updated by the studio (D1) | D1 |
| A6 | Contacto "información necesaria para encontrar el local" | Address plus a directions link; no embedded map (the proposal excludes Google Maps work) | Proposal "Aclaración" |
| A7 | Six complete pages | Three pages are temporary "Próximamente" pages until changes 4 and 7 (preview only; indexing is off) | D2 |
| A8 | Mockup visuals | Darkened colors, unified type scale, removed extra nav items and icons, invented mobile layouts (Deviation Register) | Exploration 5.8 |
| A9 | UI copy language (open in `config.yaml`) | Resolved: Spanish (Argentina), voseo, "nosotras" | Orchestrator context, DMR R1 and R2 |

### `config.yaml` open-decision checklist

| Decision | Status for this change |
|---|---|
| Tech stack | Settled (ADR-001). Adds Tailwind 4 (pending a compatibility check) and test-only packages. |
| UI copy language | Resolved here: es-AR with voseo (A9). |
| Email provider | Not used here (change 6, Resend). |
| Hosting and domain | `workers.dev` preview with indexing off; domain in change 8. |
| Version control | Settled (private GitHub repo, CI). |
| Mockup asset handling | Mockups are a visual reference only and are never shipped; all imagery is registered stand-ins until the client delivers assets. |

---

## Open decisions (recommended defaults; for the owner as multiple choice)

| ID | Decision | Options | Recommended default and why |
|---|---|---|---|
| D1 | Where static page content lives | (a) Typed TS files in the repo behind a `site-content` module; (b) database tables plus panel editing (needs change 3 admin first); (c) external headless CMS | **(a)**. No dependency on admin auth, zero cost, reviewable in PRs, works this week. The port keeps (b) open later. Trade-off: the owners cannot edit history, FAQ or gallery themselves in v1 (deviation A5). |
| D2 | Menu entries whose pages arrive later (Talleres, Intensivos, Eventos privados) | (a) "Próximamente" pages with WhatsApp and Instagram CTAs, `noindex`; (b) hide those entries until their change lands; (c) link them to Instagram | **(a)**. The client validates the final 6-entry header now, the menu and its tests stay stable, and nothing is indexed. |
| D3 | Inicio activity sections before catalog data exists | (a) Render each section with a calm empty state and a CTA; (b) hide empty sections | **(a)**. The same empty state is needed in production (for example, no intensivos announced yet). The client sees the layout without fake cards. |
| D4 | Primary brand color | (a) Mockup clay `#936D53` darkened to pass AA with white text; (b) DMR terracota `#8C4A2A` from the Instagram flyers | **(a)**. Mockups are the agreed look and feel (exploration Q28 default). Terracota stays available as an accent for headline emphasis. |
| D5 | Stand-in fonts until brand fonts arrive | (a) Cormorant Garamond + Montserrat; (b) Cormorant Garamond + Mulish | **(a)**. Closest to the mockups (exploration 5.3, Q5 default). Both are OFL; licences are verified in design. |
| D6 | Videos in the Quiénes somos gallery | (a) YouTube privacy-enhanced click-to-load facade, hidden until video URLs exist; (b) MP4 files on R2 (brings the R2 pipeline forward); (c) Instagram embeds | **(a)**. No hosting cost, no third-party load before a click, no R2 work in week 1 (exploration Q22 default, without the R2 part for now). |
| D7 | Screenshot or visual regression tests | (a) None now; manual fidelity review on the preview plus the Deviation Register; revisit at launch; (b) Vitest Browser Mode screenshot baselines now | **(a)**. Stand-in fonts and photos will change, so baselines would churn. A browser runner adds CI weight before Playwright arrives in change 5. |
| D8 | WhatsApp number used by click-to-chat before the client confirms one | (a) Use 351 739 5239 (the number on 3 of 5 October flyers), marked provisional; (b) hide WhatsApp CTAs until confirmed | **(a)**. The CTA is the main conversion path and the preview is not public. The number is one profile field, easy to change. |

### Client inputs needed (not blocking this change; they block launch)

| Input | Used by | Until it arrives |
|---|---|---|
| Vector logo and lockup, brand fonts, official palette | Tokens, header, footer, share image | Raster of `image3`, stand-in fonts, reconciled palette |
| Photos and videos with image rights (workshops, space, finished pieces) | Hero, gallery, Open Graph image | Registered stand-in images |
| Official WhatsApp number, email, opening hours | Contacto, footer, JSON-LD | D8 number; email and hours not shown |
| History text (founding, founders' names), value proposition, official descriptor | Quiénes somos, meta descriptions | Copy drafted only from verified DMR evidence, marked for approval |
| FAQ questions and answers (policies: seña, cancellations, make-ups) | Quiénes somos FAQ | Only answers backed by evidence; no invented policy |
| Trust claims for the hero row (for example "Grupos reducidos") | Inicio | Only claims the client confirms; "Materiales incluidos" applies to intensivos only (mockup conflict) |
| Testimonials with written consent | Inicio | Section hidden |

---

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/app/root.tsx` | Modified | `lang="es-AR"`, font preload, global styles, public layout, Spanish error boundary |
| `src/app/routes.ts` | Modified | Index becomes Inicio; adds `/talleres`, `/intensivos`, `/eventos-privados`, `/quienes-somos`, `/contacto`, `sitemap.xml`, `robots.txt`, catch-all 404; keeps `/status` |
| `src/app/routes/not-found.tsx` (+ test) | Modified or replaced | Becomes the styled catch-all 404 |
| `src/app/routes/*.tsx` (+ tests) | New | Page route modules (containers) and resource routes |
| `src/app/ui/**` (+ tests) | New | Tokens, styles, atoms, molecules, organisms, templates |
| `src/app/seo/**` (+ tests) | New | Meta builder, JSON-LD builder (pure functions) |
| `src/modules/site-content/**` (+ tests) | New | Content types and rules, content reader port, repository adapter, `index.ts` |
| `src/composition/**` | Modified | Wire the `site-content` adapter into request services |
| `src/platform/env.ts` (+ test), `.env.example`, `.dev.vars.example`, `wrangler.jsonc` | Modified | Site base URL and indexing gate (non-secret variables) |
| `public/fonts/**`, `public/media/stand-ins/**`, stand-in manifest | New | Self-hosted fonts with OFL licences, stand-in images |
| `vite.config.ts`, `package.json` | Modified | Tailwind 4 Vite plugin; dev dependencies for the UI test project |
| `vitest.config.ts` | Modified | New `ui` project (DOM environment) inside `pnpm test` |
| `eslint.config.ts`, `tooling/architecture/architecture.test.ts` | Modified | Classify new folders (`site-content` follows the module pattern; `src/app/ui`, `src/app/seo` are delivery) |
| `docs/design/deviation-register.md`, `README.md` | New / Modified | Deviations, stand-in list, how to swap brand assets |

---

## Test Strategy

| Layer | What | How | Project |
|---|---|---|---|
| Unit, Strict TDD | WCAG contrast function and the declared pairs table | Table-driven | `unit` |
| Unit, Strict TDD | Meta builder (title template, canonical, OG), LocalBusiness JSON-LD (omits unconfirmed fields), `wa.me` URL builder (encoding, prefilled text), sitemap and robots output for gate on and off | Pure functions | `unit` |
| Unit, Strict TDD | `site-content` rules: optional facts stay absent, testimonials need consent, empty lists hide sections; stand-in manifest matches the folder | In-memory data | `unit` |
| Component | Header: 6 entries in order with labels and URLs, active state, mobile menu open, Escape and focus return; footer; empty states; testimonials hidden when empty; gallery and lightbox keyboard behavior; FAQ disclosure; video facade loads nothing before a click | Testing Library plus axe-core (no violations) in a DOM environment | `ui` (new) |
| Delivery | Route loaders and `meta` exports; 404 status for unknown paths; "Próximamente" pages send `noindex`; `/status` unchanged | Loaders as plain functions (existing helper) | `unit` |
| Build | `pnpm build` passes; no fixture imported by a production route | CI build plus a lint or architecture rule | CI |
| Manual | Fidelity review at 1672 px against image5 and image12; phone check at 360 px and 390 px; Lighthouse mobile on the preview (LCP < 2.5 s, CLS < 0.1) | Checklist in the PR | Preview |

Not automated: color contrast inside rendered pages (jsdom has no layout; the token gate covers declared pairs), pixel fidelity (D7). The new `ui` project must keep `pnpm test` near the accepted speed (owner accepted about 77 s quiet); design picks the lighter DOM environment that axe-core supports.

---

## Authored-lines forecast and slice plan

Authored additions plus deletions. Lockfile, font binaries, images and generated types are excluded. Copy in content files counts as authored lines.

| Slice | Content | Production | Tests | Example commit (no AI attribution) |
|---|---|---|---|---|
| S1 | UI test project, Tailwind, tokens, contrast gate, fonts, `lang="es-AR"`, global styles | 200-260 | 120-170 | `feat(design-system): add tokens, fonts and a wcag contrast gate` |
| S2 | Atoms and base molecules | 260-340 | 200-260 | `feat(design-system): add atomic components` |
| S3 | `site-content` module, business profile, page content, stand-in manifest, config variables | 260-340 | 140-200 | `feat(site-content): add typed static content and business profile` |
| S4 | Public layout: header, mobile nav, footer, skip link, "Próximamente" pages, styled 404 and error pages, routes | 300-380 | 220-300 | `feat(public-layout): add header, mobile navigation and footer` |
| S5 | Inicio | 280-360 | 180-260 | `feat(home): add inicio page with empty states` |
| S6 | Quiénes somos: history, values, gallery and lightbox, video facade, FAQ | 300-390 | 220-300 | `feat(about): add quienes-somos page with gallery and faq` |
| S7 | Contacto plus SEO base (meta, canonical, OG, JSON-LD, sitemap, robots, indexing gate) | 280-360 | 220-300 | `feat(seo): add metadata, sitemap, robots and local business data` |
| S8 | Deviation Register, client input list, README | 120-180 (docs) | 0 | `docs: add deviation register and brand asset replacement guide` |
| **Total** | | **about 2,000-2,590** | **about 1,300-1,790** | **about 3,300-4,400 authored lines** |

- Every production slice is forecast at or below 400 lines. Slices whose tests push the total above 400 ship as `size:exception` under the owner policy; no question is needed for those.
- If a production slice grows past 400 during apply (most likely S4 or S6), split it (for example, S6a gallery, S6b FAQ and history) instead of asking.
- Guard lines for `sdd-tasks`: `Decision needed before apply: Yes` (confirm the chain strategy once; recommended: stacked PRs to `main`, as in platform-foundation), `Chained PRs recommended: Yes`, `400-line budget risk: High`.
- Descoping order if week 1 runs short: video facade (D6), lightbox (open images in place), testimonials component (build in change 8 when real items exist).

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Schedule: about 3,300-4,400 lines in week 1 after platform-foundation | High | Stacked slices that each deploy to the preview; descoping order above; no Storybook, no visual regression |
| Placeholder or unconfirmed facts reach the page (hours, phone, policies, testimonials) | Medium | Optional facts stay absent by type; fixtures only in tests; the testimonials consent rule; client inputs list; D8 marks the number provisional |
| Preview indexed by search engines with stand-in content | Medium | Indexing gate defaults off (`robots.txt` disallow plus `noindex`); change 8 flips it |
| Tailwind 4 incompatible with Vite 8 or the Cloudflare plugin | Low-Med | Design verifies first; fallback is plain CSS custom properties with the same tokens |
| Native `<dialog>` or focus handling not testable in jsdom | Medium | Design chooses a disclosure pattern for the mobile menu and an accessible fallback for the lightbox; behavior tests cover keyboard paths |
| The new UI test project slows `pnpm test` | Medium | Light DOM environment, limited axe scope per component, measure in S1 |
| Brand assets arrive late or differ (fonts, palette, logo) | High | One token file and one font file to swap; stand-in registry; the contrast gate re-checks new colors automatically |
| Stand-in fonts change metrics when swapped (layout shift, broken lines) | Medium | Font-metric fallback and a fluid scale; re-check on swap |
| Stand-in images infringe rights (stock, Instagram posts by others) | Medium | Use only licence-clear stand-ins (own renders, neutral textures, client-approved Instagram images); record the source in the manifest |
| Voice: menu label | Resolved | Owner chose the neutral "Quiénes somos" on 2026-10-06; page copy uses "nosotras" |
| Static content not editable by owners (A5) disappoints the client | Medium | State it in the preview review; D1 port allows panel editing later |

---

## Rollback Plan

- **No data at risk.** This change adds no database tables or migrations and stores no user data.
- **Per slice.** Each slice is one PR. Revert it with `git revert <merge-commit>` on `main`; CI redeploys the previous behavior. Slices are additive except S4 (routes and error pages) and S1 (`root.tsx`); reverting those restores the platform-foundation `not-found` index and English error page.
- **Immediate.** For a broken deploy, roll the Worker back to the previous version with `wrangler rollback` (owner runbook credentials), then revert the PR.
- **Indexing.** If the gate fails open, set the indexing variable to off and redeploy; nothing else depends on it.
- **Brand assets.** Swapping fonts, palette or images is a single-file change per asset type, reversible the same way.

---

## Dependencies

- platform-foundation merged on `main` (done): React Router 8 on Workers, Vitest `pnpm test`, boundaries lint, architecture test, CI and preview deploy.
- Tailwind 4 and its Vite plugin compatible with Vite 8.3 and `@cloudflare/vite-plugin` 1.62 (verify in design).
- Test-only packages: Testing Library, a DOM environment (jsdom or happy-dom), axe-core integration (verify versions in design).
- OFL licence texts for the stand-in fonts (verify in design).
- Client content and assets (inputs table): needed for launch, not for this change.

---

## Success Criteria

- [ ] The preview URL serves Inicio, Quiénes somos and Contacto in Spanish (es-AR, voseo) with `lang="es-AR"`.
- [ ] The header shows exactly 6 entries in order (Inicio, Talleres, Intensivos, Eventos privados, Quiénes somos, Contacto) with URLs `/`, `/talleres`, `/intensivos`, `/eventos-privados`, `/quienes-somos`, `/contacto`, on phone and desktop; the three unbuilt entries open "Próximamente" pages.
- [ ] The contrast test passes for every declared token pair (4.5:1 text, 3:1 large text and UI).
- [ ] axe-core reports no violations in every component and page test; keyboard-only navigation reaches every link and control, including the mobile menu.
- [ ] No production route renders fixture data; testimonials do not render while none is approved; unconfirmed hours and email are absent from the page and from JSON-LD.
- [ ] Unknown paths return a styled Spanish 404 with status 404; `/status` behaves as before.
- [ ] `robots.txt` disallows all and pages send `noindex` while the indexing gate is off; `sitemap.xml` lists only `/`, `/quienes-somos` and `/contacto`.
- [ ] Every page has a unique title and description, a canonical URL from the configured base, and Open Graph tags; Inicio and Contacto expose valid LocalBusiness JSON-LD.
- [ ] Lighthouse mobile on the preview: LCP under 2.5 s, CLS under 0.1 for Inicio.
- [ ] Every stand-in asset is listed in the manifest, and the Deviation Register records each intentional difference from image5 and image12.
- [ ] `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check` and `pnpm build` pass in CI for every slice.
- [ ] The owners approve the look and feel on the preview URL (manual sign-off).
