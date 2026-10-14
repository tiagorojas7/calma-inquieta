# Proposal: Public Catalog (Talleres and Intensivos pages from the database, seats, dynamic Inicio, Event JSON-LD)

Change 4 of 8 | Project: calmainquieta | Store: hybrid | Phase: sdd-propose | Date: 2026-10-13 | Revision 1
Inputs: approved roadmap (Engram `calmainquieta/approved-plan` #207), owner design-adjustments plan (#321), `openspec/config.yaml`, `docs/client-proposal/proposal.md` (baseline), `docs/client-proposal/mockups-analysis.md` (image5, image6 read part, image8, image9; sections 3.1, 3.4, 3.5, 3.6), main specs `openspec/specs/{home-page,public-layout,seo-foundation,site-content}/spec.md`, the archived change-2 `design.md` (DS6, DS9, DS13, DS14, section 6), `docs/design/deviation-register.md`, the change-3 planning in the `CalmaInquieta-plan` worktree (`openspec/changes/admin-catalog/{proposal,design,apply-progress}.md`, `specs/*`; read only), and code on `main` at `14363b4` (`src/modules/{workshops,materials,teachers,media,admin-access}`, `src/composition/request-services.ts`, `src/app/routes/{home,coming-soon}.tsx`, `src/app/ui/**`). No per-change exploration (fast-forward, approved plan).

> **In one paragraph.** Change 3 lets the owners load monthly talleres (with turnos and monthly periods), intensivos (with a fixed deposit), teachers and images. Nothing public reads that data yet: `/talleres` and `/intensivos` are "Próximamente" pages and Inicio shows two empty lists. This change publishes the catalog. It adds an actorless, privacy-filtered **public catalog reader** in the `workshops` module and builds four pages: the Talleres listing (image9), the taller detail (the read part of image6), the Intensivos listing (image8) and an intensivo detail. A paused activity stays visible with "Inscripciones pausadas" and a WhatsApp link. Inicio's two sections are fed from the database, and intensivos get schema.org `Event` JSON-LD. Enrollment, the materials cart and seat counting are change 5. Eventos privados stays "Próximamente" until change 7. BACK ships a small contract PR first so FRONT builds the pages against fakes. Real data access waits for the change-3 BACK slices listed under Dependencies.

---

## Intent

| Question | Answer |
|---|---|
| Problem | The baseline promises that "los talleres y workshops cargados por las dueñas se reflejarán automáticamente en la web pública", with listing and detail pages showing teacher, days, times, fee, seats, description and images, and "datos estructurados para negocio y eventos". Today the public site shows none of it. `/talleres` and `/intensivos` are `noindex` placeholders (deviation T1/A7), and Inicio's showcases are literal empty arrays (`home.tsx`). Change 3 explicitly hands over the public rendering of turnos, the paused state, the seats display, dynamic Inicio sections and Event JSON-LD. |
| Why now | Week 2 of the approved plan, next to change 3. Change 5 (enrollment) builds its form on the taller and intensivo detail pages that this change creates. The client also needs to see real activities on the preview. |
| Who it helps | Prospective students, who can browse what is offered, when, by whom and at what price. The owners, whose admin edits show up on the site without a developer. Local SEO, through Event structured data and crawlable catalog pages once the indexing gate opens at launch. |
| Success looks like | An owner publishes a taller with two turnos and opens the month in the panel. It appears on `/talleres` and on Inicio with its teacher, turnos and fee, and its detail page shows the description, the teacher's bio line, the turnos and the project images. Pausing it shows "Inscripciones pausadas" with a WhatsApp link. A published intensivo appears on `/intensivos` and in Inicio's "Próximos intensivos" with its date, price, deposit and policy, and emits valid `Event` JSON-LD. Drafts, archived, cancelled and past activities never appear. No internal data (percentage, teacher contact, audit fields) ever reaches a public response, which tests prove. |

---

## Scope

### In Scope

| # | Deliverable | Notes |
|---|---|---|
| 1 | **Public catalog reader** (BACK) | An actorless read API in the `workshops` module. It returns only visible activities (`published` and `paused`, via the change-3 `isVisibleStatus` and `acceptsNewRequests` helpers). It hides intensivos whose date has passed (Córdoba time). It picks the monthly **offering period** per the rule decided in Q2. It projects public read models only: no percentage, modality, teacher phone or email, audit fields, period snapshot or draft data. Teacher name and bio line come through `TeacherLookup`, images through `MediaLookup`. Lookups by slug serve the detail pages. |
| 2 | **Seats display contract** | The public read model carries the capacity for each turno (monthly, from the offering period) and for each intensivo, plus an `available` field that stays `null` (unknown) until change 5 adds confirmed seats. What the page shows while it is unknown is owner question Q1. |
| 3 | **Talleres listing** `/talleres` (FRONT, image9) | Hero with page copy, a card grid with name, teacher, turnos (weekday and time range), fee, a seats indicator per Q1, a paused badge and "Ver taller". Includes the empty state. The filter pills are owner question Q4. Replaces the "Próximamente" page. |
| 4 | **Taller detail** `/talleres/:slug` (FRONT, image6 read part) | Breadcrumb with the technique, name, description, teacher with bio line, turnos with time ranges and the class length derived from them, monthly fee, seats per Q1, and the period project ("Proyectos que vamos a realizar") with its images. Until change 5 the call to action is a `wa.me` link with a prefilled message naming the taller (Q6). Paused shows "Inscripciones pausadas" plus a WhatsApp link and no enrollment CTA. An unknown or invisible slug answers 404. |
| 5 | **Intensivos listing** `/intensivos` (FRONT, image8) | The `h1` stays "Talleres intensivos". Cards show a date badge (weekday, day, month), name, duration derived from the time range, teacher, price, deposit ("Seña"), seats per Q1, a "materials included" badge when set, and the paused state. A policy note shows the intensivo's policy text. Ordered by nearest date. The date range, "Técnica" and sort controls are owner question Q5. Replaces the "Próximamente" page. |
| 6 | **Intensivo detail** `/intensivos/:slug` (FRONT) | The full description, policy text (cancellation and no-show terms), minimum seats per Q7, images and the same interim WhatsApp CTA. Change 5 adds the registration form here, as the baseline puts it "desde la página del workshop". This page is a scope adjustment against image8's expanded card (Q3). |
| 7 | **Dynamic Inicio** (FRONT + BACK copy) | "Talleres mensuales" and "Próximos intensivos" are fed by the reader instead of literal empty arrays. Inicio cards show name, summary, weekday and time (image5, no price). Which talleres appear and how many is owner question Q8. Empty states stay as specified. |
| 8 | **Event JSON-LD** (FRONT, `src/app/seo`) | Each visible intensivo emits one schema.org `Event` on its detail page (and a list on `/intensivos`; design decides), with `startDate` and `endDate` (Córdoba offset), `location` as a `Place` built from the business profile address, `organizer`, `eventStatus`, `eventAttendanceMode` Offline, `offers` (price in ARS, availability per Q1 and the paused state) and images. Serialization is safe against `</script>`, as for LocalBusiness. Structured data for monthly talleres (recurring classes) is a design decision: `Event` with an `eventSchedule`, `Course` with a `CourseInstance`, or none. |
| 9 | **SEO updates** | Per-page meta for the four pages, with titles and descriptions built from the activity for detail pages. Canonical URLs by slug. `og:image` from the activity cover when present, else the stand-in share image. The sitemap gains `/talleres`, `/intensivos` and one entry per visible activity. The listing and detail pages follow the indexing gate (no longer always `noindex`). The gate stays OFF in this change. |
| 10 | **Page copy** (BACK, `site-content`, DS14) | Hero, intro, empty-state, paused-notice and SEO copy for the two listings; detail-page labels; prefilled WhatsApp messages per activity. All es-AR voseo, never "workshop". The coming-soon entries for Talleres and Intensivos are retired; Eventos privados keeps its own. |
| 11 | **Presentational components** (FRONT, `src/app/ui`) | For example: a taller card (extending `ActivityCard`, image optional with a stand-in fallback), a turno list, a price tag ("$ 58.000 / mes" per Q9), a seats pill, a paused notice, an intensivo card (date badge, price and deposit), a policy note, a project gallery, and the detail templates. All structural props; axe in every test file. |
| 12 | **Contract-first delivery** | The first implementation PR adds the reader contract to `workshops/index.ts`, the `AppServices.publicCatalog` member with a fail-soft placeholder, in-memory fakes and builders, so FRONT works in parallel. |
| 13 | **Deviation register and docs** | New rows for every mockup departure (filters, the intensivo detail page, the seats display, the interim CTA, card content). T1/A7 is updated to cover only `/eventos-privados`. |

### Out of Scope

| Item | Where it goes |
|---|---|
| Enrollment form, turno selection for enrollment, policy acceptance checkbox, materials catalog and cart, order "Pendiente de confirmación", `wa.me` hand-off with the order, confirmation page (image7, image10) | Change 5 (monthly-enrollment) |
| Confirmed-seat counters, the atomic seat claim, "available = capacity − confirmed", "Cupo completo" driven by real data, a waitlist | Change 5. This change only shows capacity-based or neutral seat information (Q1). |
| Intensivo registration form and deposit flow | Change 5 (form) and change 7 (deposits as payments) |
| Eventos privados page and request form (image13) | Change 7. `/eventos-privados` stays "Próximamente". |
| Public materials catalog page | Not planned. Materials are shown only inside enrollment (change 5). |
| Scroll-autoplay videos, mixed video and photo testimonials, mockup-level visual fidelity (hero photo collage, photo cards, trust icons) | The later design-adjustments change (owner decision #321), started only after the client's material arrives |
| Floating WhatsApp button (image9; deviation V17) | Not planned |
| Search, Tienda, cart icon, account icon, "Diario" | Out by standing owner decision (deviation V5) |
| Opening the indexing gate, custom domain, re-scoping Access to `/admin`, Google Rich Results checks against the live URL | Change 8 (launch). The `workers.dev` preview stays private behind Access (change-3 AD2). |
| Admin changes, such as a "featured" flag or a technique field on intensivos | Not planned here. If Q5 or Q8 needs a new field, it becomes a small change-3-style BACK addition after the owner decides. |
| Image transformations (resizing on the fly) | Not planned. Change 3 resizes on upload (AC8). |
| Redirects from old slugs after a slug change | Not planned in v1 (a changed slug answers 404; change 3 already requires confirmation to change a published slug) |

---

## Capabilities

Existing main specs: `about-page`, `contact-page`, `design-system`, `home-page`, `public-layout`, `seo-foundation`, `site-content`. The change-3 capabilities (`monthly-workshops`, `intensive-workshops`, `workshop-periods`, `teachers`, `media-storage`, and others) are **not archived**, so this change cannot write delta specs against them. The reader is therefore a new capability that depends on them.

### New Capabilities

- `public-catalog-reader`: the actorless read API. It covers the visibility rule (published and paused only; draft, archived and cancelled never; intensivos after their date never), the monthly offering-period rule (Q2), turno ordering (weekday, then start time, per change-3 SA2), the public projection and its privacy rules (no percentage, modality, teacher contact, audit or snapshot fields), the seats contract (capacity now, `available` unknown until change 5), lookup by slug, and fail-soft behavior when the catalog adapters are not wired yet (empty lists, never a 5xx on public pages).
- `talleres-pages`: the `/talleres` listing and the `/talleres/:slug` detail. It covers card content, the detail sections, the paused rendering, the interim WhatsApp CTA, the empty state, 404 for unknown or invisible slugs, filters if Q4 keeps them, and copy rules.
- `intensivos-pages`: the `/intensivos` listing and the `/intensivos/:slug` detail. It covers card content (date, duration, price, deposit, seats, materials included), policy display, minimum seats (Q7), ordering, the paused rendering, the interim CTA, the empty state, 404 rules, and filters if Q5 keeps them.
- `event-structured-data`: schema.org `Event` for intensivos (required fields, time zone, location from the business profile, offers and availability mapping, paused mapping, safe serialization), and the monthly-taller structured-data choice made in design.

### Modified Capabilities

- `home-page`: "Talleres mensuales showcase" and "Próximos intensivos list" read from the public catalog reader. The scenario "Production never shows fixtures… returns empty activity and intensivo lists" is replaced by "the lists come from the reader". "No invented facts" changes: weekdays, times and dates that come from the admin-managed catalog are allowed in the activity sections. Prices stay off Inicio unless Q8 says otherwise, and every other section keeps the currency and clock scan.
- `public-layout`: "Próximamente pages" now covers only `/eventos-privados`. `/talleres` and `/intensivos` stop being Próximamente pages. The menu itself is unchanged (`/talleres` and `/intensivos` stay active for their nested detail paths, which the existing "nested paths" rule already covers).
- `seo-foundation`: "Sitemap" lists `/`, `/quienes-somos`, `/contacto`, `/talleres`, `/intensivos` and every visible activity detail URL, and never `/eventos-privados`, `/admin`, `/status` or error pages. "Indexing gate" scenario "Próximamente always noindex" moves from `/talleres` to `/eventos-privados`. "Per-route title and description" uniqueness extends to the catalog pages and each detail page. "Open Graph" allows the activity cover as `og:image`. The "LocalBusiness JSON-LD" requirement stays; `Event` lives in the new capability.
- `site-content`: no requirement change expected. New page copy entries follow the existing "Typed content", "Approval markers" and "Copy rules" requirements. If spec review finds that the coming-soon entry set is spec-level, this becomes a small delta.

---

## Approach

### 1. Reader in the `workshops` module (BACK)

- **Where.** A new application service, `PublicCatalogService`, exported from `src/modules/workshops/index.ts`, wired by composition into `AppServices.publicCatalog`. It belongs to `workshops` because the change-3 schema-ownership test (AC1) forbids reading another module's tables. Teacher and media data cross module boundaries only through `TeacherLookup` and `MediaLookup`, as change 3 does.
- **No actor.** Public reads take no `AdminActor`. They are a separate service, not the admin `listVisible(actor)`, so the admin authorization path stays unchanged and the public path cannot reach admin data. Use the change-3 pure helpers (`isVisibleStatus`, `acceptsNewRequests`, `cordobaMonthOf`) instead of re-deriving rules.
- **Read models (sketch; design finalizes).**
  - `PublicTaller`: slug, name, summary, description, technique, teacher (name and bio line), images, status (`open` or `paused`), turnos (label, weekday, start, end, capacity or null), offering (period key and fee, or null per Q2), project (title, description, images) or null, and seats (`available: null` until change 5).
  - `PublicIntensivo`: slug, name, summary, description, teacher, date, start, end, price, deposit, capacity, minimum seats, policy text, materials included, images, status, and seats (`available: null`).
- **Queries.** Drizzle read queries over the change-3 tables (`monthly_workshop`, `workshop_turno`, `workshop_period`, `period_turno`, `period_project_image`, `intensive_workshop`, `intensive_image`), filtered by status in SQL. Each query gets a shared contract suite (fake and Drizzle on embedded PostgreSQL), following the `database-probe.contract.ts` pattern. **No migration** is expected. If design finds that a public query needs an index, that is one small additive migration.
- **Fail-soft placeholder.** Until the adapters land, composition wires a placeholder that returns empty lists and "not found". Public pages then render their empty states instead of the admin "en construcción" 503. Real infrastructure errors still throw to the public error boundary (500, no internals).
- **Privacy by construction.** The projection is an explicit allowlist of fields. A test serializes every public read model built from fully populated fixtures and asserts that no percentage, modality, phone, email, `updatedBy` or snapshot key is present.

### 2. Pages (FRONT)

- **Routes.** `src/app/routes.ts` maps `talleres` and `talleres/:slug` and `intensivos` and `intensivos/:slug` to new route modules inside the public layout. `/eventos-privados` keeps `coming-soon.tsx`. Loaders call `services.publicCatalog` and map read models to plain props. Containers stay in `src/app/routes`; presentational components in `src/app/ui` (DS3).
- **States.**
  - Open: full card or detail with the interim CTA.
  - Paused: "Inscripciones pausadas" plus the profile WhatsApp link with a prefilled message. No enrollment CTA.
  - Empty: the existing EmptyState with calm copy and a WhatsApp or Instagram CTA (change-2 D3).
  - Unknown or invisible slug: 404 inside the public layout.
- **Formatting.** Money in es-AR ("$ 58.000") through the `_shared` `Money`. Times as "10:00 a 12:00" (to be confirmed with Q9). Weekday names in Spanish. Durations derived from time ranges ("2 horas", "2 h 30 min"). One formatter module, unit-tested.
- **Filters (only if Q4 or Q5 keeps them).** Server-side through query strings (`?franja=manana`), so they work without JavaScript and keep canonical URLs clean (the canonical drops the query, per seo-foundation).
- **Interface points for design-adjustments (#321).** Card and detail image slots accept an optional `ImageUse` with a registered stand-in fallback. The detail gallery takes a media list whose item type can later include video. Inicio sections stay prop-driven, so a later visual pass changes components, not loaders. Testimonials are not touched.

### 3. Inicio (FRONT, BACK copy)

`home.tsx` replaces `monthly: []` and `intensivos: []` with reader calls: talleres per Q8, and upcoming intensivos by nearest date, limited to a small number (design picks it; image5 shows 3). The existing `ActivityShowcase`, `ActivityCard`, `UpcomingList` and `UpcomingItem` contracts are reused and extended (an optional image, a schedule line), not replaced.

### 4. Structured data (FRONT, `src/app/seo`)

A pure `buildEventJsonLd(intensivo, profile, baseUrl)` next to `buildLocalBusinessJsonLd`, reusing `serializeJsonLd`. Mapping:
- paused → `offers.availability` without a purchasable state (design picks the schema.org value);
- unknown seats → no `remainingAttendeeCapacity`;
- confirmed `SoldOut` and remaining capacity → change 5.

Validated with schema shape tests and, manually, the Rich Results code-snippet tool, because the preview URL is private.

### 5. Delivery (two orchestrators, contract first, BACK merges first; same protocol as changes 2 and 3)

- BACK owns `src/modules/**`, `src/composition/**`, `src/testing/**` (except FRONT fixtures), `site-content` copy, and any migration.
- FRONT owns `src/app/**` (routes, `ui`, `seo`), the `src/testing/fixtures/**` carve-out and `docs/design/**`.
- FRONT develops against the contract PR's fakes and merges each page only after the BACK slice it needs.

### Baseline deviations (scope adjustments to `docs/client-proposal/proposal.md`)

| # | Baseline says | This change does | Source |
|---|---|---|---|
| C1 | "Cupos visibles y actualizados según las confirmaciones registradas en el panel" | Confirmed seats do not exist until change 5. This change shows capacity-based or neutral seat information per Q1, and change 5 switches it to real availability. | Roadmap; change-3 A8 |
| C2 | Talleres mensuales: "… y botón de inscripción"; Inicio: "accesos rápidos para inscribirse" | Until change 5 the button opens WhatsApp (`wa.me`, prefilled with the activity name) instead of an enrollment form | Q6; standing `wa.me` rule |
| C3 | Page "Workshops" with "seminarios disponibles…" | `/intensivos`, titled "Talleres intensivos", plus an intensivo detail page (image8 shows only an expanded card) | Change-2 A1; Q3 |
| C4 | "Datos estructurados para negocio y eventos" | `Event` for intensivos. The monthly-taller representation is a design decision (recurring classes are not single events). | Proposal SEO section |
| C5 | "Web pública" | Pages are built and tested, but the `workers.dev` preview stays private behind Access and unindexed until change 8 | Change-3 AD2; seo-foundation gate |
| C6 | Mockup filters (image8, image9) are not in the baseline | Kept, reduced or deferred per Q4 and Q5 | Mockups-analysis image8 and image9 deltas |
| C7 | Talleres listing shows "descripción" | Cards show the summary; the full description is on the detail page (as in image9 and image6) | Mockups image9 and image6 |
| Standing | WhatsApp Business API | Out. `wa.me` links stay; no automated messages. | Owner (config.yaml) |

### `config.yaml` open-decision checklist

| Decision | Status for this change |
|---|---|
| Tech stack | Settled (ADR-001). No new package expected. |
| UI copy language | Settled: es-AR with voseo, "nosotras" voice, never "workshop". |
| Email provider | Not used here (change 6). |
| Hosting and domain | `workers.dev`, private behind Access until change 8; indexing gate OFF. |
| Version control | Settled (private GitHub repo, CI, stacked PRs to `main` in changes 2 and 3; the chain strategy for this change is asked under `ask-on-risk`). |
| Mockup asset handling | image5, image6, image8 and image9 are visual references only. No mockup names, prices, schedules, teachers or photos are seeded, shown or shipped. Test fixtures use neutral invented data marked as fixtures. |

---

## Open product decisions (for the owner; the orchestrator asks one at a time)

These are business facts or product choices the inputs do not settle. Each recommendation is a suggestion, not a decision. "Blocks" says which spec work depends on the answer. The rest of the proposal does not.

| # | Question | Options seen | Recommendation (not decided) | Blocks |
|---|---|---|---|---|
| Q1 | **Show seats publicly before change 5?** Confirmed seats do not exist yet, and the owners currently take enrollments by WhatsApp, so "N lugares disponibles" computed from capacity would be wrong. | (a) Show nothing about seats until change 5. (b) Show "Cupo limitado" (no number). (c) Show the capacity ("Grupos de hasta N"). (d) After change 5, show the exact number ("N lugares disponibles", image6 and image9), or a threshold such as "Últimos lugares". | (b) now; for change 5, ask whether to show exact numbers | `public-catalog-reader` seats, both page specs, Event `offers` |
| Q2 | **Which month does a taller show?** Fee and capacity live on the monthly period. Near the end of a month both the current and the next month may be open. | (a) The current Córdoba month if open, else the next open month. (b) The next month once it is open. (c) Show both. When no month is open: show the workshop's default fee, or "Inscripciones próximamente" with no fee. | (a), and with no open month, no fee and the text "Próximamente abrimos inscripciones" | `public-catalog-reader`, `talleres-pages` |
| Q3 | **Intensivo detail page or expanded card?** image8 shows an expanded card; the baseline's registration is "desde la página del workshop" (change 5). | (a) A detail page `/intensivos/:slug`. (b) An expanded card on the listing only. | (a) | `intensivos-pages` |
| Q4 | **Talleres filters** "Todos / Mañana / Tarde / Con cupo" (image9; not in the baseline). | (a) None in v1. (b) Morning and afternoon only, by turno start time; the owners give the cut-off hour (and say whether "Noche" exists). (c) Also "Con cupo", which only works after change 5. | (a) while the catalog is small; revisit after data load | `talleres-pages` |
| Q5 | **Intensivos filters** "Desde / Hasta / Técnica / sort" (image8). Intensivos have no technique field in change 3. | (a) None; ordered by nearest date. (b) Date range only. (c) Add a technique field (a change-3 admin addition). | (a) | `intensivos-pages` |
| Q6 | **Interim call to action before change 5.** | (a) "Consultá por WhatsApp" with the activity (and turno) prefilled. (b) No CTA until enrollment ships. | (a) | Both page specs |
| Q7 | **Show the minimum seats of an intensivo?** The baseline asks for visible conditions "incluyendo cancelación por falta de cupo mínimo"; change 3 stores `min_seats` plus free policy text. | (a) Show "Se realiza con un mínimo de N personas". (b) Rely on the policy text only. | (a) | `intensivos-pages` |
| Q8 | **Which talleres does Inicio feature, and with what?** Change 3 has no "featured" flag; image5 shows 3 cards with weekday and time and no price. | (a) The first 3 visible talleres by name. (b) The 3 most recently published. (c) A new "destacado" flag in the panel (a change-3 admin addition). Also: show the fee on Inicio cards or not. | (a) or (b), and no price on Inicio, as in image5 | `home-page` delta |
| Q9 | **Price and time display format.** | Fee "$ 58.000 / mes" (image9) or "Cuota mensual $ 58.000" (image6). Times "10:00 a 12:00" (image9), "de 18:00 a 20:00 h" (image6) or "10:00 – 12:00". | "$ 58.000 / mes" on cards, "Cuota mensual" on the detail page, and "10:00 a 12:00 h" everywhere | Copy only; design can default |
| Q10 | **Prices on the public site at all?** The baseline says yes (cuota, precio, seña). Confirm that the owners want the amounts public rather than "consultá". | (a) Show amounts. (b) Hide them. | (a), per the baseline | Both page specs (low risk) |

Assumptions (not blocking; to confirm during spec review):
- **PA1.** A paused activity keeps its detail page and its place in the listings, ordered with the others (change-3 D7).
- **PA2.** An intensivo disappears from the listings once its date has passed (Córdoba date), and its detail page then answers 404.
- **PA3.** Cancelled and archived activities answer 404, with no "cancelled" notice page.
- **PA4.** Class length is derived from the turno time range; there is no separate field.
- **PA5.** A taller without images uses a registered stand-in image.

### Owner decisions (2026-10-13)

| # | Decision |
|---|---|
| Q1 | Until change 5, show "Cupo limitado" with no number; `available` stays `null`. Change 5 asks again whether to show exact numbers or a threshold. |
| Q2 | Show the current Córdoba month if it is open, else the next open month. With no open month, show no fee and the text "Próximamente abrimos inscripciones". |
| Q3 | Intensivos get a detail page at `/intensivos/:slug`. |
| Q4 | No talleres filters in v1; revisit after the data load. |
| Q5 | No intensivos filters; order them by nearest date. |
| Q6 | Interim CTA: "Consultá por WhatsApp", with the activity (and turno) prefilled. |
| Q7 | Show "Se realiza con un mínimo de N personas" on intensivos. |
| Q8 | Inicio features the first 3 visible talleres, without price, as in image5. |
| Q9 | Format fees as "$ 58.000 / mes" on cards and "Cuota mensual" on the detail page, and times as "10:00 a 12:00 h" everywhere. |
| Q10 | Show prices publicly, per the baseline. |

The owner also confirmed that the public structure is right: it is mobile-first, and the visual layer (background images, video, retouches) comes in the design-adjustments change once the client's material arrives.

---

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/modules/workshops/{application,infrastructure}/**`, `index.ts` (+ tests) | New / Modified | `PublicCatalogService`, public read models, projection, offering-period rule, Drizzle read queries |
| `src/testing/fakes/**`, `src/testing/contracts/**` | New / Modified | In-memory public catalog fake, builders, shared reader contract suite, `createTestServices` default |
| `src/composition/request-services.ts` (+ `.db.test.ts`) | Modified | `AppServices.publicCatalog`, fail-soft placeholder, then adapter wiring |
| `src/modules/site-content/infrastructure/content/**`, `domain/page-content.ts` | Modified | Talleres and Intensivos page copy, paused notice, SEO copy, prefilled WhatsApp messages; coming-soon entries trimmed to Eventos privados |
| `src/app/routes.ts`, `src/app/routes/{talleres,taller,intensivos,intensivo}.tsx` (names in design), `home.tsx` (+ tests) | New / Modified | Pages and Inicio loaders |
| `src/app/routes/sitemap.ts`, `src/app/seo/{sitemap,meta,json-ld}.ts`, `src/app/site-map.ts` (+ tests) | Modified | Dynamic sitemap entries, detail meta and canonical, `Event` builder, site-map fitness counts |
| `src/app/ui/{molecules,organisms,templates}/**` (+ `ui` tests) | New / Modified | Catalog cards, turno list, price tag, seats pill, paused notice, policy note, project gallery, detail templates; `ActivityCard` image made optional |
| `src/app/routes/coming-soon.tsx` and its tests | Modified | Serves `/eventos-privados` only |
| `docs/design/deviation-register.md` | Modified | New rows; T1/A7 narrowed |
| `drizzle/**` | None expected | Only if design adds a read index |

---

## Dependencies

**On change 3 (admin-catalog), by slice.** On `main` at `14363b4`: B0a, B0b (module contracts) and B1a (Access verification). The `ui/admin` atoms are also present.

| Change-4 work | Needs merged first (change 3) | Why |
|---|---|---|
| C4 contract PR and all FRONT development against fakes | B0a, B0b (already merged) | Read models reuse `Turno`, `Weekday`, `LocalTime`, `PeriodKey`, `Money`, `ImageUse`, `isVisibleStatus`, `acceptsNewRequests` and `cordobaMonthOf` |
| Monthly reader adapter | **B2a** (`media_asset`, `MediaLookup`), **B3** (teachers, `TeacherLookup` with bio line), **B4** (`monthly_workshop`), **B5** (`workshop_turno`), **B6** (`workshop_period`, `period_turno`, `period_project_image`) | It queries these tables or calls these lookups |
| Intensivos reader adapter | **B2a**, **B3**, **B7** (`intensive_workshop`, `intensive_image`) | Same |
| Real images on public pages | **B2b** (R2 binding, owner step R1) and **F1** (`/imagenes/:file` route) | Before them, pages render stand-ins (fail-soft) |
| Real data on the preview (client review) | **F2, F3, F4, F5, F6** (admin screens for teachers, talleres, turnos, periods, intensivos), plus owner data entry | Code does not depend on them, but validation with real data does |
| Not needed | B1b, B8a, B8b, B9, F7, F8 | Admin gate, suppliers and materials are not read by public pages in this change |

Other dependencies:
- Change 2 is archived and on `main` (public layout, `ui` element, SEO builders, `site-content`).
- No owner runbook step is needed beyond change 3's R1 for images.
- Verify in design:
  - React Router 8 param routes inside the pathless public layout;
  - whether the sitemap reads the database per request (it is behind Access until launch);
  - `Intl` weekday and time formatting in workerd;
  - the schema.org `Event` fields Google currently requires (current docs);
  - the `offers.availability` mapping for paused.

---

## Delivery forecast (rough; `sdd-tasks` refines)

Authored additions plus deletions. Lockfile, generated types and generated migrations are excluded. Fakes, builders and contract suites count as tests.

| PR | Owner | Content | Needs (merged) | Production | Tests |
|---|---|---|---|---|---|
| P0 | BACK | Planning artifacts | — | 0 (docs ~1,500-2,200) | 0 |
| **C4-B0** | BACK | Contract: public read models, `PublicCatalogService`, `AppServices.publicCatalog` with fail-soft placeholder, fakes, builders, `createTestServices` default | P0 | 120-180 | 100-160 |
| C4-B1 | BACK | Page copy in `site-content` (listings, paused notice, SEO, WhatsApp messages), coming-soon trimmed | C4-B0 | 80-150 | 50-90 |
| C4-B2 | BACK | Intensivos reader: upcoming and visible filter, ordering, projection, slug lookup, Drizzle queries, contract suite | C4-B0, ch3 B2a, B3, B7 | 150-220 | 160-230 |
| C4-B3 | BACK | Monthly reader: offering period (Q2), turnos and capacities, project, projection, slug lookup, Drizzle queries, contract suite | C4-B0, ch3 B2a, B3, B4, B5, B6 | 230-330 | 230-320 |
| C4-F0 | FRONT | Catalog UI components, formatters (money, weekday, time, duration) | C4-B0 | 280-380 | 220-300 |
| C4-F1 | FRONT | `/intensivos` and `/intensivos/:slug`, meta, paused state, 404 | C4-B2, C4-B1, C4-F0 | 220-320 | 180-250 |
| C4-F2 | FRONT | `/talleres` and `/talleres/:slug`, meta, paused state, 404 | C4-B3, C4-B1, C4-F0 | 250-350 | 200-280 |
| C4-F3 | FRONT | Dynamic Inicio sections | C4-B2, C4-B3 | 70-130 | 90-140 |
| C4-F4 | FRONT | `Event` JSON-LD, dynamic sitemap, site-map fitness, deviation register | C4-F1, C4-F2 | 150-230 | 150-220 |
| (C4-F5) | FRONT | Filters, only if Q4 or Q5 keeps any | C4-F1 or C4-F2 | 100-170 | 90-140 |
| **Total** | | 4 BACK + 5 FRONT (+1 optional) | | **~1,300-1,960 (+100-170)** | **~1,380-1,960 (+90-140)** |

About 2,700-3,900 authored lines plus planning docs, across 9-10 PRs, much smaller than change 3 because there are no migrations, no admin screens and no security surface beyond the privacy projection.

- Guard lines for `sdd-tasks`:
  - `Decision needed before apply: Yes`. Q1 and Q2 shape the reader and page specs. The chain strategy also needs the owner's choice under `ask-on-risk`, with stacked-to-main recommended for continuity with changes 2 and 3.
  - `Chained PRs recommended: Yes`.
  - `400-line budget risk: High` for the total; each slice is forecast under 400 production lines.
- Split rules if a slice passes 400 production lines during apply: C4-B3 moves the project and images to C4-B3b; C4-F0 moves the intensivo components to C4-F0b; C4-F2 moves the detail page to C4-F2b.
- **Critical path.** Most of the calendar risk sits in change 3, not here: C4-B3 waits for change-3 B6, the deepest BACK slice. Intensivos (C4-B2, C4-F1) can ship first because they need only B2a, B3 and B7.

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Change-3 BACK slices land late (B6 especially; B1a and B2a were still partial or recently merged), blocking the reader adapters | High | Contract first; FRONT builds every page against fakes; intensivos ship before talleres; fail-soft placeholder keeps public pages working with empty states |
| Change-3 read-model or schema drift after this proposal (its specs are not archived and its design is at revision 2) | Medium | The reader depends on module APIs and its own queries in `workshops`; contract suites run against fakes and Drizzle; re-read change-3 design before C4-B2 and C4-B3 |
| Wrong seat information misleads students (capacity shown as availability while enrollments still happen by WhatsApp) | Medium (high impact on trust) | Q1; `available` is `null` until change 5 and the page never derives availability from capacity |
| Internal data leaks to public pages (percentage, teacher contact, audit emails) | Low-Med (high impact) | Separate actorless service with an explicit field allowlist; a serialization test over fully populated fixtures; no admin read model reused in public loaders |
| Ambiguous offering month shows the wrong fee or capacity | Medium | Q2 decided before specs; pure rule with table tests at Córdoba month boundaries (reusing `cordobaMonthOf`) |
| Invalid or rejected `Event` structured data (time zone, missing required fields, paused mapping) | Medium | Pure builder with shape tests; current schema.org and Google docs checked in design; manual code-snippet validation, since the preview is private |
| Public pages break when the database is slow or down | Low-Med | One query per page area, via Hyperdrive; errors go to the public error boundary with no internals; empty states for the placeholder only |
| Sitemap grows dynamic and starts depending on the database | Low | Sitemap reads only visible slugs; on failure it still lists the static entries (design decides) |
| Mockup expectations (photos, collage, filters, floating button) are read as in scope | Medium | Deviation register rows; design-adjustments change (#321) owns visual fidelity |
| Copy slips into "workshop" or tuteo in dynamic content entered by owners | Low-Med | The copy test covers site-content and microcopy. Admin-entered names are data, not copy; the risk is noted in the deviation register. |
| Slug changes break shared links | Low | Change 3 requires confirmation for published slug changes; 404 with links to the listings; redirects out of scope |

---

## Rollback Plan

- **Per PR.** Each slice is one PR. Revert with `git revert <merge-commit>` on `main`; CI redeploys. Revert FRONT slices before the BACK slice they depend on.
- **Pages.** Reverting C4-F1 or C4-F2 restores the route-table entries to `coming-soon.tsx`, which this change keeps for `/eventos-privados`. The Próximamente copy entries return with the C4-B1 revert, so revert C4-B1 together with the page PR.
- **Inicio.** Reverting C4-F3 returns the literal empty arrays and the empty states.
- **Reader.** Reverting C4-B2 or C4-B3 puts the fail-soft placeholder back; the pages show empty states.
- **Database.** No migration is expected, so nothing to roll back. If design adds a read index, it is additive and forward-only; a reverted Worker ignores it.
- **Emergency.** `wrangler rollback` (owner credentials), then revert the PR. The preview is private and unindexed, so no public exposure needs cleanup.

---

## Success Criteria

- [ ] `/talleres` lists every published and paused monthly taller, and only those, with teacher, turnos, fee and seat information per Q1. `/talleres/:slug` shows the detail sections and answers 404 for unknown, draft and archived slugs.
- [ ] `/intensivos` lists published and paused intensivos with a future date, ordered by date, with date, duration, teacher, price, deposit, seats per Q1 and policy. `/intensivos/:slug` shows the detail and answers 404 for unknown, draft, cancelled, archived and past ones.
- [ ] A paused taller or intensivo shows "Inscripciones pausadas" with a WhatsApp link and no enrollment CTA, proved by route and component tests.
- [ ] Inicio's "Talleres mensuales" and "Próximos intensivos" render reader data, with empty states when there is none. No currency or clock pattern appears outside the activity sections.
- [ ] No public response contains a percentage, modality, teacher phone or email, audit field or period snapshot, proved by a serialization test over fully populated fixtures.
- [ ] Each visible intensivo's page emits one valid `Event` JSON-LD object with Córdoba-offset dates, location from the business profile and ARS offers. Serialization never contains `</script>`.
- [ ] The sitemap lists `/talleres`, `/intensivos` and every visible detail URL, and never `/eventos-privados`, `/admin` or `/status`. Catalog pages follow the indexing gate, which stays OFF. `/eventos-privados` is still a `noindex` Próximamente page.
- [ ] Public pages render empty states (never a 5xx) while the reader placeholder is wired.
- [ ] Every new page and component passes axe, has one `h1` with ordered headings, uses es-AR voseo without "workshop", and works at 360 px.
- [ ] Every reader query passes the same contract suite against the fake and Drizzle on embedded PostgreSQL. Coverage of the new `domain` and `application` code stays at 90 % or more.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` and `pnpm build` pass for every PR.
