# ADR-0002: Hosting, environments and secrets

Status: accepted (change `platform-foundation`)

The site runs as one Cloudflare Worker on `workers.dev`, backed by one Neon project through a Hyperdrive configuration. The studio owner provisions every cloud resource by hand; no automated agent ever holds a credential. CI deploys on its own once the owner has loaded five secrets, and skips cleanly until then.

## Decision

| Concern      | Choice                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------ |
| Compute      | Cloudflare Workers Paid, URL `https://calma-inquieta.<account-subdomain>.workers.dev`            |
| Database     | One Neon project `calma-inquieta` (`aws-sa-east-1`, PostgreSQL 17, database `calma`)             |
| Branches     | `main` holds roles and grants only; `staging` receives migrations and serves the deployed Worker |
| Roles        | `neondb_owner` migrates; `calma_app` (least privilege, created with SQL) serves requests         |
| Connection   | Hyperdrive config `calma-staging`, using the `calma_app` direct URL, **query caching disabled**  |
| Provisioning | By the owner, following `docs/runbooks/cloud-provisioning.md`                                    |
| Deploy       | GitHub Actions `deploy` job on pushes to `main`, after `verify`                                  |

Caching stays off because a cached `/status` could hide an outage and cached reads would go stale after admin writes. Hyperdrive still pools connections. Cloudflare exposes the switch as the `--caching-disabled` flag of `wrangler hyperdrive create`, so the runbook uses the CLI for that step.

## Secrets

CI reads exactly five repository secrets, and only in the `deploy` job:

| Secret                   | Holds                                                           |
| ------------------------ | --------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`   | Scoped API token for `wrangler deploy`                          |
| `CLOUDFLARE_ACCOUNT_ID`  | Studio Cloudflare account id                                    |
| `HYPERDRIVE_ID`          | Id of the `calma-staging` Hyperdrive config                     |
| `MIGRATION_DATABASE_URL` | Direct `staging` URL of `neondb_owner` (`sslmode=require`)      |
| `STATUS_URL`             | `https://calma-inquieta.<account-subdomain>.workers.dev/status` |

The owner loads each with `gh secret set <NAME> --repo tiagorojas7/calma-inquieta` and pastes the value at the interactive prompt, which keeps it out of shell history and chat.

### API token scope

Account permissions only, no zone, one account, 12-month TTL:

- Account / Workers Scripts / Edit
- Account / Hyperdrive / Read
- Account / Account Settings / Read

Fallback: if the first deploy fails with an authentication error, add Account / Hyperdrive / Edit and record the change in this ADR.

### Rotation

Re-issue the token or the role password, then run `gh secret set` again (for `calma_app`, also update the Hyperdrive config). The token expires after 12 months; set a calendar reminder.

## Deploy gate

The first step of the `deploy` job tests each secret only for non-emptiness and prints names, never values.

| Secrets set | Result                                                                      |
| ----------- | --------------------------------------------------------------------------- |
| None        | Notice "deploy skipped: secrets not provisioned: <names>"; job stays green  |
| Some        | Job fails with "deploy misconfigured: missing <names>"                      |
| All five    | Substitute the Hyperdrive id, build, migrate `staging`, deploy, smoke check |

This lets every earlier slice merge with green CI before any cloud account exists, and turns deployment on the moment the owner finishes the runbook. `tooling/deploy-workflow.test.ts` exercises the gate script with all three cases.

## Alternatives considered

| Option                                    | Why not                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| `DEPLOY_ENABLED` repository variable      | A second switch to maintain; job-level `if` cannot read secrets anyway  |
| Separate deploy workflow (`workflow_run`) | More moving parts for one environment                                   |
| Manual deploy only                        | Leaves the migration-before-deploy ordering to memory                   |
| Neon serverless driver in the Worker      | Differs from the test driver; HTTP mode has no interactive transactions |

## Consequences

- No branch protection exists on GitHub Free private repositories. "Merge only with green CI" is a documented convention (see the README), not an enforced rule.
- The Hyperdrive id never enters the repository: `wrangler.jsonc` keeps a placeholder and CI substitutes the real id in its own workspace.
- A failed deploy is rolled back by hand with `wrangler rollback`; the Neon `staging` branch holds no business data and can be reset.
