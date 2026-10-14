# Public Catalog Reader Specification

## Purpose

Defines the actorless, privacy-filtered read API in the `workshops` module that feeds every public catalog page (Talleres, Intensivos, Inicio, sitemap and structured data). It decides which activities are visible, which monthly period a taller shows, how turnos are ordered, which fields may leave the server, and how the system behaves while the catalog adapters are not yet wired.

Traceability: proposal scope items 1, 2, 12; owner decisions Q1, Q2, Q8; assumptions PA1 to PA5.

Dependencies (not modified here): the change-3 capabilities `monthly-workshops`, `intensive-workshops`, `workshop-periods`, `teachers` and `media-storage`. They are not archived on `main`, so this spec references them and writes no delta against them. The reader relies on their status vocabulary (visible = published or paused), their month key semantics (Cordoba month) and their turno model (weekday plus start and end time).

## Requirements

### Requirement: Actorless public access

The reader MUST be callable without an admin actor, session or identity. It MUST be a service separate from the admin catalog listing, and it MUST NOT expose any admin-only data, mutation or authorization path.

#### Scenario: Call without an actor

- GIVEN a request that carries no admin identity
- WHEN any public reader operation is invoked
- THEN it returns data (or an empty result) and never an authorization failure

#### Scenario: No mutation surface

- GIVEN the reader contract
- WHEN its operations are listed
- THEN every operation is a read and none accepts an actor argument

### Requirement: Visibility rule

The reader MUST return only activities whose status is `published` or `paused`. Activities in `draft`, `archived` or `cancelled` status MUST NOT appear in any list, lookup or slug enumeration. A `paused` activity MUST be returned with public status `paused`; a `published` activity with public status `open`.

#### Scenario: Only visible statuses listed

- GIVEN tallers in statuses draft, published, paused and archived
- WHEN the taller list is read
- THEN only the published and the paused taller are returned, with public status `open` and `paused` respectively

#### Scenario: Invisible slug lookup

- GIVEN an intensivo in status `cancelled` with slug "intensivo-demo"
- WHEN it is looked up by that slug
- THEN the result is "not found"

#### Scenario: Paused keeps its place

- GIVEN a paused taller and a published taller
- WHEN the taller list is read
- THEN both appear in the same ordering as any other visible taller (no separate group)

### Requirement: Intensivos expire by Cordoba date

The reader MUST hide an intensivo once its date is earlier than today's date in the America/Argentina/Cordoba time zone. An intensivo dated today MUST still be returned. The comparison MUST use the Cordoba calendar date, not the UTC date.

#### Scenario: Past intensivo hidden

- GIVEN an intensivo dated yesterday (Cordoba) in status published
- WHEN intensivos are listed or looked up by slug
- THEN it is absent from the list and the lookup returns "not found"

#### Scenario: Today still visible

- GIVEN an intensivo dated today (Cordoba) in status published
- WHEN intensivos are listed
- THEN it is returned

#### Scenario: Cordoba boundary near UTC midnight

- GIVEN the current instant is 01:00 UTC on day D+1, which is 22:00 on day D in Cordoba
- AND an intensivo is dated D
- WHEN intensivos are listed
- THEN the intensivo is still returned

### Requirement: Intensivos ordering

Listed intensivos MUST be ordered by date ascending (nearest first), then by start time ascending, then by name ascending. The reader SHOULD support limiting the number of returned intensivos for Inicio.

#### Scenario: Nearest first

- GIVEN visible intensivos dated 20 Nov, 5 Nov and 12 Nov
- WHEN intensivos are listed
- THEN they appear in the order 5 Nov, 12 Nov, 20 Nov

#### Scenario: Same date tie-break

- GIVEN two intensivos on the same date starting at 15:00 and 10:00
- WHEN intensivos are listed
- THEN the 10:00 one comes first

#### Scenario: Limit

- GIVEN five visible upcoming intensivos
- WHEN the list is read with a limit of 3
- THEN the three nearest are returned

### Requirement: Monthly offering period selection

For each visible taller the reader MUST select at most one monthly offering period using this rule: the period for the current Cordoba month if that month is open; otherwise the earliest open period for a later month; otherwise none. Periods for past months MUST NOT be selected. When a period is selected, the taller's fee, turno capacities and period project MUST come from that period only. When none is selected, the taller's offering MUST be null, and the reader MUST NOT substitute any default fee.

#### Scenario: Current month open

- GIVEN today is in October (Cordoba) and the October and November periods are both open
- WHEN the taller is read
- THEN the offering is the October period

#### Scenario: Current month not open, next open

- GIVEN today is in October (Cordoba), the October period is not open and the November period is open
- WHEN the taller is read
- THEN the offering is the November period

#### Scenario: Earliest later open month

- GIVEN today is in October (Cordoba), October is not open, and both November and December are open
- WHEN the taller is read
- THEN the offering is the November period

#### Scenario: No open month

- GIVEN no open period for the current or any later month
- WHEN the taller is read
- THEN the offering is null and no fee is returned

#### Scenario: Past month ignored

- GIVEN only a September period is open and today is in October (Cordoba)
- WHEN the taller is read
- THEN the offering is null

#### Scenario: Month boundary uses Cordoba time

- GIVEN the current instant is 01:00 UTC on 1 November, which is 22:00 on 31 October in Cordoba
- AND October and November periods are both open
- WHEN the taller is read
- THEN the offering is the October period

### Requirement: Turno ordering and capacity

A taller's turnos MUST be ordered by weekday (Monday first, Sunday last), then by start time ascending. Each turno MUST carry its weekday, start time, end time and a capacity. The capacity MUST come from the selected offering period; when the offering is null, each turno's capacity MUST be null.

#### Scenario: Ordering

- GIVEN turnos Wednesday 18:00, Monday 18:00 and Monday 10:00
- WHEN the taller is read
- THEN the turnos appear as Monday 10:00, Monday 18:00, Wednesday 18:00

#### Scenario: Capacity from the offering

- GIVEN a selected period that sets capacity 8 for a turno
- WHEN the taller is read
- THEN that turno carries capacity 8

#### Scenario: Capacity without an offering

- GIVEN a taller with no selected period
- WHEN the taller is read
- THEN every turno has capacity null

### Requirement: Seats contract

Every public taller turno and every public intensivo MUST carry a capacity (or null where specified above) and an `available` field. Until the enrollment change exists, `available` MUST be null for all of them. The reader MUST NOT derive `available` from capacity.

#### Scenario: Available is unknown

- GIVEN a taller turno with capacity 8 and an intensivo with capacity 12
- WHEN the public read models are built
- THEN both carry `available` equal to null

#### Scenario: Capacity is not availability

- GIVEN any read model with a numeric capacity
- WHEN `available` is read
- THEN it is not equal to the capacity

### Requirement: Public projection and privacy allowlist

The public read models MUST be built from an explicit allowlist of fields. A public taller MAY carry: slug, name, summary, description, technique, teacher name, teacher bio line, images, public status, turnos, offering (period key and fee) and project (title, description, images). A public intensivo MAY carry: slug, name, summary, description, teacher name, teacher bio line, date, start time, end time, price, deposit, capacity, minimum seats, policy text, materials-included flag, images, public status and `available`. The public models MUST NOT carry any teacher commission percentage, modality, teacher phone, teacher email, audit field (creator, updater, timestamps of edits), period snapshot field, or any draft data. Images MUST be exposed with their alt text and the information needed to render them, and MUST NOT expose storage internals beyond what is needed to render them.

#### Scenario: Fully populated fixture serialization (taller)

- GIVEN a taller whose stored record has every field populated, including percentage, modality, teacher phone and email, updatedBy and a period snapshot
- WHEN the public taller is serialized to JSON
- THEN the output contains no key or value for percentage, modality, teacher phone, teacher email, updatedBy or snapshot data

#### Scenario: Fully populated fixture serialization (intensivo)

- GIVEN an intensivo whose stored record has every field populated, including percentage, modality and audit fields
- WHEN the public intensivo is serialized to JSON
- THEN the output contains no key or value for percentage, modality or any audit field

#### Scenario: Teacher exposure

- GIVEN a teacher with name, bio line, phone and email
- WHEN a taller or intensivo with that teacher is read
- THEN only the teacher's name and bio line are present in the result

#### Scenario: Draft data stays out

- GIVEN a published taller with a draft-only period project not yet attached to the selected offering
- WHEN the taller is read
- THEN the project is null and no draft content is present

### Requirement: Lookup by slug

The reader MUST provide a lookup of one visible taller by slug and one visible intensivo by slug, returning "not found" for unknown, invisible or expired slugs. Slug matching MUST be exact.

#### Scenario: Known visible slug

- GIVEN a published taller with slug "ceramica-inicial"
- WHEN it is looked up by "ceramica-inicial"
- THEN the public taller is returned

#### Scenario: Unknown slug

- GIVEN no activity with slug "no-existe"
- WHEN it is looked up
- THEN the result is "not found" and no error is raised

#### Scenario: Slug is not cross-type

- GIVEN a taller with slug "abc"
- WHEN an intensivo is looked up by "abc"
- THEN the result is "not found"

### Requirement: Taller listing order

The reader MUST return the visible talleres ordered by name ascending using Spanish-aware, case- and accent-insensitive comparison, so that the "first N visible talleres" is deterministic. The reader SHOULD support limiting the number of returned talleres.

#### Scenario: Name order

- GIVEN visible talleres "Pintura", "acuarela" and "Ceramica"
- WHEN the list is read
- THEN the order is "acuarela", "Ceramica", "Pintura"

#### Scenario: First three

- GIVEN five visible talleres
- WHEN the list is read with a limit of 3
- THEN the first three by name are returned

### Requirement: Visible slug enumeration

The reader MUST provide an enumeration of the slugs of all visible talleres and all visible, non-expired intensivos, for sitemap generation. It MUST NOT include slugs of invisible or expired activities.

#### Scenario: Enumeration matches visibility

- GIVEN one published taller, one paused intensivo, one draft taller and one past intensivo
- WHEN the slugs are enumerated
- THEN exactly the published taller and the paused intensivo are listed

### Requirement: Fail-soft placeholder

Until the real catalog adapters are wired, the application MUST provide a reader that returns empty lists, an empty slug enumeration and "not found" for every lookup. Public pages MUST NOT return a 5xx status because of the placeholder. Unexpected infrastructure errors from a real adapter MUST surface to the public error boundary (status 500 without internals) and MUST NOT be swallowed as empty results.

#### Scenario: Placeholder returns empty

- GIVEN the placeholder reader is wired
- WHEN lists, lookups and slug enumeration are invoked
- THEN lists are empty, lookups are "not found" and enumeration is empty

#### Scenario: Real adapter failure is not hidden

- GIVEN a wired adapter whose database query fails
- WHEN a public page loader calls the reader
- THEN the error propagates to the error boundary (500, Spanish copy, no internal message) and is not rendered as an empty state

### Requirement: Adapter parity

The in-memory fake and the database-backed adapter MUST satisfy the same contract suite, covering visibility, expiry, offering selection, turno ordering, ordering of lists, slug lookup and the privacy allowlist.

#### Scenario: Same suite, both adapters

- GIVEN the shared reader contract suite
- WHEN it runs against the fake and against the database-backed adapter
- THEN both pass the identical cases
