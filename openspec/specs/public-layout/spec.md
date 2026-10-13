# Public Layout Specification

## Purpose

Defines the shared public shell: header with the six-entry menu, mobile navigation, footer, skip link, "Próximamente" pages, and the styled Spanish 404 and error pages.

Traceability: proposal scope items 5, 9, 10; decisions D2, D8; owner decisions on menu labels (resolved in this phase: About label "Quiénes somos" at `/quienes-somos`, a scope adjustment to proposal A2 which said "Nosotros" and `/nosotros`).

## Requirements

### Requirement: Six-entry menu

The header MUST show exactly six entries, in this order, with these labels and URLs:

| Order | Label | URL |
|---|---|---|
| 1 | Inicio | `/` |
| 2 | Talleres | `/talleres` |
| 3 | Intensivos | `/intensivos` |
| 4 | Eventos privados | `/eventos-privados` |
| 5 | Quiénes somos | `/quienes-somos` |
| 6 | Contacto | `/contacto` |

The menu MUST NOT contain Tienda, Diario, search, cart or account entries. The menu definition MUST live in one place and be used by both desktop header and mobile navigation.

#### Scenario: Order, labels and URLs

- GIVEN the public layout is rendered
- WHEN the primary navigation links are read in DOM order
- THEN they match the table exactly, with no additional entries

#### Scenario: Desktop and mobile agree

- GIVEN the desktop header and the opened mobile navigation
- WHEN their entries are compared
- THEN labels, order and hrefs are identical

### Requirement: Active entry state

The entry matching the current location MUST be marked with `aria-current="page"` and a visual active style. Nested paths of an entry MUST mark that entry active; `/` MUST be active only on the exact root.

#### Scenario: Exact match

- GIVEN the location is `/contacto`
- WHEN the header renders
- THEN only "Contacto" has `aria-current="page"`

#### Scenario: Root is not a prefix

- GIVEN the location is `/quienes-somos`
- WHEN the header renders
- THEN "Inicio" is not marked current

#### Scenario: Unknown path

- GIVEN the location matches no entry (404)
- WHEN the header renders
- THEN no entry is marked current

### Requirement: Header brand and CTA

The header MUST show the logo stand-in linking to `/` with an accessible name, and exactly one header CTA (a WhatsApp click-to-chat link using the business profile number, see contact-page and site-content). The CTA MUST be visible in the desktop header and within the mobile panel.

#### Scenario: Single CTA

- GIVEN the public layout
- WHEN header CTAs are counted
- THEN exactly one exists and its href is the profile-derived `wa.me` link

### Requirement: Mobile navigation

On narrow viewports the menu MUST be a disclosure panel operable by keyboard and screen reader: a toggle button with `aria-expanded` and `aria-controls`, opening a full-height panel with all six entries. Escape MUST close the panel and return focus to the toggle. Activating an entry MUST close the panel. Focus MUST NOT escape to content behind an open panel while it is open.

#### Scenario: Open and close with toggle

- GIVEN the mobile navigation is closed
- WHEN the user activates the toggle
- THEN `aria-expanded` is "true" and all six entries are reachable

#### Scenario: Escape returns focus

- GIVEN the panel is open with focus inside it
- WHEN the user presses Escape
- THEN the panel closes and focus is on the toggle button

#### Scenario: Navigating closes the panel

- GIVEN the panel is open
- WHEN the user activates "Contacto"
- THEN navigation occurs and the panel is closed

#### Scenario: Accessibility

- GIVEN the panel in open and closed states
- WHEN axe-core runs
- THEN no violations are reported

### Requirement: Skip link and landmarks

The page MUST begin with a skip link, the first focusable element, that moves focus to the main content landmark. The layout MUST expose `header`, `nav` (labelled), `main` and `footer` landmarks, and each page MUST contain exactly one `h1`.

#### Scenario: Skip link first

- GIVEN a freshly loaded page
- WHEN the user presses Tab once
- THEN the skip link receives focus, and activating it focuses the `main` target

### Requirement: Footer

The footer MUST show the business profile name, address (NAP), Instagram link, WhatsApp link and the existing bajada (DMR R14), all sourced from `site-content`. Phone, email and hours MUST appear only when the profile marks them confirmed. A provisional WhatsApp number MUST still be usable as a link but MUST NOT be styled or worded as an official published number.

#### Scenario: Confirmed-only facts

- GIVEN a business profile with no confirmed email and no hours
- WHEN the footer renders
- THEN no email and no hours text appear

#### Scenario: Profile is the single source

- GIVEN the Instagram handle in the profile is changed
- WHEN the footer renders
- THEN the new handle appears with no change to the footer component

### Requirement: Próximamente pages

`/talleres`, `/intensivos` and `/eventos-privados` MUST each render the ComingSoonPage template with a page title ("Talleres", "Talleres intensivos", "Eventos privados" respectively), a short Spanish message, and WhatsApp and Instagram CTAs. Each MUST send `noindex` and MUST NOT appear in the sitemap. The pages MUST NOT show prices, dates or schedules.

#### Scenario: Intensivos title

- GIVEN a request to `/intensivos`
- WHEN the page renders
- THEN the `h1` is "Talleres intensivos" and both CTAs are present

#### Scenario: noindex and sitemap exclusion

- GIVEN the meta export for `/talleres`
- WHEN evaluated
- THEN robots meta contains `noindex`, and the sitemap output does not list `/talleres`

#### Scenario: Active state on placeholder

- GIVEN the location `/eventos-privados`
- WHEN the header renders
- THEN "Eventos privados" is the current entry

### Requirement: Styled 404

Unknown paths MUST return HTTP 404 and render Spanish copy inside the public layout with links back to Inicio and Contacto. The temporary platform-foundation index not-found route MUST be replaced.

#### Scenario: Unknown path

- GIVEN a request to `/no-existe`
- WHEN the catch-all route handles it
- THEN the status is 404, the layout is the public layout, and the copy is Spanish

#### Scenario: Retired old path

- GIVEN a request to `/nosotros` (proposal URL, superseded)
- WHEN handled
- THEN it is a 404 unless a redirect to `/quienes-somos` is specified later by design

### Requirement: Error boundary

Unhandled errors MUST render a Spanish page in the public layout with the correct status (500 for unexpected errors, otherwise the thrown response status) and MUST NOT reveal stack traces, messages or internal identifiers. The root document language MUST be `es-AR`.

#### Scenario: Unexpected error

- GIVEN a loader throws an Error with a secret-looking message
- WHEN the error boundary renders
- THEN status is 500, copy is Spanish, and the message text is absent from the output

#### Scenario: `/status` unchanged

- GIVEN a request to `/status`
- WHEN handled
- THEN its behavior and payload match platform-foundation
