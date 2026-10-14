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
