# Shared Kernel Specification

## Purpose

Domain primitives shared by all modules, introduced now so Strict TDD has a first RED-GREEN proof: `Money`, `Result` and the `Clock` port. The kernel is domain-only (pure TypeScript, no framework or I/O).

Source: proposal "Capabilities", Scope #6 and #7; exploration invariant on integer ARS centavos (inherited).

## Requirements

### Requirement: Money representation

`Money` MUST represent an amount of Argentine pesos as an integer number of centavos. Floating-point amounts MUST be rejected. Construction MUST fail for non-integers, `NaN`, infinities and values outside the safe-integer range. (Source: proposal Capabilities)

#### Scenario: Valid construction

- GIVEN the integer 150000
- WHEN a `Money` is created from centavos
- THEN its centavo value is 150000

#### Scenario: Fractional centavos rejected

- GIVEN the value 10.5
- WHEN a `Money` is created from centavos
- THEN construction fails with a `Result` error (no exception)

#### Scenario: Unsafe integer rejected

- GIVEN a value greater than `Number.MAX_SAFE_INTEGER`
- WHEN a `Money` is created
- THEN construction fails

#### Scenario: Zero is valid

- GIVEN the value 0
- WHEN a `Money` is created
- THEN it succeeds

### Requirement: Money arithmetic and comparison

`Money` MUST support addition, subtraction, comparison (equality, less-than, greater-than) and multiplication by an integer quantity, all returning new immutable values. Operations whose result leaves the safe-integer range MUST fail rather than lose precision. Subtraction MAY yield a negative amount. (Source: proposal Capabilities "arithmetic and comparison"; negative-result allowance is a spec-level assumption.)

#### Scenario: Addition without float drift

- GIVEN `Money` 10 centavos and `Money` 20 centavos
- WHEN they are added
- THEN the result is exactly 30 centavos

#### Scenario: Multiplication by quantity

- GIVEN `Money` 2500 centavos
- WHEN multiplied by the integer 3
- THEN the result is 7500 centavos

#### Scenario: Multiplication by non-integer rejected

- GIVEN `Money` 2500 centavos
- WHEN multiplied by 0.5
- THEN the operation fails

#### Scenario: Overflow rejected

- GIVEN `Money` equal to `Number.MAX_SAFE_INTEGER` centavos
- WHEN 1 centavo is added
- THEN the operation fails

#### Scenario: Comparison

- GIVEN `Money` 100 and `Money` 200
- WHEN compared
- THEN 100 is less than 200, and 100 equals another `Money` of 100

#### Scenario: Immutability

- GIVEN a `Money` of 100 centavos
- WHEN it is added to another value
- THEN the original remains 100 centavos

### Requirement: Result type

`Result` MUST model success or failure as a value, with a discriminant that lets callers narrow to the success value or the error without exceptions. (Source: proposal Capabilities)

#### Scenario: Success narrowing

- GIVEN a success `Result` holding the value 5
- WHEN the caller checks the discriminant
- THEN the value 5 is accessible and the error is not

#### Scenario: Failure narrowing

- GIVEN a failure `Result` holding an error
- WHEN the caller checks the discriminant
- THEN the error is accessible and no value is

### Requirement: Clock port

The shared kernel MUST define a `Clock` port returning the current instant, and MUST NOT contain a system-clock implementation. Production and test implementations MUST live outside the kernel (infrastructure or testing). Domain and application code MUST obtain time only through `Clock`. (Source: proposal Scope #7)

#### Scenario: Fixed clock in tests

- GIVEN a test `Clock` fixed at 2026-10-05T12:00:00Z
- WHEN a use case reads the time twice
- THEN both reads return 2026-10-05T12:00:00Z

#### Scenario: Kernel stays pure

- GIVEN the shared kernel sources
- WHEN the architecture test inspects their imports
- THEN they import nothing outside the kernel and the language standard library

### Requirement: Strict TDD proof

`Money` MUST be the first behavior written under Strict TDD. Strict TDD activation (see `delivery-pipeline`: runner install, single workspace test command, activation commit) MUST precede the first `Money` commit. The `Money` test MUST land with its implementation in the same work unit, and the RED result MUST be observed before the implementation exists. (Source: orchestrator alignment after design validation; `openspec/config.yaml` rules.tasks requires Strict TDD before any behavior task. Previously: Money proof preceded activation.)

#### Scenario: RED before GREEN

- GIVEN Strict TDD is active and a `Money` test exists with no implementation
- WHEN `pnpm test` runs
- THEN it fails
- AND after the implementation is added `pnpm test` passes

#### Scenario: Money follows activation

- GIVEN the commit history
- WHEN the first commit touching `Money` is located
- THEN the activation commit and the test-runner commit precede it
