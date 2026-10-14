# Talleres Pages Specification

## Purpose

Defines the public monthly-taller pages: the listing at `/talleres` and the detail at `/talleres/:slug`. They replace the "Próximamente" placeholder for `/talleres` and render data from the public catalog reader (see `public-catalog-reader`).

Traceability: proposal scope items 3, 4, 10, 11; owner decisions Q1, Q2, Q4, Q6, Q9, Q10; mockups image9 (listing) and image6 (read part of the detail) as visual references only. All UI copy is es-AR with voseo ("vos"), never uses the word "workshop", and is sourced from `site-content`. Fixtures use neutral invented data.

Dependencies (not modified here): `public-catalog-reader`, `public-layout`, `seo-foundation`, `site-content`, `design-system`, and the change-3 capabilities named in `public-catalog-reader`.

## Requirements

### Requirement: Talleres listing content

`/talleres` MUST render exactly one `h1` "Talleres", an intro text, and a grid with one card per visible taller returned by the reader, in the reader's order. Each card MUST show the taller name, the teacher name, the summary (not the full description), the turnos (weekday and time range for each), the monthly fee when an offering exists, and a "Ver taller" link to `/talleres/:slug`. Paused tallers MUST appear in the grid with the paused badge defined below.

#### Scenario: One card per visible taller

- GIVEN the reader returns three visible tallers (two open, one paused)
- WHEN `/talleres` renders
- THEN three cards appear in the reader's order and each has a "Ver taller" link to its `/talleres/:slug`

#### Scenario: Card content

- GIVEN a taller with name, teacher, summary, description, two turnos and an offering fee
- WHEN its card renders
- THEN the card shows name, teacher, summary, both turnos and the fee, and does not show the full description

#### Scenario: Single h1

- GIVEN `/talleres` renders with or without data
- WHEN headings are counted
- THEN exactly one `h1` with text "Talleres" exists and heading levels do not skip

#### Scenario: No filters in v1

- GIVEN `/talleres` renders with data
- WHEN the page is inspected
- THEN no filter pills, filter controls or filter query handling exist

### Requirement: Talleres listing empty state

When the reader returns no visible tallers, `/talleres` MUST still render the `h1`, the intro and the EmptyState with calm Spanish copy and a WhatsApp or Instagram CTA, and MUST NOT render any card. The response status MUST be 200.

#### Scenario: Empty list

- GIVEN the reader returns no tallers (including the fail-soft placeholder)
- WHEN `/talleres` is requested
- THEN the status is 200, the EmptyState with a CTA is shown and no taller card exists

### Requirement: Fee and time formats

Fees MUST use the es-AR thousands separator with a currency symbol and a space ("$ 58.000"). On listing cards the fee MUST read "$ 58.000 / mes". On the detail page the fee MUST be labelled "Cuota mensual" with the amount "$ 58.000". Time ranges MUST read "10:00 a 12:00 h" everywhere. Weekday names MUST be Spanish (for example "Lunes", "Miércoles"). Prices MUST be shown publicly.

#### Scenario: Card fee format

- GIVEN an offering fee of 58000 ARS
- WHEN the card renders
- THEN the fee text is "$ 58.000 / mes"

#### Scenario: Detail fee format

- GIVEN an offering fee of 58000 ARS
- WHEN the detail page renders
- THEN it shows the label "Cuota mensual" and the amount "$ 58.000"

#### Scenario: Time range format

- GIVEN a turno from 10:00 to 12:00
- WHEN it renders on a card or on the detail page
- THEN the time reads "10:00 a 12:00 h"

#### Scenario: Weekday names

- GIVEN turnos on Monday and Wednesday
- WHEN rendered
- THEN the weekdays appear as Spanish names, not abbreviations of other languages

### Requirement: No open month

When a taller has no selected offering, its card and its detail page MUST show the text "Próximamente abrimos inscripciones" in place of the fee and MUST NOT show any fee, default fee or capacity-based text.

#### Scenario: Card without offering

- GIVEN a published taller whose offering is null
- WHEN its card renders
- THEN the text "Próximamente abrimos inscripciones" is shown, no fee is shown, and the "Ver taller" link is present

#### Scenario: Detail without offering

- GIVEN a published taller whose offering is null
- WHEN its detail page renders
- THEN the same text is shown, no "Cuota mensual" amount is shown, and the turnos are still listed

### Requirement: Seats indicator

For an open (not paused) taller with an offering, the listing card and the detail page MUST show the text "Cupo limitado" and MUST NOT show any seat number, capacity number or availability count. The indicator MUST NOT be derived from capacity or from `available`. A taller without an offering, or a paused taller, MUST NOT show the seats indicator.

#### Scenario: Cupo limitado

- GIVEN an open taller with an offering and turno capacity 8
- WHEN its card and its detail page render
- THEN both show "Cupo limitado" and neither contains the number 8 as a seats statement

#### Scenario: Unknown availability

- GIVEN a turno with `available` equal to null
- WHEN it renders
- THEN no "lugares disponibles" text exists

#### Scenario: Not shown when paused or without offering

- GIVEN a paused taller, and separately an open taller with a null offering
- WHEN each renders
- THEN neither shows "Cupo limitado"

### Requirement: Paused state

A paused taller MUST show a badge or notice reading "Inscripciones pausadas" on its listing card and on its detail page. A paused taller MUST NOT show an enrollment or "Consultá por WhatsApp" call to action that implies open enrollment; instead it MUST show a WhatsApp link (built from the business profile) with a prefilled message naming the taller. The paused text takes precedence over the "no open month" text.

#### Scenario: Paused card

- GIVEN a paused taller
- WHEN its card renders
- THEN it shows "Inscripciones pausadas" and still links to its detail page

#### Scenario: Paused detail

- GIVEN a paused taller
- WHEN its detail page renders
- THEN it shows "Inscripciones pausadas", a WhatsApp link whose message contains the taller name, and no "Consultá por WhatsApp" enrollment call to action

#### Scenario: Paused precedence

- GIVEN a paused taller with a null offering
- WHEN its detail page renders
- THEN "Inscripciones pausadas" is shown and "Próximamente abrimos inscripciones" is not shown

### Requirement: Taller detail content

`/talleres/:slug` MUST render, for a visible taller: a breadcrumb that links back to `/talleres` and includes the technique and the taller name; exactly one `h1` with the taller name; the full description; the teacher name and bio line; the turnos listed with weekday, time range and the class length derived from the time range; the monthly fee per the formats above; and the seats indicator per its rule. When the selected period has a project, the page MUST render the section "Proyectos que vamos a realizar" with the project title, description and images. When the project is null, that section MUST NOT render.

#### Scenario: Full detail

- GIVEN a visible taller with description, teacher with bio line, two turnos, an offering and a project with two images
- WHEN `/talleres/:slug` renders
- THEN the breadcrumb, `h1`, description, teacher with bio line, both turnos with durations, fee and project section with two images are present

#### Scenario: Class length derived

- GIVEN a turno from 10:00 to 12:30
- WHEN the detail renders
- THEN the class length reads "2 h 30 min"

#### Scenario: Whole hours

- GIVEN a turno from 10:00 to 12:00
- WHEN the detail renders
- THEN the class length reads "2 horas"

#### Scenario: No project

- GIVEN a taller whose project is null
- WHEN the detail renders
- THEN the "Proyectos que vamos a realizar" section is absent

#### Scenario: Heading order

- GIVEN any rendered detail page
- WHEN headings are listed
- THEN there is exactly one `h1` and no skipped levels

### Requirement: Interim WhatsApp call to action

For an open taller the detail page MUST show a call to action "Consultá por WhatsApp" that links to a `wa.me` URL built from the business profile WhatsApp number, with a prefilled message that contains the taller name. When the page lists turnos, each turno SHOULD offer a link whose prefilled message also contains that turno's weekday and time. The page MUST NOT show an enrollment form or materials cart in this change. Prefilled message text MUST come from `site-content`.

#### Scenario: Open taller CTA

- GIVEN an open taller named "Taller Demo"
- WHEN its detail page renders
- THEN a link "Consultá por WhatsApp" exists whose href starts with the profile-derived `https://wa.me/` and whose decoded text parameter contains "Taller Demo"

#### Scenario: Turno in the message

- GIVEN an open taller with a Monday 10:00 to 12:00 turno
- WHEN the turno's link is read
- THEN its decoded message contains the taller name and the turno weekday and time

#### Scenario: No enrollment form

- GIVEN any taller detail page
- WHEN the DOM is inspected
- THEN there is no enrollment form element and no materials selection

### Requirement: Detail 404

`/talleres/:slug` MUST respond with HTTP 404 inside the public layout, with Spanish copy and links back to Inicio and Contacto (the existing styled 404), when the slug is unknown, belongs to a draft or archived taller, or the reader returns "not found". It MUST NOT respond with a 5xx for these cases and MUST NOT reveal why the slug is invisible.

#### Scenario: Unknown slug

- GIVEN no taller with slug "no-existe"
- WHEN `/talleres/no-existe` is requested
- THEN the status is 404 and the styled Spanish 404 renders inside the public layout

#### Scenario: Draft and archived

- GIVEN a taller in draft status and another in archived status
- WHEN each slug is requested
- THEN both answer 404 with identical copy

#### Scenario: Placeholder reader

- GIVEN the fail-soft placeholder is wired
- WHEN any `/talleres/:slug` is requested
- THEN the status is 404, not 5xx

### Requirement: Images and stand-ins

Card and detail images MUST come from the taller's images with their alt text. A taller without images MUST render a registered stand-in image, and every stand-in used MUST be listed in the stand-in manifest. Non-decorative images MUST have `alt` text.

#### Scenario: Taller without images

- GIVEN a taller with no images
- WHEN its card and detail render
- THEN a registered stand-in image is used and it is in the manifest

#### Scenario: Alt text

- GIVEN a taller with images
- WHEN the page renders
- THEN every non-decorative image has non-empty `alt`

### Requirement: Page metadata and indexing

`/talleres` and every `/talleres/:slug` MUST export a unique title and description, a canonical URL built from the site base URL and the path (detail by slug), and Open Graph tags. A detail page's title MUST be built from the taller name and its description from the taller summary, truncated to at most 160 characters. The pages MUST follow the global indexing gate and MUST NOT be unconditionally `noindex`. The gate stays OFF in this change, so pages send `noindex` while it is off.

#### Scenario: Detail meta from the activity

- GIVEN a taller named "Taller Demo" with a summary
- WHEN the detail meta is built
- THEN the title contains "Taller Demo" and the description is derived from the summary and is at most 160 characters

#### Scenario: Gate off

- GIVEN indexing is off
- WHEN the meta for `/talleres` and a detail page is produced
- THEN both contain `noindex`

#### Scenario: Gate on

- GIVEN indexing is on
- WHEN the meta for `/talleres` and a detail page is produced
- THEN neither contains `noindex`

### Requirement: Copy rules and layout

All visible copy on these pages that is not admin-entered data MUST be es-AR with voseo, MUST NOT contain the word "workshop" (any case), and MUST come from `site-content`. The pages MUST work at a 360 px viewport without horizontal scrolling and MUST pass automated accessibility checks. The "Talleres" menu entry MUST be marked current on `/talleres` and on `/talleres/:slug`.

#### Scenario: Copy scan

- GIVEN the static copy of both pages
- WHEN scanned
- THEN "workshop" is absent and voseo forms are used

#### Scenario: Accessibility

- GIVEN the listing (with data and empty) and the detail (open, paused, no offering)
- WHEN axe-core runs
- THEN no violations are reported

#### Scenario: Active menu entry on detail

- GIVEN the location `/talleres/ceramica-inicial`
- WHEN the header renders
- THEN "Talleres" has `aria-current="page"`

### Requirement: Privacy in responses

No `/talleres` or `/talleres/:slug` response MUST contain a percentage, modality, teacher phone, teacher email, audit field or period snapshot, including in embedded loader data and structured data.

#### Scenario: Serialized loader data

- GIVEN fully populated fixtures including internal fields
- WHEN the page output and the serialized loader data are scanned
- THEN none of those internal values appear
