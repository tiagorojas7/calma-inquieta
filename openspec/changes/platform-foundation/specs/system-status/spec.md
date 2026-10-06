# System Status Specification

## Purpose

A single public technical endpoint, `/status`, reports application health by running the `GetSystemStatus` use case, which reads PostgreSQL through a port. It is the walking-skeleton proof that every layer, the Worker runtime and the database connection work end to end. It carries no business behavior.

Source: proposal "Capabilities", Scope #13, Approach 4.3.

## Requirements

### Requirement: Status use case and domain rule

The `GetSystemStatus` use case MUST depend only on a `DatabaseProbe` port and the `Clock` port, and MUST return a `Result` containing a `SystemStatus` value. The overall state MUST be `ok` only when every check passed, and `degraded` when any check failed. The use case MUST NOT throw for an unreachable database. (Source: proposal 4.3)

#### Scenario: All checks pass

- GIVEN an in-memory `DatabaseProbe` that reports reachable with latest migration id `0000_baseline`
- AND a fixed `Clock` returning 2026-10-05T12:00:00Z
- WHEN `GetSystemStatus` is executed
- THEN the overall state is `ok`
- AND the database check is `ok`
- AND the server time is 2026-10-05T12:00:00Z
- AND the latest migration id is `0000_baseline`

#### Scenario: Probe reports failure

- GIVEN an in-memory `DatabaseProbe` that reports a failed check
- WHEN `GetSystemStatus` is executed
- THEN the overall state is `degraded`
- AND the database check is `failed`
- AND the use case returns a successful `Result` (not a thrown error)

### Requirement: Database probe adapter

The Postgres `DatabaseProbe` adapter MUST read the latest applied migration identifier and execute a trivial query. It MUST map every failure (connection refused, timeout, missing migrations table) to a failed check and MUST NOT propagate the raw error to its caller. (Source: proposal 4.3)

#### Scenario: Reachable migrated database

- GIVEN a test database with the baseline migration applied
- WHEN the adapter probes the database
- THEN it reports reachable
- AND it returns the identifier of the latest applied migration

#### Scenario: Unreachable database

- GIVEN a connection string pointing at a closed port
- WHEN the adapter probes the database
- THEN it returns a failed check
- AND it does not throw

#### Scenario: Database without migrations

- GIVEN an empty database with no migrations applied
- WHEN the adapter probes the database
- THEN it returns a failed check or a reachable check with no migration id, and the overall state is `degraded`

### Requirement: Probe contract parity

The same probe contract test suite MUST run against both the in-memory fake and the real Postgres adapter, so the fake cannot drift from the real behavior. (Source: proposal 4.3 "Contract test")

#### Scenario: Both implementations satisfy the suite

- GIVEN the shared probe contract suite
- WHEN it runs against the in-memory fake and against the Postgres adapter on the test database
- THEN every contract case passes for both

### Requirement: Status route

The `/status` route MUST be served by a React Router framework-mode loader that is a plain function, resolves `GetSystemStatus` from the composition root, calls it, and returns JSON-serializable data. The loader MUST NOT import Drizzle, database drivers or SDKs. (Source: proposal 4.3, 4.2)

#### Scenario: Healthy response

- GIVEN a loader wired with an in-memory probe reporting healthy
- WHEN the loader is invoked
- THEN the data contains overall state `ok`, check names with their results, the latest migration id, the build commit and the server time

#### Scenario: Degraded response keeps HTTP success semantics defined by the route

- GIVEN a loader wired with an in-memory probe reporting failure
- WHEN the loader is invoked
- THEN the data contains overall state `degraded`
- AND the loader does not throw

### Requirement: Response shape and disclosure limits

The response MUST expose only: overall state (`ok | degraded`), check names with per-check result, the latest migration id, the build commit and the server time. It MUST NOT include connection strings, hostnames, ports, credentials, environment variable values, driver error messages or stack traces, in either the `ok` or the `degraded` case. (Source: proposal Scope #13, Defaults)

#### Scenario: Failure details are not leaked

- GIVEN the database driver fails with an error message containing a hostname and a password
- WHEN `/status` is requested
- THEN the response body contains neither the hostname nor the password nor the raw error text

#### Scenario: No secret values in a healthy response

- GIVEN a running environment with a configured database secret
- WHEN `/status` is requested
- THEN the serialized response does not contain the secret value

### Requirement: Response headers

Responses from `/status` MUST include `Cache-Control: no-store` and an `X-Robots-Tag` header containing `noindex`. The page MUST render plain semantic HTML without Tailwind or UI components. (Source: proposal Defaults; scope adjustment: the "short edge cache or rate limit" risk mitigation is NOT specified, to keep the skeleton minimal; `no-store` is the owner-visible default.)

#### Scenario: Headers present

- GIVEN a request to `/status`
- WHEN the response is returned
- THEN `Cache-Control` equals `no-store`
- AND `X-Robots-Tag` contains `noindex`

### Requirement: Deployed endpoint

After a successful deploy, `https://<worker>.workers.dev/status` MUST return overall state `ok` with the latest applied migration id, produced by `GetSystemStatus` reading Neon through Hyperdrive. When the database is unreachable it MUST return `degraded` without disclosure. (Source: proposal Success Criteria; blocked on OD-2 for cloud provisioning)

#### Scenario: Deployed and healthy

- GIVEN the Worker is deployed and the baseline migration is applied to the Neon `staging` branch
- WHEN `/status` is requested on workers.dev
- THEN overall state is `ok` and the migration id equals the latest migration in `drizzle/`

#### Scenario: Database unreachable in deployment

- GIVEN the Hyperdrive target is unreachable
- WHEN `/status` is requested on workers.dev
- THEN overall state is `degraded`
- AND the response contains no host or credential information
