# Admin Shell Specification

## Purpose

Defines the private admin layout: navigation, landing, access-denied page, empty and error states, response headers and copy rules. Desktop-first, usable on a phone.

Source: proposal Scope #2; Approach 3; baseline deviations A3, A9, A13; mockups images 11, 14, 17, 18, 19 as visual references only (`docs/client-proposal/mockups-analysis.md`).

## Requirements

### Requirement: Navigation entries

The sidebar MUST list exactly these entries, in this order, with these labels and URLs: Talleres (`/admin/talleres`), Intensivos (`/admin/intensivos`), Profesores (`/admin/profesores`), Materiales (`/admin/materiales`). The sidebar MUST NOT show entries for areas not delivered by this change (no dead entries). The menu definition MUST live in one place and feed both the desktop sidebar and the mobile navigation. (Source: proposal Scope #2, Approach 3; later changes add entries)

#### Scenario: Order and targets

- GIVEN the admin layout is rendered
- WHEN the navigation links are read in DOM order
- THEN they match the list exactly with no extra entries

#### Scenario: Desktop and mobile agree

- GIVEN the desktop sidebar and the opened mobile navigation
- WHEN their entries are compared
- THEN labels, order and hrefs are identical

#### Scenario: Active entry

- GIVEN the location is `/admin/materiales/proveedores`
- WHEN the navigation renders
- THEN only "Materiales" has `aria-current="page"`

### Requirement: Top bar

The top bar MUST show the signed-in admin's email and a "Salir" control (target defined by `admin-access`). (Source: proposal Scope #2)

#### Scenario: Email shown

- GIVEN an admin actor `agus@example.com`
- WHEN any admin page renders
- THEN the top bar shows `agus@example.com` and "Salir"

### Requirement: Landing

`/admin` MUST render the Panel general: a greeting that includes the signed-in email, a summary of the current month (occupancy, pending requests, payments confirmed, registered income, materials to order), the pending alerts and shortcuts to every area, including Estadísticas. Each summary card and alert MUST link to the screen where it is handled. (Source: contract "Panel general"; supersedes the earlier rule that the landing MUST NOT show metrics, which deferred them to change 8.)

#### Scenario: Summary and shortcuts

- GIVEN an admin on `/admin`
- WHEN the page renders
- THEN the month summary cards and the pending alerts are present
- AND links to Talleres, Intensivos, Profesores, Inscripciones, Alumnas, Materiales, Eventos privados and Estadísticas are present

#### Scenario: Nothing pending

- GIVEN no overdue request, no workshop without an open period next month and no material left to order
- WHEN the page renders
- THEN it says there are no pending alerts

### Requirement: Statistics

`/admin/estadisticas` MUST show, for a month chosen with a GET form (default: the current Córdoba month), tables for occupancy (enrolled, free seats and percentage by workshop and turno), conversion (requests received, pending and confirmed), registered income (fees and materials by workshop), students (participants and recurrence) and materials (orders by status, workshop, project and supplier). A malformed month MUST fall back to the current one. Attendance, absences and make-up classes arrive with the attendance change. (Source: contract "Indicadores")

#### Scenario: Month filter

- GIVEN an admin on `/admin/estadisticas?mes=2026-09`
- WHEN the page renders
- THEN every table shows September 2026 data

### Requirement: Access-denied page

A denial MUST render "No tenés acceso al panel" with status 403 inside a minimal layout that has no navigation to admin areas and no data. (Source: proposal Scope #2)

#### Scenario: No admin chrome

- GIVEN a denied request
- WHEN the page renders
- THEN it contains the message and no admin sidebar entries

### Requirement: Response headers

Every admin response, including denials, errors, redirects and resource responses under `/admin`, MUST carry `Cache-Control: private, no-store` and `X-Robots-Tag` containing `noindex`, and admin pages MUST include a `noindex` robots meta. Admin paths MUST NOT appear in the sitemap. (Source: proposal Scope #2, Success Criteria)

#### Scenario: Headers on a page

- GIVEN a request to `/admin/talleres` by an admin
- WHEN the response returns
- THEN `Cache-Control` is `private, no-store` and `X-Robots-Tag` contains `noindex`

#### Scenario: Headers on a denial

- GIVEN a denied request to `/admin`
- WHEN the response returns
- THEN the same headers are present

#### Scenario: Not in the sitemap

- GIVEN the sitemap
- WHEN it is read
- THEN no URL starts with `/admin`

### Requirement: Own layout and error boundary

Admin routes MUST sit outside the public layout, with their own layout route and error boundary. An unexpected error in an admin route MUST render an admin error state in Spanish without stack traces or internals. (Source: proposal Approach 3)

#### Scenario: Unexpected error

- GIVEN an admin loader throws an unexpected error
- WHEN the page renders
- THEN the admin error state is shown, inside the admin layout, with no stack trace

#### Scenario: Public chrome absent

- GIVEN any admin page
- WHEN it renders
- THEN the public header and footer are not present

### Requirement: Not-yet-available areas

While an area's persistence adapter is not wired, the screen for that area MUST answer status 503 with an "en construcción" message and MUST NOT show fake data or accept writes. (Source: proposal Approach 6, fail-closed placeholders)

#### Scenario: Placeholder area

- GIVEN a module wired to the fail-closed placeholder
- WHEN its admin list is requested
- THEN status is 503 with "en construcción" and no data

### Requirement: Empty, loading-failure and validation states

Every list screen MUST show an empty state with a call to action to create the first record. Every form MUST show per-field validation messages and a form-level error when saving fails, and MUST keep the entered values. Destructive or state-changing actions (archive, pause, cancel, retire) MUST ask for confirmation. (Source: proposal Scope #2)

#### Scenario: Empty list

- GIVEN no teachers exist
- WHEN `/admin/profesores` renders
- THEN an empty state with a link to `/admin/profesores/nuevo` is shown

#### Scenario: Validation error keeps input

- GIVEN a form submitted with an invalid field
- WHEN the response renders
- THEN the field shows a message and all other entered values remain

#### Scenario: Confirmation before archive

- GIVEN an admin presses an archive action
- WHEN the confirmation dialog is shown
- THEN nothing changes until she confirms

### Requirement: Copy rules

All admin copy MUST be es-AR with voseo ("Tenés", "Elegí", "Guardá"). The words "workshop" and "workshops" MUST NOT appear in user-visible copy; monthly activities are "Talleres", weekend activities "Intensivos" and schedules "Turnos". The change-2 `findCopyViolations` rule MUST also scan admin microcopy. Mockup copy using "tú" is not followed. (Source: baseline deviations A3 and A13; change-2 A1; scope adjustment: admin copy rule extends public rule)

#### Scenario: Banned word

- GIVEN admin microcopy containing "workshop"
- WHEN `findCopyViolations` runs
- THEN a violation is reported

#### Scenario: Voseo

- GIVEN the admin form buttons
- WHEN their labels are read
- THEN none uses a "tú" form

### Requirement: Phone usability and accessibility

Every admin screen MUST be usable at 360 px width without horizontal page scroll, provide full-screen forms on phones, expose a mobile navigation, have keyboard-operable controls and pass axe checks. (Source: proposal Scope #2, Success Criteria)

#### Scenario: 360 px width

- GIVEN a viewport of 360 px
- WHEN any admin screen renders
- THEN the page has no horizontal scroll and the navigation is reachable through the mobile control

#### Scenario: Axe

- GIVEN each admin screen
- WHEN axe runs in the UI test project
- THEN no violations are reported

### Requirement: Route areas

The admin MUST provide these route areas: `/admin`; `/admin/talleres` (+ `nuevo`, `:id`, turnos, `:id/periodos`, `:id/periodos/:periodo`); `/admin/intensivos` (+ `nuevo`, `:id`); `/admin/profesores` (+ `nuevo`, `:id`); `/admin/materiales` (+ `nuevo`, `:id`); `/admin/materiales/proveedores` (+ `nuevo`, `:id`). Whether turnos are a sub-route or a section of the workshop form is a design choice. (Source: proposal Approach 3)

#### Scenario: Suppliers under Materiales

- GIVEN the route table
- WHEN `/admin/materiales/proveedores` is requested by an admin
- THEN the supplier list is served and "Materiales" is the active navigation entry
