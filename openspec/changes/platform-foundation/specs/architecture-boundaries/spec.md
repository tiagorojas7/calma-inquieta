# Architecture Boundaries Specification

## Purpose

The screaming-architecture and hexagonal dependency rule is enforced mechanically by two independent checks (lint and an architecture test) so later changes cannot drift. The rule is also stated for AI agents.

Source: proposal "Capabilities", Scope #7-8, Approach 4.2; exploration 4.3 (inherited).

## Requirements

### Requirement: Layer structure

The source tree MUST be organized as `src/app` (delivery), `src/modules/<module>/{domain,application,infrastructure}` with a public `index.ts`, `src/modules/_shared` (shared kernel), `src/composition` (composition root), `src/platform` (env, database client factory) and `src/testing` (test support). The Worker entry MUST live in `workers/`. (Source: proposal 4.2)

#### Scenario: Skeleton module exists

- GIVEN the repository after this change
- WHEN the tree is inspected
- THEN `src/modules/system-status` contains `domain`, `application`, `infrastructure` and `index.ts`

### Requirement: Dependency rule

The following MUST hold:

- `domain` imports only its own module's domain and `_shared`; it MUST NOT import application, infrastructure, `src/app`, `src/platform`, `src/composition`, Drizzle, drivers or React Router.
- `application` imports domain, ports, and `_shared`; it MUST NOT import infrastructure or frameworks.
- `infrastructure` MAY implement ports and import drivers and Drizzle.
- Code outside a module MUST reach it only through its `index.ts`; deep imports into another module's internals MUST be forbidden.
- `src/app` (delivery) MUST import only module public APIs and the composition root; it MUST NOT import Drizzle, database drivers or SDKs.
- Infrastructure adapters MUST be instantiated only in `src/composition` (or `src/testing` for test wiring).

(Source: proposal Capabilities, 4.2)

#### Scenario: Clean tree passes

- GIVEN the real source tree
- WHEN `pnpm lint` and the architecture test run
- THEN both pass

#### Scenario: Domain imports infrastructure

- GIVEN a file in `src/modules/system-status/domain` that imports from `../infrastructure`
- WHEN lint runs
- THEN lint reports a boundary violation and exits non-zero

#### Scenario: Delivery imports Drizzle

- GIVEN a file in `src/app` that imports `drizzle-orm`
- WHEN lint runs
- THEN lint reports a violation

#### Scenario: Deep cross-module import

- GIVEN a file in another module importing `src/modules/system-status/infrastructure/...`
- WHEN the architecture test runs
- THEN it fails naming the offending file

### Requirement: Architecture test as fitness function

A Vitest architecture test, part of `pnpm test`, MUST fail on a forbidden import. Its detection MUST be proven by a violating fixture that is excluded from the real-tree check and is asserted to be detected. (Source: proposal Scope #8, Success Criteria)

#### Scenario: Fixture violation is detected

- GIVEN a fixture file containing a forbidden import
- WHEN the architecture test's checker runs over the fixture
- THEN it reports the violation (the test asserts detection)

#### Scenario: Fixture does not pollute the real check

- GIVEN the violating fixture present in the repository
- WHEN the architecture test checks the real tree
- THEN the fixture is excluded and the check passes

### Requirement: Lint enforcement parity

`pnpm lint` MUST enforce the same dependency rule and MUST be a required step of CI. Violations MUST fail the command with a non-zero exit code. (Source: proposal Scope #8)

#### Scenario: Lint failing blocks CI

- GIVEN a pull request that introduces a boundary violation
- WHEN the `verify` workflow runs
- THEN the lint step fails and the workflow is red

### Requirement: Agent-facing rule statement

`AGENTS.md` MUST state the dependency rule, the single `pnpm test` command, the Strict TDD expectation and the Conventional Commits convention (no `Co-Authored-By` or AI attribution). (Source: proposal Scope #8, 4.8)

#### Scenario: AGENTS.md content

- GIVEN `AGENTS.md`
- WHEN it is read
- THEN it names each layer's allowed imports, `pnpm test`, and the commit convention
