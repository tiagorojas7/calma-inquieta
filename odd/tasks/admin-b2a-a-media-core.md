# Admin B2a-a: pure media core

- Feature: `admin-b2a-a-media-core` (ODD, not SDD). Change 3 `admin-catalog`, BACK slice B2a-a (`tasks.md` item 5, sub-item 5a).
- Branch: `feat/admin-catalog-b2a-media`, rebased onto `origin/main` `14363b4`. Starts from the partial WIP commit `5832b9c` (17 files, about 104 production lines).
- Route: delegated direct, one bounded writer, task by task. Trigger evidence: 4+ production files, 8+ test and fixture files, and preparatory reading of design, spec and WIP.
- TDD: strict. Source: `AGENTS.md` ("Strict TDD") and the task prompt. Runner: `corepack pnpm test src/modules/media src/testing`, focused as `corepack pnpm test src/modules/media src/testing/media src/testing/fakes src/testing/contracts`. Plus `corepack pnpm typecheck` and `corepack pnpm lint` before each commit. No full gate (the parent schedules it).
- Delivery: one PR to `main`; the parent squashes the history into one `feat(media): ...` commit. Production ceiling 400 authored changed lines vs `14363b4` (non-test files outside `src/testing`). Hard stop for this writer.
- Engram mirror: `odd/admin-b2a-a-media-core/tasks` (pending; saved by the parent).

## Objective

Ship the pure, fail-closed core of image handling that the B2a-b persistence slice and the F1 upload and serving routes will wire: strict byte, type, size and dimension validation, random storage keys, the `ImageStorage` port with its in-memory fake and shared contract suite, the upload use case over the ports, and gallery ordering primitives. Nothing is wired into the Worker in this slice.

## Scope

- IN: `src/modules/media/**`, `src/testing/media/**`, the media fakes in `src/testing/fakes/**` and contracts in `src/testing/contracts/**`, this document.
- OUT (B2a-b and later): database schema, migrations, Drizzle repository, schema-ownership and migration-journal tests, `MediaAssetRepository` contract parity against Postgres, the R2 adapter, `src/platform/**`, `src/composition/**`, `drizzle/**`, `workers/**`, `src/app/**`, other modules, `package.json`, lint config.

## Spec decision (binding)

`specs/media-storage/spec.md`, requirement "Type detection by content": the type is decided ONLY from the first bytes. The file name and the declared content type MUST NOT decide it, and the stored content type is the detected one. Scenario "Declared type mismatch": a WebP declared as `image/png` is ACCEPTED and stored as `image/webp`. A declared mismatch is never a rejection reason. The use case therefore takes bytes only and ignores any name or type the caller carries.

## Sources (read-only, planning worktree `CalmaInquieta-plan/openspec/changes/admin-catalog/`)

- `tasks.md` line 37 (item 5, B2a) and line 38 (item 5a, B2a-a): strict byte, type, size, dimension validation; random keys; `ImageStorage` port and in-memory fake; gallery ordering primitives. Schema, migrations, repositories and ownership parity are deferred to 5b.
- `design.md`:
  - lines 253-261 server rules in order: non-empty, at most `MAX_IMAGE_BYTES` (single constant), magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF????WEBP`; SVG, GIF, HEIC rejected whatever the name or declared type), then width and height from header bytes (PNG IHDR; JPEG SOF0-SOF3; WebP `VP8 `, `VP8L`, `VP8X`), each 1 to 10000.
  - lines 263-265 keys and metadata: `id = crypto.randomUUID()`, key `img/<id>.<ext>`, file name never used; `put` first then insert; a put failure leaves no row; an insert failure triggers a best-effort `delete`.
  - lines 267-271 serving contract (headers, file-name regex `^[0-9a-f-]{36}\.(jpg|png|webp)$`); the read model for serving is the `MediaAsset` (`fileName`, `src`, `contentType`).
  - lines 496-508 upload sequence: `requireAdminActor`, non-empty, size, magic bytes, dimensions, `put`; put failure gives `storage-unavailable` with no row; an insert failure triggers a best-effort `delete` and the original error is thrown (admin error state).
  - lines 650-670 contracts: `MAX_IMAGE_BYTES`, `MAX_UPLOAD_REQUEST_BYTES`, `MAX_GALLERY_IMAGES = 6`, `MediaAsset`, `UploadError`, `validateGallery`, ports.
  - line 978 unit matrix: sniff table; dimension parsing (PNG, JPEG baseline and progressive, WebP lossy, lossless, extended, corrupt); size boundaries (exactly 5 MiB accepted, +1 byte rejected, 0 rejected); key without a file name; `validateGallery`.
  - line 1029 T16: polyglot, SVG, HTML renamed `.jpg` and HEIC give a rejection (`unsupported-type`).
- `specs/media-storage/spec.md`: Type detection by content (incl. "Declared type mismatch"), Size limit, Storage port and keys, Metadata record, Activity image gallery (at most 6, first is cover, reorder changes the cover, seventh refused with the six unchanged).
- Existing WIP on the branch: `src/modules/media/**`, `src/testing/{media,fakes,contracts}/**`.

## Constraints

- Domain and application import no packages (`AGENTS.md` dependency rule); `testing` may import anything.
- Fail closed: never trust the file name or the declared type; never put the original file name in a storage key; any byte shape that cannot be parsed is rejected.
- Allowed paths only (see Scope). No push, PR, fetch, rebase, stash, reset or branch switching. Stage explicit paths only; untracked `odd/tasks/ds-f0-pilot.md`, `return.txt`, `tmp/` are never touched.
- One Conventional Commit per task; no `Co-Authored-By` and no AI attribution. About 400 authored lines per task is a planning heuristic only.

## Error vocabulary

- `empty`, `too-large` (with `limitBytes`), `unsupported-type` (magic bytes not JPEG, PNG or WebP, or a WebP whose RIFF size exceeds the file), `unreadable-dimensions` (recognised magic but header cannot be parsed or is outside 1 to 10000), `storage-unavailable`, `denied`.
- Truncated or corrupt headers: if the magic bytes are intact the reason is `unreadable-dimensions`; if they are not, `unsupported-type`.

## Tasks

- [x] T0. Plan: this document. Commit `docs(odd): plan admin b2a-a media core`.
- [x] T1. Sniff and fixtures. Table: genuine JPEG, PNG, WebP fixtures give the detected type through `validateImageBytes`; HEIC, HTML or text renamed `.jpg`, SVG (plain and XML prolog), GIF87a and GIF89a, BMP, RIFF WAVE and AVI, polyglots (GIF header plus HTML, HTML-first JPEG name), empty, truncated signatures give a rejection; WebP whose RIFF size exceeds the file is not accepted. Commit `feat(media): sniff image types from magic bytes`.
- [x] T2. Dimension parsers. PNG (IHDR check), JPEG baseline and progressive (marker walk, thumbnail inside APP1 not mistaken for the frame), WebP lossy, lossless, extended (real fixtures plus synthetic boundary builders), range 1 to 10000 per format, corrupt and truncated input. Commit `feat(media): parse image dimensions strictly`.
- [x] T3. Size boundaries. Exactly 5 MiB accepted, +1 byte rejected with `limitBytes`, 0 rejected, nothing stored on rejection. Commit `feat(media): enforce the single image size limit`.
- [x] T4. Upload use case and metadata. Random key format, no original name in the key, distinct keys for the same name, arguments to `put`, persisted metadata fields, serving read model, declared-type mismatch accepted end to end, rejection table end to end with nothing stored, authorization before any read. Commit `feat(media): upload validated images with random keys`.
- [x] T5. Cleanup. Insert failure removes the stored object and rethrows the original error; delete failure after insert failure is swallowed; put failure leaves no object, no row and no delete; key collision on put never deletes the existing object. One test and one RED per subcase. Commit `feat(media): remove the stored object when metadata insert fails`.
- [x] T6. Gallery. Move to index 0 makes the cover, ordering, immutability, fail-closed indices; `validateGallery` max count (6 accepted, 7 refused with the six untouched), duplicates, blank alt, unknown reference, each rejection separately. Commit `feat(media): validate and reorder activity galleries`.

## Progress and evidence

Commits: T0 `89807f2`, T1 `1c17d18`, T2 `95dd850`, T3 `870d02b`, T4 `96d6a0b`, T5 `3441344`, T6 `ca9cc03`. Status: all tasks done; the parent schedules the full gate and squashes.

Environment note: the WIP was not lint or type clean (39 ESLint errors, 14 `tsc` errors under `noUncheckedIndexedAccess`). T1 also makes every touched WIP file lint and type clean without changing behavior (byte accessor, `Promise.resolve` test doubles, no non-null assertions). The fakes gained call recording and failure switches (`failPut`, `failDelete`, `failInsert`) so tests need no hand-written async doubles. `corepack pnpm typecheck` and `lint` are slow on this shared machine (about 10 minutes under load).

### T1 sniff and fixtures

- Fixtures: `fixture.jpg|png|webp` (7x5, from the WIP) verified decodable with Pillow 11.3 (`Image.open().load()`), plus new real files `fixture-progressive.jpg` (9x4, SOF2), `fixture-lossless.webp` (6x3, `VP8L`), `fixture-extended.webp` (8x2, `VP8X`). Loader and the shared `nonImageSamples` table: `src/testing/media/fixtures.ts`.
- RED: `corepack pnpm test src/modules/media/domain` gave `1 failed | 27 passed`; decisive line `AssertionError: expected 'image/webp' to be null` at `media-core.test.ts:27` (a WebP whose RIFF size exceeds the file was accepted). The other 27 cases (real files detected, 16 rejection samples: text/HTML renamed `.jpg`, SVG, GIF87a/89a, GIF+script polyglot, HTML wrapping JPEG magic, HEIC, BMP, PDF, RIFF WAVE/AVI, truncated JPEG, PNG and RIFF signatures) are CHARACTERIZATION tests: they already passed against the WIP.
- GREEN: RIFF size check in `identifyImage`; the WIP upload test that used a fake `RIFFxxxx` WebP now uses the real fixture. 76 focused tests pass; `typecheck` and `lint` clean.

### T2 dimension parsers

- Tests: `media-core.test.ts` "dimension parsing": exact sizes of 6 real files (JPEG baseline 7x5, JPEG progressive 9x4, PNG 7x5, WebP lossy 7x5, lossless 6x3, extended 8x2); per format (PNG, JPEG baseline, JPEG progressive via SOF2, WebP lossy, lossless, extended) built with `src/testing/media/builders.ts`: 1x1, 300x200, 10000x10000, 1x10000 accepted and 10001x5, 5x10001, 12000x12000 rejected; zero width or height rejected for PNG, JPEG and lossy WebP (lossless and extended store size minus one so zero is unrepresentable); EXIF thumbnail trap; lossy scale bits; lossless 14-bit packing; 14 corrupt or truncated headers give `null`.
- RED: `corepack pnpm test src/modules/media/domain` gave `12 failed | 82 passed (94)`. Decisive lines: `expected { width: 6, height: 129 } to deeply equal { width: 6, height: 3 }` (real lossless WebP read with the wrong bit layout); `expected { width: 2, height: 2 } to deeply equal { width: 300, height: 200 }` (EXIF thumbnail frame taken for the image); `expected null to deeply equal { width: 7, height: 5 }` (lossy scale bits); `expected { width: 7, height: 5 } to be null` (PNG without IHDR, lossy without start code, truncated JPEG frame). The 82 passing cases (range table for PNG, JPEG, lossy and extended, real PNG/JPEG/lossy/extended sizes, other corrupt inputs) are CHARACTERIZATION. The WIP test that asserted the wrong VP8L layout (`byte 21 = 99` gives width 100) was removed because it encoded the bug.
- Test defect found while going GREEN: the "PNG first chunk is not IHDR" patch wrote `0x49`, which is the original `I`; fixed to `0x41` and re-observed.
- GREEN: segment-walking JPEG parser, IHDR length and type check for PNG, 14-bit masked lossy size with start-code check, 14-bit packed lossless size with signature check, per-chunk length guards. 142 focused tests pass; `typecheck` and `lint` clean.

### T3 size boundaries

- Tests: `media-core.test.ts` "size limit" (empty rejected; exactly 5 MiB JPEG accepted; +1 byte `too-large`; an oversized non-image is `too-large` before sniffing) and `upload.test.ts` "size limit" (the constant equals 5 MiB; JPEG, PNG and WebP padded to exactly 5 MiB are accepted with exact metadata; the same three at +1 byte give `{ kind: "too-large", limitBytes: 5242880 }` with no `put` and no insert; zero bytes give `empty` with nothing stored).
- RED: `corepack pnpm test src/modules/media/application/upload` gave `3 failed | 27 passed`; decisive diff `- "limitBytes": 5242880` (the use case dropped the limit that `UploadError` requires). The boundary cases (exact limit accepted, empty, no storage on rejection) are CHARACTERIZATION.
- GREEN: the use case maps `too-large` to `{ kind, limitBytes: MAX_IMAGE_BYTES }`. 152 focused tests pass; `prettier --check`, `typecheck` and `lint` exit 0.

### T4 upload use case and metadata

- Tests (`upload.test.ts`, `media-core.test.ts` "storage identity"): metadata of six real files (JPEG baseline and progressive, PNG, WebP lossy, lossless, extended) asserted whole with `toEqual` (id is a v4 UUID, `fileName = <id>.<ext>`, `src = /imagenes/<fileName>`, content type, byte size, exact width and height, `createdBy`, `createdAt` from the injected clock) and equal to the persisted row; the single `put` call (key `img/<uuid>.webp`, detected content type, untouched bytes, readable back from storage); a WebP carried as name `Mi Foto Privada.jpg` and declared `image/png` is accepted as `image/webp` end to end (spec "Declared type mismatch") and its key contains none of the name parts; two uploads with the same name and bytes get distinct keys and nothing is overwritten; the serving read model (file name matches the serving regex, `src`, `immutableImageHeaders(...)["Content-Type"]` equals the detected type, the stored object has the same type); the full `nonImageSamples` table gives exactly `unsupported-type` and nothing is put, deleted or inserted; seven magic-bytes-OK-but-bad-header cases give `unreadable-dimensions`; HTML carried as `photo.jpg` / `image/jpeg` is `unsupported-type`.
- RED: `corepack pnpm test src/modules/media` gave `12 failed | 136 passed`. Decisive lines: `AssertionError: expected { …(9) } to deeply equal { …(9) }` for all six metadata cases (the WIP set `fileName` to the full key `img/<id>.<ext>`, `src` to `/imagenes/<id>.<ext>` only by slicing, and `createdAt` to `new Date()`); `expected 'img/eb4f163d-…' to be 'img/img/eb4f163d-…'` (put key versus asset file name); `expected 'img/b8dd635c-…' to match /^[0-9a-f-]{36}\.(jpg|png|webp)$/` (the serving read model did not satisfy the serving regex); `TypeError: createImageIdentity is not a function` (4 cases). Rejection tables, declared-type mismatch, distinct keys and unreadable-dimension cases are CHARACTERIZATION (they passed against the WIP).
- GREEN: `createImageIdentity` (random id, file name, key) replaces `createImageKey`; `uploadImage` now requires the repository and a `Clock`, builds the asset from the identity (no key slicing), and returns `Result<MediaAsset, ...>` instead of the WIP union with `{ key, type }`. 170 focused tests pass; `prettier --check`, `typecheck` and `lint` exit 0.
- Decision: the repository and clock are required; a no-repository variant that returned a bare key was removed because it let a stored object exist without metadata.

### T5 cleanup

- Four subcases, one test each (`upload.test.ts` "cleanup after a failure"), using the fakes' failure switches:
  1. insert fails: the stored object is deleted (`deleteCalls` equals the put key, storage empty, no metadata row) and the original insert error is rethrown (design lines 502-504: "throws -> admin error state").
  2. insert fails and the cleanup delete fails too: the insert error is still the one reported, the delete failure is swallowed.
  3. put fails: `storage-unavailable`, no insert attempt, no delete, no object, no row.
  4. put refused because the key is taken (`crypto.randomUUID` mocked): `storage-unavailable`, and the existing object is never deleted and keeps its bytes and type.
- RED, subcases 1 and 2: `corepack pnpm test src/modules/media/application/upload` gave `2 failed | 44 passed`; decisive line `AssertionError: promise resolved "{ ok: false, ... }" instead of rejecting` with `+ "kind": "metadata-failed"` (the WIP returned a `metadata-failed` error, a kind that is not in the design's `UploadError`, and the original error was lost).
- RED, subcases 3 and 4 passed against the WIP: they are CHARACTERIZATION tests. To prove they bite, a temporary mutant added `await storage.delete(key)` to the put-failure path: `4 failed | 42 passed`, with `expected [ Array(1) ] to have a length of +0 but got 1` for both subcases 3 and 4; the mutant was reverted before GREEN (file restored from a backup, `git diff` empty).
- GREEN: the insert failure path deletes best-effort and rethrows the cause; the `metadata-failed` kind is gone from the use case's result type. 171 focused tests pass; `prettier --check`, `typecheck` and `lint` exit 0.
- Not covered (B2a-b): a repository whose insert commits and then fails the acknowledgement would leave a row; the port has no `delete` and the Drizzle insert is a single statement, so a row cannot exist when `insert` rejects.

### T6 gallery

- Tests: `media-core.test.ts` "gallery ordering" (moving an index to 0 makes it the cover and is the default; four explicit moves; the cover changes only when the first position changes; input never mutated; a full gallery of six; nine fail-closed index cases; empty gallery has no cover) and `read-models.test.ts` "validateGallery" rewritten with real `buildMediaAsset` values instead of `{} as never`: the maximum is 6; empty gallery accepted; six known images accepted in order with the first as cover; a seventh image refused with exactly `too-many` and the six drafts untouched; a duplicate; blank, whitespace-only and tab alt text (three cases); unknown reference; every distinct problem reported in gallery order; `too-many` together with `duplicate`. Each rejection is asserted with the exact issue array, separately.
- RED: `corepack pnpm test src/modules/media` gave `6 failed | 170 passed`. Decisive lines: `TypeError: galleryCover is not a function` (3 cases); `AssertionError: expected [ 'b', 'a', 'c' ] to deeply equal [ 'a', 'b', 'c' ]` (fractional source index 1.5 was truncated and moved an item); `expected [ 'c', 'a', 'b' ] to deeply equal [ 'a', 'b', 'c' ]` (NaN target index moved an item to the front; a fractional target also failed). Everything else, including the whole `validateGallery` table, is CHARACTERIZATION (it passed against the WIP).
- GREEN: `reorderGallery` accepts only integer positions inside the gallery and otherwise returns the gallery unchanged; `galleryCover` returns the first image or `null`. Also added three JPEG tests (fill byte, TEM and restart markers before the frame) found by a focused coverage run (`vitest run src/modules/media --coverage`): media module 99.15 % statements, 98.01 % branches, 100 % functions and lines, above the 90 % gate.
- Final focused gate: 201 tests pass in 9 files; `prettier --check`, `typecheck` and `lint` exit 0.

## Result vs `14363b4`

- Production (non-test files outside `src/testing`): 261 changed lines (additions plus deletions): `media-core.ts` 154, `upload.ts` 70, `image-storage.ts` 13, `read-models.ts` 14, `media-assets.ts` 6, `index.ts` 4. Under the 400 ceiling.
- Tests and test support: 1130 changed lines across `*.test.ts` and `src/testing/**` (three real fixtures from the WIP, three new binary fixtures, `builders.ts`, `fixtures.ts`, fakes, contract).

## Open items for B2a-b and the parent

- `MediaAssetRepository` is `insert` and `findById`; the design lists `insert` and `findByIds`. B2a-b should reconcile it with the Drizzle adapter and the `MediaLookup` read port.
- The `ImageStorage` contract suite has two cases (round trip, unknown key). Delete and overwrite semantics are left for B2b because R2 `put` overwrites by default while the fake refuses a taken key.
- A WebP, PNG or JPEG whose header parses but whose pixel data is corrupt is accepted (no decoder in the pure core); the client re-encodes and the serving headers use `nosniff` plus a sandbox CSP.
- Truncated or corrupt headers with intact magic bytes report `unreadable-dimensions`; unrecognised magic bytes (including a WebP whose RIFF size exceeds the file) report `unsupported-type`.
- `uploadImage` rethrows the metadata insert error after cleanup (design lines 502-504); the F1 route maps a throw to the admin error state.
