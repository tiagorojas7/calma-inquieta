# Proposal: Platform Foundation (walking skeleton)

Change 1 of 8 | Project: calmainquieta | Store: hybrid | Phase: sdd-propose | Date: 2026-10-05
Inputs: `openspec/config.yaml`, Engram `calmainquieta/approved-plan` (#207, authoritative), `openspec/changes/platform-foundation/exploration.md` (#199 + #203).

> **Decision in one paragraph.** Build a deployable walking skeleton with zero business behavior: a private GitHub repo, a Node 24 + pnpm + strict TypeScript toolchain, React Router 7 (framework mode, Vite) on Cloudflare Workers Paid, Vitest 4 behind ONE `pnpm test` command, Strict TDD switched on before any behavior task, a screaming-architecture + hexagonal skeleton with one `system-status` use case crossing every layer, Drizzle + Neon Postgres with a migration harness and a Docker-free local test database, GitHub Actions CI (lint, typecheck, test, gitleaks), validated environment variables, and a `/status` route on workers.dev that reads the database through the use case. Forecast: about 870-1,050 authored lines, so the cached `ask-on-risk` strategy will ask for chained slices (3 recommended).

---

## Intent

### Problem
The project is greenfield: documents only (client proposal, 20 PNG mockups, analysis, brand notes), no git repository, no code, no test runner, and `strict_tdd` is held at `false` until a runner exists. Seven business changes are queued behind a 3-4 week deadline. Each of them needs the same base: a repository, a toolchain, a test command, enforced architecture boundaries, a database path, CI and a deploy target. If that base is built ad hoc inside the first business change, architecture drift and deploy surprises land in week 3 instead of day 2.

### Why now
- It is the first change of the approved 8-change plan and blocks all others.
- The riskiest integrations (React Router 7 on Workers, Hyperdrive to Neon, Windows local development, a Docker-free test database) are proven on day 1-2 with no business logic in the way.
- Strict TDD is required by the project configuration and can only be activated once a runner and a workspace test command exist.

### What success looks like
A fresh clone runs `pnpm i && pnpm test` green; CI is green on `main`; `https://<worker>.workers.dev/status` returns a database-backed status produced by the `system-status` use case; `openspec/config.yaml` and Engram report Strict TDD as active; the stack decisions are recorded as ADRs.

---

## Scope

### In scope
| # | Deliverable | Notes |
|---|---|---|
| 1 | Git initialization and hygiene | `git init` on `main`; `.gitignore` (must include `.atl/`, `.claude/settings.local.json`, `.env*` except `.env.example`, `.dev.vars`, `node_modules/`, build output, `.wrangler/`, `coverage/`, `docs/client-proposal/_originals/`); `.gitattributes` (`* text=auto eol=lf`, `*.webp binary`); `.editorconfig` |
| 2 | Mockup conversion BEFORE the first commit | `docs/client-proposal/mockups/image1..20.png` converted to WebP (quality >= 90, no Git LFS); PNG originals moved to the git-ignored `_originals/` folder so they never enter history; `docs/client-proposal/README.md` with the PNG-to-WebP name map and SHA-256 checksums of the originals |
| 3 | Private GitHub repo and first push | `tiagorojas7/calma-inquieta` (private) created with the authenticated `gh` CLI; bootstrap commit pushed to `main` (authorized by approved-plan decision 4) |
| 4 | Toolchain | Node 24 LTS pinned (`.nvmrc` / `engines`), pnpm pinned via `packageManager`, TypeScript `strict`, ESLint (flat config) with module-boundary rules, Prettier (LF) |
| 5 | Delivery framework | React Router 7 framework mode on Vite with the Cloudflare Vite plugin, Wrangler config, Worker entry; local dev works on Windows (WSL2 as fallback) |
| 6 | Test runner and Strict TDD activation | Vitest 4 + coverage; ONE workspace command `pnpm test`; first RED-then-GREEN proof on `Money`; then flip `strict_tdd: true`, `rules.apply.tdd: true`, set `testing.workspace_test_command`, `rules.apply.test_command`, `rules.verify.test_command`, `rules.verify.build_command`, `testing.test_layers`, `testing.quality`, `projects`; refresh Engram `sdd-init/calmainquieta` and `sdd/calmainquieta/testing-capabilities`. All of this happens BEFORE any behavior task |
| 7 | Hexagonal skeleton | `src/modules/_shared` (shared kernel: `Money`, `Result`, `Clock`), `src/modules/system-status/{domain,application,infrastructure,index.ts}`, `src/composition` (composition root), `src/platform` (env, db client); one `GetSystemStatus` use case crossing domain, application, infrastructure and delivery |
| 8 | Architecture enforcement | ESLint boundary rules in `pnpm lint` AND a Vitest architecture test (fitness function) that fails on a forbidden import, proven with a violating fixture; `AGENTS.md` states the dependency rule for AI agents |
| 9 | Database harness | Drizzle ORM + Drizzle Kit; forward-only SQL migrations in `drizzle/`; baseline migration; migration script (Node, direct connection); Docker-free local test database (see Approach 4.4); a test-DB lifecycle helper usable by later integration and concurrency tests |
| 10 | Neon + Hyperdrive wiring | Neon Free project in `aws-sa-east-1`; Hyperdrive binding in the Worker; local dev uses a local connection string |
| 11 | Environment validation | One schema (zod) for Worker bindings and Node scripts; fails fast with variable NAMES only, never values; `.env.example` and `.dev.vars.example` without values |
| 12 | CI | GitHub Actions `verify` workflow: install, lint, typecheck, test (including the DB-backed tests), build, gitleaks; deploy job per open decision OD-3 |
| 13 | Deployed `/status` | React Router route on workers.dev whose loader calls `GetSystemStatus`, which reads Postgres through a port; response is `noindex` and discloses no secrets or host details |
| 14 | Documentation | ADR-001 to ADR-005 (see Approach 4.7), README (setup, commands, environments), short architecture overview |

### Out of scope
| Item | Where it goes |
|---|---|
| Every business module, table, and use case (workshops, periods, enrollments, materials, students, renewals, attendance, events, metrics) | Changes 2-8 |
| Admin authentication and authorization | Change 3 (admin-catalog) |
| Email sending (Resend adapter, outbox) | Change 6 (renewals-and-email) |
| Media and R2 usage, Cloudflare Images | Change 3 |
| Design tokens, Tailwind theme, fonts, UI components, Storybook | Change 2 (design-system-and-public-site) |
| SEO (sitemap, robots, JSON-LD, meta) | Changes 2 and 4 |
| Custom domain, DNS, email DNS records (domain not purchased yet) | Change 8 (metrics-reminders-launch) |
| Nightly `pg_dump` to R2 and restore drill, uptime monitoring, analytics | Change 8 |
| Dependabot or Renovate, git pre-commit hooks, commitlint, PR template | Deferred (optional, launch-readiness); Conventional Commits are enforced by convention and documented in `AGENTS.md` |
| End-to-end test runner (Playwright) | First change with a critical flow (change 5) |
| The hosting spike, Setup 0 analysis, Next.js comparison | Superseded by the approved plan (Workers Paid, React Router 7 decided) |

---

## Context: approved roadmap (this proposal covers change 1 only)

| # | Change | Week | Summary |
|---|---|---|---|
| **1** | **platform-foundation** | **W1** | **Walking skeleton (this proposal)** |
| 2 | design-system-and-public-site | W1 | Tokens from mockups + DMR, atomic components, layout, Inicio, Nosotros (gallery, FAQ), Contacto, SEO base, mobile-first |
| 3 | admin-catalog | W2 | Admin identity and shell, monthly and weekend workshops CRUD, periods, teachers, materials catalog with variants and R2 images |
| 4 | public-catalog | W2 | Talleres and Workshops pages from the database, capacity, dynamic Inicio sections, Event JSON-LD |
| 5 | monthly-enrollment | W3 | Public enrollment, materials cart, pending order, wa.me hand-off, admin enrollments, atomic seat claim on payment confirmation, order states, supplier consolidation |
| 6 | renewals-and-email | W3 | Email core (Resend adapter, outbox), tokenized monthly renewal links, renewal and transactional emails |
| 7 | students-attendance-workshops-events | W4 | Student record, fees per period, attendance, make-ups, weekend workshop deposits, private events |
| 8 | metrics-reminders-launch | W4 | Metrics, email reminders, launch readiness (content, domain and DNS, analytics, legal pages, training guide) |

Where the exploration disagrees (option A / Next.js, 16 changes, Setup 0, the 1-1.5 day spike), the approved plan wins. The exploration's module map (1.3), invariants (1.4), ubiquitous language (1.5), dependency rule (4.3) and testing layers (6) remain valid and are inherited.

---

## Baseline alignment and scope adjustments

Baseline: `docs/client-proposal/proposal.md` (V1.0, 2026-09-30). This change adds no client-facing feature; the items below are deviations or clarifications against the baseline.

| ID | Adjustment | Baseline reference | Effect on this change |
|---|---|---|---|
| SA-1 (known) | WhatsApp Business API OUT; automated notifications by email; wa.me links IN | Proposal lines 118, 218-256, 305 | None (no messaging in this change) |
| SA-2 | Schedule compressed to 3-4 weeks and 8 SDD changes (owner decision 2026-10-05) | "Etapas y plazo estimado" (4-6 weeks, 5 stages) | This change must fit in about 2 working days of week 1 |
| SA-3 | Hosting is Cloudflare Workers Paid (about USD 5/month) + Neon Free + R2 + Resend Free on studio-owned accounts in year 1; transfer or rebill at renewal | "Hosting y dominio: incluidos durante el primer año" (line 327) | Consistent with the baseline; record ownership in ADR-002 |
| SA-4 | Domain publication deferred to change 8; deploys use workers.dev until then | "Publicación y configuración inicial del dominio, hosting..." (line 284) | `/status` is deployed on workers.dev only |
| SA-5 | Internal engineering deliverables (CI, ADRs, architecture tests, Strict TDD) are not client-visible scope | Not mentioned | No price or scope impact for the client |

### Config-mandated open decisions (rules.proposal)
| Decision | Status for this change |
|---|---|
| Tech stack | RESOLVED by the approved plan (React Router 7 on Workers, Neon, Drizzle, Vitest 4) |
| UI copy language | NOT AFFECTED (`/status` is technical output in English); stays open for change 2, likely es-AR voseo |
| Email provider | RESOLVED (Resend Free); not used in this change |
| Hosting and domain | RESOLVED (Workers Paid, workers.dev); domain deferred to change 8 |
| Version control | RESOLVED (private repo `tiagorojas7/calma-inquieta`); branch protection residual in OD-5 |
| Mockup asset handling | RESOLVED (WebP, no LFS); originals location residual in OD-6 |

---

## Capabilities

No specs exist under `openspec/specs/` (greenfield). All capabilities are new.

### New Capabilities
- `system-status`: the `/status` route and `GetSystemStatus` use case report application health (overall state, database reachability, latest applied migration, build commit, server time) by reading Postgres through a port; degraded results when the database is unreachable; no secret or host disclosure; `noindex`.
- `shared-kernel`: shared domain primitives introduced now, `Money` (integer ARS centavos, no floating point, safe-integer bounds, arithmetic and comparison), `Result`, and the `Clock` port; the first Strict TDD proof.
- `architecture-boundaries`: the dependency rule (domain pure; application depends on domain and ports; infrastructure implements ports; cross-module access only through `index.ts`; delivery thin; adapters instantiated only in composition) enforced by lint and an architecture test that fails on a violation.
- `database-harness`: forward-only migrations applied from scratch, a Docker-free local and CI test database with an isolated lifecycle, and the runtime connection path through Hyperdrive.
- `runtime-configuration`: validation of environment variables and Worker bindings for each environment (local, test, CI, deployed), failing fast with names only.
- `delivery-pipeline`: repository hygiene, the single `pnpm test` command, the CI gate (lint, typecheck, test, build, gitleaks), the deploy path to workers.dev, and the Strict TDD activation state in `openspec/config.yaml` and Engram.

### Modified Capabilities
None.

---

## Approach

### 4.1 Order of work (Strict TDD gate first)
1. **Bootstrap without behavior.** Convert mockups to WebP and move originals out of the tree; write `.gitignore`/`.gitattributes`/`.editorconfig`; `git init`; scan with gitleaks; create the private repo; push the bootstrap commit.
2. **Toolchain and runner.** Node 24, pnpm, strict TypeScript, ESLint, Prettier, Vitest 4, `pnpm test`.
3. **TDD proof.** Write a failing `Money` test (RED), implement (GREEN), refactor.
4. **Activate Strict TDD.** Update `openspec/config.yaml` and the two Engram observations. From here on, every behavior task is RED-GREEN-REFACTOR.
5. **Skeleton and harness.** `system-status` across layers, composition root, architecture test, Drizzle, migrations, local test database.
6. **Delivery.** React Router 7 on Workers, Hyperdrive, env validation, CI, deploy, `/status`, ADRs.

### 4.2 Folder layout (adapted from exploration 4.2 to React Router 7)
```
src/
  app/                      DELIVERY: React Router routes only (parse, call use case, render)
    root.tsx  routes.ts  routes/status.tsx
  modules/
    _shared/                shared kernel: Money, Result, Clock (domain only)
    system-status/
      domain/  application/  infrastructure/  index.ts (public API)
  composition/              composition root: production and test wiring
  platform/                 env.ts (validated), db client factory
  testing/                  test-DB lifecycle, builders, fakes
workers/app.ts              Worker entry (fetch handler)
drizzle/                    SQL migrations
docs/adr/  AGENTS.md  wrangler.jsonc  react-router.config.ts (appDirectory: src/app)
```
The delivery layer imports module public APIs, the composition root and (later) the design system; it never imports Drizzle or SDKs. This keeps the framework choice reversible: only `src/app` and `workers/` depend on React Router.

### 4.3 The `system-status` slice
- Domain: a `SystemStatus` value (overall `ok | degraded`, checks) with pure rules (any failed check -> degraded).
- Application: `GetSystemStatus` use case depending on a `DatabaseProbe` port and the `Clock` port; returns `Result`.
- Infrastructure: `DrizzleDatabaseProbe` reads the latest applied migration and a trivial query; maps failures to a degraded check, never throws to the route.
- Delivery: `/status` loader resolves the use case from the composition root, calls it, returns JSON-serializable data; the loader is a plain function and is unit-tested with an in-memory probe.
- Contract test: the same probe suite runs against an in-memory fake and the real Postgres adapter so fakes cannot drift.

### 4.4 Local test database without Docker (justification)
Docker Desktop is installed but not running; WSL2 Ubuntu exists. The test engine must be real PostgreSQL (same major as Neon) because later changes test row locking, conditional updates and concurrency (exploration 6.1 rejects PGlite for that reason).

| Option | Fresh clone `pnpm i && pnpm test` | Engine fidelity | Cost | Verdict |
|---|---|---|---|---|
| A. `embedded-postgres` npm package: real PostgreSQL binaries per OS, started and stopped by Vitest global setup on a random port | Yes, no manual setup | Real Postgres | None | **Recommended default** |
| B. Native PostgreSQL in WSL2 Ubuntu | No (manual install and service start) | Real Postgres | None | Fallback via `TEST_DATABASE_URL` |
| C. Neon dev branch over the network | No (needs secrets and network) | Real Neon | Consumes Free CU-hours; slow | Rejected for tests |
| D. PGlite (WASM, in-process) | Yes | Single connection, no real locking | None | Rejected (fidelity) |
| E. Docker / Testcontainers | Requires Docker running | Real Postgres | None | Rejected locally; acceptable in CI only |

Default: option A locally AND in CI (one path), with a `TEST_DATABASE_URL` override that points at any external Postgres (WSL2 native or a CI service container). Assumption to verify in design: the package ships Windows x64 and Linux x64 binaries for the PostgreSQL major used by the Neon project (17 assumed). If it does not, fall back to option B locally and a CI service container.

### 4.5 Database connectivity
Default (design confirms): Drizzle with the `node-postgres` driver in both places: through the Hyperdrive binding in the Worker and directly against the local test database in Node. One adapter, one driver, real interactive transactions later. Migrations run from Node with a direct (non-pooled) Neon connection string; Workers never run migrations. Drizzle stable line pinned (0.45.x [S]); 1.0 beta avoided.

### 4.6 Environment validation
Workers receive configuration as per-request `env` bindings, not `process.env` at boot. One zod schema validates both shapes: in the Worker on first request (cached), in Node scripts (migrations, tests) at start. Failures report missing or invalid variable names, return a generic 500 from the Worker, and never log values.

### 4.7 ADRs
| ADR | Decision |
|---|---|
| ADR-001 | Stack: React Router 7 framework mode on Cloudflare Workers; Next.js 16 rejected (needs the OpenNext adapter) |
| ADR-002 | Hosting and accounts: Workers Paid + Neon Free (`aws-sa-east-1`) + R2 + Resend Free; studio-owned accounts in year 1; workers.dev until launch; known Neon Free limits (100 CU-hours, 6 h restore) and their mitigations |
| ADR-003 | Architecture: screaming modules, hexagonal layers, dependency rule, enforcement (lint + architecture test), composition root |
| ADR-004 | Testing: Strict TDD scope, Vitest 4, single `pnpm test`, Docker-free embedded Postgres, contract tests |
| ADR-005 | Data conventions: Drizzle, forward-only migrations, UTC instants, integer centavos, identifier strategy |

### 4.8 Commit and delivery conventions
- Conventional Commits only. Commits MUST NEVER include `Co-Authored-By` lines or any AI attribution.
- Work-unit commits: each test lands with its implementation in the same commit.
- The bootstrap commit is pushed directly to `main` (the repository does not exist before it); every later slice goes through a pull request.

---

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `.gitignore`, `.gitattributes`, `.editorconfig`, `.nvmrc` | New | Repository hygiene |
| `docs/client-proposal/mockups/*.png` -> `*.webp` | Modified | Converted; originals moved to git-ignored `docs/client-proposal/_originals/` |
| `docs/client-proposal/README.md` | New | Name map and SHA-256 checksums of the originals |
| `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`, `vitest.config.ts` | New | Toolchain (lockfile is generated, excluded from line counts) |
| `react-router.config.ts`, `vite.config.ts`, `wrangler.jsonc`, `workers/app.ts` | New | Delivery framework and Worker |
| `src/app/**` | New | Root and `/status` route |
| `src/modules/_shared/**`, `src/modules/system-status/**` | New | Shared kernel and the walking-skeleton module |
| `src/composition/**`, `src/platform/**`, `src/testing/**` | New | Composition root, env and DB client, test-DB lifecycle |
| `drizzle.config.ts`, `drizzle/**` | New | Migrations (snapshots are generated) |
| `.github/workflows/verify.yml` (+ deploy job) | New | CI |
| `.env.example`, `.dev.vars.example` | New | Variable names only |
| `docs/adr/ADR-001..005.md`, `README.md`, `AGENTS.md`, `docs/architecture/overview.md` | New | Documentation |
| `openspec/config.yaml` | Modified | Strict TDD activation, test and build commands, projects, layers, quality |
| Engram `sdd-init/calmainquieta`, `sdd/calmainquieta/testing-capabilities` | Modified | Refreshed after activation |
| GitHub `tiagorojas7/calma-inquieta`; Cloudflare Worker + Hyperdrive config; Neon project | New (remote) | Created during apply under the authorization rules below |

`docs/client-proposal/proposal.md` (baseline) is NOT edited: its `[IMAGE: media/imageN.png]` markers refer to the source DOCX, and the README name map resolves them to the WebP files.

---

## Open decisions (owner, multiple choice)

These affect this change. Each has a recommended default; none is chosen here.

| ID | Decision | Options | Recommended default | Blocks |
|---|---|---|---|---|
| OD-1 | Local test database without Docker | (a) `embedded-postgres` npm package, local and CI; (b) native PostgreSQL in WSL2 Ubuntu; (c) Neon dev branch over the network; (d) start Docker Desktop and use Testcontainers | (a), with `TEST_DATABASE_URL` override to (b) | Database harness tasks |
| OD-2 | Cloud provisioning and credentials | (a) Owner creates or upgrades the Cloudflare account to Workers Paid and creates the Neon project, then provides a scoped Cloudflare API token and Neon connection strings, stored as GitHub secrets and local `.dev.vars`; (b) the agent runs `wrangler login` and `neonctl auth` interactively with the owner present; (c) the owner performs every cloud step manually following a runbook | (a) | Deploy and `/status` tasks |
| OD-3 | Deploy trigger | (a) CI deploys to workers.dev on every push to `main` after `verify` passes, applying migrations first; (b) manual `pnpm run deploy` from the dev machine; (c) CI deploy on manual dispatch only | (a) | CI deploy job |
| OD-4 | Neon project layout | (a) one project `calma-inquieta` in `aws-sa-east-1`, PostgreSQL 17, branches `main` (production, untouched until launch) and `staging` (used by workers.dev now); (b) one branch for everything until launch; (c) two separate projects | (a) | Database and Hyperdrive config |
| OD-5 | Branch protection on a private personal repo (GitHub Free does not offer protected branches on private repos [A, verify in design]) | (a) no paid plan; PR flow and green CI by convention; (b) upgrade the account to GitHub Pro to enforce protection and required checks | (a) | Repo settings task |
| OD-6 | Mockup PNG originals | (a) git-ignored `docs/client-proposal/_originals/` plus checksums, plus a copy in the studio's cloud drive; (b) git-ignored local folder only; (c) delete after conversion | (a); convert all 20 images including the 3 logos | Bootstrap commit |

### Technical defaults delegated to design (not owner questions)
- Driver: Drizzle + `node-postgres` through Hyperdrive (4.5).
- `pnpm test` runs unit, architecture and DB-backed tests in one command; `test:unit` exists for fast loops.
- `/status` exposes only `ok | degraded`, check names, latest migration id, build commit and server time; responses are `no-store` and `noindex`.
- Tailwind is not installed in this change (change 2 owns styling); `/status` renders plain semantic HTML.
- gitleaks runs as the CLI binary in CI (avoids any license requirement of the GitHub Action) and once locally before the first push.
- Versions (React Router 7, Vitest 4, Wrangler, Drizzle, `embedded-postgres`) are pinned in design after checking current documentation.

### Remote-operation authorization boundary
- Authorized by the owner (approved plan, decision 4): creating the private repo `tiagorojas7/calma-inquieta` and pushing to it with the already-authenticated `gh` CLI.
- NOT yet authorized: any Cloudflare or Neon operation (account changes, API tokens, `wrangler deploy`, Hyperdrive creation, Neon project creation, migrations against Neon) and storing GitHub secrets. OD-2 resolves this; apply must stay local for those steps until it is answered.

---

## Delivery forecast

Cached strategy: `ask-on-risk`, review budget 400 changed lines. Counts are authored lines (additions + deletions); lockfiles, generated Drizzle snapshots and WebP binaries are excluded.

| Slice | Content | Authored lines (est.) |
|---|---|---|
| S0 bootstrap (direct push) | `.gitignore`, `.gitattributes`, `.editorconfig`, mockups README; pre-existing docs and openspec artifacts are committed as-is and are not authored by this change | 40-60 |
| S1 toolchain + TDD | package and TS/ESLint/Prettier/Vitest config, `Money`/`Result` with tests, config.yaml activation, CI `verify` workflow | 250-300 |
| S2 skeleton + DB | `system-status` across layers, `Clock`, composition root, architecture test + fixture, Drizzle config, baseline migration, test-DB lifecycle, probe contract tests | 300-350 |
| S3 delivery + docs | React Router 7 + Worker entry + Wrangler + Hyperdrive, env validation with tests, `/status` route with loader tests, deploy job, ADR-001..005, README, AGENTS.md | 280-340 |
| **Total** | | **about 870-1,050** |

The total exceeds 400 lines, so `ask-on-risk` will ask once for a chain strategy before apply. Recommendation for the tasks phase: 3 chained PR slices (S1, S2, S3) after the S0 bootstrap push, each independently green in CI. The forecast is above the requested 750-900 target mainly because of the five ADRs; merging ADR-004 and ADR-005 into ADR-003 would save about 50-70 lines.

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `embedded-postgres` lacks binaries for the needed PostgreSQL major on Windows or Linux, or is unmaintained [A, unverified] | Med | Verify in design; `TEST_DATABASE_URL` override to WSL2 native Postgres locally and a service container in CI |
| React Router 7 + Cloudflare Vite plugin + workerd misbehave on Windows (exploration gap 12.8) | Med | WSL2 fallback; CI builds on Linux are the source of truth |
| Cloud credentials not provided in time (OD-2) | Med | Slices S0-S2 need no cloud access; only S3 deploy waits |
| Branch protection unavailable on the private personal repo (OD-5) | High (if Free) | Convention + CI status; or GitHub Pro |
| Hyperdrive + `node-postgres` + Drizzle integration details differ from local behavior | Low-Med | Same driver both sides; `/status` exercises the real path on day 1 |
| Neon Free compute suspension at 100 CU-hours and 6 h restore window | Low (now) | Tests never hit Neon; `/status` responses cached briefly; nightly dump in change 8 |
| Secrets committed during bootstrap (docs or local files) | Low | gitleaks locally before the first push and in CI; `.gitignore` before `git add`; rotate and rewrite history immediately if found (single developer, no other clones) |
| PNG originals accidentally committed (history bloat) | Low | Conversion and move happen before `git init`; `.gitignore` entry; verify the bootstrap tree before pushing |
| `/status` publicly reachable on workers.dev leaks internals or wakes the DB under bot traffic | Low | Minimal payload, `no-store`/`noindex`, short edge cache or rate limit |
| CRLF line endings from Windows | Low | `.gitattributes`, `.editorconfig`, Prettier `endOfLine: lf` |
| Config and Engram drift on TDD activation | Low | Single task updates both and reads both back |
| Week 1 also holds change 2; this change overruns | Med | Strict out-of-scope list; ADR consolidation option; slices are independently mergeable |
| Library versions from the exploration are secondary-source [S] | Low | Pin after checking current docs in design |

---

## Rollback Plan

| Layer | Rollback |
|---|---|
| Code | Every slice is a separate PR; revert the PR (or reset `main` before others clone, single developer). The bootstrap commit has no runtime effect |
| Deployed Worker | `wrangler rollback` to the previous version, or delete the Worker; nothing depends on it yet |
| Database | Migrations are forward-only; the baseline holds no business data, so rollback = reset the Neon `staging` branch or drop its schema; Neon Free point-in-time restore covers 6 h |
| Hyperdrive and secrets | Delete the Hyperdrive config; revoke the Cloudflare API token and rotate the Neon role password; remove GitHub secrets |
| Repository | The private repo can be archived or deleted and recreated; local history remains |
| Strict TDD flags | Revert `openspec/config.yaml` to `strict_tdd: false` / `tdd: false` and refresh both Engram observations, only if the runner is removed (fail closed) |
| Mockups | WebP files are regenerable from the preserved originals; checksums prove integrity |
| Workers Paid plan | Not rolled back: account-level, shared with other studio projects |

---

## Dependencies

- Owner or studio: Cloudflare account on Workers Paid, Neon account, scoped credentials (OD-2).
- `gh` CLI authenticated with `repo` and `workflow` scopes (stated in the approved plan; verify at apply time).
- Local: Node 24 and pnpm available (install if missing); a WebP encoder (one-off `sharp` script or `cwebp`); gitleaks CLI for the pre-push scan.
- Answers to OD-1 to OD-6, or explicit acceptance of the recommended defaults.

---

## Success Criteria

- [ ] A fresh clone of `tiagorojas7/calma-inquieta` runs `pnpm i && pnpm test` green on Windows (or WSL2) and Linux without Docker.
- [ ] CI `verify` (lint, typecheck, test, build, gitleaks) is green on `main`.
- [ ] `https://<worker>.workers.dev/status` returns `ok` with the latest applied migration id, produced by `GetSystemStatus` reading Neon through Hyperdrive; with the database unreachable it returns `degraded` without leaking details.
- [ ] The architecture test fails on a deliberately forbidden import and passes on the real tree; `pnpm lint` enforces the same rule.
- [ ] Migrations apply from scratch to an empty database in tests and to Neon `staging`.
- [ ] Missing or invalid environment variables fail fast, naming the variable and never printing its value.
- [ ] `openspec/config.yaml` shows `strict_tdd: true`, `rules.apply.tdd: true` and non-empty test and build commands, and both Engram observations match; this happened before the first behavior task.
- [ ] The repository contains WebP mockups only (no PNG originals in history), a checksum README, and no `.atl/` or `.claude/settings.local.json`.
- [ ] ADR-001 to ADR-005 (or the consolidated set), README and AGENTS.md are merged.
- [ ] Every commit follows Conventional Commits and none contains `Co-Authored-By` or AI attribution.

## Next step
Run `sdd-spec` and `sdd-design` (parallel). Design records the stack ADRs, verifies the `embedded-postgres` assumption and pins versions; specs cover the six capabilities above.
