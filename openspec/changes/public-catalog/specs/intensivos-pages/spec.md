# Intensivos Pages Specification

## Purpose

Defines the public intensivo pages: the listing at `/intensivos` and the detail at `/intensivos/:slug`. They replace the "Próximamente" placeholder for `/intensivos` and render data from the public catalog reader (see `public-catalog-reader`). Structured data for these pages is defined in `event-structured-data`.

Traceability: proposal scope items 5, 6, 10, 11; owner decisions Q1, Q3, Q5, Q6, Q7, Q9, Q10; mockup image8 as a visual reference only. UI copy is es-AR with voseo, never uses the word "workshop", and comes from `site-content`. Fixtures use neutral invented data.

Dependencies (not modified here): `public-catalog-reader`, `public-layout`, `seo-foundation`, `site-content`, `design-system`, and the change-3 capability `intensive-workshops`.

## Requirements

### Requirement: Intensivos listing content

`/intensivos` MUST render exactly one `h1` "Talleres intensivos", an intro text, and a list with one card per visible, non-expired intensivo returned by the reader, in the reader's order (nearest date first). Each card MUST show a date badge (weekday, day and month, in Spanish), the name, the duration derived from the time range, the teacher name, the price, the deposit labelled "Seña", the seats indicator per its rule, a "Materiales incluidos" badge only when the intensivo has materials included, and a link to `/intensivos/:slug`. The page MUST show a policy note that displays the intensivo's policy text.

#### Scenario: Cards in date order

- GIVEN the reader returns intensivos dated 5 Nov, 12 Nov and 20 Nov
- WHEN `/intensivos` renders
- THEN three cards appear in that order, each with a date badge and a link to its `/intensivos/:slug`

#### Scenario: Card content

- GIVEN an intensivo with name, teacher, a 10:00 to 12:30 range, price 45000, deposit 15000 and materials included
- WHEN its card renders
- THEN it shows the name, teacher, duration "2 h 30 min", price "$ 45.000", the deposit "Seña $ 15.000" and the "Materiales incluidos" badge

#### Scenario: No materials badge

- GIVEN an intensivo whose materials-included flag is false
- WHEN its card renders
- THEN no "Materiales incluidos" badge appears

#### Scenario: Policy note

- GIVEN an intensivo with policy text "Texto de política de prueba"
- WHEN the policy note renders
- THEN the text of the policy is visible on the page

#### Scenario: Single h1

- GIVEN `/intensivos` renders with or without data
- WHEN headings are counted
- THEN exactly one `h1` with text "Talleres intensivos" exists and heading levels do not skip

#### Scenario: No filters or sort controls

- GIVEN `/intensivos` renders with data
- WHEN the page is inspected
- THEN there are no date-range, technique or sort controls and no filter query handling

### Requirement: Intensivos listing empty state

When the reader returns no visible, non-expired intensivos, `/intensivos` MUST render the `h1`, the intro and the EmptyState with calm Spanish copy and a WhatsApp or Instagram CTA, MUST NOT render any card, and MUST respond with status 200.

#### Scenario: Empty list

- GIVEN the reader returns no intensivos (including the fail-soft placeholder)
- WHEN `/intensivos` is requested
- THEN the status is 200, the EmptyState with a CTA is shown and no intensivo card exists

### Requirement: Price, deposit, date and time formats

Prices and deposits MUST use the es-AR thousands separator with a currency symbol and a space ("$ 45.000"). The deposit MUST be labelled "Seña". Time ranges MUST read "10:00 a 12:00 h". The date badge MUST show the weekday, the day number and the month name in Spanish, computed on the Cordoba calendar date, with no time-zone shift. Durations MUST be derived from the time range: whole hours as "2 horas" (one hour as "1 hora"), otherwise "2 h 30 min". Prices MUST be shown publicly.

#### Scenario: Price and deposit

- GIVEN price 45000 and deposit 15000
- WHEN rendered
- THEN the price reads "$ 45.000" and the deposit reads "Seña $ 15.000"

#### Scenario: Date badge

- GIVEN an intensivo on a Saturday, 14 November
- WHEN its date badge renders
- THEN it shows the Spanish weekday for Saturday, the day 14 and the Spanish month for November

#### Scenario: Duration forms

- GIVEN time ranges 10:00-11:00, 10:00-12:00 and 10:00-12:30
- WHEN durations are derived
- THEN they read "1 hora", "2 horas" and "2 h 30 min"

#### Scenario: Time range

- GIVEN a range from 10:00 to 12:00
- WHEN it renders
- THEN it reads "10:00 a 12:00 h"

### Requirement: Intensivo seats indicator

For an open (not paused) intensivo, the listing card and the detail page MUST show the text "Cupo limitado" and MUST NOT show any seat number, capacity number or availability count. The text MUST NOT be derived from capacity or from `available`. A paused intensivo MUST NOT show the seats indicator.

#### Scenario: Cupo limitado

- GIVEN an open intensivo with capacity 12 and `available` null
- WHEN its card and detail render
- THEN both show "Cupo limitado" and neither presents 12 as a seats statement

#### Scenario: Paused hides seats

- GIVEN a paused intensivo
- WHEN its card and detail render
- THEN "Cupo limitado" is absent

### Requirement: Intensivo paused state

A paused intensivo MUST show "Inscripciones pausadas" on its listing card and its detail page, MUST remain listed in date order, and MUST NOT show the "Consultá por WhatsApp" call to action. Instead it MUST show a WhatsApp link built from the business profile with a prefilled message that names the intensivo.

#### Scenario: Paused card

- GIVEN a paused intensivo
- WHEN its card renders
- THEN it shows "Inscripciones pausadas" and still links to its detail page

#### Scenario: Paused detail

- GIVEN a paused intensivo named "Intensivo Demo"
- WHEN its detail page renders
- THEN it shows "Inscripciones pausadas", a WhatsApp link whose decoded message contains "Intensivo Demo", and no "Consultá por WhatsApp" call to action

#### Scenario: Order unchanged by pause

- GIVEN a paused intensivo dated between two published ones
- WHEN `/intensivos` renders
- THEN the paused card sits in its date position

### Requirement: Intensivo detail content

`/intensivos/:slug` MUST render, for a visible, non-expired intensivo: a breadcrumb linking back to `/intensivos`; exactly one `h1` with the intensivo name; the full description; the teacher name and bio line; the date, the time range "10:00 a 12:00 h" and the derived duration; the price and the deposit labelled "Seña"; the policy text (cancellation and no-show terms); the minimum seats text "Se realiza con un mínimo de N personas" where N is the stored minimum; the "Materiales incluidos" badge when set; the seats indicator per its rule; and the images.

#### Scenario: Full detail

- GIVEN a visible intensivo with description, teacher with bio line, date, range, price, deposit, policy, minimum seats 6 and two images
- WHEN `/intensivos/:slug` renders
- THEN all of those are present, including the text "Se realiza con un mínimo de 6 personas"

#### Scenario: Minimum seats text

- GIVEN minimum seats 4
- WHEN the detail renders
- THEN the page contains exactly "Se realiza con un mínimo de 4 personas"

#### Scenario: Heading order

- GIVEN any rendered intensivo detail
- WHEN headings are listed
- THEN there is exactly one `h1` and no skipped levels

### Requirement: Intensivo interim WhatsApp call to action

For an open intensivo the detail page MUST show the call to action "Consultá por WhatsApp" that links to a `wa.me` URL built from the business profile WhatsApp number, with a prefilled message from `site-content` that contains the intensivo name and its date. The page MUST NOT show a registration form or deposit flow in this change.

#### Scenario: Open intensivo CTA

- GIVEN an open intensivo named "Intensivo Demo" on 14 November
- WHEN its detail renders
- THEN a "Consultá por WhatsApp" link exists with the profile-derived `https://wa.me/` href and a decoded message containing "Intensivo Demo" and the date

#### Scenario: No registration form

- GIVEN any intensivo detail
- WHEN the DOM is inspected
- THEN no registration form exists

### Requirement: Intensivo detail 404

`/intensivos/:slug` MUST respond with HTTP 404 in the public layout, with the styled Spanish 404, when the slug is unknown, belongs to a draft, archived or cancelled intensivo, or the intensivo date has passed (Cordoba), or the reader returns "not found". It MUST NOT respond with a 5xx for these cases, and MUST NOT reveal why the slug is not available.

#### Scenario: Unknown slug

- GIVEN no intensivo with slug "no-existe"
- WHEN `/intensivos/no-existe` is requested
- THEN the status is 404 and the styled Spanish 404 renders in the public layout

#### Scenario: Cancelled, archived, draft and past

- GIVEN intensivos that are cancelled, archived, draft, and one dated yesterday
- WHEN each slug is requested
- THEN all four answer 404 with identical copy

#### Scenario: Placeholder reader

- GIVEN the fail-soft placeholder is wired
- WHEN any `/intensivos/:slug` is requested
- THEN the status is 404, not 5xx

### Requirement: Intensivo images and stand-ins

Card and detail images MUST come from the intensivo's images with their alt text. An intensivo without images MUST render a registered stand-in image listed in the stand-in manifest. Non-decorative images MUST have non-empty `alt`.

#### Scenario: No images

- GIVEN an intensivo with no images
- WHEN its card and detail render
- THEN a manifest-listed stand-in image is used

#### Scenario: Alt text

- GIVEN an intensivo with images
- WHEN the page renders
- THEN every non-decorative image has non-empty `alt`

### Requirement: Intensivos page metadata and indexing

`/intensivos` and every `/intensivos/:slug` MUST export a unique title and description, a canonical URL built from the site base URL and the path (detail by slug) and Open Graph tags. A detail page's title MUST be built from the intensivo name and its description from the summary, truncated to at most 160 characters. The pages MUST follow the global indexing gate and MUST NOT be unconditionally `noindex`. The gate stays OFF in this change.

#### Scenario: Detail meta from the activity

- GIVEN an intensivo named "Intensivo Demo" with a summary
- WHEN the detail meta is built
- THEN the title contains "Intensivo Demo" and the description is derived from the summary at no more than 160 characters

#### Scenario: Gate off

- GIVEN indexing is off
- WHEN the meta for `/intensivos` and a detail page is produced
- THEN both contain `noindex`

#### Scenario: Gate on

- GIVEN indexing is on
- WHEN the meta for `/intensivos` and a detail page is produced
- THEN neither contains `noindex`

### Requirement: Intensivos copy, layout and privacy

Static copy on these pages MUST be es-AR with voseo, MUST NOT contain the word "workshop" (any case) and MUST come from `site-content`. The pages MUST work at 360 px without horizontal scrolling and pass automated accessibility checks. The "Intensivos" menu entry MUST be marked current on `/intensivos` and on `/intensivos/:slug`. No response MUST contain a percentage, modality, teacher phone, teacher email or audit field, including embedded loader data and structured data.

#### Scenario: Copy scan

- GIVEN the static copy of both pages
- WHEN scanned
- THEN "workshop" is absent and voseo forms are used

#### Scenario: Accessibility

- GIVEN the listing (with data and empty) and the detail (open and paused)
- WHEN axe-core runs
- THEN no violations are reported

#### Scenario: Active menu entry on detail

- GIVEN the location `/intensivos/intensivo-demo`
- WHEN the header renders
- THEN "Intensivos" has `aria-current="page"`

#### Scenario: Serialized data has no internals

- GIVEN fully populated fixtures including internal fields
- WHEN the page output and serialized loader data are scanned
- THEN no percentage, modality, teacher contact or audit value appears
