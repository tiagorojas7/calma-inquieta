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
| 5 C4-B4 retire coming-soon entries                                 | PL         | inline | skipped, blocked: needs C4-F2 merged                                     | none    |
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
