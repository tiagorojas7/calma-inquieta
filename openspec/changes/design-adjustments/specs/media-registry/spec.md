# Media Registry Specification

## Purpose

Defines the curated media registry in `site-content`: which client photos and loops may ship, in which variants, with which alt text, and under which image rights. It owns the rights ledger (people, consent, exclusions) and the content gate that keeps unconsented or excluded media off the public site. It replaces low-resolution stand-ins with client material; the stand-in manifest keeps covering what is not yet replaced (see `site-content`).

Traceability: proposal scope items 1 and 2; owner decisions OD-1, OD-5, OD-6, OD-7, PD-6; slice S0.

## Requirements

### Requirement: Registry entry shape

Every curated asset MUST have exactly one registry entry with: a unique `id`, the `sourceId` of the client original, an `area` (one of `home`, `about`, `contact`, `share`, `brand`, `video`), a `kind` (`image` or `video`) and `alt` text. An image entry MUST also declare a `format` and one or more variants in ascending width with one aspect ratio; each variant MUST declare its file path, intrinsic `width` and `height`. A video entry MUST declare area `video`, `width`, `height`, `durationSeconds`, `audio: false`, its `sources` (path and MIME type) and the `posterId` of a registered image entry. Consent and people are NOT stored on the entry: they live in the rights ledger, keyed by the entry's `sourceId` (see Rights ledger). Alt text MUST be non-empty Spanish (Argentina) copy unless the entry is explicitly marked decorative. The registry MUST be typed, live behind the `site-content` public API and MUST NOT be imported by routes or components directly.

#### Scenario: Complete entry

- GIVEN a registry entry for a hero photo
- WHEN the registry validation runs
- THEN the entry has an id, source id, area, at least one variant with path, width and height, a format and non-empty alt, and its source id resolves to a ledger row or an exclusion

#### Scenario: Variant without intrinsic size

- GIVEN an image variant with no `width` or no `height`
- WHEN the registry validation runs
- THEN it fails naming the entry id and the variant path

#### Scenario: Missing alt

- GIVEN a non-decorative entry with an empty `alt`
- WHEN the registry validation runs
- THEN it fails naming the entry id

#### Scenario: Granted consent needs a source

- GIVEN a ledger row with `consent: granted` and no consent source
- WHEN the registry validation runs
- THEN it fails naming the entry id

#### Scenario: Duplicate ids

- GIVEN two entries sharing one id
- WHEN the registry validation runs
- THEN it fails naming the id

### Requirement: Rights ledger

The registry MUST carry a rights ledger with one row per client source id, shared by every crop of that source. A row holds `people` (`none`, `hands` or `faces`), `consent` (`not-required`, `granted` or `pending`) and, when consent is `granted`, a non-empty consent source (who, and the date of record). The ledger MUST record `consent: granted` for the four face photos `img-20261015-wa0030`, `img-20261015-wa0018`, `img-20260926-144641667-hdr` and `img-20260801-182047855-hdr`, with source "studio owner via project owner" and date 2026-10-16. It MUST record `people: hands` and `consent: not-required` for the hands-only photos `img-20261007-194043183-hdr`, `img-20260411-wa0106` and `img-20261015-wa0029` and for the catalog picks. Because consent and people exist only in the ledger, an entry cannot disagree with it.

#### Scenario: Face photos are granted

- GIVEN the ledger
- WHEN the four face source ids are looked up
- THEN each is `people: faces`, `consent: granted`, with a non-empty consent source and the date 2026-10-16

#### Scenario: Faces without a grant

- GIVEN a ledger row with `people: faces` and `consent: not-required`
- WHEN the registry validation runs
- THEN it fails naming the source id

#### Scenario: Hands-only photos

- GIVEN the hands-only source ids
- WHEN their ledger rows are read
- THEN each is `people: hands` and `consent: not-required`

### Requirement: Excluded sources can never be registered

The sources `img-20260808-130700502-hdr-portrait` (a person who is not the owner), `img-20260926-153632786-hdr` (a minor) and the video `VID_20260717_155248707` (a minor) MUST be on an exclusion list (each with a reason and decision date). No registry entry, ledger row, variant file or page reference MAY use an excluded source id, in any variant path or derived name. The exclusion test MUST fail when one appears, even if its ledger row were set to `consent: granted`.

#### Scenario: Excluded source registered

- GIVEN an entry whose `sourceId` is `img-20260926-153632786-hdr`, even with a ledger row of `consent: granted`
- WHEN the exclusion test runs
- THEN it fails naming the source id

#### Scenario: Excluded id in a ledger row

- GIVEN a ledger row whose `sourceId` is an excluded source id
- WHEN the exclusion test runs
- THEN it fails naming the source id

#### Scenario: Excluded name in a file path

- GIVEN a variant path containing `img-20260808-130700502-hdr-portrait`
- WHEN the exclusion test runs
- THEN it fails naming the path

#### Scenario: Clean registry

- GIVEN the shipped registry
- WHEN the exclusion test runs
- THEN no entry, ledger row or file under `public/media/` references an excluded id

### Requirement: Default consent is pending

A source with no ledger row MUST be treated as `pending`: its assets are not publishable. Adding an entry for a new photo, face or not, MUST NOT make it publishable without a ledger change. Registering a pending asset is allowed; it fails validation only when content references it, and it is listed as unpublished media in the launch gate until then.

#### Scenario: New photo without a ledger row

- GIVEN an entry whose source id has no ledger row
- WHEN the publishable check runs
- THEN the entry is not publishable, and content that references it fails validation with a missing-rights issue

#### Scenario: Consent flipped back

- GIVEN a granted face photo whose ledger row is changed to `pending`
- WHEN the publishable readers run
- THEN that photo is no longer returned, and neither is any other crop of that source

### Requirement: Content gate

An asset is publishable only when all hold: its source is not excluded; its source has a ledger row; and either the row is `consent: granted` with a consent source, or the row is `consent: not-required` with `people` other than `faces`. The gate MUST run twice. At build or CI time, content validation MUST fail for every image path (`src` and every `srcset` path, and the loop poster and sources) that is neither a registered stand-in nor a publishable media path, reporting `rights-missing` (no ledger row), `unpublishable-media` (excluded, pending, or faces without a recorded grant) or `unregistered-media`. At read time, the `site-content` readers MUST drop unpublishable optional entries: `publishedImages(images)` filters image lists, `isPublishedPath(path)` tests one path, and the three page readers (`getHomePage`, `getAboutPage`, `getContactPage`) drop an unpublishable loop, gallery entry or contact photo respectively. Required single slots (the hero still and the teaser image) are enforced by build or CI validation, not by a read-time fallback. No page, route, meta tag or preload MAY reference an unpublishable asset. Readers MUST return empty arrays, never null, when nothing is publishable.

#### Scenario: Pending face photo hidden

- GIVEN a source with `people: faces` and `consent: pending`
- WHEN `publishedImages` runs over images of that source
- THEN they are absent from the result

#### Scenario: Granted face photo shown

- GIVEN a source with `people: faces`, `consent: granted` and a consent source
- WHEN `publishedImages` runs over images of that source
- THEN they are returned

#### Scenario: No people

- GIVEN a source with `people: none` and `consent: not-required`
- WHEN `isPublishedPath` runs on its paths
- THEN it returns true

#### Scenario: Pending gallery entry dropped at read time

- GIVEN a gallery entry that points at a pending asset
- WHEN `getAboutPage` runs
- THEN the entry is absent from the result, and the asset is not in the DOM, the preload links or the meta tags

#### Scenario: Pending required slot fails validation

- GIVEN the hero still or the teaser image points at a pending, excluded or unrecorded asset
- WHEN content validation runs
- THEN it fails naming the asset

#### Scenario: Empty list

- GIVEN a list whose entries are all unpublishable
- WHEN `publishedImages` runs
- THEN it returns `[]`

### Requirement: File and entry parity

Every file under `public/media/` outside `stand-ins/` (and the root `/favicon.ico`) MUST have exactly one registry variant or video source, and every registry variant and source MUST have its file. File names MUST follow `/media/<area>/<id>-<width>.<hash8>.<ext>`, where `hash8` is the first 8 hex characters of the SHA-256 of the file bytes, so a byte change without a rename fails. The check MUST fail naming the orphan file or the dangling entry. Declared `width` and `height` MUST match the real image dimensions. Only shipped variants are committed; source originals MUST NOT be committed.

#### Scenario: Orphan file

- GIVEN a file under `public/media/home/` with no registry variant
- WHEN the parity test runs
- THEN it fails naming the file

#### Scenario: Dangling entry

- GIVEN a registry variant whose file is absent
- WHEN the parity test runs
- THEN it fails naming the entry id

#### Scenario: Declared size mismatch

- GIVEN a variant that declares 960 by 1200 while the file is 480 by 600
- WHEN the parity test runs
- THEN it fails naming the variant path

#### Scenario: Stand-ins are separate

- GIVEN files under `public/media/stand-ins/`
- WHEN the parity test runs
- THEN they are checked by the stand-in manifest test, not by the media registry parity test

### Requirement: Registry is not a stand-in

A registered media asset MUST NOT be counted as a stand-in and MUST NOT appear in the stand-in manifest. A page image MUST resolve to either a registered stand-in or a publishable media asset.

#### Scenario: No double bookkeeping

- GIVEN any id present in the media registry
- WHEN the stand-in manifest is read
- THEN that id is absent from it

### Requirement: Variants support responsive and art-directed use

Image entries used by art-directed slots MUST provide the variants those slots need: a 4:5 crop for phones and the native 3:4 frame for the desktop column, each as its own entry at the widths declared by the slot, in WebP. The share image MUST be a single JPEG of 1200 by 630 pixels. Each variant MUST declare its own `width` and `height`.

#### Scenario: Hero variants

- GIVEN the hero entries (phone and desktop)
- WHEN their variants are listed
- THEN a 4:5 variant set and a 3:4 variant set exist, and every variant has its own width and height

#### Scenario: Share image format

- GIVEN the share image entry
- WHEN its single variant is read
- THEN the format is JPEG and the size is 1200 by 630

### Requirement: Placement of the granted face photos

`img-20261015-wa0030` MAY be used in the hero and gallery slots where the curation placed it. `img-20261015-wa0018` and `img-20260926-144641667-hdr` (private events) MAY be registered with `consent: granted` but MUST NOT be rendered by any page in this change.

#### Scenario: Private-event photos are registered but unplaced

- GIVEN the registry and the rendered Inicio, Quiénes somos and Contacto
- WHEN the DOM and the loaders are scanned for those two source ids
- THEN both exist in the registry as granted and neither is rendered
