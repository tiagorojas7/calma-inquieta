# Design: Public Catalog (Talleres and Intensivos pages from the database, seats, dynamic Inicio, Event JSON-LD)

Change 4 of 8 | Project: calmainquieta | Store: hybrid | Phase: sdd-design | Revision 1 | Date: 2026-10-13
Inputs: `proposal.md` (revision 1, commit `48ab6fe`, including the "Owner decisions (2026-10-13)" table Q1-Q10), the in-progress specs `specs/public-catalog-reader/spec.md` and `specs/talleres-pages/spec.md` (read only; the spec phase runs in parallel), `AGENTS.md`, code on `main` at `14363b4` (`src/modules/{workshops,teachers,media,materials,admin-access,site-content,_shared}/**`, `src/composition/{request-services,unavailable-service}.ts`, `src/testing/fakes/**`, `src/testing/contracts/database-probe.contract.ts`, `src/platform/db/session.ts`, `src/app/{routes.ts,site-map.ts,context.ts,copy-rules.test.ts,site-map.test.ts}`, `src/app/routes/{home,coming-soon,not-found,public-layout,sitemap}.ts(x)`, `src/app/seo/{json-ld,meta,sitemap,canonical}.ts`, `src/app/ui/{atoms,molecules,organisms,templates}/**`), the archived change-2 design (DS3, DS6, DS9, DS12, DS13, DS14), `docs/design/deviation-register.md`, and the change-3 planning in the `CalmaInquieta-plan` worktree (`openspec/changes/admin-catalog/{design,apply-progress}.md`, `specs/*`; read only).

> **Design in one paragraph.** The public catalog is a second, **actorless read path** inside the `workshops` module. It is two small application services, `PublicTalleresReader` and `PublicIntensivosReader`, grouped as `PublicCatalogService` and exposed through `workshops/index.ts`. Each reader sits on its own **records port** (a narrow, column-allowlisted query interface implemented by a Drizzle adapter that reads only `~/platform/db/schema/workshops`) and on the change-3 `TeacherLookup` and `MediaLookup`. The reader applies the visibility rule (`isVisibleStatus`), the Córdoba date and month rules through the `Clock`, the Q2 offering rule, the orderings and an **explicit projection** into public read models whose `available` field is typed as the literal `null`. Composition puts `publicCatalog` into `AppServices`. Until each adapter lands, composition wires an **empty reader** (fail-soft: empty lists, `null` lookups), never the fail-closed `createUnavailableService` Proxy, so public pages render empty states or 404 instead of a 5xx. FRONT adds four route modules (`/talleres`, `/talleres/:slug`, `/intensivos`, `/intensivos/:slug`), delivery-side formatters and mappers in `src/app/catalog/`, presentational components that extend the change-2 atoms and organisms, a pure `buildEventJsonLd` for intensivo detail pages only (monthly talleres get **no** structured data), and a dynamic sitemap that degrades to the static entries if the catalog read fails. There is no cache, no migration and no new package. Work ships as **6 BACK and 6 FRONT PRs**, each under 400 production lines, stacked to `main`.

---

## 0. Inputs fixed before this design

### 0.1 Owner decisions applied (proposal, 2026-10-13)

| # | Decision | Where it lands |
|---|---|---|
| Q1 | "Cupo limitado" with no number; `available` stays `null` | PC6 (type-level `available: null`), PC10 (seats indicator) |
| Q2 | Current Córdoba month if open, else the next open month; with none, no fee and "Próximamente abrimos inscripciones" | PC5 |
| Q3 | Intensivo detail page at `/intensivos/:slug` | PC8 |
| Q4, Q5 | No filters; intensivos ordered by nearest date | PC5, PC8 |
| Q6 | "Consultá por WhatsApp", prefilled with the activity (and turno) | PC11 |
| Q7 | "Se realiza con un mínimo de N personas" | PC9 (intensivo detail and the card's conditions block) |
| Q8 | Inicio features the first 3 visible talleres (by name), without price | PC13 |
| Q9 | "$ 58.000 / mes" on cards, "Cuota mensual" on the detail page, "10:00 a 12:00 h" everywhere | PC10 |
| Q10 | Prices are public | PC6, PC12 |

### 0.2 Design assumptions (the owner or the spec may override; each is one isolated rule)

| # | Assumption | Isolated in |
|---|---|---|
| DA1 | A taller's public turnos are the workshop's **active** turnos. With an offering, only the active turnos that the selected period holds are shown, with that period's capacity. Without an offering, every active turno is shown with capacity `null`. Retired turnos are never public. | `projectTaller` (application) |
| DA2 | A period project is public only for the selected period, and only when its title, its description or its image list is non-empty. | `projectTaller` |
| DA3 | A teacher found through `TeacherLookup` is shown (name, bio line) even if archived, because she is still the assigned teacher (change-3 OA4). An empty bio line becomes `null`. A missing teacher or no assignment gives `teacher: null`. | `projectTeacher` |
| DA4 | An image whose asset `MediaLookup` does not return is dropped. A taller or intensivo with no images renders the registered catalog stand-in (alt `""`, decorative). | `projectImages`, FRONT mappers |
| DA5 | An intensivo stays visible for its whole Córdoba date, even after its end time. It disappears the next Córdoba day. | `isUpcoming` (domain) |
| DA6 | Córdoba is a fixed UTC-03:00 zone (Argentina has had no daylight saving time since 2009). The JSON-LD offset uses this constant, and a guard test fails if the runtime time-zone data ever disagrees. | `CORDOBA_UTC_OFFSET` |
| DA7 | Name ties are broken by slug, so every ordering is total and deterministic. | domain comparators |

---

## 1. Technical Approach

| Concern | Approach | Spec |
|---|---|---|
| Public reader | Two actorless application services in `workshops` (`createPublicTalleresReader`, `createPublicIntensivosReader`), grouped as `PublicCatalogService`; plain `Promise` values, no `Result` (no expected failures; infrastructure errors throw) | public-catalog-reader |
| Data access | One records port per reader; Drizzle adapters select an explicit column list from the change-3 tables, batched with `inArray` (a fixed number of queries per call, independent of catalog size); teacher and image data only through `TeacherLookup` and `MediaLookup` | public-catalog-reader (Adapter parity) |
| Rules | Pure domain functions (offering choice, orderings, upcoming check, public status, slug shape); Córdoba month and date from the `Clock` in the application | public-catalog-reader |
| Privacy | Allowlist at two levels: the records port never selects private columns, and the projection builds fresh objects with explicit keys; sentinel serialization tests at the reader and the loader | public-catalog-reader, talleres-pages |
| Fail-soft | Composition wires `EMPTY_PUBLIC_TALLERES` and `EMPTY_PUBLIC_INTENSIVOS` until each adapter merges; images use `EMPTY_MEDIA_LOOKUP` until change-3 B2b and F1 are on `main` | public-catalog-reader (Fail-soft placeholder) |
| Pages | Four route modules in the pathless public layout; loaders map read models to plain, serializable props through `src/app/catalog/*`; `ui` components stay structural | talleres-pages, intensivos-pages |
| Copy | Page copy, labels and prefilled-message templates in `site-content` (`getCatalogContent()`); formatting data (weekday and month names, units) in the FRONT formatter, scanned by the copy test | site-content, talleres-pages |
| SEO | `buildPageMeta` gains an optional `ogImage`; detail descriptions are truncated to 160 characters; the indexing gate applies (still OFF); dynamic sitemap; `Event` JSON-LD on intensivo detail pages only | seo-foundation, event-structured-data |
| Caching | None in this change | — |
| Delivery | Contract first (C4-B0); BACK merges first; stacked PRs to `main` | process |

**Spec alignment.** When a spec names an observable (label, text, status) differently, the spec wins and apply aligns the names. This design owns structure, layering, data access, test placement and slicing. Section 13.2 lists the points where a spec should follow this design or confirm a choice.

---

## 2. Architecture Decisions

### PC1. The reader lives in `workshops/application`, as two readers behind one service

**Choice**:
- New file `src/modules/workshops/application/public-catalog.ts` holds the public read models, the two reader interfaces, `PublicCatalogService = { talleres; intensivos }`, the two records ports and the two factories. `workshops/index.ts` gains `export * from "./application/public-catalog"` (and the Córdoba date helper, PC5).
- The service is **actorless**: no method takes an `AdminActor`, and the readers never call the admin services (`MonthlyWorkshopsService.listVisible(actor)` stays admin-only).
- The two halves are independent objects, so composition can wire the intensivos reader (C4-B2) while the talleres reader is still the empty one (until C4-B3). This follows the change-3 critical path, where intensivos (B7) are ready long before periods (B6).

**Alternatives considered**:
- A new `catalog` module. The change-3 schema-ownership test forbids a module's adapter from reading another module's tables, and the catalog tables belong to `workshops`. A new module would need its own copy of the tables or cross-module SQL.
- Reusing `listVisible(actor)` with a synthetic public actor. It would put the public path on the admin authorization path, return admin summaries that carry internal fields, and blur the security boundary change 3 built.
- One flat service with six methods. It cannot be wired half real, half empty without a Proxy or conditionals.

**Rationale**: Module ownership is kept, the admin path is untouched, and each half can ship as soon as its change-3 tables exist.

### PC2. Records ports with explicit column lists; lookups for teachers and images

**Choice**:
- `PublicTallerRecords` and `PublicIntensivoRecords` (section 5.1) return **records** that already exclude private columns. The Drizzle adapters `src/modules/workshops/infrastructure/drizzle-public-{taller,intensivo}-records.ts` import only `~/platform/db/schema/workshops` (schema-ownership test, change-3 AC1) and `drizzle-orm`.
- Status filtering happens in SQL (`status IN ('published','paused')`), and the application re-checks `isVisibleStatus` as defense in depth.
- Period filtering happens in SQL: stored `status = 'open'` and `period >= :fromPeriod`. With change-3 AC11, an open period whose month has ended is effectively closed; filtering from the current Córdoba month gives exactly the effective open periods.
- Intensivo expiry happens in SQL: `event_date >= :fromDate`.
- Query plan per call (fixed, batched; no per-row queries):

  | Call | Queries |
  |---|---|
  | `PublicTallerRecords.listVisible` | 1 workshops; 2 active turnos (`inArray(workshop_id)`); 3 workshop images; 4 open periods from the month; 5 `period_turno` capacities; 6 `period_project_image` |
  | `PublicTallerRecords.findVisibleBySlug` | the same six, filtered to one workshop (step 1 by `slug`) |
  | `PublicIntensivoRecords.listVisible` / `findVisibleBySlug` | 1 intensivos; 2 intensivo images |
  | `listVisibleSlugs` (either) | 1 query selecting `slug` only |

- Steps 2-6 run only when step 1 returned rows. Each records call opens one session from the existing per-operation `createDbSessionFactory` and closes it in `finally`.
- `time` columns come back from `pg` as `HH:MM:SS`. The adapter normalizes them to `HH:MM`, and the contract suite asserts `"10:00"`.
- The reader then calls `teachers.findByIds` and `media.findAssets` **in parallel** with the de-duplicated ids of the records it holds.
- **No index and no migration**: `monthly_workshop` has `(status)` and `UNIQUE(slug)`, `workshop_period` has `UNIQUE(workshop_id, period)`, and `intensive_workshop` has `UNIQUE(slug)`. The catalog has tens of rows.

**Alternatives considered**: Drizzle relational queries (`db.query…with`), which need `relations()` declarations change 3 does not plan; one SQL view (a migration and a second schema surface); joins to `teacher` and `media_asset` (forbidden by the schema-ownership test).

**Rationale**: Private columns never leave the database, the module boundary stays mechanical, and the query count is bounded.

### PC3. Fail-soft empty readers in composition, not the fail-closed Proxy

**Choice**:
- `src/composition/empty-public-catalog.ts` exports `EMPTY_PUBLIC_TALLERES`, `EMPTY_PUBLIC_INTENSIVOS` (lists `[]`, lookups `null`, slugs `[]`) and `EMPTY_MEDIA_LOOKUP` (an empty `Map`).
- C4-B0 wires both empty readers. C4-B2 replaces the intensivos one, C4-B3 the talleres one. C4-B5 replaces `EMPTY_MEDIA_LOOKUP` with the real lookup once change-3 B2b (R2 binding) and F1 (`/imagenes/:file`) are on `main`; before that, metadata could exist while the image route does not, so pages would show broken images.
- Real adapter errors are **not** caught by the reader or the loaders: they reach the public layout `ErrorBoundary` (500, Spanish copy, no internals). The only catch is in the sitemap resource route (PC12).

**Alternatives considered**: `createUnavailableService<PublicCatalogService>()` (its methods resolve `err({ kind: "unavailable" })`, which the admin routes map to 503; public pages would need a Result branch whose only outcome is a 5xx or a lie); a `catalogEnabled` flag (a third state to test); catching errors in loaders and showing empty states (it hides outages as "no activities", which the reader spec forbids).

**Rationale**: The empty reader has exactly the semantics of "nothing published yet", which is the truth until the adapters exist. The real failure path stays loud.

### PC4. Plain promises, `null` for "not found"

**Choice**: Reader methods return `Promise<readonly T[]>`, `Promise<T | null>` and `Promise<readonly string[]>`, like `SiteContent`. There is no actor, so there is no `Denied`. Unknown, invisible and expired slugs are all `null`, so they are indistinguishable to callers (and to visitors).
**Alternatives considered**: `Result<T, NotFound>` (the change-3 admin convention). With no expected failure besides "absent", it adds unwrapping to every loader for no information.
**Rationale**: It matches the existing public read API (`site-content`) and keeps loaders short.

### PC5. Córdoba time, the `Clock`, and the offering rule

**Choice**:
- `cordobaDateOf(instant): string` (`YYYY-MM-DD`) is added next to the change-3 `cordobaMonthOf`, in a new file `src/modules/workshops/application/cordoba-time.ts`, with the same `Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Cordoba" })` technique. Each reader call reads `clock.now()` once, then derives `month = cordobaMonthOf(now)` and `today = cordobaDateOf(now)`.
- Pure domain rules (`src/modules/workshops/domain/public-catalog-rules.ts`) take strings, never `Date`:
  - `selectOffering(periods, month)`: among the periods whose key is `>= month`, return the one with the **smallest** key, or `null`. This is Q2: the current month when it is open, else the earliest later open month. The adapter already filters, and the rule filters again, so a fake or a future adapter cannot select a past month.
  - `isUpcoming(eventDate, today)`: `eventDate >= today` (ISO string order; DA5).
- With no offering, the projection sets `offering: null`, `project: null` and every turno capacity `null`. **No default fee is ever substituted.**

**Alternatives considered**: `defaultFee` as a fallback (rejected by Q2); `Date` arithmetic in the domain (time-zone bugs; the change-3 pattern is string keys); a stored "current period" pointer (a write on read or a cron).

**Rationale**: One clock read per call, string comparison, and boundary tests at 01:00Z and 03:00Z (22:00 and 00:00 in Córdoba) make the month and day rules exact.

### PC6. Public read models: an explicit allowlist, `available` typed as `null`

**Choice** (section 5.1 has the full types):
- `PublicTaller` and `PublicIntensivo` carry only the spec-allowed fields. They carry no ids: slugs identify activities, and turnos are keyed by weekday and start time.
- `PublicImage = { src, alt, width, height }`, with no `assetId`, `fileName`, `contentType`, `byteSize`, `createdBy` or `createdAt`.
- `PublicTeacher = { name, bioLine }`, with no id, phone, email, modality or active flag.
- `PublicSeats = { capacity: number | null; available: null }`. The **literal `null` type** makes "derive availability from capacity" a type error. Change 5 widens it to `number | null` together with the confirmed-seat counter.
- Money stays `Money` in the read model (change-3 AC10: outputs are read models). Loaders format it to strings, because `Money` is a class and must not reach serialized loader data.
- `status: "open" | "paused"` is the public status (`published` gives `open`). Draft, archived and cancelled never reach the projection.
- The projection functions (`projectTaller`, `projectIntensivo`, `projectImages`, `projectTeacher`) build every object with literal keys. They never spread a record or a lookup result.

**Alternatives considered**: reusing change-3 read models with `Omit<…>` (a field added later in change 3 would leak by default); passing capacity as availability (forbidden by Q1).

**Rationale**: New internal fields in change 3 can never reach a public response without a deliberate edit to an allowlist that tests pin (PC14).

### PC7. Orderings are domain comparators applied in the reader

**Choice**:
- Talleres: `Intl.Collator("es", { sensitivity: "base" })` on the name, then slug (DA7). The result is "acuarela", "Cerámica", "Pintura".
- Turnos: ISO weekday (Monday 1 to Sunday 7), then `startsAt` (change-3 SA2).
- Intensivos: `eventDate`, then `startsAt`, then name (collator), then slug.
- `limit` (Inicio): applied after sorting. It must be a positive integer, otherwise a `RangeError` (a programming error, not input).
- Adapters return rows in any order. The contract suite asserts the reader's order, so a fake and Drizzle cannot disagree because of SQL collation.

**Alternatives considered**: `ORDER BY name COLLATE "es-AR-x-icu"` (it depends on the ICU collations of the Neon build, and the fake would need to copy them); ordering by publish date (there is no public publish timestamp, and audit fields are private).
**Rationale**: Deterministic and runtime-independent ordering; Q8's "first 3" is well defined.

### PC8. Routes: flat param routes inside the pathless public layout

**Choice** (`src/app/routes.ts`, final state after C4-F2):

```ts
layout("routes/public-layout.tsx", [
  index("routes/home.tsx"),
  route("talleres", "routes/talleres.tsx"),               // C4-F2
  route("talleres/:slug", "routes/taller.tsx"),           // C4-F2
  route("intensivos", "routes/intensivos.tsx"),           // C4-F1
  route("intensivos/:slug", "routes/intensivo.tsx"),      // C4-F1
  route("eventos-privados", "routes/coming-soon.tsx", { id: "coming-soon/eventos-privados" }),
  route("quienes-somos", "routes/about.tsx"),
  route("contacto", "routes/contact.tsx"),
  route("*", "routes/not-found.tsx", { id: "routes/not-found-splat" }),
]),
```

- Listing and detail are **siblings**, not parent and child, so the detail does not render inside the listing and each has its own `meta`.
- Detail loaders call `findBySlug(params.slug)`. On `null` they `throw data(null, { status: 404 })`, which the existing layout `ErrorBoundary` renders as the styled Spanish 404 inside the chrome (change-2 DS6). The `meta` error branch returns "Página no encontrada" with `noindex`.
- The reader rejects a slug that does not match `^[a-z0-9]+(-[a-z0-9]+)*$` or is longer than 80 characters with `null` **before any query** (`isPublicSlug`, domain), so junk paths never reach the database.
- `coming-soon.tsx` keeps serving `/eventos-privados` only. C4-F1 removes `"intensivos"` and C4-F2 removes `"talleres"` from its `supportedSlugs`, so C4-B4 can later narrow `ComingSoonSlug` without a FRONT edit.
- The `NavLink` already marks `/talleres` current on `/talleres/:slug` (`end` only for `/`), so the "active menu entry on detail" scenario needs a test, not code.

**Alternatives considered**: nested `talleres` with an index and a `:slug` child (an extra outlet route for no shared UI); a catch-all `talleres/*` (it loses typed params).
**Rationale**: It reuses DS6's single boundary, so 404 and 500 keep the chrome and the status.

### PC9. Component inventory: extend change-2 parts, add catalog parts, keep props structural

**Choice**: section 6 lists every component. In short:
- **Reused unchanged**: `Heading`, `Text`, `Image`, `ButtonLink`, `Eyebrow`, `EmptyState`, `ActivityShowcase`, `UpcomingList`, `JsonLdScript`.
- **Extended (backward-compatible optional props)**:
  - `ActivityCard` gains `schedule?` and `badge?`;
  - `UpcomingItem` gains `detail?` and `badge?`;
  - `DateBadge` gains `weekday?`;
  - `GalleryGrid`'s `heading` becomes optional; without it, it renders only the grid and the dialog, for use inside a parent section;
  - `Pill` gains a `tone` (`neutral` or `notice`) and real styling (today it is a bare `<span>`).
- **New**: `PriceTag`, `PausedNotice`, `TurnoList`, `Breadcrumb`, `TeacherBlock`, `ConditionsNote`, `TallerCard`, `IntensivoCard`, `CatalogGrid`, `ProjectSection`, and the templates `CatalogListingPage`, `TallerDetailPage` and `IntensivoDetailPage`.
- `ActivityCard.image` stays **required**: the delivery mapper resolves the stand-in fallback from `site-content`, so the fallback is always a manifest-registered asset (content-tested by BACK). The `ui` layer never decides which stand-in to use.

**Alternatives considered**: a generic `CatalogCard` with variant props (two very different layouts behind flags); making `image` optional in `ui` with a hardcoded path (an unregistered asset path in `ui`).
**Rationale**: Change-2 tests keep passing, and DS3's purity rule holds: `ui` imports nothing from `src/modules`.

### PC10. Formatting and display state live in delivery (`src/app/catalog/`)

**Choice**: new delivery folder `src/app/catalog/` (classified by the existing `delivery` element, `src/app/**`):
- `format.ts`, pure and table-tested, **with no `Intl` for numbers or names**:
  - `formatPesos(money)`: "$ 58.000". It groups thousands with `.` by hand, puts a no-break space (U+00A0) after `$`, and shows a `,dd` suffix only when the centavos are non-zero.
  - `formatTimeRange("10:00", "12:00")`: "10:00 a 12:00 h".
  - `formatDuration`: "2 horas", "1 hora", "2 h 30 min", "45 min".
  - `weekdayName(1..7)`: "Lunes" … "Domingo".
  - `formatEventDate("2026-11-14")`: "Sábado 14 de noviembre".
  - `dateBadgeParts(date)`: weekday, day and month, for example "sáb", "14", "nov".
- `display-state.ts`: `tallerDisplay(status, offering)` returns `"paused" | "open" | "no-offering"`. Paused takes precedence over no offering (spec "Paused precedence"). `seatsIndicator(display)` returns `{ kind: "limited" } | { kind: "none" }`: "Cupo limitado" only for `open`, never derived from capacity or `available`. Change 5 adds `count` and `full`.
- `mappers.ts`: read model → props of `TallerCard`, `IntensivoCard`, the detail templates, `ActivityCard` (Inicio) and `UpcomingItem` (Inicio), using `CatalogContent` for labels and the stand-in.
- `whatsapp.ts`: builds the prefilled `wa.me` links with `buildWhatsAppUrl` and `fillCopyTemplate` (PC11).
- Weekday and month names are locale **formatting data**, like `Intl` output, not page copy. `src/app/copy-rules.test.ts` scans them with `findCopyViolations` (section 13.2, item 2).

**Alternatives considered**: `Intl.NumberFormat("es-AR", { style: "currency" })` (it emits "$ 58.000" with U+00A0 in full ICU, but output varies with ICU builds, and workerd's ICU data is not verified); formatting in BACK (ties the read model to one presentation).
**Rationale**: Byte-identical output in Node tests and workerd, and one module that owns every display string shape.

### PC11. WhatsApp CTA: the existing builder plus content templates

**Choice**:
- `site-content` gains message templates with named placeholders (section 5.3), for example `"Hola, quiero consultar por el taller {nombre}."`, and `fillCopyTemplate(template, values)` (pure, `site-content/domain`, exported). It replaces `{key}` tokens and throws on a missing value (a defect, caught by tests).
- Open activity: "Consultá por WhatsApp" links to `buildWhatsAppUrl(profile.whatsapp.display, message)`. On the taller detail, each turno also gets a link whose message adds the weekday and time ("lunes de 10:00 a 12:00 h").
- Paused activity: `PausedNotice` shows "Inscripciones pausadas" and a link "Escribinos por WhatsApp" with the paused template (it names the activity). It shows no "Consultá por WhatsApp" CTA.
- When `buildWhatsAppUrl` fails (an invalid number), the CTA falls back to the Instagram link with "Seguinos en Instagram", the change-2 pattern.
- The number stays provisional: it appears only inside links (change-2 DS5).

**Alternatives considered**: messages composed in delivery (copy outside `site-content`, against DS14); one generic message (Q6 asks for the activity and turno).
**Rationale**: It reuses the tested normalizer and URL encoder; the messages are content the client can approve.

### PC12. SEO: meta, sitemap, structured data

**Meta** (`src/app/seo/meta.ts`, FRONT):
- `PageMetaInput` gains `ogImage?: string` (a path or absolute URL; default `SHARE_IMAGE_PATH`). Detail pages pass the cover image's `src` when the activity has one. Stand-in SVGs are never used as `og:image`.
- New `truncateDescription(text, 160)`: it cuts at the last word boundary within 159 characters and appends "…".
- Detail title: the activity name; `buildPageMeta` appends " | Calma Inquieta". The description is the truncated summary. The canonical is `/talleres/<slug>` or `/intensivos/<slug>`.
- The catalog pages pass no `robots` and no `comingSoon`, so the indexing gate decides (OFF in this change, so `noindex`).

**Site map** (`src/app/site-map.ts`): `talleres` and `intensivos` become `indexable: true` (C4-F1 flips intensivos, C4-F2 talleres). The fitness test then expects five static indexable pages.

**Sitemap route** (`src/app/routes/sitemap.ts`, C4-F4):
- The route reads `talleres.listSlugs()` and `intensivos.listSlugs()` in parallel and appends `/talleres/<slug>` and `/intensivos/<slug>` after the static paths.
- **If either call throws**, the route logs the constant `"sitemap: catalog read failed"` (no error text, which could carry connection details) and returns the static entries with `Cache-Control: public, max-age=300`. The normal response keeps `max-age=3600`.
- This is the only place a catalog error is caught: a sitemap with fewer URLs for five minutes is harmless, while a 500 would make crawlers back off the whole file.
- The route also fixes its type import from `./+types/coming-soon` to `./+types/sitemap`.
- No `lastmod`: the only timestamps are audit fields, which are private.

**Structured data** (`src/app/seo/json-ld.ts`):
- `buildEventJsonLd(intensivo: EventInput, profile, baseUrl)` returns one `Event` per **intensivo detail page**:

  | Property | Value |
  |---|---|
  | `@context`, `@type` | `https://schema.org`, `Event` |
  | `name` | activity name |
  | `description` | summary |
  | `startDate`, `endDate` | `${date}T${startsAt}:00-03:00` and `${date}T${endsAt}:00-03:00` (DA6) |
  | `eventStatus` | `https://schema.org/EventScheduled` (open and paused: pausing enrollment does not move or cancel the event) |
  | `eventAttendanceMode` | `https://schema.org/OfflineEventAttendanceMode` |
  | `location` | `Place` with `name` (profile name) and the `PostalAddress` shared with LocalBusiness (refactored into `buildPostalAddress(profile)`) |
  | `organizer` | `Organization` with the profile name and the canonical `/` |
  | `performer` | `Person` with the teacher name, only when a teacher is present |
  | `image` | absolute URLs of the activity images, only when there are any |
  | `offers` | `Offer`: `price` (pesos as a decimal string, for example `"90000"`), `priceCurrency` `ARS`, `url` (the canonical detail URL), `availability` `https://schema.org/LimitedAvailability` when open, `https://schema.org/OutOfStock` when paused |

- `EventInput` is a structural type declared in `seo` (strings and numbers), so `seo` stays free of module classes. The loader maps the read model to it.
- No `remainingAttendeeCapacity` and no `maximumAttendeeCapacity` (Q1: no number). No `validFrom` (there is no public publication date). Serialized with the existing `serializeJsonLd`.
- **`/intensivos` emits no Event list, and Inicio emits only LocalBusiness**, so each event has exactly one canonical markup location (the detail page).
- **Monthly talleres emit no structured data**:
  - a monthly taller is a recurring class series without dated occurrences in the catalog;
  - `Event` with `eventSchedule` is not used by Google's event features;
  - generating one `Event` per class would mean inventing dates the owners never entered;
  - `Course` with `CourseInstance` maps poorly (no provider pages, no syllabus);
  - as far as this design knows (to verify, section 13.3), Google retired the Course Info rich result in 2025.

  The studio itself is already covered by LocalBusiness. Revisit at launch (change 8) if the owners want course-style markup.

**Alternatives considered**: `ItemList` of Events on `/intensivos` (duplicate entities); `SoldOut` for paused (false: seats are not exhausted); omitting `offers` when paused (it drops the price, which the baseline wants visible); `Event` with `eventSchedule` for talleres (see above).

### PC13. Inicio: two reader calls, existing organisms

**Choice**:
- `home.tsx` reads, in parallel with content and profile, `talleres.list({ limit: 3 })` and `intensivos.list({ limit: 3 })`. image5 shows three items in each section.
- Talleres map to `ActivityCard` props:
  - the image (cover or stand-in);
  - the title and the summary;
  - `schedule`: at most two turnos ("Lunes, 10:00 a 12:00 h · Miércoles, 18:00 a 20:00 h"), plus "y N turnos más" when there are more;
  - `badge` "Inscripciones pausadas" when paused;
  - a link to `/talleres/<slug>` labelled "Ver taller".

  **No price** (Q8).
- Intensivos map to `UpcomingItem` props: the date, the title, `detail` (the time range), the paused `badge`, and a link to `/intensivos/<slug>` labelled "Ver intensivo".
- Empty states stay as they are. With the empty readers, Inicio renders exactly what it renders today.
- A reader error propagates (500), as on every public page (PC3). Section 14 asks whether the owner prefers Inicio to drop the two sections instead.

### PC14. Privacy is proven at three levels

| Level | Test | Slice |
|---|---|---|
| Records | The contract suite asserts the **exact key set** of every record. A Drizzle select that adds a column fails. | C4-B2, C4-B3 |
| Reader | A fully populated seed (percentage 3550 bp, teacher phone `+54 9 351 000 0000`, teacher email `docente@example.test`, `modality: "third_party"`, `updatedBy: "auditor@example.test"`, snapshot teacher id `SNAPSHOT-SENTINEL`, asset `fileName` `PRIVATE-FILE.jpg`, `createdBy: "uploader@example.test"`). `JSON.stringify` of every reader result is scanned for each sentinel value and for the keys `percentage`, `basisPoints`, `modality`, `phone`, `email`, `audit`, `updatedBy`, `snapshot`, `fileName`, `createdBy`. Plus exact key-set assertions for `PublicTaller`, `PublicIntensivo`, `PublicTurno`, `PublicImage` and `PublicTeacher`. | C4-B2, C4-B3 |
| Delivery | The loader results for all four pages and Inicio, built with the **real readers** over the in-memory records seeded with the same sentinels (`createSeededPublicCatalog`), are serialized and scanned; so is the JSON-LD string. | C4-F1, C4-F2, C4-F3, C4-F4 |

### PC15. No caching in this change

**Choice**: catalog pages send no `Cache-Control` of their own, and there is no per-isolate memo of catalog data. The sitemap keeps `max-age=3600` (300 when degraded).
**Rationale**:
- The preview is private behind Access.
- The owners expect a publish or pause to show at once.
- Traffic is negligible.
- A per-isolate memo would add staleness rules and the workerd cross-request I/O hazard documented in `ProbeMemoCell`.

Edge caching (`s-maxage` with a short TTL, purge on publish) is a launch decision (change 8).

### PC16. Ownership seams (DS13 and change-3 AC15 style)

- **BACK** owns `src/modules/**` (the `workshops` public-catalog files, the `site-content` catalog copy and template filler), `src/composition/**`, `src/testing/{fakes,contracts,db}/**` and `openspec/**`.
- **FRONT** owns `src/app/**` (`catalog/`, `routes/`, `ui/`, `seo/`, `site-map.ts`) and the carve-outs `src/testing/fixtures/**` and `docs/design/**`.
- **Seams**:
  1. FRONT fixtures may import the BACK builders, the fake catalog and `createSeededPublicCatalog`. BACK never edits `src/testing/fixtures/**`.
  2. FRONT narrows `coming-soon.tsx` before BACK narrows `ComingSoonSlug` (C4-F1 and C4-F2, then C4-B4), so no PR edits the other side's files.
  3. The `site-map.test.ts` uniqueness test moves from coming-soon SEO to catalog SEO in the FRONT page slices. BACK changes no FRONT test.
- **Merge discipline**: BACK merges first. Each FRONT page slice merges only after the reader it shows (C4-B2 for intensivos, C4-B3 for talleres), so the delivery privacy test runs against the real projection. C4-F3 (Inicio) may merge after C4-B0, because with the empty readers it renders exactly today's output. FRONT rebases on `origin/main` before each slice.

---

## 3. Data Flow

```
Browser ── GET /talleres/ceramica-inicial ──► Worker (Access in front; indexing header)
                                              │
                                    React Router, public layout loader (profile)
                                              │
                    routes/taller.tsx loader ─┼─► services.siteContent.getCatalogContent()
                                              ├─► services.siteContent.getBusinessProfile()
                                              └─► services.publicCatalog.talleres.findBySlug(slug)
                                                        │  (workshops/application, actorless)
                                                        ├─ isPublicSlug? no → null → 404
                                                        ├─ clock.now() → month, today (Córdoba)
                                                        ├─ records.findVisibleBySlug(slug, { fromPeriod: month })
                                                        │     └─ Drizzle: workshops schema only, explicit columns
                                                        ├─ Promise.all(teachers.findByIds, media.findAssets)
                                                        ├─ selectOffering, ordering (domain)
                                                        └─ projectTaller → PublicTaller (allowlist)
                                              │
                    mappers + format (src/app/catalog) → plain props (strings only)
                                              │
                    TallerDetailPage (ui) ◄───┘          meta: buildPageMeta (+ ogImage, truncation)

Composition (per request): publicCatalog = {
  talleres:   C4-B0..B2: EMPTY_PUBLIC_TALLERES   → C4-B3: createPublicTalleresReader(drizzle records, TeacherLookup, mediaLookup, systemClock)
  intensivos: C4-B0..B1: EMPTY_PUBLIC_INTENSIVOS → C4-B2: createPublicIntensivosReader(...)
  mediaLookup: EMPTY_MEDIA_LOOKUP → C4-B5: Drizzle MediaLookup (after change-3 B2b and F1)
}
```

Sitemap: `listSlugs()` × 2 in parallel → static plus dynamic paths → `buildSitemapXml`; on error, static only with `max-age=300`.

---

## 4. Request behavior by state

| Situation | `/talleres`, `/intensivos` | `/talleres/:slug`, `/intensivos/:slug` | Inicio sections | Sitemap |
|---|---|---|---|---|
| Empty reader (before C4-B2 or C4-B3) | 200, h1, intro, EmptyState with CTA | 404 (styled) | Empty states (today's output) | Static entries |
| Real reader, no visible activity | Same as above | 404 | Empty states | Static entries |
| Visible, open | Card with "Cupo limitado" (taller only with an offering) | Detail, "Consultá por WhatsApp" | Card or item | Entry per slug |
| Visible, paused | Card with "Inscripciones pausadas" | Detail with PausedNotice, no inquiry CTA | Card or item with badge | Entry |
| Taller without an offering | Card with "Próximamente abrimos inscripciones", no fee, no seats | Same text, turnos without seats | Card (no price anyway) | Entry |
| Draft, archived, cancelled, past intensivo | Absent | 404 (identical body) | Absent | Absent |
| Malformed slug (`/talleres/%3Cx%3E`) | — | 404, no query | — | — |
| Database error (real reader) | 500 (boundary, Spanish, no internals) | 500 | 500 (see section 14) | Static entries, `max-age=300` |

---

## 5. Contracts

### 5.1 `workshops` (C4-B0 types and ports; C4-B2 and C4-B3 implementations)

```ts
// src/modules/workshops/application/public-catalog.ts
import type { Clock, Money } from "~/modules/_shared";
import type { MediaLookup } from "~/modules/media";
import type { TeacherLookup } from "~/modules/teachers";
import type { IntensiveStatus, LocalTime, PeriodKey, Weekday, WorkshopStatus } from "./contracts";

export type PublicStatus = "open" | "paused";
export interface PublicImage { readonly src: string; readonly alt: string; readonly width: number; readonly height: number }
export interface PublicTeacher { readonly name: string; readonly bioLine: string | null }
/** `available` stays the literal null until change 5 adds confirmed seats (Q1). */
export interface PublicSeats { readonly capacity: number | null; readonly available: null }
export interface PublicTurno {
  readonly label: string; readonly weekday: Weekday; readonly startsAt: LocalTime; readonly endsAt: LocalTime;
  readonly seats: PublicSeats;
}
export interface PublicOffering { readonly period: PeriodKey; readonly fee: Money }
export interface PublicProject { readonly title: string; readonly description: string; readonly images: readonly PublicImage[] }
export interface PublicTaller {
  readonly slug: string; readonly name: string; readonly summary: string; readonly description: string;
  readonly technique: string; readonly teacher: PublicTeacher | null; readonly images: readonly PublicImage[];
  readonly status: PublicStatus; readonly turnos: readonly PublicTurno[];   // weekday, then start (PC7)
  readonly offering: PublicOffering | null; readonly project: PublicProject | null;
}
export interface PublicIntensivo {
  readonly slug: string; readonly name: string; readonly summary: string; readonly description: string;
  readonly teacher: PublicTeacher | null; readonly date: string; readonly startsAt: LocalTime; readonly endsAt: LocalTime;
  readonly price: Money; readonly deposit: Money; readonly minSeats: number; readonly policyText: string;
  readonly materialsIncluded: boolean; readonly images: readonly PublicImage[]; readonly status: PublicStatus;
  readonly seats: PublicSeats;
}
export interface ListOptions { readonly limit?: number }
export interface PublicTalleresReader {
  list(options?: ListOptions): Promise<readonly PublicTaller[]>;
  findBySlug(slug: string): Promise<PublicTaller | null>;
  listSlugs(): Promise<readonly string[]>;
}
export interface PublicIntensivosReader {
  list(options?: ListOptions): Promise<readonly PublicIntensivo[]>;
  findBySlug(slug: string): Promise<PublicIntensivo | null>;
  listSlugs(): Promise<readonly string[]>;
}
export interface PublicCatalogService { readonly talleres: PublicTalleresReader; readonly intensivos: PublicIntensivosReader }

// Records ports (implemented in infrastructure; private columns are never selected)
export interface CatalogImageRef { readonly assetId: string; readonly alt: string }        // position order
export interface PublicTallerRecord {
  readonly slug: string; readonly name: string; readonly summary: string; readonly description: string;
  readonly technique: string; readonly teacherId: string | null; readonly status: WorkshopStatus;
  readonly images: readonly CatalogImageRef[];
  readonly activeTurnos: readonly { readonly id: string; readonly label: string; readonly weekday: Weekday;
    readonly startsAt: LocalTime; readonly endsAt: LocalTime }[];
  readonly openPeriods: readonly {                                      // stored "open", period >= fromPeriod
    readonly period: PeriodKey; readonly fee: Money;
    readonly capacities: readonly { readonly turnoId: string; readonly capacity: number }[];
    readonly project: { readonly title: string | null; readonly description: string | null; readonly images: readonly CatalogImageRef[] };
  }[];
}
export interface PublicTallerRecords {
  listVisible(q: { readonly fromPeriod: PeriodKey }): Promise<readonly PublicTallerRecord[]>;
  findVisibleBySlug(slug: string, q: { readonly fromPeriod: PeriodKey }): Promise<PublicTallerRecord | null>;
  listVisibleSlugs(): Promise<readonly string[]>;
}
export interface PublicIntensivoRecord {
  readonly slug: string; readonly name: string; readonly summary: string; readonly description: string;
  readonly teacherId: string | null; readonly eventDate: string; readonly startsAt: LocalTime; readonly endsAt: LocalTime;
  readonly price: Money; readonly deposit: Money; readonly capacity: number; readonly minSeats: number;
  readonly policyText: string; readonly materialsIncluded: boolean; readonly status: IntensiveStatus;
  readonly images: readonly CatalogImageRef[];
}
export interface PublicIntensivoRecords {
  listVisible(q: { readonly fromDate: string }): Promise<readonly PublicIntensivoRecord[]>;
  findVisibleBySlug(slug: string, q: { readonly fromDate: string }): Promise<PublicIntensivoRecord | null>;
  listVisibleSlugs(q: { readonly fromDate: string }): Promise<readonly string[]>;
}
interface ReaderDeps<R> { readonly records: R; readonly teachers: TeacherLookup; readonly media: MediaLookup; readonly clock: Clock }
export function createPublicTalleresReader(deps: ReaderDeps<PublicTallerRecords>): PublicTalleresReader;      // C4-B3
export function createPublicIntensivosReader(deps: ReaderDeps<PublicIntensivoRecords>): PublicIntensivosReader; // C4-B2

// src/modules/workshops/application/cordoba-time.ts (C4-B2)
export function cordobaDateOf(instant: Date): string;   // "YYYY-MM-DD" in America/Argentina/Cordoba

// src/modules/workshops/domain/public-catalog-rules.ts (C4-B2 / C4-B3; plain strings and numbers)
export function isPublicSlug(slug: string): boolean;
export function isUpcoming(eventDate: string, today: string): boolean;
export function selectOffering<P extends { readonly period: string }>(periods: readonly P[], month: string): P | null;
export function compareTurnos(a: { weekday: number; startsAt: string }, b: { weekday: number; startsAt: string }): number;
export function compareTalleres(a: { name: string; slug: string }, b: { name: string; slug: string }): number;
export function compareIntensivos(a: IntensivoKey, b: IntensivoKey): number;   // date, start, name, slug
```

In C4-B0 the factories are declared as types only. C4-B2 and C4-B3 add the implementations in `application/public-intensivos-reader.ts` and `application/public-talleres-reader.ts`, with shared projection helpers in `application/public-projection.ts` (C4-B2).

### 5.2 Composition (`src/composition/request-services.ts`, extended)

```ts
export interface AppServices { /* existing members */ readonly publicCatalog: PublicCatalogService }
// C4-B0
publicCatalog: { talleres: EMPTY_PUBLIC_TALLERES, intensivos: EMPTY_PUBLIC_INTENSIVOS },
// C4-B2 (intensivos) and C4-B3 (talleres), with the change-3 lookups built once per request
publicCatalog: {
  talleres: createPublicTalleresReader({ records: createDrizzlePublicTallerRecords(openSession), teachers, media, clock: systemClock }),
  intensivos: createPublicIntensivosReader({ records: createDrizzlePublicIntensivoRecords(openSession), teachers, media, clock: systemClock }),
},
// where teachers = the change-3 Drizzle TeacherLookup (B3), media = EMPTY_MEDIA_LOOKUP until C4-B5
```

### 5.3 `site-content` (C4-B1)

```ts
// domain/page-content.ts
export interface CatalogContent {
  readonly fallbackImage: ImageRef;                       // a registered stand-in; alt "" (decorative)
  readonly talleres: {
    readonly seo: SeoCopy; readonly heading: string /* "Talleres" */; readonly intro: ApprovableText;
    readonly emptyMessage: string; readonly cardCtaLabel: string /* "Ver taller" */;
    readonly feeSuffix: string /* "/ mes" */; readonly feeLabel: string /* "Cuota mensual" */;
    readonly noOffering: string /* "Próximamente abrimos inscripciones" */;
    readonly turnosHeading: string; readonly teacherHeading: string;
    readonly projectHeading: string /* "Proyectos que vamos a realizar" */;
  };
  readonly intensivos: {
    readonly seo: SeoCopy; readonly heading: string /* "Talleres intensivos" */; readonly intro: ApprovableText;
    readonly emptyMessage: string; readonly cardCtaLabel: string /* "Ver intensivo" */;
    readonly priceLabel: string; readonly depositLabel: string /* "Seña" */;
    readonly materialsIncluded: string; readonly minSeats: string /* "Se realiza con un mínimo de {cantidad} personas" */;
    readonly conditionsLabel: string; readonly teacherHeading: string;
  };
  readonly shared: {
    readonly seatsLimited: string /* "Cupo limitado" */; readonly paused: string /* "Inscripciones pausadas" */;
    readonly inquiryCta: string /* "Consultá por WhatsApp" */; readonly pausedLinkLabel: string /* "Escribinos por WhatsApp" */;
    readonly moreTurnos: string /* "y {cantidad} turnos más" */; readonly breadcrumbLabel: string;
  };
  readonly messages: {                                     // wa.me templates, voseo
    readonly taller: string;    // "{nombre}"
    readonly turno: string;     // "{nombre}", "{dia}", "{horario}"
    readonly intensivo: string; // "{nombre}", "{fecha}"
    readonly paused: string;    // "{nombre}"
  };
}
// application/site-content.ts
getCatalogContent(): Promise<CatalogContent>;
// domain/copy-template.ts (exported from index.ts)
export function fillCopyTemplate(template: string, values: Readonly<Record<string, string>>): string;
```

- `RawSiteContent` gains `catalog: CatalogContent`. Content tests (C4-B1) check:
  - `findCopyViolations` over every string;
  - each template contains exactly its placeholders;
  - `fallbackImage.src` is in the stand-in manifest (an existing `gallery-0N.svg` is reused, so no new file);
  - the SEO titles and descriptions are non-empty and distinct from the other pages.
- The two intros are drafted prose (`approved: false`), listed by `listUnapprovedContent()`.
- The literal strings in the comments above are the spec-named texts. Every other text is drafted in C4-B1 and approved by the owners. No business fact (schedule, price, teacher, policy) is written into content: those come only from the catalog.

### 5.4 Test fakes and helpers (BACK, `src/testing/`)

| File | Slice | Contents |
|---|---|---|
| `fakes/public-catalog-builders.ts` | C4-B0 | `buildPublicImage`, `buildPublicTeacher`, `buildPublicTurno`, `buildPublicTaller`, `buildPublicIntensivo` (neutral invented data, for example "Taller Demo", fee `Money` 5,800,000 centavos) |
| `fakes/fake-public-catalog.ts` | C4-B0 | `createFakePublicCatalog({ talleres?, intensivos? })`: keeps the given order, honors `limit`, exact-slug `findBySlug`, `listSlugs`. `createTestServices` defaults `publicCatalog` to the empty fake |
| `fakes/in-memory-public-catalog-records.ts` | C4-B2 (intensivos), C4-B3 (talleres) | Records fakes over a `CatalogSeed`, applying the same filters as SQL (status, `fromPeriod`, `fromDate`, active turnos) |
| `fakes/catalog-seed.ts` | C4-B2, C4-B3 | `CatalogSeed` type, `fullyPopulatedSeed()` with the PC14 sentinels, `createSeededPublicCatalog(seed, clock)` (real readers over in-memory records and fake lookups, for FRONT loader privacy tests) |
| `db/seed-catalog.ts` | C4-B2, C4-B3 | Inserts a `CatalogSeed` into the change-3 tables (`teacher`, `media_asset`, `monthly_workshop`, `workshop_turno`, `workshop_image`, `workshop_period`, `period_turno`, `period_project_image`, `intensive_workshop`, `intensive_image`) |
| `contracts/public-catalog.contract.ts` | C4-B2, C4-B3 | `runPublicIntensivosContract(setup)`, `runPublicTalleresContract(setup)`: the suite runs **at reader level** (reader over records X plus fake lookups plus fixed clock), so "visibility, expiry, offering selection, turno ordering, list ordering, slug lookup and privacy" are proven identically for the fake and Drizzle (spec "Adapter parity") |

---

## 6. Component inventory (`src/app/ui`, FRONT; every file has a `.ui.test.tsx` with axe)

| Component | Kind | Status | Props (structural) | Used by |
|---|---|---|---|---|
| `Pill` | atom | Extend | `tone?: "neutral" \| "notice"`, children | Seats, paused, materials badges |
| `PriceTag` | molecule | New | `label?`, `amount`, `suffix?` | Cards ("$ 58.000 / mes"), detail ("Cuota mensual") |
| `PausedNotice` | molecule | New | `text`, `link?: { href; label }` | Cards (text only), details (text plus link) |
| `TurnoList` | molecule | New | `items: { key; weekday; timeRange; duration?; seats?; inquiry?: { href; label } }[]` | Taller card (compact), taller detail |
| `Breadcrumb` | molecule | New | `label` (nav aria-label), `items: { label; href? }[]` (last is `aria-current="page"`) | Both details |
| `TeacherBlock` | molecule | New | `heading`, `name`, `bioLine?` | Both details |
| `ConditionsNote` | molecule | New | `summaryLabel`, `minSeats?`, `policyText` (native `<details>`; text rendered as text, line breaks kept) | Intensivo card and detail |
| `DateBadge` | molecule | Extend | `weekday?` | Intensivo card, Inicio |
| `ActivityCard` | molecule | Extend | `schedule?`, `badge?` | Inicio |
| `UpcomingItem` | molecule | Extend | `detail?`, `badge?` | Inicio |
| `TallerCard` | molecule | New | `image`, `name`, `teacher?`, `summary`, `turnos`, `price?`, `notice?` (no-offering text), `seats?`, `paused?`, `href`, `ctaLabel` | `/talleres` |
| `IntensivoCard` | molecule | New | `image`, `date` (badge parts), `name`, `duration`, `teacher?`, `price`, `deposit`, `seats?`, `materialsBadge?`, `paused?`, `conditions`, `href`, `ctaLabel` | `/intensivos` |
| `GalleryGrid` | organism | Extend | `heading` optional | `ProjectSection`, detail galleries |
| `CatalogGrid` | organism | New | `items: ReactNode[]` or typed cards, `empty: { message; action }` | Both listings |
| `ProjectSection` | organism | New | `heading`, `title?`, `description?`, `images` | Taller detail |
| `CatalogListingPage` | template | New | `heading` (h1), `intro`, `children` (grid) | Both listings |
| `TallerDetailPage` | template | New | breadcrumb, h1, description, teacher, turnos, price or notice, seats, CTA or PausedNotice, project, images | `/talleres/:slug` |
| `IntensivoDetailPage` | template | New | breadcrumb, h1, date line, duration, time range, teacher, price, deposit, seats, materials, min seats, policy, CTA or PausedNotice, images | `/intensivos/:slug` |

Rules:
- One `h1` per page (the template). Card titles are `h2` on listings and `h3` inside Inicio sections. Detail sections are `h2`, the project title is `h3`.
- Mobile first: single column at 360 px, a 2-3 column grid from `md`, touch targets `min-h-11`.
- Cover images are `aboveTheFold` only on the detail page's first image. Card images are lazy.
- **Interface points for design-adjustments (#321)**: image slots take an `ImageRef` resolved by the mapper (a photo or a stand-in swap is a content or data change), `ProjectSection.images` and the detail gallery take a list whose item type can later become a union with video, Inicio sections stay prop-driven, and testimonials are not touched. Scroll-autoplay video, mixed testimonials and visual fidelity are out of scope here.

---

## 7. File Changes

| File | Action | Owner | Slice | Description |
|---|---|---|---|---|
| `src/modules/workshops/application/public-catalog.ts` | Create | BACK | C4-B0 | Read models, readers, service, records ports, factory signatures |
| `src/modules/workshops/index.ts` | Modify | BACK | C4-B0, C4-B2 | Export the public catalog and `cordobaDateOf` |
| `src/modules/workshops/application/cordoba-time.ts` (+ test) | Create | BACK | C4-B2 | `cordobaDateOf`, `CORDOBA_UTC_OFFSET` guard test |
| `src/modules/workshops/domain/public-catalog-rules.ts` (+ test) | Create | BACK | C4-B2, C4-B3 | Slug shape, upcoming, offering, comparators |
| `src/modules/workshops/application/public-projection.ts` (+ test) | Create | BACK | C4-B2 | `projectImages`, `projectTeacher`, `publicStatus` |
| `src/modules/workshops/application/public-intensivos-reader.ts` (+ test) | Create | BACK | C4-B2 | Intensivos reader |
| `src/modules/workshops/application/public-talleres-reader.ts` (+ test) | Create | BACK | C4-B3 | Talleres reader, `projectTaller` |
| `src/modules/workshops/infrastructure/drizzle-public-intensivo-records.ts` (+ `.db.test.ts`) | Create | BACK | C4-B2 | Drizzle records |
| `src/modules/workshops/infrastructure/drizzle-public-taller-records.ts` (+ `.db.test.ts`) | Create | BACK | C4-B3 | Drizzle records (six batched queries) |
| `src/modules/site-content/domain/page-content.ts`, `domain/copy-template.ts` (+ test), `application/site-content.ts`, `index.ts` | Modify / Create | BACK | C4-B1 | `CatalogContent`, `fillCopyTemplate`, `getCatalogContent` |
| `src/modules/site-content/infrastructure/content/catalog.ts`, `repository-content-source.ts`, `repository-content.test.ts` | Create / Modify | BACK | C4-B1 | Catalog copy and its tests |
| `src/modules/site-content/infrastructure/content/coming-soon.ts`, `domain/page-content.ts` (`ComingSoonSlug`) | Modify | BACK | C4-B4 | Keep only `eventos-privados` |
| `src/composition/empty-public-catalog.ts` (+ test) | Create | BACK | C4-B0 | Empty readers, empty media lookup |
| `src/composition/request-services.ts` (+ `.db.test.ts`) | Modify | BACK | C4-B0, C4-B2, C4-B3, C4-B5 | `publicCatalog` member and wiring |
| `src/testing/fakes/{public-catalog-builders,fake-public-catalog,in-memory-public-catalog-records,catalog-seed}.ts` (+ tests), `fakes/app-services.ts`, `fakes/in-memory-site-content-source.ts` | Create / Modify | BACK | C4-B0-B3 | Section 5.4 |
| `src/testing/{contracts/public-catalog.contract.ts,db/seed-catalog.ts}` | Create | BACK | C4-B2, C4-B3 | Section 5.4 |
| `src/app/catalog/{format,display-state,mappers,whatsapp}.ts` (+ tests) | Create | FRONT | C4-F0a, C4-F1, C4-F2 | PC10, PC11 |
| `src/app/ui/**` (section 6) | Create / Modify | FRONT | C4-F0a, C4-F0b, C4-F1, C4-F2 | Components |
| `src/app/routes.ts` | Modify | FRONT | C4-F1, C4-F2 | PC8 |
| `src/app/routes/{intensivos,intensivo}.tsx` (+ tests) | Create | FRONT | C4-F1 | Listing and detail |
| `src/app/routes/{talleres,taller}.tsx` (+ tests) | Create | FRONT | C4-F2 | Listing and detail |
| `src/app/routes/coming-soon.tsx` (+ tests) | Modify | FRONT | C4-F1, C4-F2 | Narrow `supportedSlugs` |
| `src/app/routes/home.tsx` (+ tests) | Modify | FRONT | C4-F3 | PC13 |
| `src/app/seo/meta.ts` (+ test) | Modify | FRONT | C4-F1 | `ogImage`, `truncateDescription` |
| `src/app/seo/json-ld.ts` (+ test) | Modify | FRONT | C4-F4 | `buildEventJsonLd`, `buildPostalAddress` |
| `src/app/routes/sitemap.ts` (+ test) | Modify | FRONT | C4-F4 | Dynamic entries, degrade |
| `src/app/site-map.ts` (+ test) | Modify | FRONT | C4-F1, C4-F2 | `indexable: true`, fitness counts, catalog SEO uniqueness |
| `src/app/copy-rules.test.ts` | Modify | FRONT | C4-F0a | Scan the formatter name tables and new microcopy |
| `src/testing/fixtures/catalog.ts` | Create | FRONT carve-out | C4-F0b | Loader-data fixtures for UI tests |
| `docs/design/deviation-register.md` | Modify | FRONT carve-out | C4-F1, C4-F2, C4-F4 | T1/A7 narrowed per page; new rows (section 10.5) |
| `drizzle/**`, `eslint.config.ts`, `package.json` | None | — | — | No migration, no new element, no package |

---

## 8. Testing Strategy (Strict TDD: every row starts RED)

| Layer | What | Approach | Project | Slice |
|---|---|---|---|---|
| Domain | `isPublicSlug` (valid, uppercase, `..`, `%`, 81 chars); `isUpcoming` (yesterday, today, tomorrow); `selectOffering` (current open; current missing → next; two later → earliest; only past → null; empty → null; unsorted input); comparators (weekday then start; collator "acuarela" < "Cerámica" < "Pintura"; slug tie-break; date, start, name) | Pure tables | unit | C4-B2, C4-B3 |
| Application | `cordobaDateOf` at 2026-11-01T01:00Z (2026-10-31), 02:59Z (2026-10-31) and 03:00Z (2026-11-01); offset guard (`Intl` reports GMT-3 in January and July) | Pure | unit | C4-B2 |
| Application | Readers over in-memory records, fake lookups and `fixedClock`: visibility (draft, archived, cancelled excluded even when a fake returns them); paused gives `paused`; expiry by Córdoba date; offering at the 31-Oct-22:00 boundary; capacity `null` without an offering; DA1 turno rule; DA2 project rule; DA3 teacher rule; DA4 image dropping; `limit` and `RangeError`; invalid slug gives `null` with **zero** records calls (spy); exact-slug, cross-type `null` | In-memory | unit | C4-B2, C4-B3 |
| Application | Privacy (PC14): sentinel scan and exact key sets | `JSON.stringify` | unit | C4-B2, C4-B3 |
| Contract | `runPublicIntensivosContract` / `runPublicTalleresContract` against the in-memory records and Drizzle on embedded PostgreSQL (seeded through `seed-catalog.ts` over the change-3 schema); record key sets; `HH:MM` normalization; `Money` round trip | Shared suite | unit, db | C4-B2, C4-B3 |
| Composition | `createRequestServices` exposes `publicCatalog`; with the empty readers, lists `[]`, lookups `null` and slugs `[]`; after wiring, a migrated empty database gives `[]` | Existing `.db.test.ts` | db | C4-B0, C4-B2, C4-B3 |
| Content | Copy rules over catalog content; template placeholders; `fillCopyTemplate` (fills, repeated keys, missing key throws); fallback stand-in registered; distinct SEO | Unit | unit | C4-B1 |
| Delivery | `format.ts` tables ("$ 58.000" with U+00A0, `,50`, "1 hora", "2 horas", "2 h 30 min", "45 min", weekday 1-7, "Sábado 14 de noviembre"); `display-state.ts` (paused precedence, seats only when open with an offering) | Pure | unit | C4-F0a |
| Delivery | `whatsapp.ts` (decoded `text` contains the name, weekday and time; invalid number gives the Instagram fallback) | Pure | unit | C4-F1 |
| Delivery | Loaders with `createTestServices({ publicCatalog })`: 200 with data; empty gives 200 plus empty props; `null` gives a thrown 404; a reader that throws gives a thrown error (not an empty state); meta (unique title, description ≤ 160, canonical by slug, `og:image` from the cover, `noindex` while the gate is off and none when on); loader data is plain JSON (no `Money` instance); privacy scan with `createSeededPublicCatalog(fullyPopulatedSeed())` | Unit | unit | C4-F1, C4-F2, C4-F3 |
| Delivery | `buildEventJsonLd` shape tables: open (`LimitedAvailability`), paused (`OutOfStock`, still `EventScheduled`); `-03:00` dates; no capacity keys; `performer` only with a teacher; `image` only with images; a name containing `</script>` serializes without `<`; JSON-LD present on the intensivo detail and absent on listings | Unit | unit | C4-F4 |
| Delivery | Sitemap: static plus dynamic URLs in order; slugs escaped; throwing reader gives static entries, `max-age=300` and the constant log line (no error text); never `/eventos-privados`, `/admin` or `/status` | Unit | unit | C4-F4 |
| Fitness | `site-map.test.ts`: every page routed; `/talleres/:slug` and `/intensivos/:slug` map to their modules; five static indexable pages; catalog SEO unique. `copy-rules.test.ts` scans the formatter tables | Unit | unit | C4-F1, C4-F2, C4-F0a |
| Component | Every component in section 6 with axe; cards in open, paused and no-offering states; "Cupo limitado" absent when paused or without an offering; no digits next to "lugares"; `ConditionsNote` renders policy text as text (a `<b>` string is not markup) | Testing Library + axe | ui | C4-F0a, C4-F0b |
| Route UI | `createRoutesStub` renders of the four pages (with data, empty, paused, no offering), one `h1`, heading order, "Talleres" `aria-current` on the detail, no `form` element, no filter controls; Inicio with data has no `$` digit pattern | Testing Library + axe (`page: true`) | ui | C4-F1, C4-F2, C4-F3 |
| Manual | 360 px and 390 px on the preview; Rich Results Test code-snippet mode on one intensivo's JSON-LD (the preview URL is private); real WhatsApp link on a phone | PR checklist | preview | C4-F1, C4-F2, C4-F4 |

Coverage: the 90 % gate applies to the new `workshops/domain` and `workshops/application` files and to `site-content/domain/copy-template.ts`. About two new `*.db.test.ts` files.

---

## 9. Threat Matrix

### 9.1 Skill applicability matrix

This change adds HTTP application routes (four public pages and a dynamic sitemap). It adds no shell commands, subprocesses, VCS or PR automation, or executable-file classification.

| Boundary | Applicability |
|---|---|
| Documentation-like paths | N/A: no file classification or execution |
| Git repository selection | N/A: no git automation |
| Commit state | N/A: no commit automation |
| Push state | N/A: no push automation |
| PR commands | N/A: no PR automation |

### 9.2 Application security matrix (all rows applicable; each RED test precedes its production code)

| # | Threat | Safe behavior | Failure behavior | RED test | Slice |
|---|---|---|---|---|---|
| P1 | Internal fields leak (percentage, modality, teacher contact, audit, snapshot, storage metadata) | Column allowlist, explicit projection, plain-prop mappers | — | Record key sets; reader sentinel scan; loader and JSON-LD sentinel scan | C4-B2, C4-B3, C4-F1-F4 |
| P2 | Draft, archived, cancelled or past activities reachable by slug or listed | SQL filter plus `isVisibleStatus` re-check plus `isUpcoming` | `null` → 404 with the same body | Reader and contract tables; route 404 bodies equal | C4-B2, C4-B3, C4-F1, C4-F2 |
| P3 | Existence oracle (why a slug is 404) | Every invisible case is the same `null` | Identical 404 | Draft and archived bodies compared | C4-F2 |
| P4 | Junk or hostile slugs reach the database | `isPublicSlug` before any query | `null`, zero records calls | Spy test | C4-B2 |
| P5 | Script injection through admin-entered text in JSON-LD | `serializeJsonLd` escaping plus `JsonLdScript` defense | — | `</script>` name test | C4-F4 |
| P6 | Markup injection through policy text or descriptions | React text rendering only; no `dangerouslySetInnerHTML` outside `JsonLdScript` | — | `<b>` string renders literally | C4-F0b |
| P7 | XML injection in the sitemap | Slug regex plus the existing `escapeXml` | — | Escape test | C4-F4 |
| P8 | Prefilled-message or URL injection in `wa.me` links | Fixed host; `encodeURIComponent` in `buildWhatsAppUrl` | Invalid number gives the Instagram fallback | Decode test with `&`, `?`, `#` and a newline in the name | C4-F1 |
| P9 | Infrastructure details in errors or logs | Boundary renders Spanish copy only; the sitemap logs a constant | 500 without internals | Throwing-reader route test; log assertion | C4-F1, C4-F4 |
| P10 | Outage shown as "no activities" | Only the empty reader is empty; real errors propagate | 500 | Throwing-reader loader test | C4-F1, C4-F2, C4-F3 |
| P11 | Seat information misleads (capacity shown as availability) | `available: null` literal type; indicator independent of capacity | — | Type test (`@ts-expect-error` assigning a number); UI "no number" test | C4-B0, C4-F0a |
| P12 | Catalog pages indexed early | Indexing gate still OFF; three layers unchanged | `noindex` | Meta gate tests | C4-F1, C4-F2 |

---

## 10. Delivery plan (stacked PRs to `main`; Conventional Commits, never `Co-Authored-By` or AI attribution)

Authored additions plus deletions. Fakes, builders, seeds and contract suites count as tests. **Every slice is under 400 production lines.**

### 10.1 Chain strategy

**Recommended: `stacked-to-main`**, as in changes 2 and 3:
- each slice is reviewed and merged on its own;
- change-3 slices keep landing on `main` in between, so a feature branch would need repeated rebases of both chains;
- the fail-soft placeholders make every intermediate state shippable.

Under `ask-on-risk`, the orchestrator still asks the owner to confirm.

### 10.2 Order and dependencies

```
P0 ─► C4-B0 (contract) ─┬─► C4-B1 (copy; needs only P0, ordered after B0 to keep one BACK writer)
                        ├─► C4-B2 (intensivos reader) ◄── ch3 B7 (which needs B3, B2a)
                        ├─► C4-B3 (talleres reader)   ◄── ch3 B6 (which needs B5, B4, B3, B2a), C4-B2 (shared projection)
                        └─► C4-B5 (media swap)        ◄── ch3 B2b + ch3 F1, C4-B2
FRONT (develops against C4-B0 fakes from day one):
C4-F0a (C4-B0) ─► C4-F0b (C4-F0a) ─┬─► C4-F1 intensivos (C4-B1, C4-B2; adds whatsapp.ts) ─┐
                                   ├─► C4-F2 talleres   (C4-B1, C4-B3) ─┼─► C4-F4 SEO (C4-F1, C4-F2)
                                   └─► C4-F3 Inicio     (C4-B0, C4-F0b) │
C4-B4 (coming-soon cleanup) ◄──────────────── C4-F1 + C4-F2 ────────────┘
```

Critical path: change-3 B6 → C4-B3 → C4-F2 → C4-F4. Intensivos (C4-B2, C4-F1) ship first, needing only change-3 B2a, B3 and B7.

### 10.3 Slices

| PR | Owner | Content | Needs (merged) | Production | Tests |
|---|---|---|---|---|---|
| P0 | BACK | Planning artifacts (proposal, specs, design, tasks) | — | 0 (docs ~1,800-2,600) | 0 |
| **C4-B0** | BACK | Contract: `public-catalog.ts` types and ports, index export, `AppServices.publicCatalog`, `empty-public-catalog.ts`, composition wiring, builders, fake catalog, `createTestServices` default, `available: null` type test | P0 (ch3 B0a, B0b already merged) | 120-170 | 110-160 |
| C4-B1 | BACK | Catalog copy: `CatalogContent`, `catalog.ts`, `getCatalogContent`, `fillCopyTemplate`, in-memory source builder, content tests | C4-B0 | 160-220 | 90-140 |
| C4-B2 | BACK | Intensivos reader: `cordobaDateOf`, slug/upcoming/intensivo comparators, `public-projection.ts`, reader, Drizzle records, composition wiring with the change-3 `TeacherLookup` and `EMPTY_MEDIA_LOOKUP`; records fake, seeds, contract suite, privacy tests | C4-B0, ch3 B7 | 230-300 | 260-340 |
| C4-B3 | BACK | Talleres reader: `selectOffering`, turno/taller comparators, `projectTaller` (DA1, DA2), reader, Drizzle records (six queries), wiring; records fake, seeds, contract suite, privacy tests | C4-B2, ch3 B6 | 280-370 | 280-370 |
| C4-B4 | BACK | Retire the coming-soon `talleres` and `intensivos` entries; `ComingSoonSlug = "eventos-privados"`; content tests | C4-F1, C4-F2 | 20-50 | 10-30 |
| C4-B5 | BACK | Real `MediaLookup` into the public readers (one composition line plus a test) | C4-B2, ch3 B2b, ch3 F1 | 5-20 | 20-40 |
| C4-F0a | FRONT | `src/app/catalog/{format,display-state}.ts`; `Pill` tones, `PriceTag`, `PausedNotice`, `TurnoList`, `Breadcrumb`, `TeacherBlock`, `ConditionsNote`; copy-rules scan | C4-B0 | 240-330 | 210-290 |
| C4-F0b | FRONT | `TallerCard`, `IntensivoCard`, `CatalogGrid`, `CatalogListingPage`, extensions of `ActivityCard`, `UpcomingItem`, `DateBadge`, `GalleryGrid`; `src/testing/fixtures/catalog.ts` | C4-F0a | 200-290 | 180-260 |
| C4-F1 | FRONT | `/intensivos`, `/intensivos/:slug`, `IntensivoDetailPage`, intensivo mappers, `src/app/catalog/whatsapp.ts` (needs the C4-B1 templates), `meta.ts` (`ogImage`, `truncateDescription`), coming-soon narrowing, `PUBLIC_PAGES` intensivos indexable, site-map tests, T1/A7 row | C4-F0b, C4-B1, C4-B2 | 270-360 | 220-300 |
| C4-F2 | FRONT | `/talleres`, `/talleres/:slug`, `TallerDetailPage`, `ProjectSection`, taller mappers with per-turno links, coming-soon narrowing, `PUBLIC_PAGES` talleres indexable, T1/A7 row | C4-F0b, C4-B1, C4-B3 | 290-380 | 240-320 |
| C4-F3 | FRONT | Dynamic Inicio (two reader calls, mappers to `ActivityCard` and `UpcomingItem`) | C4-F0b, C4-B0 | 60-120 | 90-140 |
| C4-F4 | FRONT | `buildEventJsonLd`, `buildPostalAddress`, embedding on the intensivo detail, dynamic sitemap with degrade, deviation-register rows | C4-F1, C4-F2 | 140-220 | 160-230 |
| **Total** | | 6 BACK + 6 FRONT | | **~2,015-2,830** | **~1,870-2,620** |

Totals by owner:

| Owner | Production | Tests |
|---|---|---|
| BACK | 815-1,130 | 770-1,080 |
| FRONT | 1,200-1,700 | 1,100-1,540 |

The total is above the proposal's BACK estimate and close to its FRONT one. The main causes are the two small follow-up slices (C4-B4, C4-B5) that avoid cross-seam edits, and the pre-split C4-F0.

### 10.4 Split rules (only if production passes 400 during apply)

- **C4-B3**: the project and its images (DA2, `period_project_image` query) move to C4-B3b. The detail page then shows no project section until it lands.
- **C4-F0a**: `ConditionsNote`, `Breadcrumb` and `TeacherBlock` move to C4-F0c.
- **C4-F2**: the detail route and `TallerDetailPage` move to C4-F2b (the listing ships first; "Ver taller" links 404 until F2b, so F2 and F2b should merge the same day).
- **C4-F1**: the detail page moves to C4-F1b, with the same note.
- C4-B2 has no natural seam beyond moving the contract suite's Drizzle half into a follow-up, which is not allowed: stop and report to the owner.

### 10.5 Deviation-register rows (FRONT, `docs/design/deviation-register.md`)

| Row | Content | Slice |
|---|---|---|
| T1 / A7 | Narrowed to `/eventos-privados` | C4-F1 (intensivos), C4-F2 (talleres) |
| C1 | Seats: "Cupo limitado" instead of counts until change 5 | C4-F4 |
| C2 | Interim "Consultá por WhatsApp" instead of an enrollment button | C4-F4 |
| C3 | Intensivo detail page instead of image8's expanded card | C4-F4 |
| C6 | No filters on image8 and image9 (Q4, Q5) | C4-F4 |
| C7 | Cards show the summary; the full description is on the detail page | C4-F4 |
| New | No structured data for monthly talleres (PC12) | C4-F4 |
| New | Card visuals: stand-in images and no photo collage until design-adjustments (#321) | C4-F4 |
| New | Admin-entered names and texts are data, not copy, so the voseo and "workshop" scan cannot cover them | C4-F4 |

### 10.6 Guard lines for `sdd-tasks`

- `Decision needed before apply: Yes`. The owner confirms the chain strategy under `ask-on-risk` (stacked-to-main recommended). Q1-Q10 are decided, and DA1-DA7 are overridable assumptions that do not block apply.
- `Chained PRs recommended: Yes`
- `400-line budget risk: High` (total); every slice is forecast under 400 production lines.

---

## 11. Migration / Rollout

- **No migration.** No table, column or index is added. A reverted Worker reads nothing new.
- **No owner runbook step** beyond change 3's R1 (bucket), which only gates C4-B5.
- **Temporary states on `main`**:

  | Window | What visitors see |
  |---|---|
  | C4-B0 until C4-B2 | Both readers empty. Before C4-F1 and C4-F2, `/talleres` and `/intensivos` are still "Próximamente". Inicio is unchanged. |
  | C4-B2 until C4-B3 | Intensivos are real; talleres are empty (empty state, detail 404). |
  | Until C4-B5 | Every activity renders the stand-in image. |
  | C4-F1 and C4-F2 until C4-F4 | No Event JSON-LD, and the sitemap is static (now including `/talleres` and `/intensivos`). |

- **Indexing gate stays OFF.** Opening it is change 8.

---

## 12. Rollback

- **Per PR**: `git revert <merge-commit>` on `main`; CI redeploys. Revert FRONT slices before the BACK slice they depend on.
- **Pages** (C4-F1, C4-F2): reverting restores the coming-soon route entries. If C4-B4 already merged, revert C4-B4 first (it restores the coming-soon content entries the restored routes need).
- **Readers** (C4-B2, C4-B3): reverting returns the empty reader in composition. Pages show empty states and details 404; nothing 5xxs.
- **Images** (C4-B5): reverting returns `EMPTY_MEDIA_LOOKUP`, so pages show stand-ins.
- **Inicio** (C4-F3): reverting returns the literal empty arrays.
- **SEO** (C4-F4): reverting removes the Event JSON-LD and the dynamic sitemap entries.
- **Emergency**: `wrangler rollback` (owner credentials), then revert. The preview is private and unindexed, so nothing public needs cleanup.

---

## 13. Risks, spec alignment and verification

### 13.1 Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Change-3 slices land late (B6 above all) | High | Contract first; empty readers; intensivos first; FRONT builds against fakes; C4-F3 can merge early |
| Change-3 schema drifts from its design revision 2 (column names, `time` mapping, period project nullability) | Medium | Records ports isolate the adapters; re-read change-3 `src/platform/db/schema/workshops.ts` at the start of C4-B2 and C4-B3; the contract suite runs on the real schema |
| Several database sessions per page (records, teacher lookup, media lookup; Inicio about six) through Hyperdrive | Medium | Lookups run in parallel; measure on the preview in C4-F3; fallback: a request-scoped session factory memo in composition (one connection per request), a composition-only change |
| A DB outage now takes Inicio down (it was static) | Low-Med | Section 14 asks the owner; the fallback is a two-line loader change |
| `Intl` time-zone data in workerd differs (Córdoba month and date) | Low | Same technique as change-3 `cordobaMonthOf` (already a change-3 verify item); offset guard test; workerd check in C4-B2 |
| Google's Event requirements or the paused mapping differ from this design | Medium | Pure builder with shape tests; verify against current Google docs in C4-F4 before merge; the mapping is one table |
| Owners expect structured data for monthly talleres | Low | PC12 rationale in the deviation register; revisit at launch |
| Owner-entered text with "workshop" or tuteo | Low-Med | Deviation-register note; owners' panel copy guidance (change 3) |
| A slug change breaks shared links | Low | Change 3 requires confirmation for published slugs; the 404 links to the listings |
| `fillCopyTemplate` throws on a template edited without its placeholder | Low | Content test pins the placeholders per template |

### 13.2 Points for the spec phase (the spec wins on product rules; tasks reconcile)

1. **public-catalog-reader**, "Lookup by slug": a slug that fails the slug format is "not found" without a query (PC8, P4).
2. **talleres-pages** and **intensivos-pages**, "Copy rules": weekday and month names and the units "h", "hora(s)" and "min" are formatting data in `src/app/catalog/format.ts`, scanned by the copy test. Labels, headings and messages come from `site-content`. If the spec requires the name tables in `site-content` too, apply moves them (one content entry plus a mapper argument).
3. **talleres-pages**, "Fee and time formats": the separator after `$` is U+00A0 (no-break space). Tests compare with normalized whitespace.
4. **talleres-pages**, "Paused state": the paused link label is "Escribinos por WhatsApp" (content entry `shared.pausedLinkLabel`).
5. **talleres-pages**, "Taller detail content": turnos follow DA1 (only active turnos; with an offering, only those the period holds).
6. **public-catalog-reader**, "Draft data stays out": the project follows DA2.
7. **event-structured-data**: Event only on intensivo detail pages (no list on `/intensivos`, none on Inicio); `LimitedAvailability` when open, `OutOfStock` when paused, `EventScheduled` in both; no capacity properties; no monthly-taller markup.
8. **public-catalog-reader**, "Intensivos expire by Cordoba date": DA5 (visible the whole day).
9. **seo-foundation**, "Sitemap": on a catalog read failure, the sitemap degrades to the static entries (`max-age=300`) instead of answering 5xx.
10. **home-page**: Inicio intensivos are limited to 3 (image5), like talleres (Q8).

### 13.3 Verify in apply (owning slice in brackets)

- [ ] Change-3 `schema/workshops.ts` column names and types match section 3 of its design; `time` columns return `HH:MM:SS` through `pg` [C4-B2, C4-B3].
- [ ] The change-3 Drizzle `TeacherLookup` and `MediaLookup` factory names and signatures, and that `MediaAsset.src` is `/imagenes/<id>.<ext>` [C4-B2].
- [ ] `Intl.DateTimeFormat` with `America/Argentina/Cordoba` in workerd (`pnpm dev`, one request with a fixed clock hook or a log of `cordobaDateOf`) [C4-B2].
- [ ] `Intl.Collator("es", { sensitivity: "base" })` order in workerd matches Node for accented names [C4-B3].
- [ ] React Router 8.4 typegen gives `Route.LoaderArgs` with `params.slug: string` for `talleres/:slug` inside the pathless layout; a thrown `data(null, { status: 404 })` renders the layout boundary with status 404 for document and `.data` requests [C4-F1].
- [ ] Single-fetch serialization: loader results contain only plain values (a test asserts `JSON.parse(JSON.stringify(x))` equals `x`) [C4-F1].
- [ ] Current Google Search Central Event structured-data requirements (required: `name`, `startDate`, `location`; recommended fields) and the `offers.availability` values; confirm whether the Course Info rich result is retired; validate one generated object in the Rich Results Test code-snippet mode [C4-F4].
- [ ] The sitemap resource route is unaffected by the Access-protected preview (Access still fronts it) [C4-F4].
- [ ] Hyperdrive latency of a detail page with three sessions on the preview; decide on the request-scoped session fallback [C4-F3].

---

## 14. Open Questions

- [ ] **(Owner, non-blocking)** If the database fails, should Inicio still render (dropping the two activity sections, without empty-state copy) instead of the 500 page? This design follows the reader spec (errors propagate). The alternative is a two-line change in `home.tsx`, and the spec would need an Inicio exception.
- [ ] **(Spec, non-blocking)** Confirm the points in section 13.2, especially item 2 (where weekday and month names live) and item 7 (the Event mapping).

None of these blocks `sdd-tasks`.
