# Tasks: Public Catalog (Talleres and Intensivos pages from the database, seats, dynamic Inicio, Event JSON-LD)

Change: public-catalog (change 4 of 8) | Store: hybrid | Strict TDD: active (`corepack pnpm test <path>`) | Design: `design.md` revision 2 (authoritative; PC1-PC16, sections 5, 8, 9, 10) | Specs: `specs/*/spec.md` (the spec wins on observable names, the design on structure) | Date: 2026-10-14

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated authored changed lines | About 3,900-5,450 across 12 PRs, excluding P0 (production 2,015-2,830, tests 1,870-2,620; design section 10.3) |
| 400-line budget risk | High (total). Every slice is forecast under 400 production lines; only tests push a few slices over 400 in total |
| Chained PRs recommended | Yes |
| Suggested split | P0 -> C4-B0 -> C4-B1 -> C4-B2 -> C4-B3 -> C4-B5 (BACK); C4-F0a -> C4-F0b -> C4-F1 / C4-F2 / C4-F3 -> C4-F4 (FRONT); C4-B4 after C4-F1 and C4-F2 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main (owner-confirmed 2026-10-14) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main (owner-confirmed 2026-10-14)
400-line budget risk: High

Recommended chain strategy: `stacked-to-main`. Reasons (design 10.1): each slice is reviewed and merged on its own; change-3 slices keep landing on `main` in between, so a feature branch would need repeated rebases of two chains; the fail-soft empty readers make every intermediate state on `main` shippable. Under `ask-on-risk` the owner confirms this choice before apply. Q1-Q10 are decided; DA1-DA7 are overridable assumptions and do not block apply.

### Estimated changed lines per slice (additions + deletions; fakes, builders, seeds and contract suites count as tests)

| PR | Owner | Production | Tests | Budget note |
|----|-------|------------|-------|-------------|
| P0 | BACK | 0 | 0 | Docs only (proposal, specs, design, this file); `size:exception` label, owner-requested |
| C4-B0 | BACK | 120-170 | 110-160 | Total may pass 400 because of tests: `size:exception` for tests |
| C4-B1 | BACK | 160-220 | 90-140 | Within budget or small exception |
| C4-B2 | BACK | 230-300 | 260-340 | Tests push total to 490-640: `size:exception` for tests. No natural split (design 10.4): stop and report if production passes 400 |
| C4-B3 | BACK | 280-370 | 280-370 | Same. Split rule: project and its images move to C4-B3b if production passes 400 |
| C4-B4 | BACK | 20-50 | 10-30 | Within budget |
| C4-B5 | BACK | 5-20 | 20-40 | Within budget |
| C4-F0a | FRONT | 240-330 | 210-290 | Split rule: `ConditionsNote`, `Breadcrumb`, `TeacherBlock` move to C4-F0c if production passes 400 |
| C4-F0b | FRONT | 200-290 | 180-260 | `size:exception` for tests |
| C4-F1 | FRONT | 270-360 | 220-300 | Split rule: detail page moves to C4-F1b (merge the same day) |
| C4-F2 | FRONT | 290-380 | 240-320 | Split rule: detail route and `TallerDetailPage` move to C4-F2b (merge the same day) |
| C4-F3 | FRONT | 60-120 | 90-140 | Within budget |
| C4-F4 | FRONT | 140-220 | 160-230 | Within budget or small exception |

Rules (carried from change 2): production alone above 400 lines means apply the slice's split rule first and never ask; tests alone pushing a slice over 400 ships as `size:exception` without asking; if a label does not exist on the remote, report it to the orchestrator and do not create labels.

### Delivery order and merge dependencies

```
P0 ─► C4-B0 ─┬─► C4-B1 ─────────────────────────────┐
             ├─► C4-B2 (needs ch3 B7) ──► C4-B3 (needs ch3 B6) ──► C4-B5 (needs ch3 B2b + F1)
             │
FRONT (builds against C4-B0 fakes):
C4-F0a (C4-B0) ─► C4-F0b ─┬─► C4-F1 (C4-B1, C4-B2) ─┬─► C4-F4 (C4-F1, C4-F2)
                          ├─► C4-F2 (C4-B1, C4-B3) ─┤
                          │                          └─► C4-B4 (C4-F1, C4-F2)
                          └─► C4-F3 (C4-B0, C4-B1)
```

Change-3 slices that must be merged on `main` first (names as in `openspec/changes/admin-catalog/tasks.md` and design section 10.2; verify their current names when starting each slice):

| Public-catalog slice | Change-3 prerequisites |
|----------------------|------------------------|
| C4-B0, C4-B1, C4-F0a, C4-F0b, C4-F3 | None beyond change-3 B0a and B0b (already merged) |
| C4-B2 (intensivos reader) | B2a (media core + `MediaLookup` port), B3 (teachers + `TeacherLookup`), B7 (intensivos tables and admin) |
| C4-B3 (talleres reader) | B2a, B3, B4 and B5 (workshops, turnos, images), B6 (periods, `period_turno`, `period_project_image`) |
| C4-B5 (real media lookup) | B2b (R2 binding and Drizzle `MediaLookup`), F1 (`/imagenes/:file` route), and C4-B2 |
| C4-F1, C4-F2 | The BACK reader they show (C4-B2 for intensivos, C4-B3 for talleres), plus C4-B1 |
| C4-F4 | C4-F1 and C4-F2 |
| C4-B4 | C4-F1 and C4-F2 |

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| P0 | Commit planning artifacts | P0 (docs, `size:exception`) | `corepack pnpm format:check` | `git status` shows no untracked planning files | Revert P0 (docs only) |
| C4-B0 | Public catalog contract, empty readers, fakes, `AppServices.publicCatalog` | C4-B0 | `corepack pnpm test src/modules/workshops src/composition src/testing/fakes` | `corepack pnpm dev`: `GET /` still 200 and `/talleres` still "Próximamente" | Revert C4-B0 (additive files plus one composition member) |
| C4-B1 | Catalog copy, `getCatalogContent`, `fillCopyTemplate` | C4-B1 | `corepack pnpm test src/modules/site-content` | `corepack pnpm dev`: `GET /` unchanged | Revert C4-B1 (additive; FRONT slices that read the content revert first) |
| C4-B2 | Intensivos reader, Córdoba date, Drizzle records, wiring | C4-B2 | `corepack pnpm test src/modules/workshops src/composition/request-services.db.test.ts` | `corepack pnpm dev` plus one request that logs `cordobaDateOf` under workerd; a seeded intensivo is returned by the reader | Revert C4-B2: composition returns `EMPTY_PUBLIC_INTENSIVOS` |
| C4-B3 | Talleres reader, offering selection, Drizzle records, wiring | C4-B3 | `corepack pnpm test src/modules/workshops src/composition/request-services.db.test.ts` | `corepack pnpm dev` plus a seeded taller read; collator order check under workerd | Revert C4-B3: composition returns `EMPTY_PUBLIC_TALLERES` |
| C4-B4 | Retire coming-soon `talleres` and `intensivos` entries | C4-B4 | `corepack pnpm test src/modules/site-content` | `corepack pnpm dev`: `GET /eventos-privados` 200 | Revert C4-B4 (restores the entries the restored routes need) |
| C4-B5 | Real `MediaLookup` into the public readers | C4-B5 | `corepack pnpm test src/composition/request-services.db.test.ts` | `corepack pnpm dev`: an activity with an image renders `/imagenes/<id>.<ext>` | Revert C4-B5: stand-ins again |
| C4-F0a | Formatters, display state, small molecules | C4-F0a | `corepack pnpm test src/app/catalog src/app/ui/atoms src/app/ui/molecules src/app/copy-rules.test.ts` | N/A (no route renders these yet; ui tests with axe cover them) | Revert C4-F0a (additive files) |
| C4-F0b | Cards, grid, listing template, `DateBadge` parts, fixtures | C4-F0b | `corepack pnpm test src/app/ui src/testing/fixtures` | N/A (no route renders these yet) | Revert C4-F0b (`DateBadge` and fixtures change back together) |
| C4-F1 | Intensivos listing and detail, WhatsApp links, meta | C4-F1 | `corepack pnpm test src/app/routes/intensivos src/app/routes/intensivo src/app/catalog src/app/seo src/app/site-map.test.ts` | `corepack pnpm dev` with a seeded intensivo: `/intensivos` and `/intensivos/<slug>` at 360, 1024, 1440 px | Revert C4-F1 (restores coming-soon entries; revert C4-B4 first if merged) |
| C4-F2 | Talleres listing and detail | C4-F2 | `corepack pnpm test src/app/routes/talleres src/app/routes/taller src/app/catalog src/app/site-map.test.ts` | `corepack pnpm dev` with a seeded taller: `/talleres` and `/talleres/<slug>` at 360, 1024, 1440 px | Revert C4-F2 (same note as C4-F1) |
| C4-F3 | Dynamic Inicio | C4-F3 | `corepack pnpm test src/app/routes/home` | `corepack pnpm dev`: `/` with empty readers renders today's output; with seeds at 360, 1024, 1440 px | Revert C4-F3 (literal empty arrays return) |
| C4-F4 | Event JSON-LD, dynamic sitemap, deviation rows | C4-F4 | `corepack pnpm test src/app/seo src/app/routes/sitemap src/app/routes/intensivo` | `corepack pnpm dev`: `GET /sitemap.xml`; JSON-LD of one intensivo in the Rich Results Test code-snippet mode | Revert C4-F4 (removes JSON-LD and dynamic entries) |

Shorthand: specs **PCR** public-catalog-reader, **TP** talleres-pages, **IP** intensivos-pages, **ESD** event-structured-data, **SEO** seo-foundation, **HP** home-page, **PL** public-layout (all under `openspec/changes/public-catalog/specs/<name>/spec.md`). Design: **PCn** decisions, **DAn** assumptions, **Pn** threat-matrix rows (section 9.2), **§n** sections of `design.md`.

## Global rules (apply to every task)

- **Tags.** `[BACK]` Claude Code: `src/modules/**`, `src/platform/**`, `src/composition/**`, `src/testing/{fakes,contracts,db}/**`, `openspec/**`. `[FRONT]` pi: `src/app/**` plus carve-outs `src/testing/fixtures/**` and `docs/design/**`. `[OWNER]` steps no agent can do (PR merge, label decisions, owner copy approval). BACK never edits `src/testing/fixtures/**`; FRONT fixtures may import BACK builders, the fake catalog and `createSeededPublicCatalog` (PC16).
- **Commands.** Run everything through `corepack pnpm`. Focus a test with `corepack pnpm test <path>`, never `corepack pnpm test -- <path>`. A `*.ui.test.tsx` runs in the `ui` project; every other `*.test.ts(x)` and `*.db.test.ts` runs in `unit`/`db` as configured.
- **Strict TDD.** Every behavior task is RED (write the test, run it, see it fail, record the failure in the PR notes), then GREEN (minimum code), then REFACTOR (tests stay green). Tests ship in the same commit as the behavior. Type-only or data-only files have no RED of their own; the task names the test that covers them.
- **Commits.** Conventional Commits only. NEVER a `Co-Authored-By` line or any AI attribution. One work unit per commit. Never shrink a diff by deleting comments, blank lines, docs or tests.
- **Local gate (end of every PR phase).** `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm format:check`, `corepack pnpm build`. All must exit 0. Coverage (`corepack pnpm test:coverage`) stays at 90 % lines and branches on the new `workshops/domain`, `workshops/application` files and `site-content/domain/copy-template.ts`.
- **Architecture.** Never weaken `eslint.config.ts` or `tooling/architecture/architecture.test.ts`. No new element, no package, no migration. `ui` stays structural (no module, context or composition import).
- **Visual check (FRONT slices that render pages: C4-F1, C4-F2, C4-F3).** Before the PR, run `corepack pnpm dev` and take real-browser screenshots at 360, 1024 and 1440 px width of every page the slice adds or changes, in its open, paused and empty states where applicable. Attach them to the PR and record in the PR body which data was used (database seeded with `src/testing/db/seed-catalog.ts`, or a temporary uncommitted stub). Screenshots are never committed. C4-F0a and C4-F0b add no route; their visual check is deferred to C4-F1 (the first slice that renders the cards), recorded in their PR bodies.
- **PR chain context (every PR body).** Start, end, dependencies (merged PRs it needs, including change-3 slices), follow-ups, out of scope, dependency diagram with the current PR marked, verification evidence (focused command output, RED evidence, line counts: production, tests, docs), and the temporary-state note from design section 11.
- **Merge discipline (PC16).** BACK merges first. A FRONT page slice merges only after the reader it shows. FRONT rebases on `origin/main` before each slice and before opening its PR. C4-F3 may merge after C4-B0 and C4-B1.
- **Every PR** leaves the indexing gate OFF and the preview deployable.
- **Edit authority.** Backticked paths on task lines are edit targets; paths only read carry `(read-only)`.

### STOP conditions (report to the orchestrator with evidence; never improvise)

1. Any login or authentication prompt from `wrangler`, `gh` beyond the owner-authorized PR flow, `neonctl` or any Cloudflare/Neon tool.
2. A change-3 prerequisite is not on `main`, or its schema or factory names differ from design 13.3 in a way a records adapter cannot absorb.
3. A slice's production lines alone exceed 400 after its split rule is applied (C4-B2 has no split: stop at 400).
4. A needed change in a file owned by the other side (BACK/FRONT seam).
5. A spec requirement that contradicts a design rule in a way 13.2 does not already resolve (report; the spec wins on product rules).

---

## Phase 0: P0 planning PR (docs only)

- [ ] 0.1 [BACK] Commit `openspec/changes/public-catalog/{proposal.md,design.md,tasks.md,specs/**}` on branch `docs/public-catalog-planning`. Verify: `corepack pnpm format:check` exits 0. Commit `docs(openspec): add public-catalog tasks`.
- [ ] 0.2 [BACK] Open the P0 PR to `main` with label `size:exception` (docs only, owner-requested).
- [ ] 0.3 [OWNER] Confirm the chain strategy (`stacked-to-main` recommended) and merge P0. This closes "Decision needed before apply".

## Phase 1: C4-B0 contract, empty readers, fakes (BACK)

Branch `feat/public-catalog-contract`. Needs: P0 merged. Traces: PCR "Actorless public access", "Seats contract", "Fail-soft placeholder" (placeholder half); P11.

- [ ] 1.1 RED [BACK] Create `src/modules/workshops/application/public-catalog.test.ts`: assigning `{ capacity: 8, available: null }` to `PublicSeats` compiles; assigning `{ capacity: 8, available: 3 }` carries `// @ts-expect-error`; a runtime test builds a `PublicCatalogService` stub and calls every reader method with no argument (no actor). Run `corepack pnpm test src/modules/workshops/application/public-catalog.test.ts` and `corepack pnpm typecheck`; record the failure (module `./public-catalog` missing). Covers PCR "Call without an actor", "Available is unknown", "Capacity is not availability", P11.
- [ ] 1.2 GREEN [BACK] Create `src/modules/workshops/application/public-catalog.ts` with the section 5.1 read models (`PublicTaller`, `PublicIntensivo`, `PublicTurno`, `PublicSeats` with `available: null`, `PublicImage`, `PublicTeacher`, `PublicOffering`, `PublicProject`), the two reader interfaces, `PublicCatalogService`, the two records ports and record types, `ListOptions`, and the two factory signatures as types only (no implementation). Add `export * from "./application/public-catalog"` to `src/modules/workshops/index.ts`. Re-run 1.1 until green; `corepack pnpm lint` (boundaries) passes. Commit with 1.3-1.6 or alone as `feat(workshops): declare the public catalog read models and ports`.
- [ ] 1.3 RED [BACK] Create `src/composition/empty-public-catalog.test.ts`: `EMPTY_PUBLIC_TALLERES` and `EMPTY_PUBLIC_INTENSIVOS` resolve `list()` to `[]`, `findBySlug("x")` to `null`, `listSlugs()` to `[]`; the readers expose only `list`, `findBySlug`, `listSlugs` (no mutation surface); `EMPTY_MEDIA_LOOKUP` is an empty `Map` lookup. Run `corepack pnpm test src/composition/empty-public-catalog.test.ts`; record the failure. Covers PCR "No mutation surface", "Placeholder returns empty".
- [ ] 1.4 GREEN [BACK] Create `src/composition/empty-public-catalog.ts` exporting `EMPTY_PUBLIC_TALLERES`, `EMPTY_PUBLIC_INTENSIVOS`, `EMPTY_MEDIA_LOOKUP` (PC3). Re-run 1.3 green. Commit `feat(composition): add fail-soft empty public catalog readers`.
- [ ] 1.5 RED [BACK] Create `src/testing/fakes/fake-public-catalog.test.ts`: `createFakePublicCatalog({ talleres, intensivos })` keeps the given order, honors `limit`, `findBySlug` is exact-slug and returns `null` otherwise, `listSlugs` lists the given slugs; the builders `buildPublicImage`, `buildPublicTeacher`, `buildPublicTurno`, `buildPublicTaller`, `buildPublicIntensivo` return neutral invented data ("Taller Demo", fee `Money` 5,800,000 centavos) with `seats.available === null`; `createTestServices()` exposes an empty `publicCatalog` by default. Run `corepack pnpm test src/testing/fakes/fake-public-catalog.test.ts`; record the failure.
- [ ] 1.6 GREEN [BACK] Create `src/testing/fakes/public-catalog-builders.ts` and `src/testing/fakes/fake-public-catalog.ts`; modify `src/testing/fakes/app-services.ts` so `createTestServices` defaults `publicCatalog` to the empty fake. Re-run 1.5 green. Commit `test(testing): add public catalog builders and fake`.
- [ ] 1.7 RED [BACK] Extend `src/composition/request-services.db.test.ts`: `createRequestServices(...)` exposes `publicCatalog`; with the empty readers `list()` is `[]`, `findBySlug` is `null`, `listSlugs` is `[]` on a migrated empty database. Run `corepack pnpm test src/composition/request-services.db.test.ts`; record the failure. Covers PCR "Placeholder returns empty".
- [ ] 1.8 GREEN [BACK] Modify `src/composition/request-services.ts`: add `publicCatalog: PublicCatalogService` to `AppServices` and wire `{ talleres: EMPTY_PUBLIC_TALLERES, intensivos: EMPTY_PUBLIC_INTENSIVOS }` (section 5.2). Re-run 1.7 green. Commit `feat(composition): expose publicCatalog in app services`.
- [ ] 1.9 REFACTOR [BACK] Tidy names and exports; no behavior change; tests stay green.
- [ ] 1.10 GATE [BACK] Full local gate (Global rules). Runtime harness: `corepack pnpm dev`, `GET /` 200 and `GET /talleres` still "Próximamente".
- [ ] 1.11 PR [BACK] Open PR C4-B0 to `main` (body per Global rules; `size:exception` for tests if the total passes 400).
- [ ] 1.12 [OWNER] Review and merge C4-B0.

## Phase 2: C4-B1 catalog copy (BACK)

Branch `feat/public-catalog-copy`. Needs: C4-B0 merged. Traces: SEO "Uniqueness" (content half), TP/IP/HP "Copy scan" inputs, PC11.

- [ ] 2.1 RED [BACK] Create `src/modules/site-content/domain/copy-template.test.ts`: `fillCopyTemplate("Hola {nombre}", { nombre: "Cerámica" })` fills; repeated keys fill every occurrence; a missing value throws; an unused value is ignored. Run `corepack pnpm test src/modules/site-content/domain/copy-template.test.ts`; record the failure.
- [ ] 2.2 GREEN [BACK] Create `src/modules/site-content/domain/copy-template.ts` (`fillCopyTemplate`); export it from `src/modules/site-content/index.ts`. Re-run 2.1 green. Commit `feat(site-content): add the copy template filler`.
- [ ] 2.3 RED [BACK] Extend `src/modules/site-content/infrastructure/repository-content.test.ts` with catalog cases (design 5.3): `getCatalogContent()` returns `CatalogContent`; `findCopyViolations` over every catalog string is empty (voseo, no "workshop"); `messages.taller` contains exactly `{nombre}`, `messages.turno` exactly `{nombre}`, `{dia}`, `{horario}`, `messages.intensivo` exactly `{nombre}`, `{fecha}`, `messages.paused` exactly `{nombre}`; `shared.moreTurnos` contains `{cantidad}`; `intensivos.minSeats` contains `{cantidad}`; `fallbackImage.src` is in the stand-in manifest and its alt is `""`; the talleres and intensivos SEO titles and descriptions are non-empty and distinct from every other page; the two intros are `approved: false` and listed by `listUnapprovedContent()`. Run `corepack pnpm test src/modules/site-content`; record the failure.
- [ ] 2.4 GREEN [BACK] Modify `src/modules/site-content/domain/page-content.ts` (add `CatalogContent`, `RawSiteContent.catalog`); create `src/modules/site-content/infrastructure/content/catalog.ts` with the spec-named literals ("Talleres", "Talleres intensivos", "Ver taller", "Ver intensivo", "Cupo limitado", "Inscripciones pausadas", "Consultá por WhatsApp", "Escribinos por WhatsApp", "Cuota mensual", "/ mes", "Seña", "Próximamente abrimos inscripciones", "Proyectos que vamos a realizar", "Se realiza con un mínimo de {cantidad} personas", "y {cantidad} turnos más") and drafted prose for the rest; no schedule, price, teacher or policy fact is written into content; modify `src/modules/site-content/infrastructure/repository-content-source.ts`, `src/modules/site-content/application/site-content.ts` (`getCatalogContent()`), `src/modules/site-content/index.ts`, `src/testing/fakes/in-memory-site-content-source.ts`. Re-run 2.3 green. Commit `feat(site-content): add the catalog copy and getCatalogContent`.
- [ ] 2.5 REFACTOR [BACK] Tidy; tests stay green.
- [ ] 2.6 GATE [BACK] Full local gate. Runtime harness: `corepack pnpm dev`, `GET /` unchanged.
- [ ] 2.7 PR [BACK] Open PR C4-B1 to `main`.
- [ ] 2.8 [OWNER] Review and merge C4-B1. The two intros remain drafted prose awaiting owner approval (`listUnapprovedContent()`); they do not block merge.

## Phase 3: C4-B2 intensivos reader (BACK)

Branch `feat/public-intensivos-reader`. Needs: C4-B0 merged; change-3 B2a, B3 and B7 merged. Traces: PCR (actorless, visibility, expiry, ordering, projection, slug lookup, enumeration, fail-soft, adapter parity); P1, P2, P4.

- [ ] 3.1 RED [BACK] Create `src/modules/workshops/application/cordoba-time.test.ts`: `cordobaDateOf` returns `2026-10-31` at `2026-11-01T01:00:00Z` and `02:59:59Z`, and `2026-11-01` at `03:00:00Z`; a guard test fails if `Intl` does not report GMT-3 for `America/Argentina/Cordoba` in January and July (DA6). Run `corepack pnpm test src/modules/workshops/application/cordoba-time.test.ts`; record the failure. Covers PCR "Cordoba boundary near UTC midnight".
- [ ] 3.2 GREEN [BACK] Create `src/modules/workshops/application/cordoba-time.ts` (`cordobaDateOf`, `CORDOBA_UTC_OFFSET = "-03:00"`, importing `cordobaMonthOf` from `./contracts` (read-only)); export it from `src/modules/workshops/index.ts`. Re-run 3.1 green. Commit `feat(workshops): add the Córdoba date helper`.
- [ ] 3.3 RED [BACK] Create `src/modules/workshops/domain/public-catalog-rules.test.ts` (intensivo half): `isPublicSlug` (valid; uppercase; `..`; `%`; empty; exactly 80 accepted; 81 rejected); `isUpcoming` (yesterday false, today true, tomorrow true; DA5); `compareIntensivos` (date, then start, then name via collator, then slug; DA7). Run the file; record the failure. Covers PCR "Past intensivo hidden", "Today still visible", "Nearest first", "Same date tie-break"; P4.
- [ ] 3.4 GREEN [BACK] Create `src/modules/workshops/domain/public-catalog-rules.ts` with `isPublicSlug(slug, maxLength)`, `isUpcoming`, `compareIntensivos` (pure strings and numbers). Re-run 3.3 green. Commit `feat(workshops): add the public intensivo rules`.
- [ ] 3.5 RED [BACK] Create `src/modules/workshops/application/public-projection.test.ts`: `projectImages` drops an image whose asset the lookup omits (DA4) and builds `{ src, alt, width, height }` with literal keys; `projectTeacher` returns `{ name, bioLine }`, shows an archived teacher (DA3), turns an empty bio into `null`, returns `null` for a missing teacher; `publicStatus("published")` is `"open"`, `"paused"` is `"paused"`; draft, archived and cancelled never project. Run the file; record the failure. Covers PCR "Teacher exposure".
- [ ] 3.6 GREEN [BACK] Create `src/modules/workshops/application/public-projection.ts` (`projectImages`, `projectTeacher`, `publicStatus`). Re-run 3.5 green. Commit `feat(workshops): add the public projection helpers`.
- [ ] 3.7 RED [BACK] Create `src/testing/fakes/in-memory-public-catalog-records.test.ts`: the intensivo records fake over a `CatalogSeed` applies the SQL filters (status in published/paused, `eventDate >= fromDate`), returns `eventDate` as a `YYYY-MM-DD` string and `startsAt` as `HH:MM`, and `fullyPopulatedSeed()` carries the PC14 sentinels (3550 bp percentage, phone `+54 9 351 000 0000`, email `docente@example.test`, `modality: "third_party"`, `updatedBy: "auditor@example.test"`, `SNAPSHOT-SENTINEL`, `PRIVATE-FILE.jpg`, `uploader@example.test`). Run the file; record the failure.
- [ ] 3.8 GREEN [BACK] Create `src/testing/fakes/catalog-seed.ts` (`CatalogSeed`, `fullyPopulatedSeed`, `createSeededPublicCatalog(seed, clock)`) and `src/testing/fakes/in-memory-public-catalog-records.ts` (intensivo half). Re-run 3.7 green. Commit `test(testing): add the catalog seed and in-memory intensivo records`.
- [ ] 3.9 RED [BACK] Create `src/testing/contracts/public-catalog.contract.ts` (`runPublicIntensivosContract(setup)`: reader over records plus fake lookups plus fixed clock) and `src/modules/workshops/application/public-intensivos-reader.test.ts` that runs it against the in-memory records. Cases: draft, archived and cancelled absent from `list`, `findBySlug` and `listSlugs` even when a fake returns them (P2); paused kept in its date position; past intensivo hidden, today visible, boundary at `01:00Z`/`03:00Z`; nearest first, same-date tie-break, `limit` 3, `limit: 0` throws `RangeError`; `findBySlug` exact, unknown `null`, a taller slug `null` (not cross-type); invalid slug returns `null` with **zero** records calls (spy, P4); `listSlugs` matches `list`; the paused read model keeps `seats.capacity` as the intensivo capacity and `available: null`; the date keeps no time-zone shift. Run `corepack pnpm test src/modules/workshops/application/public-intensivos-reader.test.ts`; record the failure. Covers PCR "Only visible statuses listed", "Invisible slug lookup", "Paused keeps its place", "Past intensivo hidden", "Today still visible", "Cordoba boundary near UTC midnight", "Nearest first", "Same date tie-break", "Limit", "Known visible slug", "Unknown slug", "Slug is not cross-type", "Enumeration matches visibility".
- [ ] 3.10 RED [BACK] Create `src/modules/workshops/application/public-intensivos-reader.privacy.test.ts`: over `fullyPopulatedSeed()`, `JSON.stringify` of every reader result contains none of the sentinel values and none of the keys `percentage`, `basisPoints`, `modality`, `phone`, `email`, `audit`, `updatedBy`, `snapshot`, `fileName`, `createdBy`; exact key sets for `PublicIntensivo`, `PublicImage`, `PublicTeacher`; a draft's data never appears; a records port that throws makes `list` and `findBySlug` reject (the error is not turned into an empty list). Run the file; record the failure. Covers PCR "Fully populated fixture serialization (intensivo)", "Teacher exposure", "Draft data stays out", "Real adapter failure is not hidden"; P1.
- [ ] 3.11 GREEN [BACK] Create `src/modules/workshops/application/public-intensivos-reader.ts` (`createPublicIntensivosReader`: one `clock.now()` per call, `isPublicSlug` before any query, records, `teachers.findByIds` and `media.findAssets` in parallel, `isVisibleStatus` re-check, `isUpcoming`, `compareIntensivos`, explicit projection with literal keys; `PUBLIC_SLUG_MAX_LENGTH = 80` with a comment pointing to change-3 design 5.7, or the change-3 constant if exported). Re-run 3.9 and 3.10 green. Commit `feat(workshops): add the public intensivos reader`.
- [ ] 3.12 RED [BACK] Create `src/modules/workshops/infrastructure/drizzle-public-intensivo-records.db.test.ts` running `runPublicIntensivosContract` against embedded PostgreSQL seeded through `src/testing/db/seed-catalog.ts`: same cases as 3.9; record key sets exact; `startsAt` is `"10:00"`; `Money` round trip; `typeof eventDate === "string"` and `"2026-11-14"` identical under `TZ=UTC` and `TZ=America/Argentina/Cordoba`; two queries per call regardless of size. Run `corepack pnpm test src/modules/workshops/infrastructure/drizzle-public-intensivo-records.db.test.ts`; record the failure. Covers PCR "Same suite, both adapters".
- [ ] 3.13 GREEN [BACK] Create `src/testing/db/seed-catalog.ts` (intensivo half: `teacher`, `media_asset`, `intensive_workshop`, `intensive_image`) and `src/modules/workshops/infrastructure/drizzle-public-intensivo-records.ts` (imports only `~/platform/db/schema/workshops` and `drizzle-orm`; explicit column list; `status IN ('published','paused')`; `event_date >= :fromDate` as string; `to_char(event_date, 'YYYY-MM-DD')` if the change-3 column is in `Date` mode; `time` normalized to `HH:MM`; images batched with `inArray`). Re-run 3.12 green. Commit `feat(workshops): add the Drizzle public intensivo records`.
- [ ] 3.14 RED [BACK] Extend `src/composition/request-services.db.test.ts`: after wiring, a seeded visible intensivo is returned by `services.publicCatalog.intensivos.list()` and a migrated empty database gives `[]`; `talleres` still empty. Run it; record the failure.
- [ ] 3.15 GREEN [BACK] Modify `src/composition/request-services.ts`: replace `EMPTY_PUBLIC_INTENSIVOS` with `createPublicIntensivosReader({ records: createDrizzlePublicIntensivoRecords(openSession), teachers, media: EMPTY_MEDIA_LOOKUP, clock: systemClock })` using the change-3 Drizzle `TeacherLookup` (read-only: confirm its factory name and signature first). Re-run 3.14 green. Commit `feat(composition): wire the public intensivos reader`.
- [ ] 3.16 VERIFY [BACK] Record in the PR body each design 13.3 item for this slice: (a) change-3 `src/platform/db/schema/workshops.ts` (read-only) column names and types match; (b) `event_date` mode; (c) change-3 slug limit still 80 and whether a constant is exported (use it if so); (d) change-3 `TeacherLookup`/`MediaLookup` factory names and `MediaAsset.src` shape; (e) `Intl` with `America/Argentina/Cordoba` under workerd (`corepack pnpm dev` plus one logged `cordobaDateOf`).
- [ ] 3.17 GATE [BACK] Full local gate and `corepack pnpm test:coverage` for the new files.
- [ ] 3.18 PR [BACK] Open PR C4-B2 to `main` (`size:exception` for tests; PR body states production lines against the 230-300 forecast).
- [ ] 3.19 [OWNER] Review and merge C4-B2.

## Phase 4: C4-B3 talleres reader (BACK)

Branch `feat/public-talleres-reader`. Needs: C4-B2 merged; change-3 B2a, B3, B4, B5 and B6 merged. Traces: PCR (offering selection, turno ordering and capacity, seats contract, taller order, lookup, enumeration, adapter parity); P1, P2.

- [ ] 4.1 RED [BACK] Extend `src/modules/workshops/domain/public-catalog-rules.test.ts` with `selectOffering` (current open; current missing gives next; two later gives earliest; only past gives `null`; empty gives `null`; unsorted input), `compareTurnos` (weekday 1-7, then start) and `compareTalleres` (collator: "acuarela" < "Cerámica" < "Pintura"; slug tie-break). Run `corepack pnpm test src/modules/workshops/domain/public-catalog-rules.test.ts`; record the failure. Covers PCR "Current month open", "Current month not open, next open", "Earliest later open month", "No open month", "Past month ignored", "Ordering", "Name order".
- [ ] 4.2 GREEN [BACK] Add `selectOffering`, `compareTurnos`, `compareTalleres` to `src/modules/workshops/domain/public-catalog-rules.ts`. Re-run 4.1 green. Commit `feat(workshops): add the public taller rules`.
- [ ] 4.3 RED [BACK] Extend `src/testing/fakes/in-memory-public-catalog-records.test.ts` with the taller half: active turnos only, open periods `>= fromPeriod`, `period_turno` capacities, project and project images, `fullyPopulatedSeed()` taller sentinels. Run it; record the failure.
- [ ] 4.4 GREEN [BACK] Extend `src/testing/fakes/in-memory-public-catalog-records.ts` and `src/testing/fakes/catalog-seed.ts` (taller data, `createSeededPublicCatalog` talleres half). Re-run 4.3 green. Commit `test(testing): add in-memory taller records`.
- [ ] 4.5 RED [BACK] Extend `src/testing/contracts/public-catalog.contract.ts` with `runPublicTalleresContract(setup)` and create `src/modules/workshops/application/public-talleres-reader.test.ts` running it on the in-memory records. Cases: visibility (P2); paused taller listed and shows no fee when it has no offering; offering at the 2026-10-31 22:00 Córdoba boundary (`01:00Z` on 1 Nov keeps October, `03:00Z` moves to November); current month open, else next open, else `offering: null` with `project: null` and every turno capacity `null` (DA1, no default fee); capacity from the selected period for each active turno, retired turnos never public; project only for the selected period and only when title, description or images exist (DA2); turnos ordered by weekday then start; list ordered by name collator, `limit` 3 after sorting; `findBySlug` exact, unknown and a cross-type slug `null`; invalid slug has zero records calls; `listSlugs` matches visibility; `seats.available` is `null` for every turno and capacity is never copied to `available`. Run `corepack pnpm test src/modules/workshops/application/public-talleres-reader.test.ts`; record the failure. Covers PCR "Only visible statuses listed", "Invisible slug lookup", "Paused keeps its place", "Current month open" through "Month boundary uses Cordoba time", "Ordering", "Capacity from the offering", "Capacity without an offering", "Available is unknown", "Capacity is not availability", "Known visible slug", "Unknown slug", "Slug is not cross-type", "Name order", "First three", "Enumeration matches visibility".
- [ ] 4.6 RED [BACK] Create `src/modules/workshops/application/public-talleres-reader.privacy.test.ts`: sentinel scan and forbidden keys over `list` and `findBySlug` for the fully populated taller; exact key sets for `PublicTaller`, `PublicTurno`, `PublicOffering`, `PublicProject`, `PublicImage`, `PublicTeacher`; draft data never appears; a throwing records port rejects (no silent empty). Run it; record the failure. Covers PCR "Fully populated fixture serialization (taller)", "Teacher exposure", "Draft data stays out", "Real adapter failure is not hidden"; P1.
- [ ] 4.7 GREEN [BACK] Create `src/modules/workshops/application/public-talleres-reader.ts` (`createPublicTalleresReader`, `projectTaller` with DA1 and DA2, offering from `cordobaMonthOf(now)`). Re-run 4.5 and 4.6 green. Commit `feat(workshops): add the public talleres reader`.
- [ ] 4.8 RED [BACK] Create `src/modules/workshops/infrastructure/drizzle-public-taller-records.db.test.ts` running `runPublicTalleresContract` on embedded PostgreSQL via `src/testing/db/seed-catalog.ts`: same cases as 4.5; exact record key sets; `HH:MM` times; `Money` round trip; the plan is six batched queries for `listVisible` and `findVisibleBySlug` (query count independent of catalog size). Run it; record the failure. Covers PCR "Same suite, both adapters".
- [ ] 4.9 GREEN [BACK] Extend `src/testing/db/seed-catalog.ts` (`monthly_workshop`, `workshop_turno`, `workshop_image`, `workshop_period`, `period_turno`, `period_project_image`) and create `src/modules/workshops/infrastructure/drizzle-public-taller-records.ts` (workshops schema only; explicit columns; steps 2-6 only when step 1 returns rows; one session per call closed in `finally`). Re-run 4.8 green. Commit `feat(workshops): add the Drizzle public taller records`.
- [ ] 4.10 RED [BACK] Extend `src/composition/request-services.db.test.ts`: a seeded visible taller is returned by `services.publicCatalog.talleres.list()`; a migrated empty database gives `[]`. Run it; record the failure.
- [ ] 4.11 GREEN [BACK] Modify `src/composition/request-services.ts`: replace `EMPTY_PUBLIC_TALLERES` with `createPublicTalleresReader({ records: createDrizzlePublicTallerRecords(openSession), teachers, media: EMPTY_MEDIA_LOOKUP, clock: systemClock })`. Re-run 4.10 green. Commit `feat(composition): wire the public talleres reader`.
- [ ] 4.12 VERIFY [BACK] Record in the PR body: change-3 schema match for the period tables; `Intl.Collator("es", { sensitivity: "base" })` order for accented names under workerd matches Node (`corepack pnpm dev`).
- [ ] 4.13 GATE [BACK] Full local gate and `corepack pnpm test:coverage`.
- [ ] 4.14 PR [BACK] Open PR C4-B3 to `main` (`size:exception` for tests; if production passes 400, apply the split rule: project and images move to C4-B3b).
- [ ] 4.15 [OWNER] Review and merge C4-B3.

## Phase 5: C4-B4 retire the coming-soon talleres and intensivos entries (BACK)

Branch `chore/public-catalog-retire-coming-soon`. Needs: C4-F1 and C4-F2 merged (so no FRONT edit is needed). Traces: PL "Eventos privados title", "Talleres and Intensivos are not placeholders".

- [ ] 5.1 RED [BACK] Extend the site-content tests in `src/modules/site-content/infrastructure/repository-content.test.ts`: the coming-soon content has only `eventos-privados`; `ComingSoonSlug` is `"eventos-privados"`. Run `corepack pnpm test src/modules/site-content`; record the failure. Covers PL "Eventos privados title", "Talleres and Intensivos are not placeholders".
- [ ] 5.2 GREEN [BACK] Modify `src/modules/site-content/infrastructure/content/coming-soon.ts` and `src/modules/site-content/domain/page-content.ts` (`ComingSoonSlug`). Re-run 5.1 green; `corepack pnpm typecheck` passes with no FRONT edit. Commit `refactor(site-content): keep only eventos-privados as coming soon`.
- [ ] 5.3 GATE [BACK] Full local gate. Runtime harness: `GET /eventos-privados` 200 and `noindex`.
- [ ] 5.4 PR [BACK] Open PR C4-B4 to `main`.
- [ ] 5.5 [OWNER] Review and merge C4-B4.

## Phase 6: C4-B5 real media lookup (BACK)

Branch `feat/public-catalog-media`. Needs: C4-B2 merged; change-3 B2b (R2 binding, Drizzle `MediaLookup`) and change-3 F1 (`/imagenes/:file`) merged. Gated on change-3 runbook R1 (bucket). Traces: PCR "Fully populated fixture serialization" (storage metadata still excluded with real lookups); DA4.

- [ ] 6.1 RED [BACK] Extend `src/composition/request-services.db.test.ts`: with an activity that has a `media_asset` row, the public readers return an image with `src` of the change-3 `/imagenes/<id>.<ext>` shape and no `fileName`, `contentType`, `byteSize` or `createdBy`; an image whose asset row is missing is dropped. Run it; record the failure.
- [ ] 6.2 GREEN [BACK] Modify `src/composition/request-services.ts`: replace `EMPTY_MEDIA_LOOKUP` with the change-3 Drizzle `MediaLookup` in both public readers (one composition line each). Re-run 6.1 green. Commit `feat(composition): serve real media in the public catalog`.
- [ ] 6.3 GATE [BACK] Full local gate. Runtime harness: an activity with an image renders its `/imagenes/...` source.
- [ ] 6.4 PR [BACK] Open PR C4-B5 to `main`.
- [ ] 6.5 [OWNER] Confirm R1 (bucket) exists, then review and merge C4-B5.

## Phase 7: C4-F0a formatters, display state, small molecules (FRONT)

Branch `feat/public-catalog-ui-foundations`. Needs: C4-B0 merged. Traces: TP "Fee and time formats", "Seats indicator", "Paused precedence"; IP "Price, deposit, date and time formats", "Intensivo seats indicator"; P6, P11.

- [ ] 7.1 RED [FRONT] Create `src/app/catalog/format.test.ts`: `formatPesos` gives "$ 58.000" with U+00A0 after `$` (compare normalized whitespace), "$ 45.000", and ",50" only for non-zero centavos; `formatTimeRange("10:00","12:00")` gives "10:00 a 12:00 h"; `formatDuration` gives "2 horas", "1 hora", "2 h 30 min", "45 min"; `weekdayName(1..7)` gives "Lunes" to "Domingo"; `formatEventDate("2026-11-14")` gives "Sábado 14 de noviembre"; `dateBadgeParts("2026-11-14")` gives `{ dateTime: "2026-11-14", weekday: "sáb", day: "14", month: "nov", label: "sábado 14 de noviembre de 2026" }` and is identical under `TZ=UTC` and a UTC-03:00 zone. Run `corepack pnpm test src/app/catalog/format.test.ts`; record the failure. Covers TP "Card fee format", "Detail fee format", "Time range format", "Weekday names", "Class length derived", "Whole hours"; IP "Price and deposit", "Date badge", "Duration forms", "Time range".
- [ ] 7.2 GREEN [FRONT] Create `src/app/catalog/format.ts` (no `Intl` for numbers or names; arithmetic on the `YYYY-MM-DD` string). Re-run 7.1 green. Commit `feat(app): add the catalog formatters`.
- [ ] 7.3 RED [FRONT] Create `src/app/catalog/display-state.test.ts`: `tallerDisplay` returns `"paused"` when paused (even without an offering), `"no-offering"` when open without an offering, `"open"` otherwise; `seatsIndicator` returns `{ kind: "limited" }` only for `"open"` and `{ kind: "none" }` otherwise; the result does not depend on capacity. Run it; record the failure. Covers TP "Cupo limitado", "Unknown availability", "Not shown when paused or without offering", "Paused precedence"; IP "Cupo limitado", "Paused hides seats"; P11.
- [ ] 7.4 GREEN [FRONT] Create `src/app/catalog/display-state.ts`. Re-run 7.3 green. Commit `feat(app): add the catalog display state`.
- [ ] 7.5 RED [FRONT] Extend `src/app/copy-rules.test.ts` to scan the weekday and month name tables, the unit words in `src/app/catalog/format.ts` and the new microcopy with `findCopyViolations`. Run `corepack pnpm test src/app/copy-rules.test.ts`; record the failure (formatter tables not yet exported for the scan). Covers TP and IP "Copy scan" (formatter half, design 13.2 item 2).
- [ ] 7.6 GREEN [FRONT] Export the name tables from `src/app/catalog/format.ts` for the scan. Re-run 7.5 green. Commit with 7.8 or as `test(app): scan the catalog formatter tables`.
- [ ] 7.7 RED [FRONT] Create ui tests, each calling `expectNoAxeViolations`: `src/app/ui/atoms/pill.ui.test.tsx` (`tone` neutral/notice), `src/app/ui/molecules/price-tag.ui.test.tsx` ("$ 58.000 / mes"; label "Cuota mensual"), `src/app/ui/molecules/paused-notice.ui.test.tsx` (text, optional link), `src/app/ui/molecules/turno-list.ui.test.tsx` (items with weekday, time range, duration, optional seats "Cupo limitado" with no digits next to "lugares", optional inquiry link), `src/app/ui/molecules/breadcrumb.ui.test.tsx` (nav aria-label, last item `aria-current="page"`), `src/app/ui/molecules/teacher-block.ui.test.tsx`, `src/app/ui/molecules/conditions-note.ui.test.tsx` (policy text always visible with `toBeVisible`, no `<details>` element, a `<b>` string renders literally, line breaks kept, no minimum-seats line when `minSeats` is absent). Run `corepack pnpm test src/app/ui/atoms src/app/ui/molecules`; record the failures. Covers IP "Policy note" (component half), "Minimum seats text" (component half); TP "Cupo limitado"; P6.
- [ ] 7.8 GREEN [FRONT] Create `src/app/ui/molecules/{price-tag,paused-notice,turno-list,breadcrumb,teacher-block,conditions-note}.tsx`; modify `src/app/ui/atoms/pill.tsx` (tone, real styling; no hex or arbitrary values). Props are structural. Re-run 7.7 green. Commit `feat(ui): add the catalog molecules`.
- [ ] 7.9 REFACTOR [FRONT] Tidy; tests stay green. Split rule: if production passes 400, move `ConditionsNote`, `Breadcrumb`, `TeacherBlock` to C4-F0c.
- [ ] 7.10 GATE [FRONT] Full local gate (rebase on `origin/main` first).
- [ ] 7.11 Visual check [FRONT] N/A for this slice: no route renders these components yet (deferred to C4-F1, recorded in the PR body).
- [ ] 7.12 PR [FRONT] Open PR C4-F0a to `main`.
- [ ] 7.13 [OWNER] Review and merge C4-F0a.

## Phase 8: C4-F0b cards, grid, listing template, DateBadge parts (FRONT)

Branch `feat/public-catalog-ui-cards`. Needs: C4-F0a merged. Traces: IP "Card content", "Date badge", "Policy note"; TP "Card content"; HP "Populated list (component contract)"; PC9.

- [ ] 8.1 RED [FRONT] Update `src/app/ui/molecules/info-items.ui.test.tsx` and the `upcomingItemFixture` in `src/testing/fixtures/` for `DateBadge({ dateTime, weekday?, day, month, label })`: it renders the given parts verbatim, makes no `Intl` or `toLocaleDateString` call, and its `time` element has `label` as accessible name. `UpcomingItem.date` becomes the parts object and gains `detail?` and `badge?`. Run `corepack pnpm test src/app/ui/molecules`; record the failure. Covers IP "Date badge" (component half), HP "Populated list (component contract)".
- [ ] 8.2 GREEN [FRONT] Modify `src/app/ui/molecules/contact-item.tsx` (`DateBadge`; read by `date-badge.tsx`), `src/app/ui/molecules/date-badge.tsx`, `src/app/ui/molecules/upcoming-item.tsx` and the `upcomingItemFixture` file under `src/testing/fixtures/`. Re-run 8.1 green. Commit `refactor(ui): render preformatted date badge parts`.
- [ ] 8.3 RED [FRONT] Create ui tests with axe: `src/app/ui/molecules/activity-card.ui.test.tsx` extension (`schedule?`, `badge?`), `src/app/ui/organisms/gallery-grid.ui.test.tsx` extension (`heading` optional renders only grid and dialog), `src/app/ui/molecules/taller-card.ui.test.tsx` (open, paused, no-offering states; "Cupo limitado" absent when paused or without an offering; no fee when no offering), `src/app/ui/molecules/intensivo-card.ui.test.tsx` (date badge, duration, price, deposit, materials badge only when included, `ConditionsNote` without minimum seats line), `src/app/ui/organisms/catalog-grid.ui.test.tsx` (items and empty state with action), `src/app/ui/templates/catalog-listing-page.ui.test.tsx` (`page: true`, one `h1`). Run `corepack pnpm test src/app/ui`; record the failures. Covers TP "Card content", "Paused card", "Card without offering"; IP "Card content", "No materials badge", "Paused card", "Single h1" (component half); TP "Single h1" (component half).
- [ ] 8.4 GREEN [FRONT] Create `src/app/ui/molecules/{taller-card,intensivo-card}.tsx`, `src/app/ui/organisms/catalog-grid.tsx`, `src/app/ui/templates/catalog-listing-page.tsx`; extend `src/app/ui/molecules/activity-card.tsx` and `src/app/ui/organisms/gallery-grid.tsx`; create `src/testing/fixtures/catalog.ts` (loader-data fixtures importing the BACK builders). Mobile first: single column at 360 px, 2-3 columns from `md`, touch targets `min-h-11`; card images lazy. Re-run 8.3 green. Commit `feat(ui): add the catalog cards and listing template`.
- [ ] 8.5 REFACTOR [FRONT] Tidy; tests stay green.
- [ ] 8.6 GATE [FRONT] Full local gate.
- [ ] 8.7 Visual check [FRONT] N/A for this slice (no route yet; deferred to C4-F1, recorded in the PR body).
- [ ] 8.8 PR [FRONT] Open PR C4-F0b to `main` (`size:exception` for tests if needed).
- [ ] 8.9 [OWNER] Review and merge C4-F0b.

## Phase 9: C4-F1 intensivos listing and detail (FRONT)

Branch `feat/public-intensivos-pages`. Needs: C4-F0b, C4-B1 and C4-B2 merged (change-3 B2a, B3, B7 transitively). Traces: IP (all), SEO "Template", "Uniqueness", "Missing description", "Detail built from the activity", "OG set", "Activity cover", "Activity without cover", "Catalog pages follow the gate", "Catalog pages while the gate is off"; PL; P2, P8, P9, P10, P12.

- [ ] 9.1 RED [FRONT] Create `src/app/catalog/whatsapp.test.ts`: `buildActivityWhatsAppUrl` decoded `text` contains the activity name (and, for turnos, weekday and time "lunes de 10:00 a 12:00 h"); a name with `&`, `?`, `#` and a newline is encoded safely and the host is `wa.me`; an invalid number falls back to the Instagram link labelled "Seguinos en Instagram"; the paused template names the activity. Run `corepack pnpm test src/app/catalog/whatsapp.test.ts`; record the failure. Covers IP "Open intensivo CTA"; TP "Open taller CTA", "Turno in the message"; P8.
- [ ] 9.2 GREEN [FRONT] Create `src/app/catalog/whatsapp.ts` (uses `buildWhatsAppUrl` and `fillCopyTemplate`; the number appears only inside links). Re-run 9.1 green. Commit `feat(app): add catalog WhatsApp links`.
- [ ] 9.3 RED [FRONT] Extend `src/app/seo/meta.test.ts`: `buildPageMeta` accepts `ogImage` (default `SHARE_IMAGE_PATH`); `truncateDescription(text, 160)` cuts at the last word boundary within 159 characters and appends "…" and leaves short text intact. Run `corepack pnpm test src/app/seo/meta.test.ts`; record the failure. Covers SEO "Detail built from the activity", "OG set", "Activity cover", "Activity without cover".
- [ ] 9.4 GREEN [FRONT] Modify `src/app/seo/meta.ts`. Re-run 9.3 green. Commit `feat(seo): add ogImage and description truncation`.
- [ ] 9.5 RED [FRONT] Create `src/app/catalog/mappers.test.ts` (intensivo half): read model to plain props with `formatPesos` strings (no `Money` instance; `JSON.parse(JSON.stringify(x))` equals `x`), `dateBadgeParts`, duration, time range, materials badge only when included, paused flag, stand-in `fallbackImage` with alt `""` when no images, `GalleryEntry` key `` `${index}-${src}` `` unique when the same asset repeats, alt text kept from the image. Run it; record the failure. Covers IP "Price and deposit", "Card content", "No materials badge", "No images", "Alt text".
- [ ] 9.6 GREEN [FRONT] Create `src/app/catalog/mappers.ts` (intensivo mappers). Re-run 9.5 green. Commit `feat(app): add the intensivo mappers`.
- [ ] 9.7 RED [FRONT] Create route tests `src/app/routes/intensivos.test.tsx` and `src/app/routes/intensivos.ui.test.tsx`: loader with `createTestServices({ publicCatalog })` returns plain data in date order; empty gives 200 and the empty state with the Instagram/WhatsApp action and "Talleres intensivos" heading; a throwing reader rethrows (not an empty state); one `h1`; no `form`, no filter or sort controls; `/intensivos?desde=2026-11-01&orden=precio` renders the same cards as `/intensivos`; the policy text is visible on the card and "Se realiza con un mínimo de" is absent on the card; paused card shows "Inscripciones pausadas" and no "Cupo limitado"; order unchanged by pause; meta unique with `noindex` while the gate is off and none when on; serialized loader data (built with `createSeededPublicCatalog(fullyPopulatedSeed())`) has none of the PC14 sentinels. Run `corepack pnpm test src/app/routes/intensivos`; record the failures. Covers IP "Cards in date order", "Card content", "No materials badge", "Policy note", "Single h1", "No filters or sort controls", "Empty list", "Cupo limitado", "Paused hides seats", "Paused card", "Order unchanged by pause", "Gate off", "Gate on", "Copy scan", "Accessibility", "Serialized data has no internals"; SEO "Catalog pages follow the gate", "Catalog pages while the gate is off", "Template", "Uniqueness"; P1, P10, P12.
- [ ] 9.8 RED [FRONT] Create `src/app/routes/intensivo.test.tsx` and `src/app/routes/intensivo.ui.test.tsx`: loader `findBySlug(params.slug)` returns data; `null` throws `data(null, { status: 404 })` with the same body for unknown, draft, cancelled, archived and past slugs (P2, P3) and for a malformed slug; a throwing reader gives the 500 boundary with no internals (P9); detail shows breadcrumb, h1, date line, duration, time range, teacher, price, deposit, "Cupo limitado" only when open, materials, the policy text and "Se realiza con un mínimo de N personas" visible (not inside `<details>`); "Consultá por WhatsApp" link only when open; paused detail shows `PausedNotice` with "Escribinos por WhatsApp" and no inquiry CTA; no registration form; heading order h1 then h2; "Intensivos" menu entry has `aria-current` on the detail; meta title is the activity name, description at most 160 characters, canonical `/intensivos/<slug>`, `og:image` from the cover and the default share image when none; `JSON.parse(JSON.stringify(loaderData))` equals the data. Run `corepack pnpm test src/app/routes/intensivo`; record the failures. Covers IP "Full detail", "Minimum seats text", "Heading order", "Open intensivo CTA", "No registration form", "Unknown slug", "Cancelled, archived, draft and past", "Placeholder reader", "Paused detail", "Detail meta from the activity", "Active menu entry on detail", "Alt text", "No images"; SEO "Detail built from the activity", "Activity cover", "Activity without cover".
- [ ] 9.9 GREEN [FRONT] Create `src/app/routes/intensivos.tsx`, `src/app/routes/intensivo.tsx`, `src/app/ui/templates/intensivo-detail-page.tsx`; modify `src/app/routes.ts` (add `intensivos` and `intensivos/:slug` siblings inside the pathless layout); modify `src/app/routes/coming-soon.tsx` (remove `"intensivos"` from `supportedSlugs`) and its test; modify `src/app/site-map.ts` (`intensivos` `indexable: true`) and `src/app/site-map.test.ts` (five static indexable pages, `/intensivos/:slug` mapped, catalog SEO unique, uniqueness test moved from coming-soon SEO). Re-run 9.7 and 9.8 green. Commit `feat(app): add the intensivos pages`.
- [ ] 9.10 VERIFY [FRONT] Record in the PR body: React Router typegen gives `params.slug: string` for `intensivos/:slug`; a thrown `data(null, { status: 404 })` renders the layout boundary with status 404 for document and `.data` requests; loader results are plain values.
- [ ] 9.11 DOCS [FRONT] Modify `docs/design/deviation-register.md`: narrow T1/A7 to `/eventos-privados` for intensivos.
- [ ] 9.12 GATE [FRONT] Full local gate (rebase on `origin/main` first).
- [ ] 9.13 Visual check [FRONT] `corepack pnpm dev` with a seeded open intensivo, a paused one and an empty catalog: real-browser screenshots at 360, 1024 and 1440 px of `/intensivos` and `/intensivos/<slug>` (open, paused, empty, detail 404); also the cards from C4-F0b in situ. Check no horizontal scroll at 360 px and touch targets. Attach to the PR before opening it.
- [ ] 9.14 MANUAL [FRONT] Real WhatsApp link opens with the prefilled text on a phone (the number is provisional; record the result).
- [ ] 9.15 PR [FRONT] Open PR C4-F1 to `main` (`size:exception` for tests; split rule: detail to C4-F1b, merge the same day).
- [ ] 9.16 [OWNER] Review and merge C4-F1. The two intros stay unapproved drafts until owner approval.

## Phase 10: C4-F2 talleres listing and detail (FRONT)

Branch `feat/public-talleres-pages`. Needs: C4-F0b, C4-B1 and C4-B3 merged (change-3 B6 transitively). Traces: TP (all), SEO catalog rows; PL; P1-P3, P8-P10, P12.

- [ ] 10.1 RED [FRONT] Extend `src/app/catalog/mappers.test.ts` (taller half): read model to plain props with the fee "$ 58.000 / mes" on the card, "Cuota mensual" on the detail, "Próximamente abrimos inscripciones" and no fee when there is no offering, turnos with weekday names and "10:00 a 12:00 h" and derived class length ("2 horas", whole hours), per-turno inquiry links, seats "Cupo limitado" only when open with an offering, paused precedence, stand-in when no images, project section only when present, `JSON.parse(JSON.stringify(x))` equals `x`. Run `corepack pnpm test src/app/catalog/mappers.test.ts`; record the failure. Covers TP "Card fee format", "Detail fee format", "Card without offering", "Detail without offering", "Class length derived", "Whole hours", "No project", "Turno in the message", "Taller without images", "Alt text".
- [ ] 10.2 GREEN [FRONT] Extend `src/app/catalog/mappers.ts` (taller mappers). Re-run 10.1 green. Commit `feat(app): add the taller mappers`.
- [ ] 10.3 RED [FRONT] Create `src/app/routes/talleres.test.tsx` and `src/app/routes/talleres.ui.test.tsx`: one card per visible taller in name order; card content (image or stand-in, name, teacher, summary, compact turnos, fee, seats); empty state; one `h1`; no filters (`/talleres?franja=manana&tecnica=ceramica` renders the same cards in the same order as `/talleres`); paused card; no-offering card; meta unique with `noindex` while the gate is off and none when on; throwing reader rethrows; sentinel scan of the serialized loader data. Run `corepack pnpm test src/app/routes/talleres`; record the failures. Covers TP "One card per visible taller", "Card content", "Single h1", "No filters in v1", "Empty list", "Card without offering", "Cupo limitado", "Unknown availability", "Not shown when paused or without offering", "Paused card", "Paused precedence", "Gate off", "Gate on", "Copy scan", "Accessibility", "Serialized loader data"; P1, P10, P12.
- [ ] 10.4 RED [FRONT] Create `src/app/routes/taller.test.tsx` and `src/app/routes/taller.ui.test.tsx`: detail with breadcrumb, h1, description, teacher, all turnos with seats, fee or notice, CTA or `PausedNotice`, project section (`ProjectSection` heading "Proyectos que vamos a realizar" and its images) only when a project exists, gallery; "Consultá por WhatsApp" only when open and a link per turno; no enrollment form; heading order; unknown, draft, archived and malformed slugs throw the same 404 and render identical bodies (P3); a throwing reader gives the 500 boundary; "Talleres" menu entry `aria-current` on the detail; meta from the activity (title, description at most 160, canonical `/talleres/<slug>`, `og:image` from the cover). Run `corepack pnpm test src/app/routes/taller`; record the failures. Covers TP "Full detail", "Class length derived", "Whole hours", "No project", "Heading order", "Open taller CTA", "Turno in the message", "No enrollment form", "Paused detail", "Detail without offering", "Unknown slug", "Draft and archived", "Placeholder reader", "Detail meta from the activity", "Active menu entry on detail"; SEO "Detail built from the activity".
- [ ] 10.5 GREEN [FRONT] Create `src/app/routes/talleres.tsx`, `src/app/routes/taller.tsx`, `src/app/ui/templates/taller-detail-page.tsx`, `src/app/ui/organisms/project-section.tsx` (with its `project-section.ui.test.tsx` written in 10.4's run); modify `src/app/routes.ts` (add `talleres` and `talleres/:slug`); modify `src/app/routes/coming-soon.tsx` (remove `"talleres"`) and its test; modify `src/app/site-map.ts` (`talleres` `indexable: true`) and `src/app/site-map.test.ts` (five static indexable pages after both catalog pages flip: the three from change 2 plus talleres and intensivos). Re-run 10.1, 10.3 and 10.4 green. Commit `feat(app): add the talleres pages`.
- [ ] 10.6 DOCS [FRONT] Modify `docs/design/deviation-register.md`: T1/A7 narrowed to `/eventos-privados` for talleres.
- [ ] 10.7 GATE [FRONT] Full local gate (rebase on `origin/main` first).
- [ ] 10.8 Visual check [FRONT] `corepack pnpm dev` with a seeded open taller (several turnos, a project, images), a paused one, a no-offering one and an empty catalog: real-browser screenshots at 360, 1024 and 1440 px of `/talleres` and `/talleres/<slug>` in each state, plus the 404. Attach to the PR before opening it.
- [ ] 10.9 MANUAL [FRONT] A per-turno WhatsApp link on a phone carries the weekday and time.
- [ ] 10.10 PR [FRONT] Open PR C4-F2 to `main` (`size:exception` for tests; split rule: detail to C4-F2b, merge the same day).
- [ ] 10.11 [OWNER] Review and merge C4-F2.

## Phase 11: C4-F3 dynamic Inicio (FRONT)

Branch `feat/public-catalog-home`. Needs: C4-F0b, C4-B0 and C4-B1 merged (may merge before the real readers). Traces: HP (all); PC13; P10.

- [ ] 11.1 RED [FRONT] Extend `src/app/catalog/mappers.test.ts` (Inicio half): taller read model to `ActivityCard` props with image or stand-in, title, summary, `schedule` of at most two turnos ("Lunes, 10:00 a 12:00 h · Miércoles, 18:00 a 20:00 h") plus "y N turnos más", paused `badge` "Inscripciones pausadas", link "Ver taller" to `/talleres/<slug>`, and no price; intensivo read model to `UpcomingItem` props with `dateBadgeParts`, title, time range `detail`, paused badge, link "Ver intensivo". Run `corepack pnpm test src/app/catalog/mappers.test.ts`; record the failure. Covers HP "Card content without price", "Paused taller on Inicio", "Items ordered as given".
- [ ] 11.2 GREEN [FRONT] Extend `src/app/catalog/mappers.ts`. Re-run 11.1 green. Commit `feat(app): add the Inicio catalog mappers`.
- [ ] 11.3 RED [FRONT] Extend `src/app/routes/home.test.tsx` and its ui test: loader calls `talleres.list({ limit: 3 })` and `intensivos.list({ limit: 3 })` in parallel with content and profile; empty readers render today's output (empty states); with data the sections show up to 3 cards and items, with no `$` digit pattern and no clock pattern outside the catalog data; a throwing reader makes the loader throw; the 4th visible taller and expired or invisible intensivos are absent; text outside the activity sections is unchanged (scan). Run `corepack pnpm test src/app/routes/home`; record the failures. Covers HP "Empty list", "Populated list (component contract)", "Loader reads the reader", "Card content without price", "Paused taller on Inicio", "Placeholder reader", "Empty intensivos", "Items ordered as given", "Expired and invisible excluded", "Text scan outside the activity sections", "Currency never on Inicio", "Clock patterns only from the catalog"; PCR "First three"; P10.
- [ ] 11.4 GREEN [FRONT] Modify `src/app/routes/home.tsx`. Re-run 11.3 green. Commit `feat(app): load Inicio activities from the catalog`.
- [ ] 11.5 VERIFY [FRONT] On the preview or locally, measure the Inicio sessions (about six) through Hyperdrive; record latency in the PR body and the decision on the request-scoped session memo (design 13.3).
- [ ] 11.6 GATE [FRONT] Full local gate.
- [ ] 11.7 Visual check [FRONT] `corepack pnpm dev`: real-browser screenshots at 360, 1024 and 1440 px of `/` with the empty readers (must equal today's output) and with seeded talleres and intensivos (open and paused).
- [ ] 11.8 PR [FRONT] Open PR C4-F3 to `main`.
- [ ] 11.9 [OWNER] Review and merge C4-F3. Open question for the owner (non-blocking): should Inicio drop the two sections instead of the 500 page if the database fails (design 14)?

## Phase 12: C4-F4 Event JSON-LD, dynamic sitemap, deviation rows (FRONT)

Branch `feat/public-catalog-seo`. Needs: C4-F1 and C4-F2 merged. Traces: ESD (all); SEO "Sitemap" scenarios; P5, P7, P9.

- [ ] 12.1 RED [FRONT] Extend `src/app/seo/json-ld.test.ts` with `buildEventJsonLd` shape tables: one object with `@type` `Event`, `name`, `description`; `startDate`/`endDate` as `${date}T${startsAt}:00-03:00` and `...:00-03:00` for the end; `location` `Place` with the profile name and the shared `PostalAddress`; `organizer`; `eventStatus` `EventScheduled` and `eventAttendanceMode` `OfflineEventAttendanceMode`; `performer` only with a teacher; `image` an array of absolute https URLs in position order, and exactly `[canonicalUrl(base, SHARE_IMAGE_PATH)]` with no images (never a stand-in SVG); open `offers` has `LimitedAvailability`, paused `OutOfStock`, `SoldOut` never present in the serialized object in either state; price 45000 and deposit 15000 give `offers.price` `"45000"` and no `price` of 15000 anywhere; no `remainingAttendeeCapacity` or `maximumAttendeeCapacity`; a name containing `</script>` serializes without `<`; fully populated sentinel fixture serializes with no PC14 sentinel; no JSON-LD builder exists for monthly talleres (a taller detail has no `application/ld+json` of type `Event`). Run `corepack pnpm test src/app/seo/json-ld.test.ts`; record the failure. Covers ESD "One object", "Dates carry the Cordoba offset", "Location from the profile", "Mode and status", "Images are absolute", "Fallback image", "Open offer", "Paused offer", "Unknown seats", "Deposit is not the price", "Fully populated fixture", "Script-breaking name", "No invented dates", "No fee without an offering", "Privacy", "Shape test exists"; P1, P5.
- [ ] 12.2 GREEN [FRONT] Modify `src/app/seo/json-ld.ts` (`EventInput`, `buildEventJsonLd`, `buildPostalAddress` refactored out of LocalBusiness; offset constant mirrors DA6). Re-run 12.1 green. Commit `feat(seo): add the Event structured data builder`.
- [ ] 12.3 RED [FRONT] Extend `src/app/routes/intensivo.test.tsx` (route stub): the success branch contains exactly one `application/ld+json` of type `Event`; an unknown slug and an invisible (draft) slug render the 404 boundary with no Event script; `/intensivos` and `/` contain no Event script. Run `corepack pnpm test src/app/routes/intensivo`; record the failure. Covers ESD "One object", "404 emits none".
- [ ] 12.4 GREEN [FRONT] Modify `src/app/routes/intensivo.tsx` (map the read model to `EventInput`, embed through `JsonLdScript` on success only). Re-run 12.3 green. Commit `feat(app): embed Event JSON-LD on the intensivo detail`.
- [ ] 12.5 RED [FRONT] Extend `src/app/routes/sitemap.test.ts`: static paths first, then `/talleres/<slug>` and `/intensivos/<slug>` from `listSlugs()` (both read in parallel); paused activities listed; draft, cancelled, past absent; slugs XML-escaped (P7); never `/eventos-privados`, `/admin`, `/status`; content type `application/xml`; with empty readers only static entries; a throwing reader returns the static entries with `Cache-Control: public, max-age=300` and logs only the constant `"sitemap: catalog read failed"` (no error text, P9); normal response keeps `max-age=3600`. Run `corepack pnpm test src/app/routes/sitemap.test.ts`; record the failure. Covers SEO "Static entries with an empty catalog", "Detail entries", "Paused activities are listed", "Invisible activities excluded", "Excluded routes", "Content type"; PCR "Enumeration matches visibility" (delivery half).
- [ ] 12.6 GREEN [FRONT] Modify `src/app/routes/sitemap.ts` (dynamic entries, degrade path, fix the type import to `./+types/sitemap`). Re-run 12.5 green. Commit `feat(app): add catalog entries to the sitemap`.
- [ ] 12.7 DOCS [FRONT] Modify `docs/design/deviation-register.md` with the rows of design 10.5: C1 seats ("Cupo limitado" until change 5), C2 interim WhatsApp, C3 intensivo detail page, C6 no filters, C7 summary on cards, the no-structured-data-for-monthly-talleres row, the stand-in visuals row, the admin-entered-text-is-data row.
- [ ] 12.8 VERIFY [FRONT] Record in the PR body: current Google Search Central Event requirements (required `name`, `startDate`, `location`; recommended `image`), the `offers.availability` values, whether the Course Info rich result is retired; validate one generated intensivo object in the Rich Results Test code-snippet mode; the sitemap resource route works behind Access on the preview.
- [ ] 12.9 GATE [FRONT] Full local gate (rebase on `origin/main` first).
- [ ] 12.10 Visual check [FRONT] N/A for UI (no visual change); runtime harness: `corepack pnpm dev`, `GET /sitemap.xml` shows static plus seeded entries, and the intensivo page source shows one Event script.
- [ ] 12.11 PR [FRONT] Open PR C4-F4 to `main`.
- [ ] 12.12 [OWNER] Review and merge C4-F4. After this merge the change is ready for verify and archive; the indexing gate stays OFF (change 8 opens it).

---

## Spec scenario traceability

Task IDs refer to the RED task that proves the scenario (the GREEN task that follows implements it).

| Spec | Requirement: scenarios | Tasks |
|------|------------------------|-------|
| PCR | Actorless public access: Call without an actor, No mutation surface | 1.1, 1.3, 3.9, 4.5 |
| PCR | Visibility rule: Only visible statuses listed, Invisible slug lookup, Paused keeps its place | 3.9, 4.5, 3.12, 4.8 |
| PCR | Intensivos expire by Cordoba date: Past intensivo hidden, Today still visible, Cordoba boundary near UTC midnight | 3.1, 3.3, 3.9 |
| PCR | Intensivos ordering: Nearest first, Same date tie-break, Limit | 3.3, 3.9 |
| PCR | Monthly offering period selection: Current month open, Current month not open next open, Earliest later open month, No open month, Past month ignored, Month boundary uses Cordoba time | 4.1, 4.5 (clock from 3.1) |
| PCR | Turno ordering and capacity: Ordering, Capacity from the offering, Capacity without an offering | 4.1, 4.5 |
| PCR | Seats contract: Available is unknown, Capacity is not availability | 1.1, 4.5, 7.3 |
| PCR | Public projection and privacy allowlist: Fully populated fixture serialization (taller), (intensivo), Teacher exposure, Draft data stays out | 3.5, 3.10, 4.6, 6.1 |
| PCR | Lookup by slug: Known visible slug, Unknown slug, Slug is not cross-type | 3.9, 4.5 |
| PCR | Taller listing order: Name order, First three | 4.1, 4.5, 11.3 |
| PCR | Visible slug enumeration: Enumeration matches visibility | 3.9, 4.5, 12.5 |
| PCR | Fail-soft placeholder: Placeholder returns empty, Real adapter failure is not hidden | 1.3, 1.7, 3.10, 4.6, 9.7, 10.3 |
| PCR | Adapter parity: Same suite, both adapters | 3.12, 4.8 |
| TP | Talleres listing content: One card per visible taller, Card content, Single h1, No filters in v1 | 8.3, 10.3 |
| TP | Talleres listing empty state: Empty list | 10.3 |
| TP | Fee and time formats: Card fee format, Detail fee format, Time range format, Weekday names | 7.1, 10.1 |
| TP | No open month: Card without offering, Detail without offering | 10.1, 10.3, 10.4 |
| TP | Seats indicator: Cupo limitado, Unknown availability, Not shown when paused or without offering | 7.3, 7.7, 10.3 |
| TP | Paused state: Paused card, Paused detail, Paused precedence | 7.3, 8.3, 10.3, 10.4 |
| TP | Taller detail content: Full detail, Class length derived, Whole hours, No project, Heading order | 7.1, 10.1, 10.4 |
| TP | Interim WhatsApp call to action: Open taller CTA, Turno in the message, No enrollment form | 9.1, 10.4 |
| TP | Detail 404: Unknown slug, Draft and archived, Placeholder reader | 10.4 |
| TP | Images and stand-ins: Taller without images, Alt text | 10.1 |
| TP | Page metadata and indexing: Detail meta from the activity, Gate off, Gate on | 9.3, 10.3, 10.4 |
| TP | Copy rules and layout: Copy scan, Accessibility, Active menu entry on detail | 7.5, 10.3, 10.4 |
| TP | Privacy in responses: Serialized loader data | 10.3 |
| IP | Intensivos listing content: Cards in date order, Card content, No materials badge, Policy note, Single h1, No filters or sort controls | 7.7, 8.3, 9.5, 9.7 |
| IP | Intensivos listing empty state: Empty list | 9.7 |
| IP | Price, deposit, date and time formats: Price and deposit, Date badge, Duration forms, Time range | 7.1, 8.1, 9.5 |
| IP | Intensivo seats indicator: Cupo limitado, Paused hides seats | 7.3, 9.7 |
| IP | Intensivo paused state: Paused card, Paused detail, Order unchanged by pause | 8.3, 9.7, 9.8 |
| IP | Intensivo detail content: Full detail, Minimum seats text, Heading order | 7.7, 9.8 |
| IP | Intensivo interim WhatsApp call to action: Open intensivo CTA, No registration form | 9.1, 9.8 |
| IP | Intensivo detail 404: Unknown slug, Cancelled archived draft and past, Placeholder reader | 9.8 |
| IP | Intensivo images and stand-ins: No images, Alt text | 9.5, 9.8 |
| IP | Intensivos page metadata and indexing: Detail meta from the activity, Gate off, Gate on | 9.3, 9.7, 9.8 |
| IP | Intensivos copy, layout and privacy: Copy scan, Accessibility, Active menu entry on detail, Serialized data has no internals | 7.5, 9.7, 9.8 |
| ESD | One Event per intensivo detail page: One object, 404 emits none | 12.1, 12.3 |
| ESD | Required Event fields: Dates carry the Cordoba offset, Location from the profile, Mode and status, Images are absolute, Fallback image | 12.1 |
| ESD | Offers mapping: Open offer, Paused offer, Unknown seats, Deposit is not the price | 12.1 |
| ESD | Event privacy: Fully populated fixture | 12.1 |
| ESD | Safe serialization: Script-breaking name | 12.1 |
| ESD | Monthly taller structured data: No invented dates, No fee without an offering, Privacy | 12.1, 10.4 |
| ESD | Structured data validity checks: Shape test exists | 12.1, 12.8 |
| SEO | Per-route title and description: Template, Uniqueness, Missing description, Detail built from the activity | 2.3, 9.3, 9.7, 9.8, 10.4 |
| SEO | Open Graph and Twitter cards: OG set, Activity cover, Activity without cover | 9.3, 9.8 |
| SEO | Indexing gate: Gate off, Gate on, Próximamente always noindex, Catalog pages follow the gate, Catalog pages while the gate is off, Default is off | 5.1, 9.7, 10.3 (existing gate tests stay green in every gate) |
| SEO | Sitemap: Static entries with an empty catalog, Detail entries, Paused activities are listed, Invisible activities excluded, Excluded routes, Content type | 12.5 |
| HP | Talleres mensuales showcase: Empty list, Populated list, Loader reads the reader, Card content without price, Paused taller on Inicio, Placeholder reader | 8.1, 11.1, 11.3 |
| HP | Próximos intensivos list: Empty intensivos, Items ordered as given, Loader reads the reader, Expired and invisible excluded, Placeholder reader | 11.1, 11.3 |
| HP | No invented facts: Text scan outside the activity sections, Currency never on Inicio, Clock patterns only from the catalog | 11.3 |
| PL | Próximamente pages: Eventos privados title, noindex and sitemap exclusion, Active state on placeholder, Talleres and Intensivos are not placeholders | 5.1, 9.9, 10.5, 12.5 |

Threat-matrix coverage (design 9.2): P1 3.10, 4.6, 9.7, 10.3, 12.1; P2 3.9, 4.5, 9.8, 10.4; P3 10.4; P4 3.3, 3.9; P5 12.1; P6 7.7; P7 12.5; P8 9.1; P9 9.8, 12.5; P10 9.7, 10.3, 11.3; P11 1.1, 7.3; P12 9.7, 10.3.
