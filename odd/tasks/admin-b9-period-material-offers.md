# Admin B9: enabled period materials

- Work unit: item 14 of `openspec/changes/admin-catalog/tasks.md` (B9). ODD, BACK.
- Branch/worktree: `feat/admin-catalog-b9-period-material-offers` from merged PR #66 `origin/main` `2d45485`, in `../CalmaInquieta-b9`.
- Objective: persist one flat ordered material list per workshop period, validate selections through `MaterialLookup`, and copy only currently active/available materials through “Abrir mes”.
- Requirements: `openspec/changes/admin-catalog/specs/workshop-periods/spec.md` (“Enabled materials”), task item 14, B6 period contracts/implementation, and B8b `MaterialLookup`.
- Constraints: strict TDD (`AGENTS.md`); actor-first denial before repositories/lookups; existing historical offers survive later material state changes; root plus offers write atomically; fake and Drizzle share one repository contract. Do not edit `src/app/**`, public readers, material persistence, unrelated workshop behavior, or production composition unless task 14 requires it (it does not).
- Error vocabulary: duplicate IDs use the existing `duplicate` field issue; inactive/unavailable use `not-selectable`; missing IDs use `unknown-reference`.
- Model policy: delegated phases may use only guaranteed OpenAI models. `gentle-ai-explore` and non-OpenAI agents are forbidden. The package worker/verifier definitions have no model override and therefore inherit this session’s `openai-codex/gpt-5.6-sol`; writes remain single-threaded.
- Migration: merged generated history ends at `0009_materials`; generate the next migration as `0010_period_material_offers`. Never hand-edit SQL, snapshots, or journal.
- Delivery strategy: one B9 PR with two cohesive commits: behavior/fake, then transactional persistence/migration. Keep tests with each work unit and report honest authored size.

## Tasks

- [x] B9-T1. Resume Engram context, update from merged PR #66, create the isolated branch/worktree, read authoritative task/spec and B6/B8b seams, and confirm migration history ends at generated `0009_materials`.
- [x] B9-T2. RED behavior/fake matrix for actor-first denial, duplicate/unknown/not-selectable material IDs, ordered flat lists, closed/effectively closed refusal, historical retention, and filtered “Abrir mes” copying.
- [x] B9-T3. GREEN/REFACTOR period service/repository/fake changes and shared fake contract; run focused checks and commit the behavior work unit.
- [x] B9-T4. RED Drizzle/shared-contract/schema coverage for ordered offer round trips, replacement, FKs/uniqueness, and atomic rollback.
- [x] B9-T5. GREEN/REFACTOR transactional Drizzle persistence plus additive schema and generator-produced `0010_period_material_offers`; run focused checks and commit persistence separately.
- [ ] B9-T6. Run final focused and full gates under `C:/Temp/calma-gate.lock`, including embedded PostgreSQL without weakening/skipping DB tests; handle only confirmed abandoned `calma-pg-*` clusters if the documented failure occurs.
- [ ] B9-T7. Run native review when available (otherwise ASSESS exactly), push, open the linked PR with one type label, and monitor until CLEAN, MERGEABLE, and CI `verify` passes.

## Acceptance criteria

- A period stores one flat ordered material list shared by all turnos; no variant-level period offers are introduced.
- Duplicate material IDs return `invalid` with `{ field: "materialIds", code: "duplicate" }` and do not mutate the period.
- Unknown IDs return `unknown-reference`; inactive or unavailable IDs return `not-selectable`.
- Existing periods keep historical material details after later deactivation/unavailability.
- “Abrir mes” copies the latest earlier period’s order while filtering through `MaterialLookup` to active and available materials only.
- Closed and effectively closed periods reject material changes before material lookup.
- Every use case denies an absent actor before repository or lookup access.
- Fake and Drizzle run the same repository contract; period root, capacities, and material offers insert/update atomically.
- Generated `0010_period_material_offers` owns only the additive offer table and its constraints/indexes.
- No app, public reader, material persistence, production composition, variant-offer, or unrelated workshop changes.

## Verification plan

- Behavior/fake: focused period service plus in-memory/shared contract tests; whole workshops unit slice; lint/typecheck/format/diff checks as appropriate.
- Persistence: fake + Drizzle shared repository contract, period DB tests, migration catalog/schema ownership, drift generation, lint/typecheck/format/diff checks.
- Runtime boundary: embedded PostgreSQL proves migration chain and atomic root+offer replacement.
- Final exclusive gate under `C:/Temp/calma-gate.lock`: drift, format, lint, typecheck, build, coverage, complete DB project, and diff check.
- Rollback boundary: B9-only period material service/fake/repository tests and code, additive `period_material_offer` schema, generated `0010` artifacts, and migration expectations; core B6 periods and B8b materials remain.

## Progress and evidence

- `origin/main` fetched at `2d45485` (merge PR #66). The isolated worktree is clean and tracks `origin/main`.
- Generated migration history and journal both end at `0009_materials`; B9’s generated migration must therefore be `0010_period_material_offers`.
- Engram observations #416 and #417 confirm B8b behavior/persistence, native review outcome, merged PR readiness, and the embedded-PostgreSQL temp-cluster operational warning.
- Authoritative task 14 does not require production composition.
- B9-T2 RED was observed at 2 files with 4 failing behavior assertions and 26 passing tests: clearing stored offers, duplicate validation, ordered replacement, and filtered “Abrir mes” copy all failed against the B6 deferral behavior.
- B9-T3 GREEN/REFACTOR adds `MaterialLookup` to the period service, validates duplicate/missing/not-selectable IDs, replaces the ordered flat list, filters historical copy through one batched lookup, and preserves actor/closure ordering. Focused verification passes 2 files / 30 tests; typecheck, Prettier, and diff checks pass. Independent OpenAI verifier: PASS.
- Native review could not create a lineage (`candidate-owner-preparation-failed`); ASSESS returned `unassessable` and required writer self-verification plus an independent verifier, both satisfied. Behavior work-unit commit: `a114dbb` (`feat(workshops): enable period material offers`), 230 authored source/test diff lines before the ODD document.
- B9-T4 RED kept the fake shared contract green at 12/12 and produced 6 intended Drizzle failures out of 18 tests: ordered offer round-trip/replacement, insert/update rollback, missing offer table constraints, and historical visibility.
- B9-T5 GREEN currently passes fake 12/12, Drizzle 18/18, migration/architecture 23/23, typecheck, Prettier, diff check, and a no-change Drizzle generation check. The generated artifacts are exactly `0010_period_material_offers.sql`, `0010_snapshot.json`, and the journal entry.
- Native persistence review again failed before lineage creation (`candidate-owner-preparation-failed`). ASSESS required writer self-verification plus an independent verifier. After the package verifier remained unavailable, an isolated read-only Pi verifier was launched explicitly with `openai-codex/gpt-5.6-sol`, no tools/extensions/session, over the staged patch; it returned PASS with no blocker/critical findings. Its only warning was missing direct behavioral checks for the schema-declared CASCADE/RESTRICT actions; the generated schema/migration and architecture tests already verify those declarations, so this remains non-blocking follow-up depth rather than a B9 correctness gap.
