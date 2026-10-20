# Materials Cart Specification

## Purpose

Defines the cart that exists only inside the enrollment flow: which materials may be added, variants, quantities, totals and how the cart is snapshotted on the order. There is no store page and no cart outside enrollment.

Traceability: exploration invariant I5; change 3 `workshop-periods` "Enabled materials" and `materials-catalog`; mockup image7. **Depends on change 3 B9** (`period_material_offer`, not merged).

## Requirements

### Requirement: Only offered materials

The cart MUST accept only materials enabled for the order's period (B9 offers) that are active and available, and only variants of those materials that are available. A material or variant that is not offered, deactivated or unavailable MUST be refused with the line named.

#### Scenario: Offered material

- GIVEN the period offers material M with variants "Chico" and "Grande"
- WHEN "Grande" x1 is added
- THEN the cart holds one line for M "Grande"

#### Scenario: Not offered

- GIVEN material N exists in the catalog but is not offered in the period
- WHEN N is submitted in an order
- THEN the order is refused with `material-not-offered` naming N and nothing is stored

#### Scenario: Deactivated after the cart was built

- GIVEN a cart containing M, and M is deactivated before submission
- WHEN the order is created
- THEN it is refused with `material-unavailable` naming M

### Requirement: Quantities and merging

A line quantity MUST be an integer from 1 to 20. Adding the same variant again MUST merge into one line (sum above 20 is refused). A cart MUST hold at most 30 lines. (Assumption (pending owner): limits.)

#### Scenario: Merge

- GIVEN a line "Grande" x2
- WHEN "Grande" x3 is added
- THEN there is one line "Grande" x5

#### Scenario: Invalid quantity

- GIVEN a quantity of 0, -1, 2.5 or 21
- WHEN it is submitted
- THEN the cart refuses it naming the line

### Requirement: Mandatory or optional by period

When the period's `materialsRequired` is true the cart MUST contain at least one line; when false the cart MAY be empty ("Ya tengo mis materiales"). There is no admin override in v1. (Assumption (pending owner): A7.)

#### Scenario: Required and empty

- GIVEN `materialsRequired` true and an empty cart
- WHEN the order is created
- THEN it is refused with `materials-required`

#### Scenario: Optional and empty

- GIVEN `materialsRequired` false and an empty cart
- WHEN the order is created
- THEN it is accepted and the total equals the fee

### Requirement: Money in whole pesos

Unit prices come from the variant price (`Money`, whole pesos); a line total is price x quantity; the order total is the period fee plus the sum of line totals. All arithmetic MUST use `Money`; a total outside the safe-integer range MUST be refused, never rounded.

#### Scenario: Totals

- GIVEN fee 58.000, "Grande" 12.500 x2 and "Chico" 4.000 x1
- WHEN the total is computed
- THEN it is 58.000 + 25.000 + 4.000 = 87.000

#### Scenario: No fractions

- GIVEN a variant price that is not a multiple of 100 centavos
- WHEN the cart is priced
- THEN pricing fails with `invalid-price` and the order is refused

### Requirement: Snapshots

Each order line MUST store the material name, variant label, unit price, quantity, supplier id and supplier name at order time. A later price change, rename or deactivation MUST NOT change stored lines or totals.

#### Scenario: Price change after ordering

- GIVEN an order with "Grande" at 12.500
- WHEN the catalog price becomes 15.000
- THEN the order line and total are unchanged

### Requirement: Cart draft lives on the client until submit

The cart draft MUST be kept client-side (sessionStorage) and re-validated entirely on the server at submit. A missing or corrupt draft MUST yield an empty cart, not an error.

#### Scenario: Corrupt draft

- GIVEN a draft that is not valid JSON
- WHEN the materials step loads
- THEN the cart is empty and the page renders
