# Delivery Pipeline Delta Specification (admin-catalog)

Delta against `openspec/changes/platform-foundation/specs/delivery-pipeline/spec.md` (platform-foundation is not archived yet, so `openspec/specs/` has no base). Requirements not named here are unchanged.

Source: proposal "Modified Capabilities"; decisions AD2, AD3, AD5, AD6; Scope #12; Owner runbook Z2, Z3, V1.

## ADDED Requirements

### Requirement: Deploy smoke check through Access

After the Worker deploy, the pipeline MUST run a smoke check of `/status` on the deployed `workers.dev` URL that authenticates through Cloudflare Access with a service token, sending the headers `CF-Access-Client-Id` and `CF-Access-Client-Secret` taken from the GitHub secrets `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` (names final in design). A smoke check that is redirected to the Access login, receives a non-success status or reports a state other than `ok` MUST fail the job. Secret values MUST NOT be printed in logs, summaries or error messages. (Source: AD3, proposal Scope #12, Approach 4 "CI")

#### Scenario: Smoke passes with the token

- GIVEN a successful deploy and valid service-token secrets
- WHEN the smoke step runs
- THEN it sends both Access headers and the job passes when `/status` reports `ok`

#### Scenario: Redirected to the login

- GIVEN a smoke request answered by a redirect to the Access login page
- WHEN the step evaluates the response
- THEN the step fails

#### Scenario: Secret values never echoed

- GIVEN the workflow definition and its step output
- WHEN the secret values are searched in the definition, the echoed commands and the failure messages
- THEN none appears (only names), proven by a workflow test following the existing no-echo pattern

#### Scenario: Status without the token is refused

- GIVEN Access is enabled on the host
- WHEN `/status` is requested without the headers
- THEN it is redirected to the Access login (documented check V1, performed by the owner)

### Requirement: Deploy never passes the dev identity bypass

The deploy and verify workflows MUST NOT define, pass or default the dev identity variable, in the Worker variables or in the environment. A workflow test MUST fail when any occurrence is present. (Source: AD5, proposal Approach 4 "Dev bypass")

#### Scenario: Workflow scanned

- GIVEN `.github/workflows/ci.yml`
- WHEN the workflow test searches for the dev identity variable name
- THEN there is no occurrence

#### Scenario: Planted occurrence

- GIVEN a workflow that passes the dev identity variable with `--var`
- WHEN the workflow test runs
- THEN it fails

### Requirement: Access configuration passed without secrets

The non-secret Access identifiers (team domain, application audience) and the admin allowlist MUST reach the Worker only by the transport chosen in design (proposal: GitHub Actions variables passed with `--var`, or committed values) and MUST NOT be GitHub secrets. Missing values MUST NOT fail the deploy, because the app fails closed on `/admin` and public pages stay up. (Source: proposal Approach 4 "Configuration", Owner runbook Z5, "Until Z5, /admin denies everyone")

#### Scenario: Values absent

- GIVEN the Access variables and allowlist are not configured
- WHEN the deploy job runs
- THEN the deploy proceeds and `/admin` denies everyone

## MODIFIED Requirements

### Requirement: Deploy to workers.dev

On push to `main`, CI MUST deploy the Worker to Cloudflare workers.dev only after lint, typecheck, test and build pass, and MUST apply database migrations to the Neon `staging` branch before the Worker deploy. A failed migration MUST stop the deploy. Deployment MUST authenticate with a scoped Cloudflare API token and database secrets stored as GitHub Actions secrets; how they are provisioned is out of scope (OD-2 pending). The deploy job MUST NOT run on pull requests. The deploy gate MUST require the two Access service-token secrets `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` in addition to the Cloudflare and database secrets, and MUST list missing names only. (Source: OD-3, OD-4; AD3 adds the two Access secrets to the gate. Previously: the gate required only the Cloudflare and database secrets.)

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

- GIVEN any of the Cloudflare, database or Access service-token secrets is not configured
- WHEN the deploy job starts
- THEN it fails or is skipped with a notice that MUST list the NAMES of the missing secrets and MUST NOT contain any secret value
- AND `verify` remains unaffected

#### Scenario: Access secrets named in the gate

- GIVEN `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` are the only missing secrets
- WHEN the deploy job starts
- THEN the notice names exactly those two and no values

## REMOVED Requirements

None.
