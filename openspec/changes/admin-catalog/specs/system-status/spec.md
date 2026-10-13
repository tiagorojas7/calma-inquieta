# System Status Delta Specification (admin-catalog)

Delta against `openspec/changes/platform-foundation/specs/system-status/spec.md` (platform-foundation is not archived yet, so `openspec/specs/` has no base). Requirements not named here are unchanged. The behavior of `/status` behind Access (use case, response shape, headers) is unchanged.

Source: proposal "Modified Capabilities"; decisions AD2, AD3; baseline deviation A2.

## ADDED Requirements

### Requirement: Status reachable only through Access during the private preview

While Access protects the `workers.dev` host, a request to `/status` without a valid Access session or service token MUST NOT reach the Worker response (Access redirects it to the login), and a request with a valid service token MUST receive the normal `/status` response. The `/status` route MUST NOT require the admin allowlist: it is not an admin route. (Source: AD2, AD3; baseline deviation A2 as a scope adjustment)

#### Scenario: Browser session

- GIVEN a visitor with an Access session
- WHEN `/status` is requested
- THEN the normal `/status` response is returned and no admin allowlist check applies

#### Scenario: Service token

- GIVEN a request carrying a valid service token
- WHEN `/status` is requested
- THEN the normal `/status` response is returned

#### Scenario: Not an admin route

- GIVEN a valid Access identity that is not on the admin allowlist
- WHEN `/status` is requested
- THEN the response is not an access-denied page

## MODIFIED Requirements

### Requirement: Deployed endpoint

After a successful deploy, `https://<worker>.workers.dev/status` MUST return overall state `ok` with the latest applied migration id, produced by `GetSystemStatus` reading Neon through Hyperdrive, when requested through Cloudflare Access (an authorized browser session or the CI service token). Without Access credentials, requests to the preview host are redirected to the Access login while Access protects it. When the database is unreachable it MUST return `degraded` without disclosure. (Source: proposal Success Criteria; blocked on OD-2 for cloud provisioning; AD2 and AD3 add the Access condition. Previously: the endpoint was reachable by any client.)

#### Scenario: Deployed and healthy

- GIVEN the Worker is deployed and the latest migration is applied to the Neon `staging` branch
- WHEN `/status` is requested on workers.dev with a valid service token
- THEN overall state is `ok` and the migration id equals the latest migration in `drizzle/`

#### Scenario: Database unreachable in deployment

- GIVEN the Hyperdrive target is unreachable
- WHEN `/status` is requested on workers.dev with a valid service token
- THEN overall state is `degraded`
- AND the response contains no host or credential information

#### Scenario: Unauthenticated request while Access is on

- GIVEN Access protects the workers.dev host
- WHEN `/status` is requested without credentials
- THEN the client is redirected to the Access login and no status data is returned

## REMOVED Requirements

None.
