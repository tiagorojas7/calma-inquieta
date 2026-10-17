# Delta for Site Content

Unchanged: Typed content behind a module API, Business profile as single source, Optional facts absent until confirmed, Testimonial consent rule, Empty lists hide sections, Approval markers, Copy rules, Mockups are not shipped. The media registry itself is specified in the new `media-registry` capability.

## MODIFIED Requirements

### Requirement: Stand-in asset registry

A manifest MUST list every remaining stand-in asset (fonts, favicon if not yet replaced, catalog fallback image) with id, path, kind, source/licence note and replacement requirement. A test MUST fail when a file in the stand-in folder is missing from the manifest or when a manifest entry has no file. The manifest MUST expose a "stand-ins remaining" count for the launch gate, reported per kind: image-like kinds (`image`, `favicon`, `share-image`) separately from `font`. Curated media in the media registry MUST NOT be listed here. A page image MUST resolve to either a registered stand-in or a publishable media asset. The hero, About and share stand-ins (`hero-1`, `hero-2`, `hero-3`, `gallery-02`, `share-default`, `about-teaser`) MUST be retired: their manifest rows and files are removed once replaced by registry media. `gallery-01` MUST stay registered while it is the catalog fallback image.
(Previously: the manifest listed all stand-ins including hero and gallery images and the share image, and exposed one undifferentiated count.)

#### Scenario: Unlisted file

- GIVEN a file added to the stand-in folder without a manifest entry
- WHEN the registry test runs
- THEN it fails naming the file

#### Scenario: Dangling entry

- GIVEN a manifest entry whose file is absent
- WHEN the test runs
- THEN it fails naming the entry

#### Scenario: Source recorded

- GIVEN any manifest entry
- WHEN validated
- THEN it has non-empty source and replacement fields

#### Scenario: Count per kind

- GIVEN the manifest
- WHEN the stand-ins remaining count is read
- THEN it reports the image-like total and the font total separately

#### Scenario: Replaced stand-ins are gone

- GIVEN the repository after the content swap
- WHEN the manifest and `public/media/stand-ins/` are read
- THEN no row or file exists for `hero-1`, `hero-2`, `hero-3`, `gallery-02`, `share-default` or `about-teaser`

#### Scenario: Catalog fallback stays

- GIVEN the catalog still uses `gallery-01` as its fallback image
- WHEN the manifest test runs
- THEN `gallery-01` is listed and its file exists

#### Scenario: Page image is registered

- GIVEN every image rendered by Inicio, Quiénes somos and Contacto
- WHEN each source is looked up
- THEN each resolves to a stand-in manifest row or a publishable media registry variant, and none to both

## ADDED Requirements

### Requirement: Launch-gate stand-in criterion

The launch gate MUST evaluate image stand-ins separately from fonts. After this change (slice S5) the remaining image-like stand-ins MUST be exactly `gallery-01` (catalog fallback, retired in the follow-up after change 4). The `favicon` row MUST be retired once the favicon set is regenerated from `logo-calma-inquieta-sin-fondo`. The four font stand-ins MUST remain and be reported as fonts. A literal total of zero is not required by this change; the criterion is "zero image stand-ins except the catalog fallback still needed".

#### Scenario: Remaining image stand-ins

- GIVEN the manifest after S5
- WHEN the image-like stand-ins are listed
- THEN the list is exactly `["gallery-01"]`

#### Scenario: Fonts reported apart

- GIVEN the manifest after S5
- WHEN the fonts count is read
- THEN it is 4 and it is not included in the image count

#### Scenario: Favicon retired

- GIVEN the favicon files regenerated from the raster logo
- WHEN the manifest is read
- THEN no `favicon` row exists and the favicon files are not under `public/media/stand-ins/`

#### Scenario: Gate fails on a new image stand-in

- GIVEN a new image stand-in row is added
- WHEN the launch-gate criterion test runs
- THEN it fails naming the row, unless it is `gallery-01`

### Requirement: Favicon from the raster logo

The favicon set MUST be generated from the raster logo `logo-calma-inquieta-sin-fondo`, replacing the Instagram-profile stand-in. The root document MUST link only favicon files that exist. The set MAY be regenerated later if a vector logo arrives.

#### Scenario: Links resolve

- GIVEN the root document links
- WHEN each favicon href is checked against the file system
- THEN every file exists

#### Scenario: Source recorded

- GIVEN the favicon files
- WHEN their origin note is read
- THEN it names `logo-calma-inquieta-sin-fondo` as the source

### Requirement: Media readers on the module API

The `site-content` public API MUST expose readers for publishable media by area (hero, about gallery, teaser, contact, share image). Home, About and Contact content MUST reference registry entries by id, not by path. The About gallery MUST list the ten curated photos in the curation order, with reserve photos registered but not rendered. The module MUST NOT expose non-publishable assets.

#### Scenario: Gallery order

- GIVEN the About gallery reader
- WHEN it is called
- THEN it returns the ten curated photos in the curation order

#### Scenario: Reserves not shipped

- GIVEN reserve photos in the curation
- WHEN the About page renders
- THEN none of them is in the DOM

#### Scenario: Only publishable assets

- GIVEN a mix of granted and pending entries
- WHEN any media reader is called
- THEN pending face photos are never returned

### Requirement: Additive shared surfaces and protected catalog data

The `ImageRef` type MUST gain optional fields only. The catalog content file `src/modules/site-content/infrastructure/content/catalog.ts` and its `fallbackImage` MUST remain unchanged by this change.

#### Scenario: ImageRef is additive

- GIVEN every `ImageRef` literal on `main` before this change
- WHEN the project is type-checked after this change
- THEN every literal compiles unmodified

#### Scenario: Catalog fallback unchanged

- GIVEN the diff of each slice PR
- WHEN `catalog.ts` is looked up
- THEN it is absent from the diff
