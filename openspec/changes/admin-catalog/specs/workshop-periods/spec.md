# Workshop Periods Specification

## Purpose

Defines the month of a workshop as a first-class record: its fee, its capacity per turno, its single project, its enabled materials and the snapshot of the teacher and agreed percentage in force when it was opened, plus the "Abrir mes" use case that creates it. Seat counters and enrollment arrive in change 5.

Source: proposal Scope #6; decisions D2, D3, D4, D8; assumptions S1, S3, S4; baseline deviations A4, A5, A6, A8; owner decision `calmainquieta/monthly-renewal-model`; mockup images 18, 19.

## Requirements

### Requirement: Period identity

A period MUST belong to exactly one monthly workshop and one month identified by a `YYYY-MM` key interpreted in `America/Argentina/Cordoba` through the `Clock` port. The pair (workshop, month) MUST be unique. A malformed key MUST be rejected. (Source: proposal Scope #6, Data model `workshop_period`)

#### Scenario: Valid key

- GIVEN the key `2026-10`
- WHEN a period is opened
- THEN it is accepted

#### Scenario: Malformed key

- GIVEN keys `2026-13`, `2026-1`, `26-10` and `2026/10`
- WHEN each is submitted
- THEN every one is rejected with a validation error

#### Scenario: Duplicate month

- GIVEN October 2026 is already open for a workshop
- WHEN "Abrir mes" is run again for that workshop and month
- THEN it fails with a duplicate-period error and the existing period is unchanged

#### Scenario: Córdoba month boundary

- GIVEN the `Clock` returns 2026-11-01T01:30:00Z (still 31 October in Córdoba)
- WHEN the default month to open is computed
- THEN it is based on October, not November

### Requirement: "Abrir mes"

"Abrir mes" MUST be one application use case that creates the period for a workshop and a month. Eligible workshops MUST be `published` or `paused`; a `draft` or `archived` workshop MUST be refused. With a previous period available, the new period MUST be prefilled with that period's fee, "materials required" flag, project title, description and images, enabled materials and capacity per turno. Without a previous period, it MUST be prefilled from the workshop's default fee and each active turno's default capacity. The new period MUST be created with status `draft`. The result MUST remain editable while the period is not closed. (Source: D8, proposal Approach 1; the eligibility rule and the `draft` start are spec-level rules, orchestrator defaults the owner may override)

#### Scenario: First month from defaults

- GIVEN a published workshop with default fee 40.000 ARS and active turnos "Mañana" (default capacity 8) and "Noche" (default capacity 6) and no previous period
- WHEN "Abrir mes" runs for `2026-10`
- THEN the period has fee 40.000 ARS and capacities 8 and 6

#### Scenario: Prefill from the previous month

- GIVEN September has fee 45.000, capacity 7 for "Mañana", a project and 3 enabled materials
- WHEN "Abrir mes" runs for October
- THEN October has the same fee, capacity, project and 3 enabled materials

#### Scenario: New period starts as draft

- GIVEN a published workshop
- WHEN "Abrir mes" runs
- THEN the created period has status `draft`

#### Scenario: Previous period is the latest earlier one

- GIVEN periods exist for July and September but not August
- WHEN "Abrir mes" runs for October
- THEN September is the source of the prefill

#### Scenario: Ineligible workshop

- GIVEN a `draft` workshop
- WHEN "Abrir mes" runs
- THEN it fails and no period is created

#### Scenario: Atomic creation

- GIVEN a repository failure part-way through creation
- WHEN "Abrir mes" runs
- THEN no partial period remains

#### Scenario: Not an admin

- GIVEN "Abrir mes" called without an `AdminActor`
- WHEN it executes
- THEN it is denied

### Requirement: Turno capacities in a period

A period MUST hold a capacity greater than zero for each turno it offers, and only for turnos that belong to the period's workshop. A new period MUST offer every active turno of the workshop. Turnos added since the previous month MUST get their default capacity; retired turnos MUST be left out. A period MUST offer at least one turno. The period's capacity per turno is stored by this change; the confirmed-seats counter is added by change 5. (Source: D3, D8, proposal Data model `period_turno`)

#### Scenario: New turno gets the default

- GIVEN September offered "Mañana" only and the workshop since gained "Tarde" with default capacity 5
- WHEN October is opened
- THEN October offers "Mañana" with September's capacity and "Tarde" with 5

#### Scenario: Retired turno left out

- GIVEN "Noche" was retired after September
- WHEN October is opened
- THEN October does not offer "Noche"
- AND September still shows "Noche"

#### Scenario: Foreign turno

- GIVEN a turno belonging to another workshop
- WHEN it is added to the period
- THEN the use case refuses

#### Scenario: Non-positive capacity

- GIVEN a capacity of 0 or -2
- WHEN the admin saves
- THEN a validation error names the capacity

#### Scenario: No offered turno

- GIVEN a workshop with no active turno
- WHEN "Abrir mes" runs
- THEN it fails naming the missing turno

#### Scenario: Edit capacity per turno

- GIVEN an open period offering two turnos
- WHEN the admin changes one turno's capacity
- THEN only that turno's capacity changes

### Requirement: Fee and materials-required flag

A period MUST hold its own fee (positive ARS `Money`) and a "materials required" flag. The fee applies equally to all turnos of the month. Changing the workshop's default fee MUST NOT change existing periods. (Source: proposal Scope #6, S3; baseline deviation A4)

#### Scenario: Default fee change is not retroactive

- GIVEN October at 40.000
- WHEN the workshop default fee changes to 50.000
- THEN October still reads 40.000

#### Scenario: Invalid fee

- GIVEN a fee of 0
- WHEN the admin saves
- THEN a validation error names the fee

### Requirement: Teacher and percentage snapshot

When a period is opened, the workshop's current teacher and agreed percentage MUST be copied into the period as a snapshot stored separately from the assignment. A later change to the assignment MUST NOT alter any existing period's snapshot. The snapshot of a period that is not closed MUST be editable by an admin; the snapshot of a closed period MUST NOT change. A workshop without an assignment MUST NOT be opened. When the assigned teacher's modality is `propia`, the snapshot holds the teacher and no percentage. When it is `de terceros`, the snapshot holds the percentage, 0 to 100 with at most 2 decimals. (Source: D2, S1, S6; baseline deviation A6; settlements read it in change 7. The modality rule is a spec-level rule, orchestrator default the owner may override)

#### Scenario: Snapshot at opening

- GIVEN a workshop assigned to teacher T at 30 %
- WHEN October is opened
- THEN October's snapshot is T at 30 %

#### Scenario: Renegotiated percentage applies from the next month

- GIVEN October opened at 30 %
- WHEN the assignment changes to 40 % and November is opened
- THEN October reads 30 % and November reads 40 %

#### Scenario: Open period snapshot editable

- GIVEN an open period with snapshot 30 %
- WHEN the admin edits the snapshot to 35 %
- THEN the period reads 35 % and the assignment is unchanged

#### Scenario: Closed period snapshot frozen

- GIVEN a closed period
- WHEN an edit to the snapshot is attempted
- THEN it is refused

#### Scenario: No assignment

- GIVEN a workshop with no teacher assignment
- WHEN "Abrir mes" runs
- THEN it fails naming the missing teacher

#### Scenario: Own teacher snapshot has no percentage

- GIVEN a workshop assigned to a `propia` teacher
- WHEN a month is opened
- THEN the snapshot holds the teacher and no percentage

#### Scenario: Percentage precision

- GIVEN an assignment of 12.34 %
- WHEN the snapshot is stored and read back
- THEN it equals exactly 12.34 %

### Requirement: Period status

A period status MUST be one of `draft`, `open`, `closed`. The owner MUST publish a `draft` period to `open`. An `open` period MUST become `closed` automatically when its month ends in `America/Argentina/Cordoba` time (evaluated through the `Clock` port), and the owner MAY close it early by hand. Allowed transitions: `draft` to `open`; `open` to `closed`. A `closed` period MUST be read-only for fee, capacities, project, materials and snapshot. (Source: proposal Data model `workshop_period` status; the lifecycle, the automatic close and the early manual close are spec-level rules, orchestrator defaults the owner may override)

#### Scenario: Automatic close at month end

- GIVEN an `open` period for `2026-10`
- WHEN the `Clock` reads 2026-11-01T03:00:00Z or later (midnight in Córdoba)
- THEN the period is `closed` the next time it is read or evaluated

#### Scenario: Not closed before month end

- GIVEN an `open` period for `2026-10`
- WHEN the `Clock` reads 2026-11-01T02:59:00Z (still 31 October in Córdoba)
- THEN the period is still `open`

#### Scenario: Early manual close

- GIVEN an `open` period in the middle of its month
- WHEN the admin closes it
- THEN it is `closed`

#### Scenario: Open then close

- GIVEN a `draft` period
- WHEN it is opened and later closed
- THEN statuses are `open` then `closed`

#### Scenario: Closed is read-only

- GIVEN a `closed` period
- WHEN the fee is edited
- THEN the edit is refused

#### Scenario: Reopening closed refused

- GIVEN a `closed` period
- WHEN a transition to `open` is attempted
- THEN it is refused

### Requirement: Monthly project

A period MUST hold at most one project: a title, a description and an ordered list of up to 6 images (media assets); the first image is the cover and images MUST be reorderable (see `media-storage`, "Activity image gallery"). The project applies to every turno of the month. A project MAY be absent (all fields empty) while the period is a draft. Alt text MUST be provided for every image used by the project. (Source: D4, S4; baseline deviation A5; mockup image 18)

#### Scenario: Project copied

- GIVEN September's project with two images
- WHEN October is opened
- THEN October's project has the same title, description and the same two images in order

#### Scenario: Editing October's project leaves September's

- GIVEN October was prefilled from September
- WHEN October's project title changes
- THEN September's title is unchanged

#### Scenario: Missing alt text

- GIVEN a project image without alt text
- WHEN the admin saves
- THEN a validation error names the alt text

### Requirement: Enabled materials

A period MUST hold a flat, ordered list of enabled materials (no duplicates), shared by all of its turnos. Only active, available materials MAY be added. A material deactivated after being enabled MUST stay visible in periods already holding it and MUST NOT be copied by "Abrir mes" into a new period. (Source: D4, S4; proposal B9 scope; baseline deviation A5; mockup image 19)

#### Scenario: No duplicates

- GIVEN a material already enabled for the period
- WHEN the admin adds it again
- THEN the list is unchanged and the use case reports a duplicate

#### Scenario: Inactive material not addable

- GIVEN a deactivated material
- WHEN it is added to a period
- THEN the use case refuses

#### Scenario: Copy skips deactivated materials

- GIVEN September enabled materials A and B, and B was deactivated afterwards
- WHEN October is opened
- THEN October enables only A
- AND September still lists A and B

#### Scenario: Shared across turnos

- GIVEN a period offering two turnos
- WHEN its enabled materials are read
- THEN one list serves both turnos

### Requirement: History and deletion

A period MUST NOT be hard-deleted once it is `open` or `closed`. A `draft` period MAY be deleted. Periods MUST remain readable after their workshop is archived. (Source: baseline deviation A10; proposal Success Criteria "no record is hard-deleted once published or used")

#### Scenario: Delete open refused

- GIVEN an `open` period
- WHEN deletion is attempted
- THEN it fails

#### Scenario: Delete draft

- GIVEN a `draft` period
- WHEN deletion is attempted
- THEN it is removed

### Requirement: Period listing

A workshop's period list MUST show each month with its status, fee and total capacity, newest first, and MUST offer "Abrir mes" prefilled with the next month not yet opened. (Source: proposal Approach 3 route "Períodos")

#### Scenario: Next month suggested

- GIVEN periods exist up to October
- WHEN the list renders
- THEN "Abrir mes" proposes November

### Requirement: Admin-only access and contract parity

Every period use case MUST require an `AdminActor` and record "last changed by / at" (and `opened_by`, `opened_at` at opening). The period repository contract suite MUST pass against the in-memory fake and the Drizzle adapter. (Source: proposal Approach 1)

#### Scenario: Opening recorded

- GIVEN an admin opens October
- WHEN the period is read
- THEN `opened_by` is her email and `opened_at` is the `Clock` time

#### Scenario: Contract parity

- GIVEN the shared contract suite
- WHEN it runs against both implementations
- THEN every case passes
