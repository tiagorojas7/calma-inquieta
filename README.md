# Calma Inquieta

Website and booking platform for Calma Inquieta, built with React Router 8 on Cloudflare Workers and PostgreSQL (Neon). This repository is currently the platform foundation: tooling, tests, CI and one deployable `/status` page.

## Quick path

```sh
nvm use            # Node 24, from .nvmrc
corepack enable    # pnpm 12.9.1, from package.json
pnpm install
pnpm test          # no Docker, no cloud account
pnpm dev           # open the URL it prints, plus /status
```

`pnpm dev` needs no Cloudflare login. Without a local PostgreSQL, `/status` answers `503` with `degraded`; that is the expected result.

## Prerequisites

| Tool    | Version                   |
| ------- | ------------------------- |
| Node.js | 24 (`.nvmrc`, `engines`)  |
| pnpm    | 12.9.1 (`packageManager`) |
| Git     | any recent version        |

## Commands

| Command                            | What it does                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm test`                        | Every test: unit, architecture and database (add a file path to run one file)             |
| `pnpm test:unit`                   | Unit project only (no database)                                                           |
| `pnpm test:watch`                  | Vitest in watch mode                                                                      |
| `pnpm test:coverage`               | `pnpm test` with coverage; 90 % lines and branches on kernel, domain and application code |
| `pnpm lint`                        | Generates Worker and route types, then ESLint (includes the module dependency rule)       |
| `pnpm format`, `pnpm format:check` | Prettier write, Prettier check                                                            |
| `pnpm typecheck`                   | Generates types, then `tsc -b`                                                            |
| `pnpm dev`                         | React Router dev server on local workerd                                                  |
| `pnpm build`                       | Production build (works offline)                                                          |
| `pnpm db:generate`                 | Generates a Drizzle SQL migration into `drizzle/`                                         |
| `pnpm db:migrate`                  | Applies migrations to `MIGRATION_DATABASE_URL`                                            |
| `pnpm deploy`                      | Manual fallback: build and `wrangler deploy` (CI is the normal path)                      |

## Tests and the database

`pnpm test` starts an embedded PostgreSQL 17 on a free port, migrates a template database once, and gives each database test file its own clone. Nothing to install.

To use your own server instead (for example PostgreSQL in WSL2), set `TEST_DATABASE_URL` to an admin URL with `CREATEDB`. See ADR-0003.

## Environment sources

| Variable or binding      | Local development                                                                                                 | Tests and CI `verify`       | Deployed (workers.dev, Neon `staging`)                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------- |
| `HYPERDRIVE` binding     | `wrangler.jsonc` `localConnectionString`, or `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` in `.env` | not used                    | Hyperdrive config `calma-staging`; CI substitutes its id at deploy time      |
| `BUILD_COMMIT`           | `wrangler.jsonc` var (`local`)                                                                                    | not used                    | Set by `wrangler deploy` to the commit SHA                                   |
| `SITE_URL`               | `wrangler.jsonc` var (`http://localhost:5173`)                                                                    | not used                    | Set by `wrangler deploy` to the workers.dev origin derived from `STATUS_URL` |
| `SITE_INDEXING`          | `wrangler.jsonc` var (`off`)                                                                                      | not used                    | `wrangler.jsonc` var (`off`) until launch                                    |
| `MIGRATION_DATABASE_URL` | Optional in `.env`, for a local database only                                                                     | not used                    | GitHub secret                                                                |
| `TEST_DATABASE_URL`      | Optional override                                                                                                 | Unset (embedded PostgreSQL) | not used                                                                     |

Copy `.env.example` to `.env` (scripts, tests and local overrides) or `.dev.vars.example` to `.dev.vars` (Worker variables for `pnpm dev`); both list names only and the real files are git-ignored. The `.dev.vars.example` entries are commented out because `wrangler.jsonc` already provides local defaults for `BUILD_COMMIT`, `SITE_URL` and `SITE_INDEXING`; an empty assignment would override them and fail validation, so uncomment one only to give it a real value. The real Hyperdrive id never enters the repository.

## Site content

Page copy and business facts live in typed files under `src/modules/site-content/infrastructure/content/`, behind the `site-content` module API (`src/modules/site-content/index.ts`). Routes and components read them only through `createSiteContent` (the `siteContent` entry of the request services), never by importing those files.

- **Change a fact or a text.** Edit the matching file (`business-profile.ts`, `home.ts`, `about.ts`, `contact.ts`, `coming-soon.ts`) and keep the tests green: `pnpm test src/modules/site-content` validates the content, scans every string for the word "workshop" and for tuteo, and checks that every image is registered. Copy is Spanish (Argentina) with voseo and the "nosotras" voice.
- **Optional facts.** Email, phone, opening hours and coordinates are written as `{ value, confirmed }`. The site shows them only when `confirmed` is `true`; until then the property is absent and no placeholder renders.
- **WhatsApp.** The number is defined once, in `business-profile.ts`, flagged `provisional: true`. Every link on the site is built from it with `buildWhatsAppUrl`, so changing it there changes every link. The digits are never printed while the flag is on.
- **Approval markers.** Drafted prose (history, value proposition, teaser, values, FAQ, trust claims) carries `approved: false` until the client signs it off. Unapproved trust claims do not render. `siteContent.listUnapprovedContent()` returns every item still waiting, as `{ id, area }`, for the launch checklist.
- **Testimonials** are listed only with recorded written consent (`consent: { written: true, recordedOn }`).

### Stand-in registry

`src/modules/site-content/infrastructure/content/stand-in-assets.ts` lists every placeholder asset (studio photos taken from the studio's Instagram, pending image permission; the about-teaser SVG; the favicon and share image derived from the Instagram profile picture; and the four font files) with its source, licence and what replaces it. `pnpm test` fails when a file in `public/media/stand-ins/` has no row or a row has no file. To retire a stand-in, replace the file, delete its row and update the content that references it.

See [docs/design/brand-swap-guide.md](docs/design/brand-swap-guide.md) for how to swap the palette, fonts, images, favicon and share image.

**Launch gate.** `siteContent.listStandInAssets().length` is the number of stand-ins remaining. It must reach `0` before the indexing gate is opened (change 8). Photos and videos of the client's work arrive as the replacements; none of the mockups under `docs/client-proposal/` may be copied into `public/`.

## Branches and pull requests

Every change after the bootstrap goes through a pull request. Merge only when the `verify` check is green. GitHub Free does not enforce branch protection on private repositories, so this is a convention the team follows, not a setting.

- Commits follow Conventional Commits. Tests ship in the same commit as the behavior they verify.
- Work is behavior-first: write the failing test, make it pass, then refactor.
- Keep a pull request to about 400 changed lines; larger work is split into stacked pull requests.

## Deployment

Pushes to `main` run `verify`, then the `deploy` job. Until the owner provisions the cloud resources, `deploy` ends green with the notice "deploy skipped: secrets not provisioned". To turn deployment on, the owner follows the runbook.

## Where to read more

| Topic                         | Document                                                           |
| ----------------------------- | ------------------------------------------------------------------ |
| Stack and versions            | [ADR-0001](docs/adr/0001-stack.md)                                 |
| Hosting, secrets, deploy gate | [ADR-0002](docs/adr/0002-hosting-and-environments.md)              |
| Architecture, testing, data   | [ADR-0003](docs/adr/0003-architecture-testing-data.md)             |
| Owner cloud setup             | [Runbook: cloud provisioning](docs/runbooks/cloud-provisioning.md) |
| Module dependency rule        | [AGENTS.md](AGENTS.md)                                             |
| Client proposal and mockups   | [docs/client-proposal/README.md](docs/client-proposal/README.md)   |
