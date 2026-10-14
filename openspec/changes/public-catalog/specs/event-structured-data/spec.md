# Event Structured Data Specification

## Purpose

Defines schema.org `Event` JSON-LD for intensivos and the rules for any structured data on monthly talleres. It extends the safe-serialization approach of the LocalBusiness JSON-LD in `seo-foundation`.

Traceability: proposal scope item 8, baseline "datos estructurados para negocio y eventos"; owner decision Q1 (unknown seats). The exact schema.org enumeration values for availability and the exact fields Google currently requires are verified in design against current documentation; this spec states the observable mapping.

Dependencies (not modified here): `intensivos-pages`, `public-catalog-reader`, `seo-foundation` (business profile, site base URL, serialization).

## Requirements

### Requirement: One Event per intensivo detail page

Each visible, non-expired intensivo detail page MUST include exactly one `application/ld+json` object of type `Event`, built from the public read model and the business profile. Pages that answer 404 MUST NOT include one. Whether `/intensivos` also emits a list of events is left to design and is not required.

#### Scenario: One object

- GIVEN a visible intensivo detail page
- WHEN the page's JSON-LD scripts are parsed
- THEN exactly one object of type `Event` exists for that intensivo

#### Scenario: 404 emits none

- GIVEN a request for an unknown or invisible intensivo slug
- WHEN the 404 page renders
- THEN no `Event` JSON-LD is present

### Requirement: Required Event fields

The `Event` object MUST include: `name` (the intensivo name), `description` (derived from the summary or description), `startDate` and `endDate` as ISO 8601 date-times that carry the Cordoba offset `-03:00` and combine the intensivo date with its start and end time, `eventStatus` set to the schema.org scheduled status, `eventAttendanceMode` set to the schema.org offline attendance mode, `location` as a `Place` with name and `PostalAddress` built from the business profile address, `organizer` built from the business profile name and site URL, `image` as one or more absolute URLs, and `offers`.

#### Scenario: Dates carry the Cordoba offset

- GIVEN an intensivo on 2026-11-14 from 10:00 to 12:30
- WHEN the Event is built
- THEN `startDate` is "2026-11-14T10:00:00-03:00" and `endDate` is "2026-11-14T12:30:00-03:00"

#### Scenario: Location from the profile

- GIVEN a business profile with a postal address
- WHEN the Event is built
- THEN `location` is a `Place` whose `PostalAddress` fields come from that profile and from no other source

#### Scenario: Mode and status

- GIVEN any visible intensivo
- WHEN the Event is built
- THEN `eventAttendanceMode` is the offline attendance mode and `eventStatus` is the scheduled status

#### Scenario: Images are absolute

- GIVEN an intensivo with images
- WHEN the Event is built
- THEN every `image` entry is an absolute https URL

#### Scenario: Fallback image

- GIVEN an intensivo with no images
- WHEN the Event is built
- THEN `image` contains the absolute URL of the registered stand-in share image

### Requirement: Offers mapping

The `Event` MUST include one `offers` object with the intensivo price as a number or numeric string, `priceCurrency` "ARS", `url` set to the absolute canonical URL of the detail page, and an `availability` value. For an open intensivo the availability MUST be a purchasable schema.org value. For a paused intensivo it MUST be a non-purchasable schema.org value and MUST differ from the open value. The deposit MUST NOT be presented as the price. The object MUST NOT include `remainingAttendeeCapacity` while `available` is unknown, and MUST NOT mark the offer as sold out.

#### Scenario: Open offer

- GIVEN an open intensivo with price 45000
- WHEN the Event is built
- THEN `offers.price` equals 45000, `offers.priceCurrency` is "ARS" and `offers.url` is the absolute detail URL

#### Scenario: Paused offer

- GIVEN a paused intensivo
- WHEN the Event is built
- THEN `offers.availability` differs from the open value and is not a purchasable value

#### Scenario: Unknown seats

- GIVEN an intensivo with `available` null and capacity 12
- WHEN the Event is built
- THEN no `remainingAttendeeCapacity` key exists and the availability is not a sold-out value (`https://schema.org/SoldOut` is never emitted)

#### Scenario: Deposit is not the price

- GIVEN price 45000 and deposit 15000
- WHEN the Event is built
- THEN no `price` field in the object equals 15000

### Requirement: Event privacy

The `Event` object MUST be built from the public projection only and MUST NOT contain a percentage, modality, teacher phone, teacher email, audit field or snapshot value.

#### Scenario: Fully populated fixture

- GIVEN a fully populated intensivo fixture with internal fields
- WHEN the Event is built and serialized
- THEN the output contains none of the internal values

### Requirement: Safe serialization

The Event JSON-LD MUST be serialized with the same escaping as the LocalBusiness JSON-LD, so that no value can end the script element or inject markup.

#### Scenario: Script-breaking name

- GIVEN an intensivo name containing `</script><script>alert(1)</script>`
- WHEN the Event is serialized for embedding
- THEN the output contains no literal `</script>` sequence and parsing the JSON returns the original name

### Requirement: Monthly taller structured data

Monthly taller pages MUST NOT emit a single-occurrence `Event` with invented `startDate` or `endDate` values. Any structured data that design chooses for talleres (a recurring-schedule representation, a course representation, or none) MUST be built from the public projection only, MUST NOT include any fee when the offering is null, and MUST use the same safe serialization.

#### Scenario: No invented dates

- GIVEN a visible taller detail page
- WHEN its JSON-LD objects are parsed
- THEN none is an `Event` with a single `startDate` and `endDate` derived from a guessed date

#### Scenario: No fee without an offering

- GIVEN a taller whose offering is null
- WHEN its structured data is built
- THEN no price or offer is present

#### Scenario: Privacy

- GIVEN a fully populated taller fixture
- WHEN its structured data is built and serialized
- THEN no internal value (percentage, modality, teacher contact, audit, snapshot) appears

### Requirement: Structured data validity checks

Event JSON-LD MUST be covered by tests that assert the object shape (keys, types, offset), and the design MUST define a manual validation step against the current Google Rich Results code-snippet tool, because the preview URL is private.

#### Scenario: Shape test exists

- GIVEN the builder's test file
- WHEN it runs
- THEN it asserts the required keys, the `-03:00` offset and the paused and open availability difference
