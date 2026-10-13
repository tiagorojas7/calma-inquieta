## Current Delivery State

- The authoritative resolution for B1a is [PR #30](https://github.com/tiagorojas7/calma-inquieta/pull/30), merged at `14363b4`; task 3 is complete.
- B0 delivery evidence: [PR #24](https://github.com/tiagorojas7/calma-inquieta/pull/24) (B0a) merged at `40c0bb4`, [PR #25](https://github.com/tiagorojas7/calma-inquieta/pull/25) (B0b-a) at `63d1c25`, and [PR #26](https://github.com/tiagorojas7/calma-inquieta/pull/26) (B0b-b) at `debda1d`.
- B2a remains in progress and is owned by the Claude session. Nested 5a is partial; B2a-b database, migration, and ownership work is pending.
- Local WIP `d001b58` is not delivered and must not be treated as merged.
- The B1a partial sections below are preserved pre-merge snapshots; they do not override PR #30's final resolution.

## B0a — establish the first contract seam (complete)

- RED Money/parser: whole-peso parsing and actor/service denial contracts failed before implementation.
- Corrected result: 5 files / 21 tests.
- Old commit `ac9b029` was rebased after PR18/base `121946d` to `b3983d1`.
- Exclusive UI: 2 files / 5 tests; full suite 67 files / 448 tests PASS.
- Final gates PASS: lint, typecheck, format, and diff.
- Production additions: 313 lines; tests: 96 lines.
- Task 1 checked.

## B0b split recovery

- Rejected combined local commit `15d4100` preserved by immutable local branch `backup/admin-catalog-b0b-pre-split-15d4100`, exact commit `15d410068c6f32aee5c864d6a28243e831082ac7`.
- Local branch safely returned to `b3983d1`.
- Owner-approved 2a/2b split applied. OpenSpec preserved.

## B0b-a — monthly workshops, turnos and periods (complete)

- Strict TDD history preserved through RED, GREEN, and REFACTOR.
- Semantic verifier corrections: `totalCapacity` and the exact create error union.
- Final independent PASS: format; focused 2 files / 7 tests; lint; typecheck; full 68 files / 451 tests.
- Production additions: 339 lines.
- Commit: `2e07f5f`.
- Task 2a checked. No 2b drift.

## B0b-b — intensives and suppliers/materials contracts (complete)

- User-accepted parent `9e47c82` stacked on `2e07f5f`.
- Final semantics closed: intensive exact fields/object reschedule/no monthly inheritance, status helpers, supplier/material exact drafts/models/unions, `used`, optional id, `findByIds` map, state filter, three fail-closed placeholders, builders/defaults/overrides.
- Final gates PASS: format, focused 3 files/18 tests, lint, typecheck, full 69 files/462 tests.
- Independent scope/lineage/backup PASS; production 276 lines (<400); OpenSpec preserved; no excluded drift.
- Task 2b and parent task 2 were checked after independent PASS and closure; their rebased commits are `47966f7` (B0b-b) and `22846f8` (B0b-a).

## B1a corrective rerun — partial, task remains unchecked

- Restoration: prior B0a/B0b history above was restored from recorded apply-progress evidence; no new historical facts were added.
- Before GREEN, task 3 was unchecked and focused `pnpm test src/modules/admin-access` produced truthful RED because `authorize-admin` was absent.
- GREEN focused result: `pnpm test src/modules/admin-access` — PASS, 4 files / 14 tests.
- Added real 2048-bit RSA fixture generation and application authorization tests; verifier tests cover real signature verification, rotated key refetch, malformed signature denial, and no-throw application denial.
- Production files: `src/modules/admin-access/application/authorize-admin.ts`, domain/infrastructure updates, `index.ts`; fixture/test files under `src/testing/access` and admin-access tests. Production authored count is 125 new-file lines plus 4 index additions = 129 lines.
- Remaining acceptance gaps: design §5.2 public contract names are not fully implemented (`createAuthorizeAdminRequest`, `decodeAccessToken`, `AccessSignatureVerifier` port, explicit denial reasons/config parsing); sequential miss throttling, stale refresh, timeout behavior, and RSA modulus rejection lack focused observations; workerd CryptoKey reuse was not run and is not claimed. No task checkbox completion is claimed.
- No full suite, lint, format, build, or native review lifecycle was run. No excluded surfaces, staging, commit, or push.
- Remaining exact unchecked task lines include task 3/B1a and later tasks; B1b remains out of scope.

## B1a fresh bounded correction — partial

- Added the public contract exports and compatibility aliases: `AdminAccessConfig`, `AdminDecision`, `DecodedAccessToken`, `AccessSignatureVerifier`, `decodeAccessToken`, `createAuthorizeAdminRequest`, `AccessKeyCacheCell`, `createAccessKeyCacheCell`, and `createWebCryptoAccessVerifier`.
- Hardened base64url decoding and audience claim shape validation; preserved the existing actor API and fail-closed authorization behavior.
- Focused GREEN/REFACTOR check: `pnpm test src/modules/admin-access` — PASS (4 files / 14 tests).
- Strict-TDD limitation: this bounded correction did not add the required new security edge-case tests before production edits, so no new RED evidence is claimed. The earlier RED remains recorded above.
- Cache path: existing cache stores plain per-isolate data (`Map<string, CryptoKey>` plus timestamps) and no Promise/I/O cell. No workerd harness was available or run; therefore CryptoKey cross-request reuse is unproven, and the required JWK-data fallback was not implemented.
- Exact remaining B1a gaps: explicit config-invalid/missing and dev-identity/allowlist behavior; malformed/expired/wrong audience or issuer/non-email/unlisted/service-token/CSRF edge-case observations; miss throttling and stale refresh; timeout/key-source handling; 2048-bit RSA rejection; Node CryptoKey reuse evidence; workerd evidence or JWK fallback; strict RED evidence for each new case. Task 3 remains unchecked.
- Production scope is limited to the admin-access module and its tests/fixtures; no `src/app/**` files were touched. No full gate, commit, stage, push, or PR was performed.

## B2a-a media core implementation — partial

- Strict TDD RED: focused media tests failed before implementation because the media core and fake modules were absent.
- GREEN: added pure magic-byte identification for JPEG/PNG/WebP, empty and 5 MiB size rejection, bounded dimensions, random `img/<uuid>.<ext>` keys, gallery reorder primitive, `ImageStorage` port, and immutable in-memory storage fake. Focused command passed: 2 files / 7 tests.
- REFACTOR: moved media constants/types to the domain layer to preserve dependency boundaries; focused command passed again with 2 files / 7 tests.
- Task 5 remains unchecked; nested task 5a remains unchecked because this bounded slice has not completed all acceptance evidence. Database schema, migration, metadata repository/transaction cleanup, and ownership parity are explicitly deferred to B2a-b.
- Runtime harness: N/A; no route or Worker runtime exists in this pure core slice. Rollback boundary is the listed media core, port/fake, focused tests, and nested task history only.
- Workload boundary: B2a-a pure media core, under the 400-production-line budget; B2a-b owns database schema/migration/repository and is not started. No commit, staging, push, or PR.

## B2a-a sole corrective rerun — partial

- Strict-TDD RED: focused media tests failed for missing upload boundary, immutable headers, VP8/VP8L dimensions, gallery target reorder, and contract coverage before production edits.
- GREEN/REFACTOR: added authorization-first `ImageByteSource` upload boundary, immutable response metadata policy, VP8/VP8L dimension parsing, target-index gallery reorder with non-mutating output, and contract/defensive-copy tests. Focused command `pnpm test src/modules/media src/testing/fakes/in-memory-image-storage.test.ts src/testing/contracts/media-storage.contract.test.ts` passes: 5 files / 14 tests.
- Exact verifier gaps still not fully closed: meaningful fixture matrix remains incomplete (JPEG, PNG, all WebP encodings at dimensions 1 and 10000, spoofed declared MIME/name, and empty/>5MiB cases are not all represented as focused fixtures); upload success metadata/use-case coverage is minimal; gallery acceptance lacks explicit cover-position and full reorder scenarios. No route, DB, R2, migration, or app work was added.
- Task 5 and nested task 5a remain unchecked because all first-slice acceptance evidence is not proven. This is the sole corrective rerun; stop partial rather than widening scope.
- Production authored changes remain well below 400 lines. Runtime harness: N/A (pure module). Rollback boundary: media domain/application/index plus focused fake/contract tests. No staging, commit, push, or PR.


## B2a-a correction 1/2 — media checklist evidence

- Native status consumed: `gentle-ai.sdd-status` v2, change `admin-catalog`, `applyState: ready`, `nextRecommended: apply`; repo-local edit roots honored. No DB, migration, R2, `src/app/**`, commit, staging, push, PR, or full gate.
- Item 1 RED: `pnpm test src/modules/media/domain/media-core.test.ts` failed with `ENOENT` for the JPEG fixture path before fixture mapping was corrected. GREEN/REFACTOR: focused media suite passed; committed local fixtures are genuine PIL-generated JPEG/PNG/WebP files, each 7x5, and the test decodes them via the real byte parser.
- Item 2 RED/GREEN/REFACTOR: upload tests cover valid WebP accepted independent of declared type/name, GIF/SVG/text/truncated bytes rejected, and existing size enforcement; focused suite `pnpm test src/modules/media src/testing/fakes/in-memory-image-storage.test.ts src/testing/contracts/media-storage.contract.test.ts` passed 5 files / 23 tests.
- Item 3 GREEN/REFACTOR: gallery tests cover required alt, duplicate rejection, seven-image rejection, and immutable serving headers; existing reorder test covers cover position zero and non-mutating reorder. Same focused suite passed.
- Item 4 GREEN/REFACTOR: added `MediaAssetRepository` port and in-memory fake; upload success records id/key/detected type/size/dimensions/actor/time and immutable model headers. Same focused suite passed.
- Item 5 RED/GREEN/REFACTOR: metadata insert failure test witnesses put then best-effort delete; storage failure behavior is covered by the upload boundary. Same focused suite passed. Cleanup failure is intentionally swallowed and leaves an operationally observable orphan.
- Production authored scope remains under 400 lines excluding `src/testing/**` and tests; exact tracked count is not authoritative while this slice's OpenSpec and media files are untracked. No task checkbox was marked: independent verifier evidence is still required before 5a can close, and parent task 5 remains deferred.
- Remaining gaps: independent verifier pass, explicit repository fake test file, and exact post-staging authored line count.

## B2a-a correction 2/2 — final bounded checklist attempt

- Native status consumed: `gentle-ai.sdd-status` v2, change `admin-catalog`, apply ready, repo-local workspace and allowed roots honored. No excluded surfaces, database/schema/migration/R2/route work, full gate, commit, staging, push, or PR.
- Strict-TDD RED/GREEN/REFACTOR evidence: before the correction, the focused media suite passed its existing 23 tests; the new storage-failure, cleanup-failure, and six-item gallery cases were then added and the focused command passed with 5 files / 26 tests. Exact command: `pnpm test src/modules/media src/testing/fakes/in-memory-image-storage.test.ts src/testing/contracts/media-storage.contract.test.ts`.
- Checklist item 1: genuine fixture provenance was independently checked with local Pillow: JPEG, PNG, and WebP each decode as their declared format at 7x5. The TypeScript tests still prove the server parser dimensions; no universal decoder or polyglot claim is made.
- Checklist item 2: byte-based rejection and declared-type mismatch acceptance remain covered; architecture-safe application port relocation was completed. The correction does not add a full declared filename/MIME input object or an exhaustive GIF/SVG/HEIC/HTML/polyglot matrix.
- Checklist item 3: separate six-item valid gallery/order coverage and prior duplicate, alt, maximum, and reorder immutability tests pass. Remaining concern: some prior negative assertions remain aggregate rather than one assertion per independent failure outcome.
- Checklist item 4: existing upload metadata assertions remain minimal and do not independently assert actual storage metadata and every immutable serving model field; no serving route exists in this authorized slice, so route evidence is explicitly N/A (B2b/F1 boundary).
- Checklist item 5: real focused cases now separately cover storage failure without repository insert, metadata failure with cleanup, and cleanup failure swallowed as `metadata-failed`; all pass.
- Architecture: `ImageStorage` now lives in `src/modules/media/application/image-storage.ts`; application upload imports it from the same layer and `src/modules/media/index.ts` re-exports it. The testing fake uses the application port directly.
- Task state: task 5 and nested 5a remain unchecked; no task checkbox was changed because the five-item checklist is not independently complete. Exact residuals are the item 2 exhaustive case matrix/declared input evidence, item 3 fully independent negative RED outcomes, item 4 complete success/storage metadata assertions plus route boundary, and the requested explicit repository fake test file/line-count proof.
- Runtime harness: N/A for pure media core; rollback boundary is the media application/domain/index changes and focused tests/fake only. Deferred ESLint runner timed out; no full gate was authorized or run.
