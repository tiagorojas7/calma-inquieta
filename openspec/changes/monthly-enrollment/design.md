# Design: Monthly Enrollment

Change 5 of 8 | Specs: `specs/*/spec.md` (the spec wins on observable names, this document on structure) | Strict TDD: active (`pnpm test <path>`) | Base: `origin/main` at `2d45485` | Date: 2026-10-20

> **Design in one paragraph.** One new module, `enrollments`, owns the order aggregate, its lines, the audit trail, the yearly order-number sequence and the per-(period, turno) seat counter, so that every statement that must be atomic runs in one Drizzle transaction against one schema file. Capacity, fee, offered materials and the open-month rule stay owned by `workshops` and `materials` and arrive through consumer-defined ports wired in `composition`. The seat claim is a conditional `UPDATE ... WHERE confirmed_seats < capacity` on the counter row, guarded by a `SELECT ... FOR UPDATE` on the order row; PostgreSQL row locks serialize competing updates, so the K+1th claimer re-evaluates the predicate and gets zero rows. Public use cases are actorless; admin use cases take an `AdminActor`. The `wa.me` link reuses the `site-content` builder and the business-profile number.

## Decisions

| # | Decision | Reason | Alternative rejected |
|---|----------|--------|----------------------|
| EN1 | One module `enrollments` (no separate `orders` module) | The order IS the enrollment (one student, workshop, turno, month). Orders, lines, audit, number sequence and seat counter share transactions; splitting them forces a cross-module unit of work and breaks `schema-ownership` (infrastructure may import only its own schema file). | `orders` + `enrollments`: cross-module transaction for no gain |
| EN2 | Seat counter table `turno_seat_counter` owned by `enrollments`, not a column on `workshops.period_turno` | The claim must update the counter and the order in one transaction; the infrastructure of `enrollments` cannot import the workshops schema. Change 3 left "the counter is added by change 5" open; this satisfies it without editing a change-3 table. Capacity is read through a port and stored on the counter row at claim time so a `CHECK` can still bound the count. | Column on `period_turno` (needs a `workshops` repository method inside our transaction, or a UoW across modules) |
| EN3 | Supplier consolidation lives in `enrollments`, reading order-line snapshots | It aggregates order lines; `materials` cannot import order data. Supplier id and name are snapshotted on each line. | Read model in `materials` |
| EN4 | Pending orders never hold a seat (Owner decision (2026-10-20): A1) | Matches the roadmap ("seat claim on payment confirmation") and exploration I2; avoids expiry jobs and held-seat disputes | Soft hold with expiry (needs a hold table and a job) |
| EN5 | Student captured on the order (name, email, phone), no `student` table (Owner decision 2026-10-20: A8) | Change 7 owns the student record and can link by email later | Minimal student table now (premature, change 7 rewrites it) |
| EN6 | States: `pending_confirmation`, `paid`, `materials_requested`, `materials_received`, `cancelled`; no `expired` (A6) | No hold means nothing to expire; a closed period blocks confirmation | `expired` state plus a sweeper |
| EN7 | Order total = period fee + materials, one payment, amount must equal total (Owner decision 2026-10-20: A3) | Simplest ledger; no partial-payment states. A payment ledger is deferred to change 7 | Seña plus balance |
| EN8 | Full turno at confirmation: refuse, no override (Owner decision 2026-10-20: A4) | Capacity never exceeded stays an absolute invariant; the owner handles the paid-but-full case manually (refund or move) | Audited override that lets `confirmed > capacity` (weakens the CHECK) |
| EN9 | Cart draft is client-side (sessionStorage), validated whole on submit | No server draft table, no cookie; the server never trusts the client for prices | Server draft with a session |
| EN10 | `wa.me` message is built in the application layer as pure text, link built in delivery with `site-content` `buildWhatsAppUrl` | Golden-string tests without UI; the number comes from the business profile, never from env or code | New env var for the owner phone |

## Module map

```
src/modules/enrollments/
  domain/
    order-core.ts            Order, OrderLine, OrderStatus, transitions table, order number, public id shape
    cart-core.ts             Cart rules: quantity 1-20, merge, <= 30 lines, pricing with Money
    student-input.ts         name/email/phone/policy validation (all errors together)
    whatsapp-message.ts      pure message text, 1.200-char cap keeping number and total
  application/
    enrollment-repository.ts OrderRepository port (create, findByPublicId, findForAdmin, list, ...)
    seat-ledger.ts           SeatLedger port: claim, release, availability (transactional)
    offer-lookup.ts          EnrollmentOfferLookup: period/turno/fee/capacity/materialsRequired/open rule inputs
    offered-materials.ts     OfferedMaterialsLookup: B9 offers + variants + supplier snapshot
    public-enrollment-service.ts   requestEnrollment, getOrderByPublicId, getOffer
    admin-enrollment-service.ts    list, get, confirmPayment, cancel, markMaterials (actor first)
    supplier-consolidation.ts      consolidate(actor, period), summaryText
  infrastructure/
    drizzle-order-repository.ts
    drizzle-seat-ledger.ts
  index.ts                   module API: services, factories, public types
```

Dependency rule check (AGENTS.md): `domain` imports only `_shared` and itself, no packages. `application` imports `_shared`, own domain and `module-api` of other modules (`site-content` for phone normalization only; capacity, fee and offers arrive via ports). `infrastructure` imports its own layers, `platform`, `drizzle-orm`, `pg`, and only `~/platform/db/schema/enrollments`. `composition` instantiates adapters and maps `workshops`/`materials` module APIs to the ports. New schema file `src/platform/db/schema/enrollments.ts`; `src/modules/enrollments` and any new `src/app/**` folder MUST be classified in `eslint.config.ts` (`no-unknown-files`).

Cross-module needs (small, additive, own slices): `workshops` exposes `findEnrollmentOffer(slug, period, turnoId)` and `listOpenPeriodsForEnrollment`; `materials` (via B9) exposes offered materials for a period. These are read ports, no edits to change-3 behavior.

## Domain model

```
Order
  id (uuid), publicId (22+ char base64url, 128-bit), number "CI-YYYY-NNNN"
  status, source "public"
  workshopId, periodId, period "YYYY-MM", turnoId
  snapshot: workshopName, turnoLabel, weekday, startTime, endTime
  student: fullName, email (lowercase), phoneDigits
  fee: Money, materialsTotal: Money, total: Money        (bigint centavos, multiples of 100)
  policyVersion, requestedAt, paidAt?, paidAmount?, paymentNote?, confirmedBy?
  cancelledAt?, cancelReason?, cancelledBy?
OrderLine   orderId, position, materialId, variantId, materialName, variantLabel,
            unitPrice: Money, quantity, supplierId, supplierName
OrderAudit  orderId, at, actor ("public" | admin email), from, to, note   (append-only)
TurnoSeatCounter  periodId, turnoId, confirmedSeats, capacity
OrderNumberSequence  year, last
```

Transitions are a data table in `order-core.ts` (`ALLOWED: Record<Status, readonly Status[]>` plus the "has material lines" guard). The same table drives the fake and Drizzle repositories so there is one rule.

### Time and money

- `Clock` port only; the Córdoba month is `cordobaDateOf(clock.now()).slice(0, 7)` (existing helper in `workshops`, re-exported by its API). A period is enrollable when `status = open` and `periodKey >= currentCordobaMonth`; confirmable under the same predicate. Argentina has no DST, so UTC-03:00 is fixed and `2026-11-01T03:00:00Z` is the October/November boundary.
- Order-number year is the Córdoba year of `now`.
- All amounts are `Money` (centavos, whole pesos enforced by `parseWholePesos` at the edge and by a DB `CHECK (x % 100 = 0)`). `Money.multiply`/`add` throw on safe-integer overflow; the use case maps that to `invalid-total` before persisting.

## Seat claim in PostgreSQL

Tables (excerpt, see Migration):

```sql
turno_seat_counter(period_id uuid, turno_id uuid, confirmed_seats int NOT NULL DEFAULT 0,
  capacity int NOT NULL, PRIMARY KEY (period_id, turno_id),
  CHECK (confirmed_seats >= 0), CHECK (confirmed_seats <= capacity));
```

`ConfirmPayment(orderId, amount, paidOn, note, actor)` runs in one `db.transaction`:

1. `SELECT status, period_id, turno_id, total FROM enrollment_order WHERE id = $1 FOR UPDATE`. Same-order callers serialize here.
2. If status is `paid`, `materials_requested` or `materials_received`: return `alreadyConfirmed` (no writes). If `cancelled`: `illegal-transition`. Check `amount = total` and the Córdoba-month rule (`Clock` and period status from the offer lookup, read before the transaction; the lookup returns `capacity` too).
3. `INSERT INTO turno_seat_counter (period_id, turno_id, confirmed_seats, capacity) VALUES ($p, $t, 0, $cap) ON CONFLICT DO NOTHING`.
4. `UPDATE turno_seat_counter SET confirmed_seats = confirmed_seats + 1, capacity = $cap WHERE period_id = $p AND turno_id = $t AND confirmed_seats < $cap RETURNING confirmed_seats`.
5. Zero rows: `ROLLBACK` and return `turno-full` (the order stays pending).
6. `UPDATE enrollment_order SET status = 'paid', paid_at, paid_amount_centavos, confirmed_by, payment_note ...`; `INSERT INTO order_audit ...`; `COMMIT`.

Why it cannot oversell. The UPDATE in step 4 takes a row-level lock on the counter row. Under READ COMMITTED (PostgreSQL default), a competing UPDATE blocks until the first transaction commits or aborts, then re-evaluates its `WHERE` against the newly committed row; once `confirmed_seats = cap` the predicate is false and it updates nothing. There is no read-then-write gap because the check and the increment are one statement. The `CHECK (confirmed_seats <= capacity)` is a second line of defense: even a buggy statement cannot commit an oversold counter. Lowering capacity below the confirmed count makes the predicate false, so further claims fail; the capacity-floor guard (slice E10) additionally stops the admin from lowering it in the first place. Different turnos touch different counter rows and never contend.

Idempotency. Step 1 locks the order row, so two confirmations of the same order run one after the other; the second sees `paid` and returns `alreadyConfirmed` without touching the counter or audit. Retried HTTP requests, double clicks and parallel tabs are therefore harmless.

Release. `CancelOrder` locks the order row; if it was `paid` it runs `UPDATE turno_seat_counter SET confirmed_seats = confirmed_seats - 1 WHERE ... AND confirmed_seats > 0` in the same transaction as the status change. A cancel of an already `cancelled` order returns `alreadyCancelled`.

Hyperdrive and `pg` support interactive transactions (the existing period repository already uses `db.transaction`). The fake repository emulates the same semantics with a mutex per counter so contract tests run against both.

Failure modes: a connection drop mid-transaction aborts it, leaving counter and order unchanged; the admin sees `unavailable` and can retry safely because of idempotency.

## Order creation

`requestEnrollment(input)` in one transaction: validate input (all errors), load the offer (workshop published and not paused, period open and in range, turno offered), load offered materials, price the cart, check `confirmed < capacity` (soft check, read from the counter row or 0), insert order and lines, upsert-increment `order_number_sequence` for the Córdoba year (`INSERT ... ON CONFLICT (year) DO UPDATE SET last = order_number_sequence.last + 1 RETURNING last`; the row lock serializes concurrent creators and a rollback reverts the increment, so there are no gaps), insert the creation audit row, commit. A partial unique index on `(email, workshop_id, period_id) WHERE status <> 'cancelled'` enforces the one-active-order rule even under races; a unique violation maps to `duplicate-order`. Public id comes from `crypto.getRandomValues` (16 bytes, base64url) injected as an `IdGenerator` port for deterministic tests.

## Migration plan

Assumption: ordering at planning time is `0009_materials` (merged), `0010_period_material_offers` (B9, unmerged; admin-catalog design called it `0009` before materials took that number), then this change's `0011_enrollments`. The actual number and name are generated by Drizzle Kit after rebasing; the migration is never numbered by hand and never rewritten once merged. It is additive and forward-only: five new tables (`enrollment_order`, `order_line`, `order_audit`, `turno_seat_counter`, `order_number_sequence`), indexes and CHECKs; no change to existing tables. FKs to `workshop_period`/`workshop_turno` are NOT declared in Drizzle (the schema file cannot import the workshops schema); referential integrity of those ids is enforced by the offer lookup in the use case and `period_id`/`turno_id` are stored as plain uuids. Trade-off: no DB-level FK to catalog rows; history survives catalog edits by design (snapshots). Rollback: leave the tables, revert the code.

Constraints: `status IN (...)`; `total_centavos = fee_centavos + materials_centavos`; `x % 100 = 0` for amounts; `quantity BETWEEN 1 AND 20`; `unit_price_centavos > 0`; `public_id` unique; `number` unique; partial unique on active duplicates; `paid_at IS NOT NULL` iff status in (`paid`, `materials_requested`, `materials_received`) or the order was cancelled after paying (tracked by `paid_at`).

## wa.me link

Pure `buildOrderWhatsAppText(order)`: lines "Hola! Quiero confirmar mi inscripción", order number, student name, taller, month (es-AR), turno, one line per item "<material> <variant> x<qty>", total "$ 58.000"; capped at 1.200 characters; when over the cap, lines are dropped from the end and replaced by "y N más (ver pedido)" while number and total are always kept. The link is `buildWhatsAppUrl(profile.whatsapp, text)` from `site-content`; on `invalid-number` the loader returns `whatsappUrl: null`. No env var, no hard-coded number. Copy strings live in `site-content` microcopy like the existing `whatsappMessages`.

## Routes and UI

| Route | File | Purpose | Gate |
|-------|------|---------|------|
| `/talleres/:slug/inscripcion` | `src/app/routes/enrollment.tsx` | step 1: offer, turno, student data, policy; action creates the order when no materials step is needed or goes to step 2 | public |
| `/talleres/:slug/inscripcion/materiales` | `src/app/routes/enrollment-materials.tsx` | step 2: cart over offered materials, sticky summary, submit | public |
| `/pedido/:publicId` | `src/app/routes/order.tsx` | confirmation, status, `wa.me` CTA, `noindex` | public |
| `/admin/inscripciones` | `src/app/routes/admin/enrollments.tsx` | inbox with filters | admin |
| `/admin/inscripciones/:id` | `src/app/routes/admin/enrollment-detail.tsx` | detail, confirm payment, cancel, materials states | admin |
| `/admin/inscripciones/materiales` | `src/app/routes/admin/enrollment-consolidation.tsx` | per-supplier totals, copy summary, bulk "Marcar como solicitado" | admin |

Presentational components in `src/app/ui/**` take structural props only: `EnrollmentForm`, `MaterialsCatalog`, `CartSummary`, `OrderSummaryCard`, `StatusPill`. The talleres detail page replaces its interim WhatsApp CTA by a link to the form when the taller is open with an offering; paused and no-offering states stay as change 4 specified. The draft between steps is `sessionStorage` JSON keyed by slug; the step-2 action posts the whole payload (student + cart) and the server re-validates everything. Admin routes depend on the admin shell (change 3 F0a/F0b); until it lands they are not built (STOP condition).

## Testing strategy

| Layer | What | Where |
|-------|------|-------|
| Unit (domain) | table-driven transitions, order number, cart pricing, validation, wa.me golden strings with cap | `*.test.ts` beside code, no fakes needed |
| Application | use cases against in-memory fakes with a fixed `Clock`: Córdoba boundaries, duplicate rule, materials-required, actor denial, idempotency | `src/testing/fakes/enrollments-*.ts` |
| Contract parity | one contract suite runs against fake and Drizzle repositories: create, number sequence, duplicate, transitions, claim, release, availability, list filters, consolidation | `src/testing/contracts/{order-repository,seat-ledger}.contract.ts` |
| Concurrency | on embedded PostgreSQL: N parallel confirmations of distinct orders vs K seats (exactly K succeed), duplicate confirmation of one order, parallel creators (consecutive numbers), claim vs cancel interleaving | `src/modules/enrollments/infrastructure/seat-ledger.concurrency.db.test.ts` |
| Route/loader | one behavior test per screen: loader returns allowlisted data, action maps errors | `src/app/routes/*.test.ts(x)` |
| UI | one behavior test per screen (`*.ui.test.tsx`) | `src/app/routes/*.ui.test.tsx` |
| Architecture | existing `architecture.test.ts` and `schema-ownership.test.ts` must pass unchanged | `tooling/architecture/` |
| Differential | `talleres` detail and reader outputs unchanged except the CTA when an offering exists (compared against a base-commit copy in a scratch directory, not committed) | manual per slice |

The fake seat ledger serializes calls per (period, turno) with a promise chain so the concurrency contract can also run in memory (proves logic, not locking); the Drizzle suite proves the locking.

## Security and privacy

- Public use cases are actorless and return explicit allowlisted projections; sentinel serialization tests guard email and phone.
- Admin use cases call `requireAdminActor` first; unavailable services fail closed through `createUnavailableService`.
- No secret is added. Owner phone comes from the business profile.
- Duplicate-order message is generic (trade-off: it still lets an attacker learn that some order exists for an email and month; accepted at this scale).
- Abuse: honeypot plus a per-IP limit on the order action (Cloudflare rate-limit rule or a small in-Worker counter; exact mechanism decided in slice E7 and recorded; Turnstile is change 8).

## Risks and open items

| Risk | Rating | Note |
|------|--------|------|
| Seat claim correctness | High | DB-level CHECK, real-PostgreSQL concurrency test, independent verifier |
| Admin auth on money-changing actions | High | actor-first use cases plus the route gate; same-origin POST |
| Migration | High (additive) | forward-only, generated after rebase |
| Client-visible totals | Medium | server recompute; tests with tampered payload |
| B9 not merged | Schedule | E6 waits; E0-E5 independent |
