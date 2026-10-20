# Admin Enrollments Specification

## Purpose

Defines the admin screens and use cases to list orders, view detail, confirm payment, cancel and advance the materials states. Every use case takes an `AdminActor` as its first argument, as the change 3 services do.

Traceability: `admin-access` (change 3); exploration F2; roadmap "admin enrollments".

## Requirements

### Requirement: Admin-only access

Every admin use case MUST refuse a missing, malformed or non-admin actor with `denied` before reading or writing data, and an unavailable service MUST fail closed. Routes live under `/admin/inscripciones/**` and rely on the existing `/admin` gate; use cases MUST NOT trust the route alone.

#### Scenario: No actor

- GIVEN no actor
- WHEN any admin enrollment use case is called
- THEN the result is `denied` and the repository is not called

#### Scenario: Public call to admin route

- GIVEN a request to `/admin/inscripciones` that did not pass the gate
- WHEN the loader runs
- THEN no order data is returned

#### Scenario: Unavailable service

- GIVEN the enrollments service is the fail-closed placeholder
- WHEN the admin list is requested
- THEN the result is `unavailable`

### Requirement: Order list

The list MUST show, newest first, order number, student name, taller, month, turno, status, total and requested date (Córdoba). It MUST filter by status, period month and workshop, and by text on order number, name or email, and MUST be paginated at 50 rows. The default filter is `pending_confirmation`.

#### Scenario: Default inbox

- GIVEN orders in every state
- WHEN the admin opens `/admin/inscripciones`
- THEN only pending orders are listed, newest first

#### Scenario: Filter by period

- GIVEN orders in `2026-10` and `2026-11`
- WHEN the admin filters by `2026-11`
- THEN only November orders appear

#### Scenario: Search by email

- GIVEN an order for ana@example.com
- WHEN the admin searches "ana@"
- THEN that order is listed

### Requirement: Order detail

The detail MUST show every stored field including email and phone, lines, totals, payment fields, seat state of the turno (confirmed / capacity) and the audit trail. Phone and email appear only in admin views.

#### Scenario: Detail content

- GIVEN a paid order with two lines
- WHEN the admin opens it
- THEN the lines, total, paid date, confirming admin and audit rows are shown

### Requirement: Confirm payment

The admin confirms with an amount (whole pesos), a payment date (Córdoba date, not in the future) and an optional note. The amount MUST equal the order total. The use case MUST run the `seat-claim` transaction and surface `turno-full`, `period-closed`, `amount-mismatch`, `illegal-transition` and `alreadyConfirmed` as distinct Spanish messages. The UI MUST disable the submit while pending.

#### Scenario: Successful confirm

- GIVEN a pending order and a free seat
- WHEN the admin submits the correct amount
- THEN the order is `paid` with her email, date and note, and the list no longer shows it in the default inbox

#### Scenario: Future date

- GIVEN a payment date tomorrow
- WHEN submitted
- THEN a validation error names the date and nothing changes

#### Scenario: Full turno message

- GIVEN a full turno
- WHEN the admin confirms
- THEN the page shows that the turno is full and the order stays pending

#### Scenario: Decimal amount

- GIVEN an amount of "58000,50"
- WHEN submitted
- THEN a validation error names the amount (`not-whole-pesos`)

### Requirement: Cancel

The admin cancels with a mandatory reason (3 to 300 characters) after a confirmation dialog. Cancelling a `paid` order releases the seat per `seat-claim`. Students cannot cancel from public pages. (Owner decision (2026-10-20): A5.)

#### Scenario: Cancel pending

- GIVEN a pending order
- WHEN the admin cancels with a reason
- THEN it is `cancelled` and counters are unchanged

#### Scenario: Missing reason

- GIVEN an empty reason
- WHEN submitted
- THEN a validation error names the reason

#### Scenario: Cancel paid releases seat

- GIVEN a paid order and 4 confirmed seats
- WHEN cancelled
- THEN confirmed seats are 3

### Requirement: Materials progress

The admin MAY mark a `paid` order with material lines `materials_requested` and then `materials_received`, singly or in bulk from the supplier consolidation. Bulk MUST apply each order independently and report per-order outcomes; one illegal order MUST NOT block the rest.

#### Scenario: Bulk with one illegal

- GIVEN three paid orders and one cancelled order selected
- WHEN the admin marks them requested
- THEN three succeed and the cancelled one reports `illegal-transition`

### Requirement: Same-origin mutations

Mutating admin routes MUST be POST actions subject to the existing same-origin rule; a cross-origin POST MUST be refused.

#### Scenario: Cross-origin

- GIVEN a cross-origin POST to confirm payment
- WHEN processed
- THEN it is refused and the order is unchanged
