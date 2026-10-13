# Monthly Workshops Specification

## Purpose

Defines "Talleres": the recurring monthly activity, its teacher assignment with the agreed percentage, its turnos (weekday and time range with a default capacity), its default fee, and its publish, pause and archive lifecycle. Month-specific data (fee, capacity per turno, project, materials, percentage snapshot) belongs to `workshop-periods`.

Source: proposal Scope #4, #5; decisions D2, D3, D7; baseline deviations A3, A4, A6, A10, A15; baseline module "Talleres y workshops" (`docs/client-proposal/proposal.md`); mockups images 6, 14.

## Requirements

### Requirement: Workshop record

A monthly workshop MUST have a name, a slug, a short description, a long description, a technique or category label (free text; spec-level rule, orchestrator default the owner may override), a default monthly fee in ARS (`Money`), a teacher assignment, up to 6 images (see `media-storage`, "Activity image gallery"), and a status. It MUST keep "last changed by / at". A new workshop MUST start as `draft`. (Source: proposal Scope #4)

#### Scenario: Create a draft

- GIVEN an admin and valid workshop data
- WHEN she creates the workshop
- THEN it is stored with status `draft` and her email as "last changed by"

#### Scenario: Required fields

- GIVEN a missing name or a fee of zero or less
- WHEN she saves
- THEN validation errors name the offending fields and nothing is stored

#### Scenario: Fee is ARS money

- GIVEN a default fee entered as a decimal or negative number
- WHEN she saves
- THEN it is rejected unless it is a positive whole amount of ARS (cents per the `Money` representation)

### Requirement: Slug rules

A slug MUST be lowercase ASCII letters, digits and hyphens, unique across monthly workshops (archived included), and MUST be generated from the name when not provided. A slug of a published workshop SHOULD NOT change; changing it MUST require an explicit confirmation. (Source: proposal Data model `monthly_workshop`: slug unique; the stability and confirmation rule is a scope adjustment because public URLs depend on it in change 4)

#### Scenario: Generated slug

- GIVEN the name "Cerámica Creativa" and no slug
- WHEN the workshop is created
- THEN the slug is `ceramica-creativa`

#### Scenario: Duplicate slug

- GIVEN a workshop with slug `ceramica`
- WHEN another is saved with slug `ceramica`
- THEN it fails with a duplicate-slug error

#### Scenario: Invalid slug

- GIVEN a slug "Cerámica Creativa!"
- WHEN she saves
- THEN a validation error names the slug field

### Requirement: Teacher assignment with agreed percentage

A workshop MUST be assignable to one teacher. When the assigned teacher's modality is `de terceros`, the assignment MUST carry an agreed percentage between 0 and 100 inclusive with at most 2 decimals, stored exactly (for example in basis points) without floating-point drift. When the modality is `propia`, the assignment needs no external teacher and no percentage, and a percentage MUST NOT be stored. The percentage lives on the assignment, per teacher per workshop, and MUST be editable at any time. There MUST be no teacher-level default percentage. Only an active teacher MAY be assigned. Changing the assignment MUST NOT alter any already opened period's snapshot. (Source: D2, S1, S2, S6; baseline deviation A6. Spec-level rules, orchestrator defaults the owner may override: the 2-decimal limit and the propia / de terceros percentage rule; S6 still to confirm in change 7)

#### Scenario: Assign with percentage

- GIVEN an active teacher and a workshop
- WHEN the admin assigns her with 35.5 %
- THEN the assignment stores exactly 35.5 %

#### Scenario: Out of range

- GIVEN a percentage of 100.01 or -1
- WHEN she saves
- THEN a validation error names the percentage

#### Scenario: Too many decimals

- GIVEN a percentage of 12.345
- WHEN she saves
- THEN a validation error names the percentage

#### Scenario: Third-party teacher needs a percentage

- GIVEN a teacher with modality `de terceros`
- WHEN she is assigned without a percentage
- THEN a validation error names the percentage

#### Scenario: Own teacher needs no percentage

- GIVEN a teacher with modality `propia`
- WHEN she is assigned without a percentage
- THEN the assignment is accepted with no percentage stored

#### Scenario: Archived teacher not assignable

- GIVEN an archived teacher
- WHEN she is assigned to a workshop
- THEN the use case fails with a validation error

#### Scenario: Renegotiation leaves history alone

- GIVEN an opened period with snapshot 30 %
- WHEN the workshop's percentage is changed to 40 %
- THEN the opened period still reads 30 %

### Requirement: Turnos definition

A monthly workshop MUST own zero or more turnos. A turno MUST have a label (unique within the workshop, free text such as "Mañana", "Tarde", "Noche"), exactly one weekday (spec-level rule, orchestrator default the owner may override), a start time and an end time (local Córdoba wall-clock times, end after start), a default capacity greater than zero, an active flag and a sort position. Turno labels and times are data loaded by the owners; no mockup data is seeded. (Source: proposal Scope #5, D3, S5; baseline deviation A4)

#### Scenario: Add a turno

- GIVEN a workshop
- WHEN the admin adds turno "Mañana", Tuesday, 10:00 to 12:00, capacity 8
- THEN the turno is stored active with those values

#### Scenario: End before start

- GIVEN start 12:00 and end 10:00
- WHEN she saves
- THEN a validation error names the time range

#### Scenario: Equal start and end

- GIVEN start 10:00 and end 10:00
- WHEN she saves
- THEN a validation error names the time range

#### Scenario: Zero capacity

- GIVEN a default capacity of 0
- WHEN she saves
- THEN a validation error names the capacity

#### Scenario: Duplicate label

- GIVEN turno "Tarde" exists in the workshop
- WHEN another turno "tarde" is added to the same workshop
- THEN it fails with a duplicate-label error
- AND the same label is allowed in a different workshop

#### Scenario: Invalid weekday

- GIVEN a weekday outside Monday to Sunday
- WHEN the use case runs
- THEN it fails with a validation error

### Requirement: Turno retirement keeps history

A turno MUST be retired (active false), never deleted once it has been used by any period. A turno that no period has used MAY be deleted. A retired turno MUST NOT be offered by new periods and MUST remain visible in periods that already hold it. A retired turno MAY be reactivated. (Source: proposal Scope #5; baseline deviation A10)

#### Scenario: Retire a used turno

- GIVEN a turno with capacity in October's period
- WHEN the admin retires it
- THEN it is inactive and October still shows it with its capacity

#### Scenario: Delete an unused turno

- GIVEN a turno never used by a period
- WHEN the admin deletes it
- THEN it is removed

#### Scenario: Delete a used turno refused

- GIVEN a turno used by a period
- WHEN deletion is attempted
- THEN it fails and the turno is retired or unchanged

### Requirement: Lifecycle states and transitions

A workshop status MUST be one of `draft`, `published`, `paused`, `archived`. Allowed transitions: `draft` to `published`; `published` to `paused`; `paused` to `published`; any non-archived state to `archived`; `archived` to `draft` (restore). Any other transition MUST be refused with an error and no change. (Source: proposal Scope #4, D7; the explicit transition table and the restore rule are spec-level rules, orchestrator defaults the owner may override)

#### Scenario: Publish

- GIVEN a `draft` workshop that meets the publish rules
- WHEN the admin publishes it
- THEN its status is `published`

#### Scenario: Pause and resume

- GIVEN a `published` workshop
- WHEN it is paused and later published again
- THEN statuses are `paused` then `published`

#### Scenario: Refused transition

- GIVEN a `draft` workshop
- WHEN a pause is attempted
- THEN it fails and the status stays `draft`

#### Scenario: Restore an archived workshop

- GIVEN an `archived` workshop
- WHEN the admin restores it
- THEN its status is `draft` and its turnos, periods and snapshots are unchanged

#### Scenario: Archive from any live state

- GIVEN workshops in `draft`, `published` and `paused`
- WHEN each is archived
- THEN all become `archived`

### Requirement: Publish rules

A workshop MUST NOT be published unless it has a name, a valid slug, an active teacher assignment (with a percentage when the teacher is `de terceros`), a default fee and at least one active turno. A refusal MUST name every unmet rule. (Source: proposal Scope #5 "cannot be published without an active turno", Success Criteria)

#### Scenario: No active turno

- GIVEN a draft workshop whose only turno is retired
- WHEN publish is attempted
- THEN it fails naming "al menos un turno activo" and stays `draft`

#### Scenario: Several unmet rules

- GIVEN a draft with no teacher and no turno
- WHEN publish is attempted
- THEN the error lists both rules

#### Scenario: Retiring the last active turno of a published workshop

- GIVEN a `published` workshop with one active turno
- WHEN that turno is retired
- THEN the use case refuses and the turno stays active
- AND the owner must pause the workshop first (spec-level rule, orchestrator default the owner may override)

### Requirement: Meaning of paused

A `paused` workshop MUST remain visible, MUST be stored as `paused`, and MUST NOT accept new requests. The public rendering ("Inscripciones pausadas" with a WhatsApp link) is delivered by change 4; this change stores the state and exposes it through the module API. (Source: D7; baseline deviation A15)

#### Scenario: Paused is exposed as accepting no requests

- GIVEN a paused workshop
- WHEN the module API is queried for whether it accepts new requests
- THEN the answer is no
- AND the workshop is still returned by the visible-activities query

#### Scenario: Draft and archived are not visible

- GIVEN `draft` and `archived` workshops
- WHEN the visible-activities query runs
- THEN neither is returned

### Requirement: Archive instead of delete

A published or used workshop MUST NOT be hard-deleted. Archiving MUST preserve its turnos, periods and snapshots. A `draft` workshop that has no periods MAY be deleted. (Source: proposal Scope #4; baseline deviation A10)

#### Scenario: Archive keeps periods

- GIVEN a workshop with two periods
- WHEN it is archived
- THEN both periods remain readable

#### Scenario: Delete refused for published

- GIVEN a published workshop
- WHEN deletion is attempted
- THEN it fails

### Requirement: Listing and filter

The list MUST show name, teacher, status and number of active turnos, filterable by status, and MUST exclude archived workshops by default. (Source: proposal Approach 3)

#### Scenario: Default excludes archived

- GIVEN one published and one archived workshop
- WHEN the list opens with no filter
- THEN only the published workshop is shown

### Requirement: Admin-only access and contract parity

Every workshop use case MUST require an `AdminActor`. The workshop repository contract suite MUST pass against the in-memory fake and the Drizzle adapter. (Source: proposal Approach 1, Success Criteria)

#### Scenario: No actor

- GIVEN a workshop use case called without an actor
- WHEN it executes
- THEN it is denied

#### Scenario: Contract parity

- GIVEN the shared contract suite
- WHEN it runs against both implementations
- THEN every case passes
