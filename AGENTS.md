# Agent guide: Calma Inquieta

Single TypeScript package, screaming modules with hexagonal layers. The rules below are enforced mechanically by `pnpm lint` (eslint-plugin-boundaries, configured in `eslint.config.ts`) and by `tooling/architecture/architecture.test.ts`. Do not weaken either to make a change pass.

## Dependency rule

Elements, first match wins:

| Element          | Path                                |
| ---------------- | ----------------------------------- |
| `shared`         | `src/modules/_shared/**`            |
| `module-api`     | `src/modules/<m>/index.ts`          |
| `domain`         | `src/modules/<m>/domain/**`         |
| `application`    | `src/modules/<m>/application/**`    |
| `infrastructure` | `src/modules/<m>/infrastructure/**` |
| `platform`       | `src/platform/**`                   |
| `composition`    | `src/composition/**`                |
| `delivery`       | `src/app/**`                        |
| `worker`         | `workers/**`                        |
| `testing`        | `src/testing/**`                    |

Allowed imports (everything else is denied):

- `shared`: nothing. It is the pure kernel (`Result`, `Money`, `Clock`).
- `domain`: `shared` and the `domain` of the same module. No packages.
- `application`: `shared`, `domain` and `application` of the same module, and the `module-api` of other modules. No packages.
- `module-api`: `shared`, `domain` and `application` of the same module.
- `infrastructure`: `shared`, the same module's layers, `platform`, and the packages `drizzle-orm` and `pg`.
- `platform`: `shared`, `platform`, `zod`, `pg`, `drizzle-orm` and Node built-ins.
- `composition`: `shared`, `module-api`, `infrastructure`, `platform`, `composition`. Adapters are instantiated only here.
- `delivery`: `shared`, `module-api`, `composition`, `delivery`, and `react`, `react-dom`, `react-router` (plus `@react-router/dev` for the route config).
- `worker`: `delivery`, `composition`, `platform`, `react-router` (and the virtual `react-router` server build).
- `testing`: anything. No production element may import it.

Other modules are reached only through their `index.ts`. Every new folder under `src/` must be classified in `eslint.config.ts` (`no-unknown-files`). Test files are ignored by the boundary rule.

## Strict TDD

Every behavior change goes RED (write the test, run it, see it fail), GREEN (minimum code), REFACTOR (tests stay green). Tests ship in the same commit as the behavior. The one test command is `pnpm test` (add a file path to focus, for example `pnpm test src/modules/_shared/money.test.ts`).

## Commits

Conventional Commits only. Never add `Co-Authored-By` lines or any AI attribution.

## Commands

- `pnpm test`, `pnpm test:coverage`: Vitest (coverage thresholds 90 % lines and branches on the kernel, domain and application code)
- `pnpm lint`: ESLint, including the dependency rule
- `pnpm format:check`, `pnpm format`: Prettier
- `pnpm typecheck`: generates Worker and route types, then TypeScript (`tsc -b`: `tsconfig.node.json` for tooling and tests, `tsconfig.cloudflare.json` for Worker code)
- `pnpm dev`, `pnpm build`: React Router on Workers (no Cloudflare login needed; local Hyperdrive string comes from `wrangler.jsonc` or `.env`)
