# Delivery Pipeline Specification

## Purpose

Repository hygiene, a single test command, a CI gate, the deploy path to workers.dev, ADRs, and the Strict TDD activation state. It makes every later change start from a verified, deployable base.

Source: proposal "Capabilities", Scope #1-6, #12, #14, Approach 4.1, 4.7, 4.8; decisions OD-3, OD-5, OD-6 (orchestrator, on recommended defaults); OD-2 pending.

## Requirements

### Requirement: Repository hygiene

The repository MUST have `.gitignore`, `.gitattributes` (`* text=auto eol=lf`, `*.webp binary`) and `.editorconfig`. `.gitignore` MUST exclude `.atl/`, `.claude/settings.local.json`, `.env*` except `.env.example`, `.dev.vars`, `node_modules/`, build output, `.wrangler/`, `coverage/` and `docs/client-proposal/_originals/`. Line endings MUST be LF (Prettier `endOfLine: lf`). (Source: proposal Scope #1)

#### Scenario: Ignored files stay untracked

- GIVEN files `.atl/x`, `.dev.vars` and `.claude/settings.local.json` exist
- WHEN `git status` is run
- THEN none is listed

#### Scenario: Example env file tracked

- GIVEN `.env.example` exists
- WHEN `git check-ignore .env.example` runs
- THEN it is not ignored

### Requirement: Mockup conversion before first commit

All 20 files `docs/client-proposal/mockups/image1..20.png` MUST be converted to WebP (quality >= 90, no Git LFS) before the first commit. The PNG originals MUST be moved to the git-ignored `docs/client-proposal/_originals/` and MUST NOT appear in any commit. `docs/client-proposal/README.md` MUST contain the PNG-to-WebP name map and the SHA-256 checksum of each original. A copy of the originals in the studio's cloud drive is an owner action outside this repository. (Source: proposal Scope #2; OD-6)

#### Scenario: History contains no PNG mockups

- GIVEN the repository after the bootstrap push
- WHEN all commits are searched for `docs/client-proposal/mockups/*.png`
- THEN no match is found

#### Scenario: Checksums verify originals

- GIVEN `_originals/` and the README checksum table
- WHEN each original's SHA-256 is computed
- THEN it matches the README value

#### Scenario: Name map complete

- GIVEN the README
- WHEN the map is read
- THEN all 20 `imageN.png` entries resolve to an existing `.webp` file

### Requirement: Secret scan before publication

A gitleaks scan MUST pass before the first push, and gitleaks MUST run in CI as the CLI binary. A finding MUST fail the run. (Source: proposal Scope #12, Defaults)

#### Scenario: Clean bootstrap

- GIVEN the bootstrap tree
- WHEN gitleaks runs
- THEN it reports no leaks

#### Scenario: Planted secret detected

- GIVEN a commit containing a fake credential matching a gitleaks rule
- WHEN the CI gitleaks step runs
- THEN the step fails

### Requirement: Private repository and bootstrap push

The repository `tiagorojas7/calma-inquieta` MUST be private. The bootstrap commit MAY be pushed directly to `main` (authorized by approved-plan decision 4); every later slice MUST go through a pull request. No other remote operation is implied by this requirement. (Source: proposal Scope #3, 4.8)

#### Scenario: Visibility

- GIVEN the created repository
- WHEN its visibility is queried with `gh`
- THEN it is private

### Requirement: Toolchain pinning

Node MUST be pinned to 24 LTS (`.nvmrc` and `engines`), pnpm via `packageManager`, and TypeScript MUST run with `strict` enabled. ESLint (flat config) and Prettier MUST be configured. Typechecking MUST pass with zero errors. (Source: proposal Scope #4)

#### Scenario: Wrong Node version

- GIVEN a Node major other than the pinned one
- WHEN `pnpm i` runs with engine checks on
- THEN it warns or fails per the `engines` policy

#### Scenario: Typecheck

- GIVEN the repository
- WHEN `pnpm typecheck` runs
- THEN it exits 0

### Requirement: Single test command

`pnpm test` MUST run unit, architecture and DB-backed tests in one command, with coverage available. A `test:unit` command SHOULD exist for fast loops. A fresh clone MUST pass `pnpm i && pnpm test` on Windows (or WSL2) and Linux without Docker. (Source: proposal Scope #6, Success Criteria)

#### Scenario: Fresh clone

- GIVEN a fresh clone and no Docker
- WHEN `pnpm i && pnpm test` runs
- THEN it exits 0

#### Scenario: Failing test fails the command

- GIVEN a deliberately failing test
- WHEN `pnpm test` runs
- THEN it exits non-zero

### Requirement: Strict TDD activation

Once the test runner is installed and the single workspace test command works, and BEFORE any behavior task (including `Money`), `openspec/config.yaml` MUST set `strict_tdd: true` and `rules.apply.tdd: true`, and MUST define non-empty `testing.workspace_test_command`, `rules.apply.test_command`, `rules.verify.test_command`, `testing.test_layers`, `testing.quality` and `projects`. `rules.verify.build_command` MUST be set to the real build command as soon as a build script exists (no later than the delivery slice) and MUST stay empty, never invented, until then. The Engram observations `sdd-init/calmainquieta` and `sdd/calmainquieta/testing-capabilities` MUST be refreshed and MUST match the file. (Source: proposal Scope #6, Success Criteria; orchestrator alignment: openspec/config.yaml rules.tasks requires Strict TDD before any behavior task. Previously: activation followed the Money proof and build_command was required at activation.)

#### Scenario: Config and memory agree

- GIVEN activation is complete
- WHEN `openspec/config.yaml` and both Engram observations are read
- THEN all report Strict TDD active with the same test command

#### Scenario: Ordering

- GIVEN the commit history
- WHEN the activation commit is located
- THEN the runner install and single `pnpm test` command precede or are part of it
- AND it precedes the first `Money` commit
- AND no behavior-task commit precedes it

#### Scenario: Build command not invented

- GIVEN activation is complete and no build script exists yet
- WHEN `rules.verify.build_command` is read
- THEN it is empty
- AND once the delivery slice adds a build script, it equals that real command

### Requirement: CI verify gate

A GitHub Actions `verify` workflow MUST run on pull requests and pushes to `main`, executing install, lint, typecheck, test (including DB-backed tests), build and gitleaks. Any failing step MUST fail the workflow. (Source: proposal Scope #12)

#### Scenario: Green on main

- GIVEN the final merged state
- WHEN `verify` runs on `main`
- THEN every step passes

#### Scenario: Red blocks by convention

- GIVEN a pull request whose `verify` run is red
- WHEN the author prepares to merge
- THEN project convention (documented in README and AGENTS.md) forbids merging

### Requirement: Branch protection by convention

No paid GitHub plan is used; enforced branch protection MUST NOT be assumed. The pull-request flow and green `verify` MUST be a documented convention. (Source: OD-5)

#### Scenario: Convention documented

- GIVEN the README
- WHEN the contribution section is read
- THEN it states that merges require a pull request and a green `verify`

### Requirement: Deploy to workers.dev

On push to `main`, CI MUST deploy the Worker to Cloudflare workers.dev only after lint, typecheck, test and build pass, and MUST apply database migrations to the Neon `staging` branch before the Worker deploy. A failed migration MUST stop the deploy. Deployment MUST authenticate with a scoped Cloudflare API token and database secrets stored as GitHub Actions secrets; how they are provisioned is out of scope (OD-2 pending). The deploy job MUST NOT run on pull requests. (Source: OD-3, OD-4)

#### Scenario: Deploy ordering

- GIVEN a push to `main` with all verification steps green
- WHEN the pipeline runs
- THEN migrations run first and the Worker deploys only after they succeed

#### Scenario: Verification failure blocks deploy

- GIVEN a push to `main` where tests fail
- WHEN the pipeline runs
- THEN no migration and no deploy occurs

#### Scenario: Migration failure blocks deploy

- GIVEN a migration that fails against `staging`
- WHEN the pipeline runs
- THEN the Worker deploy step does not run

#### Scenario: Pull request does not deploy

- GIVEN a pull request event
- WHEN the pipeline runs
- THEN the deploy job is skipped

#### Scenario: Secrets absent

- GIVEN the Cloudflare or database secrets are not configured
- WHEN the deploy job starts
- THEN it fails or is skipped with a notice that MUST list the NAMES of the missing secrets and MUST NOT contain any secret value
- AND `verify` remains unaffected

### Requirement: Delivery framework

The Worker MUST be built with React Router framework mode on Vite with the Cloudflare Vite plugin (no major version pinned by this spec; design pins the version), with `appDirectory` set to `src/app`. Local development MUST work on Windows, with WSL2 as the accepted fallback. `pnpm build` MUST succeed on Linux in CI. (Source: proposal Scope #5; framework naming decision)

#### Scenario: Build

- GIVEN the repository on a Linux runner
- WHEN `pnpm build` runs
- THEN it exits 0 and produces the Worker bundle

### Requirement: Documentation set

The repository MUST contain ADRs covering stack, hosting and accounts, architecture, testing and data conventions (ADR-001 to ADR-005, or an explicitly consolidated set), a README (setup, commands, environments, contribution convention) and a short architecture overview. (Source: proposal Scope #14, 4.7)

#### Scenario: ADR coverage

- GIVEN `docs/adr/`
- WHEN its decisions are listed
- THEN stack, hosting, architecture, testing and data conventions each appear in exactly one ADR

### Requirement: Commit conventions

Every commit MUST follow Conventional Commits. No commit MUST contain `Co-Authored-By` lines or AI attribution. Each test SHOULD land with its implementation in the same commit. (Source: proposal 4.8)

#### Scenario: History audit

- GIVEN the commit history of this change
- WHEN messages are checked
- THEN each matches the Conventional Commits pattern and none contains `Co-Authored-By`
