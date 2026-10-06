# ADR-0001: Stack and version manifest

Status: accepted (change `platform-foundation`)

React Router 8.4 in framework mode, deployed to Cloudflare Workers, on Node 24, pnpm 12 and strict TypeScript 6.0. Every direct dependency is pinned to an exact version.

## Decision

| Concern       | Choice                                                                                |
| ------------- | ------------------------------------------------------------------------------------- |
| Web framework | React Router 8.4.0 (framework mode, SSR) with React 19.3.0                            |
| Runtime       | Cloudflare Workers (`nodejs_compat`), built with Vite 8 and `@cloudflare/vite-plugin` |
| Language      | TypeScript 6.0.x, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`  |
| Tooling       | Node 24 LTS, pnpm 12.9.1 (`packageManager`), ESLint 10 flat config, Prettier 3        |
| Tests         | Vitest 5.0.3 with v8 coverage                                                         |
| Data access   | Drizzle ORM 0.45 and `pg` 8, the same driver in tests and in the Worker               |
| Validation    | zod 4                                                                                 |

The authoritative list of exact versions is `package.json`; the lockfile records the resolved tree.

## Why

- The approved plan chose React Router framework mode on Workers. Version 8 is the current major of that same framework, and loaders and actions stay plain functions that tests call directly.
- Only `src/app/` and `workers/` import React Router, so the framework stays replaceable (see ADR-0003).
- A greenfield project starts on the current major instead of inheriting an upgrade.

## Version bumps from the approved plan

| Plan said      | Now   | Reason                                                                       |
| -------------- | ----- | ---------------------------------------------------------------------------- |
| React Router 7 | 8.4.0 | The plan's decision is framework mode, which v8 continues. No benefit in v7. |
| Vitest 4       | 5.0.3 | One major behind at installation time; no peer conflict with Vite 8.         |

## TypeScript 6.0, not 7

`typescript-eslint` 8.71.1 accepts TypeScript `>=4.8.4 <6.1.0`, so TypeScript 7 would break type-aware linting. Revisit when `typescript-eslint` widens its range.

## Rejected alternatives

| Option                               | Why not                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------- |
| Next.js 16 with the OpenNext adapter | Adapter churn, heavier SSR CPU on Workers, Windows tooling gaps            |
| React Router 7                       | An older major for a new project                                           |
| TypeScript 7                         | Blocked by the `typescript-eslint` peer range                              |
| `@t3-oss/env-core`                   | Built for string `process.env`; Worker bindings are objects (see ADR-0003) |

## Consequences

- A major bump of any pinned tool is a deliberate change, not a side effect of install. Peer conflicts stop the work and are reported.
- pnpm 12 blocks dependency build scripts by default; the allowlist lives in `pnpm-workspace.yaml`.
