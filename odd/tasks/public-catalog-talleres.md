# public-catalog talleres half: C4-B3 talleres reader

Objective: change 4 (public-catalog), talleres half, backend slice C4-B3 (C4-F2, C4-F3 and C4-F4 talleres parts remain FRONT work). Branch `feat/public-catalog-talleres`, delivery `stacked-to-main`, test runner `corepack pnpm test <path>`.

## Specs

- S1 (PCR, Monthly offering period selection): "the period for the current Cordoba month if that month is open; otherwise the earliest open period for a later month; otherwise none. Periods for past months MUST NOT be selected." and "When none is selected, the taller's offering MUST be null, and the reader MUST NOT substitute any default fee."
- S2 (PCR, Turno ordering and capacity): "ordered by weekday (Monday first, Sunday last), then by start time ascending ... The capacity MUST come from the selected offering period; when the offering is null, each turno's capacity MUST be null."
- S3 (PCR, Seats contract): "`available` MUST be null for all of them. The reader MUST NOT derive `available` from capacity."
- S4 (PCR, Public projection and privacy allowlist): "The public models MUST NOT carry any teacher commission percentage, modality, teacher phone, teacher email, audit field (creator, updater, timestamps of edits), period snapshot field, or any draft data."
- S5 (PCR, Visibility rule, Lookup by slug, Visible slug enumeration): only published and paused are public; an unknown, invisible or cross-type slug is null; `listSlugs` matches visibility.
- S6 (PCR, Taller listing order): name order (collator), `limit` after sorting.
- S7 (PCR, Fail-soft placeholder): "Real adapter failure is not hidden".
- S8 (PCR, Adapter parity): same suite on both adapters.
- DA1: "A taller's public turnos are the workshop's **active** turnos. With an offering, only the active turnos that the selected period holds are shown, with that period's capacity. Without an offering, every active turno is shown with capacity `null`."
- DA2: "A period project is public only for the selected period, and only when its title, its description or its image list is non-empty."

## Tasks

| ID                                                                 | S#         | Route  | Status                                                                   | Commit  |
| ------------------------------------------------------------------ | ---------- | ------ | ------------------------------------------------------------------------ | ------- |
| 4.1-4.2 rules `selectOffering`, `compareTurnos`, `compareTalleres` | S1, S2, S6 | inline | done                                                                     | see Log |
| 4.3-4.4 in-memory taller records, seed, builders                   | S8         | inline | done                                                                     | see Log |
| 4.5-4.7 contract suite, reader, privacy                            | S1-S7      | inline | done                                                                     | see Log |
| 4.8-4.9 Drizzle taller records, DB seed                            | S8         | inline | done                                                                     | see Log |
| 4.10-4.11 composition wiring                                       | S7         | inline | done                                                                     | see Log |
| 10.1-10.2 taller mappers (branch `-pages`)                         | TP         | inline | done                                                                     | 455b562 |
| 10.3-10.5 talleres pages, routes, site map, coming-soon            | TP, SEO    | inline | done                                                                     | see Log |
| 5 C4-B4 retire coming-soon entries                                 | PL         | inline | skipped: needs C4-F2 merged and overlaps the front redesign (see Log)    | none    |
| 6 C4-B5 real media lookup                                          | DA4        | inline | skipped, blocked: no Drizzle `MediaLookup` and no R2 bucket (R1) on main | none    |

## Log

- L1: Slice C4-B3 talleres reader (backend), plus C4-B4 and C4-B5 only if not merged and they fit.
- Prerequisite gap (stop condition 2, absorbed): `src/platform/db/schema/workshops.ts` has no `workshop_image` or `period_project_image` table (admin images are not persisted: `drizzle-monthly-workshop-repository.ts` returns `images: []`, periods defer project images to B6b). The Drizzle taller records therefore return empty galleries, run 4 statements (workshops, turnos, periods, capacities) instead of the planned 6, and the contract suite skips its two image cases for Drizzle through `storesImages: false`. The in-memory adapter runs them.
- Decision: the contract suite takes `{ storesImages }`; the Drizzle db test asserts the empty galleries explicitly so the gap is visible and not silent.
- Decision: the DB seed inserts a placeholder teacher when a period snapshot points at a teacher the seed does not hold (foreign key).
- C4-B4: the `talleres` coming-soon entry is still needed because the `/talleres` route is still the placeholder (C4-F2 not merged). Skipped.
- C4-B5: `MediaLookup` is an interface only; no Drizzle implementation exists on main and change-3 B2b/R1 are not done. Skipped.
- RED evidence: rules 8 failed (functions missing); fake records 5 failed (`createInMemoryPublicTallerRecords is not a function`); reader suites failed to load (`Cannot find module ./public-talleres-reader`); composition 2 failed (`promise resolved "[]" instead of rejecting`, `expected [] to deeply equal [ 'ceramica' ]`). The Drizzle records adapter was written before its db test was first run, so it has no separate RED.
- Differences kept: taller records are not date-bound, so `listVisibleSlugs()` takes no argument (port already so).
- C4-F2 (branch `feat/public-catalog-talleres-pages`, stacked on PR #68): request was "C4-F2 talleres listing and detail pages (tasks.md Phase 10), plus C4-B4 in the same PR if it becomes possible".
- C4-F2 decisions: the card lists every turno (weekday and time range, no duration); "y N turnos mas" stays Inicio-only. The detail lists turnos with duration, per-turno seats ("Cupo limitado" only open with an offering) and a per-turno inquiry link only when the taller is not paused. An open taller without an offering still shows the inquiry CTA and turno links with the notice "Proximamente abrimos inscripciones". Detail breadcrumb is Talleres, technique, name.
- C4-F2 deviation: the taller mapper tests are in the new `src/app/catalog/taller-mappers.test.ts` (not appended to `mappers.test.ts`) to keep the mappers file edit small.
- C4-F2 RED evidence: mappers 18 failed (functions missing); talleres/taller/project-section tests failed to load (module missing); coming-soon 1 failed ("no longer serves talleres"); site-map 2 failed (`indexable` and five sitemap entries); the existing `routes/sitemap.test.ts` also had to move from four to five entries (it failed after the flip).
- C4-B4 not done: retiring the `talleres` coming-soon entry edits `site-content/domain/page-content.ts`, `repository-content.test.ts`, `content-rules.test.ts`, `site-content.test.ts` and `in-memory-site-content-source.ts`, files that the front redesign branches (`feat/front-redesign-*`) also modify. Deferred to its own PR after both land. The route no longer serves the `talleres` coming-soon page; the content entry is dead until then.
- C4-F2 not done: 10.6 (`docs/design/deviation-register.md` is outside this slice's edit surface), 10.7 gate in CI, 10.8 visual check (no dev server, optional here), 10.9 manual phone check.
- C4-F4 talleres (branch `feat/public-catalog-talleres-seo`, stacked on main after #72 merged): request "Event JSON-LD for talleres, dynamic sitemap talleres rows, deviation rows if in your surface". S# covered: SEO (dynamic sitemap, degrade path, P7, P9), ESD "no structured data for monthly talleres".
- C4-F4 decision: design PC12 says monthly talleres get NO structured data, so no Event builder is written for talleres; a test pins that the taller detail embeds no `application/ld+json`. The intensivos Event builder (12.1-12.4) is not on main and belongs to the intensivos lane.
- C4-F4 decision: `routes/sitemap.ts` is shared; the dynamic loader reads both `talleres.listSlugs()` and `intensivos.listSlugs()` in parallel (the spec reads both together and the degrade path covers either failing), so intensivos rows land too.
- C4-F4 RED evidence: sitemap route test 3 failed (no catalog rows, no escape, `max-age=3600` instead of 300 on a throwing reader).
- C4-F4 not done: 12.7 deviation rows (`docs/design/deviation-register.md` outside this slice's surface), 12.8 Rich Results validation (no intensivo JSON-LD here), 12.1-12.4 intensivos Event JSON-LD.
