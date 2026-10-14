# Delta for Public Layout

All other requirements (Six-entry menu, Active entry state, Header brand and CTA, Mobile navigation, Skip link and landmarks, Footer, Styled 404, Error boundary) are unchanged. The menu is unchanged; `/talleres` and `/intensivos` remain its entries and stay active for nested detail paths under the existing "Active entry state" rule.

## MODIFIED Requirements

### Requirement: Próximamente pages

`/eventos-privados` MUST render the ComingSoonPage template with the page title "Eventos privados", a short Spanish message, and WhatsApp and Instagram CTAs. It MUST send `noindex` and MUST NOT appear in the sitemap. It MUST NOT show prices, dates or schedules. `/talleres` and `/intensivos` are no longer Próximamente pages; they are defined by `talleres-pages` and `intensivos-pages`.
(Previously: `/talleres`, `/intensivos` and `/eventos-privados` each rendered the ComingSoonPage template, with `noindex` and sitemap exclusion.)

#### Scenario: Eventos privados title

- GIVEN a request to `/eventos-privados`
- WHEN the page renders
- THEN the `h1` is "Eventos privados" and both CTAs are present

#### Scenario: noindex and sitemap exclusion

- GIVEN the meta export for `/eventos-privados`
- WHEN evaluated
- THEN robots meta contains `noindex`, and the sitemap output does not list `/eventos-privados`

#### Scenario: Active state on placeholder

- GIVEN the location `/eventos-privados`
- WHEN the header renders
- THEN "Eventos privados" is the current entry

#### Scenario: Talleres and Intensivos are not placeholders

- GIVEN requests to `/talleres` and `/intensivos`
- WHEN the pages render
- THEN neither renders the ComingSoonPage template

Note: the former scenarios "Intensivos title" and the `/talleres` variant of "noindex and sitemap exclusion" are dropped from this requirement; the behavior they covered moves to `intensivos-pages` and `talleres-pages`.
