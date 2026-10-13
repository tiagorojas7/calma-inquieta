# Materials Catalog Specification

## Purpose

Defines "Materiales": the shared catalog of materials with variants (each with its own price), availability, one supplier per material, images, and the supplier list. Which materials a month offers is decided per period (`workshop-periods`); ordering arrives in change 5.

Source: proposal Scope #8, #9; decisions D4, D5; assumption S8; baseline deviations A5, A11; mockup images 17, 19; baseline module "Materiales" (`docs/client-proposal/proposal.md`).

## Requirements

### Requirement: Material record

A material MUST have a name, a description, a category or type label, exactly one supplier, an availability flag, an active flag, an optional image and one or more variants. Availability is on or off with no stock quantity. Records MUST keep "last changed by / at". (Source: proposal Scope #8, S8; baseline deviation A5)

#### Scenario: Create a material

- GIVEN an admin, valid data, a supplier and one variant
- WHEN she creates the material
- THEN it is stored active and available with her email as "last changed by"

#### Scenario: Missing name

- GIVEN a blank name
- WHEN she saves
- THEN a validation error names the field and nothing is stored

#### Scenario: Missing supplier

- GIVEN no supplier selected
- WHEN she saves
- THEN a validation error names the supplier

#### Scenario: No stock field

- GIVEN the material form and record
- WHEN fields are listed
- THEN no stock quantity and no cost price exist

### Requirement: Variants

A material MUST have at least one variant. A variant MUST have a label (unique within the material), its own positive price in ARS, an availability flag, a sort position and an optional swatch (a color value). A material without options MUST have exactly one default variant whose label is a fixed default. Prices belong to variants, not to the material. (Source: proposal Scope #8, Data model `material_variant`; baseline deviation A5; mockup image 19)

#### Scenario: Material with options

- GIVEN a material with variants "Chico" at 3.000 and "Grande" at 5.000
- WHEN it is read
- THEN each variant carries its own price

#### Scenario: Default variant

- GIVEN a material created without options and with a price
- WHEN it is stored
- THEN exactly one default variant exists with that price

#### Scenario: Removing the last variant

- GIVEN a material with one variant
- WHEN removal of that variant is attempted
- THEN it is refused

#### Scenario: Duplicate variant label

- GIVEN variants "Rojo" and "rojo" on the same material
- WHEN she saves
- THEN a validation error names the label

#### Scenario: Non-positive price

- GIVEN a variant price of 0
- WHEN she saves
- THEN a validation error names the price

#### Scenario: Invalid swatch

- GIVEN a swatch value that is not a valid color
- WHEN she saves
- THEN a validation error names the swatch

### Requirement: Variant retirement keeps history

A variant that has been used (referenced by any later record) MUST NOT be hard-deleted; it MUST be marked unavailable instead. A variant never used MAY be deleted when at least one other variant remains. (Source: baseline deviation A10, proposal Success Criteria)

#### Scenario: Used variant unavailable instead of deleted

- GIVEN a variant referenced by a later order record
- WHEN the admin removes it
- THEN it is kept and marked unavailable

### Requirement: Availability and deactivation

A material MUST be deactivated (active false), never hard-deleted once used or enabled in a period. A deactivated material MUST NOT be selectable for new period offers and MUST remain readable where it was already enabled. A material or a variant marked unavailable MUST be stored as such for later changes to exclude from ordering. A deactivated material MAY be reactivated. (Source: proposal Scope #8; baseline deviation A10)

#### Scenario: Deactivate

- GIVEN a material enabled in October
- WHEN it is deactivated
- THEN October still shows it and the offer picker for new months does not

#### Scenario: Unavailable variant

- GIVEN a variant marked unavailable
- WHEN the material is read
- THEN the variant is returned with availability false

#### Scenario: Reactivate

- GIVEN a deactivated material
- WHEN reactivated
- THEN it is selectable again

### Requirement: Category

Each material MUST have a category or type label, free text, trimmed and non-empty. (Source: proposal Scope #8; free text rather than a fixed list is a spec-level rule, orchestrator default the owner may override)

#### Scenario: Blank category

- GIVEN a blank category
- WHEN she saves
- THEN a validation error names the category

### Requirement: Supplier record

A supplier MUST have a name and MAY have a phone, an email and notes. The name MUST be unique (case-insensitive) among active suppliers. An email, when provided, MUST be valid. Suppliers MUST be archived, never deleted. An archived supplier MUST NOT be selectable for materials and MUST remain visible on materials that already point to it. Supplier consolidation and "Copiar resumen" arrive in change 5. (Source: D5; baseline deviation A11; mockup image 17)

#### Scenario: Create supplier

- GIVEN a name and a phone
- WHEN an admin creates the supplier
- THEN it is stored active

#### Scenario: Duplicate active name

- GIVEN an active supplier "Casa Pincel"
- WHEN "casa pincel" is created
- THEN it fails with a duplicate-name error

#### Scenario: Archive keeps links

- GIVEN a material pointing to supplier S
- WHEN S is archived
- THEN the material still shows S

#### Scenario: Archived not selectable

- GIVEN an archived supplier
- WHEN the supplier select is built
- THEN it is not offered

#### Scenario: Invalid email

- GIVEN an email "x"
- WHEN she saves
- THEN a validation error names the email

### Requirement: Material image

A material MAY reference one stored image (see `media-storage`). When an image is set, alt text MUST be required. A reference to a missing image MUST render as "sin imagen" and MUST NOT break the screen. (Source: proposal Scope #8, #10, Rollback "R2")

#### Scenario: Alt text required

- GIVEN a material image without alt text
- WHEN she saves
- THEN a validation error names the alt text

#### Scenario: Dangling image

- GIVEN a material referencing an image id that no longer exists
- WHEN the list renders
- THEN "sin imagen" is shown and the page succeeds

### Requirement: Listing

The material list MUST show name, category, supplier, variant count and state, filterable by category, supplier and active state, ordered by name. (Source: proposal Approach 3 screens)

#### Scenario: Filter by supplier

- GIVEN materials from two suppliers
- WHEN the list is filtered by one supplier
- THEN only that supplier's materials are shown

### Requirement: Admin-only access and contract parity

Every material and supplier use case MUST require an `AdminActor`. The `MaterialRepository` and `SupplierRepository` contract suites MUST pass against the in-memory fakes and the Drizzle adapters. (Source: proposal Approach 1, Success Criteria)

#### Scenario: No actor

- GIVEN a material use case called without an actor
- WHEN it executes
- THEN it is denied

#### Scenario: Contract parity

- GIVEN the shared contract suites
- WHEN they run against both implementations
- THEN every case passes
