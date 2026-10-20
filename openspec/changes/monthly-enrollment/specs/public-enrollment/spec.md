# Public Enrollment Specification

## Purpose

Defines how a visitor enrolls in a monthly taller: the form, validation, the offer rules (open month, turno, capacity), the creation of a pending order, the confirmation page and the `wa.me` hand-off. Seats are never consumed here (see `seat-claim`).

Traceability: roadmap change 5; public-catalog `talleres-pages` and `public-catalog-reader` (change 4); exploration F1 (`platform-foundation/exploration.md`). UI copy is es-AR with voseo and never uses the word "workshop". Fixtures use neutral invented data.

## Requirements

### Requirement: Enrollment offer

Enrollment MUST be possible only for a published, non-paused taller, in a period that is `open`, whose month is the current Córdoba month or a later month, for a turno offered by that period. The offer MUST show the period fee, the turno and `materialsRequired`. A visitor MUST NOT be able to enroll in a past month, a `draft` or `closed` period, a retired turno, or a turno of another workshop.

#### Scenario: Open current month

- GIVEN a published taller with an `open` period for `2026-10` and the Córdoba date 2026-10-20
- WHEN the visitor opens `/talleres/:slug/inscripcion`
- THEN the form shows the fee, the offered turnos and the period month

#### Scenario: Córdoba month boundary

- GIVEN `2026-10` and `2026-11` are both `open`
- WHEN an order for `2026-10` is requested at 2026-11-01T01:00:00Z (31 October, 22:00 in Córdoba)
- THEN it is accepted
- AND the same request at 2026-11-01T03:00:00Z is refused with `period-closed`

#### Scenario: Paused or unpublished taller

- GIVEN a paused taller, and separately a draft taller
- WHEN the form route is requested
- THEN the paused taller shows "Inscripciones pausadas" with a WhatsApp link and no form, and the draft taller answers 404

#### Scenario: Foreign or retired turno

- GIVEN a turno of another workshop, and separately a retired turno
- WHEN an order is requested with it
- THEN the request is refused with `turno-not-offered` and nothing is stored

### Requirement: Student data validation

The form MUST collect full name (2 to 100 characters after trimming), email (valid format, lowercased and trimmed), phone (an Argentine number normalizable by the `site-content` WhatsApp digits rule) and the acceptance of the policy text. All failures MUST be returned together, naming each field, and nothing MUST be stored on failure. A filled honeypot field MUST answer as success-looking without storing anything. (Owner decision (2026-10-20): A8, the student is captured on the order; there is no student table until change 7.)

#### Scenario: Several errors at once

- GIVEN an empty name, an email without "@" and no policy acceptance
- WHEN the form is submitted
- THEN the response names `name`, `email` and `policy` and no order exists

#### Scenario: Normalization

- GIVEN the email " Ana@Example.COM " and the phone "351 555-1234"
- WHEN the order is created
- THEN the stored email is "ana@example.com" and the stored phone digits are "5493515551234"

#### Scenario: Honeypot

- GIVEN a submission whose honeypot field is filled
- WHEN it is processed
- THEN no order is stored and the response does not reveal the rule

### Requirement: Pending order creation

A valid request MUST create exactly one order in `pending_confirmation` in a single transaction: it MUST snapshot the workshop name, period key, turno label, weekday and time range, the fee and every cart line (see `materials-cart`), recompute the total on the server, assign the order number and an unguessable public id, and store the policy version accepted. It MUST NOT change any seat counter. Money MUST be whole pesos (`Money`, centavos a multiple of 100).

#### Scenario: Happy path

- GIVEN an open period with fee 58.000, materials not required and a valid form without materials
- WHEN the order is created
- THEN the status is `pending_confirmation`, the total is 58.000 and the turno's seat counter is unchanged

#### Scenario: Client-sent totals are ignored

- GIVEN a request body claiming a total of 1.000
- WHEN the order is created
- THEN the stored total is the server-computed fee plus lines

#### Scenario: Order number is per Córdoba year

- GIVEN the instant 2027-01-01T02:00:00Z (31 December 2026 in Córdoba)
- WHEN an order is created
- THEN its number starts with `CI-2026-`
- AND the first order after Córdoba midnight of 1 January 2027 is `CI-2027-0001`

#### Scenario: Atomic number sequence

- GIVEN twenty orders created concurrently in the same year
- WHEN they all commit
- THEN their numbers are unique and consecutive with no gap

#### Scenario: Rollback leaves no trace

- GIVEN a failure after the number is assigned but before the order is inserted
- WHEN the transaction rolls back
- THEN no order exists and the number is reused

### Requirement: One active order per email, taller and month

A second request for the same normalized email, workshop and period while a non-cancelled order exists MUST be refused with `duplicate-order` and a generic Spanish message that directs the visitor to WhatsApp. The message MUST NOT include the other order's identifiers. A cancelled order MUST NOT block a new request. (Assumption (pending owner): A2.)

#### Scenario: Duplicate refused

- GIVEN a pending order for ana@example.com, taller T, period 2026-10
- WHEN the same email requests another turno of T for 2026-10
- THEN the request is refused with `duplicate-order`

#### Scenario: After cancel

- GIVEN that order was cancelled
- WHEN the same email requests again
- THEN a new order is created

### Requirement: Full turno at request time

When the turno's confirmed seats already equal its capacity, the request MUST be refused with `turno-full` and Spanish copy offering a WhatsApp contact. When seats remain, pending orders MUST NOT be limited by other pending orders (no seat hold). (Owner decision (2026-10-20): A1.)

#### Scenario: Full

- GIVEN capacity 8 and 8 confirmed seats
- WHEN a visitor requests an order
- THEN it is refused with `turno-full`

#### Scenario: Pending orders do not reduce availability

- GIVEN capacity 8, 7 confirmed seats and 5 pending orders
- WHEN a visitor requests an order
- THEN it is accepted

### Requirement: Confirmation page

After creation the visitor MUST be redirected to `/pedido/:publicId`, a `noindex` page showing the order number, taller, month, turno, lines, total, the status "Pendiente de confirmación", the four payment steps and the WhatsApp call to action. The page MUST NOT expose the email, the phone or any internal id. An unknown public id MUST answer 404 in the public layout.

#### Scenario: Summary

- GIVEN a pending order
- WHEN `/pedido/:publicId` renders
- THEN it shows number, taller, month, turno, total and "Pendiente de confirmación"
- AND it contains `noindex` and no email, phone or internal id

#### Scenario: Unknown id

- GIVEN an unknown public id
- WHEN the page is requested
- THEN the response is 404

#### Scenario: Status is live

- GIVEN a `paid` order
- WHEN its page renders
- THEN the status reads "Cobrado" and the WhatsApp call to action is replaced by a thank-you note

### Requirement: wa.me hand-off

The call to action MUST link to `https://wa.me/<digits>?text=<encoded message>` built with the existing `site-content` builder from the business profile WhatsApp number; no number is hard-coded and no new secret exists. The message MUST contain the order number, the student name, taller, month, turno, one line per cart item and the total, MUST be capped at 1.200 characters before encoding, and when capped MUST keep at least the order number and total. If the profile number is invalid the page MUST still render and hide the link. (Assumption (pending owner): message content.)

#### Scenario: Message contents

- GIVEN order CI-2026-0007 for "Ana Pérez", taller "Cerámica", October, Monday 10:00 to 12:00, total 58.000
- WHEN the link is built
- THEN the decoded text contains "CI-2026-0007", "Ana Pérez", "Cerámica", the month, the turno and "$ 58.000"

#### Scenario: Length cap

- GIVEN an order with thirty cart lines
- WHEN the link is built
- THEN the decoded text is at most 1.200 characters and still contains the order number and total

#### Scenario: Invalid profile number

- GIVEN a business profile number that does not normalize
- WHEN the page renders
- THEN the order summary is shown and no `wa.me` link exists

### Requirement: Public data privacy

Public use cases MUST be actorless and MUST return only allowlisted fields. Creation responses and the confirmation page MUST NOT contain other students' data.

#### Scenario: Serialization allowlist

- GIVEN a fully populated order with sentinel values in email and phone
- WHEN the public view is serialized
- THEN no sentinel appears
