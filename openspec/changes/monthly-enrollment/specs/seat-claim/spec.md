# Seat Claim Specification

## Purpose

Defines the only operation that consumes a seat: confirming the payment of a pending order. Capacity must never be exceeded, retries must be harmless and a release must be symmetrical. This is the highest-risk capability of the change.

Traceability: exploration invariants I2, I3 (idempotent "marking paid"); change 3 `workshop-periods` ("the confirmed-seats counter is added by change 5").

## Requirements

### Requirement: Claim on confirmation only

A seat for (period, turno) MUST be consumed only by confirming payment of a `pending_confirmation` order, in the same transaction that moves the order to `paid`. Creating, listing, viewing or cancelling a pending order MUST NOT change any counter. (Owner decision (2026-10-20): A1.)

#### Scenario: Confirm claims one seat

- GIVEN capacity 8, 3 confirmed seats and a pending order for the turno
- WHEN the admin confirms payment
- THEN the order is `paid` and confirmed seats are 4

#### Scenario: Pending changes nothing

- GIVEN 3 confirmed seats
- WHEN five pending orders are created and one is cancelled
- THEN confirmed seats are still 3

### Requirement: Capacity is never exceeded

The claim MUST fail with `turno-full` when confirmed seats already equal the capacity read for that (period, turno), leaving the order `pending_confirmation` and the counter unchanged. The database MUST also enforce `confirmed_seats <= capacity` through a `CHECK`. There is no override in v1. (Owner decision (2026-10-20): A4.)

#### Scenario: Last seat

- GIVEN capacity 8 and 7 confirmed seats
- WHEN a pending order is confirmed
- THEN confirmed seats are 8

#### Scenario: Full turno

- GIVEN capacity 8 and 8 confirmed seats
- WHEN a pending order is confirmed
- THEN the result is `turno-full`, the order is `pending_confirmation` and the counter is 8

#### Scenario: Capacity lowered below confirmed

- GIVEN 6 confirmed seats and the admin lowered capacity to 5
- WHEN a pending order is confirmed
- THEN the result is `turno-full` and the counter is unchanged

### Requirement: Concurrency safety

N concurrent confirmations of distinct pending orders against K remaining seats MUST succeed exactly min(N, K) times; the rest MUST return `turno-full`; the counter MUST end at its capacity or at the pre-state plus N. This MUST be proven on real PostgreSQL, not only on the fake.

#### Scenario: Eight race for three

- GIVEN capacity 8, 5 confirmed seats and eight pending orders
- WHEN all eight are confirmed concurrently
- THEN exactly three are `paid`, five receive `turno-full` and the counter is 8

#### Scenario: Different turnos do not contend

- GIVEN two turnos with one seat left each and two orders, one per turno
- WHEN both are confirmed concurrently
- THEN both succeed

### Requirement: Idempotent confirmation

Confirming an order that is already `paid` (or later) MUST return success with `alreadyConfirmed` and MUST NOT change the counter, the audit rows or `paid_at`. Concurrent duplicate confirmations of the same order MUST claim exactly one seat.

#### Scenario: Repeat

- GIVEN a `paid` order
- WHEN confirmation is requested again
- THEN the result is success with `alreadyConfirmed` and the counter is unchanged

#### Scenario: Double click race

- GIVEN a pending order and one seat left
- WHEN two confirmations of that same order run concurrently
- THEN one claims the seat, the other returns `alreadyConfirmed`, and the counter increases by one

### Requirement: Release on cancel

Cancelling a `paid` order MUST decrement the counter by one in the same transaction as the status change. Cancelling a `pending_confirmation` order MUST NOT touch the counter. Repeating a cancel MUST be idempotent. The counter MUST never go below zero.

#### Scenario: Release

- GIVEN 4 confirmed seats and a `paid` order
- WHEN the admin cancels it
- THEN the order is `cancelled` and confirmed seats are 3

#### Scenario: Repeat cancel

- GIVEN a `cancelled` order that had been paid
- WHEN cancel is requested again
- THEN success with `alreadyCancelled` and the counter is unchanged

#### Scenario: Freed seat is claimable

- GIVEN a full turno and a `paid` order cancelled
- WHEN another pending order is confirmed
- THEN it succeeds

### Requirement: Period must still be confirmable

Confirmation MUST be refused with `period-closed` when the period is `closed` or its Córdoba month has ended (`Clock`). Cancel of a paid order is allowed in a closed period.

#### Scenario: Month ended

- GIVEN a pending order for `2026-10`
- WHEN confirmation runs at 2026-11-01T03:00:00Z
- THEN the result is `period-closed` and the counter is unchanged

#### Scenario: Last Córdoba minute

- GIVEN the same order
- WHEN confirmation runs at 2026-11-01T02:59:00Z
- THEN it succeeds

### Requirement: Atomicity

The status change, counter change, payment fields and audit row MUST commit together or not at all. A failure after the counter update MUST roll back the counter.

#### Scenario: Audit failure rolls back

- GIVEN the audit insert fails during confirmation
- WHEN the transaction aborts
- THEN the counter and the order are unchanged

### Requirement: Availability read

The application MUST expose `available = capacity - confirmed` per (period, turno), never negative, for a reader port. Pending orders MUST NOT reduce it. Public pages keep "Cupo limitado" until the owner decides otherwise (change 4 Q1).

#### Scenario: Availability

- GIVEN capacity 8 and 5 confirmed seats with 4 pending orders
- WHEN availability is read
- THEN it is 3
