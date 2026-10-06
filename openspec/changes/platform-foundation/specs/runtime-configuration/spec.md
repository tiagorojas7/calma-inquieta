# Runtime Configuration Specification

## Purpose

All configuration is validated by one schema for the four environments (local, test, CI, deployed), and invalid or missing configuration fails fast naming variables only, never values.

Source: proposal "Capabilities", Scope #11, Approach 4.6.

## Requirements

### Requirement: Single validation schema

One zod schema MUST validate configuration for both Worker bindings (per-request `env`) and Node scripts (`process.env`). Required variables MUST be defined once, in `src/platform`. Variables MUST be consumed only through the validated result, not read directly from the environment elsewhere. (Source: proposal 4.6; the exact variable list is a design decision)

#### Scenario: Valid configuration

- GIVEN every required variable is present and well-formed
- WHEN the schema validates
- THEN it returns a typed configuration object

#### Scenario: Same schema for both shapes

- GIVEN equivalent values supplied as Worker bindings and as `process.env`
- WHEN each is validated
- THEN both yield equivalent configuration

### Requirement: Fail fast with names only

Validation failure MUST report the names of missing or invalid variables and the reason category (missing, invalid format). Output, logs and thrown errors MUST NOT contain any variable value. (Source: proposal 4.6, Success Criteria)

#### Scenario: Missing variable

- GIVEN `DATABASE_URL`-equivalent is absent
- WHEN validation runs
- THEN the error names that variable as missing

#### Scenario: Invalid value is not echoed

- GIVEN a variable holds the malformed value `secret-token-123`
- WHEN validation fails
- THEN the error names the variable
- AND the error text does not contain `secret-token-123`

#### Scenario: Multiple failures

- GIVEN two variables are missing
- WHEN validation runs
- THEN both names are reported in one failure

### Requirement: Worker failure behavior

In the Worker, validation MUST run on the first request and its result MUST be cached for the isolate lifetime. A configuration failure MUST produce a generic HTTP 500 response without variable names or values in the body; names MAY appear in server logs. (Source: proposal 4.6; the "names allowed in logs but not body" split is a spec-level assumption to stay consistent with the no-disclosure rule on `/status`.)

#### Scenario: Misconfigured Worker

- GIVEN a Worker missing a required binding
- WHEN any route is requested
- THEN the response is HTTP 500 with a generic body
- AND the body contains no variable names or values

#### Scenario: Cached validation

- GIVEN a valid configuration validated on the first request
- WHEN a second request arrives in the same isolate
- THEN validation is not repeated

### Requirement: Example files

`.env.example` and `.dev.vars.example` MUST list variable names without values, and every variable in the schema MUST appear in them. Real `.env*` and `.dev.vars` files MUST be git-ignored. (Source: proposal Scope #1, #11)

#### Scenario: Example completeness

- GIVEN the schema's variable names
- WHEN compared with the example files
- THEN every name appears in the example files and none has a value

#### Scenario: Secrets not tracked

- GIVEN a local `.dev.vars` with real values
- WHEN `git status` is run
- THEN `.dev.vars` is not listed as untracked or modified

### Requirement: Per-environment sources

Each environment MUST have a documented configuration source: local (`.dev.vars` / `.env`), test (test setup values, with `TEST_DATABASE_URL` as optional override), CI (GitHub Actions secrets and variables), deployed (Worker bindings, Hyperdrive and secrets). Provisioning of deployed secrets requires owner authorization (OD-2) and is not specified here. (Source: proposal Capabilities; OD-2)

#### Scenario: README documents sources

- GIVEN the README
- WHEN the environments section is read
- THEN each of the four environments lists where its configuration comes from
