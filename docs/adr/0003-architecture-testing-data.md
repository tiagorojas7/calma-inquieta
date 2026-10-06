# ADR-0003: Architecture, testing and data conventions

Status: accepted (change `platform-foundation`)

Business modules are named by what they do, split into hexagonal layers, and kept honest by a lint rule that a test also drives. Tests run against real PostgreSQL 17 with no Docker. Migrations are forward-only SQL. This ADR replaces a separate architecture overview.

## Architecture

| Rule             | Decision                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Structure        | One package. `src/modules/<module>/{domain,application,infrastructure,index.ts}` plus a pure shared kernel         |
| Dependency rule  | `eslint-plugin-boundaries` holds the element map and allow matrix (`eslint.config.ts`; prose in `AGENTS.md`)       |
| Fitness function | `tooling/architecture/architecture.test.ts` lints virtual violating fixtures, a positive control and the real tree |
| Module boundary  | Other modules are reached only through their `index.ts`                                                            |
| Use cases        | Factory-built functions returning `Result`; a degraded system is data (`E = never`), defects throw                 |
| Wiring           | By hand in `src/composition`; no DI container                                                                      |
| Language level   | `erasableSyntaxOnly`: no enums, no parameter properties                                                            |

One rule set with two gates (`pnpm lint` and `pnpm test`): the fixtures prove the rule fails on violations, so a misconfigured plugin cannot pass silently.

## Testing

| Layer      | Approach                                                                               |
| ---------- | -------------------------------------------------------------------------------------- |
| Strict TDD | RED, GREEN, REFACTOR for every behavior; one command, `pnpm test`                      |
| Unit       | Domain and application logic with in-memory fakes and a fixed clock                    |
| Contract   | One probe contract suite run against both the fake and the Drizzle adapter             |
| Database   | `embedded-postgres` 17 in Vitest global setup; one cloned database per test file       |
| Delivery   | Loaders called as plain functions with a `RouterContextProvider` holding fake services |
| Coverage   | 90 % lines and branches on the kernel, domain and application code                     |
| Known gap  | `workers/app.ts` glue is covered by `pnpm build`, env tests and the deploy smoke check |

`TEST_DATABASE_URL` (an admin URL with `CREATEDB`) replaces the embedded server, for example with WSL2 Postgres.

## Environment validation

`src/platform/env.ts` is the single place variables are declared, with one `parseEnv` and one names-only error format. It exports three schemas because each runtime receives a different variable set: Worker bindings (including the `HYPERDRIVE` object), the migration script, and the test harness. Errors carry variable names, never values. `@t3-oss/env-core` was rejected because it targets string `process.env` and does not guarantee names-only output.

## Data

| Rule            | Decision                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| Migrations      | `drizzle-kit generate` writes SQL to `drizzle/`; never edit an applied migration                      |
| One code path   | `runMigrations(url)` serves tests, the from-scratch test and `pnpm db:migrate` in CI                  |
| Expand/contract | Migration runs before deploy, so the previous Worker must keep working on the new schema              |
| Baseline        | `0000_baseline.sql` is one `COMMENT ON SCHEMA` statement, proving the migrator owns DDL on Neon       |
| Driver          | `pg.Client` per request in the Worker via Hyperdrive, closed with `ctx.waitUntil`; direct URL in Node |

## `/status` memoization

The database check is memoized per isolate for 60 seconds (`createMemoizedDatabaseProbe`, state held in an `IsolateState` created at module scope). HTTP stays `Cache-Control: no-store`; only the database result may be up to 60 seconds old. This caps Neon traffic from `/status` at one query per minute per isolate, whatever the request rate.

Residual risk: a steady poller hitting `/status` more often than Neon's 5-minute suspend timeout keeps compute awake, and no in-Worker cache can prevent that without hiding database state for longer. Today the URL is unadvertised and `staging` carries no traffic.

Follow-up for change 8: add the Neon compute-hour alert at 70 % and point the uptime monitor at a database-free endpoint. If usage shows `/status`-driven wake-ups earlier, escalate to a token-gated database check.

## Rejected alternatives

| Option                                       | Why not                                                       |
| -------------------------------------------- | ------------------------------------------------------------- |
| pnpm workspace with a package per module     | Too much ceremony for one developer                           |
| Layer-first folders (`controllers/`)         | They hide the business                                        |
| dependency-cruiser or a hand-written checker | A second rule set that can drift from the lint rule           |
| PGlite or Testcontainers for tests           | Different engine, or a Docker requirement on every machine    |
| `drizzle-kit migrate` or `push` in CI        | A second code path from the tests, or no history              |
| Cache API for `/status`                      | Not stored on `workers.dev`, and it conflicts with `no-store` |
