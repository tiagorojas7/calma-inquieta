# Apply progress: public-catalog

Mode: Strict TDD | Store: hybrid | Branch: `feat/public-catalog-contract` (from `origin/main` `1aeeb16`) | Slice: C4-B0 (Phase 1, tasks 1.1-1.9)

## Completed tasks

- [x] 1.1 - 1.9 (C4-B0 contract, empty readers, fakes, `AppServices.publicCatalog`)
- [ ] 1.10 GATE, 1.11 PR, 1.12 OWNER: left to the parent/owner

## TDD cycle evidence

| Task | Test file | Layer | RED | GREEN | Triangulate | Refactor |
|------|-----------|-------|-----|-------|-------------|----------|
| 1.1/1.2 | `src/modules/workshops/application/public-catalog.test.ts` | Unit + type | `corepack pnpm typecheck`: TS2307 module `./public-catalog` missing, TS2578 unused `@ts-expect-error` (vitest passes: type-only imports are erased) | 3/3 tests, typecheck and lint exit 0 | `available: null` accepted vs `3` rejected; 6 methods called with no actor | Clean |
| 1.3/1.4 | `src/composition/empty-public-catalog.test.ts` | Unit | `Cannot find module './empty-public-catalog'` | 5/5 | Both readers via `describe.each`, `limit` option, exact method keys | Clean |
| 1.5/1.6 | `src/testing/fakes/fake-public-catalog.test.ts` | Unit | `Cannot find module './fake-public-catalog'` | 6/6 (7 with the `createTestServices` case) | order, limit, exact slug, no cross-type, defaults, overrides | Shared `readerOf` helper |
| 1.7/1.8 | `src/composition/request-services.db.test.ts` | Integration | `TypeError: Cannot destructure property 'talleres' of 'services.publicCatalog' as it is undefined` | no-database case passes | n/a | Clean |

## Work unit evidence

| Evidence | Value |
|----------|-------|
| Focused tests | `corepack pnpm test src/modules/workshops src/composition/empty src/testing/fakes`: 8 files, 40 tests passed. `corepack pnpm typecheck`, `corepack pnpm lint`, prettier check: exit 0 |
| Runtime harness | N/A for this phase (parent runs 1.10) |
| Rollback boundary | Revert the four commits (additive files plus the `publicCatalog` member in `request-services.ts` and `app-services.ts`) |

## Deviations and risks

- Embedded PostgreSQL does not start on this machine, so the migrated-empty-database case of 1.7 and the 3 pre-existing db cases in `request-services.db.test.ts` could not run locally. The new no-database case does run.
- Factory signatures are exported as the types `CreatePublicTalleresReader` and `CreatePublicIntensivosReader` (not `declare function`), so no runtime export exists before C4-B2/B3. `PublicReaderDeps` is exported because those types reference it.
- Commit grouping: the `app-services.ts` default and the `createTestServices` test case ship with 1.8 (not 1.6), because `AppServices.publicCatalog` must exist for that file to typecheck.

---

# Slice C4-B1 catalog copy (Phase 2, tasks 2.1-2.5)

Mode: Strict TDD | Store: hybrid | Branch: `feat/public-catalog-copy` (stacked on C4-B0 `b85cfbe`) | Commits: `6359e3d`, `767fe1a`

## Completed tasks

- [x] 2.1 - 2.5 (copy template filler, `CatalogContent`, `catalog.ts`, `getCatalogContent`)
- [ ] 2.6 GATE, 2.7 PR, 2.8 OWNER: left to the parent/owner

## TDD cycle evidence

| Task | Test file | Layer | RED | GREEN | Triangulate | Refactor |
|------|-----------|-------|-----|-------|-------------|----------|
| 2.1/2.2 | `src/modules/site-content/domain/copy-template.test.ts` | Unit | import of `./copy-template` fails, no tests run | 8/8 | several keys, repeated key, missing key throws, unused value, no re-expansion, inherited `Object` key (own RED: did not throw, fixed with `Object.hasOwn`) | Clean |
| 2.3/2.4 | `src/modules/site-content/infrastructure/repository-content.test.ts` | Unit | 8 failed: `getCatalogContent is not a function`, `raw.catalog` undefined | 24/24 | literals, copy scan, exact placeholders, filled templates, fallback image, SEO distinctness (8 distinct), intros unapproved | Clean |
| 2.3/2.4 | `src/modules/site-content/domain/content-rules.test.ts` | Unit | 5 failed (catalog SEO, fallback image, duplicate intro id, `catalog:intros`) | all passed | empty SEO on both pages, unregistered fallback, decorative alt, duplicate id | Clean |

## Work unit evidence

| Evidence | Value |
|----------|-------|
| Focused tests | `corepack pnpm test src/modules/site-content src/testing/fakes src/app/routes`: 26 files, 182 tests passed. typecheck, lint, `prettier --check src` exit 0 |
| Runtime harness | N/A (parent runs 2.6); no route changed |
| Rollback boundary | Revert `767fe1a` then `6359e3d` (additive types/content; `RawSiteContent.catalog` is required, so revert both together with the fake default) |
| Lines vs `b85cfbe` | production 176 (`copy-template.ts` 18, `page-content.ts` 59, `catalog.ts` 76, `content-rules.ts` 13, `site-content.ts` 6, source 2, index 2); tests 313 (copy-template 50, content-rules 85, repository-content 129, in-memory fake 49) |

## Deviations and risks

- `validateSiteContent` and `listUnapproved` also cover the catalog (SEO ids `catalog/talleres`, `catalog/intensivos`, the fallback image as a decorative registered image, intro ids in the duplicate check, area `catalog:intros`). Beyond the task text but required so the checks in 2.3 and the launch checklist are real.
- The launch-checklist count test in `repository-content.test.ts` grew by +2 (the two intros).
- `fallbackImage` reuses `gallery-01.jpg` (1200x900 declared dimensions; confirm against the file if a FRONT slice needs exact sizes).
- Drafted prose awaiting owners: both intros (`approved: false`); the other labels (headings, empty messages, WhatsApp message wording, SEO copy) are drafts with no business facts.
- Docs (tasks.md, this file) are left uncommitted.
