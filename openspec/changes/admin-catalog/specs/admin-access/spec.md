# Admin Access Specification

## Purpose

Defines who may reach and use the private admin panel. Sign-in is Cloudflare Access (email one-time PIN, managed by Cloudflare). The app does not manage users or passwords: it verifies the Access identity on every `/admin` request and then checks its own admin email allowlist. Everything fails closed.

Source: proposal Scope #1; decisions AD1, AD2, AD4, AD5, AD6, D1; Approach 4 "Access integration"; baseline deviation A1 (baseline: "Permisos de acceso ... usuarios administradores y sesión privada", `docs/client-proposal/proposal.md`).

## Requirements

### Requirement: Identity verification on every admin request

Every request whose path is `/admin` or starts with `/admin/` MUST be verified before any loader, action or use case runs. Verification MUST consist of a valid Access identity (design picks the mechanism: the `Cf-Access-Jwt-Assertion` JWT or a runtime-provided Access identity) and then the admin allowlist. When the JWT mechanism is used, the token MUST be accepted only when all of these hold: RS256 signature valid against the team's published keys, `aud` contains the configured application audience, `iss` equals the configured team domain, `exp` and `nbf` are satisfied using the `Clock` port, and an `email` claim is present. The check MUST apply to GET, POST and every other method. (Source: proposal Scope #1, AD4, Approach 4)

#### Scenario: Valid identity on the allowlist

- GIVEN a token signed by a known key with the configured audience and issuer, not expired, with email `owner@example.com`
- AND `owner@example.com` is on the admin allowlist
- WHEN `GET /admin` is requested
- THEN the request proceeds with an `AdminActor` whose email is `owner@example.com`

#### Scenario: Missing identity

- GIVEN a request to `/admin/talleres` with no Access identity
- WHEN the gate runs
- THEN the response is a denial and no loader runs

#### Scenario: Rejected token variants

- GIVEN a token with a bad signature, or a wrong audience, or a wrong issuer, or an expired `exp`, or a future `nbf`, or an unknown key id, or a non-RS256 algorithm, or no `email` claim
- WHEN the gate runs for each case
- THEN every case is denied
- AND no `AdminActor` is created

#### Scenario: Action is gated like a loader

- GIVEN a POST to an admin action with no valid identity
- WHEN the request is handled
- THEN the action does not run and no data changes

### Requirement: Admin email allowlist

After a valid identity, the identity's email MUST be compared, case-insensitively and after trimming, with the configured admin allowlist. An email not on the list MUST be denied even when Access itself admitted the user. The allowlist is the only source of admin rights in the app: there are no roles beyond "admin", no user table and no in-panel user management. (Source: D1, proposal Scope #1; Out of Scope "In-panel user management")

#### Scenario: Case-insensitive match

- GIVEN the allowlist contains `Cami@Example.com`
- AND a valid identity carries `cami@example.com`
- WHEN the gate runs
- THEN the request is allowed

#### Scenario: Preview viewer without admin rights

- GIVEN a valid Access identity for `viewer@example.com`
- AND `viewer@example.com` is not on the allowlist
- WHEN `/admin` is requested
- THEN the response is the access-denied response
- AND public pages remain reachable for that viewer

#### Scenario: Whitespace tolerance

- GIVEN the allowlist value contains entries with surrounding spaces
- WHEN the allowlist is parsed
- THEN entries are trimmed and compared normalized

### Requirement: Fail closed on missing configuration

`/admin` MUST be denied when the Access team domain, the application audience or the admin allowlist is missing, or when the allowlist is empty or contains no valid email. A missing or empty allowlist MUST deny everyone and MUST NOT mean "allow all". Turning Access off by mistake MUST therefore lock the panel, not open it. Public routes MUST NOT depend on this configuration. (Source: proposal Approach 4 "Fail closed"; Rollback "Access")

#### Scenario: Empty allowlist denies

- GIVEN a valid identity and an empty allowlist
- WHEN `/admin` is requested
- THEN the request is denied

#### Scenario: Missing allowlist variable denies

- GIVEN the allowlist variable is not set
- WHEN `/admin` is requested with a valid identity
- THEN the request is denied

#### Scenario: Missing Access configuration denies

- GIVEN the team domain or audience is not configured
- WHEN `/admin` is requested with any token
- THEN the request is denied

#### Scenario: Public pages unaffected

- GIVEN the Access configuration and the allowlist are missing
- WHEN a public page is requested
- THEN it is served normally

### Requirement: Service tokens are never admins

An identity that carries no `email` claim (an Access service token) MUST be denied by the admin gate. A service token MUST NOT receive an `AdminActor` under any configuration. (Source: proposal Approach 4 "Fail closed", Scope #1)

#### Scenario: Service-token identity

- GIVEN a validly signed token for a service token (no email claim)
- WHEN `/admin` is requested
- THEN the request is denied

### Requirement: Denial response

A denial MUST respond with HTTP 403 and the "No tenés acceso al panel" page for an authenticated non-admin, and MUST NOT disclose which check failed (missing token, bad signature, not on the list) in the body, headers or logs beyond check names. A denial MUST NOT reveal the allowlist contents. The page MAY show the signed-in email so a typo or case mismatch is visible. (Source: proposal Approach 4, Risks "Allowlist misconfiguration")

#### Scenario: Reason not disclosed

- GIVEN a request denied for a bad signature and another denied for not being on the list
- WHEN both response bodies are compared
- THEN neither names the failed check or lists any allowlist entry

#### Scenario: Signed-in email shown

- GIVEN a valid identity not on the allowlist
- WHEN the denial page renders
- THEN it shows that identity's email

### Requirement: Layered enforcement and actor propagation

Enforcement MUST exist in three independent layers: the Worker gate for every `/admin` path (independent of route code), the admin layout middleware that runs before every admin loader and action, and the `AdminActor` parameter required by every admin use case. Every admin write and every admin read use case MUST require an `AdminActor` as its first argument and MUST return a denial (not throw) when it is absent. Writes MUST record the actor email and time as "last changed by / at". (Source: proposal Scope #1, Approach 1 and 4; baseline deviation A14 as a scope adjustment: not in the baseline)

#### Scenario: Use case without actor

- GIVEN an admin use case invoked without an `AdminActor`
- WHEN it executes
- THEN it returns a denial `Result`
- AND no repository is called

#### Scenario: Worker gate independent of the router

- GIVEN an admin route added without any middleware
- WHEN it is requested without identity
- THEN the Worker gate still denies it

#### Scenario: Actor recorded

- GIVEN an admin `cami@example.com` updates a teacher
- WHEN the record is read back
- THEN its "last changed by" is `cami@example.com` and "last changed at" is the `Clock` time

### Requirement: Same-origin rule for mutations

Every admin request that changes state (non-GET, non-HEAD) MUST carry an `Origin` header equal to the site's own origin and MUST be rejected otherwise. No GET request MUST change state. (Source: proposal Approach 4 "Layers of defense", Risks "Cross-site request forgery")

#### Scenario: Cross-origin POST

- GIVEN a valid admin identity and a POST with `Origin: https://evil.example`
- WHEN the request is handled
- THEN it is rejected and nothing changes

#### Scenario: Missing Origin on POST

- GIVEN a valid admin identity and a POST without an `Origin` header
- WHEN the request is handled
- THEN it is rejected

#### Scenario: Same-origin POST

- GIVEN a valid admin identity and a POST with the site's own `Origin`
- WHEN the request is handled
- THEN it is processed

### Requirement: Sign-out

The admin shell MUST offer "Salir" linking to the Access logout endpoint `/cdn-cgi/access/logout`. The app MUST NOT keep its own session or cookie. (Source: proposal Scope #1, Approach 4 "Sign-out")

#### Scenario: Salir target

- GIVEN a signed-in admin viewing any admin page
- WHEN the "Salir" link is read
- THEN its href is `/cdn-cgi/access/logout`

### Requirement: Dev-only identity bypass

A dev identity MAY be honored only when the configured site URL host is `localhost` over `http` AND the build mode is development. The environment validation schema MUST reject a dev identity configured together with any other site URL or any non-development mode, so a misconfigured Worker refuses to start (HTTP 500, a log naming only the variable). The dev identity MUST still be subject to the admin allowlist. CI and the deploy job MUST NOT pass a dev identity, and tests MUST prove both rules. (Source: AD5, proposal Approach 4 "Dev bypass")

#### Scenario: Local development

- GIVEN site URL `http://localhost:5173`, development mode and a dev identity on the allowlist
- WHEN `/admin` is requested without an Access token
- THEN the request proceeds as that identity

#### Scenario: Production site URL rejects the bypass

- GIVEN a dev identity and site URL `https://calma-inquieta.example.workers.dev`
- WHEN the environment is validated
- THEN validation fails naming only the variable, never its value
- AND the Worker answers 500 on every request

#### Scenario: Production mode rejects the bypass

- GIVEN a dev identity, a localhost site URL and a production build mode
- WHEN the environment is validated
- THEN validation fails

#### Scenario: Bypass cannot admit a non-listed identity

- GIVEN a dev identity not on the allowlist
- WHEN `/admin` is requested locally
- THEN the request is denied

#### Scenario: CI never passes the bypass

- GIVEN the deploy workflow definition
- WHEN it is scanned for the dev identity variable
- THEN no occurrence exists

### Requirement: Configuration validation and secrecy

New variables (Access team domain, application audience, admin allowlist, dev identity) MUST be validated by the single environment schema and errors MUST name variables only, never values. The admin allowlist and Access identifiers are non-secret but MUST NOT be echoed in logs or responses. Agents MUST NOT hold or provision credentials; the owner sets all values from the runbook. (Source: proposal "Modified Capabilities" note on `runtime-configuration`, AD6)

#### Scenario: Names-only error

- GIVEN an invalid Access audience value
- WHEN the environment is validated
- THEN the error names the variable and does not contain its value

### Requirement: Key retrieval resilience

When the JWT mechanism is used, the team's public keys MAY be cached per isolate and MUST be refetched at most once per request when the key id is unknown. A failure to fetch keys MUST result in denial, never in acceptance. (Source: proposal Approach 4 "Verification")

#### Scenario: Key rotation

- GIVEN a token signed by a key not in the cache but present on refetch
- WHEN the gate runs
- THEN the token is accepted

#### Scenario: Key source unreachable

- GIVEN the key source fails
- WHEN a token with an uncached key id is verified
- THEN the request is denied
