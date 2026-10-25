# Monthly enrollment (change 5)

- Objective: public enrollment, materials cart, pending order, wa.me hand-off, admin enrollments, atomic seat claim, order states, supplier consolidation.
- Branch: `feat/monthly-enrollment-e0-domain` (E0), stacked on `docs/monthly-enrollment-openspec` (PR #69). Strategy: ask-on-risk, stacked-to-main. Runner: `pnpm test`.
- Feature spec: `openspec/changes/monthly-enrollment/` (proposal, design, tasks, specs). Individual ODD trackers and their Engram mirrors are the current execution record; OpenSpec remains historical requirements evidence.

## Specs

- S1 Order states and allowed transitions (`specs/orders`): pending_confirmation, paid, materials_requested, materials_received, cancelled; illegal pairs refused as `illegal-transition`; materials_requested needs material lines; cancelled and materials_received terminal.
- S2 Order identity (`specs/orders`): `CI-YYYY-NNNN` with the Córdoba year; 128-bit public id (22+ base64url chars).
- S3 Money (`specs/orders`, `materials-cart`): whole pesos, total = fee + materials, payment amount must equal total (`amount-mismatch`).
- S4 Student data validation (`specs/public-enrollment`): all issues together, normalized email and phone, policy, honeypot.
- S5 Córdoba month window (`specs/public-enrollment`, `seat-claim`): period `open` and not past; boundary 2026-11-01T03:00Z.
- S6 Seat rules (`specs/seat-claim`): claim only when confirmed < capacity; idempotent confirm outcome; release only on cancelling a paid order; availability never negative.

## Tasks

- [x] E0 Order domain core (S1-S6), route inline. RED, GREEN and gate evidence in the Log.
- [x] E1 Cart, pricing, wa.me text (S3 and the cart and wa.me rules of `materials-cart` and `public-enrollment`), route inline, branch `feat/monthly-enrollment-e1-cart`. Evidence in the Log.
- [x] E2 Public enrollment application (S2, S3, S4, S5 and the public-enrollment, materials-cart and orders rules at application level), route inline, branch `feat/monthly-enrollment-e2-public`. Evidence in the Log.
- [x] E3 Administrative enrollment application and fake stores. PR #83 merged; evidence in `odd/tasks/monthly-enrollment-e3.md`.
- [x] E4 Drizzle order persistence. PR #84 merged; evidence in `odd/tasks/monthly-enrollment-e4.md`.
- [x] E5 Atomic seat transactions and concurrency probes. PR #91 merged as `35165fe`; evidence in `odd/tasks/monthly-enrollment-e5.md`.
- [ ] E6 Cross-module ports and request-service composition. Active tracker: `odd/tasks/monthly-enrollment-e6-composition.md`.
- [ ] E10 Capacity floor and availability.
- [ ] E7 Public enrollment routes and UI.
- [ ] E8 Administrative enrollment routes and UI.
- [ ] E9 Supplier consolidation and bulk supplier-facing state.

## Log

- L1 2026-10-20: owner decisions A1, A3, A4, A5, A8 accepted (recommended options); docs PR #69.
- L2 E0 scope: pure domain only (`src/modules/enrollments/domain/**` plus the module API). Phone normalization is injected because domain may not import `site-content`; E2 wires `toWhatsAppDigits`. The module needs no `eslint.config.ts` edit: element patterns are `src/modules/*/...` globs.
- L3 E0 evidence: RED `pnpm test src/modules/enrollments` failed 3/3 files (modules absent); GREEN 78 tests in 3 files; with architecture tests 102 tests in 5 files. Lint caught 3 type-aware errors (template numbers, string plus), fixed. Locked gates: typecheck 0, lint 0, format:check 0.
- L4 Risk: none (new module, no existing code touched). Next: E1 (cart, pricing, wa.me text) by the coordinator.
- L5 E1 scope: `domain/cart-core.ts` (quantity 1-20, merge, 30 lines, `priceCart` reusing `priceOrder`; errors `materials-required`, `invalid-price`, `invalid-fee`, `invalid-total`) and `domain/whatsapp-message.ts` (pure text, 1.200 cap, `formatPesos`). `material-not-offered` and `material-unavailable` need B9 offers and belong to E2 behind a port. Assumptions: a zero unit price is accepted, a negative one is `invalid-price`; if even the header exceeds the cap, a minimal message with number and total is used.
- L6 E1 evidence: RED both new test files failed to import (modules absent); GREEN `pnpm test src/modules/enrollments` 5 files, 115 tests. Other gates in the PR. Risk: none (new pure code reusing `Money` and `priceOrder`; money arithmetic is covered by tests).
- L7 E2 scope: `application/{enrollment-repository,offer-lookup,offered-materials,seat-ledger,random-bytes}.ts` ports, `public-enrollment-service.ts` (getOffer, requestEnrollment, getOrderByPublicId), `order-whatsapp-link.ts` (reuses `site-content` `buildWhatsAppUrl`/`toWhatsAppDigits`), fakes `src/testing/fakes/enrollments-*.ts`, contract skeleton `src/testing/contracts/order-repository.contract.ts` (E4 runs it on Drizzle and adds parallel creators, CHECKs and list filters).
- L8 E2 decisions: `material-not-offered` and `material-unavailable` live behind `OfferedMaterialsLookup`, which returns deactivated offers too; the offer lookup returns the offer for the requested month (`period: null` is `period-closed`); a filled honeypot answers `ok` with a decoy view and an unstored public id, before any lookup; `SeatLedger` is read-only in E2 (claim and release arrive in E3); `OrderRepository.transitionOrder` is driven by the E0 `transition` table and writes audit only on success.
- L9 E2 evidence: RED `pnpm test src/modules/enrollments/application src/testing/fakes/enrollments` failed 3/3 files (modules absent); GREEN with architecture tests 10 files, 180 tests. Typecheck caught parameter properties (`erasableSyntaxOnly`) in a fake and lint an unused destructured field; both fixed. Risk: none (new application code and fakes; no existing code, schema or public API touched).
- L10 2026-10-23 reconciliation: E3 PR #83, E4 PR #84, E5 PR #91, B9, F0/B1 safeguards, and F6 are integrated into `main`. Individual E3–E5 trackers supersede stale central/OpenSpec checkboxes. Remaining order is E6 → E10 → E7 → E8 → E9.
