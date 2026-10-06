# Tasks: Platform Foundation (walking skeleton)

Change: platform-foundation | Store: hybrid | Strict TDD: activated inside S1 (task 1.3) | Design: `design.md` (corrected)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated authored changed lines | 1,520-1,860 total (six slices, each at most 400) |
| 400-line budget risk | High (total); Low-Medium per slice |
| Chained PRs recommended | Yes |
| Suggested split | S0 (direct push to main) -> S1 -> S2.1 -> S2.2 -> S3.1 -> S3.2 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (recommended: stacked-to-main) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Recommended chain strategy: **stacked-to-main**. Every slice is green on its own, deploy is gated by the secret-presence check, and each PR merges in order with a small, focused diff; a feature-branch chain adds no rollback benefit for a single-developer greenfield repo.

Per-slice estimate (authored additions + deletions; lockfile, `drizzle/meta`, generated types and binaries excluded):

| Slice | Estimate | Max |
|-------|----------|-----|
| S0 | 60-80 | direct push, not a PR |
| S1 | 330-390 | 400 |
| S2.1 | 300-370 | 400 |
| S2.2 | 305-365 | 400 |
| S3.1 | 295-365 | 400 |
| S3.2 | 230-290 | 400 |
| Total | 1,520-1,860 | |

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| S0 | Private repo with hygiene files, WebP mockups, checksums, first push | direct push to `main` (pre-authorized) | `gitleaks dir .` then `git ls-files` audit (no PNG, `.atl/`, `settings.local.json`) | `gh repo view tiagorojas7/calma-inquieta --json visibility` returns PRIVATE | Delete or archive the GitHub repo; local `_originals/` remains |
| S1 | Toolchain, single `pnpm test`, Strict TDD activation, `Result` + `Money`, CI `verify` | PR 1 (base `main`) | `pnpm test -- src/modules/_shared/money.test.ts` | `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage` on fresh clone state | Revert PR 1 (config flags revert to false only if runner removed) |
| S2.1 | Boundaries lint rule, architecture fitness test, `AGENTS.md`, system-status domain/application core, fakes, contract | PR 2 (base `main` after PR 1 merge) | `pnpm test -- tooling/architecture src/modules/system-status` | `pnpm lint` fails on a planted bad import then passes after removal | Revert PR 2 |
| S2.2 | Env core, migrations, embedded-postgres harness, Drizzle probe | PR 3 (base `main` after PR 2 merge) | `pnpm test -- src/platform src/modules/system-status/infrastructure` | `pnpm db:migrate` against `TEST_DATABASE_URL` or embedded server; `pnpm test` from clean clone | Revert PR 3 (config `integration` back to false) |
| S3.1 | Worker env schema, composition root, React Router + Worker + `/status`, CI build step | PR 4 (base `main` after PR 3 merge) | `pnpm test -- src/app src/composition src/platform/env.test.ts` | `pnpm build` offline; `pnpm dev` then `GET /status` (shows `degraded` without local PG) | Revert PR 4 (`build_command` back to empty) |
| S3.2 | CI deploy job (secret gate), ADRs, README, owner runbook | PR 5 (base `main` after PR 4 merge) | `actionlint` on `ci.yml` if available, else `pnpm lint && pnpm format:check` | Deploy job on `main` with no secrets emits the skip notice and stays green | Revert PR 5 |

Spec shorthand: **DP** delivery-pipeline, **SK** shared-kernel, **SS** system-status, **RC** runtime-configuration, **AB** architecture-boundaries, **DH** database-harness (all under `openspec/changes/platform-foundation/specs/<name>/spec.md`). Design shorthand: **D#** decision, **§n** section of `design.md`, **R#** risk.

## Global rules (apply to every task)

- Commits: Conventional Commits only. NEVER a `Co-Authored-By` line or AI attribution (DP: Commit conventions). Tests ship in the same commit as their behavior (`work-unit-commits`).
- Strict TDD (from task 1.3 onward): every behavior task is RED (run the test, observe the failure, record the output) -> GREEN (minimum code) -> REFACTOR (tests stay green). The test file is named on each task.
- Each slice ends independently green: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:coverage` all pass.
- Items marked "verify in apply" (R7) are checked against current docs at install time; the design fixes behavior, not spelling.
- Paths marked `(read-only)` are read but not edited.

### STOP conditions (apply halts the task and reports to the orchestrator with evidence; never improvise)

1. Any login or authentication prompt from `wrangler`, `react-router`, `neonctl`, `gh` (beyond the pre-authorized S0 repo create/push) or any Neon/Cloudflare tool (§9.1, R10). Apply never runs `wrangler login`, `gh secret set`, `neonctl` or any Cloudflare/Neon operation, and never uses cloud credentials.
2. Missing embedded-postgres binary for Windows (win-x64) or initdb failure: fall back to `TEST_DATABASE_URL` (WSL2 Postgres), report the evidence, do not replace the harness design (R1, DH: Binaries unavailable for the platform).
3. Any version incompatibility found at install time (peer-range conflict among vite, `@react-router/dev`, `@cloudflare/vite-plugin`, vitest, typescript-eslint, eslint-plugin-boundaries, eslint-import-resolver-typescript): report with evidence; do not change a major version on its own (§2).

---

## S0: Bootstrap (direct push to `main`, pre-authorized by approved-plan decision 4)

- [x] 0.1 Convert `docs/client-proposal/mockups/image1..20.png` to WebP at the same names with `.webp` (image1-3 lossless, others quality 90) using a locally available tool (for example `cwebp` or `sharp`; if none is installed, report rather than add a repo dependency). Move the original PNGs to `docs/client-proposal/_originals/` BEFORE `git init`. Verify: 20 `.webp` files exist, 20 PNGs exist only under `_originals/`. Traces: DP Mockup conversion before first commit; design §12 S0.
- [x] 0.2 Create `docs/client-proposal/README.md` with the PNG->WebP name map for all 20 images, sizes, and the SHA-256 of every original PNG (computed with `Get-FileHash`), plus the note that `[IMAGE: media/imageN.png]` markers resolve via this map. Verify: 20 rows, every checksum recomputes equal. Traces: DP Checksums verify originals, Name map complete.
- [x] 0.3 Create `.gitignore` (`node_modules/`, `build/`, `.react-router/`, `.wrangler/`, `coverage/`, `worker-configuration.d.ts`, `.env*` with `!.env.example`, `.dev.vars*` with `!.dev.vars.example`, `.claude/settings.local.json`, `docs/client-proposal/_originals/`; do NOT ignore `.atl/`), `.gitattributes` (`* text=auto eol=lf`; binary for `*.webp *.png *.jpg *.docx`) and `.editorconfig` (LF, 2 spaces, UTF-8). Traces: DP Repository hygiene; design §12.
- [x] 0.4 `git init -b main` at `C:\Proyectos\TR_WebStudio\CalmaInquieta`. Run `gitleaks dir .` (secret scan BEFORE `git add`); expect zero findings. Planted-secret check: create a throwaway file in the scratchpad (never in the repo) containing a fake key, scan that directory, expect a finding, delete it. If `gitleaks` is missing, install via the system package manager and verify the subcommand name (R7). Traces: DP Secret scan before publication (Clean bootstrap, Planted secret detected); design §16.
- [x] 0.5 `git add -A`, then audit `git ls-files`: no `*.png` under `docs/client-proposal/`, no `.claude/settings.local.json`, no `.env*`; `.atl/` is kept (tracked, per design §12 S0). Commit `chore: bootstrap repository with docs, specs and webp mockups` (pre-existing docs and `openspec/` as-is). Traces: DP History contains no PNG mockups; Commit conventions.
- [x] 0.6 `gh repo create tiagorojas7/calma-inquieta --private --source . --remote origin`, then `git push -u origin main` (pre-authorized; uses the owner's existing `gh` session; if `gh` prompts for login, STOP 1). Verify: `gh repo view tiagorojas7/calma-inquieta --json visibility` returns `PRIVATE`; `git log origin/main` shows the single bootstrap commit. Traces: DP Private repository and bootstrap push (Visibility); design §16, §17 S0.

**S0 gate**: repo private, history has no PNG, gitleaks clean, `git log` audit shows no AI attribution.

---

## S1: Toolchain + Strict TDD activation + `Money` + CI `verify` (branch `feat/s1-toolchain`, PR 1)

Order inside S1 (design §11): toolchain -> Vitest + `pnpm test` -> activation -> Money RED/GREEN -> CI.

### 1. Toolchain

- [x] 1.1 Create `.nvmrc` (`24`), `package.json` (`name`, `private: true`, `type: module`, `packageManager: pnpm@12.9.1`, `engines.node: ">=24 <25"`, scripts from design §14 that exist in S1: `test`, `test:unit`, `test:watch`, `test:coverage`, `lint`, `format`, `format:check`, `typecheck`) and `pnpm-workspace.yaml` (build-script allowlist for `esbuild`, `workerd`, `@embedded-postgres/*`; verify the pnpm 12 setting name and exact-save setting in apply, R7). Install exact pins: `typescript` 6.0.x, `eslint` 10.12.0, `typescript-eslint` 8.71.1, `prettier` 3.x, `vitest` and `@vitest/coverage-v8` 5.0.3, `@types/node` 24.x, `jiti` if ESLint needs it for `eslint.config.ts`. Re-check versions against the registry; on peer conflict STOP 3. Commit `build: add node 24, pnpm and strict typescript toolchain`. Traces: DP Toolchain pinning; design §2, §12 S1, §14.
- [x] 1.2 Create `tsconfig.json` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `moduleResolution: bundler`, `noEmit`, `paths: { "~/*": ["src/*"] }`, no `baseUrl`), `eslint.config.ts` (`strictTypeChecked`, ignores for `build/`, `.react-router/`, `coverage/`, `drizzle/meta/`, `worker-configuration.d.ts`), `.prettierrc.json` (`endOfLine: "lf"`), `.prettierignore` (`docs/client-proposal/`, `docs/brand/`, `openspec/`, `drizzle/meta/`, lockfile, build output). Verify: `pnpm lint`, `pnpm format:check`, `pnpm typecheck` all exit 0 on the empty tree; with Node pinned wrong (`engines`), `pnpm install` rejects. Traces: DP Toolchain pinning (Wrong Node version, Typecheck); design §12.
- [x] 1.3 Create `vitest.config.ts` with the `unit` project (`src/**/*.test.{ts,tsx}`, `tooling/**/*.test.ts`, excluding `**/*.db.test.ts`, Node environment), `resolve.alias` `~` -> `src`, and `v8` coverage with 90 % line and branch thresholds scoped to `src/modules/_shared/**` and `src/modules/*/{domain,application}/**`. Define `pnpm test` = `vitest run`. Verify: `pnpm test -- --passWithNoTests` exits 0 (activation evidence). Commit `test: add vitest with a single pnpm test command`. Traces: DP Single test command (Fresh clone); design §8.2, §11, D8.

### 2. Strict TDD activation (BEFORE any behavior task)

- [x] 1.4 Edit `openspec/config.yaml` with exactly the values of design §11 (`strict_tdd: true`, `projects`, `testing.*` with `strict_tdd_status: active`, `workspace_test_command: "pnpm test"`, coverage/lint/typecheck/format commands, `rules.apply.tdd: true`, `rules.apply.test_command: "pnpm test"`, `rules.verify.test_command: "pnpm test"`, `rules.verify.build_command: ""` kept empty with its comment, `coverage_threshold: 0`, updated `context` Stack/Architecture/Testing lines). `integration.available` stays false. Do NOT set `build_command` (no build script exists yet). Traces: DP Strict TDD activation (Config and memory agree, Ordering, Build command not invented); design §11, D8; `openspec/config.yaml` task rule.
- [x] 1.5 Engram refresh: `mem_save` upsert `sdd-init/calmainquieta` (topic_key same) and `sdd/calmainquieta/testing-capabilities` with the same values as 1.4; read both back with `mem_search`/`mem_get_observation` and compare field by field with the file (strict_tdd, test command, layers, coverage, quality, build_command empty). Record the comparison. Commit (with 1.4) `chore(sdd): activate strict tdd`. Traces: DP Config and memory agree; design §11.

### 3. First behavior (first real Strict TDD proof)

- [x] 1.6 RED: create `src/modules/_shared/result.test.ts` (success narrowing `ok(value)` exposes `value`; failure narrowing `err(error)` exposes `error`; type-level narrowing via `if (r.ok)`). Run `pnpm test`; observe failure (module missing); record the output. Traces: SK Result type (Success narrowing, Failure narrowing); SK Strict TDD proof (RED before GREEN); design §6.1.
- [x] 1.7 GREEN: create `src/modules/_shared/result.ts` (`Result`, `ok`, `err` exactly as design §6.1). Run `pnpm test`; green. REFACTOR: none expected; confirm `pnpm lint` and `pnpm typecheck`. Traces: SK Result type; design §6.1.
- [x] 1.8 RED: create `src/modules/_shared/money.test.ts` covering the design §7 list: construct 150 and read back (`toCentavos`); reject 1.5, `NaN`, `Infinity` as `not-an-integer`; reject `2**53` as `out-of-range`; zero valid and `-0` normalized to `0`; `add` without float drift (e.g. 10 + 20 = 30 centavos exactly); `subtract` to negative; `add` overflow beyond `Number.MAX_SAFE_INTEGER` throws `RangeError`; `multiply` by integer quantity; `multiply` by non-integer throws; `equals` / `compare` / `isZero` / `isNegative`; `toJSON` returns centavos; immutability (operations return new instances). Run `pnpm test`; observe failure; record output. Traces: SK Money representation (Valid construction, Fractional centavos rejected, Unsafe integer rejected, Zero is valid); SK Money arithmetic and comparison (all six scenarios); SK Money follows activation; design §7.
- [x] 1.9 GREEN: create `src/modules/_shared/money.ts` (`Money` with private constructor and `#centavos`, `fromCentavos`, `zero`, arithmetic, comparison, `toJSON`, `MoneyError`), then `src/modules/_shared/index.ts` re-exporting `Result`, `ok`, `err`, `Money`, `MoneyError` (the `Clock` export arrives in S2.1). Run `pnpm test` until green. REFACTOR: tidy duplication, re-run. Verify `pnpm test:coverage` meets the 90 % threshold on `_shared`. Commit `feat(shared-kernel): add money value object and result type`. Traces: SK Money representation, Money arithmetic and comparison, Result type, Kernel stays pure (no imports); design §7, D7.

### 4. CI verify

- [x] 1.10 Create `.github/workflows/ci.yml` with `on: pull_request, push: main`, `permissions: contents: read`, `concurrency: ci-${ref}` (`cancel-in-progress` only for `pull_request`), job `verify` on `ubuntu-24.04`: checkout (`fetch-depth: 0`), `pnpm/action-setup` (from `packageManager`), `actions/setup-node` (`.nvmrc`, pnpm cache), `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:coverage`, then gitleaks (download pinned 8.x release, verify SHA-256, run `gitleaks git --redact --exit-code 1`; verify subcommand names in apply, R7). All third-party actions pinned by commit SHA (look up current SHAs; do not guess). Never `pull_request_target`. Commit `ci: add verify workflow`. Traces: DP CI verify gate (Green on main, Red blocks by convention), Pull request does not deploy; design §10, §16.
- [x] 1.11 Slice gate and PR: run `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage`; push branch `feat/s1-toolchain`; open PR 1 with `gh pr create` (base `main`, description in plain Conventional style, no AI attribution); confirm CI `verify` green. Traces: DP CI verify gate; Branch protection by convention.

**S1 gate**: authored lines at most 400; `strict_tdd` true in file and Engram; Money RED observed before GREEN.

---

## S2.1: Boundaries + system-status core (branch `feat/s2-1-boundaries`, PR 2, base `main`)

### 1. Kernel completion and domain (Strict TDD)

- [x] 2.1 RED: `Clock` is a type-only port, so the RED test targets its fake: create `src/testing/fakes/fixed-clock.test.ts` asserting a `fixedClock(date)` returns that date on every `now()` and an advancing variant moves by a set delta. Run; observe failure. Traces: SK Clock port (Fixed clock in tests); design §6.1, §12.
- [x] 2.2 GREEN: create `src/modules/_shared/clock.ts` (`Clock` interface), export it from `src/modules/_shared/index.ts`, create `src/testing/fakes/fixed-clock.ts`. Run green. Traces: SK Clock port (Fixed clock in tests, Kernel stays pure); design §6.1.
- [x] 2.3 RED: create `src/modules/system-status/domain/system-status.test.ts` for `overallStatus`: empty checks -> `degraded`; all pass -> `ok`; any fail -> `degraded`. Run; observe failure. Traces: SS Status use case and domain rule (All checks pass, Probe reports failure); design §6.1.
- [x] 2.4 GREEN: create `src/modules/system-status/domain/system-status.ts` (`CheckStatus`, `HealthCheck`, `OverallStatus`, `overallStatus`; zero imports except `_shared`). Run green. Traces: SS Status use case and domain rule; design §6.1.

### 2. Application: port, use case, memoized probe

- [x] 2.5 Create `src/modules/system-status/application/ports.ts` (`DatabaseProbeResult`, `DatabaseProbe`; type-only, covered by later tests; documents "never throws").
- [x] 2.6 RED: create `src/testing/fakes/in-memory-database-probe.test.ts` and `src/testing/contracts/database-probe.contract.ts` (suite `runDatabaseProbeContract(factory)`: migrated -> `{ reachable: true, latestMigration: "0000_baseline" }`; empty -> `{ reachable: true, latestMigration: null }`; unreachable -> `{ reachable: false }`). The in-memory test imports the contract and runs it against a not-yet-existing fake. Observe failure. Traces: SS Probe contract parity (Both implementations satisfy the suite); design §8.3, §15.
- [x] 2.7 GREEN: create `src/testing/fakes/in-memory-database-probe.ts` configured per scenario. Run green. Traces: SS Probe contract parity; design §6.1, §12 S2.1.
- [x] 2.8 RED: create `src/modules/system-status/application/get-system-status.test.ts` using the in-memory probe and fixed clock: ok when reachable and migrated (`checks` database pass, migrations pass; `checkedAt` from the clock as ISO-8601 UTC; `buildCommit` echoed; `latestMigration` echoed); unreachable -> `degraded` (database fail, migrations fail, `latestMigration: null`); empty DB -> migrations fail, `degraded`; probe that throws (contract breach) -> treated as unreachable, `degraded`; response contains no error text. Observe failure. Traces: SS Status use case and domain rule (All checks pass, Probe reports failure); SS Response shape and disclosure limits (Failure details are not leaked); design §6.1, §15.
- [x] 2.9 GREEN: create `src/modules/system-status/application/get-system-status.ts` (`createGetSystemStatus`, `SystemStatusView`, deps). Run green. REFACTOR: keep pure logic. Traces: SS Status use case; D7.
- [x] 2.10 RED: create `src/modules/system-status/application/memoized-database-probe.test.ts` with a counting fake probe and advancing clock: first call delegates; call within 60 s returns the cached result without calling inner; call at exactly 60 s delegates again; degraded results memoized the same way; `ProbeMemoCell` holds plain data only (no Promise: assert `cell.value` is a plain object with `result` and `observedAtMs`). Observe failure. Traces: SS Database probe adapter / Unreachable database (memo bounds traffic), D12; design §3 D12, §15.
- [x] 2.11 GREEN: create `src/modules/system-status/application/memoized-database-probe.ts` (`ProbeMemoCell`, `createProbeMemoCell`, `createMemoizedDatabaseProbe`). Create `src/modules/system-status/index.ts` with the public API of design §6.1. Run green; `pnpm test:coverage` meets the 90 % scoped thresholds. Commit `feat(system-status): add status rules and get-system-status use case`. Traces: SS Status use case, D12; design §6.1, §12 S2.1.

### 3. Boundaries and architecture fitness test

- [ ] 2.12 Install `eslint-plugin-boundaries` 7.2.0 and `eslint-import-resolver-typescript` (exact pins; verify ESLint 10 compatibility and the v7 rule names and selector syntax, R7; incompatibility -> STOP 3). Traces: AB Dependency rule; design §2, §5.
- [ ] 2.13 RED: create `tooling/architecture/architecture.test.ts` using the ESLint Node API (filter messages to `boundaries/*`; try `ruleFilter` first, else filter by `ruleId`; verify, R7). Table cases #1-#6 and #8 and #9 from design §5.3 as virtual `*.fixture.ts(x)` files linted with `lintText({ filePath })`: (1) domain imports `drizzle-orm` -> violation; (2) domain imports `../application/ports` -> violation; (3) delivery deep-imports `~/modules/system-status/application/get-system-status` -> violation; (4) delivery imports `pg` -> violation; (5) `modules/demo/application` imports `~/modules/system-status/domain/system-status` -> violation; (6) application imports `~/testing/fakes/fixed-clock` -> violation; (8) delivery imports `~/modules/system-status` -> NO violation (positive control); (9) real tree `src/` and `workers/` yields zero `boundaries/*` messages. Case #7 is added in S2.2 when its target exists. Run; observe failure (rule not configured). Traces: AB Dependency rule (Domain imports infrastructure, Delivery imports Drizzle, Deep cross-module import, Clean tree passes); AB Architecture test as fitness function (Fixture violation is detected, Fixture does not pollute the real check); design §5.3.
- [ ] 2.14 GREEN: extend `eslint.config.ts` with the element map (design §5.1, first match wins), the allow matrix (§5.2, default disallow), `boundaries/no-unknown-files` for `src/`, test files ignored by boundaries, and the fixture override disabling type-aware parsing for `**/*.fixture.{ts,tsx}`. Run `pnpm test` green. Runtime harness: temporarily plant a bad import in a scratch domain file, run `pnpm lint`, observe the violation, remove it. Traces: AB Dependency rule; AB Lint enforcement parity (Lint failing blocks CI); AB Layer structure (Skeleton module exists); design §5.1, §5.2.
- [ ] 2.15 Create `AGENTS.md` stating the dependency rule (element map and allow matrix in prose), Strict TDD (RED/GREEN/REFACTOR, the single `pnpm test` command), Conventional Commits with no AI attribution, and the main commands. Commit (with 2.12-2.14) `feat(architecture): enforce module boundaries with lint and an architecture test`. Traces: AB Agent-facing rule statement (AGENTS.md content); DP Commit conventions; design §5.3 closing note.
- [ ] 2.16 Slice gate and PR: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage` green; push `feat/s2-1-boundaries`; open PR 2 (base `main`); CI green. Traces: DP CI verify gate.

**S2.1 gate**: authored lines at most 400; a planted bad import fails both `pnpm lint` and `pnpm test`.

---

## S2.2: Env core + database harness + Drizzle probe (branch `feat/s2-2-database`, PR 3, base `main`)

### 1. Env core (shared by migrate script and test harness)

- [ ] 3.1 Install exact pins: `zod` 4.6.5, `drizzle-orm` 0.45.3, `drizzle-kit` 0.31.11, `pg` 8.23.1, `@types/pg`, `embedded-postgres` 17.10.0-beta.17, `tsx`. Confirm pnpm build-script allowlist covers `@embedded-postgres/*`. Check peers and registry; STOP 3 on conflict. Traces: DH Local and CI test database; design §2, R1.
- [ ] 3.2 RED: create `src/platform/env.test.ts` (core part): `parseEnv(migrationEnvSchema, {})` fails with `MIGRATION_DATABASE_URL` named; invalid value (`"not-a-url"`) names the variable; the secret value never appears in `formatEnvError(...)` output nor in the error object (assert on a distinctive secret string); multiple failures list every name; `postgres://` and `postgresql://` accepted; `testEnvSchema` with `TEST_DATABASE_URL` optional (absent ok, invalid named). Observe failure. Traces: RC Single validation schema (Valid configuration, Same schema for both shapes); RC Fail fast with names only (Missing variable, Invalid value is not echoed, Multiple failures); design D6.
- [ ] 3.3 GREEN: create `src/platform/env.ts` with `parseEnv<T>(schema, source): Result<T, EnvError>`, `EnvError` (names only; zod issues without inputs, `reportInput` off), `formatEnvError` ("Invalid environment: A, B"), `migrationEnvSchema`, `testEnvSchema`. Run green. Commit `feat(platform): add shared env validation for node scripts`. Traces: RC Single validation schema, Fail fast with names only; design D6, §12 S2.2.

### 2. Migrations and baseline

- [ ] 3.4 RED: write `src/platform/db/migrate.db.test.ts` (db project): apply migrations from scratch to an empty database via `createTestDatabase({ empty: true })` and assert the `drizzle.__drizzle_migrations` row count equals the journal entry count; re-run `runMigrations` is a no-op (row count unchanged, no error); baseline creates no business tables (only the migrations bookkeeping exists in `public`/`drizzle`). Cannot run until the harness (3.9-3.11) exists; record RED as "module not found", then proceed. Traces: DH Forward-only migrations (Apply from scratch, Re-apply is a no-op, Baseline has no business tables); design §8.3, D9.
- [ ] 3.5 Create `drizzle.config.ts` (generate-only; no credentials required; the migrate script comes in 3.8). Run `pnpm db:generate --custom --name=baseline` (add script `db:generate` = `drizzle-kit generate`); write `drizzle/0000_baseline.sql` with the single statement `COMMENT ON SCHEMA public IS 'Calma Inquieta application schema';` (fallback `SELECT 1;` only if ownership differs on Neon; record why). `drizzle/meta/**` is generated. Traces: DH Forward-only migrations (Baseline has no business tables); design D9.
- [ ] 3.6 GREEN (part 1): create `src/platform/db/migrate.ts` exporting `runMigrations(url)` using the drizzle-orm migrator (`migrationsSchema: "drizzle"`, `migrationsTable: "__drizzle_migrations"`, `migrationsFolder: "drizzle"`), closing its client afterwards. Create `src/platform/db/migration-catalog.ts` exporting `migrationTagFor(createdAtMillis)` reading `drizzle/meta/_journal.json` (returns the journal tag or `unknown:<millis>`). Verify in apply that `created_at` equals the journal `when` (R4); if not, drop the catalog and use a hash prefix (record in report). Traces: DH Migration execution path; SS Database probe adapter; design §6.1, D9, R4.
- [ ] 3.7 RED + GREEN for the session: create `src/platform/db/session.test.ts` (unit; failing connect to `127.0.0.1:1` with `connectTimeoutMs` small rejects fast; `close()` is idempotent; `defer` is invoked with the end promise instead of awaiting when provided). Observe failure, then create `src/platform/db/session.ts` (`createDbSessionFactory`, `DbSession`, `DbSessionFactory`, default `connectTimeoutMs` 5000). Create `src/platform/system-clock.ts` (`systemClock: Clock`). Traces: DH Runtime connection through Hyperdrive (Deployed path); design §6.1, D4.
- [ ] 3.8 RED + GREEN for the script: add `db:migrate` script (`tsx scripts/migrate.ts`). Create `scripts/migrate.ts` validating `process.env` with `migrationEnvSchema` through `parseEnv`; on failure print `formatEnvError` and exit 1; on success call `runMigrations`. Test through `src/platform/env.test.ts` (already covers names-only) plus a subprocess assertion in `src/platform/migrate-script.test.ts`: running with no `MIGRATION_DATABASE_URL` exits non-zero, prints the variable name and attempts no connection. Observe failure first, then pass. Traces: DH Migration execution path (Missing connection string); RC Single validation schema; design §12 S2.2.

### 3. Embedded PostgreSQL harness

- [ ] 3.9 RED: create `src/testing/db/postgres-server.test.ts`: with `TEST_DATABASE_URL` set to a stub URL, `startPostgresServer()` returns it and `stop` is a no-op; without it the function resolves a reachable admin URL on a free port (skip this case when binaries are unavailable and report). Observe failure. Traces: DH Local and CI test database (Fresh clone no setup, External override, Port conflict avoided).
- [ ] 3.10 GREEN: create `src/testing/db/postgres-server.ts` (`TEST_DATABASE_URL` override via `testEnvSchema`; otherwise `embedded-postgres` on a free port, temp dir with `persistent: false`, initdb UTF8 locale C, flags `-c fsync=off -c synchronous_commit=off -c full_page_writes=off -c timezone=UTC`). If the win-x64 binary is missing or initdb fails: STOP 2 (fall back to `TEST_DATABASE_URL`, report). Traces: DH Local and CI test database (Binaries unavailable for the platform); design D5, §8.1, R1.
- [ ] 3.11 GREEN: create `src/testing/db/global-setup.ts` (start server; `CREATE DATABASE calma_template_<rand>`; `runMigrations(templateUrl)`; `project.provide("pg", { adminUrl, template })`; teardown drops template and stops the server) and `src/testing/db/test-database.ts` (`createTestDatabase()` clones the template; `{ empty: true }` uses `template0`; `drop()` uses `DROP DATABASE ... WITH (FORCE)`), with the typed `declare module "vitest" { interface ProvidedContext { pg: ... } }`. Add the `db` project to `vitest.config.ts` (`src/**/*.db.test.ts`, `globalSetup`, `hookTimeout: 60_000`, `testTimeout: 30_000`). Verify the Vitest 5 `provide`/`inject` API (R7). Run `pnpm test`: `migrate.db.test.ts` from 3.4 now passes (GREEN). Isolation check: a small `src/testing/db/test-database.db.test.ts` creates two databases, writes a table in one, asserts absence in the other, and asserts cleanup drops both. Commit `feat(database): add drizzle migrations and embedded postgres test harness`. Traces: DH Test database lifecycle helper (Isolation between suites, Cleanup); DH Local and CI test database; DH Forward-only migrations; design §8.1, §8.2, D5, D9.

### 4. Drizzle probe

- [ ] 3.12 RED: create `src/modules/system-status/infrastructure/drizzle-database-probe.db.test.ts` running `runDatabaseProbeContract` against the Drizzle probe: migrated database -> `{ reachable: true, latestMigration: "0000_baseline" }`; empty database (no migrations table, `42P01`) -> `{ reachable: true, latestMigration: null }`; unreachable (`127.0.0.1:1`) -> `{ reachable: false }`; the session is closed in every case. Observe failure. Traces: SS Database probe adapter (Reachable migrated database, Unreachable database, Database without migrations); SS Probe contract parity; design §8.3.
- [ ] 3.13 GREEN: create `src/modules/system-status/infrastructure/drizzle-database-probe.ts` (`createDrizzleDatabaseProbe(openSession)`; `SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`; `42P01` -> null migration; any other error -> `{ reachable: false }`; `finally` closes the session; tag via `migrationTagFor`). Extend `tooling/architecture/architecture.test.ts` with case #7 (domain imports `../infrastructure/drizzle-database-probe` -> violation). Set `testing.test_layers.integration` to `{ available: true, tool: "vitest + embedded-postgres (PostgreSQL 17)" }` in `openspec/config.yaml` and refresh Engram `sdd-init/calmainquieta` and `sdd/calmainquieta/testing-capabilities` (read back and compare). Commit `feat(system-status): add drizzle database probe`. Traces: SS Database probe adapter; SS Probe contract parity; AB Dependency rule (case 7); DP Strict TDD activation (Config and memory agree); design §5.3, §11.
- [ ] 3.14 Slice gate and PR: full local gate green on a clean install (delete `node_modules`, `pnpm install --frozen-lockfile`, `pnpm test`); push `feat/s2-2-database`; open PR 3 (base `main`); CI green with embedded PostgreSQL 17 on ubuntu. Traces: DP CI verify gate; DH Fresh clone, no setup.

**S2.2 gate**: authored lines at most 400; `pnpm test` runs DB tests with no Docker; integration layer flagged available in file and Engram.

---

## S3.1: Delivery runtime (branch `feat/s3-1-runtime`, PR 4, base `main`)

### 1. Worker env schema

- [ ] 4.1 Install exact pins: `react-router` and `@react-router/dev` 8.4.0, `react` and `react-dom` 19.3.0, `@cloudflare/vite-plugin` 1.62.5, `wrangler` 4.147.0, `vite` (the major satisfying all peers together; verify), `@types/react`, `@types/react-dom`. STOP 3 on peer conflict. Traces: DP Delivery framework; design §2, D1, R2.
- [ ] 4.2 RED: extend `src/platform/env.test.ts` (Worker part): `workerEnvSchema` accepts `{ HYPERDRIVE: { connectionString }, BUILD_COMMIT }`; missing `HYPERDRIVE` names it; wrong binding shape (string instead of object) names it without echoing values; `readWorkerEnv` caches the parse per `env` object (same object -> same result reference; spy shows one parse; new object -> new parse). Observe failure. Traces: RC Single validation schema (Same schema for both shapes); RC Worker failure behavior (Misconfigured Worker, Cached validation); design D6, §9.1.
- [ ] 4.3 GREEN: extend `src/platform/env.ts` with `workerEnvSchema` and `readWorkerEnv` (WeakMap cache). Run green. Traces: RC Worker failure behavior; design D6.

### 2. Composition root

- [ ] 4.4 RED: create `src/composition/request-services.db.test.ts`: `createRequestServices({ databaseUrl: <real test URL>, buildCommit: "abc" }, {}, createIsolateState())` -> `getSystemStatus()` returns `status: "ok"` and `latestMigration: "0000_baseline"`; a bad URL (`127.0.0.1:1`) returns `degraded`; a second call within 60 s on the same `IsolateState` does not open a new connection (assert via a probe counter or by closing the server between calls and still getting the memoized `ok`). Observe failure. Traces: SS Status use case; SS Deployed endpoint (Database unreachable in deployment); design §8.3, D12.
- [ ] 4.5 GREEN: create `src/composition/request-services.ts` (`AppServices`, `RuntimeConfig`, `IsolateState`, `createIsolateState`, `createRequestServices` wiring `createMemoizedDatabaseProbe(createDrizzleDatabaseProbe(sessionFactory), { clock: systemClock, ttlMs: 60_000, cell })`). Run green. Commit `feat(composition): wire request services`. Traces: SS Status use case; design §6.1, D12.

### 3. Delivery: route and Worker

- [ ] 4.6 Create config files: `vite.config.ts` (React Router plugin + `cloudflare({ viteEnvironment: { name: "ssr" } })`, `resolve.alias` `~` -> `src`), `react-router.config.ts` (`appDirectory: "src/app"`, `ssr: true`), `wrangler.jsonc` (`name: calma-inquieta`, `nodejs_compat`, `compatibility_date` = apply date, `observability.enabled`, `workers_dev: true`, `preview_urls: false`, `vars.BUILD_COMMIT: "local"`, `hyperdrive` binding `HYPERDRIVE` with placeholder id `00000000000000000000000000000000` and `localConnectionString: "postgres://postgres@localhost:5432/calma_dev"`), `.env.example` and `.dev.vars.example` (names only), update `tsconfig.json` (`rootDirs`, JSX, Worker types; split `tsconfig.node.json` / `tsconfig.cloudflare.json` if types conflict, R3), `.gitignore` already covers `.env*`. Add scripts `typegen`, `dev`, `build`, `deploy`; change `typecheck` to `pnpm typegen && tsc --noEmit`. Run `pnpm typegen` offline; if any command prompts for Cloudflare login or account selection: STOP 1. Traces: DP Delivery framework (Build); RC Example files (Example completeness, Secrets not tracked); DH Runtime connection through Hyperdrive (Local development); design §9.1, §12 S3.1, §14, R3, R10.
- [ ] 4.7 RED: create `src/testing/react-router.ts` (loader-args helper: builds `{ request, params, context }` with a `RouterContextProvider` holding fake services) and `src/app/routes/status.test.ts`: loader returns 200 with `data-status`-driving view when status `ok`; returns 503 with the same minimal payload when `degraded`; `headers` export has `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow`; `meta` export has `robots` `noindex, nofollow` and title "System status"; the payload contains no host, error text or stack, and no secret values. Observe failure. Traces: SS Status route (Healthy response, Degraded response); SS Response shape and disclosure limits (both scenarios); SS Response headers; design §6.2, §15.
- [ ] 4.8 GREEN: create `src/app/context.ts` (`servicesContext = createContext<AppServices>()`), `src/app/routes.ts` (`route("status", "routes/status.tsx")`; no index route), `src/app/root.tsx` (`Layout`, `Outlet`, generic production `ErrorBoundary`, `lang="en"`), `src/app/routes/status.tsx` (loader, `headers`, `meta`, semantic HTML with `data-status="ok|degraded"`, no Tailwind). Verify the v8.4 context API shapes (R2). Run green. Traces: SS Status route; SS Response shape and disclosure limits; SS Response headers; design §6.2.
- [ ] 4.9 Create `workers/app.ts` per design §6.3 (`createRequestHandler`, module-scope `createIsolateState()`, `readWorkerEnv`, names-only `console.error` + 500 "Service unavailable" on invalid env, `RouterContextProvider` with `servicesContext`, `defer: ctx.waitUntil`). Not unit-tested (known gap, design §15); covered by `pnpm build`, env tests and the deploy smoke check. Verify: `pnpm build` completes offline with no login prompt (STOP 1 otherwise) and emits `build/server/wrangler.json`. Commit `feat(status): serve /status from react router on workers`. Traces: RC Worker failure behavior (Misconfigured Worker); DP Delivery framework (Build); SS Deployed endpoint; design §6.3, §15.
- [ ] 4.10 Runtime harness: run `pnpm dev`, request `GET /status`, confirm a response (`degraded`/503 without a local Postgres; `ok`/200 when `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` points to `TEST_DATABASE_URL`-style Postgres) and that `/` is 404; stop the dev server. Any login prompt: STOP 1. Verify the local-connection env var name (R7). Traces: DH Runtime connection through Hyperdrive (Local development); SS Status route; design §9.1, §14.

### 4. CI build step and config

- [ ] 4.11 Add `pnpm build` to the `verify` job in `.github/workflows/ci.yml` after tests. Set `rules.verify.build_command: "pnpm build"` in `openspec/config.yaml` (the script now exists) and refresh Engram `sdd-init/calmainquieta` and `sdd/calmainquieta/testing-capabilities`; read back and compare. Add unit-level assertion `tooling/repo-hygiene.test.ts` that `.env.example` and `.dev.vars.example` list every variable name of `workerEnvSchema`/`migrationEnvSchema` (names only, no values). Commit `ci: build the worker in verify`. Traces: DP Strict TDD activation (Build command not invented); DP CI verify gate; RC Example files (Example completeness); design §10, §11.
- [ ] 4.12 Slice gate and PR: full local gate (`pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:coverage`, `pnpm build`) green; push `feat/s3-1-runtime`; open PR 4 (base `main`); CI green. Traces: DP CI verify gate; DP Delivery framework.

**S3.1 gate**: authored lines at most 400; `pnpm build` offline; `/status` verified locally; no Cloudflare login ever requested.

---

## S3.2: Deploy job + documentation + owner runbook (branch `feat/s3-2-deploy-docs`, PR 5, base `main`)

### 1. CI deploy job

- [ ] 5.1 Extend `.github/workflows/ci.yml` with job `deploy` (`needs: verify`, `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`, `concurrency: deploy-staging` with `cancel-in-progress: false`). First step `deploy-gate` (env maps the five secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `HYPERDRIVE_ID`, `MIGRATION_DATABASE_URL`, `STATUS_URL`; tests each only for non-emptiness): none set -> `::notice::` "deploy skipped: secrets not provisioned: <names>" and `ready=false`; some set -> fail with "deploy misconfigured: missing <names>"; all set -> `ready=true`; never echo a value. Every later step has `if: steps.deploy-gate.outputs.ready == 'true'`: checkout, pnpm, node, install, substitute `HYPERDRIVE_ID` into `wrangler.jsonc` with `sed -i` and assert with `grep -q` (never committed), `pnpm build`, `pnpm db:migrate` (env `MIGRATION_DATABASE_URL`), `pnpm exec wrangler deploy --var BUILD_COMMIT:${{ github.sha }}` (env `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`), smoke `curl -fsS --retry 3 --retry-delay 5 "$STATUS_URL" | grep -q 'data-status="ok"'`. No secret is referenced outside `deploy`. Actions SHA-pinned. Test the gate logic locally by extracting the script into a shell function exercised with the three env cases (none, partial, all) and asserting messages list names only. This workflow is never run with real credentials by apply. Commit `ci: migrate and deploy to workers.dev on main`. Traces: DP Deploy to workers.dev (Deploy ordering, Verification failure blocks deploy, Migration failure blocks deploy, Pull request does not deploy, Secrets absent); SS Deployed endpoint; design D10, §9.2, §9.3, §10.

### 2. Documentation

- [ ] 5.2 Create `docs/adr/0001-stack.md` (React Router 8.4 framework mode on Workers, full manifest of design §2, the React Router 7 -> 8.4 and Vitest 4 -> 5.0.3 bumps with rationale and the TypeScript 6.0 vs 7 constraint). Traces: DP Documentation set (ADR coverage); design D1, D11, §2.
- [ ] 5.3 Create `docs/adr/0002-hosting-and-environments.md` (Workers Paid, workers.dev, one Neon project with `main` and `staging`, Hyperdrive with caching off, the owner-provisioning model OD-2, secrets list, token scope with the C3 fallback permission, rotation, the secret-presence deploy gate). Traces: DP Documentation set; DH Neon layout (Branch roles); design D10, §9.
- [ ] 5.4 Create `docs/adr/0003-architecture-testing-data.md` (screaming modules + hexagonal layers, element map and allow matrix, architecture test, Result and use-case style, testing strategy, embedded-postgres, forward-only migrations with expand/contract, D12 memoization with its residual Neon-wake risk and the change-8 follow-up). Replaces any overview. Traces: DP Documentation set; AB Layer structure; design D3, D5, D7, D9, D11, D12.
- [ ] 5.5 Create `docs/runbooks/cloud-provisioning.md` marked "executed by the owner, not by apply", with steps C1, C2, N1, N2 (the exact SQL block of design §9.4), N3, N4, C3 (exact permissions: Account / Workers Scripts / Edit, Account / Hyperdrive / Read, Account / Account Settings / Read; no zone; TTL 12 months; fallback permission Hyperdrive Edit), C4 (Hyperdrive `calma-staging`, caching disabled), G1 (`gh secret set <NAME> --repo tiagorojas7/calma-inquieta` for each of the five secrets, interactive prompt), G2 (re-run CI; expect `data-status="ok"`), plus the rollback and rotation notes. Verify the Neon branch role inheritance and the Hyperdrive caching toggle name against current docs while writing (R7). Traces: DH Neon layout (Branch roles, Provisioning without authorization); DP Secrets absent; design §9.2, §9.4, §17.
- [ ] 5.6 Create `README.md`: prerequisites (Node 24 via `.nvmrc`, pnpm 12), commands table (design §14), environment sources per environment (design §9.1), how `pnpm test` gets a database (embedded-postgres or `TEST_DATABASE_URL`), branch convention (every slice by PR, merge only with green CI, no enforced protection on GitHub Free), pointers to ADRs and the runbook. Commit `docs: add adrs, readme and owner provisioning runbook`. Traces: RC Per-environment sources (README documents sources); DP Branch protection by convention (Convention documented); DP Documentation set; design §9.1, §12 S3.2, §18 R9.
- [ ] 5.7 Final audit: `git log --format=%B main..HEAD` shows no `Co-Authored-By` line or AI attribution across every slice (DP History audit); `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage && pnpm build` green; push `feat/s3-2-deploy-docs`; open PR 5 (base `main`); confirm CI `verify` green and the `deploy` job reports the "secrets not provisioned" notice (green). Traces: DP Commit conventions (History audit); DP Deploy to workers.dev (Secrets absent); DP CI verify gate.

**S3.2 gate**: authored lines at most 400; deploy job skips cleanly without secrets.

---

## OWNER — not executed by apply

Apply MUST NOT perform, simulate or probe any of these steps and MUST NOT use cloud credentials. They follow `docs/runbooks/cloud-provisioning.md` after PR 5 merges. Traces: design OD-2, §9.4, R6.

- [ ] O.1 OWNER — not executed by apply. C1: Cloudflare dashboard, upgrade the studio account to Workers Paid.
- [ ] O.2 OWNER — not executed by apply. C2: claim the workers.dev subdomain; note `<account-subdomain>` for `STATUS_URL`.
- [ ] O.3 OWNER — not executed by apply. N1-N3: Neon project `calma-inquieta` (`aws-sa-east-1`, PostgreSQL 17, database `calma`); on `main` run the N2 role/grant SQL; create branch `staging`.
- [ ] O.4 OWNER — not executed by apply. N4: copy the two direct (non-pooled) connection strings of `staging` (`neondb_owner` and `calma_app`, both `sslmode=require`).
- [ ] O.5 OWNER — not executed by apply. C3: create the scoped Cloudflare API token `calma-inquieta-ci` (Workers Scripts Edit, Hyperdrive Read, Account Settings Read; account-only; 12-month TTL).
- [ ] O.6 OWNER — not executed by apply. C4: create Hyperdrive `calma-staging` with the `calma_app` direct URL and caching disabled; note its id.
- [ ] O.7 OWNER — not executed by apply. G1: `gh secret set` for `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `HYPERDRIVE_ID`, `MIGRATION_DATABASE_URL`, `STATUS_URL` with `--repo tiagorojas7/calma-inquieta`; verify with `gh secret list`.
- [ ] O.8 OWNER — not executed by apply. G2: push or re-run CI on `main`; the deploy job migrates `staging`, deploys, and the smoke check reads `data-status="ok"`. Closes SS Deployed endpoint (Deployed and healthy) and DP Deploy to workers.dev for verification.

---

## Dependency and parallelism notes

- Slices are strictly sequential (S0 -> S1 -> S2.1 -> S2.2 -> S3.1 -> S3.2); each PR merges before the next branches (stacked-to-main).
- Inside S1: 1.1 -> 1.2 -> 1.3 -> 1.4/1.5 -> 1.6..1.9 -> 1.10 are sequential. 1.4 and 1.5 may share a commit.
- Inside S2.1: 2.1-2.11 (application core) and 2.12-2.15 (boundaries) are independent tracks and can run in parallel in principle; the architecture test (2.13) needs `src/modules/system-status/**` and `src/testing/fakes/fixed-clock.ts` to exist as real import targets, so run the boundaries track after 2.11.
- Inside S2.2: 3.2-3.3 (env) and 3.5-3.6 (migrations) can proceed in parallel; 3.4 (RED) stays red until 3.11; 3.12 needs 3.6-3.11.
- Inside S3.1: 4.2-4.3 (env) and 4.4-4.5 (composition) are independent after 4.1; 4.6-4.9 (delivery) need 4.5.
- Inside S3.2: 5.1 and 5.2-5.6 are independent; 5.7 is last.
- Owner steps O.1-O.8 are fully independent of apply and may happen any time after PR 5 merges.

## Review Workload Forecast

| Slice | Estimated authored lines |
|-------|--------------------------|
| S0 | 60-80 |
| S1 | 330-390 |
| S2.1 | 300-370 |
| S2.2 | 305-365 |
| S3.1 | 295-365 |
| S3.2 | 230-290 |
| Total | 1,520-1,860 |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Recommended chain strategy: stacked-to-main. Rationale: each slice is independently green and deploy-safe (secret-presence gate), so ordered merges to `main` keep diffs small and revertable without a tracker branch.
