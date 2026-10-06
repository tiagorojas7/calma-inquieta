# Home Page Specification

## Purpose

Defines Inicio (`/`): hero, trust row, activity showcases with empty states, About teaser, contact band, and a testimonials section hidden until real consented testimonials exist.

Traceability: proposal scope item 6; decisions D3, D8; mockups image5 and image12 (visual reference); A4 (testimonials, scope adjustment).

## Requirements

### Requirement: Hero

Inicio MUST show a hero with an eyebrow, one `h1` with an italic accent word, a subtitle, two CTAs "Ver talleres" (to `/talleres`) and "Ver intensivos" (to `/intensivos`), and a collage of registered stand-in image slots. On narrow viewports the collage MUST collapse to one or two images.

#### Scenario: Hero CTAs

- GIVEN Inicio renders
- WHEN the hero CTAs are read
- THEN "Ver talleres" links to `/talleres` and "Ver intensivos" links to `/intensivos`

#### Scenario: Single h1

- GIVEN Inicio renders
- WHEN headings are counted
- THEN exactly one `h1` exists and it contains an emphasized (italic) word

#### Scenario: Hero images are registered stand-ins

- GIVEN the hero image sources
- WHEN compared with the stand-in manifest
- THEN every source is listed in the manifest

### Requirement: Trust row

The trust row MUST render only claims present in `site-content` marked client-approved. "Materiales incluidos" MUST apply to intensivos only. If no approved claim exists, the row MUST NOT render.

#### Scenario: No approved claims

- GIVEN site-content has zero approved trust claims
- WHEN Inicio renders
- THEN no trust row appears

#### Scenario: Materiales incluidos scope

- GIVEN a claim "Materiales incluidos"
- WHEN content validation runs
- THEN the claim must be scoped to intensivos or validation fails

### Requirement: Talleres mensuales showcase with empty state

The "Talleres mensuales" section MUST take its activity list as props. When the list is empty it MUST render the EmptyState with calm Spanish copy and a WhatsApp or Instagram CTA (D3), and MUST NOT render fake cards, prices or schedules. In this change production lists are empty.

#### Scenario: Empty list

- GIVEN the monthly activities list is empty
- WHEN the section renders
- THEN EmptyState with a CTA appears and no ActivityCard exists

#### Scenario: Populated list (component contract)

- GIVEN a fixture list of two activities in a component test
- WHEN the section renders
- THEN two ActivityCards appear, each with title and link

#### Scenario: Production never shows fixtures

- GIVEN the production Inicio loader
- WHEN it runs in this change
- THEN it returns empty activity and intensivo lists

### Requirement: Próximos intensivos list with empty state

The "Próximos intensivos" section MUST take its list as props and show an EmptyState with a CTA when empty. Each populated item MUST show a DateBadge, title and link.

#### Scenario: Empty intensivos

- GIVEN no upcoming intensivos
- WHEN the section renders
- THEN EmptyState is shown and no DateBadge exists

#### Scenario: Items ordered as given

- GIVEN a fixture list of three items
- WHEN rendered
- THEN three UpcomingItems appear in the given order

### Requirement: Quiénes somos teaser and contact band

Inicio MUST include a teaser linking to `/quienes-somos` (copy from `site-content`, voice "nosotras") and a ContactBand with the WhatsApp CTA and Instagram link from the business profile.

#### Scenario: Teaser link

- GIVEN Inicio renders
- WHEN the teaser link is inspected
- THEN its href is `/quienes-somos`

#### Scenario: Contact band uses profile

- GIVEN the business profile
- WHEN the contact band renders
- THEN its WhatsApp and Instagram hrefs derive from the profile values

### Requirement: Hidden-until-real testimonials

The TestimonialsSection and TestimonialCard MUST exist and be tested, but Inicio MUST NOT render the section while the list of consented testimonials is empty. A testimonial without recorded consent MUST NOT be listed.

#### Scenario: Empty testimonials

- GIVEN no consented testimonials
- WHEN Inicio renders
- THEN no testimonials heading or container is in the DOM

#### Scenario: Consent required

- GIVEN a testimonial without consent in raw content
- WHEN site-content exposes the list
- THEN that testimonial is excluded

#### Scenario: Component with fixtures

- GIVEN two consented fixtures
- WHEN TestimonialsSection renders in a component test
- THEN two cards appear and axe reports no violations

### Requirement: No invented facts

Inicio MUST NOT show prices, schedules, hours, email, testimonials or counts that are not in confirmed site-content.

#### Scenario: Text scan

- GIVEN the rendered Inicio output
- WHEN scanned for currency symbols and clock patterns
- THEN none appear

### Requirement: Inicio metadata and structure

Inicio MUST export a unique title and description, and expose LocalBusiness JSON-LD (see seo-foundation). Images above the fold MUST NOT be lazy-loaded; others MUST be.

#### Scenario: Meta present

- GIVEN the Inicio meta export
- WHEN evaluated
- THEN it contains a non-empty title and description distinct from other pages
