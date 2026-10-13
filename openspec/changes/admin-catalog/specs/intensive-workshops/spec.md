# Intensive Workshops Specification

## Purpose

Defines "Intensivos": single-date weekend activities with a teacher assignment and agreed percentage, a price, a fixed deposit (seña), a capacity, a minimum number of seats, cancellation policy fields, and a publish, pause, reschedule, cancel and archive lifecycle. Enrollment and deposit payments arrive in changes 5 and 7.

Source: proposal Scope #7; decisions D2, D6, D7; assumption S7; baseline deviations A3, A10, A12, A15; baseline module "Talleres y workshops" (intensivos) in `docs/client-proposal/proposal.md`; mockup image 8 (policy), exploration I9.

## Requirements

### Requirement: Intensive record

An intensivo MUST have a name, a slug, a short description, a long description, a teacher assignment with an agreed percentage, a start and an end instant on a single local Córdoba date, a price (ARS `Money`), a fixed deposit amount, a capacity, a minimum seats number, a cancellation deadline in hours, a policy text, a "materials included" flag, up to 6 images (see `media-storage`, "Activity image gallery") and a status. It MUST have no turnos: one date and one capacity. A new intensivo MUST start as `draft`. (Source: proposal Scope #7, S7, D6)

#### Scenario: Create a draft

- GIVEN valid intensivo data
- WHEN an admin creates it
- THEN it is stored as `draft` with her email as "last changed by"

#### Scenario: End must follow start

- GIVEN an end instant equal to or before the start
- WHEN she saves
- THEN a validation error names the time range

#### Scenario: Must be a single date

- GIVEN start and end on different Córdoba dates
- WHEN she saves
- THEN a validation error names the date

### Requirement: Price and fixed deposit

The price MUST be a positive ARS amount. The deposit MUST be a fixed ARS amount with 0 < deposit <= price. The deposit MUST NOT be a percentage of the price. (Source: D6, Success Criteria; baseline deviation A12)

#### Scenario: Valid deposit

- GIVEN price 30.000 and deposit 10.000
- WHEN she saves
- THEN the values are stored

#### Scenario: Deposit equals price

- GIVEN price 30.000 and deposit 30.000
- WHEN she saves
- THEN it is accepted

#### Scenario: Deposit exceeds price

- GIVEN price 30.000 and deposit 30.001
- WHEN she saves
- THEN a validation error names the deposit

#### Scenario: Zero deposit

- GIVEN a deposit of 0
- WHEN she saves
- THEN a validation error names the deposit

#### Scenario: Price lowered below the deposit

- GIVEN price 30.000 and deposit 10.000
- WHEN the price is edited to 8.000 without changing the deposit
- THEN a validation error names the deposit

### Requirement: Capacity and minimum seats

Capacity MUST be a whole number greater than zero. Minimum seats MUST be a whole number greater than zero and no greater than capacity. (Source: proposal Data model `intensive_workshop`: min_seats <= capacity)

#### Scenario: Minimum above capacity

- GIVEN capacity 8 and minimum seats 9
- WHEN she saves
- THEN a validation error names the minimum seats

#### Scenario: Equal values

- GIVEN capacity 8 and minimum seats 8
- WHEN she saves
- THEN it is accepted

### Requirement: Policy fields

The cancellation deadline MUST be a whole number of hours greater than or equal to zero. The policy text covering cancellation and no-show MUST be stored as text of bounded length (design sets the limit). Public display is delivered by change 4. (Source: proposal Scope #7; baseline deviation A12)

#### Scenario: Negative deadline

- GIVEN a deadline of -1 hours
- WHEN she saves
- THEN a validation error names the deadline

#### Scenario: Policy stored

- GIVEN a policy text and a 48-hour deadline
- WHEN the record is read
- THEN both are present unchanged

### Requirement: Teacher assignment with agreed percentage

An intensivo MUST be assignable to one active teacher. When the teacher's modality is `de terceros`, the assignment MUST carry an agreed percentage from 0 to 100 inclusive with at most 2 decimals, stored exactly and editable at any time. When the modality is `propia`, no external teacher and no percentage are needed and a percentage MUST NOT be stored. There MUST be no teacher-level default. (Source: D2, S6; baseline deviation A6. The 2-decimal limit and the modality rule are spec-level rules, orchestrator defaults the owner may override; S6 still to confirm in change 7)

#### Scenario: Assign

- GIVEN an active teacher
- WHEN she is assigned to an intensivo at 50 %
- THEN 50 % is stored exactly

#### Scenario: Percentage out of range

- GIVEN a percentage of 101
- WHEN she saves
- THEN a validation error names the percentage

#### Scenario: Too many decimals

- GIVEN a percentage of 33.333
- WHEN she saves
- THEN a validation error names the percentage

#### Scenario: Third-party teacher needs a percentage

- GIVEN a `de terceros` teacher
- WHEN she is assigned without a percentage
- THEN a validation error names the percentage

#### Scenario: Own teacher needs no percentage

- GIVEN a `propia` teacher
- WHEN she is assigned without a percentage
- THEN the assignment is accepted with no percentage stored

#### Scenario: Archived teacher

- GIVEN an archived teacher
- WHEN she is assigned
- THEN the use case refuses

### Requirement: Slug rules

An intensivo slug MUST follow the same format as monthly workshops (lowercase ASCII letters, digits, hyphens), MUST be unique across intensivos, and MUST be generated from the name when not provided. (Source: proposal Data model `intensive_workshop`; same rule as `monthly-workshops`)

#### Scenario: Duplicate slug

- GIVEN an intensivo with slug `ceramica-fin-de-semana`
- WHEN another uses the same slug
- THEN it fails with a duplicate-slug error

### Requirement: Lifecycle states and transitions

An intensivo status MUST be one of `draft`, `published`, `paused`, `cancelled`, `archived`. Allowed transitions: `draft` to `published`; `published` to `paused`; `paused` to `published`; `published` or `paused` to `cancelled`; any state except `archived` to `archived`; `archived` to `draft` (restore). Any other transition MUST be refused. Cancelling MUST keep the record and its data. A cancellation reason or a notice to enrolled people is out of scope (changes 5 and 6). (Source: proposal Scope #7, D7; the transition table and the restore rule are spec-level rules, orchestrator defaults the owner may override)

#### Scenario: Publish

- GIVEN a `draft` intensivo meeting the publish rules
- WHEN published
- THEN status is `published`

#### Scenario: Pause and resume

- GIVEN a `published` intensivo
- WHEN paused and then published
- THEN statuses follow `paused`, `published`

#### Scenario: Cancel keeps history

- GIVEN a `published` intensivo
- WHEN it is cancelled
- THEN status is `cancelled` and all its fields remain readable

#### Scenario: Restore an archived intensivo

- GIVEN an `archived` intensivo
- WHEN the admin restores it
- THEN its status is `draft` and its data is unchanged

#### Scenario: Draft cannot be cancelled

- GIVEN a `draft` intensivo
- WHEN cancel is attempted
- THEN it is refused

#### Scenario: Cancelled cannot be published

- GIVEN a `cancelled` intensivo
- WHEN publish is attempted
- THEN it is refused

### Requirement: Publish rules

An intensivo MUST NOT be published unless it has a name, a slug, an active teacher assignment (with a percentage when the teacher is `de terceros`), a valid date range, a price, a valid deposit, a capacity and valid minimum seats. A refusal MUST name every unmet rule. (Source: proposal Scope #7; the explicit list is a spec-level rule)

#### Scenario: Missing teacher

- GIVEN a draft with no teacher assigned
- WHEN publish is attempted
- THEN it fails naming the teacher and stays `draft`

### Requirement: Reschedule

An admin MUST be able to change an intensivo's date and time range. A reschedule MUST keep the same record, slug and status, and MUST apply the same single-date and range rules. The new start MUST be in the future relative to the `Clock` when the intensivo is `published` or `paused`. Notifying enrolled people is out of scope here (changes 5 and 6). (Source: proposal Scope #7; the future-date rule is a spec-level rule)

#### Scenario: Reschedule a published intensivo

- GIVEN a published intensivo
- WHEN the admin moves it to a later Saturday
- THEN the new date is stored and the status stays `published`

#### Scenario: Reschedule into the past

- GIVEN a published intensivo and a new start before the `Clock` time
- WHEN she saves
- THEN a validation error names the date

### Requirement: Meaning of paused

A `paused` intensivo MUST remain visible, MUST be stored as `paused` and MUST NOT accept new requests. The public rendering ("Inscripciones pausadas" with a WhatsApp link) is delivered by change 4. (Source: D7; baseline deviation A15)

#### Scenario: Paused is visible but closed to requests

- GIVEN a paused intensivo
- WHEN the module API is queried
- THEN it is returned as visible and as not accepting new requests

#### Scenario: Cancelled and draft are not accepting requests

- GIVEN `cancelled` and `draft` intensivos
- WHEN the module API is queried for accepting requests
- THEN the answer is no for both

### Requirement: Archive instead of delete

A published or used intensivo MUST NOT be hard-deleted; archiving MUST preserve all data. A `draft` intensivo MAY be deleted. (Source: baseline deviation A10)

#### Scenario: Delete published refused

- GIVEN a published intensivo
- WHEN deletion is attempted
- THEN it fails

#### Scenario: Delete draft

- GIVEN a draft intensivo
- WHEN deletion is attempted
- THEN it is removed

### Requirement: Admin-only access and contract parity

Every intensivo use case MUST require an `AdminActor` and record "last changed by / at". The repository contract suite MUST pass against the in-memory fake and the Drizzle adapter. (Source: proposal Approach 1)

#### Scenario: No actor

- GIVEN an intensivo use case called without an actor
- WHEN it executes
- THEN it is denied

#### Scenario: Contract parity

- GIVEN the shared contract suite
- WHEN it runs against both implementations
- THEN every case passes
