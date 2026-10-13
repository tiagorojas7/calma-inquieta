# Design: Admin Catalog (admin identity, shell, workshops, turnos, periods, teachers, materials)

Change 3 of 8 | Project: calmainquieta | Store: hybrid | Phase: sdd-design | **Revision 2** | Date: 2026-10-07
Inputs: `proposal.md` (revision 2: AD1-AD7, D1-D8, S1-S8, slices B0-B9 and F0-F9), `specs/*/spec.md` (10 files), orchestrator defaults for 11 spec gaps (2026-10-07, section 0), the owner's "recorte liviano" scope decision (2026-10-07, section 0.2), a fresh-context validator report on revision 1, `openspec/config.yaml`, `AGENTS.md`, `eslint.config.ts`, `tooling/architecture/architecture.test.ts`, `tooling/{deploy-workflow,repo-hygiene}.test.ts`, `vitest.config.ts`, `tsconfig.{node,cloudflare}.json`, `package.json`, `drizzle.config.ts`, `drizzle/meta/_journal.json`, `wrangler.jsonc`, `.dev.vars.example`, `workers/app.ts`, `src/app/{context,routes,root}.ts(x)`, `src/app/routes/status.tsx`, `src/composition/request-services.ts`, `src/platform/{env,system-clock}.ts`, `src/platform/db/{schema,session,migrate,migration-catalog}.ts`, `src/modules/_shared/**`, `src/modules/system-status/**` (including the `ProbeMemoCell` rule "a Promise must never be shared across requests"), `src/testing/{contracts,db,fakes}/**`, `.github/workflows/ci.yml`, `docs/runbooks/cloud-provisioning.md`, `openspec/changes/design-system-and-public-site/{design,tasks}.md`, `openspec/changes/platform-foundation/design.md` (D4, D6, D9).

> **Design in one paragraph.** Five new screaming modules (`admin-access`, `media`, `teachers`, `workshops`, `materials`) follow the `system-status` pattern. Each module exposes **use-case services** through its `index.ts`, and composition puts those services into `AppServices`. Every admin use case takes an `AdminActor` first and returns a `Result`. Drizzle tables live in **`src/platform/db/schema/<module>.ts`**, which keeps cross-module foreign keys and the single migration history inside `platform`. A fitness test stops a module's adapter from reading another module's tables. The Worker verifies the **`Cf-Access-Jwt-Assertion` JWT itself with WebCrypto**: RS256, team keys cached per isolate as plain data, no Promise shared across requests, 60 s skew. **No JOSE package and no allowlist change are needed.** Admin configuration (Access identifiers, the allowlist held as a Worker secret) is parsed **separately from the Worker-wide schema**, so a missing or malformed value denies `/admin` only and never affects public pages. Protection has three independent layers: a Worker gate in front of React Router (denials are re-dispatched to a denial page, so no admin route code runs), React Router 8 middleware on the admin layout, and the actor check in every use case. Mutations must be same-origin (`Origin` plus `Sec-Fetch-Site`). A dev-only identity is honored only in a development build on `http://localhost`. Images go to R2 behind an `ImageStorage` port: the browser resizes and re-encodes them, the server enforces 5 MiB and checks JPEG, PNG or WebP by content, and `/imagenes/<id>.<ext>` serves them immutably. CI's smoke check passes Access with a service token and asserts that `/admin` answers 403 to that token. BACK ships two contract PRs first. Only two BACK slices wait for owner steps (B1b for the Access secrets, B2b for the R2 bucket); the rest merge as they are ready. Work ships as **14 BACK and 10 FRONT PRs**, each at most 400 production lines, about **5,215-7,100 production lines** in total.

### Revision 2 changes (validator findings and owner decision)

| # | Finding | Fix | Where |
|---|---|---|---|
| F1 | The key cache shared an in-flight Promise across requests, which workerd forbids (cross-request I/O; same rule as `ProbeMemoCell`) | The cell holds plain data only: `Map<kid, CryptoKey>`, `fetchedAt`, `lastMissRefetchAt`. Single-flight is gone. The 30 s miss guard and at most one refetch per request bound amplification. The test becomes "sequential misses inside 30 s → one fetch". New verify item: a module-scope `CryptoKey` works across requests in workerd (fallback: cache JWK JSON and import per request) | AC3, 8, 13.3 |
| F2 | A malformed admin value took the whole Worker down (500 on public pages and `/status`) | New `readAdminConfig` (`src/platform/admin-env.ts`), separate from `readWorkerEnv`. It never fails: missing or malformed values deny `/admin` only and log variable names only. Empty copied values count as unset. The Worker-wide 500 stays only for the dev-bypass production rule. Revision 1's spec-alignment item "malformed → 500" is removed; the spec wins | AC5, AC6, 13.2 |
| W3 | Tooling gaps | `tsconfig.node.json` includes `workers/**/*.test.ts` (and `handle-request.ts` uses only types both projects have). The `unit` project excludes `**/*.r2.test.ts`. `MEDIA` is read outside every env schema, so `repo-hygiene.test.ts` needs no entry, and `.dev.vars.example` never lists `MEDIA=`. `adminEnvSchema` names join the hygiene check | AC4, AC5, AC8, 7 |
| W4 | Unmerged change-2 dependencies missing | B0a needs change-2 B2 (B2a, B2b: `site-content`, `createTestServices`). F0a, F0b and F1 need change-2 F0 and F1 (tokens, atoms). "Create" versus "Extend" corrected against today's `main` | 7, 10 |
| W5 | Journal order | The hygiene test also asserts that journal `when` values strictly increase | AC1 |
| W6 | Domain purity | `workshops/domain` declares its own `AssignmentModality` (no import from `teachers`). `AdminActor`, `MediaAsset` and `ImageUse` live in `application`. Schema files use relative imports only | AC1, AC10, 5 |
| W7 | Safari `toBlob("image/webp")` may silently return PNG | Check `blob.type`; fall back to JPEG | AC8 |
| W8 | Upload without `Content-Length` | 411 Length Required before parsing | AC8, 9 |
| W9 | Spec coverage | `listVisible` queries with `acceptsNewRequests`. Enabled materials must be active **and** available. `suggestedNext` defined (Córdoba boundary, D-A1). Sitemap test for `/admin`. The snapshot exposes teacher and percentage. New issue code `percentage-not-applicable`. Dev bypass is `localhost` only. `reactivateTurno` no longer returns `Invalid<"label">` | AC6, 4.3, 5, 8 |
| W10 | Critical path chained behind owner-gated slices | B2 split into B2a (no owner step) and B2b (R1). Only B1b and B2b wait for owner steps. Slices depend only on what they use (section 10.1) | 10 |
| W11 | Design-chosen product limits not marked | Listed as design assumptions D-A1 to D-A6 | 13.1 |
| Owner | "Recorte liviano" | No version check (last write wins); no turno reordering; "Materiales del mes" is a multi-select in the period form (F9 merged into F5); the cancellation deadline is policy text only | 0.2, 3, 5, 6, 10 |

---

## 0. Assumptions and scope adjustments

### 0.1 Orchestrator defaults (assumptions the owner can override, not owner decisions)

| # | Default (assumption) | Design impact | Where |
|---|---|---|---|
| OA1 | An archived workshop or intensivo can be restored and returns to `draft`. Teachers, suppliers, materials and turnos can be reactivated. | `restore` / `reactivate` use cases | 4.4, 5 |
| OA2 | "Abrir mes" creates the period as `draft`. The owner publishes it to `open`. It closes automatically when its month ends (Córdoba time). The owner may close it early. | **Derived** status, no cron | AC11, 4.3 |
| OA3 | Retiring the last active turno of a `published` workshop is refused. The owner pauses first. | Guard in `retireTurno` | 4.4 |
| OA4 | Archiving a teacher who is still assigned is allowed, with a warning. She is not offered for new assignments, and existing assignments and snapshots keep her. | Warning from `listAssignmentsOfTeacher` | AC12 |
| OA5 | Modality `propia` needs no percentage. `de terceros` requires a teacher and a percentage. (S6 still to confirm in change 7.) | The assignment rule reads the teacher's modality; the snapshot stores the modality | AC12, 3 |
| OA6 | One weekday per turno. | `weekday smallint` | 3 |
| OA7 | Percentage from 0 to 100 with at most 2 decimals. | Integer basis points | 3, 5.4 |
| OA8 | Technique and category are free text, with autocomplete. | Suggestion queries | 5 |
| OA9 | Up to 6 images per monthly project, workshop and intensivo. The first is the cover, and images can be reordered. | Image tables with `position` 0-5 | 3, AC8 |
| OA10 | No intensivo cancellation reason or notice (changes 5 and 6). | None | — |
| OA11 | Image limits are a design decision; JPEG, PNG and WebP only; verify iOS HEIC behavior. | Client resize plus a 5 MiB server limit (AC8); the HEIC check is assigned to F1 | AC8, 13.3 |

### 0.2 Owner scope decision "recorte liviano" (2026-10-07, scope adjustments)

| # | Adjustment | Replaces | Spec to amend |
|---|---|---|---|
| SA1 | **No optimistic version check.** Edits are last write wins, with "last changed by / at" visible. That is acceptable for 1-2 admins. | Revision 1 D-A2 (version columns, `stale-version`) | none (no spec required it) |
| SA2 | **No turno reordering.** Turnos display ordered by weekday, then start time. | `reorderTurnos`, `workshop_turno.position` | monthly-workshops "Turnos definition" (drop "sort position") |
| SA3 | **"Materiales del mes" is a multi-select inside the period form.** There is no separate screen; F9 is merged into F5. | Proposal F9, `setMaterials` | workshop-periods "Enabled materials" (no separate screen; the rules stay) |
| SA4 | **The intensivo cancellation deadline is policy text only**: no field and no validation. | `cancel_deadline_hours` | intensive-workshops "Policy fields" and "Intensive record" (drop the deadline and its scenario) |

Every other owner decision is kept: turnos, suppliers, the snapshot, the allowlist, and images on R2.

---

## 1. Technical Approach

| Concern | Approach | Spec |
|---|---|---|
| Modules | `admin-access`, `media`, `teachers`, `workshops` (monthly workshops, turnos, periods, intensivos), `materials` (materials, variants, suppliers); use-case services through `index.ts` | all |
| Identity | WebCrypto verification of `Cf-Access-Jwt-Assertion` against the team keys, then the allowlist (Worker secret); fail closed; admin config isolated from public pages | admin-access |
| Enforcement | Worker gate (composition) → admin layout middleware (delivery) → `requireAdminActor` in every use case | admin-access |
| CSRF | `Origin` equals the request origin **and** `Sec-Fetch-Site` is absent or `same-origin`, for every non-GET/HEAD admin request | admin-access |
| Persistence | Drizzle tables in `src/platform/db/schema/<module>.ts`; one generated forward-only migration per BACK slice (`0001`-`0009`) | catalog specs |
| Money and percent | `_shared` `Money` (centavos, `bigint` columns); percentage as integer basis points | monthly-workshops, intensive-workshops |
| Media | R2 binding `MEDIA` (optional at runtime); client resize and re-encode; server size, type and dimension checks; key `img/<uuid>.<ext>`; Worker route `/imagenes/<id>.<ext>` | media-storage |
| Admin UI | Full-page routes (no drawers); turnos as a sub-route; `ui/admin/**`; es-AR voseo microcopy | admin-shell |
| Delivery | Contract first (B0a, B0b); BACK merges first; no FRONT admin route merges before the Worker gate (B1b) | process |

**Spec alignment.** When a spec names an observable (label, status, issue code) differently, the spec wins and apply aligns the names. This design owns structure, layering, persistence, tooling and ownership. Section 13.2 lists the points where a spec must follow this design.

---

## 2. Architecture Decisions

### AC1. Drizzle tables live in `src/platform/db/schema/<module>.ts`

**Choice**:
- One file per module: `src/platform/db/schema/{media,teachers,workshops,materials}.ts`. `src/platform/db/schema.ts` remains the drizzle-kit entry and re-exports them, so `drizzle.config.ts` is unchanged.
- **Schema files use relative imports only** (`./teachers`), never `~/…`, because drizzle-kit loads them without the Vite alias. Cross-module foreign keys are plain Drizzle references inside `platform`.
- A module's Drizzle adapter imports **only its own schema file** (`~/platform/db/schema/<same module>`; the alias is fine in adapters). `tooling/architecture/schema-ownership.test.ts` (B2a) fails on any other `~/platform/db/schema` import from `src/modules/*/infrastructure/**`. Other modules' data is read through their APIs (`TeacherLookup`, `MediaLookup`, `MaterialLookup`), never by cross-module SQL joins.

**Migrations**:
- Generated by `pnpm db:generate --name <slug>`, producing `NNNN_<slug>.sql` and `drizzle/meta`. These are generated artifacts and are excluded from line counts.
- Planned names, numbered by merge order:

  | Migration | Slice |
  |---|---|
  | `0001_media_assets` | B2a |
  | `0002_teachers` | B3 |
  | `0003_monthly_workshops` | B4 |
  | `0004_workshop_turnos` | B5 |
  | `0005_workshop_periods` | B6 |
  | `0006_intensive_workshops` | B7 |
  | `0007_suppliers` | B8a |
  | `0008_materials` | B8b |
  | `0009_period_material_offers` | B9 |

- **Numbering follows merge order.** The single BACK writer generates after rebasing on `main`. If another migration merged first, it deletes its own unmerged SQL, snapshot and journal entry and regenerates. Unmerged migrations were never applied (CI migrates only from `main`). An applied migration is never edited.
- **Drift gate** (B2a, CI `verify`): `pnpm db:generate --name drift-check`, then `git status --porcelain -- drizzle` must be empty. No credentials are needed.
- **Journal hygiene** (`src/platform/db/migration-catalog.test.ts`, extended in B2a):
  - tags are contiguous `0000…N`;
  - each tag has `drizzle/<tag>.sql`;
  - names match `^\d{4}_[a-z0-9_]+$`;
  - **`when` values strictly increase**. drizzle's migrator skips any migration whose `when` is not greater than the last applied one, so a regenerated migration keeps a fresh, larger timestamp.

**Alternatives considered**:
- Tables in `src/modules/<m>/infrastructure/tables.ts`. Cross-module foreign keys would need cross-module infrastructure imports or hand-written FK SQL unknown to the drizzle-kit snapshot.
- No cross-module foreign keys. The DB constraint is the cheapest guarantee against dangling references.

**Rationale**: One database with one ordered migration history is a platform artifact. The dependency rule stays unchanged, and the fitness test keeps module boundaries at the query level.

### AC2. Access identity: verify the JWT with WebCrypto; no runtime identity, no JOSE package

**Choice**:
- The only evidence is the **`Cf-Access-Jwt-Assertion` header**. The `CF_Authorization` cookie and `Cf-Access-Authenticated-User-Email` are ignored, because a plain header is forgeable whenever Access is off.
- Every step is required, cheapest first (failures produce the reason codes in section 4.1):
  1. Three base64url segments, each at most 8 KiB; header and payload decode to JSON objects.
  2. Header: `alg === "RS256"` exactly; `kid` is a non-empty string.
  3. Claims, with time from the `Clock` port and **60 s skew**:
     - `iss === "https://<team domain>"`;
     - `aud` (string or array) contains the configured audience;
     - `now < exp + 60 s`;
     - `nbf`, if present: `now >= nbf - 60 s`;
     - `iat`, if present: not later than `now + 60 s`.
  4. Identity: a non-empty `email` and no `common_name` claim. Service tokens are never admins.
  5. Signature: `crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, ascii(header + "." + payload))`. RSA keys shorter than 2048 bits are rejected.
  6. Allowlist (AC5): `email.trim().toLowerCase()` must be in the configured set.
- **Packages**: none. `crypto.subtle`, `fetch`, `atob`, `TextEncoder` and `TextDecoder` are globals in workerd and Node 24, not imports, so `eslint.config.ts` is unchanged. Decoding and claim checks are pure (`admin-access/domain`); the WebCrypto and key adapter is `admin-access/infrastructure`.
- **Tests** generate RSA keys with `crypto.subtle.generateKey`, sign tokens with `crypto.subtle.sign` and serve keys through an injected `fetch` (`src/testing/access/access-tokens.ts`, B1a).

**Alternatives considered**:
- A runtime-provided Access identity: it could not be confirmed while designing. B1a records whether the generated runtime types expose one; it would only ever be a cross-check.
- `jose`: it adds a dependency and an allowlist change for about 40 lines of WebCrypto. Fallback: if B1a finds a workerd and Node WebCrypto incompatibility, it adds `jose` (exact pin, `infrastructure` policy only, ADR-0005) and stops for owner review.
- Trusting the email header: forgeable.

### AC3. Key cache: plain data per isolate, no shared Promise, rotation and fail closed

**Choice**:
- `AccessKeyCacheCell` in `IsolateState` holds **plain data only**: `{ keys: Map<string, CryptoKey>; fetchedAtMs: number | null; lastMissRefetchAtMs: number | null }`. **No Promise, stream or other I/O object is ever stored**: workerd forbids reusing I/O created by one request in another, and Node tests would not catch it (the same rule `ProbeMemoCell` documents).
- The `CryptoKey` values are produced by `crypto.subtle.importKey` inside the request that fetched them. If B1a's verify item shows a `CryptoKey` cannot be used by a later request in workerd, the cell stores the JWK JSON objects instead and imports per verification (sub-millisecond).
- Key source: `https://<team domain>/cdn-cgi/access/certs`. Only `kty: "RSA"` entries are used (and only `alg: "RS256"` and `use: "sig"` when present). At most 20 keys; the body may be at most 64 KiB; the timeout is 3 s (`AbortSignal.timeout`).
- Lookup:
  - **Hit** (kid cached, set at most 1 h old): verify with it.
  - **Stale set** (older than 1 h): refetch within this request, then look up.
  - **Miss**: refetch within this request only if `lastMissRefetchAtMs` is null or at least 30 s ago, and set it first. Otherwise deny `unknown-key` without fetching.
  - At most **one fetch per request**. No single-flight: concurrent requests in the same isolate may each fetch once at worst, but the 30 s miss guard means a stream of random kids triggers at most one fetch per 30 s per isolate.
  - **Fetch failure** (network, timeout, non-200, bad JSON, no usable key): deny `key-source`. A stale set is not used after 1 h.
  - **Unknown kid after a successful refetch**: deny `unknown-key`.
- **Rotation**: Cloudflare publishes the new key next to the old one, so a new kid triggers one refetch and then verifies.
- **Fail closed everywhere**: unconfigured or malformed config, an empty allowlist, a missing header, any decode, claim or signature failure, and any key failure all deny. The only path to `admin` without a verified signature is the dev identity (AC6), which is impossible in a production build.

**Alternatives considered**: single-flight through a shared Promise (forbidden by workerd); refetching on every miss (amplification); serving stale keys on fetch failure (availability over safety on an admin surface).

### AC4. Three enforcement layers; the gate re-dispatches denials

**Layer 1: Worker gate** (BACK, B1b):
- `workers/app.ts` stays the entry. The request logic moves to **`workers/handle-request.ts`**, which receives the React Router `handler` as a parameter. It uses only types available in both TypeScript projects: no `Env`, no `ExecutionContext`, and a structural `{ waitUntil(p: Promise<unknown>): void }`.
- **`tsconfig.node.json`** gains `"workers/**/*.test.ts"` in `include`; that project type-checks the test and the imported `handle-request.ts`. `tsconfig.cloudflare.json` already covers `workers/` and excludes tests.
- `vitest.config.ts`: the `unit` project includes `workers/**/*.test.ts`.
- `src/composition/admin-gate.ts` exports:
  - `isAdminPath(url)`: decode the pathname (a failed decode counts as admin: fail closed), collapse repeated `/`, lowercase, then `startsWith("/admin")`. This covers `/ADMIN`, `/%61dmin`, `//admin`, `/admin.data` and `/admin/x.data`.
  - `runAdminGate(request, adminConfig, isolate, deps)`, which returns `not-admin`, `denied` (with a render mode of `document` or `plain`) or `allowed`. It runs the CSRF rule (AC7) first for non-GET/HEAD requests, then `authorizeAdminRequest`.
  - `ADMIN_DENIED_PATH = "/sin-acceso"`.
- Public paths and `/status` never run verification and never read the admin config.
- Denials:
  - **`document`** (GET or HEAD, not `.data`, CSRF passed): the Worker calls `handler(new Request(new URL("/sin-acceso", request.url), { method: "GET", headers: request.headers }), context)` with `services.adminAccess = { kind: "denied", identityEmail }`, then copies the response with status 403. No admin loader or action runs.
  - **`plain`** (mutations, `.data` requests, CSRF failures): a `403` with `text/plain` "No tenés acceso al panel.".
- Every admin-path response passes through `withAdminHeaders` (`src/platform/admin-headers.ts`): `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow`, `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `Referrer-Policy: same-origin`.
- Denial log: `console.warn("admin access denied: <reason>")`. Config issues add `admin config invalid: <NAMES>`. Never an email, a token, a claim or a value.

**Layer 2: admin layout middleware** (FRONT, F0a): `routes/admin/layout.tsx` exports `middleware`, which runs before every loader **and action** of the subtree, for documents and `.data` requests alike. `requireAdmin` throws `data(null, { status: 403 })` unless `services.adminAccess.kind === "admin"`, and re-checks `isSameOriginMutation` for mutations.

**Layer 3: use cases** (BACK): every admin method takes `actor: AdminActor` first and calls `requireAdminActor` before any repository call. `null`, `undefined` or a malformed value yields `err({ kind: "denied" })`.

The actor travels in `AppServices.adminAccess`, so `src/app/context.ts` (FRONT) is untouched.

**Alternatives considered**: middleware only (a route without middleware would be exposed); passing denials to the router as a flag (loaders would still run); a static BACK-built denial page (markup and copy outside FRONT).

### AC5. Admin configuration: isolated parse, Worker secrets, fail closed for `/admin` only

**Choice**:
- New `src/platform/admin-env.ts` exports `adminEnvSchema` and **`readAdminConfig(env): AdminEnvConfig`**. It **never fails**. It is cached per `env` object (WeakMap, like `readWorkerEnv`) and called by the gate **only for admin paths**:

  ```ts
  export interface AdminEnvConfig {
    readonly access: { readonly teamDomain: string; readonly audience: string } | null;
    readonly adminEmails: readonly string[];        // valid entries, trimmed, lowercased, deduplicated
    readonly devAdminEmail: string | null;           // valid email or null; honored only per AC6
    readonly issues: readonly EnvIssue[];            // names only, e.g. { name: "ACCESS_AUD", reason: "invalid" }
  }
  ```

- **Empty values count as unset.** `""` and whitespace-only values are preprocessed to `undefined` (`.dev.vars.example` copies have empty values).

| Name | Valid shape | Missing or empty | Malformed |
|---|---|---|---|
| `ACCESS_TEAM_DOMAIN` | `^[a-z0-9-]+\.cloudflareaccess\.com$` | `access: null` → `/admin` denied (`config-missing`) | `access: null` plus issue → `/admin` denied (`config-invalid`), name logged |
| `ACCESS_AUD` | `^[0-9a-f]{64}$` | as above | as above |
| `ADMIN_EMAILS` | comma- or newline-separated emails | `[]` → `/admin` denied | **Invalid entries are dropped**; issue `ADMIN_EMAILS (invalid)` logged by name; valid entries still work. No valid entry → `/admin` denied (spec "contains no valid email") |
| `DEV_ADMIN_EMAIL` | `z.email()` | no bypass | `devAdminEmail: null` plus issue (dev only; production is AC6) |

- Public pages and `/status` never depend on these values (spec "Public routes MUST NOT depend on this configuration").
- **Transport: Worker secrets** set by the owner in the dashboard (Settings, Variables and Secrets, type **Secret**) or with `wrangler secret put`. They are not GitHub variables or secrets and not committed.
  - `wrangler deploy` keeps secrets and does not print them. `--var` values would appear in wrangler's bindings output, and therefore in CI logs.
  - Allowlist changes apply without a redeploy.
  - Missing values never fail the deploy.
  - Local values live in `.dev.vars`.
- `tooling/repo-hygiene.test.ts` (B1b) adds `adminEnvSchema.shape` keys to `schemaNames`, so `.dev.vars.example` must list `ACCESS_TEAM_DOMAIN=`, `ACCESS_AUD=`, `ADMIN_EMAILS=` and `DEV_ADMIN_EMAIL=` (names only).
- **Comparison**: both sides are `trim().toLowerCase()`, as whole strings.
- **Denial page email**: set only after a **verified** token (or the dev identity).

**Alternatives considered**: GitHub variables with `--var` (personal emails in logs); committed values (an agent writing owner data, AD6); validating in `workerEnvSchema` (revision 1; a typo took down public pages, contradicting the spec).

### AC6. Dev-only identity bypass: two conditions; the only Worker-wide 500

**Choice**:
- `workerEnvSchema` gains `DEV_ADMIN_EMAIL: z.preprocess(emptyToUndefined, z.string().optional())`, the presence only.
- `readWorkerEnv(env, { mode })` (`workers/app.ts` passes `import.meta.env.MODE`, statically replaced at build) adds one check. When `DEV_ADMIN_EMAIL` is present, both of these must hold, or the result is `err({ issues: [{ name: "DEV_ADMIN_EMAIL", reason: "invalid" }] })` and the Worker answers 500 everywhere (names-only log):
  - `mode === "development"`;
  - `SITE_URL` has protocol `http:` and hostname exactly `localhost` (not `127.0.0.1`; spec wording).
- This is the **only** admin-related variable that can take the Worker down, because a bypass configured in production is a deployment error that must be loud (spec "Production site URL rejects the bypass").
- When valid, `authorizeAdminRequest` uses `devAdminEmail` (from `readAdminConfig`) instead of JWT verification, **still applying the allowlist**.
- CI never defines the variable (AC9 test), and `wrangler.jsonc` never contains it (B1b test).

**Alternatives considered**: checking only `SITE_URL` or only the mode (either can be misconfigured alone); a separate dev flag (a third switch without added safety).

### AC7. CSRF: same-origin for every admin mutation

`isSameOriginMutation({ method, url, origin, secFetchSite })` (pure, `admin-access/domain`; used by layers 1 and 2):
- GET and HEAD pass.
- Any other method requires `Origin === new URL(url).origin`, and `Sec-Fetch-Site`, when present, equal to `same-origin`. A missing `Origin` is rejected.
- The request URL's own origin keeps the check correct on `workers.dev` and on the custom domain. No CSRF token is needed: the app has no session of its own.
- "No GET changes state" is enforced by FRONT route tests (GET loaders never call write methods).

**Alternatives considered**: synchronizer tokens (they need app sessions); `SameSite` alone (configured outside the app).

### AC8. Media: optional R2 binding, client resize, server checks, immutable serving

**Binding**:
- `wrangler.jsonc` gains `"r2_buckets": [{ "binding": "MEDIA", "bucket_name": "calma-inquieta-media" }]` (B2b; owner step R1 first).
- `MEDIA` is **not** in any env schema. `readMediaBinding(env): R2BucketLike | null` (`src/platform/r2.ts`, structural check for `put`, `get` and `delete`) returns `null` when missing. Then upload answers `storage-unavailable` and serving answers 404, and nothing else breaks (media-storage "Binding missing"). `repo-hygiene.test.ts` therefore needs no entry, and **`.dev.vars.example` never lists `MEDIA=`**: bindings come from `wrangler.jsonc`.
- Local `pnpm dev` uses the Cloudflare plugin's R2 simulation. `R2BucketLike` keeps Node-compiled code free of Workers runtime types.

**Client resize** (FRONT, F1):
- `createImageBitmap(file, { imageOrientation: "from-image" })` → canvas (`OffscreenCanvas` when available), long edge at most 2400 px → encode.
- **WebP is attempted first, and the result is accepted only if `blob.type === "image/webp"`.** Safari may silently return PNG, in which case the field re-encodes as **JPEG** at quality 0.85.
- This shrinks 4-12 MB phone photos to roughly 0.3-1 MB, applies orientation and **drops EXIF metadata, including GPS location**.
- iOS transcodes HEIC to JPEG for `accept="image/jpeg,image/png,image/webp"` (to verify, F1). If decoding fails, the field shows "Formato no admitido".

**Server rules** (B2a), in this order:
1. In the upload route (F1): **no `Content-Length` → 411 Length Required**; `Content-Length > MAX_UPLOAD_REQUEST_BYTES` (5 MiB + 64 KiB) → 413. Both happen before parsing. Browsers always send `Content-Length` for `FormData` bodies, so chunked bodies are refused instead of buffered.
2. In the use case: the file is non-empty and at most `MAX_IMAGE_BYTES = 5 MiB` (the single constant).
3. Magic bytes:
   - JPEG `FF D8 FF`;
   - PNG `89 50 4E 47 0D 0A 1A 0A`;
   - WebP `RIFF????WEBP`.
   Anything else (SVG, GIF, HEIC) is rejected whatever its name or declared type.
4. Width and height parsed from the header bytes (PNG IHDR; JPEG SOF0-SOF3; WebP `VP8 `, `VP8L`, `VP8X`), each from 1 to 10000.

**Keys and metadata**: `id = crypto.randomUUID()`; key `img/<id>.<ext>`; the file name is never used.
- `put` runs first, then the metadata insert. A put failure leaves no row.
- An insert failure triggers a best-effort `delete`; anything left is unreferenced.

**Serving** (`/imagenes/:file`, FRONT route over `services.media.serve`):
- The regex `^[0-9a-f-]{36}\.(jpg|png|webp)$` is checked first, otherwise 404.
- R2 is read first. On a miss, the metadata row is looked up only to log `media object missing: <id>`, and the answer is 404.
- Headers: `Content-Type` from the extension allowlist, `Cache-Control: public, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`, `ETag`. A 404 has an empty body and `no-store`. No actor is needed.
- There is no deletion in v1. Referenced assets are protected by `RESTRICT`.

**Upload UX**: the field posts to `POST /admin/imagenes` through a fetcher and receives `{ id, src, width, height }`. Entity forms post only `{ assetId, alt }` lists.

**Tests**:
- The `ImageStorage` contract suite runs against the fake (unit) and against R2 on wrangler's local simulation through `getPlatformProxy()` (`r2-image-storage.r2.test.ts`).
- `vitest.config.ts` (B2b): the **`unit` project excludes `**/*.r2.test.ts`**, and the `db` project includes `src/**/*.r2.test.ts`.
- Fallback if `getPlatformProxy` is unusable under Vitest: a structural fake bucket, with the reason recorded.

**Alternative rejected**: a larger server limit storing originals. Heavy public images, with no image transformations available, and GPS EXIF published.

### AC9. CI: service-token smoke, `/admin` denial smoke, deploy gate, R2 permission

(B1b) Two new GitHub secrets: `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`. The deploy gate lists seven names, in this order: `CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID HYPERDRIVE_ID MIGRATION_DATABASE_URL STATUS_URL CF_ACCESS_CLIENT_ID CF_ACCESS_CLIENT_SECRET`. The smoke step:

```yaml
- name: Smoke check the deployed status page through Access
  if: steps.deploy-gate.outputs.ready == 'true'
  env:
    STATUS_URL: ${{ secrets.STATUS_URL }}
    CF_ACCESS_CLIENT_ID: ${{ secrets.CF_ACCESS_CLIENT_ID }}
    CF_ACCESS_CLIENT_SECRET: ${{ secrets.CF_ACCESS_CLIENT_SECRET }}
  run: |
    body=$(curl -fsS --retry 3 --retry-delay 5 --retry-all-errors \
      -H "CF-Access-Client-Id: ${CF_ACCESS_CLIENT_ID}" \
      -H "CF-Access-Client-Secret: ${CF_ACCESS_CLIENT_SECRET}" \
      "$STATUS_URL")
    grep -q 'data-status="ok"' <<< "$body"
    code=$(curl -sS -o /dev/null -w '%{http_code}' \
      -H "CF-Access-Client-Id: ${CF_ACCESS_CLIENT_ID}" \
      -H "CF-Access-Client-Secret: ${CF_ACCESS_CLIENT_SECRET}" \
      "${STATUS_URL%/status}/admin")
    if [ "$code" != "403" ]; then
      echo "::error::smoke: /admin must deny the CI service token"
      exit 1
    fi
```

- A login redirect is not followed (no `-L`), so the body is empty and the `grep` fails the job.
- `/admin` answers 403 to a service token whatever the admin config state.

Workflow tests:
- the seven-name gate;
- the smoke env holds both secrets, and the headers are present;
- no `echo` of `CF_ACCESS_*`, no `set -x`, no `-v`, `--verbose`, `--trace` or `-L`;
- the `/admin` 403 check;
- `DEV_ADMIN_EMAIL`, `ADMIN_EMAILS`, `ACCESS_AUD` and `ACCESS_TEAM_DOMAIN` are absent from `ci.yml` (plus a planted-string test);
- `DEV_ADMIN_EMAIL` is absent from `wrangler.jsonc`;
- (B2a) the drift step is present.

**R2 permission**: the C3 token stays at three permissions. If the B2b deploy fails with an R2 authorization error, the owner adds Account / Workers R2 Storage / **Read**, then **Edit** if still needed (runbook R1).

### AC10. Module layout, layer placement and error shape

- **Modules and dependencies** (application through module APIs only; no cycles):

  | Module | Depends on |
  |---|---|
  | `admin-access` | none |
  | `media` | `admin-access` |
  | `teachers` | `admin-access` |
  | `materials` | `admin-access`, `media` |
  | `workshops` | `admin-access`, `teachers`, `materials`, `media` |

- **One `workshops` module** with three services (monthly workshops, periods, intensivos). They share the assignment, gallery, slug and lifecycle code; splitting would duplicate it or force a third module.
- **Layer placement**:
  - Read models and values crossing modules live in **`application`**: `AdminActor` (`admin-access/application/admin-actor.ts`), `MediaAsset` and `ImageUse` (`media/application/read-models.ts`), and every service read model.
  - Domain files stay module-local: `workshops/domain` uses `GalleryEntry { assetId; alt }` and declares **its own** `AssignmentModality = "own" | "third_party"`. The application maps `Teacher.modality` from `TeacherLookup` into it; no domain imports another module.
  - `_shared` gains only generic error kinds.
- **Inputs are form-shaped drafts** (strings, booleans, arrays). The application validates them and returns `Invalid<Field>` with **issue codes**; FRONT maps codes to es-AR copy.
- **Outputs are read models** (`Money`, `Percentage`, `ImageUse`). Loaders map them to plain props.
- **Errors**: `Promise<Result<T, E>>` with shared kinds (`Denied`, `Unavailable`, `NotFound`, `Invalid`, `TransitionRefused`, `RulesUnmet`). Infrastructure failures throw and reach the admin error boundary.
- **Concurrency (SA1)**: last write wins. Every aggregate keeps `updated_by` and `updated_at` (and `opened_by` and `opened_at` on periods), shown in forms ("Último cambio: …"). There are no version columns.

### AC11. Period status is derived; no cron

- The stored status is `draft`, `open` or `closed`. The effective status is `effectivePeriodStatus(stored, periodKey, now)`: it is `closed` when the stored value is `closed`, or when it is `open` and `cordobaMonthOf(now) > periodKey`; otherwise it is the stored value. Every read model and rule uses it.
- `cordobaMonthOf` uses `Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Cordoba", year: "numeric", month: "2-digit" })`. It is tested at 2026-11-01T01:30Z and 02:59Z (October) and 03:00Z (November).
- Transitions: `draft → open` (refused after the month ended), `open → closed` (early close). `closed` is terminal.
- **Rejected**: a Cron Trigger (a second runtime entry and a staleness window); writing on read (a GET would change state).

### AC12. Teacher assignment and modality

- `TeacherAssignment = { teacherId, percentage: Percentage | null }`. It may be null for drafts. DB check: a percentage requires a teacher.
- Rules against the teacher's **current** modality (via `TeacherLookup`), checked on save, publish and "Abrir mes":
  - `third_party` requires a percentage (`required`);
  - `own` with a percentage submitted → issue **`percentage-not-applicable`**;
  - the teacher must be active when assigned (`not-selectable`).
- The snapshot stores the teacher id, the modality and the percentage. The read model exposes **`snapshot.teacher` (id, name, active) and `snapshot.percentage`**.
- Archiving an assigned teacher is allowed. FRONT renders the warning from `monthlyWorkshops.listAssignmentsOfTeacher`.
- **S2 isolation**: the assignment is one value object over two columns, so moving it to the turno is a local change.

### AC13. Fail-closed placeholders until each adapter lands

- `createUnavailableService<T>()` (`src/composition/unavailable-service.ts`) is a `Proxy` whose methods resolve `err({ kind: "unavailable" })` (and whose `then` is `undefined`).
- Routes map `unavailable` to **503 "en construcción"**; `media.serve` maps it to 404.

### AC14. Admin routes: full pages, turnos as a sub-route

- Full pages, usable at 360 px. No drawers; the deviation is recorded in F0a.
- Turnos are the sub-route `/admin/talleres/:id/turnos`.
- "Materiales del mes" is a multi-select field inside the period form (SA3).

**Alternatives considered**: drawers (focus, deep links and back-button handling on phones); turnos inside the workshop form (one action handling two intents and a larger F3).

### AC15. Ownership seams (DS13 style)

**BACK (Claude Code)** owns DS13's list plus:
- `src/platform/db/schema/**`, `src/platform/{admin-env,admin-headers,r2}.ts`, `drizzle/**`;
- `workers/**`;
- `src/composition/{admin-gate,unavailable-service}.ts`;
- `src/testing/{access,contracts,fakes}/**`;
- `tsconfig.node.json`;
- `docs/adr/0005-admin-access-and-media.md`, `docs/runbooks/**`.

**FRONT (pi)** owns:
- `src/app/**` (`routes/admin/**`, `routes/admin-denied.tsx`, `routes/media-file.ts`, `ui/admin/**`, `src/app/admin/**`);
- the carve-outs `src/testing/fixtures/**` and `docs/design/**`.

**Seams**:
1. `ADMIN_DENIED_PATH` (BACK constant) must equal FRONT's `route("sin-acceso", …)`; a FRONT test in F0a asserts it. Between B1b and F0a, a denied document request gets 403 with the public 404 body; no admin route exists yet.
2. BACK-authored user-visible strings are exactly two: the plain denial text and `DEFAULT_VARIANT_LABEL = "Única"`. Both pass `findCopyViolations` in B1b and B8b.
3. FRONT fixtures may import BACK builders and fakes. BACK never edits `src/testing/fixtures/**`.
4. There is no `src/app` carve-out for BACK: the actor travels in `AppServices`.

**Merge discipline**: BACK merges first. **No FRONT slice with an admin route merges before B1b.** F0b (pure `ui/admin` atoms) may merge after B0a. FRONT rebases on `origin/main` before each slice.

---

## 3. Data model (`src/platform/db/schema/*.ts`)

Conventions:
- Primary keys are `uuid DEFAULT gen_random_uuid()`, except `media_asset.id`, which the app sets.
- Money is `bigint` centavos (`mode: "number"`) mapped by `Money.fromCentavos`. Inputs are whole pesos.
- Percentages are `integer` basis points.
- Statuses are `text` with `CHECK … IN (…)`.
- Instants are `timestamptz`; Córdoba wall-clock values are `date` and `time`.
- Text lengths are enforced in the domain (5.7).
- Every aggregate has `updated_by text NOT NULL` and `updated_at timestamptz NOT NULL`. There are no version columns (SA1).

| Table (migration) | Columns | Constraints and indexes |
|---|---|---|
| `media_asset` (0001) | `id uuid PK`, `storage_key`, `content_type`, `byte_size integer`, `width integer`, `height integer`, `created_by`, `created_at` | `UNIQUE(storage_key)`; content type in the three types; `byte_size BETWEEN 1 AND 5242880`; `width`, `height BETWEEN 1 AND 10000` |
| `teacher` (0002) | `id`, `name`, `bio_line`, `phone NULL`, `email NULL`, `modality`, `active DEFAULT true`, `updated_by`, `updated_at` | `modality IN ('own','third_party')`; `UNIQUE INDEX ON (lower(name)) WHERE active` |
| `monthly_workshop` (0003) | `id`, `slug`, `name`, `summary`, `description`, `technique`, `default_fee_centavos bigint`, `teacher_id NULL → teacher RESTRICT`, `agreed_percentage_bp NULL`, `status DEFAULT 'draft'`, `updated_by`, `updated_at` | `UNIQUE(slug)` (archived included); slug `^[a-z0-9]+(-[a-z0-9]+)*$`; fee `> 0`; `agreed_percentage_bp BETWEEN 0 AND 10000`; `agreed_percentage_bp IS NULL OR teacher_id IS NOT NULL`; status in four values; index `(teacher_id)`, `(status)` |
| `workshop_image` (0003) | `workshop_id → monthly_workshop CASCADE`, `media_asset_id → media_asset RESTRICT`, `alt`, `position smallint` | `PK(workshop_id, position)`; `position BETWEEN 0 AND 5` (0 = cover); non-blank `alt` |
| `workshop_turno` (0004) | `id`, `workshop_id → monthly_workshop CASCADE`, `label`, `weekday smallint`, `starts_at time`, `ends_at time`, `default_capacity integer`, `active DEFAULT true` | `UNIQUE(workshop_id, id)`; `UNIQUE INDEX ON (workshop_id, lower(label))` (retired included); `weekday BETWEEN 1 AND 7` (ISO); `ends_at > starts_at`; `default_capacity BETWEEN 1 AND 500`. Display order: weekday, then `starts_at` (SA2) |
| `workshop_period` (0005) | `id`, `workshop_id → monthly_workshop RESTRICT`, `period char(7)`, `fee_centavos`, `materials_required boolean`, `project_title NULL`, `project_description NULL`, `snapshot_teacher_id → teacher RESTRICT`, `snapshot_teacher_modality`, `snapshot_percentage_bp NULL`, `status DEFAULT 'draft'`, `opened_by`, `opened_at`, `updated_by`, `updated_at` | `UNIQUE(workshop_id, period)`; `UNIQUE(workshop_id, id)`; `period ~ '^[0-9]{4}-(0[1-9]\|1[0-2])$'`; fee `> 0`; status in three values; `(snapshot_teacher_modality = 'third_party') = (snapshot_percentage_bp IS NOT NULL)`; percentage range |
| `period_turno` (0005) | `period_id`, `turno_id`, `workshop_id`, `capacity` | `PK(period_id, turno_id)`; `FK (workshop_id, period_id) → workshop_period(workshop_id, id) CASCADE`; `FK (workshop_id, turno_id) → workshop_turno(workshop_id, id) RESTRICT` (same-workshop rule in the DB; a used turno cannot be deleted); `capacity BETWEEN 1 AND 500`. Change 5 adds `confirmed_seats` |
| `period_project_image` (0005) | `period_id → workshop_period CASCADE`, `media_asset_id RESTRICT`, `alt`, `position` | as `workshop_image` |
| `intensive_workshop` (0006) | `id`, `slug`, `name`, `summary`, `description`, `teacher_id NULL`, `agreed_percentage_bp NULL`, `event_date date`, `starts_at time`, `ends_at time`, `price_centavos`, `deposit_centavos`, `capacity`, `min_seats`, `policy_text`, `materials_included boolean`, `status`, `updated_by`, `updated_at` | `UNIQUE(slug)`; slug format; `ends_at > starts_at`; `price > 0`; `deposit > 0 AND deposit <= price`; `capacity BETWEEN 1 AND 500`; `min_seats BETWEEN 1 AND capacity`; percentage rules as for monthly workshops; status in five values. **No cancellation-deadline column** (SA4) |
| `intensive_image` (0006) | as `workshop_image`, keyed by `intensive_id` | same |
| `supplier` (0007) | `id`, `name`, `phone NULL`, `email NULL`, `notes NULL`, `active`, `updated_by`, `updated_at` | `UNIQUE INDEX ON (lower(name)) WHERE active` |
| `material` (0008) | `id`, `name`, `description`, `category`, `supplier_id → supplier RESTRICT`, `image_asset_id NULL → media_asset RESTRICT`, `image_alt NULL`, `available`, `active`, `updated_by`, `updated_at` | `(image_asset_id IS NULL) = (image_alt IS NULL)`; `UNIQUE INDEX ON (lower(name)) WHERE active`; index `(supplier_id)`, `(lower(category))` |
| `material_variant` (0008) | `id`, `material_id → material CASCADE`, `label`, `price_centavos`, `swatch NULL`, `available`, `position` | `UNIQUE INDEX ON (material_id, lower(label))`; `price > 0`; `swatch ~ '^#[0-9a-f]{6}$'`. At least one variant is an application rule (one transaction) |
| `period_material_offer` (0009) | `period_id → workshop_period CASCADE`, `material_id → material RESTRICT`, `position` | `PK(period_id, material_id)`; `UNIQUE(period_id, position)`; index `(material_id)` |

Notes:
- **Gallery and offer writes replace the whole list in one transaction.** Reordering is one save; the cover is position 0.
- **Deletion**:
  - a draft workshop without periods deletes with its turnos and images;
  - periods block that through `RESTRICT`;
  - a used turno is protected by the composite foreign key.
  The application checks first, to return clean errors.
- **Variants** are never referenced in this change (`used` is `false` until change 5), so removing one deletes it when at least one other remains.
- **Grants**: new tables inherit the runbook N2 default privileges for `calma_app`.

---

## 4. Flows

### 4.1 Admin request (layers 1-3)

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser
  participant A as Cloudflare Access
  participant W as workers/handle-request.ts
  participant G as composition/admin-gate
  participant V as admin-access (authorize + WebCrypto verifier)
  participant K as Team keys (certs)
  participant RR as React Router (admin middleware)
  participant U as Use case (e.g. teachers.list)
  B->>A: GET /admin/profesores (Access cookie)
  A->>W: request + Cf-Access-Jwt-Assertion
  W->>W: readWorkerEnv(env, { mode }) (500 only for the dev-bypass rule or core vars)
  W->>G: isAdminPath? yes → readAdminConfig(env) (never fails; issues logged by name)
  G->>G: non-GET/HEAD → isSameOriginMutation, else deny "plain"
  G->>V: authorize({ assertion })
  V->>V: config present? decode, RS256, kid, iss, aud, exp/nbf/iat (Clock, 60 s), email, no common_name
  opt kid not cached, or set older than 1 h (at most one fetch per request; miss refetch at most every 30 s)
    V->>K: fetch certs (3 s timeout) → importKey → plain cell update
  end
  V->>V: crypto.subtle.verify, then allowlist
  V-->>G: admin(actor) or denied(reason)
  alt denied
    W->>W: console.warn("admin access denied: <reason>")
    W->>RR: GET /sin-acceso with adminAccess = denied(identityEmail)
    W-->>B: 403 + admin headers (no admin loader ran)
  else admin
    W->>RR: handler(request, services{ adminAccess = admin(actor) })
    RR->>RR: requireAdmin middleware (403 if not admin; same-origin re-check)
    RR->>U: teachers.list(actor, "active")
    U->>U: requireAdminActor
    W-->>B: 200 + admin headers
  end
```

Denial reasons (logs only): `config-missing`, `config-invalid`, `token-missing`, `token-malformed`, `algorithm`, `issuer`, `audience`, `expired`, `not-yet-valid`, `no-email`, `service-token`, `unknown-key`, `key-source`, `signature`, `not-allowlisted`, `cross-origin`.

### 4.2 Image upload and serving

```mermaid
sequenceDiagram
  autonumber
  participant F as Image field (browser, F1)
  participant R as POST /admin/imagenes (FRONT route)
  participant M as media.upload
  participant S as ImageStorage (R2)
  participant D as MediaAssetRepository
  F->>F: createImageBitmap (orientation) → scale to 2400 px → toBlob WebP; blob.type check → else JPEG 0.85
  F->>R: multipart "imagen" (same-origin; gate passed)
  R->>R: no Content-Length → 411; over 5 MiB + 64 KiB → 413 (before parsing)
  R->>M: upload(actor, { bytes })
  M->>M: requireAdminActor; non-empty; <= 5 MiB; magic bytes; width and height
  M->>S: put("img/<uuid>.<ext>")
  alt binding missing or put fails
    M-->>R: err(storage-unavailable) (no row)
  else
    M->>D: insert media_asset
    alt insert fails
      M->>S: delete (best effort)
      M-->>R: throws → admin error state
    else
      M-->>R: ok({ id, src, width, height })
    end
  end
```

Serving: regex → `media.serve(file)` → `ImageStorage.get`. A hit streams with immutable headers. A miss looks up metadata to log, then answers 404 with an empty body.

### 4.3 "Abrir mes" and the suggested month

**Rules** (workshop-periods spec, OA2, OA5, D-A1):
1. `requireAdminActor`.
2. `parsePeriodKey`. Then **D-A1**: the key must be at least `cordobaMonthOf(now)` and at most 12 months after it, otherwise `Invalid<"period">` `out-of-range`.
3. The workshop must exist and be `published` or `paused`.
4. Collect every unmet rule into `RulesUnmet<OpenMonthRule>`:
   - `workshop-status`;
   - `teacher` (assignment present, teacher active);
   - `percentage` (present iff `third_party`);
   - `active-turno`.
5. `(workshop, period)` already exists → `{ kind: "period-exists", periodId }`.
6. The source is the **latest earlier period** (July and September with no August → September).
7. Build the draft:
   - `fee` = source fee, or the workshop default;
   - `materialsRequired` = source value, or `false`;
   - `project` = source title, description and images (same assets, alts, order), or empty;
   - **turnos**: every active turno (weekday, then start order), with the source capacity for that turno id or its default capacity; retired turnos are left out;
   - **materials** (B9) = source ids filtered through `MaterialLookup` to materials that are **active and available**, order kept;
   - **snapshot** = the current assignment (teacher, modality, percentage), never the source;
   - `status: "draft"`; `openedBy` and `updatedBy` = the actor; times from the `Clock`.
8. `periods.insert` in **one transaction**. A concurrent duplicate becomes `period-exists`; any failure rolls back everything.
9. FRONT redirects to the period page. Edits go through `update` while the effective status is not `closed`, and `publish` moves `draft → open`.

**`suggestedNext`** (returned by `workshopPeriods.list`):
- `current = cordobaMonthOf(clock.now())`. At 2026-11-01T01:30Z this is `2026-10`.
- `candidate = latest existing period + 1 month`, or `current` when the workshop has no periods.
- `suggestedNext = max(candidate, current)`.
- When `suggestedNext` is more than 12 months after `current` (D-A1), it is `null` and FRONT hides "Abrir mes" with an explanation.

```mermaid
sequenceDiagram
  autonumber
  participant P as Route /admin/talleres/:id/periodos (action)
  participant O as workshopPeriods.openMonth
  participant MW as MonthlyWorkshopRepository
  participant T as TeacherLookup
  participant PR as WorkshopPeriodRepository
  participant ML as MaterialLookup
  participant C as Clock
  P->>O: openMonth(actor, workshopId, "2026-11")
  O->>O: requireAdminActor; parsePeriodKey
  O->>C: now() → cordobaMonthOf (D-A1 range)
  O->>MW: get(workshopId) with turnos and assignment
  O->>T: findByIds([teacherId]) → active? modality?
  O->>O: collect unmet rules
  O->>PR: exists? latestBefore(workshopId, "2026-11")
  opt source has materials (B9)
    O->>ML: findByIds → keep active and available
  end
  O->>O: build draft (fee, flag, project, capacities, snapshot from current assignment)
  O->>PR: insert(draft) in one transaction
  O-->>P: ok(period draft) | period-exists | rules-unmet
```

### 4.4 Lifecycle transitions (domain, table-driven tests)

| Aggregate | Allowed transitions | Guard |
|---|---|---|
| Monthly workshop | `draft→published`, `published→paused`, `paused→published`, `{draft,published,paused}→archived`, `archived→draft` | Publish rules (name, slug, `teacher`, `percentage`, `default-fee`, `active-turno`; all unmet rules listed). Delete only when `draft` and without periods |
| Turno | `active→retired`, `retired→active` | Retire refused when it is the last active turno of a `published` workshop (OA3). Delete only when unused |
| Period | `draft→open` (refused after the month ended), `open→closed`; derived close | Edits refused when the effective status is `closed`. Delete only when `draft` |
| Intensivo | `draft→published`, `published↔paused`, `{published,paused}→cancelled`, `{draft,published,paused,cancelled}→archived`, `archived→draft` | Publish rules (teacher, percentage, date-range, price, deposit, capacity, min-seats). Reschedule requires a future start when `published` or `paused`. Delete only when `draft` |
| Teacher, supplier, material | `active↔inactive` | Reactivation re-checks name uniqueness |

**Visibility**: the pure `isVisibleStatus(s)` (`published`, `paused`) and `acceptsNewRequests(s)` (`published` only). They are used by:
- the admin queries **`monthlyWorkshops.listVisible(actor)`** and **`intensives.listVisible(actor)`**, which return the visible records (draft, cancelled and archived excluded) with an `acceptsNewRequests` flag. This satisfies the "visible-activities query" scenarios;
- change 4, which adds the public reader over the same functions.

---

## 5. Contracts (B0a, B0b): module APIs, ports, actor, fakes

### 5.1 Shared kernel additions (B0a, `src/modules/_shared/use-case-errors.ts`)

```ts
export type Denied = { readonly kind: "denied" };
export type Unavailable = { readonly kind: "unavailable" };
export type NotFound = { readonly kind: "not-found" };
export type IssueCode =
  | "required" | "too-long" | "invalid-format" | "out-of-range" | "too-many-decimals" | "not-whole-pesos"
  | "duplicate" | "not-selectable" | "unknown-reference" | "too-many" | "confirmation-required" | "in-past"
  | "end-before-start" | "exceeds-price" | "exceeds-capacity" | "percentage-not-applicable";
export interface FieldIssue<F extends string> { readonly field: F; readonly code: IssueCode }
export interface Invalid<F extends string> { readonly kind: "invalid"; readonly issues: readonly FieldIssue<F>[] }
export interface TransitionRefused<S extends string> { readonly kind: "transition-refused"; readonly from: S; readonly to: S }
export interface RulesUnmet<R extends string> { readonly kind: "rules-unmet"; readonly rules: readonly R[] }
export type AdminFailure = Denied | Unavailable;
export interface Audit { readonly updatedBy: string; readonly updatedAt: Date }
export function parseWholePesos(text: string): Result<Money, "required" | "invalid-format" | "not-whole-pesos" | "out-of-range">;
```

### 5.2 `admin-access` (`index.ts`)

```ts
// B0a (application/admin-actor.ts)
export interface AdminActor { readonly kind: "admin-actor"; readonly email: string }
export type AdminAccessState =
  | { readonly kind: "admin"; readonly actor: AdminActor }
  | { readonly kind: "denied"; readonly identityEmail: string | null }
  | { readonly kind: "not-evaluated" };
export function requireAdminActor(actor: AdminActor | null | undefined): Result<AdminActor, Denied>;

// B1a
export interface AdminAccessConfig {
  readonly access: { readonly teamDomain: string; readonly audience: string } | null;
  readonly adminEmails: readonly string[];
  readonly devAdminEmail: string | null;   // non-null only when readWorkerEnv accepted it (AC6)
  readonly hasIssues: boolean;             // malformed values present → reason "config-invalid"
}
export type AdminDecision =
  | { readonly kind: "admin"; readonly actor: AdminActor }
  | { readonly kind: "denied"; readonly reason: DenialReason; readonly identityEmail: string | null };
export interface DecodedAccessToken {
  readonly header: { readonly alg: string; readonly kid: string };
  readonly claims: Readonly<Record<string, unknown>>;
  readonly signingInput: Uint8Array; readonly signature: Uint8Array;
}
export interface AccessSignatureVerifier {           // port; never throws
  verify(token: DecodedAccessToken): Promise<"valid" | "invalid" | "unknown-key" | "key-source">;
}
export function createAuthorizeAdminRequest(deps: { config: AdminAccessConfig; signatures: AccessSignatureVerifier; clock: Clock }):
  (evidence: { readonly assertion: string | null }) => Promise<AdminDecision>;
export function decodeAccessToken(raw: string): Result<DecodedAccessToken, "token-malformed" | "algorithm">;
export function isSameOriginMutation(i: { method: string; url: string; origin: string | null; secFetchSite: string | null }): boolean;
export interface AccessKeyCacheCell {                 // plain data only (AC3)
  keys: Map<string, CryptoKey>; fetchedAtMs: number | null; lastMissRefetchAtMs: number | null;
}
export function createAccessKeyCacheCell(): AccessKeyCacheCell;
```

Infrastructure: `createWebCryptoAccessVerifier({ teamDomain, fetch, clock, cell })`.

### 5.3 `media` and `teachers`

```ts
// media/index.ts (B0a contract; B2a implementation; B2b R2 adapter)
export const MAX_IMAGE_BYTES: number;            // 5 MiB (D-A4)
export const MAX_UPLOAD_REQUEST_BYTES: number;   // + 64 KiB
export const MAX_GALLERY_IMAGES = 6;
export type ImageContentType = "image/jpeg" | "image/png" | "image/webp";
export interface MediaAsset {                     // application/read-models.ts
  readonly id: string; readonly fileName: string; readonly src: string; readonly contentType: ImageContentType;
  readonly byteSize: number; readonly width: number; readonly height: number; readonly createdBy: string; readonly createdAt: Date;
}
export interface ImageUse { readonly assetId: string; readonly alt: string; readonly asset: MediaAsset | null } // null → "sin imagen"
export interface ImageUseDraft { readonly assetId: string; readonly alt: string }
export type UploadError = AdminFailure | { kind: "empty" } | { kind: "too-large"; limitBytes: number }
  | { kind: "unsupported-type" } | { kind: "unreadable-dimensions" } | { kind: "storage-unavailable" };
export interface ServedImage { readonly body: ReadableStream<Uint8Array>; readonly contentType: ImageContentType; readonly byteSize: number; readonly etag: string }
export interface MediaService {
  upload(actor: AdminActor, file: { readonly bytes: Uint8Array }): Promise<Result<MediaAsset, UploadError>>;
  serve(fileName: string): Promise<Result<ServedImage, NotFound | Unavailable>>;   // public
}
export interface MediaLookup { findAssets(ids: readonly string[]): Promise<ReadonlyMap<string, MediaAsset>> }
export function validateGallery(drafts: readonly ImageUseDraft[], known: ReadonlyMap<string, MediaAsset>):
  Result<readonly ImageUseDraft[], readonly FieldIssue<"images">[]>;   // ≤ 6, alt, known ids, no duplicates
// Ports: ImageStorage { put; get; delete }, MediaAssetRepository { insert; findByIds }

// teachers/index.ts (B0a contract; B3 implementation)
export type TeacherModality = "own" | "third_party";
export interface Teacher {
  readonly id: string; readonly name: string; readonly bioLine: string; readonly phone: string | null; readonly email: string | null;
  readonly modality: TeacherModality; readonly active: boolean; readonly audit: Audit;
}
export interface TeacherDraft { readonly name: string; readonly bioLine: string; readonly phone: string; readonly email: string; readonly modality: string }
export type TeacherField = "name" | "bioLine" | "phone" | "email" | "modality";
export interface TeachersService {
  list(actor: AdminActor, filter: "active" | "archived" | "all"): Promise<Result<readonly Teacher[], AdminFailure>>;
  get(actor: AdminActor, id: string): Promise<Result<Teacher, AdminFailure | NotFound>>;
  create(actor: AdminActor, d: TeacherDraft): Promise<Result<Teacher, AdminFailure | Invalid<TeacherField>>>;
  update(actor: AdminActor, id: string, d: TeacherDraft): Promise<Result<Teacher, AdminFailure | NotFound | Invalid<TeacherField>>>;
  archive(actor: AdminActor, id: string): Promise<Result<Teacher, AdminFailure | NotFound>>;
  reactivate(actor: AdminActor, id: string): Promise<Result<Teacher, AdminFailure | NotFound | Invalid<"name">>>;
}
export interface TeacherLookup { findByIds(ids: readonly string[]): Promise<ReadonlyMap<string, Teacher>> }
```

### 5.4 `workshops` (B0b contract; B4-B7 and B9 implementations)

```ts
export interface Percentage { readonly basisPoints: number }
export function parsePercentage(text: string): Result<Percentage, "required" | "invalid-format" | "out-of-range" | "too-many-decimals">;
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type LocalTime = string;                         // "HH:MM"
export type PeriodKey = string;                         // "YYYY-MM"
export function parsePeriodKey(text: string): Result<PeriodKey, "invalid-format">;
export function cordobaMonthOf(instant: Date): PeriodKey;
export function slugify(name: string): string;
export type WorkshopStatus = "draft" | "published" | "paused" | "archived";
export type IntensiveStatus = "draft" | "published" | "paused" | "cancelled" | "archived";
export function isVisibleStatus(s: WorkshopStatus | IntensiveStatus): boolean;
export function acceptsNewRequests(s: WorkshopStatus | IntensiveStatus): boolean;
export interface TeacherRef { readonly id: string; readonly name: string; readonly active: boolean }
export interface TeacherAssignment { readonly teacher: TeacherRef; readonly percentage: Percentage | null }

export interface Turno {
  readonly id: string; readonly label: string; readonly weekday: Weekday; readonly startsAt: LocalTime; readonly endsAt: LocalTime;
  readonly defaultCapacity: number; readonly active: boolean; readonly usedByPeriods: boolean;
}  // ordered by weekday, then startsAt (SA2)
export interface MonthlyWorkshop {
  readonly id: string; readonly slug: string; readonly name: string; readonly summary: string; readonly description: string;
  readonly technique: string; readonly defaultFee: Money; readonly assignment: TeacherAssignment | null;
  readonly images: readonly ImageUse[]; readonly status: WorkshopStatus; readonly turnos: readonly Turno[]; readonly audit: Audit;
}
export interface MonthlyWorkshopSummary {
  readonly id: string; readonly name: string; readonly teacherName: string | null; readonly status: WorkshopStatus;
  readonly activeTurnos: number; readonly acceptsNewRequests: boolean;
}
export interface MonthlyWorkshopDraft {
  readonly name: string; readonly slug: string; readonly summary: string; readonly description: string; readonly technique: string;
  readonly defaultFee: string; readonly teacherId: string; readonly percentage: string;
  readonly images: readonly ImageUseDraft[]; readonly confirmSlugChange: boolean;
}
export type MonthlyWorkshopField = "name" | "slug" | "summary" | "description" | "technique" | "defaultFee" | "teacherId" | "percentage" | "images";
export type WorkshopPublishRule = "name" | "slug" | "teacher" | "percentage" | "default-fee" | "active-turno";
export interface TurnoDraft { readonly label: string; readonly weekday: string; readonly startsAt: string; readonly endsAt: string; readonly defaultCapacity: string }
export type TurnoField = "label" | "weekday" | "timeRange" | "defaultCapacity";
type R<T, E = never> = Promise<Result<T, AdminFailure | NotFound | E>>;
export interface MonthlyWorkshopsService {
  list(actor: AdminActor, filter: { readonly status: WorkshopStatus | "live" }): Promise<Result<readonly MonthlyWorkshopSummary[], AdminFailure>>;
  listVisible(actor: AdminActor): Promise<Result<readonly MonthlyWorkshopSummary[], AdminFailure>>;  // published + paused
  get(actor: AdminActor, id: string): R<MonthlyWorkshop>;
  create(actor: AdminActor, d: MonthlyWorkshopDraft): Promise<Result<MonthlyWorkshop, AdminFailure | Invalid<MonthlyWorkshopField>>>;
  update(actor: AdminActor, id: string, d: MonthlyWorkshopDraft): R<MonthlyWorkshop, Invalid<MonthlyWorkshopField>>;
  delete(actor: AdminActor, id: string): R<void, RulesUnmet<"draft-without-periods">>;
  publish(actor: AdminActor, id: string): R<MonthlyWorkshop, TransitionRefused<WorkshopStatus> | RulesUnmet<WorkshopPublishRule>>;
  pause(actor: AdminActor, id: string): R<MonthlyWorkshop, TransitionRefused<WorkshopStatus>>;
  archive(actor: AdminActor, id: string): R<MonthlyWorkshop, TransitionRefused<WorkshopStatus>>;
  restore(actor: AdminActor, id: string): R<MonthlyWorkshop, TransitionRefused<WorkshopStatus>>;
  addTurno(actor: AdminActor, workshopId: string, d: TurnoDraft): R<MonthlyWorkshop, Invalid<TurnoField>>;
  updateTurno(actor: AdminActor, workshopId: string, turnoId: string, d: TurnoDraft): R<MonthlyWorkshop, Invalid<TurnoField>>;
  retireTurno(actor: AdminActor, workshopId: string, turnoId: string): R<MonthlyWorkshop, RulesUnmet<"last-active-turno-of-published">>;
  reactivateTurno(actor: AdminActor, workshopId: string, turnoId: string): R<MonthlyWorkshop>;
  deleteTurno(actor: AdminActor, workshopId: string, turnoId: string): R<MonthlyWorkshop, RulesUnmet<"turno-used">>;
  listAssignmentsOfTeacher(actor: AdminActor, teacherId: string):
    Promise<Result<{ readonly monthly: readonly NamedRef[]; readonly intensives: readonly NamedRef[] }, AdminFailure>>;
  techniqueSuggestions(actor: AdminActor): Promise<Result<readonly string[], AdminFailure>>;
}

export type PeriodStatus = "draft" | "open" | "closed";
export interface PeriodSnapshot { readonly teacher: TeacherRef; readonly modality: "own" | "third_party"; readonly percentage: Percentage | null }
export interface PeriodTurno {
  readonly turnoId: string; readonly label: string; readonly weekday: Weekday; readonly startsAt: LocalTime; readonly endsAt: LocalTime;
  readonly turnoActive: boolean; readonly capacity: number;
}
export interface EnabledMaterial { readonly id: string; readonly name: string; readonly active: boolean; readonly available: boolean }
export interface WorkshopPeriod {
  readonly id: string; readonly workshopId: string; readonly period: PeriodKey; readonly fee: Money; readonly materialsRequired: boolean;
  readonly status: PeriodStatus;   // effective (AC11)
  readonly project: { readonly title: string; readonly description: string; readonly images: readonly ImageUse[] };
  readonly turnos: readonly PeriodTurno[]; readonly materials: readonly EnabledMaterial[];   // [] until B9
  readonly snapshot: PeriodSnapshot; readonly openedBy: string; readonly openedAt: Date; readonly audit: Audit;
}
export interface WorkshopPeriodDraft {
  readonly fee: string; readonly materialsRequired: boolean; readonly projectTitle: string; readonly projectDescription: string;
  readonly projectImages: readonly ImageUseDraft[]; readonly capacities: readonly { readonly turnoId: string; readonly capacity: string }[];
  readonly snapshotPercentage: string;
  readonly materialIds: readonly string[];   // multi-select (SA3); B6 accepts only [] (else "not-selectable"); B9 validates
}
export type PeriodField = "period" | "fee" | "projectTitle" | "projectDescription" | "projectImages" | "capacities" | "snapshotPercentage" | "materialIds";
export type OpenMonthRule = "workshop-status" | "teacher" | "percentage" | "active-turno";
export interface WorkshopPeriodsService {
  list(actor: AdminActor, workshopId: string): R<{ readonly periods: readonly PeriodSummary[]; readonly suggestedNext: PeriodKey | null }>;
  get(actor: AdminActor, workshopId: string, period: PeriodKey): R<WorkshopPeriod>;
  openMonth(actor: AdminActor, workshopId: string, period: string):
    R<WorkshopPeriod, Invalid<"period"> | RulesUnmet<OpenMonthRule> | { readonly kind: "period-exists"; readonly periodId: string }>;
  update(actor: AdminActor, periodId: string, d: WorkshopPeriodDraft): R<WorkshopPeriod, Invalid<PeriodField> | { readonly kind: "period-closed" }>;
  publish(actor: AdminActor, periodId: string): R<WorkshopPeriod, TransitionRefused<PeriodStatus>>;
  close(actor: AdminActor, periodId: string): R<WorkshopPeriod, TransitionRefused<PeriodStatus>>;
  delete(actor: AdminActor, periodId: string): R<void, TransitionRefused<PeriodStatus>>;
}

export interface IntensiveWorkshop {
  readonly id: string; readonly slug: string; readonly name: string; readonly summary: string; readonly description: string;
  readonly assignment: TeacherAssignment | null; readonly eventDate: string; readonly startsAt: LocalTime; readonly endsAt: LocalTime;
  readonly price: Money; readonly deposit: Money; readonly capacity: number; readonly minSeats: number;
  readonly policyText: string;   // cancellation and no-show terms, text only (SA4)
  readonly materialsIncluded: boolean; readonly images: readonly ImageUse[]; readonly status: IntensiveStatus; readonly audit: Audit;
}
export interface IntensivesService {
  list; listVisible; get; create; update; delete; publish; pause; cancel; archive; restore;   // shapes as MonthlyWorkshopsService
  reschedule(actor: AdminActor, id: string, input: { readonly eventDate: string; readonly startsAt: string; readonly endsAt: string }):
    R<IntensiveWorkshop, Invalid<"eventDate" | "timeRange">>;
}
```

The workshops **domain** uses its own `AssignmentModality`, `GalleryEntry` and value objects. The application converts lookup results into them (W6).

### 5.5 `materials` (B0b contract; B8a and B8b implementations)

```ts
export const DEFAULT_VARIANT_LABEL = "Única";
export interface Supplier {
  readonly id: string; readonly name: string; readonly phone: string | null; readonly email: string | null;
  readonly notes: string | null; readonly active: boolean; readonly audit: Audit;
}
export interface SuppliersService { list; get; create; update; archive; reactivate }   // TeachersService shapes
export interface MaterialVariant {
  readonly id: string; readonly label: string; readonly price: Money; readonly swatch: string | null;
  readonly available: boolean; readonly position: number; readonly used: boolean;
}
export interface Material {
  readonly id: string; readonly name: string; readonly description: string; readonly category: string;
  readonly supplier: { readonly id: string; readonly name: string; readonly active: boolean };
  readonly image: ImageUse | null; readonly available: boolean; readonly active: boolean;
  readonly variants: readonly MaterialVariant[]; readonly audit: Audit;
}
export interface MaterialDraft {
  readonly name: string; readonly description: string; readonly category: string; readonly supplierId: string;
  readonly image: ImageUseDraft | null; readonly available: boolean;
  readonly variants: readonly { readonly id?: string; readonly label: string; readonly price: string; readonly swatch: string; readonly available: boolean }[];
}
export interface MaterialsService {
  list(actor: AdminActor, filter: { readonly category?: string; readonly supplierId?: string; readonly state: "active" | "inactive" | "all" }):
    Promise<Result<readonly MaterialSummary[], AdminFailure>>;
  listSelectable(actor: AdminActor): Promise<Result<readonly MaterialSummary[], AdminFailure>>;  // active AND available (period multi-select)
  get; create; update; deactivate; reactivate;
  categorySuggestions(actor: AdminActor): Promise<Result<readonly string[], AdminFailure>>;
}
export interface MaterialLookup { findByIds(ids: readonly string[]): Promise<ReadonlyMap<string, Material>> }
```

### 5.6 Composition (`src/composition/request-services.ts`, extended)

```ts
export interface AppServices {
  readonly getSystemStatus: GetSystemStatus;
  readonly siteContent: SiteContent;   // change-2 B2
  readonly site: SiteConfig;           // change-2 B2
  readonly adminAccess: AdminAccessState;              // B0a ("not-evaluated"); set by the gate from B1b
  readonly media: MediaService;                        // B0a placeholder → B2a (upload/serve over a null bucket) → B2b (R2)
  readonly teachers: TeachersService;                  // B0a → B3
  readonly monthlyWorkshops: MonthlyWorkshopsService;  // B0b → B4 (turnos B5)
  readonly workshopPeriods: WorkshopPeriodsService;    // B0b → B6 (materials B9)
  readonly intensives: IntensivesService;              // B0b → B7
  readonly suppliers: SuppliersService;                // B0b → B8a
  readonly materials: MaterialsService;                // B0b → B8b
}
export interface RuntimeConfig { /* existing */ readonly admin: AdminAccessConfig; readonly mediaBucket: R2BucketLike | null }
export interface IsolateState { readonly statusProbeMemo: ProbeMemoCell; readonly accessKeys: AccessKeyCacheCell }
```

Repositories use the existing per-operation `createDbSessionFactory`, with one transaction per multi-row write.

### 5.7 Validation limits (domain constants; FRONT reads them for `maxLength`)

| Field | Limit |
|---|---|
| Name, title | 120 |
| Slug | 80 |
| Summary, bio line | 200 |
| Description | 5000 |
| Project description | 3000 |
| Policy text | 2000 |
| Notes | 1000 |
| Label, technique, category | 40 |
| Alt text | 200 |
| Phone | 30 (at least one digit) |
| Email | RFC-lite regex |
| Capacity | 1-500 |
| Gallery | at most 6 images |

These are design assumptions (D-A2, D-A3).

### 5.8 Test fakes and `createTestServices` additions

| File (BACK, `src/testing/`) | Slice | Contents |
|---|---|---|
| `fakes/admin-actor.ts` | B0a | `testAdminActor(email?)`, `adminAccessFor(email?)`, `deniedAccess(identityEmail?)` |
| `fakes/stub-service.ts` | B0a | `stubService<T>(overrides)`; unspecified methods resolve `unavailable` |
| `fakes/admin-builders.ts` | B0a, B0b | `buildTeacher`, `buildMediaAsset`, `buildImageUse`, `buildMonthlyWorkshop`, `buildTurno`, `buildWorkshopPeriod`, `buildIntensive`, `buildSupplier`, `buildMaterial`, `buildVariant` |
| `fakes/app-services.ts` | B0a, B0b (**extend**; created by change-2 B2) | `createTestServices` defaults: `adminAccess: not-evaluated`, admin services `stubService({})`. Plus `createAdminTestServices(overrides?)` with `adminAccess = adminAccessFor()` |
| `fakes/in-memory-<repository>.ts` | each BACK slice | Fakes enforcing the database constraints |
| `contracts/<repository>.contract.ts` | each BACK slice | Shared suites (AC16) |
| `access/access-tokens.ts` | B1a | Key generation, token signing, a key-set response, a fake `fetch` with a call counter |

The repository contract suites travel with their adapters, not in B0: a suite without an adapter would only test a fake against itself.

**AC16. Repository contract parity.** `run<Name>RepositoryContract(setup)` (the `database-probe.contract.ts` pattern) runs in `src/testing/fakes/in-memory-<name>.test.ts` (unit) and `src/modules/<m>/infrastructure/drizzle-<name>.db.test.ts` (db). It covers:
- round trips with exact `Money` and percentages;
- unique and partial-unique rules;
- transactional atomicity;
- composite foreign-key refusal;
- `RESTRICT` on used rows;
- ordering.

---

## 6. Admin routes (FRONT, final `src/app/routes.ts`)

```ts
route("imagenes/:file", "routes/media-file.ts"),                  // F1
route("sin-acceso", "routes/admin-denied.tsx"),                    // F0a (=== ADMIN_DENIED_PATH)
route("admin", "routes/admin/layout.tsx", [                         // F0a: middleware, chrome, ErrorBoundary
  index("routes/admin/home.tsx"),                                  // F0a
  route("imagenes", "routes/admin/image-upload.ts"),               // F1 (POST only)
  route("profesores", "routes/admin/teachers-list.tsx"),           // F2 (+ nuevo, :id)
  route("talleres", "routes/admin/workshops-list.tsx"),            // F3 (+ nuevo, :id)
  route("talleres/:id/turnos", "routes/admin/turnos.tsx"),         // F4
  route("talleres/:id/periodos", "routes/admin/periods-list.tsx"), // F5 ("Abrir mes")
  route("talleres/:id/periodos/:periodo", "routes/admin/period.tsx"), // F5 (with the "Materiales del mes" multi-select)
  route("intensivos", "routes/admin/intensives-list.tsx"),         // F6 (+ nuevo, :id)
  route("materiales/proveedores", "routes/admin/suppliers-list.tsx"), // F8 (+ nuevo, :id)
  route("materiales", "routes/admin/materials-list.tsx"),          // F7 (+ nuevo, :id)
]),
```

- The admin layout lives outside the public layout and has its own boundary: generic Spanish text, 403 → "No tenés acceso al panel", 503 → "Esta sección está en construcción".
- `ADMIN_NAV` (Talleres, Intensivos, Profesores, Materiales) feeds the sidebar and the mobile menu; the active entry is computed by prefix.
- Admin `meta` returns `noindex, nofollow`. A FRONT test (F0a) asserts that the sitemap route output contains no URL starting with `/admin`.
- Actions read `intent`. Confirmation dialogs guard archive, pause, cancel, retire and delete.
- Copy lives in `src/app/ui/admin/microcopy.ts` and `src/app/admin/issue-messages.ts` (every `IssueCode` and rule code). F0a's copy test runs `findCopyViolations` over both.

---

## 7. File Changes

| File | Action (against today's `main`) | Owner | Slice | Description |
|---|---|---|---|---|
| `src/modules/_shared/use-case-errors.ts` (+ test), `_shared/index.ts` | Create / Extend | BACK | B0a | Error kinds, `parseWholePesos` |
| `src/modules/admin-access/**` | Create | BACK | B0a (actor), B1a | AC2, AC3, AC7 |
| `src/modules/media/**` | Create | BACK | B0a, B2a, B2b | Sniff, dimensions, upload, serve, Drizzle repo (B2a); R2 adapter (B2b) |
| `src/modules/teachers/**` | Create | BACK | B0a, B3 | |
| `src/modules/workshops/**` | Create | BACK | B0b, B4-B7, B9 | |
| `src/modules/materials/**` | Create | BACK | B0b, B8a, B8b | |
| `src/platform/db/schema.ts` | Extend | BACK | B2a-B9 | Re-exports |
| `src/platform/db/schema/{media,teachers,workshops,materials}.ts` | Create | BACK | B2a-B9 | Tables (relative imports only) |
| `drizzle/0001…0009_*.sql`, `drizzle/meta/**` | Create (generated) | BACK | B2a-B9 | |
| `src/platform/db/migration-catalog.test.ts` | Extend | BACK | B2a | Hygiene, including strictly increasing `when` |
| `tooling/architecture/schema-ownership.test.ts` | Create | BACK | B2a | AC1 |
| `src/platform/env.ts` (+ test) | Extend | BACK | B1b | `DEV_ADMIN_EMAIL` presence, mode rule |
| `src/platform/admin-env.ts` (+ test) | Create | BACK | B1b | `adminEnvSchema`, `readAdminConfig` |
| `src/platform/admin-headers.ts` (+ test) | Create | BACK | B1b | |
| `src/platform/r2.ts` (+ test) | Create | BACK | B2b | `R2BucketLike`, `readMediaBinding` |
| `.dev.vars.example`, `tooling/repo-hygiene.test.ts` | Extend | BACK | B1b | Four admin names; hygiene reads `adminEnvSchema` (never `MEDIA`) |
| `src/composition/request-services.ts` (+ `.db.test.ts`) | Extend | BACK | B0a-B9 | |
| `src/composition/{admin-gate,unavailable-service}.ts` (+ tests) | Create | BACK | B1b, B0a | |
| `workers/app.ts` | Extend | BACK | B1b | Delegates to `handle-request.ts` |
| `workers/handle-request.ts` (+ `handle-request.test.ts`) | Create | BACK | B1b | |
| `tsconfig.node.json` | Extend | BACK | B1b | `include` gains `"workers/**/*.test.ts"` |
| `vitest.config.ts` | Extend | BACK | B1b (`unit` includes `workers/**/*.test.ts`), B2b (`unit` excludes `**/*.r2.test.ts`; `db` includes it) | |
| `wrangler.jsonc` | Extend | BACK | B2b | `r2_buckets` |
| `.github/workflows/ci.yml`, `tooling/deploy-workflow.test.ts` | Extend | BACK | B1b, B2a (drift) | |
| `src/testing/fakes/app-services.ts` | Extend (created by change-2 B2) | BACK | B0a, B0b | |
| `src/testing/{access,contracts}/**`, other fakes | Create | BACK | B0a-B9 | |
| `docs/adr/0005-admin-access-and-media.md` | Create | BACK | B1b (extended in B2b) | |
| `docs/runbooks/cloud-provisioning.md`, `AGENTS.md`, `README.md` | Extend | BACK | B1b, B2b | Z1-Z5, R1, dev bypass |
| `src/app/routes.ts`, `src/app/routes/admin/**`, `routes/admin-denied.tsx`, `routes/media-file.ts` | Extend / Create | FRONT | F0a-F8 | Section 6 |
| `src/app/ui/admin/**`, `src/app/admin/**` | Create | FRONT | F0a, F0b, F1-F8 | |
| `src/testing/fixtures/admin/**` | Create | FRONT carve-out | F0a-F8 | |
| `docs/design/deviation-register.md` | Extend (created by change-2 F8) | FRONT carve-out | F0a | Drawers → pages; admin voseo |

---

## 8. Testing Strategy

| Layer | What | Approach | Project | Slice |
|---|---|---|---|---|
| Unit | `requireAdminActor`; `parseWholePesos` | Pure | unit | B0a |
| Unit | Decode (segments, sizes, `alg` table: `none`, `HS256`, `RS512`, `PS256`); claims table (iss, aud as string and array, exp, nbf and iat ± skew, email, `common_name`); allowlist; `authorizeAdminRequest` (each reason, including `config-missing` and `config-invalid`, the dev identity with the allowlist); `isSameOriginMutation` | Pure, in-memory verifier, `fixedClock` | unit | B1a |
| Adapter | WebCrypto verifier: valid; tampered; wrong key; new kid → one refetch → valid (rotation); **sequential misses inside 30 s → one fetch**; stale set after 1 h → refetch; fetch 500, timeout or bad JSON → `key-source`; key under 2048 bits rejected; the cell holds no Promise after any call (asserted on the cell's values) | Real `crypto.subtle`; counting fake `fetch`; fake clock | unit | B1a |
| Unit | `readAdminConfig`: missing, empty (`ACCESS_AUD=`), malformed domain or AUD → `access: null` plus a names-only issue (value absent from the issue and log); allowlist with one invalid entry keeps the valid ones; none valid → `[]`. `readWorkerEnv`: `DEV_ADMIN_EMAIL` with production mode, https URL, `http://127.0.0.1` or `http://example.com` → invalid; development on `http://localhost` → valid; `DEV_ADMIN_EMAIL=` empty counts as unset; **malformed admin values never make `readWorkerEnv` fail** | Pure | unit | B1b |
| Worker | `handleRequest` with a fake handler: public paths and `/status` never read the admin config (a malformed admin env still serves `/`); path variants gated; denied GET re-dispatches to `/sin-acceso` with 403; denied POST and `.data` → plain 403 and handler not called; CSRF cases; allowed → actor in services; admin headers on 403, 404 and 500; logs carry reasons and names only | Vitest | unit | B1b |
| Tooling | Seven-name gate; smoke env and headers; no echo, `set -x`, `-v`, `--trace` or `-L`; `/admin` 403 check; admin and dev names absent from `ci.yml` (with a planted test); `DEV_ADMIN_EMAIL` absent from `wrangler.jsonc`; hygiene covers `adminEnvSchema`; drift step (B2a) | Existing helpers | unit | B1b, B2a |
| Unit | Sniff table; dimension parsing (PNG, JPEG baseline and progressive, WebP lossy, lossless, extended, corrupt); size boundaries (exactly 5 MiB accepted, +1 byte rejected, 0 rejected); key without a file name; `validateGallery` | Synthetic byte fixtures built in tests | unit | B2a |
| Contract | `MediaAssetRepository` (fake, Drizzle); `ImageStorage` (fake in B2a; R2 through `getPlatformProxy` in B2b) | Shared suites | unit, db | B2a, B2b |
| Unit | Teachers: create, validate, duplicate active name (case), reuse after archive, reactivate duplicate, audit, no actor → denied with no repository call | In-memory | unit | B3 |
| Unit | Workshops: slugify; slug rules and confirmation; `parsePercentage` (35.5, 35,5, 100, 100.01, -1, 12.345); modality rules including `percentage-not-applicable`; archived teacher refused; transition table; publish rules; gallery replace and reorder; `listVisible` (draft and archived excluded, paused included with `acceptsNewRequests: false`) | In-memory | unit | B4 |
| Unit | Turnos: time range, weekday, capacity, duplicate label, retire, reactivate, delete unused, refuse used, OA3; display order weekday then start | In-memory | unit | B5 |
| Unit | Periods: key parsing; `cordobaMonthOf` boundaries (01:30Z, 02:59Z, 03:00Z); D-A1; `suggestedNext` (no periods, after the latest, latest in the past → current month, beyond +12 → null); "Abrir mes" (defaults, latest-earlier source, new turno default, retired turno left out, snapshot teacher and percentage from the current assignment, own → no percentage, ineligible statuses, duplicate, all unmet rules, atomicity); derived status; closed refuses edits; draft-only delete; foreign turno; `materialIds` non-empty refused before B9 | In-memory and fixed clock | unit | B6 |
| Unit | Intensivos: deposit table; min seats; transitions; reschedule into the past; `listVisible` and `acceptsNewRequests` | In-memory | unit | B7 |
| Unit | Suppliers; materials (default label, duplicate labels, price, swatch, last-variant removal refused, unused deleted, deactivate and reactivate, category, filters, `listSelectable` = active and available) | In-memory | unit | B8a, B8b |
| Unit | Offers via `update.materialIds`: duplicate → `duplicate`; inactive or unavailable → `not-selectable`; "Abrir mes" copies only active and available; closed period refused | In-memory | unit | B9 |
| Contract (db) | One suite per repository, fake and Drizzle on embedded PostgreSQL 17 | `createTestDatabase()` per file | unit, db | B2a-B9 |
| Delivery | Admin loaders and actions with `createAdminTestServices` stubs: middleware 403; 503 for `unavailable`; issue codes mapped with values kept; GET loaders never call write methods; denial route path equals the constant; **sitemap contains no `/admin` URL**; upload route answers 411 without `Content-Length`, 413 over the limit and 405 for GET | Unit | unit | F0a-F8 |
| Component | Nav (order, hrefs, active by prefix, desktop and mobile identical); top bar (email; Salir → `/cdn-cgi/access/logout`); denial page; empty states; ConfirmDialog; form atoms; image field (injected encoder; WebP result with the wrong `blob.type` → JPEG fallback); gallery editor (6 max, reorder, cover); turnos editor; variants editor; materials multi-select | Testing Library + axe in every file | ui | F0a-F8 |
| Manual | 360 px and 390 px; iPhone HEIC upload; Safari WebP fallback; Access OTP login; non-listed viewer; Salir | PR checklist | preview | F0a, F1, B1b |

Coverage: the 90 % gate on every new `domain` and `application` folder. Suite time is recorded per BACK PR: about 9 new `*.db.test.ts` files plus one `*.r2.test.ts`.

---

## 9. Threat Matrix

### 9.1 Skill applicability matrix

This change adds HTTP routing (the Worker gate and admin routes) and edits one CI shell step. It adds no subprocesses in product code, no VCS or PR automation, and no executable-file classification.

| Boundary | Applicability |
|---|---|
| Documentation-like paths | N/A: no file classification or execution |
| Git repository selection | N/A: no git automation |
| Commit state | N/A: no commit automation |
| Push state | N/A: no push automation |
| PR commands | N/A: no PR automation |

### 9.2 Security matrix (all rows applicable; each RED test is written before its production code)

| # | Threat | Safe behavior | Failure behavior | RED test | Slice |
|---|---|---|---|---|---|
| T1 | Path variants (`/ADMIN`, `/%61dmin`, `//admin`, `/admin.data`, an undecodable path) | All gated | Undecodable → denied | Worker table | B1b |
| T2 | Missing middleware or gate defect | Layers 2 and 3 deny | — | Middleware test; "no actor" per service | F0a, B3-B9 |
| T3 | Forged identity headers | Only a verified JWT counts | `token-missing` or `signature` | Email header without JWT → 403 | B1a, B1b |
| T4 | Algorithm confusion | RS256 only | `algorithm` | Decode table | B1a |
| T5 | Wrong aud or iss; expiry; future nbf or iat | Exact checks, 60 s skew | Reason code | Claims table | B1a |
| T6 | Unknown-kid spraying; key outage | One fetch per request; miss refetch at most every 30 s | `unknown-key`, `key-source` | Counting-fetch tests | B1a |
| T7 | Cross-request I/O in the key cache (workerd) | The cell holds plain data only | — | Cell-content assertion; verify item | B1a |
| T8 | Service token as admin | Denied | `service-token` | Unit; CI `/admin` 403 | B1a, B1b |
| T9 | Admin config missing or malformed | `/admin` denied, names logged; public pages unaffected | — | `readAdminConfig` and Worker tests | B1b |
| T10 | Allowlist bypass by case or whitespace | Normalized on both sides | — | Unit | B1a |
| T11 | Dev bypass in production | Development mode **and** `http://localhost`; still allowlisted | Worker-wide 500, names only | Env tests; workflow and wrangler scans | B1b |
| T12 | CSRF through the Access cookie | `Origin` plus `Sec-Fetch-Site` | Plain 403, handler not called | Worker and middleware tests | B1b, F0a |
| T13 | State change on GET | Loaders never write | — | Route tests | F0a-F8 |
| T14 | Clickjacking | `DENY` and `frame-ancestors 'none'` | — | Header test | B1b |
| T15 | Oversized, chunked or empty uploads | 411 without length; 413 over the limit before parsing; server byte limit | Nothing stored | Route and use-case tests | B2a, F1 |
| T16 | Polyglot, SVG, HTML renamed `.jpg`, HEIC | Magic-byte allowlist; `nosniff`; sandbox CSP | `unsupported-type` | Sniff table | B2a |
| T17 | Path traversal on serving | Regex before storage | 404, empty body | Route test | F1 |
| T18 | EXIF GPS leak | Client re-encode drops metadata | Raw upload without JS keeps EXIF (accepted) | Image-field test uploads the encoder output | F1 |
| T19 | Data exposure through errors | Identical denial bodies; generic boundary; empty 404s | — | Body equality; boundary test | B1b, F0a, F1 |
| T20 | Admin pages cached or indexed | `private, no-store`, `noindex` everywhere; no `/admin` in the sitemap | — | Header and sitemap tests | B1b, F0a |
| T21 | Service token in CI logs | Env-only; no echo or verbose curl | — | Workflow tests | B1b |
| T22 | Allowlist or identifiers in logs | Worker secrets; names-only logs | — | Workflow scan; log assertions | B1b |
| T23 | Concurrent edits overwrite each other | **Accepted (SA1)**: last write wins, with "last changed by / at" shown | — | None (owner decision) | — |

---

## 10. Delivery plan (stacked PRs to `main`; Conventional Commits, never `Co-Authored-By` or AI attribution)

Authored additions plus deletions. Excluded: generated migrations and `drizzle/meta`, the lockfile, generated types, binaries. Fakes, builders and contract suites count as tests. **Every slice is at most 400 production lines.**

### 10.1 Order and dependencies

Only two BACK slices wait for owner steps: **B1b** (Z1-Z3: the two Access GitHub secrets, or the deploy gate fails by name) and **B2b** (R1: the bucket must exist before deploying the binding). Every other BACK slice merges as soon as its code dependencies are on `main`. With one BACK writer, the work order follows the list, but merges are not blocked behind owner steps.

```
Change-2 B2 (B2a, B2b) ─► B0a ─► B0b ─┬─► B1a ─► B1b* (owner Z1-Z3)
                                     ├─► B2a ─► B2b* (owner R1)
                                     ├─► B3 (B0a)
                                     ├─► B4 (B3, B2a) ─► B5 ─► B6 ─┐
                                     ├─► B7 (B3, B2a)              ├─► B9 (B6, B8b)
                                     └─► B8a (B0b) ─► B8b (B8a, B2a)┘
FRONT (develops against B0a/B0b fakes; merges after the named BACK PRs and the change-2 F0/F1 tokens and atoms):
F0b (B0a, change-2 F0/F1) ─┐
F0a (B1b, change-2 F0/F1) ─┴─► F1 (B2b) ─► F2 (B3) ─► F3 (B4) ─► F4 (B5) ─► F6 (B7) ─► F8 (B8a) ─► F7 (B8b) ─► F5 (B6, B9)
```

- **No FRONT admin route merges before B1b.**
- F5 (Períodos) comes last because its "Materiales del mes" multi-select needs B9 (SA3).

### 10.2 Slices

| PR | Owner | Content | Needs (merged) | Production | Tests | Docs |
|---|---|---|---|---|---|---|
| P0 | BACK | Planning artifacts | — | 0 | 0 | ~2,700-3,400 |
| **B0a** | BACK | Contract I: `_shared` errors; actor and state; `media` and `teachers` contracts; `AppServices` members; `createUnavailableService`; fakes (actor, stub, builders, extended `createTestServices`) | P0, **change-2 B2 (B2a, B2b)** | 210-290 | 150-220 | 0 |
| **B0b** | BACK | Contract II: `workshops` and `materials` contracts; placeholders; builders | B0a | 220-300 | 110-170 | 0 |
| B1a | BACK | Verification: decode, claims, allowlist, authorize, same-origin, WebCrypto verifier, plain-data key cell, token helpers | B0b | 220-300 | 290-390 | 0 |
| B1b | BACK | Wiring: `readAdminConfig`, `readWorkerEnv` dev rule, `admin-gate`, `handle-request`, admin headers, isolate cell, `tsconfig.node.json`, Vitest include, `.dev.vars.example` and hygiene, CI gate and smoke | B1a, **owner Z1-Z3** | 170-240 | 260-350 | 220-300 (ADR-0005, runbook Z1-Z5, AGENTS.md, README) |
| B2a | BACK | Media core: sniff, dimension parsers, gallery validation, upload and serve use cases over the port, `media_asset` schema, Drizzle repo, `0001`, schema-ownership test, drift step, journal hygiene | B0b | 230-310 | 200-270 | 0 |
| B2b | BACK | R2: `R2BucketLike`, `readMediaBinding`, R2 adapter, `wrangler.jsonc` binding, composition swap, Vitest `r2` wiring | B2a, **owner R1** | 80-130 | 60-100 | 40-60 (runbook R1, ADR addendum) |
| B3 | BACK | Teachers + `0002` + `TeacherLookup` | B0a | 210-290 | 200-270 | 0 |
| B4 | BACK | Monthly workshops: record, slug, assignment, lifecycle, publish rules, gallery, `listVisible`, assignments-of-teacher, suggestions + `0003` | B3, B2a | 300-390 | 240-320 | 0 |
| B5 | BACK | Turnos + `0004` | B4 | 150-210 | 150-210 | 0 |
| B6 | BACK | Periods: "Abrir mes", `suggestedNext`, capacities, project, snapshot, derived status, transitions + `0005` | B5 | 320-400 | 270-350 | 0 |
| B7 | BACK | Intensivos + `0006` | B3, B2a | 260-340 | 220-290 | 0 |
| B8a | BACK | Suppliers + `0007` | B0b | 140-200 | 140-190 | 0 |
| B8b | BACK | Materials and variants, `MaterialLookup`, `listSelectable`, suggestions + `0008` | B8a, B2a | 290-380 | 240-310 | 0 |
| B9 | BACK | Period material offers through `update.materialIds`; "Abrir mes" copies active and available ones + `0009` | B6, B8b | 120-180 | 120-170 | 0 |
| F0b | FRONT | Form atoms, DataTable, StatusBadge, ConfirmDialog, admin EmptyState, row-editor primitive | B0a, change-2 F0/F1 | 250-350 | 190-270 | 0 |
| F0a | FRONT | Admin layout with middleware, boundary, sidebar, top bar, mobile nav, `ADMIN_NAV`, landing, denial route, "en construcción", microcopy, issue messages, copy and sitemap tests, deviation entry | B1b, F0b, change-2 F0/F1 | 300-390 | 220-300 | 10-20 |
| F1 | FRONT | Image field (resize, `blob.type` fallback), gallery editor, upload route (411/413), `/imagenes/:file` | B2b, F0a | 230-330 | 170-240 | 0 |
| F2 | FRONT | Profesores | B3, F1 | 150-220 | 130-180 | 0 |
| F3 | FRONT | Talleres | B4, F2 | 290-390 | 210-280 | 0 |
| F4 | FRONT | Turnos sub-route | B5, F3 | 130-190 | 100-150 | 0 |
| F6 | FRONT | Intensivos (policy text, no deadline field) | B7, F3 | 230-310 | 170-240 | 0 |
| F8 | FRONT | Proveedores | B8a, F0a | 115-170 | 95-135 | 0 |
| F7 | FRONT | Materiales | B8b, F1, F8 | 290-390 | 210-290 | 0 |
| F5 | FRONT | Períodos: list, "Abrir mes", period form with capacities, project gallery, snapshot, status actions, "Materiales del mes" multi-select | B6, B9, F4 | 310-400 | 220-290 | 0 |
| **Total** | | 14 BACK + 10 FRONT | | **~5,215-7,100** | **~4,365-5,985** | **~270-380 + P0** |

Totals by owner:

| Owner | Production | Tests |
|---|---|---|
| BACK | 2,920-3,960 | 2,650-3,610 |
| FRONT | 2,295-3,140 | 1,715-2,375 |

The production total is still above the proposal's 4,140-5,710. The main causes:
- the 6-image galleries;
- restore, delete-draft and turno-delete rules;
- the derived period close;
- the testable Worker extraction, `readAdminConfig` and the `/admin` smoke;
- client image resizing;
- the predefined splits.

The "recorte liviano" removed about 300-400 production lines (version checks, turno reordering, the F9 screen, the deadline field).

### 10.3 Split rules (only if production passes 400 during apply)

- **B4**: the gallery moves to B4b.
- **B6**: the project images move to B6b.
- **B8b**: variant removal moves to B8c.
- **F0a**: mobile nav and landing move to F0c.
- **F3**: lifecycle actions move to F3b.
- **F5**: "Materiales del mes" and the project gallery move to F5b, which then needs B9 while F5 needs only B6. This also unblocks periods earlier.
- **F7**: the variants editor moves to F7b.
- B1a, B2a and B7 have no natural seam. Stop and report to the owner.

### 10.4 Guard lines for `sdd-tasks`

- `Decision needed before apply: No` (stacked-to-main, the size policy and the "recorte liviano" are decided; orchestrator defaults and D-A1 to D-A6 are assumptions that do not block apply)
- `Chained PRs recommended: Yes`
- `400-line budget risk: High`

---

## 11. Migration / Rollout / Rollback

- **Database**: nine additive, forward-only migrations on Neon `staging`. Neon `main` stays empty until launch.
- **Owner order**:
  1. Z1-Z3 before B1b merges (seven gate names).
  2. Z4 (Access on `workers.dev`) any time.
  3. Z5 (Worker secrets `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ADMIN_EMAILS`, type Secret) any time; until then `/admin` denies everyone.
  4. R1 (bucket) before B2b merges.
- **Temporary states**:
  - Areas answer 503 "en construcción" until their BACK slice.
  - Between B2a and B2b, upload answers `storage-unavailable` and serving 404.
  - Between B4 and B5, publish is always refused (no active turno).
  - Between B6 and B9, the period's materials list is empty.
- **Rollback**:
  - `git revert` in reverse dependency order. **Never revert B1b while admin routes are on `main`.**
  - Broken deploy: `wrangler rollback`.
  - Lockout: the owner fixes the `ADMIN_EMAILS` secret (no redeploy). A malformed admin value never affects public pages.
  - Dev-bypass misconfiguration: the Worker refuses to start; remove the variable.
  - Reverting B2b removes the binding; objects stay in the bucket, and records render "sin imagen".

---

## 12. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| A JWT verification flaw admits a non-admin | Low (high impact) | Three layers; table-driven RED tests; real WebCrypto tests; CI `/admin` 403 smoke; review of B1a |
| A module-scope `CryptoKey` is unusable across requests in workerd | Low-Med | Verify in B1a; fallback caches JWK JSON and imports per request |
| Concurrent key misses in one isolate cause a few parallel fetches (no single-flight) | Low | At most one fetch per request; the 30 s miss guard bounds random-kid floods |
| React Router path normalization differs from the gate | Medium | Broad normalized prefix plus middleware; verified in F0a |
| React Router 8 middleware API differs | Low-Med | Verify in F0a; fallback: `requireAdmin` in every admin loader and action plus a fitness test |
| Access token claims or key URL differ from assumptions | Medium | Verify against Cloudflare docs in B1a and with a real login in Z5 (the denial log names the failing check) |
| The allowlist set as a plain variable and wiped by a deploy | Medium | Runbook Z5 insists on type Secret; troubleshooting entry |
| A typo in `ADMIN_EMAILS` silently drops one admin | Low-Med | The denial page shows the signed-in email; the log names `ADMIN_EMAILS (invalid)` |
| The deploy needs an R2 permission | Medium | Read, then Edit fallback; verify in B2b |
| `getPlatformProxy` flaky in Vitest | Medium | One file in the `db` project; structural-fake fallback |
| Client resize fails on some phones | Medium | JPEG fallback; clear 5 MiB server error; manual check on the owners' phones |
| Raw uploads without JS keep EXIF data | Low | The field requires JS; only admins upload; ADR-0005 |
| Last write wins overwrites a concurrent edit (SA1) | Low | Owner-accepted; "last changed by / at" visible |
| Migration numbering conflicts | Low | One BACK writer; regenerate after rebase; drift gate; strictly increasing `when` |
| Scope (5,215-7,100 production lines) in week 2 | High | Contract-first parallel work; owner-gated slices isolated; predefined splits; descoping order |
| An orchestrator default or design assumption is overridden late | Medium | Each is isolated (a table row, a guard, a constant) |

---

## 13. Assumptions, spec alignment and verification

### 13.1 Design assumptions (product limits chosen by this design; the owner may override)

- **D-A1**: "Abrir mes" accepts the current Córdoba month up to 12 months ahead, and refuses past months.
- **D-A2**: Capacity (turno default, period per turno, intensivo) is 1 to 500.
- **D-A3**: The text length limits of section 5.7.
- **D-A4**: Image limits: 5 MiB server limit, client long edge 2400 px, dimensions 1-10000 px.
- **D-A5**: Turnos are listed by weekday, then start time (follows from SA2).
- **D-A6**: A turno label is unique within its workshop including retired turnos, so history stays unambiguous.

### 13.2 Points where a spec must follow this design (sdd-tasks reconciles; the spec wins on product rules)

1. **delivery-pipeline**, "Access configuration passed without secrets": the transport is **Worker secrets set by the owner**; nothing passes through CI.
2. **media-storage**, "Metadata record": width and height are always recorded; unreadable dimensions are rejected.
3. **media-storage**, "Serving": the route is `/imagenes/<id>.<ext>`, reading R2 first.
4. **media-storage**, "Port parity": the R2 adapter runs on wrangler's local simulation through `getPlatformProxy()` (fallback recorded).
5. **media-storage**, "Size limit": 5 MiB, plus client resize; 411 without `Content-Length`.
6. **intensive-workshops**, "Must be a single date": one date plus two local times by construction.
7. **monthly-workshops** and **intensive-workshops**, "Meaning of paused": the visible-activities query is `listVisible(actor)` plus the exported pure functions; the public reader comes in change 4.
8. **workshop-periods**, "Period status": the automatic close is derived (no cron, no stored transition).
9. **admin-access**, "Denial response": mutation, `.data` and CSRF denials are a plain-text 403 with the same message.
10. **delivery-pipeline**, "Deploy smoke check": it adds the `/admin` → 403 assertion.
11. **monthly-workshops**, "Turnos definition": labels are unique including retired turnos (D-A6), with no sort position (SA2).
12. **materials-catalog**, "Variants": the default label is `"Única"`.
13. **intensive-workshops**, "Policy fields" and "Intensive record": the cancellation deadline is removed (SA4).
14. **workshop-periods**, "Enabled materials": edited through the period form's `materialIds` (SA3); the rules are unchanged.

(Revision 1's item "a malformed admin value fails environment validation" is withdrawn: the spec's fail-closed rule wins, AC5.)

### 13.3 Verify in apply (slice that owns the check in brackets)

- [ ] Whether the generated `worker-configuration.d.ts` exposes a runtime Access identity (record only) [B1a].
- [ ] Access JWT format: header `kid` and `alg`; `iss` form; `aud` array; service-token claims (`common_name`, empty `email`); the key URL and its `keys` shape [B1a, current Cloudflare docs].
- [ ] WebCrypto JWK import and RSASSA-PKCS1-v1_5 verify in Node 24 and workerd [B1a].
- [ ] **A `CryptoKey` imported in one request and cached at module scope is usable by a later request in workerd** (`pnpm dev`, two sequential requests through a test hook; otherwise switch the cell to JWK JSON) [B1a].
- [ ] `z.preprocess` empty-to-undefined keeps `workerEnvSchema.shape` and `adminEnvSchema.shape` readable by `repo-hygiene.test.ts` [B1b].
- [ ] `import.meta.env.MODE` is `development` under `pnpm dev` and `production` in builds [B1b].
- [ ] `tsc -b` passes with `workers/**/*.test.ts` in `tsconfig.node.json` and `handle-request.ts` free of `Env` and `ExecutionContext` [B1b].
- [ ] Dashboard secrets survive `wrangler deploy` and are not printed [B1b, owner Z5].
- [ ] Service-token curl passes Access; without it, a redirect (V1) [B1b, owner].
- [ ] A plain-text 403 for `.data` requests renders the client boundary [F0a].
- [ ] React Router 8 middleware: export, type, runs before child actions and `.data` requests; thrown `data(…, 403)` renders the layout boundary [F0a].
- [ ] React Router matching of `/ADMIN`, `/%61dmin`, `//admin` [F0a].
- [ ] Deploying `r2_buckets` with the three-permission token, or which R2 permission is needed [B2b, owner].
- [ ] `getPlatformProxy()` R2 in Vitest on Windows and Linux CI; startup time [B2b].
- [ ] `pnpm db:generate` writes nothing when unchanged and accepts `--name`; regenerated migrations get a larger `when` [B2a].
- [ ] Drizzle 0.45 composite foreign keys, expression partial unique indexes and `CHECK` constraints. Missing ones are appended as hand-written SQL to the generated migration before merge and recorded [B2a, B3, B5, B6].
- [ ] drizzle-kit loads the schema files with relative imports and `pg-core` only [B2a].
- [ ] `bigint({ mode: "number" })` round trip with `Money` [B4].
- [ ] `Intl.DateTimeFormat` with `America/Argentina/Cordoba` in workerd and Node [B6].
- [ ] Client resize: `createImageBitmap` `imageOrientation`; `OffscreenCanvas` and WebP encoding on iOS Safari and Android Chrome; the `blob.type` fallback; HEIC with the `accept` list on a real iPhone [F1].
- [ ] `request.formData()` with a 5 MiB file on workerd; browsers send `Content-Length` for `FormData` uploads [F1].

### 13.4 Open questions

None blocking. Product gaps are covered by the orchestrator defaults (0.1), the owner's scope decision (0.2) and design assumptions D-A1 to D-A6, all overridable by the owner.
