# Teachers Specification

## Purpose

Defines the Profesores catalog: who teaches. The teacher record carries no percentage; the agreed percentage lives on each workshop's and intensivo's teacher assignment.

Source: proposal Scope #3; decision D2; baseline deviations A6, A7, A10; baseline module "Profesores" (`docs/client-proposal/proposal.md`).

## Requirements

### Requirement: Teacher record

A teacher MUST have a name (required) and a short bio line (required; shown publicly in change 4), and MAY have a phone and an email. A teacher MUST have a modality, `propia` (the owners teach) or `de terceros` (external). A teacher MUST have an active flag. The record MUST NOT contain a percentage. Teacher records MUST keep "last changed by / at". (Source: proposal Scope #3, D2, S6)

#### Scenario: Create a minimal teacher

- GIVEN an admin and a name, a bio line and a modality
- WHEN she creates the teacher
- THEN it is stored active with her email as "last changed by"

#### Scenario: Missing required field

- GIVEN a name that is empty or only spaces
- WHEN she saves
- THEN a validation error names the field and nothing is stored

#### Scenario: No percentage on the teacher

- GIVEN the teacher form and the stored record
- WHEN fields are listed
- THEN there is no percentage field

### Requirement: Validation

A name MUST be trimmed and unique (case-insensitive) among active teachers. When provided, the email MUST be a valid email address and the phone MUST contain at least one digit. The modality MUST be one of the two allowed values. (Source: proposal Scope #3; uniqueness is a spec-level rule not stated in the proposal, scope adjustment)

#### Scenario: Duplicate active name

- GIVEN an active teacher "Lucía Pérez"
- WHEN another is created as "lucía pérez"
- THEN creation fails with a duplicate-name error

#### Scenario: Name reusable after archive

- GIVEN "Lucía Pérez" is archived
- WHEN a new teacher "Lucía Pérez" is created
- THEN it succeeds

#### Scenario: Invalid email

- GIVEN an email "not-an-email"
- WHEN she saves
- THEN a validation error names the email field

#### Scenario: Unknown modality

- GIVEN a modality value other than the two allowed
- WHEN the use case runs
- THEN it fails with a validation error

### Requirement: Modality meaning

Modality `propia` means the owners teach: an assignment of that teacher needs no external teacher and no percentage. Modality `de terceros` means an external teacher: every assignment of that teacher requires an agreed percentage (see `monthly-workshops` and `intensive-workshops`). (Source: S6, still to confirm in change 7; spec-level rule, orchestrator default the owner may override)

#### Scenario: Modality drives the percentage rule

- GIVEN one `propia` and one `de terceros` teacher
- WHEN each is assigned to a workshop without a percentage
- THEN the `propia` assignment is accepted and the `de terceros` assignment is refused

### Requirement: Edit

An admin MUST be able to edit every field of a teacher, including modality. Editing MUST NOT change any assignment percentage or any period snapshot. (Source: proposal Scope #3, D2)

#### Scenario: Edit bio

- GIVEN an existing teacher
- WHEN the bio line is changed
- THEN the new bio is stored and "last changed by / at" updates

#### Scenario: Editing leaves snapshots alone

- GIVEN a teacher referenced by an opened period snapshot
- WHEN the teacher's name is edited
- THEN the period snapshot's agreed percentage is unchanged

### Requirement: Archive instead of delete

A teacher MUST be archived (active flag false), never hard-deleted. An archived teacher MUST remain readable wherever past records reference her and MUST NOT be selectable as the teacher of a new assignment. An archived teacher MAY be reactivated. Archiving a teacher who is still assigned to workshops or intensivos MUST be allowed and MUST show a warning naming the affected activities; existing assignments and period snapshots keep her. (Source: proposal Scope #3; baseline deviation A10. The warning rule is a spec-level rule, orchestrator default the owner may override)

#### Scenario: Archived teacher kept in history

- GIVEN a teacher referenced by a period snapshot
- WHEN she is archived
- THEN the period still shows her name

#### Scenario: Archive while assigned warns

- GIVEN a teacher assigned to an active workshop
- WHEN an admin archives her
- THEN the archive succeeds with a warning that names the workshop
- AND the workshop's assignment and period snapshots still show her

#### Scenario: Not selectable

- GIVEN an archived teacher
- WHEN the teacher select for a workshop is built
- THEN she is not offered

#### Scenario: Reactivate

- GIVEN an archived teacher
- WHEN an admin reactivates her
- THEN she is active and selectable again

### Requirement: Listing

The list MUST show name, modality and state, filterable by active and archived, ordered by name. (Source: proposal Approach 3 screens)

#### Scenario: Filter

- GIVEN two active and one archived teacher
- WHEN the archived filter is applied
- THEN only the archived teacher is listed

### Requirement: Admin-only access

Every teacher use case MUST require an `AdminActor`. (Source: proposal Approach 1)

#### Scenario: No actor

- GIVEN a teacher use case called without an actor
- WHEN it executes
- THEN it is denied and no repository call is made

### Requirement: Repository contract parity

The `TeacherRepository` contract suite MUST pass against both the in-memory fake and the Drizzle adapter. (Source: proposal Approach 1, Success Criteria)

#### Scenario: Both pass

- GIVEN the shared contract suite
- WHEN it runs against the fake and the Postgres adapter
- THEN every case passes for both
