# Supplier Consolidation Specification

## Purpose

Defines the admin read model that totals, per supplier, the materials the owner must buy for a month, and the copyable summary she sends to suppliers.

Traceability: roadmap "supplier consolidation"; exploration F2 step 6; `materials-catalog` suppliers.

## Requirements

### Requirement: Totals per supplier and period

For a period month the consolidation MUST group the lines of orders in status `paid` or `materials_requested` by supplier (snapshot id and name), then by material and variant, summing quantities and line totals with `Money`. Orders `pending_confirmation`, `materials_received` and `cancelled` MUST be excluded from the default view; `pending_confirmation` MAY be shown as a separate "a confirmar" count that does not enter totals.

#### Scenario: Grouping

- GIVEN two paid orders: order 1 has "Grande" x2 of M (supplier S1), order 2 has "Grande" x1 of M and "Chico" x1 of N (supplier S2)
- WHEN the consolidation for the month runs
- THEN S1 shows M "Grande" x3 and S2 shows N "Chico" x1, each with its total

#### Scenario: Excluded states

- GIVEN pending, cancelled and received orders for the month
- WHEN the consolidation runs
- THEN none of their lines enter the totals

#### Scenario: Supplier renamed afterwards

- GIVEN lines snapshotted under supplier "Papelería Sur"
- WHEN the supplier is renamed
- THEN the consolidation still groups under the snapshot name and id

#### Scenario: Empty month

- GIVEN no qualifying orders
- WHEN the consolidation runs
- THEN it returns an empty list, not an error

### Requirement: Period and Córdoba boundaries

The month key MUST be the order's stored period (`YYYY-MM`), not the creation date. An order created on 31 October 22:00 Córdoba for `2026-11` MUST count in November.

#### Scenario: Stored period wins

- GIVEN an order created at 2026-11-01T01:00:00Z for period `2026-11`
- WHEN the October consolidation runs
- THEN it is excluded

### Requirement: Money totals

Supplier totals MUST equal the sum of line totals at snapshot prices, in whole pesos; the grand total MUST equal the sum of supplier totals.

#### Scenario: Sum invariant

- GIVEN any set of qualifying orders
- WHEN totals are computed
- THEN the grand total equals the sum of supplier totals and of the underlying lines

### Requirement: Copyable summary

For each supplier the page MUST offer a plain-text summary (supplier name, month, one line per material/variant with quantity) without student data or prices of the fee, and a "Marcar como solicitado" bulk action for the orders involved. The text MUST be deterministic (sorted by material, variant).

#### Scenario: No student data

- GIVEN qualifying orders with sentinel student names
- WHEN the summary text is built
- THEN no sentinel appears

#### Scenario: Deterministic

- GIVEN the same orders in a different insertion order
- WHEN the summary is built
- THEN the text is identical

### Requirement: Admin-only

The consolidation use case MUST refuse non-admin actors with `denied`.

#### Scenario: No actor

- GIVEN no actor
- WHEN the consolidation is requested
- THEN the result is `denied`
