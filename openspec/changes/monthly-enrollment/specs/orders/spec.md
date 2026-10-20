# Orders Specification

## Purpose

Defines the order (one student, one workshop, one turno, one month): its identity, states and the only allowed transitions.

Traceability: exploration invariants I3, I4, I15 and the order state machine; roadmap "order states".

## Requirements

### Requirement: Order identity

An order MUST have an internal id, a human order number `CI-YYYY-NNNN` (Córdoba year, four digits minimum, per-year sequence) and a 128-bit random public id (base64url, at least 22 characters). The order number MUST NOT be accepted as a public lookup key.

#### Scenario: Public id shape

- GIVEN a created order
- WHEN its public id is read
- THEN it matches `^[A-Za-z0-9_-]{22,}$` and differs from every other order's id

#### Scenario: Number is not a key

- GIVEN order `CI-2026-0007`
- WHEN `/pedido/CI-2026-0007` is requested
- THEN the response is 404

### Requirement: States

The status MUST be one of `pending_confirmation` ("Pendiente de confirmación"), `paid` ("Cobrado"), `materials_requested` ("Solicitado al proveedor"), `materials_received` ("Recibido"), `cancelled` ("Cancelado"). There is no `expired` state in v1. (Assumption (pending owner): A6.)

#### Scenario: New order

- GIVEN a valid request
- WHEN the order is created
- THEN its status is `pending_confirmation`

### Requirement: Allowed transitions

The only allowed transitions are: `pending_confirmation` to `paid` (through `seat-claim`), `pending_confirmation` to `cancelled`, `paid` to `materials_requested` (only when the order has material lines), `paid` to `cancelled`, `materials_requested` to `materials_received`. Every other transition MUST be refused with `illegal-transition` naming the from and to states and MUST leave the order unchanged. `cancelled` and `materials_received` are terminal. Cancelling after `materials_requested` is refused. (Owner decision (2026-10-20): A5.)

#### Scenario: Table of illegal transitions

- GIVEN orders in each state
- WHEN every transition outside the allowed list is attempted
- THEN each is refused with `illegal-transition` and the stored order is identical afterwards

#### Scenario: Materials requested needs lines

- GIVEN a `paid` order without material lines
- WHEN it is marked `materials_requested`
- THEN it is refused with `illegal-transition`

#### Scenario: Terminal states

- GIVEN a `cancelled` order and a `materials_received` order
- WHEN any transition is attempted
- THEN both are refused

#### Scenario: Cancel after materials requested

- GIVEN a `materials_requested` order
- WHEN the admin cancels it
- THEN it is refused and the seat counter is unchanged

### Requirement: Transition audit

Every transition MUST record the actor email (or `public` for creation), the instant from the `Clock`, the from and to states and an optional note, append-only. A refused transition MUST NOT write an audit row.

#### Scenario: Audit written

- GIVEN an admin confirms payment
- WHEN the transaction commits
- THEN an audit row holds her email, the instant, `pending_confirmation` and `paid`

#### Scenario: Refused writes nothing

- GIVEN an illegal transition
- WHEN it is refused
- THEN the audit rows are unchanged

### Requirement: Immutable money and snapshots

After creation the fee, lines and total MUST NOT change in any state. A payment amount recorded at confirmation MUST equal the order total (partial or different amounts are refused in v1). (Owner decision (2026-10-20): A3.)

#### Scenario: Different amount

- GIVEN a `pending_confirmation` order with total 87.000
- WHEN the admin confirms with 80.000
- THEN it is refused with `amount-mismatch` and the status is unchanged
