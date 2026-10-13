# Proposal: Admin Catalog (admin identity, shell, workshops, turnos, periods, teachers, materials)

Change 3 of 8 | Project: calmainquieta | Store: hybrid | Phase: sdd-propose | Date: 2026-10-07 | **Revision 2** (owner answers D1-D8 folded in)
Inputs: approved roadmap scope (owner, 2026-10-05; Engram `calmainquieta/approved-plan` #207), `calmainquieta/monthly-renewal-model` (#198), the owner's Cloudflare Access decision and answers to D1-D8 (2026-10-07, recorded below), `docs/client-proposal/proposal.md` (baseline), `docs/client-proposal/mockups-analysis.md` (images 6, 11, 14, 17, 18, 19; sections 3.1, 3.4, 3.5, 3.6), `openspec/changes/platform-foundation/exploration.md` (1.3, 1.4, 4.6), `openspec/changes/design-system-and-public-site/{proposal,design,tasks}.md` (DS3, DS4, DS13, parallel protocol), `AGENTS.md`, `src/modules/system-status/**`, `src/composition/request-services.ts`, `src/platform/env.ts`, `src/platform/db/schema.ts`, `workers/app.ts`, `wrangler.jsonc`, `.github/workflows/ci.yml`, `docs/runbooks/cloud-provisioning.md`. No per-change exploration (fast-forward, approved plan).

> **In one paragraph.** This change gives the owners a private admin panel where they load the real catalog that the public site (change 4) and enrollment (change 5) will read. It covers teachers; monthly workshops ("Talleres"), each with several **turnos** (weekday and time range); the month of each workshop as a first-class **period** with its own fee, capacity per turno, project and enabled materials; weekend workshops ("Intensivos") with a fixed deposit; and the materials catalog with variants, suppliers and images stored in Cloudflare R2. Each workshop and intensivo records its teacher with the agreed percentage, and each opened month keeps a snapshot of it. Login is Cloudflare Access with an email one-time PIN, plus an app-level admin allowlist; there are no passwords or user tables in the app. Until the domain is bought, Access protects the whole `workers.dev` preview; the app still verifies the Access identity and the allowlist on every `/admin` request and fails closed. BACK publishes a small contract PR first (module APIs, ports, in-memory fakes) so FRONT builds the admin screens in parallel.

---

## Intent

| Question | Answer |
|---|---|
| Problem | Nothing in the product is data-driven yet. The public Talleres and Intensivos pages, enrollment, renewals, attendance and metrics all need a catalog that the owners maintain themselves. The baseline promises a protected panel ("Los permisos de acceso protegen el panel mediante usuarios administradores y sesión privada"), and none exists. |
| Why now | Week 2 of the approved plan. Change 4 (public catalog) renders this data, and change 5 (monthly enrollment) claims seats per turno and orders materials against these periods and variants. The owners also need time to load real workshops, turnos, teachers and materials before launch. |
| Who it helps | The owners (Cami and Agus): one place to publish, pause and price activities each month and to offer more turnos so they fill more seats. Later changes: a stable catalog API. |
| Success looks like | An admin on the allowlist signs in with her email (one-time PIN). She creates a teacher, a monthly workshop with morning and evening turnos and its teacher's percentage, and opens October with "Abrir mes" (fee, capacity per turno, project, enabled materials, percentage snapshot). She also creates an intensivo with a fixed deposit, uploads images, and publishes or pauses each one. Every write records who made it. No unauthenticated or non-admin request can read or change admin data, which tests prove. |

---

## Scope

### In Scope

| # | Deliverable | Notes |
|---|---|---|
| 1 | **Admin identity** (Cloudflare Access + app allowlist) | Verification of the Access identity on every `/admin` request (loader and action), then the app's admin email allowlist (D1). Fail closed when configuration is missing, the token is invalid, or the email is not on the list. The admin actor (email) is passed into every use case, service-token identities are never treated as admins, "Salir" links to the Access logout endpoint, and a dev-only identity bypass exists that tests prove can never be active in production. |
| 2 | **Admin shell** | Desktop-first layout usable on a phone: sidebar ("Talleres", "Intensivos", "Profesores", "Materiales"), top bar with the signed-in email and "Salir", mobile navigation, `/admin` landing, Spanish (es-AR, voseo) copy, "No tenés acceso al panel" page, empty and error states, `noindex` and `Cache-Control: private, no-store` on every admin response. Reuses the change-2 tokens and `ui` element. |
| 3 | **Teachers** ("Profesores") | Create, edit, archive. Name, short bio line (shown publicly in change 4), contact (optional), modality "propia" or "de terceros", active flag. No percentage on the teacher record (D2). |
| 4 | **Monthly workshops** ("Talleres") | Create, edit, archive; publish and pause (D7). Name, slug, short and long description, technique or category, **teacher assignment with the agreed percentage** (D2, editable), default monthly fee, image. Lifecycle: draft, published, paused, archived. |
| 5 | **Turnos** (D3) | Each monthly workshop has one or more turnos, for example "Mañana", "Tarde" and "Noche" (the owners confirm the real times). Each turno has a label, weekday, time range, default capacity and an active flag. A turno can be retired without deleting its history. |
| 6 | **Periods** (workshop x month, first-class) | One period per workshop per month (`YYYY-MM`, Córdoba time), opened by the owner with "Abrir mes" (D8), prefilled from the previous month or, for the first month, from the workshop and turno defaults, then editable. Per period: fee, "materials required", status (draft, open, closed), one project (title, description, images) and a flat list of enabled materials (D4), a **capacity per active turno**, and a **snapshot of the teacher and agreed percentage** in force when the month was opened (D2). |
| 7 | **Weekend workshops** ("Intensivos") | Create, edit, archive; publish, pause (D7), reschedule (edit date) and cancel without deleting history. Name, slug, description, teacher assignment with the agreed percentage (D2), date and time range, price, **fixed deposit amount** (D6), capacity, minimum seats, cancellation and no-show policy (text plus a cancellation deadline in hours), "materials included" flag, image. |
| 8 | **Materials catalog** ("Materiales") | Create, edit, deactivate. Name, description, category or type, image, availability, **supplier** (D5), and one or more **variants** (label such as size or color, own price in ARS, optional swatch, availability). A material without options has one default variant. |
| 9 | **Suppliers** ("Proveedores", D5) | A supplier list managed inside Materiales: name, phone, email, notes; create, edit, archive. Each material points to one supplier. |
| 10 | **Image storage** (R2) | A `media` module behind an `ImageStorage` port with an R2 adapter: upload by admins only (JPEG, PNG, WebP checked by content, size limit), metadata row in Postgres, required alt text where the image is used, a read path that serves images through the Worker with long-lived cache headers. |
| 11 | **Migrations** | Forward-only Drizzle migrations, one per BACK slice, applied by CI to Neon `staging`. Neon `main` stays empty until launch. |
| 12 | **CI and runbook** | The `/status` smoke check authenticates through Access with a service token (two new GitHub secrets); the deploy gate lists them by name. Runbook sections for Access, the service token, the Access identifiers, the admin allowlist and the R2 bucket. ADR-0005 (admin access and media storage). |
| 13 | **Contract-first delivery** | First implementation PR: module `index.ts` APIs, types, ports and in-memory fakes (plus shared contract suites) so FRONT builds against fakes. |

### Out of Scope

| Item | Where it goes |
|---|---|
| Public Talleres and Intensivos pages from the database (including how turnos and the "Inscripciones pausadas" state render), seats shown publicly, dynamic Inicio sections, Event JSON-LD | Change 4 (public-catalog) |
| Enrollment per turno and period, materials cart, orders ("Pendiente de confirmación", "Cobrado", …), seat counters per turno and period and the atomic seat claim, payment registration, supplier consolidation and "Copiar resumen" | Change 5 (monthly-enrollment). Seats decrease only when payment is confirmed (standing adjustment). |
| Renewal links, transactional and reminder emails | Change 6 (renewals-and-email) |
| Students, class sessions per turno and attendance, make-ups, intensivo deposits as payments, private events, teacher settlements (which read the period snapshots) | Change 7 |
| Panel general (dashboard), metrics, teacher settlement amounts in the metrics view ("importe estimado a liquidar"), custom domain, re-scoping Access to `/admin` | Change 8 (metrics-reminders-launch) |
| In-panel user management, roles beyond "admin", passwords, 2FA in the app | Not planned: Access owns sign-in; preview viewers are managed in the Access policy and admins in the allowlist (runbook) |
| Full audit log viewer | Not planned; each record keeps "last changed by / at" |
| Image transformations (Cloudflare Images), video upload | Change 4 or 8 decides, with real photos |
| Stock quantities, cost versus sale price | Not in the baseline (availability is on/off) |
| WhatsApp Business API, payment gateway | Out by standing owner decisions |
| Editing site-content (history, FAQ, gallery) from the panel | Not planned in v1 (change-2 D1) |

---

## Capabilities

`openspec/specs/` does not exist yet (platform-foundation and design-system-and-public-site are not archived). Modified capabilities therefore name the platform-foundation change specs; each becomes a delta spec in this change.

**Turnos are folded into `monthly-workshops` and `workshop-periods`, with no separate `workshop-turnos` capability.** A turno has no life of its own: it belongs to one workshop, is created and retired in the workshop form, and its monthly capacity exists only inside a period. Its definition rules (weekday, time range, default capacity, retirement) belong with the workshop aggregate. Its monthly rules (capacity per turno, which turnos a month offers, copying from the previous month) belong with the period. A separate capability would split one aggregate's invariants across three specs and duplicate the period scenarios. The teacher assignment and percentage follow the same reasoning: they live in `monthly-workshops` and `intensive-workshops` (the assignment) and in `workshop-periods` (the snapshot), not in `teachers`.

### New Capabilities

- `admin-access`: Access identity verification on every admin loader and action, the app admin allowlist (D1), fail-closed rules, service-token denial, actor propagation into use cases, same-origin rule for admin mutations, sign-out, the dev-only bypass and its production prohibition.
- `admin-shell`: admin layout, navigation entries and order, route areas, landing, access-denied page, empty and error states, response headers (`noindex`, `private, no-store`), es-AR voseo copy rules (no "workshop" in UI copy), phone usability.
- `teachers`: teacher record, modality, archive rule, uniqueness and validation (no percentage here).
- `monthly-workshops`: workshop record, teacher assignment with an editable agreed percentage (D2), **turnos** (label, weekday, time range, default capacity, retirement; at least one active turno to publish) (D3), default fee, lifecycle (draft, published, paused, archived) and its transitions, the meaning of "paused" (visible, no new requests; D7), slug rules, archive instead of delete.
- `workshop-periods`: period identity (workshop x `YYYY-MM`), "Abrir mes" and its prefill rules (D8), fee per period, **capacity per turno per period**, period status, "materials required", the single monthly project and its enabled materials (D4), the teacher and percentage snapshot (D2).
- `intensive-workshops`: intensivo record, teacher assignment with an editable agreed percentage (D2), price and fixed deposit (D6), capacity and minimum seats, policy fields, lifecycle including pause (D7), reschedule and cancel, archive instead of delete.
- `materials-catalog`: material, variants with own price, availability, deactivation, category, the supplier list and each material's supplier (D5).
- `media-storage`: image upload rules (types by content, size), storage port and R2 adapter, metadata, alt text, serving and caching, admin-only writes.

### Modified Capabilities

- `delivery-pipeline` (platform-foundation): the deploy smoke check MUST authenticate through Access with a service token; the deploy gate MUST include the two Access secrets by name; the deploy MUST never pass the dev identity bypass.
- `system-status` (platform-foundation, "Deployed endpoint"): while the preview runs on `workers.dev`, `/status` is reachable only through Access (browser session or service token); behavior behind Access is unchanged.

`runtime-configuration` keeps its requirements: the new variables (including the admin allowlist) follow "Single validation schema" and "Fail fast with names only", and the variable list belongs to design (same reading as change 2).

---

## Owner decisions recorded (decided)

| ID | Decision | Date |
|---|---|---|
| AD1 | Admin sign-in uses **Cloudflare Access** with email one-time PIN managed by Cloudflare. | 2026-10-07 |
| AD2 | On `workers.dev`, Access protects the **whole Worker URL**. Until the domain is bought (change 8) the whole preview is private; the owner, client and studio emails go in the Access policy. At launch, Access is re-scoped to `/admin` on the custom domain. | 2026-10-07 |
| AD3 | The CI smoke check of `/status` uses an **Access service token**: two more GitHub secrets, provisioned by the owner. | 2026-10-07 |
| AD4 | The app **still validates** the Access identity on every `/admin` route (the `Cf-Access-Jwt-Assertion` JWT against the team's keys and audience, or a runtime-provided Access identity; design picks one) for defense in depth. | 2026-10-07 |
| AD5 | A **dev-only identity bypass** exists for local work and tests and can never be active in production, proved by tests. | 2026-10-07 |
| AD6 | **Agents never touch credentials.** The owner configures Access, the service token, the secrets, the allowlist values and the R2 bucket from the runbook. | 2026-10-07 |
| AD7 | Delivery: two orchestrators in parallel (BACK Claude Code, FRONT pi), contract PR first, backend merges first, stacked PRs to `main`, standing `size:exception` policy for test-driven overage. | 2026-10-05 / owner-confirmed |
| D1 | **(b)** The app keeps its own **admin email allowlist**, checked after Cloudflare Access. The Access policy covers preview viewers; the app list covers admins. | 2026-10-07 |
| D2 | The agreed percentage lives **per teacher per activity**: on each workshop's and each intensivo's teacher assignment, editable. There is **no teacher-level default**. Each opened month (period) **snapshots** the percentage in force, so a renegotiated percentage applies from that month on and past months keep theirs. Owner's words: "Cada profe tiene un % acordado por cada taller que se dicta, si se acuerda otro porcentaje, se tendría que ver reflejado". The snapshot rule is an assumption to confirm in change 7 (see Assumptions). | 2026-10-07 |
| D3 | **(b)** A monthly workshop has **several turnos** (morning, afternoon, evening; times to be confirmed). Each turno has its own weekday, time range and **capacity per month**. Goal: fill as many seats as possible. The cost of about 400-600 more lines across changes 3, 5 and 7 is accepted. | 2026-10-07 |
| D4 | **(a)** **One project per month**: description, images and a flat list of enabled materials, copied from the previous month and editable. | 2026-10-07 |
| D5 | **(a)** A **supplier list** (name, phone, email, notes) managed in Materiales; each material points to one supplier. | 2026-10-07 |
| D6 | **(a)** A **fixed deposit (seña) amount** per intensivo. | 2026-10-07 |
| D7 | **(a)** A **paused** activity stays visible on the public site with "Inscripciones pausadas" and a WhatsApp link, and takes no new requests. Public rendering is change 4; this change stores the state. | 2026-10-07 |
| D8 | **(a)** The owner opens each month with **"Abrir mes"** per workshop, prefilled from the previous month (fee, capacity per turno, project, materials, teacher and percentage) and editable. | 2026-10-07 |

---

## Approach

### 1. Modules (screaming, hexagonal, same pattern as `system-status`)

| Module | Responsibility | Key aggregates | Ports (application) | Depends on (module API only) |
|---|---|---|---|---|
| `admin-access` | Turn a request's Access evidence into an `AdminActor` or a denial; the admin allowlist (D1); dev bypass | `AdminActor` | `AccessIdentityVerifier` (JWT or runtime identity), `AccessKeySource` (team keys, cached per isolate) | none |
| `media` | Image upload rules, storage, metadata, read for serving | `MediaAsset` | `ImageStorage` (R2 adapter), `MediaAssetRepository` | none |
| `teachers` | Profesores | `Teacher` | `TeacherRepository` | none |
| `workshops` | Talleres with their turnos and teacher assignment, periods ("Abrir mes", capacity per turno, project, offers, percentage snapshot), Intensivos, publish/pause lifecycle | `MonthlyWorkshop` (owns `Turno` and the assignment), `WorkshopPeriod` (owns turno capacities, offers and the snapshot), `IntensiveWorkshop` | repositories per aggregate | `teachers`, `materials`, `media` |
| `materials` | Materials, variants, suppliers | `Material`, `Supplier` | `MaterialRepository`, `SupplierRepository` | `media` |

- Use cases take an `AdminActor` as their first argument for every write and every admin read, so authorization is enforced inside the application layer, not only in routing (exploration I14). Writes record `updated_by` and `updated_at`.
- Money uses the existing `_shared` `Money` (ARS); periods use a `YYYY-MM` value interpreted in `America/Argentina/Cordoba` through the `Clock` port (exploration I16). Percentages are stored as an exact value (for example basis points) so the period snapshot never drifts.
- **"Abrir mes"** is one application use case: it creates the period with the previous month's fee, project, enabled materials and turno capacities (or the workshop and turno defaults for the first month). It takes the teacher and percentage from the workshop's current assignment. Turnos added since the previous month get their default capacity; retired turnos are left out. Everything stays editable while the period is not closed.
- Each repository port gets a shared contract suite run against the in-memory fake (unit) and the Drizzle adapter (`*.db.test.ts` on embedded PostgreSQL), as `database-probe.contract.ts` does today.
- Whether `workshops` splits into `monthly-workshops` and `intensive-workshops` is a design choice. The proposal keeps one module because both share the teacher assignment, images and the publish/pause lifecycle.
- No new runtime package is expected: JWT verification uses WebCrypto and the R2 adapter uses the Worker binding. If design needs a JOSE library, it changes the package allowlist in `eslint.config.ts` and records it in ADR-0005.

### 2. Data model sketch (design finalizes names, types and indexes)

| Table | Key fields | Constraints |
|---|---|---|
| `teacher` | name, bio_line, phone?, email?, modality (`own`, `third_party`), active, updated_by, updated_at | no percentage (D2) |
| `media_asset` | id, storage_key, content_type, bytes, width?, height?, created_by, created_at | key unique |
| `monthly_workshop` | slug, name, summary, description, technique, **teacher_id, agreed_percentage** (the assignment, D2), default_fee, image_id?, status, updated_by, updated_at | status in (`draft`, `published`, `paused`, `archived`); slug unique; percentage 0-100 |
| `workshop_turno` (D3) | workshop_id, label ("Mañana", "Tarde", "Noche" or free text), weekday, starts_at, ends_at, default_capacity, active, sort | ends_at > starts_at; default_capacity > 0; label unique per workshop; retired, never deleted once used |
| `workshop_period` | workshop_id, period (`YYYY-MM`), fee, materials_required, project_title?, project_description?, **teacher_id, agreed_percentage (snapshot, D2)**, status, opened_by, opened_at, updated_by, updated_at | UNIQUE (workshop_id, period); status in (`draft`, `open`, `closed`) |
| `period_turno` (D3) | period_id, turno_id, capacity | UNIQUE (period_id, turno_id); capacity > 0; the turno belongs to the period's workshop |
| `period_project_image` (D4) | period_id, media_asset_id, sort | one project per period, several images |
| `period_material_offer` (D4) | period_id, material_id, sort | UNIQUE (period_id, material_id); a flat list per period, shared by all its turnos |
| `intensive_workshop` | slug, name, summary, description, **teacher_id, agreed_percentage** (D2), starts_at, ends_at, price, **deposit (fixed amount, D6)**, capacity, min_seats, cancel_deadline_hours, policy_text, materials_included, image_id?, status, updated_by, updated_at | 0 < deposit <= price; min_seats <= capacity; status in (`draft`, `published`, `paused`, `cancelled`, `archived`) |
| `supplier` (D5) | name, phone?, email?, notes?, active | name unique among active suppliers |
| `material` | name, description, category, **supplier_id** (D5), image_id?, available, active, updated_by, updated_at | |
| `material_variant` | material_id, label, price, swatch?, available, sort | at least one per material (application rule) |

- Seat counters (`confirmed_seats`) arrive with enrollment in change 5 on `period_turno` (one counter per turno per month, with the CHECK against its capacity), so this change adds no column it cannot exercise.
- An intensivo has a single capacity: it has no turnos (assumption below).
- Money columns are integers (`Money` representation); instants are UTC; the period key is a validated `YYYY-MM` string; turno times are local Córdoba wall-clock times.
- Migrations, numbered by merge order, one per BACK slice: `0001_media_assets`, `0002_teachers`, `0003_monthly_workshops`, `0004_workshop_turnos`, `0005_workshop_periods` (periods, `period_turno`, project images), `0006_intensive_workshops`, `0007_materials` (suppliers, materials, variants), `0008_period_material_offers`. All are additive and forward-only (database-harness spec).
- Where table definitions live is a design item. `src/platform/db/schema.ts` cannot import module code under the dependency rule, so design chooses between platform-owned table files and a drizzle-kit config that reads module infrastructure files.

### 3. Admin shell and route areas (FRONT, `src/app/**`)

| Area | Routes (es-AR paths) | Screens |
|---|---|---|
| Landing | `/admin` | Greeting with the signed-in email and shortcuts (the Panel general dashboard is change 8) |
| Talleres | `/admin/talleres`, `/admin/talleres/nuevo`, `/admin/talleres/:id` | List with status filter; form with teacher and agreed percentage; publish, pause, archive |
| Turnos | `/admin/talleres/:id/turnos` (or a section of the workshop form; design decides) | Add, edit and retire turnos: label, weekday, time range, default capacity |
| Períodos | `/admin/talleres/:id/periodos`, `/admin/talleres/:id/periodos/:periodo` | Months of a workshop, "Abrir mes", fee, capacity per turno, status, project with images, "Materiales del mes", the teacher and percentage snapshot |
| Intensivos | `/admin/intensivos`, `/admin/intensivos/nuevo`, `/admin/intensivos/:id` | List; form with teacher, percentage, price and fixed deposit; publish, pause, reschedule, cancel, archive |
| Profesores | `/admin/profesores`, `/admin/profesores/nuevo`, `/admin/profesores/:id` | List, form, archive |
| Materiales | `/admin/materiales`, `/admin/materiales/nuevo`, `/admin/materiales/:id` | Catalog grid or table, form with variants editor, image and supplier |
| Proveedores | `/admin/materiales/proveedores` (+ `nuevo`, `:id`) | Supplier list and form |
| Images | a resource route such as `/imagenes/:id` (design names it) | Serves stored images; outside `/admin` so change 4 can reuse it |

- Admin routes sit outside the change-2 public layout (their own layout route and error boundary). Presentational admin components live in the `ui` element (for example `src/app/ui/admin/**`): Sidebar, AdminTopBar, DataTable, form fields (text, textarea, select, number, money, percentage, time, toggle, image), StatusBadge, ConfirmDialog, a repeatable rows editor (turnos, variants, turno capacities). Mockups use right-side drawers; design chooses drawers or full pages (phones get full-screen forms either way).
- The sidebar shows only the areas this change delivers. Later changes add "Alumnas", "Inscripciones", "Eventos privados", "Recordatorios" and "Métricas" as they ship (no dead entries).
- Copy is es-AR with voseo, "Talleres", "Intensivos" and "Turnos", never "workshop" (change-2 A1). The change-2 `findCopyViolations` rule also scans admin microcopy.

### 4. Access integration

```
Browser ──► Cloudflare Access (whole workers.dev host; email OTP; policy: owner, client, studio emails + CI service token)
              │ adds Cf-Access-Jwt-Assertion
              ▼
Worker app.ts ── readWorkerEnv ── path starts with /admin?
              │      yes ─► composition: admin-access verifies identity, then the admin allowlist (D1)
              │               ├─ denied: 403 "No tenés acceso al panel"
              │               └─ AdminActor into router context
              ▼
React Router ── admin layout middleware (reads the actor; runs before every admin loader and action)
              └► use cases require AdminActor (second, independent check)
```

- **Verification** (design picks the mechanism, AD4): either validate the `Cf-Access-Jwt-Assertion` JWT, or use a runtime-provided Access identity if design verifies one exists on `workers.dev`. JWT validation means an RS256 signature against the team's published keys, `aud` containing the configured application audience, `iss` equal to the team domain, `exp` and `nbf` checked through the `Clock` port, and an `email` claim present. Keys are cached per isolate and refetched on an unknown key id.
- **Admin allowlist** (D1): after a valid identity, the email (normalized to lowercase) must be on the configured admin list. A preview viewer who passes Access but is not on the list gets "No tenés acceso al panel"; the public pages stay reachable for them.
- **Layers of defense**: the Worker gate for every `/admin` path (independent of FRONT route code), the admin layout middleware (React Router middleware runs before child actions, unlike a parent loader), and the actor parameter on use cases. Admin mutations also require a same-origin `Origin` header.
- **Fail closed**: `/admin` is denied when the Access configuration or the admin list is missing or empty, the header is missing, the signature is bad, the audience is wrong, the token is expired, the identity is a service token (no email), or the email is not on the list. Turning Access off by mistake therefore locks the panel instead of opening it.
- **Configuration** (non-secret, validated by `src/platform/env.ts`, names only in errors): the Access team domain, the application audience tag, the admin email list and the dev identity. Design chooses the transport (GitHub Actions variables passed with `--var`, or committed values); the owner provides the values from the runbook.
- **Dev bypass** (AD5): a dev identity is honored only when the configured site URL is `http://localhost…` and the build mode is development. The env schema rejects a dev identity next to any non-localhost site URL, so a misconfigured Worker refuses to start (500, names-only log). CI never passes it, and workflow tests assert that. Unit tests use an in-memory `AccessIdentityVerifier`.
- **Sign-out**: "Salir" links to `/cdn-cgi/access/logout`.
- **CI**: the smoke check sends `CF-Access-Client-Id` and `CF-Access-Client-Secret` from the two new secrets; values are never echoed (existing no-echo test pattern).

### 5. Image storage

- Upload goes through the Worker (multipart form to an admin action, streamed to the R2 binding). Design confirms the limits; the proposal is 5 MB and JPEG, PNG or WebP, detected from the file's first bytes, not from the name.
- Object keys are content-addressed or random and never reused, so the serving route can send `Cache-Control: public, max-age=31536000, immutable`.
- The R2 binding (for example `MEDIA`) is declared in `wrangler.jsonc`; local development uses Wrangler's local R2 simulation. Tests use an in-memory `ImageStorage` fake and the shared contract suite.
- Images serve workshops, intensivos, the monthly project (several per period) and materials.
- Unused objects are not deleted automatically in v1 (low volume, R2 free tier).

### 6. Delivery and tests

- Strict TDD on domain and application rules: lifecycle transitions, publish needs at least one active turno, turno time range and weekday, capacity per turno, "Abrir mes" prefill and snapshot, deposit between 0 and price, period key, percentage range, variant rules, upload checks, JWT checks with locally generated keys, the allowlist, and the dev-bypass prohibition.
- Integration tests run per Drizzle adapter on embedded PostgreSQL. UI tests run in the `ui` project with axe for every admin screen. There is no end-to-end runner yet (Playwright arrives in change 5).
- BACK owns `src/modules/**`, `src/platform/**`, `src/composition/**`, `src/testing/**` (except FRONT fixtures), `workers/**`, `drizzle/**`, `wrangler.jsonc`, CI, `docs/adr/**` and `docs/runbooks/**`. FRONT owns `src/app/**` (admin routes and `ui/admin`) plus its carve-outs from change 2.
- The contract PR extends `AppServices` with the new services. Until a module's Drizzle adapter merges, composition wires a placeholder that fails closed: admin screens for that area answer "en construcción" with status 503. FRONT therefore merges only after its BACK counterpart, as the merge rule requires.

### Baseline deviations (scope adjustments to `docs/client-proposal/proposal.md`)

| # | Baseline says | This change does | Source |
|---|---|---|---|
| A1 | "Permisos de acceso ... mediante usuarios administradores y sesión privada" | Cloudflare Access email one-time PIN plus an app admin allowlist; no app-managed users or passwords; viewers are managed in the Access policy and admins in the allowlist (runbook), not in the panel | AD1, D1 |
| A2 | "Web pública" | The whole `workers.dev` preview is private (Access) until launch; public again on the custom domain in change 8 | AD2 |
| A3 | Module "Talleres y workshops" | Two areas: "Talleres" (monthly) and "Intensivos" (weekend); UI copy never says "workshop" | Change-2 A1, owner decision #226 |
| A4 | Talleres: "días, horarios ... cupo máximo"; "Cuota mensual por período" | A workshop has several **turnos** (each with its own weekday, time range and capacity). Fee lives on the **period** (workshop x month) and capacity on the **period's turno**, prefilled by "Abrir mes" | D3, D8, owner decision #198 |
| A5 | Materiales: "Catálogo por taller con imagen, descripción, precio y disponibilidad" | One shared catalog with **variants** (own price per variant), enabled per workshop **period** through one monthly project instead of fixed per workshop | Mockup image19, D4, owner decision #198 |
| A6 | Profesores: "porcentaje acordado" in the Profesores module | The percentage lives on each workshop's and intensivo's teacher assignment (per teacher per activity, no teacher default), and each opened month snapshots it | D2 |
| A7 | Profesores: "importe estimado a liquidar" | Deferred: settlements in change 7 (they read the period snapshot) and the metrics view in change 8 | Roadmap, D2 |
| A8 | Talleres y workshops: "contador disponible" | This change stores capacity per turno per month only; the available-seats counter arrives with confirmed payments in change 5 | Roadmap, standing adjustment |
| A9 | Panel general | Deferred to change 8; `/admin` is a simple landing | Roadmap |
| A10 | "Alta, edición, baja" | "Baja" archives (soft) and keeps history; no hard delete of published or used records, turnos included | Baseline "sin eliminarlos del historial", exploration I8 |
| A11 | Proveedor appears only in consolidation | A supplier list on materials now; consolidation in change 5 | Mockup image17, D5 |
| A12 | Intensivos: "precio, seña ... condiciones de cancelación" | Deposit is a fixed amount per intensivo; conditions are stored as policy text plus minimum seats and a cancellation deadline in hours; public display in change 4 | D6, mockup image8, exploration I9 |
| A13 | Mockup admin copy mixes "tú" and voseo | Admin copy uses voseo throughout | Exploration Q7, change-2 A9 |
| A14 | Not in baseline | Each record keeps "last changed by / at" (actor email) | Exploration I14 |
| A15 | "Las actividades publicadas ... pueden pausarse cuando no deban recibir nuevas solicitudes" | Clarified: a paused activity stays visible with "Inscripciones pausadas" and a WhatsApp link (rendered in change 4) | D7 |
| Standing | WhatsApp Business API; payment gateway | Out; email notifications from change 6; `wa.me` links stay; manual transfers verified by the owner; seats decrease only when payment is confirmed (change 5) | Owner (config.yaml) |

### `config.yaml` open-decision checklist

| Decision | Status for this change |
|---|---|
| Tech stack | Settled (ADR-001). Adds Cloudflare Access (Zero Trust Free) and R2. No new runtime package expected (see Approach 1). |
| UI copy language | Settled: es-AR with voseo, admin included. |
| Email provider | Not used here (change 6, Resend). |
| Hosting and domain | `workers.dev`, private behind Access until change 8 buys the domain and re-scopes Access to `/admin`. |
| Version control | Settled (private GitHub repo, CI, stacked PRs to `main`). |
| Mockup asset handling | Admin mockups (images 11, 14, 17, 18, 19) are visual references only. No mockup data (names, prices, schedules) is seeded or imported; the owners load real data, including the real turno times. No mockup image is shipped. |

---

## Open product decisions

None open. D1-D8 were answered by the owner on 2026-10-07 and are recorded in "Owner decisions recorded". Every capability can proceed to specs.

### Assumptions to confirm (not blocking this change)

| # | Assumption | Confirm in |
|---|---|---|
| S1 | **Percentage snapshot rule (D2):** "Abrir mes" copies the teacher and agreed percentage from the workshop's current assignment into the period. A renegotiated percentage changes the assignment and applies from the next opened month; past months keep their snapshot. The snapshot of a month that is still open stays editable until the period closes. | Change 7 (settlements) |
| S2 | One teacher per workshop teaches all its turnos, so the assignment and percentage live on the workshop. If the owners later say different turnos have different teachers, the assignment moves to the turno; the design keeps it isolated so that move is local. | Spec review |
| S3 | The monthly fee is the same for every turno of a workshop in a given month; only capacity varies per turno. | Spec review |
| S4 | The monthly project and its enabled materials apply to every turno of the workshop in that month. | Spec review |
| S5 | Turno labels and times are free data loaded by the owners ("Mañana", "Tarde", "Noche" are suggested labels; the times are not confirmed yet). | Owners, during data load |
| S6 | "Modalidad propia" means the owners teach the workshop (no settlement); "de terceros" means an external teacher with an agreed percentage. | Change 7 |
| S7 | An intensivo is a single date with a start and end time, with one capacity and no turnos. | Spec review |
| S8 | Material availability is an on/off flag without stock counts. | Spec review |

---

## Owner runbook additions (`docs/runbooks/cloud-provisioning.md`, written by BACK in B1 and B2; executed only by the owner)

| Step | Action | Check |
|---|---|---|
| Z1 | Cloudflare Zero Trust: create the organization (team name, so the team domain is `<team>.cloudflareaccess.com`) on the Free plan (up to 50 users). Keep the default One-time PIN login method. | Zero Trust dashboard opens; Settings shows the team domain. |
| Z2 | Create the service token `calma-inquieta-ci` (Access, Service credentials) with a 12-month duration and a calendar reminder. Copy the Client ID and Client Secret into the password manager (the secret is shown once). | Token listed with its expiry. |
| Z3 | `gh secret set CF_ACCESS_CLIENT_ID` and `gh secret set CF_ACCESS_CLIENT_SECRET` (paste at the prompt). Names are final in design. | `gh secret list` shows seven names. |
| Z4 | Enable Access on the Worker's `workers.dev` route (Workers & Pages, `calma-inquieta`, Settings, Domains & Routes, `workers.dev`, enable Cloudflare Access). Then edit the created application: policy "Equipo" (Allow; include the owner, client, studio and any preview-viewer emails), policy "CI" (Service Auth; include the service token), and the session duration (proposed 24 hours). Copy the Application Audience (AUD) tag. | A private window asks for an email and sends a PIN; after it, the site loads. |
| Z5 | Provide the non-secret Access identifiers (team domain, AUD tag) and the **admin email allowlist** (D1: only the people who administer the catalog) by the transport design chooses (proposed: `gh variable set`). | The next deploy succeeds; `/admin` shows the panel with your email; a preview viewer who is not on the list sees "No tenés acceso al panel". |
| R1 | R2: create the bucket `calma-inquieta-media` (no public access, no custom domain). If the next deploy fails with an authentication error, add Account / Workers R2 Storage / Edit to the CI token (same fallback style as C3). | `wrangler deploy` output lists the `MEDIA` binding. |
| V1 | Verify the smoke path: CI's smoke step passes; a request to `/status` without the token is redirected to the Access login. | Deploy job green. |
| Ops | Revoke a preview viewer: remove the email from the Access policy. Revoke an admin: remove the email from the allowlist (and from the policy if they should not see the preview). Rotate the service token yearly: create a new one, update both secrets, delete the old one. Emergency: disabling Access exposes the public pages but `/admin` stays denied (fail closed). | |
| Launch (change 8) | Re-scope Access to `/admin` on the custom domain; decide whether `workers.dev` stays on. | |

Order matters: Z2 and Z3 must be done before the B1 PR merges, because the deploy gate requires the two names. Z4 can follow at any time, because the smoke check sends the headers whether or not Access is on. Until Z5, `/admin` denies everyone, which is the safe state.

---

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/modules/{admin-access,media,teachers,workshops,materials}/**` (+ tests) | New | Domain, application, ports, Drizzle and R2 adapters, `index.ts` APIs |
| `src/composition/request-services.ts`, `request-services.db.test.ts` | Modified | New services in `AppServices`, adapter wiring, placeholders until adapters land, actor resolution for the Worker gate |
| `src/platform/env.ts` (+ test), `.dev.vars.example`, `wrangler.jsonc` | Modified | Access identifiers, admin allowlist, dev identity rule, R2 binding |
| `src/platform/db/**`, `drizzle/**`, `drizzle.config.ts` | Modified / New | Table definitions location, migrations `0001`-`0008` |
| `workers/app.ts` | Modified | `/admin` gate before the router, actor in context |
| `src/testing/fakes/**`, `src/testing/contracts/**` | New | In-memory fakes and shared contract suites (contract PR) |
| `src/app/routes.ts`, `src/app/routes/admin/**`, `src/app/ui/admin/**` (+ tests) | New / Modified | Admin layout, middleware, screens, image route (FRONT) |
| `.github/workflows/ci.yml`, `tooling/deploy-workflow.test.ts` | Modified | Service-token smoke check, gate names, no-bypass assertion |
| `eslint.config.ts`, `tooling/architecture/architecture.test.ts` | Modified (only if needed) | Package allowlist if design adds a JOSE library; rows for cross-module imports |
| `docs/adr/0005-admin-access-and-media.md`, `docs/runbooks/cloud-provisioning.md`, `AGENTS.md`, `README.md` | New / Modified | ADR, runbook sections Z1-Z5 and R1, dev bypass usage |

---

## Delivery forecast

Authored additions plus deletions; lockfile, generated types and binaries excluded. Fakes and contract suites count as test lines.

| PR | Owner | Content | Needs (merged) | Production | Tests |
|---|---|---|---|---|---|
| P0 | BACK | Planning artifacts (proposal, specs, design, tasks) | — | 0 (docs about 1,900-2,500) | 0 |
| **B0** | BACK | **Contract**: five module `index.ts` APIs, domain types (turnos, assignment, snapshot included), ports, use-case signatures, `AppServices` with fail-closed placeholders, in-memory fakes, shared contract suites | P0 | 240-320 | 240-340 |
| B1 | BACK | `admin-access`: verifier, key cache, admin allowlist, dev bypass and env rules, Worker gate, CI smoke with service token, workflow tests, ADR-0005, runbook Z1-Z5 | B0 | 180-260 (+ docs 150-220) | 280-380 |
| B2 | BACK | `media`: upload rules, `ImageStorage`, R2 adapter, `media_asset` + migration, binding, runbook R1 | B0 | 180-250 | 180-250 |
| B3 | BACK | `teachers` + migration | B0 | 140-200 | 160-220 |
| B4 | BACK | Monthly workshops, teacher assignment with percentage, lifecycle + migration | B3 | 240-320 | 220-300 |
| B5 | BACK | Turnos (definition, retirement, publish needs an active turno) + migration | B4 | 150-220 | 160-220 |
| B6 | BACK | Periods: "Abrir mes", capacity per turno, project and images, percentage snapshot + migration | B5, B2 | 260-360 | 240-320 |
| B7 | BACK | Intensivos with assignment, fixed deposit, lifecycle + migration | B3 | 220-300 | 200-270 |
| B8 | BACK | Materials, variants, suppliers + migration (split: suppliers to B8b if over 400) | B2 | 300-400 | 260-340 |
| B9 | BACK | Period material offers + migration; "Abrir mes" copies them | B6, B8 | 120-180 | 120-180 |
| F0 | FRONT | Admin shell, layout middleware, landing, access-denied page, admin form atoms (split: form atoms to F0b if over 400) | B1 | 320-400 | 220-300 |
| F1 | FRONT | Image field and image resource route | B2, F0 | 120-180 | 100-150 |
| F2 | FRONT | Profesores | B3, F0 | 160-230 | 140-190 |
| F3 | FRONT | Talleres with teacher and percentage (split: lifecycle actions to F3b if over 400) | B4, F1, F2 | 300-400 | 220-290 |
| F4 | FRONT | Turnos editor | B5, F3 | 150-220 | 120-170 |
| F5 | FRONT | Períodos: "Abrir mes", capacity per turno, project, snapshot | B6, F4 | 260-360 | 200-260 |
| F6 | FRONT | Intensivos with fixed deposit | B7, F3 | 240-330 | 180-250 |
| F7 | FRONT | Materiales with variants editor and supplier select | B8, F1 | 300-400 | 220-300 |
| F8 | FRONT | Proveedores | B8, F0 | 120-180 | 100-140 |
| F9 | FRONT | Materiales del mes | B9, F5, F7 | 140-200 | 110-160 |
| **Total** | | | | **about 4,140-5,710 + docs 150-220** | **about 3,670-5,030** |

About 8,000-11,000 authored lines across 20 implementation PRs, plus P0 and the archive PR. Compared with revision 1, that is about 510-730 more production lines and 450-600 more test lines, mostly from turnos (B5, F4, and the per-turno parts of B6 and F5), the percentage snapshot, and Proveedores as its own slice.

```
BACK:  P0 ─► B0 (contract) ─► B1, B2, B3 (any order) ─► B4 (after B3) ─► B5 (after B4) ─► B6 (after B5 and B2)
                                                      ─► B7 (after B3)
                                                      ─► B8 (after B2) ─► B9 (after B6 and B8)
FRONT: F0 (B1) ─► F1 (B2) ─► F2 (B3) ─► F3 (B4) ─► F4 (B5) ─► F5 (B6) ─► F6 (B7) ─► F7 (B8) ─► F8 (B8) ─► F9 (B9)
```

FRONT develops every slice against the B0 fakes as soon as B0 merges, and works through the slices in the order shown. Each FRONT PR merges only after the BACK PR named in brackets. The table's "Needs" column lists the hard dependencies.

- Guard lines for `sdd-tasks`: `Decision needed before apply: No` (stacked-to-main is owner-confirmed, the size policy stands, and D1-D8 are decided), `Chained PRs recommended: Yes`, `400-line budget risk: High`.
- Every production slice is forecast at or under 400 lines; test-driven overage ships as `size:exception` without asking. Ask the owner only if a slice's production lines alone pass 400 after its split rule (B8, F0, F3 and F7 sit closest to the line).
- The total is larger than change 2 and shares week 2 with change 4. Descoping order if the week runs short, keeping every owner decision intact: the separate "Materiales del mes" screen (F9 becomes a multi-select inside the period form), the intensivo cancellation-deadline field (policy text only), project images per period (text only first), then workshop and intensivo images (materials images first). Descoping a decided item (turnos, suppliers, the snapshot, the allowlist) needs the owner's approval first.

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Schedule: about 8,000-11,000 lines in a week that also holds change 4 | High | Contract-first parallel work, stacked slices that each deploy, descoping order above |
| Turnos cost more than the accepted 400-600 lines: this change alone adds about 300-440 production lines for turnos (plus tests), before changes 5 and 7 add seats and attendance per turno | Medium | Report the running turno cost in each PR body; tell the owner when change 5 is planned if the accepted figure is exceeded |
| Seat and enrollment contract for change 5: seats are now per turno per month, so the enrollment uniqueness and seat claim key on (turno, period), not (workshop, period) | Medium | B0 fixes `period_turno` as the capacity owner and documents it in the module API; change 5's proposal starts from it |
| The percentage snapshot rule (S1) is wrong for how settlements are actually paid | Medium | Snapshot stored separately from the assignment and editable while the month is open; confirm in change 7 before settlements read it |
| Different teachers per turno (S2) appear after data load | Low-Med | Assignment isolated in one place so it can move to the turno with a small migration |
| A flaw in identity verification lets a request into `/admin` (wrong audience, issuer, algorithm, expiry, service token treated as a person, email not on the allowlist) | Medium (high impact) | Three independent layers (Worker gate, route middleware, use-case actor); table-driven tests with locally generated keys for every rejection case; fail closed on missing configuration or an empty allowlist |
| Allowlist misconfiguration locks out the owners (typo, wrong case) | Low-Med | Emails normalized to lowercase; the access-denied page shows the signed-in email so the mismatch is visible; the runbook check in Z5 |
| The dev bypass becomes active in production | Low (high impact) | Env schema rejects it next to a non-localhost site URL (Worker refuses to start); CI never passes it; workflow and env tests prove both |
| Deploy gate sequencing: B1 requires the two new secrets | Medium | Runbook order (Z2, Z3 before B1 merges); the gate fails by name, never by value |
| Access on `workers.dev` behaves differently than assumed (static assets, the enable toggle, Zero Trust Free sign-up needing a payment method) | Medium | Design and the owner verify before B1; the app gate is safe either way |
| Cross-site request forgery on admin forms through the Access cookie | Low-Med | Same-origin `Origin` check on every admin mutation; no state change on GET |
| Malicious or oversized uploads | Low | Admin-only, type checked by content, size limit, served with a fixed content type and `X-Content-Type-Options: nosniff` |
| Contract drift between B0 and later BACK slices breaks FRONT work | Medium | Contract suites run against fakes and Drizzle adapters; contract changes go through a small BACK PR; FRONT rebases before each slice |
| Migration ordering conflicts between stacked BACK slices (eight migrations) | Medium | One BACK writer, migrations numbered at merge, `drizzle-kit` check in CI |
| Private preview slows client review (OTP per device, Lighthouse and share previews cannot reach the URL) | Medium | Reviewers' emails in the policy; Lighthouse from a logged-in Chrome DevTools session; share previews checked at launch |
| Test suite time grows with database tests | Medium | Contract suites keep DB tests to one file per adapter; measure per PR |
| Real catalog data, including turno times, arrives late | Medium | Owners load data after the change; no mockup data is seeded |
| Two owners edit the same record at once | Low | Last write wins with "last changed by / at" visible; design may add a version check |

---

## Rollback Plan

- **Per PR.** Each slice is one PR. Revert with `git revert <merge-commit>` on `main`; CI redeploys. Revert FRONT slices before the BACK slice they depend on (dependency graph above).
- **Database.** Migrations are additive and forward-only. To remove a table, ship a new migration that drops it (Neon `staging` holds only test data; Neon `main` has no tables until launch). Never edit an applied migration. A reverted Worker version simply ignores the extra tables. If S2 later moves the assignment to the turno, that is a new forward migration, not an edit.
- **Worker.** For a broken deploy, `wrangler rollback` (owner credentials), then revert the PR.
- **Access.** Lockout or a wrong policy: the owner edits the policy in the Zero Trust dashboard or fixes the allowlist value and redeploys. Emergency: disable Access on `workers.dev`; the public pages become reachable and `/admin` stays denied because the app gate fails closed. Smoke check failing on the token: rotate the token and update both secrets.
- **Dev bypass misconfiguration.** The Worker refuses to start with a names-only error; remove the variable and redeploy.
- **R2.** Reverting the media slice removes the binding and the routes; the bucket and its objects stay and can be deleted from the dashboard. Records that referenced images keep a dangling id that the UI shows as "sin imagen".

---

## Dependencies

- Change 2 B1 merged (the `ui` element, UI test harness, env pattern). F0 also needs the change-2 tokens and atoms (F0 and F1 of change 2) on `main`.
- Owner runbook steps Z1-Z5 and R1 (credentials, allowlist and bucket); none is done by an agent.
- Verify in design: Access on `workers.dev` scope and identity mechanism (JWT versus a runtime identity), Zero Trust Free sign-up requirements, React Router 8 route middleware for actions, R2 binding types in the Vitest projects, CI token permissions for an R2 binding, drizzle-kit configuration for module-owned tables.

---

## Success Criteria

- [ ] An admin whose email is in the Access policy and on the app allowlist signs in with a one-time PIN and reaches `/admin`. A preview viewer not on the allowlist, a missing or invalid token, a service token, or missing Access configuration or allowlist gets the access-denied response, proved by tests for loaders and actions.
- [ ] The dev identity bypass works under `pnpm dev` and is rejected by configuration validation for any non-localhost site URL; CI never passes it.
- [ ] The owners can create, edit, archive, publish and pause monthly workshops. A workshop holds several turnos, each with its own weekday, time range and default capacity, and cannot be published without an active turno.
- [ ] "Abrir mes" creates a period prefilled from the previous month (fee, capacity per turno, project, enabled materials) or from the defaults for a first month, with a snapshot of the teacher and agreed percentage. Changing a workshop's percentage changes the next opened month and leaves earlier months unchanged, proved by tests.
- [ ] The owners can create, reschedule, pause, cancel and archive intensivos with a teacher, an agreed percentage and a fixed deposit, with 0 < deposit <= price enforced.
- [ ] Paused workshops and intensivos are stored as "paused" (visible, no new requests) for change 4 to render.
- [ ] The owners can manage teachers (modality, no percentage), suppliers, and materials with variants, availability, one supplier and an image stored in R2 and served with long-lived cache headers.
- [ ] Every admin write records the actor email and time; no record is hard-deleted once published or used, turnos included.
- [ ] Every repository adapter passes the same contract suite as its in-memory fake.
- [ ] Every admin screen passes axe checks, uses es-AR voseo copy without "workshop", and works at 360 px width.
- [ ] Admin responses carry `noindex` and `Cache-Control: private, no-store`.
- [ ] The CI deploy smoke check passes through Access with the service token and never prints a secret.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` and `pnpm build` pass for every PR; migrations `0001`-`0008` apply cleanly to Neon `staging`.
