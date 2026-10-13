# Media Storage Specification

## Purpose

Defines how images are uploaded, validated, stored in Cloudflare R2 behind an `ImageStorage` port, recorded in Postgres, and served with long-lived cache headers. Images serve workshops, intensivos, the monthly project and materials.

Source: proposal Scope #10; Approach 5; Risks "Malicious or oversized uploads"; Out of Scope (image transformations, video).

## Requirements

### Requirement: Admin-only upload

Only an admin actor MAY upload an image. An upload without a valid admin actor MUST be rejected before any bytes are written to storage or any metadata row is created. Upload goes through an admin action that is subject to the same-origin rule. (Source: proposal Scope #10, Approach 5)

#### Scenario: Non-admin upload

- GIVEN a request without a valid admin identity
- WHEN an upload is submitted
- THEN it is denied and nothing is stored

#### Scenario: Cross-origin upload

- GIVEN a valid admin and a foreign `Origin`
- WHEN the upload is submitted
- THEN it is rejected

### Requirement: Type detection by content

An upload MUST be accepted only when its first bytes identify JPEG, PNG or WebP. The file name and the declared content type MUST NOT decide the type. The stored content type MUST be the detected one. (Source: proposal Scope #10, Approach 5)

#### Scenario: Genuine PNG

- GIVEN a file with PNG signature bytes
- WHEN it is uploaded
- THEN it is accepted with content type `image/png`

#### Scenario: Renamed non-image

- GIVEN a text file named `photo.jpg` declared as `image/jpeg`
- WHEN it is uploaded
- THEN it is rejected with an unsupported-type error

#### Scenario: Disallowed image type

- GIVEN a GIF or SVG file
- WHEN it is uploaded
- THEN it is rejected

#### Scenario: Declared type mismatch

- GIVEN a WebP file declared as `image/png`
- WHEN it is uploaded
- THEN it is accepted as `image/webp`

### Requirement: Size limit

An upload larger than the size limit MUST be rejected and nothing stored. The limit value is decided in design (a larger server limit versus client-side resizing of phone photos is under consideration); this spec requires only that one limit exists, is configured in one place and is enforced on the server. Accepted types stay JPEG, PNG and WebP. An empty file MUST be rejected. (Source: proposal Approach 5; the value is "design decides", orchestrator default)

#### Scenario: Over the limit

- GIVEN a valid JPEG of the configured limit plus one byte
- WHEN it is uploaded
- THEN it is rejected with a size error and no object is written

#### Scenario: At the limit

- GIVEN a valid JPEG of exactly the limit
- WHEN it is uploaded
- THEN it is accepted

#### Scenario: Empty file

- GIVEN a zero-byte file
- WHEN it is uploaded
- THEN it is rejected

### Requirement: Storage port and keys

Storage MUST sit behind an `ImageStorage` port with an R2 adapter. Object keys MUST be content-addressed or random and MUST NOT be reused for different content. The key MUST NOT contain the original file name. An in-memory fake and a shared contract suite MUST cover the port. (Source: proposal Scope #10, Approach 5)

#### Scenario: Distinct uploads get distinct keys

- GIVEN two different images with the same file name
- WHEN both are uploaded
- THEN their keys differ and neither overwrites the other

#### Scenario: Original name not in key

- GIVEN a file named `Mi Foto Privada.jpg`
- WHEN it is stored
- THEN the key does not contain that name

#### Scenario: Port parity

- GIVEN the shared storage contract suite
- WHEN it runs against the fake and the R2 adapter (local simulation)
- THEN every case passes for both

### Requirement: Metadata record

Each stored image MUST have a metadata row with id, storage key (unique), content type, byte size, optional width and height, creator email and creation time. A failed storage write MUST NOT leave a metadata row, and a failed metadata write MUST NOT leave an orphan that is referenced. (Source: proposal Data model `media_asset`)

#### Scenario: Metadata recorded

- GIVEN an admin uploads a valid image
- WHEN the upload completes
- THEN a row exists with the detected type, size and her email

#### Scenario: Storage failure

- GIVEN the storage write fails
- WHEN the upload runs
- THEN no metadata row exists and the admin sees an upload error

#### Scenario: Duplicate key refused

- GIVEN a metadata row with key K
- WHEN another row with key K is inserted
- THEN the repository refuses

### Requirement: Alt text where used

Alt text is required wherever an image is attached to a record (workshop, intensivo, project image, material). The attaching use case MUST reject an image without non-empty alt text. (Source: proposal Scope #10)

#### Scenario: Attach without alt

- GIVEN an uploaded image and a workshop
- WHEN the image is attached with empty alt text
- THEN the use case rejects

### Requirement: Activity image gallery

A monthly workshop, an intensivo and a monthly project MUST each hold at most 6 images. The first image in order MUST be the cover. Images MUST be reorderable, and reordering MUST change the cover when the first position changes. Adding a seventh image MUST be refused. (Source: spec-level rule, orchestrator default the owner may override; proposal Scope #10 and D4 do not set a count)

#### Scenario: Seventh image refused

- GIVEN a workshop with 6 images
- WHEN the admin adds another
- THEN the use case refuses and the 6 images are unchanged

#### Scenario: Cover is the first image

- GIVEN a workshop with images A, B, C in that order
- WHEN the cover is read
- THEN it is A

#### Scenario: Reorder changes the cover

- GIVEN images A, B, C
- WHEN the admin moves C to the first position
- THEN the order is C, A, B and the cover is C

### Requirement: Serving

Stored images MUST be served by a resource route outside `/admin` (so change 4 can reuse it) with `Cache-Control: public, max-age=31536000, immutable`, the stored content type and `X-Content-Type-Options: nosniff`. An unknown id MUST answer 404 without a body that reveals storage details. Serving MUST NOT depend on the admin identity. (Source: proposal Scope #10, Approach 3 "Images", Approach 5; while on `workers.dev`, Access still protects the host)

#### Scenario: Known image

- GIVEN a stored image
- WHEN its route is requested
- THEN the body is the image with the long-lived cache header, its content type and `nosniff`

#### Scenario: Unknown id

- GIVEN an id that does not exist
- WHEN requested
- THEN the response is 404 with no storage key or bucket name

#### Scenario: Metadata exists but object is gone

- GIVEN a metadata row whose object is missing in storage
- WHEN requested
- THEN the response is 404 and the error is logged without secret values

### Requirement: No automatic cleanup

Objects no longer referenced MUST NOT be deleted automatically in this change. Replacing an image on a record MUST create a new asset and MUST NOT mutate the previous one. (Source: proposal Approach 5)

#### Scenario: Replace image

- GIVEN a workshop with image A
- WHEN the admin sets image B
- THEN A's object and metadata remain unchanged

### Requirement: Configuration

The bucket binding MUST be declared in the Worker configuration and MUST be absent from public configuration. When the binding is missing, upload MUST fail with a visible error and serving MUST answer 404; neither MUST crash unrelated pages. (Source: proposal Approach 5, Owner runbook R1)

#### Scenario: Binding missing

- GIVEN the Worker runs without the R2 binding
- WHEN an admin uploads
- THEN a clear error is shown
- AND other admin pages still work

### Requirement: Repository contract parity

The `MediaAssetRepository` contract suite MUST pass against the in-memory fake and the Drizzle adapter. (Source: proposal Success Criteria)

#### Scenario: Both pass

- GIVEN the shared contract suite
- WHEN it runs against both
- THEN every case passes
