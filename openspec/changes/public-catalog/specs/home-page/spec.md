# Delta for Home Page

Depends on `public-catalog-reader` (new in this change). Requirements not listed here (Hero, Trust row, Quiénes somos teaser and contact band, Hidden-until-real testimonials, Inicio metadata and structure) are unchanged.

## MODIFIED Requirements

### Requirement: Talleres mensuales showcase with empty state

The "Talleres mensuales" section MUST take its activity list as props. The Inicio loader MUST fill that list from the public catalog reader with the first 3 visible talleres in the reader's order (name ascending; paused talleres are visible and therefore included). Each Inicio card MUST show the taller name, its summary and its turnos as weekday and time range ("10:00 a 12:00 h"; at most 2 turnos, then "y N turnos más"), and MUST NOT show a price, a fee, a seats statement or any text containing a currency symbol. A paused taller's card MUST carry the "Inscripciones pausadas" badge. When the list is empty it MUST render the EmptyState with calm Spanish copy and a WhatsApp or Instagram CTA (D3), and MUST NOT render fake cards, prices or schedules.
(Previously: the list was always empty in production and fixtures only appeared in component tests; no reader, no card content rules.)

#### Scenario: Empty list

- GIVEN the monthly activities list is empty
- WHEN the section renders
- THEN EmptyState with a CTA appears and no ActivityCard exists

#### Scenario: Populated list (component contract)

- GIVEN a fixture list of two activities in a component test
- WHEN the section renders
- THEN two ActivityCards appear, each with title and link

#### Scenario: Loader reads the reader

- GIVEN the reader returns five visible talleres
- WHEN the Inicio loader runs
- THEN the monthly list contains the first three in the reader's order, and none from the draft or archived set

#### Scenario: Card content without price

- GIVEN a taller with summary, two turnos and an offering fee
- WHEN its Inicio card renders
- THEN it shows name, summary and both weekday and time ranges, and no fee text and no currency symbol

#### Scenario: Paused taller on Inicio

- GIVEN a paused taller is among the first three
- WHEN its Inicio card renders
- THEN it shows "Inscripciones pausadas"

#### Scenario: Placeholder reader

- GIVEN the fail-soft placeholder is wired
- WHEN the Inicio loader runs
- THEN the monthly list is empty, the EmptyState renders and the status is 200

### Requirement: Próximos intensivos list with empty state

The "Próximos intensivos" section MUST take its list as props and show an EmptyState with a CTA when empty. The Inicio loader MUST fill that list from the public catalog reader with the nearest upcoming visible intensivos in date order, at most 3. Each populated item MUST show a DateBadge, title and link to `/intensivos/:slug`. Items MUST NOT show a price or a seats statement.
(Previously: the list was always empty in production; items linked to nothing specific and no reader or limit was defined.)

#### Scenario: Empty intensivos

- GIVEN no upcoming intensivos
- WHEN the section renders
- THEN EmptyState is shown and no DateBadge exists

#### Scenario: Items ordered as given

- GIVEN a fixture list of three items
- WHEN rendered
- THEN three UpcomingItems appear in the given order

#### Scenario: Loader reads the reader

- GIVEN the reader returns five upcoming intensivos
- WHEN the Inicio loader runs
- THEN the section receives the three nearest by date, each linking to its `/intensivos/:slug`

#### Scenario: Expired and invisible excluded

- GIVEN the reader has a past intensivo and a cancelled one
- WHEN the Inicio loader runs
- THEN neither is in the list

#### Scenario: Placeholder reader

- GIVEN the fail-soft placeholder is wired
- WHEN the Inicio loader runs
- THEN the intensivos list is empty and the EmptyState renders

### Requirement: No invented facts

Inicio MUST NOT show prices, email, testimonials or counts that are not in confirmed site-content, and MUST NOT show currency symbols anywhere. Weekdays, times and dates MAY appear only inside the "Talleres mensuales" and "Próximos intensivos" sections and only when they come from the admin-managed catalog through the reader. Every other section MUST NOT contain clock patterns or dates.
(Previously: Inicio MUST NOT show prices, schedules, hours, email, testimonials or counts not in confirmed site-content, and the whole output had no currency or clock pattern.)

#### Scenario: Text scan outside the activity sections

- GIVEN the rendered Inicio output with its two activity sections removed
- WHEN scanned for currency symbols and clock patterns
- THEN none appear

#### Scenario: Currency never on Inicio

- GIVEN the rendered Inicio output with populated activity sections
- WHEN scanned for currency symbols
- THEN none appear

#### Scenario: Clock patterns only from the catalog

- GIVEN populated activity sections with a turno "10:00 a 12:00 h"
- WHEN the Inicio output is scanned for clock patterns
- THEN matches occur only inside the two activity sections
