# Runbook: cloud provisioning (executed by the owner, not by apply)

Do these steps once, in order, with the studio's own Cloudflare, Neon and GitHub accounts. When you finish, the next run of CI on `main` migrates the Neon `staging` branch, deploys the Worker and checks `/status` by itself. Until then the `deploy` job skips with a green notice.

No automated agent runs or rehearses any of this. Never paste a secret into a chat, an issue or a file in the repository.

## Quick path

1. Cloudflare: upgrade to Workers Paid (C1) and claim the `workers.dev` subdomain (C2).
2. Neon: create the project, the runtime role and the `staging` branch (N1 to N4).
3. Cloudflare: create the scoped API token (C3) and the Hyperdrive config with caching disabled (C4).
4. Terminal: load the five GitHub secrets (G1), then run CI on `main` (G2).

## Before you start

| Need                                         | Check                                                      |
| -------------------------------------------- | ---------------------------------------------------------- |
| Cloudflare account for the studio            | You can open the dashboard and pay for a plan              |
| Neon account                                 | You can create a project                                   |
| GitHub CLI signed in as owner                | `gh auth status` shows `tiagorojas7` with the `repo` scope |
| Repository checkout with `pnpm install` done | Needed only for the `wrangler` command in C4               |
| A password manager                           | Generates and stores the `calma_app` password              |

Write down these values as you go (keep them in the password manager):

| Value                  | Comes from | Used for                 |
| ---------------------- | ---------- | ------------------------ |
| `<account-id>`         | C2         | `CLOUDFLARE_ACCOUNT_ID`  |
| `<account-subdomain>`  | C2         | `STATUS_URL`             |
| owner direct URL       | N4         | `MIGRATION_DATABASE_URL` |
| `calma_app` direct URL | N4         | Hyperdrive (C4) only     |
| API token              | C3         | `CLOUDFLARE_API_TOKEN`   |
| `<hyperdrive-id>`      | C4         | `HYPERDRIVE_ID`          |

## Steps

### C1. Upgrade to Workers Paid

Cloudflare dashboard, Workers & Pages, Plans, choose **Workers Paid**.
Check: the plan page shows "Workers Paid".

### C2. Claim the workers.dev subdomain

Cloudflare dashboard, Workers & Pages, Overview. In the account details panel, set the `workers.dev` subdomain if it is empty, and copy the **Account ID** (also shown in the right-hand sidebar of the dashboard home).
Check: you have `<account-id>` and `<account-subdomain>`. The status URL will be `https://calma-inquieta.<account-subdomain>.workers.dev/status`.

### N1. Create the Neon project

Neon console, New project:

| Field            | Value                                          |
| ---------------- | ---------------------------------------------- |
| Name             | `calma-inquieta`                               |
| Region           | AWS South America (`aws-sa-east-1`, Sao Paulo) |
| Postgres version | 17                                             |
| Database name    | `calma`                                        |

Check: the default branch `main` exists, with owner role `neondb_owner` and database `calma`.

### N2. Create the runtime role on `main`

Generate a password for `calma_app` in the password manager. Use letters and digits only, so it never needs URL encoding inside a connection string.

Neon console, branch `main`, SQL Editor, database `calma`. Replace the placeholder and run the whole block. This creates roles and grants only. **Do not run migrations on `main`**; it holds no tables or data until the launch change.

```sql
CREATE ROLE calma_app WITH LOGIN PASSWORD '<password-from-password-manager>';
GRANT CONNECT ON DATABASE calma TO calma_app;
GRANT USAGE ON SCHEMA public TO calma_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO calma_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO calma_app;
CREATE SCHEMA IF NOT EXISTS drizzle AUTHORIZATION neondb_owner;
GRANT USAGE ON SCHEMA drizzle TO calma_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA drizzle
  GRANT SELECT ON TABLES TO calma_app;
```

Check, in the same editor:

```sql
SELECT rolname, pg_has_role(rolname, 'neon_superuser', 'member') AS is_superuser
FROM pg_roles WHERE rolname IN ('calma_app', 'neondb_owner');
```

`calma_app` must show `false`. A role created with SQL gets least privilege; only roles created in the console, CLI or API join `neon_superuser`, which is why this step uses SQL.

### N3. Create the `staging` branch

Neon console, Branches, Create branch: name `staging`, parent `main`, current data.
Check: branch `staging` exists. Roles are duplicated into a child branch when it is created, and default privileges travel with the copied data, so `staging` already has `calma_app` and its grants. That is why N2 comes first. If you ever create the role after the branch, repeat N2 on `staging`.

### N4. Copy the two direct connection strings of `staging`

Neon console, branch `staging`, Connect. Turn **Connection pooling off** (the host must not contain `-pooler`). Copy one string per role:

| Role           | Use for                                     | Becomes secret           |
| -------------- | ------------------------------------------- | ------------------------ |
| `neondb_owner` | Running migrations in CI                    | `MIGRATION_DATABASE_URL` |
| `calma_app`    | Hyperdrive in C4 only (not a GitHub secret) | none                     |

Check: both strings start with `postgres://`, name database `calma`, and end with `sslmode=require`. Keep `sslmode=require` and drop any other query parameter if the console adds one.

### C3. Create the scoped Cloudflare API token

Cloudflare dashboard, My Profile, API Tokens, Create Token, **Create Custom Token**:

| Field             | Value                                                  |
| ----------------- | ------------------------------------------------------ |
| Token name        | `calma-inquieta-ci`                                    |
| Permission 1      | Account / Workers Scripts / Edit                       |
| Permission 2      | Account / Hyperdrive / Read                            |
| Permission 3      | Account / Account Settings / Read                      |
| Account Resources | Include, only the studio account                       |
| Zone Resources    | none (add no zone permission)                          |
| TTL               | End date 12 months from today; add a calendar reminder |

Copy the token once, into the password manager.
Check: the token summary lists exactly those three permissions on one account.
Fallback: if the first deploy fails with an authentication error, edit the token and add **Account / Hyperdrive / Edit**, then record the change in `docs/adr/0002-hosting-and-environments.md`.

### C4. Create the Hyperdrive config with caching disabled

Caching must be off so `/status` always reflects the database. Cloudflare exposes this switch as a flag of the `wrangler` CLI, so use your terminal in the repository checkout:

```sh
pnpm exec wrangler login
pnpm exec wrangler hyperdrive create calma-staging --connection-string="<calma_app direct URL from N4>" --caching-disabled
```

`wrangler login` opens a browser; sign in with the studio account and allow access. The create command prints the config **id**. Copy it as `<hyperdrive-id>`.

The connection string contains a password. Run the command in your own terminal, never paste it into a chat, and clear that terminal's history afterwards. If `wrangler` reports a missing permission after login, create a short-lived token with Account / Hyperdrive / Edit, run the command with `CLOUDFLARE_API_TOKEN` set to it, then delete that token.

Check:

```sh
pnpm exec wrangler hyperdrive get <hyperdrive-id>
```

The output must show caching disabled, the origin `calma_app` and a Neon host with no `-pooler`.

### G1. Load the five GitHub secrets

Run each command and paste the value at the prompt, so it stays out of shell history:

```sh
gh secret set CLOUDFLARE_API_TOKEN  --repo tiagorojas7/calma-inquieta
gh secret set CLOUDFLARE_ACCOUNT_ID --repo tiagorojas7/calma-inquieta
gh secret set HYPERDRIVE_ID         --repo tiagorojas7/calma-inquieta
gh secret set MIGRATION_DATABASE_URL --repo tiagorojas7/calma-inquieta
gh secret set STATUS_URL            --repo tiagorojas7/calma-inquieta
```

| Secret                   | Paste                                                           |
| ------------------------ | --------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`   | The token from C3                                               |
| `CLOUDFLARE_ACCOUNT_ID`  | `<account-id>` from C2                                          |
| `HYPERDRIVE_ID`          | `<hyperdrive-id>` from C4                                       |
| `MIGRATION_DATABASE_URL` | The `neondb_owner` direct URL from N4                           |
| `STATUS_URL`             | `https://calma-inquieta.<account-subdomain>.workers.dev/status` |

Check:

```sh
gh secret list --repo tiagorojas7/calma-inquieta
```

The list shows exactly the five names. If you load only some, the `deploy` job fails and names the missing ones; it never prints a value.

### G2. Run CI on `main`

Push to `main` (or open the latest `ci` run on `main` in the Actions tab and choose **Re-run all jobs**). Expected result of the `deploy` job:

1. The first step finds all five secrets and continues.
2. Migrations apply to `staging`, then the Worker deploys.
3. The smoke check passes: `/status` returns `data-status="ok"`.

Check yourself:

```sh
curl -fsS https://calma-inquieta.<account-subdomain>.workers.dev/status
```

The response contains `data-status="ok"` and the latest migration `0000_baseline`.

### Manual deploys

CI is the normal way to deploy. If you ever run `wrangler deploy` by hand, pass both variables explicitly:

```sh
pnpm exec wrangler deploy --var "SITE_URL:<origin>" --var "BUILD_COMMIT:<sha>"
```

`<origin>` is the public origin (for example `https://calma-inquieta.<account-subdomain>.workers.dev`) and `<sha>` is the commit being deployed. Without them, production silently gets the `wrangler.jsonc` defaults (`SITE_URL` `http://localhost:5173` and `BUILD_COMMIT` `local`), so canonical links, the sitemap and the status payload would point at the wrong place. Leave `SITE_INDEXING` alone: it stays `off` until the launch change.

## Troubleshooting

| Symptom                                              | Likely cause and fix                                                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `deploy misconfigured: missing <names>`              | A secret is absent or empty. Run `gh secret set` for each listed name                                                   |
| `wrangler deploy` fails with an authentication error | Token lacks a permission. Apply the fallback in C3                                                                      |
| `db:migrate` fails with a permission error           | The URL is not the `neondb_owner` URL, or it is pooled. Redo N4 and `gh secret set MIGRATION_DATABASE_URL`              |
| `/status` returns `degraded` after a good deploy     | Hyperdrive points at the wrong role or branch, or `staging` is waking. Run `wrangler hyperdrive get`, retry in a minute |
| Smoke check fails right after deploy                 | Propagation delay. Re-run the `deploy` job                                                                              |

## Rollback

| Goal                        | Action                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bad Worker version          | `pnpm exec wrangler rollback` (or delete the Worker in the dashboard)                                                                                   |
| Bad data on `staging`       | Reset the `staging` branch from `main` in the Neon console (it holds no business data; 6 hours of point-in-time restore)                                |
| Switch deployment off again | `gh secret delete <NAME> --repo tiagorojas7/calma-inquieta` for any one secret; the gate then fails by name, or delete all five to make it skip cleanly |
| Full teardown               | Delete the Hyperdrive config, revoke the API token, delete the Neon project, then delete the five secrets                                               |

Never edit an applied migration. Fix forward with a new migration.

## Rotation

| Credential              | Cadence              | How                                                                                                                                        |
| ----------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Cloudflare API token    | Every 12 months      | Create a new token (C3), `gh secret set CLOUDFLARE_API_TOKEN`, delete the old token                                                        |
| `calma_app` password    | On suspicion of leak | `ALTER ROLE calma_app PASSWORD '...'` on `main` and `staging`, then `wrangler hyperdrive update <hyperdrive-id> --connection-string="..."` |
| `neondb_owner` password | On suspicion of leak | Reset it in the Neon console, copy the new `staging` direct URL, `gh secret set MIGRATION_DATABASE_URL`                                    |

## Checklist

- [ ] C1 Workers Paid active
- [ ] C2 `<account-id>` and `<account-subdomain>` recorded
- [ ] N1 to N4 done; `calma_app` is not a `neon_superuser` member; two direct URLs copied
- [ ] C3 token has exactly three account permissions and a 12-month end date
- [ ] C4 `wrangler hyperdrive get` shows caching disabled
- [ ] G1 `gh secret list` shows five names
- [ ] G2 deploy job green and `/status` shows `data-status="ok"`
