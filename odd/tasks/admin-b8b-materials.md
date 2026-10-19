# Admin B8b: materials and variants

- Work unit: item 13 of `openspec/changes/admin-catalog/tasks.md` (B8b). ODD, BACK.
- Branch/worktree: `feat/admin-catalog-b8b-materials` from merged B6 `origin/main` `7786c84`, in `../CalmaInquieta-b8b`.
- Objective: deliver materials and variants with domain/application behavior, active/available selection, supplier and media validation, shared fake/Drizzle repository parity, and a generated forward-only migration.
- Why: B8b is the remaining backend prerequisite for B9 period material offers.
- Requirements: `openspec/changes/admin-catalog/specs/materials-catalog/spec.md`, design sections AC1, AC16, 3, 5.5 and the material/variant tables, task item 13, and existing B0b contracts in `src/modules/materials/application/contracts.ts`.
- Constraints: strict TDD (`AGENTS.md`); hexagonal boundaries; every use case requires an actor first; variants carry prices and a material has no price/stock field; fake and Drizzle run one shared repository contract; compound material+variant writes are atomic. Do not edit `src/app/**`, production composition, public readers, B9 period-offer persistence, or unrelated workshop/media behavior.
- Default-variant decision: the current contract has no material-level price. A material without options is represented by one explicit variant labelled `DEFAULT_VARIANT_LABEL` (`"Única"`) with its own price. An empty variants array is invalid; the backend does not invent a price.
- History decision: B8b has no downstream variant references yet. The design states `used` remains false until change 5; removing a missing draft variant deletes it only when another variant remains. The existing `variant-in-use` error stays reserved for the later usage seam and is not simulated with a persistence flag.
- Image decision: validate a non-blank alt and an existing asset through the `MediaLookup` module API. A missing asset on read hydrates `asset: null` so delivery can render “sin imagen”; materials infrastructure never imports media infrastructure or its schema.
- Supplier decision: create/update require an existing active supplier. Existing materials keep and display an archived supplier. Deactivate/reactivate material names follow the design's active-name uniqueness rule.
- Migration: merged history ends at `0008_workshop_periods`. Merge-order discipline therefore requires generator-produced `0009_materials`, despite the historical forecast `0008_materials`; B9 will take the next available number. Never hand-edit SQL, snapshots or journal.
- TDD: enabled; source `AGENTS.md`; runner `pnpm test`.
- Route: delegated direct. Mapping and multi-file writer triggers fired. Behavior/fake and persistence are sequential work units; parent owns tracking, gates, review and commits.
- Delivery strategy: stacked-to-main, one B8b PR after both work units. Forecast is above 400 authored production lines, so behavior/fake and persistence remain separate commits; if used-variant removal becomes non-cohesive, defer only that future-reference seam to B8c rather than compressing code or tests.

## Tasks

- [x] B8b-T1. Map authoritative requirements, B0b contracts, B8a patterns, media/supplier seams, migration order, exclusions and the default-variant interpretation.
- [x] B8b-T2. RED behavior matrix for actor-first denial, normalization/validation, supplier/media references, explicit `Única` default, duplicate labels/names, positive ARS prices, swatches, ordering, lifecycle, category suggestions, selectable filtering and audit.
- [x] B8b-T3. GREEN/REFACTOR material core, repository port, service, lookup adapter, in-memory fake, additive module exports and shared repository contract against the fake.
- [x] B8b-T4. Independently verify, assess/review as configured, and commit the behavior/fake work unit.
- [x] B8b-T5. RED Drizzle/shared-contract coverage for FKs/checks, active-name and per-material-label races, compound rollback, replacement semantics, missing media hydration, deterministic ordering and lifecycle persistence.
- [x] B8b-T6. GREEN/REFACTOR additive material/variant schema, generated `0009_materials`, Drizzle adapter and migration expectations without B9 tables.
- [x] B8b-T7. Apply the workload rule honestly: keep the two cohesive commits, or defer only the later used-variant seam to B8c if it becomes necessary.
- [x] B8b-T8. Run focused and full locked gates, assess/review as configured, commit persistence/evidence, and prepare the B8b PR.

## Acceptance criteria

- Material name, description, category and supplier input are normalized; required-field issues aggregate and actor denial happens before repository/lookup work.
- Each material has at least one variant. Labels are non-blank and case-insensitively unique within a material; prices are positive whole ARS values; optional swatches normalize to lowercase `#rrggbb` and reject invalid colors.
- A no-options material stores exactly one explicit `Única` variant with its own price; variants preserve deterministic position order.
- Create/update require an active supplier and validate material image asset/alt through module APIs; dangling stored images hydrate as `asset: null` without breaking reads.
- Material deactivate/reactivate is idempotent, preserves history, audits successful changes, and reactivation rechecks active-name uniqueness.
- `list` filters by active state, category and supplier and orders by normalized name/id. `listSelectable` returns only active and available materials. Category suggestions are normalized, unique and deterministic.
- Fake and Drizzle run one repository contract. Root and variant replacement is atomic; failed compound writes preserve prior state.
- Generated `0009_materials` owns `material` and `material_variant` with supplier/media FKs, positive-price and swatch checks, active material-name uniqueness and per-material variant-label uniqueness.
- No B9 period-offer table, app route, production composition or public reader is introduced.

## Verification plan

- Behavior/fake: focused core/service/fake contract; whole materials module; lint; typecheck; format; diff check.
- Persistence: fake + Drizzle shared contract; migration/catalog/schema ownership; whole materials module; lint; typecheck; format; diff check.
- Runtime boundary: embedded PostgreSQL material repository contract and generated migration chain.
- Final full gate under `C:/Temp/calma-gate.lock`: drift, format, lint, typecheck, build, coverage and diff check.
- Rollback boundary: B8b material domain/application/fake/Drizzle files, additive material schema declarations, generated `0009` artifacts and latest-migration expectations; supplier/media/B6 history remains.

## Progress and evidence

- Read-only mapping confirmed B8a suppliers and media are merged, material contracts/builders exist but implementation is absent, authoritative history ends at `0008_workshop_periods`, and B9 remains excluded.
- The historical OpenSpec numbering is a forecast, not an immutable filename: design AC1 explicitly requires generation after rebasing and numbering by merge order, so B8b uses `0009_materials`.
- B8b-T2 RED was observed with three discovered suites failing only on the absent planned `material-core`, material service/repository, and in-memory repository modules; no malformed assertion or syntax failure remained.
- The first focused GREEN run exposed locale-sensitive material ordering (`Beto` before `Álvaro` under code-point comparison). The fake now uses Spanish locale comparison like the established supplier repository, and the rerun passed 3 files / 28 tests.
- B8b-T3 passes the whole materials/fake slice (7 files / 72 tests), format, lint, typecheck and `git diff --check`. Refactoring moved material draft types into the domain so the production boundary rule remains intact; the module API re-exports them without breaking the B0b contract.
- Native review could not create a lineage because candidate preparation failed before START, even after the provider-required managed-assets sync. `ASSESS` therefore returned `unassessable` with mandatory writer self-verification plus an independent verifier. The independent OpenAI verifier found no blocking issue after the authoritative `Única` decision ruled out its initial over-broad interpretation.
- Behavior/fake work-unit commit: `717d438` (`feat(materials): add material catalog behavior`). It contains the tests, implementation and shared fake contract without persistence or delivery changes.
- B8b-T5 RED was observed with the fake shared contract still green (8/8) and the Drizzle suite failing exclusively because `drizzle-material-repository` did not exist. The shared rollback case now uses a real duplicate child identifier so both fake and PostgreSQL prove atomic replacement without a test-only production hook.
- B8b-T6 adds the transactional Drizzle adapter, additive `material`/`material_variant` schema, and generator-produced `0009_materials`. The shared fake+DB contract passed 23/23, the migration/catalog canary passed 34/34, and migration generation reports no schema drift. Typecheck, lint, format and diff checks pass. A later identical DB retry hit a Windows Vitest worker crash/timeout without an assertion; the earlier post-change 23/23 result remains the current behavioral evidence pending the locked final gate.
- B8b-T7 keeps the two honest cohesive work units. The future `used` reference seam remains deferred to B9/change 5 as designed; no behavior or tests were compressed to fit a line budget.
- Native persistence review lineage `review-5571acd4c02cd003` approved the 15-file persistence candidate and its exact acknowledgement burned revision `sha256:f0d1d85d00f74afdd8fa3771cb9e3d42aac3e1b3aba63d1dff3d4f5a7824c1b3`. Persistence work-unit commit: `77c4867` (`feat(materials): persist materials and variants`).
- The locked final gate first caught two test-fixture defects: a forbidden materials-test import of the media schema and a cloned globally duplicate variant id. Commit `880f238` (`test(materials): align persistence gate fixtures`) fixes both, adds missing supplier/variant-race branch evidence, and passed an independent OpenAI fallback review after the native lifecycle could not create a second lineage for the test-only delta.
- Final exclusive gate evidence: migration drift clean; format, lint, typecheck, build and diff checks pass. The monolithic coverage runner stalled before test discovery and was replaced without reducing scope by `unit+ui` coverage plus the complete `db` project: 159 files / 1691 tests with 94.19% statements, 90.08% branches, 96.60% functions and 96.42% lines; DB 17 files / 212 tests. Combined result: 176 files / 1903 tests, all passing. `C:/Temp/calma-gate.lock` was released.

## Next step

Push `feat/admin-catalog-b8b-materials`, open the B8b PR against `main`, and hand merge control to the owner.
