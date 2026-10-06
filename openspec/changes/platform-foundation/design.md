# Design: Platform Foundation (walking skeleton)

Change 1 of 8 | Project: calmainquieta | Store: hybrid | Phase: sdd-design | Date: 2026-10-05
Inputs: `proposal.md` (Engram #208), Engram `calmainquieta/approved-plan` (#207, authoritative), `exploration.md` sections 1.3-1.5, 4.1-4.6, 6, 7, 12 (Workers Paid parts), `openspec/config.yaml`.
Adopted decisions: OD-1 (a) embedded-postgres, OD-3 (a) CI deploy on `main`, OD-4 (a) one Neon project, OD-5 (a) no paid GitHub plan, OD-6 (a) WebP + git-ignored originals. **OD-2 answered by the owner (2026-10-05)**: the owner provisions Cloudflare (Workers Paid) and Neon with the studio account, following a step-by-step runbook that this change provides. The owner loads every value directly as GitHub Actions secrets with `gh secret set`. Tokens never pass through chat or any agent. Any step that needs cloud credentials is an owner runbook step, not an apply task (section 9).

> **Design in one paragraph.** A single pnpm package (Node 24, TypeScript 6.0, React Router 8 framework mode, Cloudflare Vite plugin) deploys one Worker to workers.dev. Business code lives in screaming modules under `src/modules/*` with hexagonal layers; `eslint-plugin-boundaries` is the single source of truth for the dependency rule, and a Vitest fitness test drives ESLint against known-bad imports. One use case, `GetSystemStatus`, crosses domain, application, infrastructure (Drizzle + `pg`), composition, delivery (`/status` loader) and the Worker entry. Tests and runtime share one driver (`pg`): Hyperdrive in the Worker, embedded PostgreSQL 17 in Vitest global setup. Strict TDD is switched on right after the runner and `pnpm test` exist and before the first behavior task (`Money`). CI runs lint, format check, typecheck, tests with coverage, build and gitleaks. On `main`, once the owner-loaded secrets exist, it migrates Neon `staging` and deploys. The database check behind `/status` is memoized per isolate for 60 seconds (D12). The honest bottom-up forecast is about 1,520-1,860 authored lines in 6 PR slices of 400 lines or less (section 13).

---

## 1. Technical Approach

| Concern | Approach | Proposal/spec reference |
|---|---|---|
| Delivery framework | React Router 8.4 framework mode (SSR) on Workers via `@cloudflare/vite-plugin`; `appDirectory: "src/app"` | Proposal 4.2, ADR-001 |
| Architecture | Screaming modules + hexagonal layers + composition root; lint rule + architecture test | Capability `architecture-boundaries` |
| First behavior | `Money` value object (shared kernel) as the first Strict TDD RED/GREEN | Capability `shared-kernel` |
| Walking skeleton | `system-status` module: `GetSystemStatus` reads Postgres through the `DatabaseProbe` port | Capability `system-status` |
| Database | Drizzle 0.45 + `pg`; forward-only SQL migrations; one `runMigrations` function shared by tests and CI | Capability `database-harness` |
| Test database | `embedded-postgres` 17 started in Vitest global setup; `TEST_DATABASE_URL` override | OD-1 (a) |
| Configuration | zod schemas for Worker bindings and Node scripts; names-only errors | Capability `runtime-configuration` |
| Pipeline | GitHub Actions `ci.yml`: `verify` on PR and `main`; `deploy` on `main`, gated by the presence of owner-loaded secrets (D10) | Capability `delivery-pipeline`, OD-3 (a) |

Spec alignment: the spec phase runs in parallel. If a spec names an observable field, status code or header differently from this design, the spec wins for the observable contract and apply aligns names; this design owns structure, layering and tooling.

---

## 2. Version manifest

Facts checked by the orchestrator on the npm registry on 2026-10-05. Apply re-checks exact versions at install time; the lockfile records them. All direct dependencies are pinned exactly (no `^`), using the pnpm exact-save setting (verify the setting name for pnpm 12 in apply).

| Package / tool | Version | Notes |
|---|---|---|
| Node.js | 24 LTS (`.nvmrc`: `24`; `engines.node: ">=24 <25"`) | Active LTS on 2026-10-05 |
| pnpm | 12.9.1 (`packageManager` field) | Build-script allowlist for `esbuild`, `workerd`, `@embedded-postgres/*` (setting name: verify in apply) |
| react-router, @react-router/dev | 8.4.0 | Current major. The approved plan says "React Router 7"; the decision it records is React Router framework mode, which v8 continues (ADR-001) |
| react, react-dom | 19.3.0 | |
| @cloudflare/vite-plugin | 1.62.5 | |
| wrangler | 4.147.0 | |
| vite | the major that satisfies the peers of `@react-router/dev` 8.4.0, `@cloudflare/vite-plugin` 1.62.5 and `vitest` 5.0.3 together | Verify in apply |
| vitest, @vitest/coverage-v8 | 5.0.3 (same version for both) | |
| typescript | latest 6.0.x | NOT 7.x: `typescript-eslint` 8.71.1 requires `>=4.8.4 <6.1.0`; `@react-router/dev` accepts `^5.1 \|\| ^6 \|\| ^7` |
| eslint | 10.12.0 | Flat config, `eslint.config.ts` |
| typescript-eslint | 8.71.1 | `strictTypeChecked` |
| eslint-plugin-boundaries | 7.2.0 | Rule names and selector syntax for v7: verify in apply |
| eslint-import-resolver-typescript | current | Needed by boundaries to resolve the `~/` alias; verify ESLint 10 compatibility |
| prettier | current 3.x | `endOfLine: "lf"` |
| drizzle-orm / drizzle-kit | 0.45.3 / 0.31.11 | Stable line; 1.0 beta avoided |
| pg / @types/pg | 8.23.1 / current | Same driver in Worker and Node |
| zod | 4.6.5 | |
| embedded-postgres | 17.10.0-beta.17 (exact) | PostgreSQL 17 = Neon major; win-x64 and linux-x64 binaries; only beta tags exist (risk R1) |
| tsx | current | Runs `scripts/migrate.ts` (Node scripts import extensionless TS paths) |
| @types/node | 24.x | |
| gitleaks CLI | latest 8.x release binary, SHA-256 verified in CI | Subcommand names (`git`, `dir`) verify in apply |
| @t3-oss/env-core | 0.13.11 | **Rejected** (decision D6) |

---

## 3. Architecture Decisions

### D1. Stack (recorded as ADR-001)
**Choice**: React Router 8.4 framework mode on Cloudflare Workers Paid, built with Vite and `@cloudflare/vite-plugin`; Node 24; pnpm 12; TypeScript 6.0 strict.
**Alternatives considered**: Next.js 16 with the OpenNext adapter (adapter churn, heavier SSR CPU, Windows tooling gaps); staying on React Router 7.x (an older major for a greenfield project, no benefit); TypeScript 7.0.2 (blocked by the `typescript-eslint` peer range).
**Rationale**: The approved plan selected React Router framework mode on Workers. v8 is the current major of the same framework, with loaders and actions as plain, unit-testable functions. Only `src/app/` and `workers/` depend on React Router, so the framework stays replaceable.
**Version bumps recorded in ADR-001**: React Router 7 -> 8.4.0 and Vitest 4 -> 5.0.3. The proposal and approved plan named the earlier majors; both are now one major behind, and a greenfield project starts on the current one. The ADR also lists the full manifest in section 2.

### D2. One package, screaming modules, hexagonal layers
**Choice**: A single package (no monorepo). The `src/` folders name the business (`src/modules/<module>/{domain,application,infrastructure,index.ts}`). There is also a flat, import-free shared kernel (`src/modules/_shared`), a composition root (`src/composition`), platform adapters (`src/platform`), delivery (`src/app`) and the Worker entry (`workers/`).
**Alternatives considered**: a pnpm workspace with one package per module (too much ceremony for one developer and 8 changes); layer-first folders (`controllers/`, `services/`), which hide the business.
**Rationale**: Exploration 4.1-4.3 (still valid). One package keeps one `pnpm test`, one lockfile and one tsconfig. Boundaries are enforced by tooling, not by package walls.

### D3. Dependency rule: ESLint is the single source, the architecture test drives it
**Choice**: `eslint-plugin-boundaries` holds the element map and the allow matrix (section 5). `tooling/architecture/architecture.test.ts` runs the ESLint Node API with a rule filter limited to `boundaries/*`. It (a) lints virtual fixture files placed at real layer paths with known-forbidden imports and expects the violations, (b) runs a positive control, and (c) lints `src/` and `workers/` and expects zero boundary messages.
**Alternatives considered**: a hand-written import checker plus ESLint, which keeps two rule sets that can drift (about 120 more lines); dependency-cruiser (one more tool and config format); the lint rule alone (the proposal requires a test-level fitness function proven with a violating fixture).
**Rationale**: One rule set, two gates (`pnpm lint` and `pnpm test`). The fixture proves the rule fails on violations, so a misconfigured plugin cannot pass silently.

### D4. Same driver in tests and runtime: Drizzle + `pg`, Hyperdrive in the Worker
**Choice**: `drizzle-orm/node-postgres` with `pg.Client`. In the Worker, one client per request is created from `env.HYPERDRIVE.connectionString` and closed through `ctx.waitUntil(client.end())`. In Node (tests, migrations), the client uses a direct URL. The Hyperdrive config is created with query caching disabled.
**Alternatives considered**: the Neon serverless driver in the Worker (a different driver from the tests, and its HTTP mode has no interactive transactions, which change 5 needs for seat claims); `pg.Pool` in the Worker (Hyperdrive already pools; a module-level pool leaks across requests); Hyperdrive caching on (stale reads after admin writes, and a cached `/status` could hide an outage).
**Rationale**: One adapter is tested against real PostgreSQL 17 and runs unchanged in production. Exploration 6.1 needs real locking semantics later.

### D5. Embedded PostgreSQL 17 in Vitest global setup (OD-1 a)
**Choice**: `embedded-postgres` starts a throwaway cluster on a free port in a temp directory. The cluster runs with `fsync`, `synchronous_commit` and `full_page_writes` off and `timezone=UTC`. Global setup migrates a template database once. Each DB-backed test file clones its own database (`CREATE DATABASE ... TEMPLATE`) and drops it with `DROP DATABASE ... WITH (FORCE)`. `TEST_DATABASE_URL` (an admin URL with CREATEDB) replaces the embedded server, for example with WSL2 Postgres.
**Alternatives considered**: see proposal 4.4 (WSL2 native as the default, Neon branch, PGlite, Testcontainers).
**Rationale**: A fresh clone runs `pnpm i && pnpm test` on Windows and Linux without Docker. Per-file databases allow parallel files and the concurrency tests that change 5 needs.

### D6. Environment validation with plain zod; `@t3-oss/env-core` rejected
**Choice**: `src/platform/env.ts` exports zod schemas (`workerEnvSchema`, `migrationEnvSchema`, `testEnvSchema`) and one `parseEnv(schema, source): Result<T, EnvError>`. `EnvError` carries variable names only. The Worker caches the parse per `env` object (WeakMap).
**Alternatives considered**: `@t3-oss/env-core` 0.13.11. It is designed for string `process.env` with client/server prefixes; Worker bindings are objects (`HYPERDRIVE`), and its default error output is not guaranteed to be names-only.
**Rationale**: About 30 lines, one fewer dependency, and a testable guarantee that values never appear in errors (zod 4 issues omit inputs unless `reportInput` is set; the test asserts it).
**Spec refinement (single validation schema)**: the spec's "single validation schema" holds as one module and one source of truth. `src/platform/env.ts` is the only place variables are declared, and all three runtimes go through the same `parseEnv` and the same names-only error format. It exports three schemas because each runtime receives a different variable set:
- Worker bindings, including the `HYPERDRIVE` object.
- The migration script (`MIGRATION_DATABASE_URL`).
- The test harness (optional `TEST_DATABASE_URL`).

One merged schema would require Worker-only bindings in Node scripts, or the reverse. Delivery is staged: `parseEnv`, `formatEnvError`, `migrationEnvSchema` and `testEnvSchema` land in S2.2, so `scripts/migrate.ts` and the test harness validate through the shared module in the same slice. `workerEnvSchema` and `readWorkerEnv` land in S3.1 with the Worker.

### D7. Use cases are factory-built functions returning `Result`
**Choice**: `createGetSystemStatus(deps): GetSystemStatus`, where `GetSystemStatus = () => Promise<Result<SystemStatusView, never>>`. Expected failures are values. A degraded system is data, not an error, so `E = never`. Defects throw. Dependencies are passed by hand in the composition root (no DI container). TypeScript `erasableSyntaxOnly: true` (no enums, no parameter properties).
**Alternatives considered**: classes with `execute()`; a DI container.
**Rationale**: Exploration 4.1 principles. Plain functions are trivially faked and tested. The uniform `Result` return keeps delivery mapping identical across all later use cases.

### D8. Strict TDD gate ordering (resolves a proposal/config ordering conflict)
**Choice**: Install the runner, define `pnpm test`, then flip `strict_tdd` and `rules.apply.tdd` in `openspec/config.yaml` and refresh Engram. Then write `Money` as the first behavior task under Strict TDD; its observed RED run is the first real-test proof of the runner.
**Alternatives considered**: proposal 4.1 order (Money RED/GREEN first, then flip).
**Rationale**: `openspec/config.yaml` `rules.tasks` requires the strict switch "before any behavior task", and `Money` is behavior. Activation is verified with `pnpm test -- --passWithNoTests` (the runner and config load; exit 0). The real proof is the Money RED to GREEN cycle right after it.
**Spec alignment**: the validator confirmed this ordering, and the orchestrator is amending the `delivery-pipeline` and `shared-kernel` specs to match it (activation before Money; Money is the first RED/GREEN under Strict TDD).

### D9. Migrations: forward-only SQL, one migration function for tests and CI
**Choice**: `drizzle-kit generate` writes SQL to `drizzle/`. `src/platform/db/migrate.ts` exports `runMigrations(url)` (drizzle-orm migrator, `migrationsSchema: "drizzle"`, `migrationsTable: "__drizzle_migrations"`). Vitest global setup, the from-scratch test and `pnpm db:migrate` (`tsx scripts/migrate.ts`, which runs in CI before deploy) all call it. Migrations follow expand/contract: the previously deployed Worker must keep working on the new schema, because migration precedes deploy. The baseline `0000_baseline.sql` is a custom migration with one DDL statement, `COMMENT ON SCHEMA public IS 'Calma Inquieta application schema';`. It proves the migration role has DDL ownership on Neon; if ownership differs, fall back to `SELECT 1;` and record why.
**Alternatives considered**: `drizzle-kit migrate` for CI (a second code path from the tests, and its config needs credentials even for `generate`); `drizzle-kit push` (no history).
**Rationale**: The code path that CI runs against Neon is the one the tests exercise on every run.

### D10. CI: one workflow, deploy gated by the presence of owner-loaded secrets (OD-2, OD-3 a, OD-5 a)
**Choice**: `.github/workflows/ci.yml` with a `verify` job (PRs and pushes to `main`) and a `deploy` job (`needs: verify`, push to `main` only). The deploy job's first step, `deploy-gate`, maps the five deploy secrets (section 9.2) into step env and tests each one only for non-emptiness. Its messages list secret NAMES only and never echo a value.
- None set: the job emits a notice ("deploy skipped: secrets not provisioned: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, HYPERDRIVE_ID, MIGRATION_DATABASE_URL, STATUS_URL"). Every later step is skipped by `if: steps.deploy-gate.outputs.ready == 'true'`.
- Only some set: the step fails with an error naming the missing secrets (for example "deploy misconfigured: missing HYPERDRIVE_ID, STATUS_URL").
- All set: deploy proceeds.

CI reads only repository secrets; there are no repository variables and no GitHub Environments (Environments are not available for private repos on GitHub Free; verify in apply). Third-party actions are pinned by commit SHA. Workflow `permissions: contents: read`. The trigger is `pull_request`, never `pull_request_target`.
**Alternatives considered**: a `DEPLOY_ENABLED` repository variable (a second mechanism the owner must set; job-level `if` cannot read secrets, so the check has to run at step level anyway); separate deploy workflow via `workflow_run` (more moving parts); manual deploy (OD-3 b).
**Rationale**: Slices S1-S3.1 merge with green CI before any cloud account exists. Deploy turns on by itself the moment the owner finishes `gh secret set`. No agent ever handles a credential.

### D11. ADR consolidation
**Choice**: Three ADRs:
- ADR-001: stack and version manifest, including the React Router 8 and Vitest 5 bumps.
- ADR-002: hosting, accounts, environments, secrets and the owner-provisioning model.
- ADR-003: architecture, testing and data conventions. It merges proposal ADR-004 and ADR-005, replaces `docs/architecture/overview.md`, and records the D12 `/status` memoization with its residual Neon-wake risk.
**Alternatives considered**: five ADRs plus an overview (proposal 4.7).
**Rationale**: Saves about 100 authored lines with no loss of decisions, because ADR-003 is the overview.

### D12. `/status` database check memoized per isolate for 60 s (Neon wake protection)
**Choice**: The decorator `createMemoizedDatabaseProbe(inner, { clock, ttlMs: 60_000, cell })` (application layer, pure logic over the `Clock` port) returns the last probe result while it is younger than 60 s. The `cell` holds plain resolved data only (`{ result, observedAtMs }`), never a Promise. It lives in an isolate-scoped `IsolateState` created once at module scope in `workers/app.ts` and passed into `createRequestServices`. HTTP stays `Cache-Control: no-store`: the memo is internal, so each response is still computed by the Worker. `checkedAt` remains the server time of the response; the database check may be up to 60 s old, and the HTTP contract does not expose that age.
**Alternatives considered**:
- Cache API with a 60 s TTL: `caches.default` does not store responses on `*.workers.dev` hosts (no zone cache; verify in apply), and it would conflict with `no-store` semantics.
- A token-gated database check: changes the spec'd public contract, and the CI smoke check would need another secret.
- Cloudflare rate limiting rules: need a zone (custom domain arrives in change 8).
- No protection: a burst of requests would open one Neon connection each and spend Hyperdrive queries.
- Sharing an in-flight Promise across requests (single-flight): Workers forbid using I/O objects created by another request.

**Rationale**: The memo bounds database traffic from `/status` to at most one query per minute per isolate, whatever the request rate. That neutralizes bursts and scanners. Residual risk, recorded honestly: a steady poller hitting `/status` more often than Neon's 5-minute suspend timeout would still keep compute awake, and no in-Worker cache can prevent that without hiding database state for longer than 5 minutes. Today the URL is unadvertised and the staging branch carries no traffic. Change 8 adds the Neon CU-hour alert (70 %) and must point the uptime monitor at a database-free endpoint. If CU usage shows `/status`-driven wake-ups earlier, escalate to a token-gated database check.

---

## 4. Folder tree (end state of this change)

```
.github/workflows/ci.yml
docs/
  adr/0001-stack.md  0002-hosting-and-environments.md  0003-architecture-testing-data.md
  runbooks/cloud-provisioning.md
  client-proposal/README.md            name map + SHA-256 of PNG originals
  client-proposal/mockups/image1..20.webp
  client-proposal/_originals/          git-ignored PNG originals
drizzle/0000_baseline.sql  drizzle/meta/** (generated)
scripts/migrate.ts                     CI/local migration entry (tsx)
tooling/architecture/architecture.test.ts
workers/app.ts                         Worker fetch handler (env -> services -> React Router)
src/
  app/                                 DELIVERY (React Router only)
    root.tsx  routes.ts  context.ts
    routes/status.tsx  routes/status.test.ts
  modules/
    _shared/                           SHARED KERNEL (zero imports)
      money.ts  money.test.ts  result.ts  clock.ts  index.ts
    system-status/
      domain/system-status.ts (+ .test.ts)
      application/ports.ts  application/get-system-status.ts (+ .test.ts)
      application/memoized-database-probe.ts (+ .test.ts)
      infrastructure/drizzle-database-probe.ts (+ .db.test.ts)
      index.ts                         PUBLIC API
  composition/request-services.ts (+ .db.test.ts)
  platform/
    env.ts (+ .test.ts)
    db/session.ts  db/migrate.ts  db/migration-catalog.ts  db/migrate.db.test.ts
    system-clock.ts
  testing/
    db/postgres-server.ts  db/global-setup.ts  db/test-database.ts
    fakes/fixed-clock.ts  fakes/in-memory-database-probe.ts (+ .test.ts)
    contracts/database-probe.contract.ts
    react-router.ts                    loader-args helper
AGENTS.md  README.md  package.json  pnpm-workspace.yaml  tsconfig.json  eslint.config.ts
.prettierrc.json  .prettierignore  vitest.config.ts  vite.config.ts  react-router.config.ts
wrangler.jsonc  drizzle.config.ts  .env.example  .dev.vars.example
.gitignore  .gitattributes  .editorconfig  .nvmrc
```

Path alias: `~/*` -> `src/*` in `tsconfig.json` `paths` (no `baseUrl`, which TypeScript 6 deprecates). The alias is mirrored by `resolve.alias` in `vite.config.ts` and `vitest.config.ts`. `rootDirs: [".", "./.react-router/types"]` covers generated route types.

---

## 5. Dependency rule and enforcement

### 5.1 Element map (first match wins; order matters)

| Element | Pattern | Captures |
|---|---|---|
| `shared` | `src/modules/_shared/**` | |
| `module-api` | `src/modules/*/index.ts` | `module` |
| `domain` | `src/modules/*/domain/**` | `module` |
| `application` | `src/modules/*/application/**` | `module` |
| `infrastructure` | `src/modules/*/infrastructure/**` | `module` |
| `platform` | `src/platform/**` | |
| `composition` | `src/composition/**` | |
| `delivery` | `src/app/**` | |
| `worker` | `workers/**` | |
| `testing` | `src/testing/**` | |

Test files (`**/*.test.ts(x)`, `**/*.db.test.ts`) are ignored by boundaries; they are still type-checked and linted. Unclassified files under `src/` fail (`no-unknown-files`), so every new folder must be classified.

### 5.2 Allow matrix (default: disallow)

| From | May import (internal) | May import (packages) |
|---|---|---|
| `shared` | nothing | nothing |
| `domain` | `shared`; `domain` of the same module | nothing |
| `application` | `shared`; `domain` and `application` of the same module; `module-api` of other modules | nothing |
| `module-api` | `shared`; `domain` and `application` of the same module | nothing |
| `infrastructure` | `shared`; `domain`, `application` and `infrastructure` of the same module; `platform` | `drizzle-orm`, `pg` |
| `platform` | `shared`, `platform` | `zod`, `pg`, `drizzle-orm`, Node built-ins (Node-only files) |
| `composition` | `shared`, `module-api`, `infrastructure` (any module), `platform`, `composition` | nothing |
| `delivery` | `shared`, `module-api`, `composition` (types and context only), `delivery` | `react`, `react-dom`, `react-router` |
| `worker` | `delivery`, `composition`, `platform` | `react-router`, `virtual:react-router/server-build` |
| `testing` | anything | anything |

No production element may import `testing` (it is in no allow list). Adapters are instantiated only in `composition`.

### 5.3 Architecture test (fitness function)

The test calls `new ESLint({ cwd, ruleFilter: r => r.ruleId.startsWith("boundaries/") })`. If `ruleFilter` is unavailable in ESLint 10, filter the messages by `ruleId` instead. Fixture sources are linted with `lintText(code, { filePath })` at virtual paths named `*.fixture.ts(x)`. `eslint.config.ts` disables type-aware parsing for `**/*.fixture.{ts,tsx}`, so virtual files need no TS project. Imported targets are real files, so the resolver can classify them.

| # | Virtual file | Import | Expected |
|---|---|---|---|
| 1 | `src/modules/system-status/domain/x.fixture.ts` | `drizzle-orm` | violation (package in pure layer) |
| 2 | `src/modules/system-status/domain/x.fixture.ts` | `../application/ports` | violation (domain -> application) |
| 3 | `src/app/routes/x.fixture.tsx` | `~/modules/system-status/application/get-system-status` | violation (bypasses `index.ts`) |
| 4 | `src/app/routes/x.fixture.tsx` | `pg` | violation (driver in delivery) |
| 5 | `src/modules/demo/application/x.fixture.ts` | `~/modules/system-status/domain/system-status` | violation (cross-module internals) |
| 6 | `src/modules/system-status/application/x.fixture.ts` | `~/testing/fakes/fixed-clock` | violation (production -> testing) |
| 7 | `src/modules/system-status/domain/x.fixture.ts` | `../infrastructure/drizzle-database-probe` | violation (added in S2.2 when the target exists) |
| 8 | `src/app/routes/x.fixture.tsx` | `~/modules/system-status` | no violation (positive control) |
| 9 | real tree `src/`, `workers/` | n/a | zero `boundaries/*` messages |

`AGENTS.md` states this rule in prose for AI agents, along with the TDD and commit rules.

---

## 6. `system-status` across every layer

### 6.1 Contracts

```ts
// src/modules/_shared/result.ts
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// src/modules/_shared/clock.ts
export interface Clock { now(): Date }

// src/modules/system-status/domain/system-status.ts
export type CheckStatus = "pass" | "fail";
export interface HealthCheck { readonly name: "database" | "migrations"; readonly status: CheckStatus }
export type OverallStatus = "ok" | "degraded";
/** ok only when there is at least one check and every check passes. */
export function overallStatus(checks: readonly HealthCheck[]): OverallStatus;

// src/modules/system-status/application/ports.ts
export type DatabaseProbeResult =
  | { readonly reachable: true; readonly latestMigration: string | null }
  | { readonly reachable: false };
/** Contract: never throws; every failure maps to { reachable: false }. */
export interface DatabaseProbe { probe(): Promise<DatabaseProbeResult> }

// src/modules/system-status/application/get-system-status.ts
export interface SystemStatusView {
  readonly status: OverallStatus;
  readonly checks: readonly HealthCheck[];   // database: reachable; migrations: latestMigration !== null
  readonly latestMigration: string | null;   // e.g. "0000_baseline"
  readonly buildCommit: string;
  readonly checkedAt: string;                // ISO-8601 UTC from Clock
}
export interface GetSystemStatusDeps { probe: DatabaseProbe; clock: Clock; buildCommit: string }
export type GetSystemStatus = () => Promise<Result<SystemStatusView, never>>;
export function createGetSystemStatus(deps: GetSystemStatusDeps): GetSystemStatus;
// Defensive: a probe that throws (contract breach) is treated as { reachable: false }.

// src/modules/system-status/application/memoized-database-probe.ts   (D12)
export interface ProbeMemoCell { value?: { readonly result: DatabaseProbeResult; readonly observedAtMs: number } }
export function createProbeMemoCell(): ProbeMemoCell;
export function createMemoizedDatabaseProbe(
  inner: DatabaseProbe,
  options: { clock: Clock; ttlMs: number; cell: ProbeMemoCell },
): DatabaseProbe;
// hit: now - observedAtMs < ttlMs -> cached result, inner not called
// miss/expired: await inner.probe(), store plain data, return it

// src/modules/system-status/index.ts (public API)
export { createGetSystemStatus } from "./application/get-system-status";
export { createMemoizedDatabaseProbe, createProbeMemoCell } from "./application/memoized-database-probe";
export type { ProbeMemoCell } from "./application/memoized-database-probe";
export type { GetSystemStatus, SystemStatusView, GetSystemStatusDeps } from "./application/get-system-status";
export type { DatabaseProbe, DatabaseProbeResult } from "./application/ports";
```

```ts
// src/platform/db/session.ts
export interface DbSession { readonly db: NodePgDatabase; close(): Promise<void> }
export type DbSessionFactory = () => Promise<DbSession>;
export function createDbSessionFactory(options: {
  connectionString: string;
  defer?: (pending: Promise<unknown>) => void;   // Worker: ctx.waitUntil; Node: undefined (awaited)
  connectTimeoutMs?: number;                     // default 5000
}): DbSessionFactory;

// src/platform/db/migration-catalog.ts  (imports drizzle/meta/_journal.json)
export function migrationTagFor(createdAtMillis: number): string;   // journal tag, or "unknown:<millis>"

// src/modules/system-status/infrastructure/drizzle-database-probe.ts
export function createDrizzleDatabaseProbe(openSession: DbSessionFactory): DatabaseProbe;
// SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1
// undefined_table (42P01) -> { reachable: true, latestMigration: null }; any other error -> { reachable: false }
// The session is always closed in finally.

// src/composition/request-services.ts
export interface AppServices { readonly getSystemStatus: GetSystemStatus }
export interface RuntimeConfig { readonly databaseUrl: string; readonly buildCommit: string }
export interface IsolateState { readonly statusProbeMemo: ProbeMemoCell }   // created once per isolate
export function createIsolateState(): IsolateState;
export function createRequestServices(
  config: RuntimeConfig,
  runtime: { defer?: (pending: Promise<unknown>) => void },
  isolate: IsolateState,
): AppServices;
// probe = createMemoizedDatabaseProbe(createDrizzleDatabaseProbe(sessionFactory),
//                                     { clock: systemClock, ttlMs: 60_000, cell: isolate.statusProbeMemo })

// src/app/context.ts
export const servicesContext = createContext<AppServices>();   // react-router createContext
```

Assumption (verify in apply): in drizzle-orm 0.45 the migrator stores the journal entry's `when` value in `drizzle.__drizzle_migrations.created_at`. If not, the probe reports the newest row's `hash` prefix and the catalog is dropped.

### 6.2 `/status` delivery

| Aspect | Design |
|---|---|
| Route | `src/app/routes.ts`: `route("status", "routes/status.tsx")`. There is no index route in this change, so `/` is a 404 until change 2 adds one |
| Loader | `context.get(servicesContext).getSystemStatus()` -> `data(view, { status: view.status === "ok" ? 200 : 503 })` |
| Headers | `headers` export: `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`; `meta` export: `robots noindex, nofollow`, title "System status" |
| Rendering | Plain semantic HTML (`<main>`, `<h1>`, `<dl>`); the overall status is in `data-status="ok\|degraded"` for the CI smoke check; no Tailwind |
| Disclosure | Only overall status, check names and states, migration tag, build commit and server time. No host, error text or stack. The root `ErrorBoundary` shows a generic message in production |
| Root | `src/app/root.tsx` with `Layout`, `Outlet` and `ErrorBoundary`; `lang="en"` until change 2 decides the UI copy language |

### 6.3 Worker entry

```ts
// workers/app.ts (shape; React Router v8 context API: verify in apply)
const handler = createRequestHandler(() => import("virtual:react-router/server-build"), import.meta.env.MODE);
const isolate = createIsolateState();                  // module scope = one per isolate (D12)
export default {
  async fetch(request, env, ctx) {
    const parsed = readWorkerEnv(env);                 // cached per env object
    if (!parsed.ok) {
      console.error(formatEnvError(parsed.error));     // "Invalid environment: HYPERDRIVE" (names only)
      return new Response("Service unavailable", { status: 500 });
    }
    const context = new RouterContextProvider();
    context.set(servicesContext, createRequestServices(
      { databaseUrl: parsed.value.HYPERDRIVE.connectionString, buildCommit: parsed.value.BUILD_COMMIT },
      { defer: (p) => ctx.waitUntil(p) },
      isolate,
    ));
    return handler(request, context);
  },
} satisfies ExportedHandler<Env>;
```

### 6.4 Sequence: GET /status (happy path and degraded path)

```
Client      Worker(app.ts)   platform/env   composition     RR handler + loader   GetSystemStatus    DrizzleProbe       Hyperdrive/Neon
  |--GET /status-->|              |               |                  |                   |                  |                   |
  |                |--readWorkerEnv(env)-->|      |                  |                   |                  |                   |
  |                |<--ok (cached)---------|      |                  |                   |                  |                   |
  |                |--createRequestServices(cfg, defer)-->|          |                   |                  |                   |
  |                |<--AppServices------------------------|          |                   |                  |                   |
  |                |--handler(request, context{services})----------->|                   |                  |                   |
  |                |                              |   loader: getSystemStatus()--------->|                  |                   |
  |                |                              |                  |                   |--probe()-------->|                   |
  |                |                              |                  |                   |                  |--connect()------->|
  |                |                              |                  |                   |                  |--SELECT created_at->|
  |                |                              |                  |                   |                  |<--row--------------|
  |                |                              |                  |                   |                  |--waitUntil(end())  |
  |                |                              |                  |                   |<--{reachable, "0000_baseline"}       |
  |                |                              |                  |                   |--clock.now(), overallStatus(checks)  |
  |                |                              |                  |<--ok(view)--------|                  |                   |
  |                |                              |   data(view, 200)|                   |                  |                   |
  |<--200 HTML data-status="ok", no-store, noindex------------------|                   |                  |                   |

Memo (D12): probe() is the memoized decorator. When the isolate's cell holds a result younger than 60 s, it returns that
          result and no connection is opened (the Hyperdrive/Neon lanes above are skipped). Otherwise it calls the Drizzle probe as shown.
Degraded: connect() or SELECT fails -> probe returns { reachable: false } -> checks database=fail, migrations=fail
          -> view.status "degraded" -> 503 with the same minimal payload (no error detail).
Invalid env: readWorkerEnv fails -> console.error(names only) -> 500 "Service unavailable"; no services are built.
```

---

## 7. Shared kernel `Money` (first Strict TDD proof)

```ts
// src/modules/_shared/money.ts
export type MoneyError = { readonly kind: "not-an-integer" } | { readonly kind: "out-of-range" };
export class Money {
  readonly #centavos: number;
  private constructor(centavos: number);         // normalizes -0 to 0
  static fromCentavos(value: number): Result<Money, MoneyError>;   // untrusted input -> Result
  static zero(): Money;
  toCentavos(): number;
  add(other: Money): Money;                       // throws RangeError beyond Number.MAX_SAFE_INTEGER (defect)
  subtract(other: Money): Money;                  // may be negative (signed ledger amounts, refunds)
  multiply(quantity: number): Money;              // quantity must be a safe integer, else RangeError
  equals(other: Money): boolean;
  compare(other: Money): -1 | 0 | 1;
  isZero(): boolean;
  isNegative(): boolean;
  toJSON(): number;                               // centavos; es-AR formatting stays at the edge
}
```

| Rule | Rationale |
|---|---|
| ARS only, integer centavos, no currency field | The business trades only in ARS (invariant I10); a currency field would be speculative |
| Signed | The append-only ledger uses signed amounts. Non-negativity is a rule of the concepts that use Money (price, deposit), enforced in later changes |
| `fromCentavos` returns `Result`; arithmetic overflow throws | Untrusted input is an expected failure. Overflow beyond 2^53 centavos is impossible for this business, so it is a defect |
| No division or percentage | Teacher settlement allocation (I11) arrives in change 7 with its own rounding rule |

RED test list (written first, one failing run observed and recorded): construct 150 and read it back; reject 1.5, NaN and Infinity (`not-an-integer`); reject 2^53 (`out-of-range`); normalize -0; add; subtract to negative; add overflow throws; multiply by an integer quantity; non-integer quantity throws; equals/compare; `toJSON`.

---

## 8. Database harness

### 8.1 Lifecycle (Vitest `db` project)

```
vitest run
  globalSetup (src/testing/db/global-setup.ts)
    startPostgresServer()
      TEST_DATABASE_URL set? -> use it (stop = no-op)
      else embedded-postgres: free port, temp dir, initdb (UTF8, locale C), start with
           -c fsync=off -c synchronous_commit=off -c full_page_writes=off -c timezone=UTC
    CREATE DATABASE calma_template_<rand>; runMigrations(templateUrl)    (client closed afterwards)
    project.provide("pg", { adminUrl, template })
  each *.db.test.ts file
    createTestDatabase()            -> CREATE DATABASE t_<rand> TEMPLATE calma_template_<rand>
    createTestDatabase({ empty })   -> CREATE DATABASE t_<rand> TEMPLATE template0 (no migrations)
    afterAll: drop()                -> DROP DATABASE t_<rand> WITH (FORCE)
  teardown
    DROP template; server.stop() (temp dir removed: persistent: false)
```

`inject("pg")` is typed via `declare module "vitest" { interface ProvidedContext { pg: { adminUrl: string; template: string } } }`. The Vitest 5 `provide`/`inject` API needs verification in apply.

### 8.2 Vitest configuration

| Project | Include | Exclude | Extras |
|---|---|---|---|
| `unit` | `src/**/*.test.{ts,tsx}`, `tooling/**/*.test.ts` | `**/*.db.test.ts` | Node environment |
| `db` (added in S2.2) | `src/**/*.db.test.ts` | | `globalSetup`, `hookTimeout: 60_000`, `testTimeout: 30_000` |

`vitest.config.ts` is separate from `vite.config.ts`: the React Router and Cloudflare plugins are not loaded in tests. Coverage uses `v8`, with thresholds of 90 % lines and branches on `src/modules/_shared/**` and `src/modules/*/{domain,application}/**`. There is no coverage gate on UI, infrastructure or platform.

### 8.3 DB-backed tests in this change

| Test | Proves |
|---|---|
| `platform/db/migrate.db.test.ts` | Migrations apply from scratch to an empty database; re-running is a no-op; the journal count equals the row count |
| `system-status/infrastructure/drizzle-database-probe.db.test.ts` | Runs the probe contract against real PostgreSQL: migrated -> `0000_baseline`; empty -> `null`; unreachable (`127.0.0.1:1`) -> `{ reachable: false }` |
| `composition/request-services.db.test.ts` | Wiring end to end in Node: real URL -> `status: "ok"`; bad URL -> `"degraded"` |

The same contract (`src/testing/contracts/database-probe.contract.ts`) runs against `in-memory-database-probe.ts` in the unit project, so the fake cannot drift.

---

## 9. Runtime configuration, environments, secrets and the owner runbook (OD-2)

### 9.1 Variables and bindings per environment

| Variable / binding | Schema | Local dev (no cloud credentials) | Tests / CI verify | Deployed (workers.dev -> Neon `staging`) |
|---|---|---|---|---|
| `HYPERDRIVE` (binding: `{ connectionString }`) | `workerEnvSchema` | `wrangler.jsonc` `localConnectionString: "postgres://postgres@localhost:5432/calma_dev"` (no password, so gitleaks has nothing to flag), overridable with `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` in `.env` (name: verify in apply). With no local Postgres, `/status` simply reports `degraded` | n/a | Hyperdrive config `calma-staging`; its id is the secret `HYPERDRIVE_ID`, substituted into the placeholder at deploy (9.3) |
| `BUILD_COMMIT` | `workerEnvSchema` | `wrangler.jsonc` var `local` | n/a | `wrangler deploy --var BUILD_COMMIT:${{ github.sha }}` |
| `MIGRATION_DATABASE_URL` | `migrationEnvSchema` (`postgres://` or `postgresql://`) | optional in `.env` (local DB only) | n/a | secret (owner role, direct non-pooled `staging` URL, `sslmode=require`) |
| `TEST_DATABASE_URL` | `testEnvSchema` (optional) | optional override | unset in CI (embedded-postgres) | n/a |

Local development never needs a Cloudflare login or a Neon account. `pnpm dev` runs workerd locally with the local Hyperdrive connection string. **STOP condition for apply**: if `pnpm dev`, `wrangler dev`, `wrangler types` or `react-router build` asks for a Cloudflare login or account selection, apply stops that task and reports it to the orchestrator. Apply never runs `wrangler login` and never authenticates. `pnpm test` uses embedded-postgres. `wrangler types` and `react-router build` run offline. `wrangler.jsonc` keeps the placeholder Hyperdrive id `00000000000000000000000000000000` forever; the real id never enters the repository. `.env.example` and `.dev.vars.example` list names only.

### 9.2 GitHub Actions secrets (exact names; the owner sets all of them)

| Secret | Value | Used by |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Scoped API token (9.4 step C3) | `wrangler deploy` |
| `CLOUDFLARE_ACCOUNT_ID` | Studio account id | `wrangler deploy` |
| `HYPERDRIVE_ID` | Id of Hyperdrive config `calma-staging` | Placeholder substitution before build |
| `MIGRATION_DATABASE_URL` | `staging` branch direct URL of the owner role `neondb_owner` | `pnpm db:migrate` |
| `STATUS_URL` | `https://calma-inquieta.<account-subdomain>.workers.dev/status` | Post-deploy smoke check |

The owner loads each one with `gh secret set <NAME> --repo tiagorojas7/calma-inquieta` and pastes the value at the interactive prompt, which keeps it out of shell history and out of any chat. CI reads only these five secrets. Apply never runs `gh secret set`, `wrangler login`, `neonctl` or any Cloudflare or Neon operation.

### 9.3 Deploy-time substitution

The deploy job runs this before `pnpm build`:

```
sed -i "s/00000000000000000000000000000000/${HYPERDRIVE_ID}/" wrangler.jsonc
grep -q "${HYPERDRIVE_ID}" wrangler.jsonc
```

The second line fails the job if the placeholder was not replaced. The change exists only in the CI workspace and is never committed. The Vite plugin then emits the real id into `build/server/wrangler.json`.

### 9.4 Owner runbook (`docs/runbooks/cloud-provisioning.md`)

Executed by the owner, in this order, with the studio's own accounts. Each step lists the action, the exact values and how to check the result.

| Step | Owner action | Exact values / check |
|---|---|---|
| C1 | Cloudflare dashboard: upgrade the studio account to Workers Paid | Plan shows "Workers Paid" |
| C2 | Cloudflare dashboard: claim the account's workers.dev subdomain if not set | Note `<account-subdomain>` for `STATUS_URL` |
| N1 | Neon console: create project `calma-inquieta`, region AWS São Paulo (`aws-sa-east-1`), PostgreSQL 17, database `calma` | Default branch `main` exists with owner role `neondb_owner` |
| N2 | Neon SQL editor on `main`, database `calma`: create the runtime role and grants only (SQL block below; no migrations on `main`). Generate the password in a password manager | `\du` shows `calma_app` without `neon_superuser` membership |
| N3 | Neon console: create branch `staging` from `main` (it inherits roles and grants) | Branch `staging` exists; `main` stays untouched until launch |
| N4 | Neon console, branch `staging`: copy two **direct (non-pooled)** connection strings: `neondb_owner` -> `MIGRATION_DATABASE_URL`; `calma_app` -> used only in C4 | Both include `sslmode=require` |
| C3 | Cloudflare dashboard -> My Profile -> API Tokens -> Create Custom Token `calma-inquieta-ci`. Permissions: **Account / Workers Scripts / Edit**, **Account / Hyperdrive / Read**, **Account / Account Settings / Read**. Account Resources: include only the studio account. Zone Resources: none. TTL: 12 months (calendar reminder to rotate) | First CI deploy succeeds. If the deploy fails with an authentication error, add **Account / Hyperdrive / Edit** and record the change in ADR-002 |
| C4 | Cloudflare dashboard -> Workers & Pages -> Hyperdrive -> Create: name `calma-staging`, connection string = `calma_app` direct URL from N4, **caching disabled** | Note the config id -> `HYPERDRIVE_ID` |
| G1 | Terminal: `gh secret set` for the five secrets in 9.2 | `gh secret list --repo tiagorojas7/calma-inquieta` shows the five names |
| G2 | Push or re-run CI on `main` | The deploy job migrates, deploys and the smoke check reads `data-status="ok"` |

N2 SQL. It runs on `main` before creating `staging`, so the branch inherits it. On `main` the runbook only creates roles, grants and the empty `drizzle` schema those grants target. It never runs migrations there, and `main` holds no tables or data until the launch change (change 8). Migrations run only on `staging`, by CI.

```sql
CREATE ROLE calma_app WITH LOGIN PASSWORD '<generated-by-owner>';
GRANT CONNECT ON DATABASE calma TO calma_app;
GRANT USAGE ON SCHEMA public TO calma_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO calma_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO calma_app;
CREATE SCHEMA IF NOT EXISTS drizzle AUTHORIZATION neondb_owner;   -- migrator reuses it
GRANT USAGE ON SCHEMA drizzle TO calma_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA drizzle
  GRANT SELECT ON TABLES TO calma_app;
```

Roles created through SQL are not members of `neon_superuser`, so `calma_app` gets least privilege. The migrator `neondb_owner` owns schema objects. Neon branch inheritance of roles and default privileges, and the exact name of the Hyperdrive caching toggle: verify while writing the runbook. Rotation: re-issue the token or the role password, then `gh secret set` again (or update the Hyperdrive config for `calma_app`).

---

## 10. CI workflow

```
.github/workflows/ci.yml   on: pull_request, push(main)   permissions: contents: read
concurrency: ci-${ref}, cancel-in-progress only for pull_request

verify (ubuntu-24.04)
  checkout (fetch-depth: 0) -> pnpm/action-setup (packageManager) -> setup-node (.nvmrc, cache pnpm)
  pnpm install --frozen-lockfile
  pnpm lint                      (eslint . --max-warnings 0)
  pnpm format:check              (prettier --check .)
  pnpm typecheck                 (S3.1+: wrangler types && react-router typegen && tsc --noEmit)
  pnpm test:coverage             (unit + architecture + DB on embedded PostgreSQL 17)
  pnpm build                     (added in S3.1)
  gitleaks: download pinned release, verify SHA-256, `gitleaks git --redact --exit-code 1`

deploy (needs: verify; if: github.event_name == 'push' && github.ref == 'refs/heads/main';
        concurrency: deploy-staging, cancel-in-progress: false)
  deploy-gate: env = the five secrets (9.2); none set -> notice listing the missing NAMES + ready=false;
               some set -> fail, listing the missing NAMES; all set -> ready=true (values never echoed)
  (every later step: if steps.deploy-gate.outputs.ready == 'true')
  checkout -> pnpm -> node -> install
  substitute HYPERDRIVE_ID into wrangler.jsonc and assert it (9.3)
  pnpm build
  pnpm db:migrate                env MIGRATION_DATABASE_URL
  pnpm exec wrangler deploy --var BUILD_COMMIT:${{ github.sha }}   env CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
  smoke: curl -fsS --retry 3 --retry-delay 5 "$STATUS_URL" | grep -q 'data-status="ok"'
```

```
Dev        GitHub         verify job                     deploy job              Neon staging      Cloudflare
 |--push main->|--start-->| lint, format, types, test,   |                       |                 |
 |             |          | build, gitleaks              |                       |                 |
 |             |          |--green----------------------->| gate (secrets?), id substitution, build  |
 |             |          |                               |--runMigrations------->| (DDL, forward)  |
 |             |          |                               |<--ok------------------|                 |
 |             |          |                               |--wrangler deploy------------------------>| new version
 |             |          |                               |--curl /status--------------------------->|--Hyperdrive->Neon
 |             |          |                               |<--200 data-status="ok"-------------------|
 |<--green-----|          |                               |  (on failure: job red; manual `wrangler rollback`)
```

The deploy job rebuilds instead of downloading the `verify` artifact. The same commit and lockfile give the same output, and this avoids shipping the Vite plugin's `.wrangler/deploy` redirect file as an artifact. The cost is about one extra minute.

Branch policy (OD-5 a): every slice after S0 goes through a PR and merges only with green CI, by convention (no enforced protection on GitHub Free private repos).

---

## 11. Strict TDD activation (S1, before any behavior task)

Order inside S1: toolchain -> Vitest + `pnpm test` -> **activation** -> `Money` (first RED/GREEN) -> CI workflow.

`openspec/config.yaml` changes (apply writes exactly these values; dates are the apply date):

```yaml
context: |   # replace the Stack, Architecture and Testing lines
  Stack: DECIDED in platform-foundation (ADR-001): React Router 8 framework mode on Cloudflare Workers Paid, Neon PostgreSQL 17 via Hyperdrive, Drizzle, Vitest, pnpm, Node 24, TypeScript 6.0.
  Architecture: screaming modules + hexagonal layers + composition root (ADR-003), enforced by eslint-plugin-boundaries and an architecture test.
  Testing: Vitest; ONE workspace command `pnpm test`. Strict TDD active.
strict_tdd: true
projects:
  - { name: calma-inquieta, path: ".", language: typescript, package_manager: pnpm }
testing:
  strict_tdd_requested: true
  strict_tdd_status: active
  workspace_test_command: "pnpm test"
  test_layers:
    unit: { available: true, tool: vitest }
    integration: { available: false, tool: null }   # S2.2 sets: true, "vitest + embedded-postgres (PostgreSQL 17)"
    e2e: { available: false, tool: null }           # Playwright arrives in change 5
  coverage: { available: true, command: "pnpm test:coverage" }
  quality:
    linter: { available: true, command: "pnpm lint" }
    type_checker: { available: true, command: "pnpm typecheck" }
    formatter: { available: true, command: "pnpm format:check" }
rules:
  apply:
    tdd: true
    test_command: "pnpm test"
  verify:
    test_command: "pnpm test"
    build_command: ""       # stays empty until S3.1 sets "pnpm build" when the script exists (never invented);
                            # the delivery-pipeline spec carries a matching carve-out
    coverage_threshold: 0   # scoped 90 % thresholds live in vitest.config.ts
```

Engram refresh in the same task: upsert `sdd-init/calmainquieta` and `sdd/calmainquieta/testing-capabilities` with the same values. Read both back and compare them with the file. The activation evidence is `pnpm test -- --passWithNoTests` exiting 0. S2.2 and S3.1 repeat the config and Engram update for `integration` and `build_command`.

---

## 12. File Changes

All files are new except where noted. "Slice" refers to section 13.

| File | Action | Slice | Description |
|---|---|---|---|
| `.gitignore` | Modify | S0 | Adds `node_modules/`, `build/`, `.react-router/`, `.wrangler/`, `coverage/`, `worker-configuration.d.ts`, `.env*` (keep `.env.example`), `.dev.vars*` (keep `.dev.vars.example`), `.claude/settings.local.json`, `docs/client-proposal/_originals/`; keeps `.atl/` |
| `.gitattributes`, `.editorconfig` | Create | S0 | `* text=auto eol=lf`; binary for `*.webp *.png *.jpg *.docx`; LF, 2 spaces, UTF-8 |
| `docs/client-proposal/mockups/image1..20.webp` | Create (binary) | S0 | WebP; image1-3 (logos) lossless, others quality 90; PNGs moved to `_originals/` before `git init` |
| `docs/client-proposal/README.md` | Create | S0 | PNG->WebP name map, sizes, SHA-256 of originals, note that `[IMAGE: media/imageN.png]` markers resolve via this map |
| `package.json`, `pnpm-workspace.yaml`, `.nvmrc` | Create | S1 | Scripts (section 14), exact pins, `packageManager`, `engines`, build-script allowlist |
| `tsconfig.json` | Create | S1 | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `moduleResolution: bundler`, `noEmit`, `paths ~/*`; S3.1 adds `rootDirs`, JSX and Worker types. If Node and Workers runtime types conflict, split into `tsconfig.node.json` + `tsconfig.cloudflare.json` (template layout) |
| `eslint.config.ts` | Create | S1, S2.1 | S1: `typescript-eslint` `strictTypeChecked`, ignores; S2.1: boundaries elements, matrix, `no-unknown-files`, fixture override |
| `.prettierrc.json`, `.prettierignore` | Create | S1 | LF; ignores `docs/client-proposal/`, `docs/brand/`, `openspec/`, `drizzle/meta/`, lockfile, build output |
| `vitest.config.ts` | Create | S1, S2.2 | `unit` project and coverage; S2.2 adds the `db` project |
| `src/modules/_shared/{result,money,clock,index}.ts`, `money.test.ts` | Create | S1 (clock S2.1) | Shared kernel |
| `openspec/config.yaml` | Modify | S1, S2.2, S3.1 | Section 11 |
| `.github/workflows/ci.yml` | Create | S1, S3.1, S3.2 | `verify` (S1), build step (S3.1), `deploy` job (S3.2) |
| `AGENTS.md` | Create | S2.1 | Dependency rule, Strict TDD, Conventional Commits without AI attribution, commands |
| `tooling/architecture/architecture.test.ts` | Create | S2.1 | Section 5.3 |
| `src/modules/system-status/{domain,application}/**`, `index.ts` | Create | S2.1 | Domain rule, port, use case, memoized probe decorator (D12), tests |
| `src/testing/fakes/*`, `src/testing/contracts/database-probe.contract.ts` | Create | S2.1 | Fixed clock, in-memory probe, shared contract |
| `src/platform/db/{session,migrate,migration-catalog}.ts`, `src/platform/system-clock.ts` | Create | S2.2 | Driver session, migrator, journal lookup, clock adapter |
| `src/platform/db/migrate.db.test.ts` | Create | S2.2 | Migrations from scratch, idempotent re-run, journal count = row count |
| `src/platform/env.ts`, `src/platform/env.test.ts` (core) | Create | S2.2 | `parseEnv`, `formatEnvError`, `migrationEnvSchema`, `testEnvSchema` + names-only tests; used by `scripts/migrate.ts` and the test harness |
| `drizzle.config.ts`, `drizzle/0000_baseline.sql`, `drizzle/meta/**` | Create | S2.2 | Generate-only config; baseline (meta is generated) |
| `scripts/migrate.ts` | Create | S2.2 | Validates `MIGRATION_DATABASE_URL` with the shared `migrationEnvSchema`, calls `runMigrations` |
| `src/testing/db/{postgres-server,global-setup,test-database}.ts` | Create | S2.2 | Section 8.1 |
| `src/modules/system-status/infrastructure/drizzle-database-probe.ts` (+ db test) | Create | S2.2 | Adapter + contract run |
| `src/composition/request-services.ts` (+ db test) | Create | S3.1 | Composition root, `IsolateState`, memo wiring; lands with its only production consumer, the Worker |
| `src/platform/env.ts`, `src/platform/env.test.ts` (Worker part) | Modify | S3.1 | Add `workerEnvSchema`, `readWorkerEnv` (WeakMap cache) + Hyperdrive binding-shape tests |
| `.env.example`, `.dev.vars.example` | Create | S3.1 | Names only (section 9) |
| `vite.config.ts`, `react-router.config.ts`, `wrangler.jsonc` | Create | S3.1 | Cloudflare plugin (`viteEnvironment: { name: "ssr" }`) + React Router plugin; `appDirectory: "src/app"`, `ssr: true`; `nodejs_compat`, `compatibility_date` = apply date, `observability.enabled`, `workers_dev: true`, `preview_urls: false`, `vars.BUILD_COMMIT`, `hyperdrive` binding with placeholder id + `localConnectionString` (9.1) |
| `workers/app.ts` | Create | S3.1 | Section 6.3 |
| `src/app/{root.tsx,routes.ts,context.ts,routes/status.tsx,routes/status.test.ts}`, `src/testing/react-router.ts` | Create | S3.1 | Delivery |
| `docs/adr/0001..0003-*.md`, `docs/runbooks/cloud-provisioning.md`, `README.md` | Create | S3.2 | Decisions (D11: ADR-001 versions incl. Vitest 5; ADR-003 incl. D12 memo); the owner runbook (9.4, steps C1-G2); setup, commands and environments |

---

## 13. Slice plan and authored-line forecast

Counts are authored additions + deletions. Lockfile, `drizzle/meta`, generated types and binaries are excluded. Each slice after S0 is one PR that is green on its own. Following `chained-pr` and `work-unit-commits`, tests ship in the same commit as their behavior.

| Slice | Content | Authored lines | Conventional Commits (examples, no AI attribution) |
|---|---|---|---|
| **S0** bootstrap (direct push to `main`, authorized by approved-plan decision 4) | Hygiene files, WebP mockups, checksum README; pre-existing docs and `openspec/` committed as-is | 60-80 | `chore: bootstrap repository with docs, specs and webp mockups` |
| **S1** toolchain + Strict TDD | package, TS, ESLint base, Prettier, Vitest, `pnpm test`, activation (config + Engram), `Result` + `Money` (RED->GREEN), CI `verify` | 330-390 | `build: add node 24, pnpm and strict typescript toolchain`; `test: add vitest with a single pnpm test command`; `chore(sdd): activate strict tdd`; `feat(shared-kernel): add money value object and result type`; `ci: add verify workflow` |
| **S2.1** boundaries + system-status core | Boundaries config, architecture test, `AGENTS.md`, `Clock`, domain, port, use case, memoized probe decorator (D12), fakes, contract (in-memory) | 300-370 | `feat(architecture): enforce module boundaries with lint and an architecture test`; `feat(system-status): add status rules and get-system-status use case` |
| **S2.2** database harness + adapter | Env core (`parseEnv`, `formatEnvError`, migration and test schemas + tests), session, migrator + `migrate.db.test.ts`, catalog, baseline, migrate script, embedded-postgres harness, probe + contract (real PG), config `integration: true` | 305-365 | `feat(platform): add shared env validation for node scripts`; `feat(database): add drizzle migrations and embedded postgres test harness`; `feat(system-status): add drizzle database probe` |
| **S3.1** delivery runtime | Worker env schema + tests, composition root + wiring db test, Vite/RR/Wrangler config, Worker entry, root, `/status` route + loader tests, CI build step, `build_command` | 295-365 | `feat(composition): wire request services`; `feat(status): serve /status from react router on workers` |
| **S3.2** deploy + docs | CI `deploy` job (secret gate, id substitution), owner runbook, ADR-001..003, README | 230-290 | `ci: migrate and deploy to workers.dev on main`; `docs: add adrs, readme and owner provisioning runbook` |
| **Total** | | **about 1,520-1,860** (60+330+300+305+295+230 = 1,520; 80+390+370+365+365+290 = 1,860) | |

Rebalance note: the shared env core moved from S3.1 into S2.2, so `scripts/migrate.ts` validates through `src/platform/env.ts` in the same slice (about +50 lines). To keep S2.2 within 400, the composition root and its wiring test moved from S2.2 to S3.1 (about -45 lines), next to the Worker that is their only production consumer.

Forecast versus proposal: the proposal estimated 870-1,050 and the target was 750-900. This bottom-up count is about 75 % higher. It includes about 60 lines for the D12 memo and about 30 for the more detailed owner runbook. The difference comes mostly from test code (Money, use case, contract suite run twice, probe, migrations, env, loader, architecture fitness test) and the embedded-postgres harness. ADR consolidation already saves about 100 lines. Getting closer to the target would mean cutting proposal scope (contract tests, the wiring test, env tests), not slicing differently. This design does not recommend that. With `ask-on-risk`, the tasks phase must ask once for the chain strategy. Recommendation: stacked PRs to `main` (each slice deploy-safe and independently green).

Guard lines for `sdd-tasks`: `Decision needed before apply: Yes`; `Chained PRs recommended: Yes`; `400-line budget risk: High`.

---

## 14. Package scripts

| Script | Command | Slice |
|---|---|---|
| `test` | `vitest run` | S1 |
| `test:unit` | `vitest run --project unit` | S1 |
| `test:watch` | `vitest` | S1 |
| `test:coverage` | `vitest run --coverage` | S1 |
| `lint` | `eslint . --max-warnings 0` | S1 |
| `format`, `format:check` | `prettier --write .`, `prettier --check .` | S1 |
| `typecheck` | `tsc --noEmit` (S3.1: `pnpm typegen && tsc --noEmit`) | S1 |
| `db:generate` | `drizzle-kit generate` | S2.2 |
| `db:migrate` | `tsx scripts/migrate.ts` | S2.2 |
| `typegen` | `wrangler types && react-router typegen` | S3.1 |
| `dev`, `build` | `react-router dev`, `react-router build` | S3.1 |
| `deploy` | `pnpm build && wrangler deploy` (manual fallback; CI is primary) | S3.1 |

A local persistent dev database script (`db:dev` on embedded-postgres) is deferred to change 3, the first change that needs local data. Until then, local `/status` shows `degraded` unless `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` points to any reachable PostgreSQL (WSL2 or `TEST_DATABASE_URL`-style).

---

## 15. Testing Strategy

| Layer | What | Approach | Project |
|---|---|---|---|
| Unit (domain) | `Money`, `overallStatus` | Strict TDD, table-driven | `unit` |
| Unit (application) | `GetSystemStatus`: ok; unreachable -> degraded; empty DB -> migrations fail; probe throws -> degraded; `checkedAt` from fixed clock; `buildCommit` echoed | In-memory probe + fixed clock | `unit` |
| Unit (application) | Memoized probe: first call delegates; a call within 60 s returns the cached result without calling inner; a call at or after 60 s delegates again; degraded results are memoized the same way; the cell stores plain data only | Counting fake probe + fixed/advancing clock | `unit` |
| Contract | `DatabaseProbe` scenarios (migrated, empty, unreachable) | One suite, two runners (fake: unit; Drizzle: db) | both |
| Integration | Migrations from scratch + idempotent; probe on real PG; composition wiring | Embedded PostgreSQL 17, DB per file | `db` |
| Unit (platform) | `parseEnv`: missing -> names; invalid -> names; the secret value never appears in the message; Hyperdrive binding shape | zod schemas with fake sources | `unit` |
| Delivery | `/status` loader -> 200/`ok`, 503/`degraded`; `headers` and `meta` exports | Loader called as a plain function with a `RouterContextProvider` holding fake services (`src/testing/react-router.ts`) | `unit` |
| Architecture | Section 5.3 table | ESLint API from Vitest | `unit` |
| Runtime smoke | Deployed `/status` returns `data-status="ok"` | `curl` in the CI deploy job | CI |
| E2E | none in this change | Playwright arrives in change 5 | n/a |

Not unit-tested: the `workers/app.ts` glue (needs the virtual server build). It is covered by `pnpm build`, by `parseEnv` tests, and by the deploy smoke check. This is a known gap, accepted to avoid `@cloudflare/vitest-pool-workers` in the skeleton.

---

## 16. Threat Matrix

This change adds no product code that routes, classifies or executes shell commands, or that automates git or PRs. The rows below are N/A for product code; operational safeguards are listed after the table.

| Boundary | Applicability | Reason |
|---|---|---|
| Documentation-like paths | N/A | No code classifies or executes files by path; Markdown is never executed |
| Git repository selection | N/A | No product code invokes git; the apply agent runs git manually at the repo root |
| Commit state | N/A | No commit automation in product code |
| Push state | N/A | The single first push (S0) is a manual, authorized operation, not product automation |
| PR commands | N/A | PRs are created by the apply agent with `gh`; no composed PR commands in code |

Operational safeguards (not RED tests):
- **S0 first push.** Before `git add`, run `gitleaks dir .`. After `git add`, check `git ls-files` for no `*.png` under `docs/client-proposal/`, no `.atl/` and no `.claude/settings.local.json`. Then run `gh repo create tiagorojas7/calma-inquieta --private --source . --remote origin` and `git push -u origin main`.
- **Subprocesses.** `embedded-postgres` spawns its own packaged binaries with fixed arguments (no user input).
- **CI.** Uses `pull_request`, never `pull_request_target`. Secrets are referenced only by the `deploy` job on `main`. Actions are SHA-pinned and the gitleaks binary is checksum-verified.

---

## 17. Migration / Rollout

| Step | Rollout | Rollback |
|---|---|---|
| S0 | Convert mockups, move originals, hygiene files, `git init -b main`, gitleaks, create the private repo, push | Archive or delete the repo; local history and `_originals/` remain |
| S1-S3.1 | PRs merge with green `verify`; nothing deploys (secrets absent, so the deploy gate skips) | Revert the PR |
| Strict TDD flags | Activated in S1 | Revert to `false` in config and Engram only if the runner is removed (fail closed) |
| Provisioning (owner, OD-2) | After S3.2 merges, the owner follows runbook C1-G2; deploy starts on the next `main` run | Owner deletes the Hyperdrive config, revokes the token, rotates Neon role passwords and runs `gh secret delete` (the deploy gate then skips again) |
| S3.2 first deploy | Migration (baseline) on Neon `staging`, deploy, smoke | `wrangler rollback` to the previous version (or delete the Worker); reset the Neon `staging` branch (no business data; 6 h PITR) |
| Later schema changes | Expand/contract; migration runs before deploy | Forward-fix migration; never edit an applied migration |

---

## 18. Risks and assumptions

| # | Risk / assumption | Likelihood | Mitigation |
|---|---|---|---|
| R1 | `embedded-postgres` publishes only beta tags (last publish 2026-06-05); initdb or locale problems on Windows; pnpm build-script blocking for platform packages | Med | Exact pin + lockfile; `--locale=C`; allowlist; `TEST_DATABASE_URL` -> WSL2 Postgres locally or a CI service container |
| R2 | React Router v8 API differences (context provider, middleware default, `createRequestHandler`, typegen paths) from the v7 template | Med | Verify against the v8.4 docs and Cloudflare template in apply; shapes in 6.3 are illustrative |
| R3 | Node runtime types and Workers runtime types conflict in one tsconfig | Med | Template-style split tsconfigs |
| R4 | drizzle-orm 0.45 migrator table layout (`created_at` = journal `when`) | Low | Verify in apply; fallback to a hash prefix |
| R5 | Forecast about 75 % above the proposal (section 13: 1,520-1,860) | High | Six slices of 400 lines or less; `ask-on-risk` asks before apply |
| R6 | Owner provisioning happens after S3.2 merges; the first real deploy (and `/status` on workers.dev) depends on the owner's timing; token permissions may need one adjustment | Med | The secret-presence gate keeps CI green meanwhile; runbook C3 names the fallback permission; no apply task touches cloud credentials |
| R7 | Exact names of tool settings (pnpm exact-save and build allowlist, Hyperdrive local connection env var, Hyperdrive caching toggle, gitleaks subcommands, ESLint `ruleFilter`, boundaries v7 rule names, Vitest 5 `provide`/`inject`) | Med | Each marked "verify in apply"; the design fixes behavior, not spelling |
| R10 | Local `wrangler dev` or `wrangler types` unexpectedly requires a Cloudflare login | Low-Med | STOP condition (9.1): apply reports to the orchestrator and never logs in; tests and CI do not depend on `wrangler dev` |
| R8 | `/status` on public workers.dev wakes Neon (100 CU-hour cap) | Low | D12 memo caps DB traffic at 1 query/min/isolate. Residual: steady polling under 5 min keeps compute awake. Change 8 adds the CU alert and a database-free uptime endpoint; escalate to a token-gated check if usage shows it |
| R9 | No branch protection on GitHub Free private repos | High | Convention + CI status (OD-5 a) |

## 19. Open Questions

- [x] OD-2 answered (2026-10-05): the owner provisions via the runbook (9.4) and loads secrets with `gh secret set`; no agent handles credentials.
- [ ] Owner awareness: the approved plan says "React Router 7"; this design uses v8.4 (same framework mode, current major). Recorded in ADR-001; no action unless the owner objects.
- [ ] Chain strategy for 6 slices (asked once by `ask-on-risk` before apply); recommendation: stacked PRs to `main`.
- [ ] Spec alignment: the observable names in section 6 (`status`, `checks`, `latestMigration`, `buildCommit`, `checkedAt`, 200/503) follow the spec if the spec differs.
