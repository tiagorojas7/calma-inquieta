# Site Content Specification

## Purpose

Defines storage and access of static page content (D1), the business profile as the single source of facts, the stand-in asset registry, and the copy rules.

Traceability: proposal scope items 12, 13; decision D1 and its scope adjustment A5 (static page content is repository-managed, not panel-editable in v1); ADR-003 module pattern.

## Requirements

### Requirement: Typed content behind a module API

Content (business profile, page copy, values, FAQ, gallery, videos, trust claims, testimonials) MUST be stored as typed files in the repository and read only through the `site-content` module public API (`src/modules/site-content/index.ts`). Routes and components MUST NOT import the content data files directly. The module MUST follow the project's domain/application/infrastructure layering and define a reader port so storage can later change without touching routes.

#### Scenario: Access via API only

- GIVEN a route module
- WHEN lint or the architecture test checks its imports
- THEN it imports `site-content` only through its public entry

#### Scenario: Port substitution

- GIVEN an in-memory reader implementing the port
- WHEN the content use cases run with it
- THEN they return its data without touching repository files

### Requirement: Business profile as single source

`getBusinessProfile()` MUST return name, address (street, locality, region, country), Instagram handle and URL, WhatsApp number with provisional flag, and bajada. Footer, Contacto, JSON-LD, header CTA, and later `wa.me` messages and emails MUST read from it.

#### Scenario: Shape

- GIVEN the repository adapter
- WHEN `getBusinessProfile()` is called
- THEN the result has address "Albert Sabin 6079", locality Argüello, city Córdoba, and Instagram `calma.inquieta`

### Requirement: Optional facts absent until confirmed

Email, hours, non-WhatsApp phone and geo coordinates MUST be optional and `undefined` until the client confirms them. The domain MUST NOT allow a confirmed fact without a value, nor expose an unconfirmed value to consumers.

#### Scenario: Unconfirmed hidden

- GIVEN a raw profile with hours present but `confirmed: false`
- WHEN the profile is read through the API
- THEN `hours` is `undefined`

#### Scenario: Confirmed exposed

- GIVEN hours with `confirmed: true`
- WHEN the profile is read
- THEN `hours` has the value

### Requirement: Testimonial consent rule

A testimonial MUST be listed only if it records written consent. The listing function MUST exclude entries without consent.

#### Scenario: Excluded

- GIVEN two testimonials, one without consent
- WHEN the testimonial list is read
- THEN only the consented one is returned

### Requirement: Empty lists hide sections

Readers MUST return empty arrays (not null) for lists with no content so that consumers hide the section. Gallery items MUST have non-empty `alt`; content validation MUST fail otherwise.

#### Scenario: Empty array

- GIVEN no FAQ entries
- WHEN the FAQ reader is called
- THEN it returns `[]`

#### Scenario: Missing alt

- GIVEN a gallery item with empty alt that is not marked decorative
- WHEN validation runs
- THEN it fails with the item identifier

### Requirement: Approval markers

Drafted copy (history, value proposition, FAQ answers) MUST carry an `approved` marker. A query for unapproved content MUST be available to the launch checklist.

#### Scenario: Unapproved list

- GIVEN history marked unapproved
- WHEN the unapproved-content query runs
- THEN it includes the history entry

### Requirement: Copy rules

UI copy MUST be Spanish (Argentina) with voseo and "nosotras" voice. UI copy MUST NOT contain the word "workshop"; it MUST use "taller" and "taller intensivo". (Source: DMR R1, R2, R12; scope adjustment: resolved open decision on UI language.)

#### Scenario: Forbidden word

- GIVEN all content strings
- WHEN a test scans for "workshop" case-insensitively
- THEN no match is found

#### Scenario: Voseo sample

- GIVEN CTA strings in content
- WHEN scanned for tuteo imperatives from a deny list (for example "escríbenos")
- THEN none appear

### Requirement: Stand-in asset registry

A manifest MUST list every stand-in asset (logo raster, fonts, hero and gallery images, share image) with id, path, source/licence note and replacement requirement. A test MUST fail when a file in the stand-in folder is missing from the manifest or when a manifest entry has no file. The manifest MUST expose a "stand-ins remaining" count for the launch gate in a later change.

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

### Requirement: Mockups are not shipped

Mockup images MUST NOT be copied into `public/` or referenced by any page.

#### Scenario: No mockup paths

- GIVEN the built assets and content
- WHEN searched for `client-proposal/mockups`
- THEN no reference exists
