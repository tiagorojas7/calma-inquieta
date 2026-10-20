# Proposal: Monthly Enrollment

Change 5 of 8 | Project: calmainquieta | Store: openspec | Date: 2026-10-20 | Base: `origin/main` at `2d45485`

> **Decision in one paragraph.** A new `enrollments` module turns the published catalog into revenue: a visitor picks a taller, a turno and an open month, fills a short form, optionally builds a materials cart from that month's offered materials, and creates a **pending order** (`Pendiente de confirmación`) that consumes no seat. The page then hands off to the owner's WhatsApp with a prefilled `wa.me` message. The owner confirms the payment in the admin; that single action **atomically claims one seat** (conditional update, never above capacity, idempotent on retry) and moves the order to `paid`. Admin lists, cancels and advances orders, and a per-supplier consolidation tells the owner what to buy for a month. Everything is additive: one forward-only migration, no change to existing tables.

Roadmap entry (verbatim, `platform-foundation/proposal.md`): "| 5 | monthly-enrollment | W3 | Public enrollment, materials cart, pending order, wa.me hand-off, admin enrollments, atomic seat claim on payment confirmation, order states, supplier consolidation |"

## Why now

Change 4 ships the public talleres pages with an interim "Consultá por WhatsApp" link and `available: null` seats. Owners still register students by chat. Seat counts, a materials list per supplier and an order trail do not exist, and the riskiest piece of the product (never selling the same seat twice) has to be proven before renewals (change 6) and attendance (change 7) build on it.

## Scope

| # | Deliverable | Capability |
|---|-------------|------------|
| 1 | Enrollment form on the taller page: student data, turno, policy acceptance, Córdoba-month rules | `public-enrollment` |
| 2 | Materials cart limited to the period's offered materials, variants, quantities, server-recomputed totals | `materials-cart` |
| 3 | Pending order with unguessable public id and yearly order number, confirmation page, `wa.me` hand-off | `public-enrollment`, `orders` |
| 4 | Order states and allowed transitions | `orders` |
| 5 | Atomic seat claim on payment confirmation, release on cancel, availability read | `seat-claim` |
| 6 | Admin inbox, order detail, confirm payment, cancel, advance materials states | `admin-enrollments` |
| 7 | Per-supplier material totals for a period, copyable summary | `supplier-consolidation` |
| 8 | One additive migration, fake + Drizzle parity contracts, a concurrency test | `design.md` |

## Out of scope

| Item | Where |
|------|-------|
| Renewal links, tokens, reminders, any email (the order stores the student's email for change 6) | Change 6 |
| Student record, fee per period ledger, attendance, make-ups, weekend/intensivo deposits and registrations, private events | Change 7 |
| Online payment gateway; payment stays manual (transfer or cash) confirmed by the owner | Not planned |
| Seat hold while pending, waitlist, over-capacity override, refunds | Deferred (see owner questions) |
| Turnstile/CAPTCHA (a honeypot field and a per-IP limit are the v1 defense; assumption) | Change 8 |
| Flipping public seats from "Cupo limitado" to exact numbers (this change only exposes the data) | Owner decision recorded in change 4 Q1 |
| Admin shell, layout and gate | Change 3 (admin-catalog F0a/F0b, already specified) |

## Dependencies

| Depends on | State | Used for |
|------------|-------|----------|
| Change 3 B6 periods (`workshop_period`, `period_turno`), merged | merged | fee, `materialsRequired`, status, per-turno capacity |
| Change 3 B8b materials and variants, merged | merged | prices and supplier snapshot |
| **Change 3 B9 period material offers (`period_material_offer`)** | **not merged** (other terminal) | which materials a month may sell; required before slice E3 |
| Change 3 admin gate B1a/B1b and shell F0a/F0b | B1a merged; B1b/F0 partly pending | admin actor and `/admin/**` layout; required before slices E7 and E8 |
| Change 4 public talleres reader | spec merged | enrollment starts from the taller/turno page; the reader's `available` stays `null` here |
| `site-content` business profile and `buildWhatsAppUrl` | merged | owner number for `wa.me`; no new secret |

If B9 is not merged when E6 starts, E6 stops (STOP condition in `tasks.md`); E0 to E5 do not need it.

## Owner decisions and assumptions

A1, A3, A4, A5 and A8 are owner decisions (2026-10-20, marked `Owner decision (2026-10-20)` in the specs and design). A2, A6, A7 and the cart limits and message content remain `Assumption (pending owner)`.

- A1 (decided) A pending order never holds a seat; the seat is claimed only when the owner confirms payment.
- A2 One order is one student in one turno of one workshop in one month; several turnos mean several orders.
- A3 (decided) The order total is the period fee plus materials, paid in one payment. There is no seña for monthly talleres.
- A4 (decided) When the turno is full at confirmation the confirmation is refused (`turno-full`); no override.
- A5 (decided) Only the admin cancels. A paid order can be cancelled until materials are requested; cancelling a paid order releases the seat.
- A6 No automatic expiry job; a pending order of a closed period cannot be confirmed.
- A7 Materials are mandatory only when the period's `materialsRequired` is true.
- A8 (decided) The student is captured on the order (name, email, phone); there is no student table until change 7.

## Risks

| Risk | Mitigation |
|------|------------|
| Overselling a seat under concurrency | Conditional counter update inside one transaction plus a `CHECK`; real-PostgreSQL concurrency test (N parallel confirmations, K seats, exactly K succeed) |
| Prices or totals tampered from the client | Totals recomputed server-side from period fee and variant price snapshots |
| Order page enumeration | Unguessable 128-bit public id; sequential order number is never a lookup key |
| Spam orders | Honeypot, per-IP limit, one active order per email/taller/month |
| B9 or admin shell arrive late | Slices ordered so domain, application and DB land first; STOP conditions |

## Acceptance (change level)

- [ ] A visitor can create a pending order and reach `wa.me` with a correct prefilled message; no seat is consumed.
- [ ] Confirming payment claims exactly one seat; repeating it changes nothing; a full turno refuses.
- [ ] Concurrency test on real PostgreSQL passes: exactly K of N parallel confirmations succeed.
- [ ] Cancelling a paid order releases the seat; every illegal transition is refused.
- [ ] Admin actions reject non-admin actors; public use cases expose no private data.
- [ ] Supplier consolidation matches order lines for a period.
- [ ] `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` pass per slice.
