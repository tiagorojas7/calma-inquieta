# ADR-0005: Admin Access Worker gate

Status: accepted (admin catalog B1b)

## Context

Admin delivery routes must not run unless Cloudflare Access authentication succeeds. Public pages and `/status` must remain available when the admin configuration is absent or malformed.

## Decision

The Worker recognizes normalized `/admin` paths before calling React Router. It parses admin-only configuration only for those paths, verifies the Access assertion through the composition gate, and carries the resulting actor state in request services.

Denied GET and HEAD document requests are re-dispatched as `GET /sin-acceso` with status 403. Mutations and `.data` requests receive a plain 403. Every admin-path response, including denials and route 404/500 responses, has private no-store, noindex, frame-denial, frame-ancestor, referrer, and nosniff headers.

`DEV_ADMIN_EMAIL` is honored only when the Worker build mode is `development`, `SITE_URL` is `http://localhost` with an optional port, and the actual request is also `http://localhost`. The Worker passes `import.meta.env.MODE` to the environment reader; an unsafe configured bypass fails the Worker by variable name only.

The deploy gate requires seven ordered GitHub secret names. Its smoke request supplies the Access service-token headers to `/status`, does not follow redirects, and confirms that the same token receives 403 from `/admin`. The Access client credentials are never logged or passed as Worker variables. Access configuration and allowlists remain Cloudflare Worker secrets, not GitHub secrets.

## Consequences

The isolate keeps only the access key cache's plain data and request services receive the gate result. A manual Access smoke remains an owner runbook step after the Cloudflare policy and secrets are provisioned. Before admin delivery routes exist, a document denial can render the public 404 body at `/sin-acceso`; it still has status 403 and never executes an admin route.

## Media storage binding (admin catalog B2b)

Images are stored in a Cloudflare R2 bucket bound to the Worker as `MEDIA` (`wrangler.jsonc` `r2_buckets`: bucket `calma-inquieta-media`, preview bucket `calma-inquieta-media-preview`). The binding is read outside every env schema by `readMediaBinding` (`src/platform/r2.ts`), which checks structurally for `put`, `get` and `delete` and returns `null` otherwise. `MEDIA` is never a variable, never listed in `.dev.vars.example` and never enters the Worker-wide env schema, so a missing or malformed binding cannot fail a public page.

Composition builds `ImageStorage` from the binding: the R2 adapter when present, an always-failing adapter when absent. An upload then answers `storage-unavailable` and serving answers unavailable, which the image route maps to 404. The R2 adapter refuses to overwrite an existing key (`etagDoesNotMatch: "*"`), matching the in-memory fake.

The `ImageStorage` contract suite runs against the fake in the `unit` project and against wrangler's local, in-memory R2 simulation (`getPlatformProxy`, `persist: false`) in `*.r2.test.ts` files, which run in the `db` project and are excluded from `unit`. The bucket is created by the owner (runbook R1); no agent runs a Cloudflare command. If the first deploy after R1 fails with an R2 authorization error, the owner adds Account / Workers R2 Storage / Read, then Edit, to the CI token (runbook C3 fallback).
