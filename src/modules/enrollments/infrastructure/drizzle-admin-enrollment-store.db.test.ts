import pg from "pg";
import { afterEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { Money } from "~/modules/_shared";
import { createDbSessionFactory } from "~/platform/db/session";
import { orderLine, turnoSeatCounter } from "~/platform/db/schema/enrollments";
import { runAdminEnrollmentCorrectionContract } from "~/testing/contracts/admin-enrollment-correction.contract";
import { runAdminEnrollmentStoreContract } from "~/testing/contracts/admin-enrollment-store.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createTestOrderStock } from "~/testing/db/order-stock";
import type {
  OrderDraft,
  OrderLineDraft,
  StoredOrder,
} from "../application/enrollment-repository";
import { createDrizzleOrderRepository } from "./drizzle-order-repository";
import { createDrizzleAdminEnrollmentStore } from "./drizzle-admin-enrollment-store";
import type { PeriodStatus } from "../domain/period-window";

const created: TestDatabase[] = [];
const ids = {
  workshop: "00000000-0000-4000-8000-000000000001",
  period: "00000000-0000-4000-8000-000000000002",
  turno: "00000000-0000-4000-8000-000000000003",
  otherTurno: "00000000-0000-4000-8000-000000000004",
  material: "00000000-0000-4000-8000-000000000005",
  variant: "00000000-0000-4000-8000-000000000006",
  supplier: "00000000-0000-4000-8000-000000000007",
  otherPeriod: "00000000-0000-4000-8000-000000000008",
};

const pesos = (value: number) => {
  const result = Money.fromCentavos(value * 100);
  if (!result.ok) throw new Error("fixture money");
  return result.value;
};

const draft = (
  index: number,
  overrides: Partial<OrderDraft> = {},
): OrderDraft => ({
  publicId: `order-${String(index).padStart(17, "0")}`,
  year: 2026,
  requestedAt: new Date("2026-10-30T15:00:00Z"),
  workshopId: ids.workshop,
  workshopName: "Ceramics",
  periodId: ids.period,
  period: "2026-10",
  turnoId: ids.turno,
  turnoLabel: "Tuesday",
  weekday: 2,
  startsAt: "18:00",
  endsAt: "20:00",
  student: {
    fullName: `Student ${String(index)}`,
    email: `student-${String(index)}@example.com`,
    phoneDigits: `549351555${String(index).padStart(4, "0")}`,
  },
  fee: pesos(58_000),
  materialsTotal: pesos(0),
  total: pesos(58_000),
  policyVersion: "2026-10",
  lines: [],
  ...overrides,
});

async function freshHarness(failAudit = false, capacity = 2) {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  const stock = createTestOrderStock(openSession);
  const repository = createDrizzleOrderRepository(openSession, stock.port);
  let configuredCapacity = capacity;
  let configuredPeriodStatus: PeriodStatus = "open";
  const store = createDrizzleAdminEnrollmentStore(
    openSession,
    {
      find: () =>
        Promise.resolve({
          status: configuredPeriodStatus,
          capacity: configuredCapacity,
        }),
    },
    stock.port,
  );
  let next = 0;

  if (failAudit) {
    const session = await openSession();
    try {
      await session.db.execute(
        sql.raw(`
        CREATE FUNCTION reject_paid_audit() RETURNS trigger AS $$
        BEGIN
          IF NEW."to" = 'paid' THEN RAISE EXCEPTION 'test audit failure'; END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        CREATE TRIGGER reject_paid_audit_trigger
        BEFORE INSERT ON order_audit
        FOR EACH ROW EXECUTE FUNCTION reject_paid_audit();
      `),
      );
    } finally {
      await session.close();
    }
  }

  return {
    store,
    database,
    openSession,
    repository,
    stock,
    capacity,
    setCapacity: (value: number) => {
      configuredCapacity = value;
    },
    setPeriodStatus: (value: PeriodStatus) => {
      configuredPeriodStatus = value;
    },
    async createOrder(
      overrides: Partial<OrderDraft> = {},
    ): Promise<StoredOrder> {
      next += 1;
      const normalized = {
        ...overrides,
        ...(overrides.turnoId === "t-2" ? { turnoId: ids.otherTurno } : {}),
        ...(overrides.periodId === "p-2" ? { periodId: ids.otherPeriod } : {}),
        ...(overrides.lines
          ? {
              lines: overrides.lines.map((line) => ({
                ...line,
                materialId: ids.material,
                variantId: ids.variant,
                supplierId: ids.supplier,
              })),
            }
          : {}),
      };
      const result = await repository.create(draft(next, normalized));
      if (!result.ok) throw new Error("fixture order creation failed");
      return result.value;
    },
    /** Creates an order whose lines keep their own variant ids (the fixture ids otherwise). */
    async createOrderWithLines(
      lines: readonly OrderLineDraft[],
      overrides: Partial<OrderDraft> = {},
    ): Promise<StoredOrder> {
      next += 1;
      const materials = lines.reduce(
        (sum, line) => sum + line.unitPrice.toCentavos() * line.quantity,
        0,
      );
      const result = await repository.create(
        draft(next, {
          lines,
          materialsTotal: pesos(materials / 100),
          total: pesos(58_000 + materials / 100),
          ...overrides,
        }),
      );
      if (!result.ok) throw new Error("fixture order creation failed");
      return result.value;
    },
    async seatCount(order: StoredOrder) {
      const session = await openSession();
      try {
        const rows = await session.db
          .select({ count: turnoSeatCounter.confirmedSeats })
          .from(turnoSeatCounter)
          .where(
            sql`${turnoSeatCounter.periodId} = ${order.periodId} AND ${turnoSeatCounter.turnoId} = ${order.turnoId}`,
          );
        return rows[0]?.count ?? 0;
      } finally {
        await session.close();
      }
    },
    audit: (order: StoredOrder) => repository.auditTrail(order.id),
    fixtureStock: {
      seed: (units: number) => stock.seed(ids.variant, units),
      onHand: () => stock.onHand(ids.variant),
    },
    failingAfterSeatMutation: () => freshHarness(true),
  };
}

afterEach(async () => {
  for (const database of created.splice(0)) {
    await database.drop();
  }
});

runAdminEnrollmentStoreContract(freshHarness);
runAdminEnrollmentCorrectionContract(freshHarness);

const actor = { email: "admin@example.com" };
const paymentAt = new Date("2026-10-30T15:00:00Z");
const now = new Date("2026-10-31T15:00:00Z");
const advisoryLockKey = "8661005";

async function waitForCounterUpdateLock(observer: pg.Client): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await observer.query<{ waiting: boolean }>(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND wait_event_type = 'Lock'
          AND wait_event = 'advisory'
          AND query LIKE 'update "turno_seat_counter"%'
      ) AS waiting
    `);
    if (result.rows[0]?.waiting === true) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("confirmation did not wait for the counter advisory lock");
}

const confirm = (
  store: Awaited<ReturnType<typeof freshHarness>>["store"],
  order: StoredOrder,
) =>
  store.confirm({
    orderId: order.id,
    amount: order.total,
    paidAt: paymentAt,
    actor,
    now,
  });

describe("DrizzleAdminEnrollmentStore PostgreSQL probes", () => {
  it("allows exactly three of eight concurrent distinct confirmations", async () => {
    const harness = await freshHarness(false, 8);
    const session = await harness.openSession();
    try {
      await session.db.insert(turnoSeatCounter).values({
        periodId: ids.period,
        turnoId: ids.turno,
        confirmedSeats: 5,
        capacity: 8,
      });
    } finally {
      await session.close();
    }
    const orders = await Promise.all(
      Array.from({ length: 8 }, () => harness.createOrder()),
    );

    const results = await Promise.all(
      orders.map((order) => confirm(harness.store, order)),
    );

    expect(
      results.filter(
        (result) => result.ok && result.value.kind === "confirmed",
      ),
    ).toHaveLength(3);
    expect(
      results.filter(
        (result) => !result.ok && result.error.kind === "turno-full",
      ),
    ).toHaveLength(5);
    const first = orders[0];
    if (!first) throw new Error("missing fixture order");
    await expect(harness.seatCount(first)).resolves.toBe(8);
  });

  it("serializes duplicate confirmation to one claim and one payment audit", async () => {
    const harness = await freshHarness(false, 1);
    const order = await harness.createOrder();

    await expect(
      Promise.all([
        confirm(harness.store, order),
        confirm(harness.store, order),
      ]),
    ).resolves.toEqual(
      expect.arrayContaining([
        { ok: true, value: { kind: "confirmed" } },
        { ok: true, value: { kind: "already-confirmed" } },
      ]),
    );
    await expect(harness.seatCount(order)).resolves.toBe(1);
    await expect(harness.audit(order)).resolves.toHaveLength(2);
  });

  it("serializes concurrent cancellation and confirmation of the same paid order", async () => {
    const harness = await freshHarness(false, 1);
    const order = await harness.createOrder();
    await expect(confirm(harness.store, order)).resolves.toEqual({
      ok: true,
      value: { kind: "confirmed" },
    });

    const results = await Promise.all([
      harness.store.cancel({
        orderId: order.id,
        reason: "changed plans",
        refund: { amount: order.total, refundedOn: "2026-10-31" },
        actor,
        now,
      }),
      confirm(harness.store, order),
    ]);

    const [cancellation, confirmation] = results;
    expect(
      results.filter(
        (result) => result.ok && result.value.kind === "cancelled",
      ),
    ).toHaveLength(1);
    expect(cancellation).toEqual({ ok: true, value: { kind: "cancelled" } });
    expect([
      { ok: true, value: { kind: "already-confirmed" } },
      {
        ok: false,
        error: { kind: "illegal-transition", from: "cancelled", to: "paid" },
      },
    ]).toContainEqual(confirmation);
    await expect(harness.seatCount(order)).resolves.toBe(0);
    await expect(harness.store.detail(order.id)).resolves.toMatchObject({
      ok: true,
      value: { status: "cancelled" },
    });
    await expect(harness.audit(order)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "paid", to: "cancelled" }),
      ]),
    );
  });

  it("lets a different turno commit while the first turno waits on its counter lock", async () => {
    const harness = await freshHarness(false, 1);
    const first = await harness.createOrder();
    const second = await harness.createOrder({ turnoId: "t-2" });
    const setup = await harness.openSession();
    const blocker = new pg.Client({ connectionString: harness.database.url });
    let connected = false;
    let lockHeld = false;
    try {
      await setup.db.insert(turnoSeatCounter).values([
        {
          periodId: ids.period,
          turnoId: ids.turno,
          confirmedSeats: 0,
          capacity: 1,
        },
        {
          periodId: ids.period,
          turnoId: ids.otherTurno,
          confirmedSeats: 0,
          capacity: 1,
        },
      ]);
      await setup.db.execute(
        sql.raw(`
          CREATE FUNCTION test_block_first_turno_counter_update() RETURNS trigger AS $$
          BEGIN
            PERFORM pg_advisory_xact_lock(${advisoryLockKey});
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
          CREATE TRIGGER test_block_first_turno_counter_update_trigger
          BEFORE UPDATE ON turno_seat_counter
          FOR EACH ROW
          WHEN (NEW.turno_id = '${ids.turno}'::uuid)
          EXECUTE FUNCTION test_block_first_turno_counter_update();
        `),
      );
      await blocker.connect();
      connected = true;
      await blocker.query("SELECT pg_advisory_lock($1)", [advisoryLockKey]);
      lockHeld = true;

      let firstSettled = false;
      const firstConfirmation = confirm(harness.store, first).then((result) => {
        firstSettled = true;
        return result;
      });
      await waitForCounterUpdateLock(blocker);

      await expect(confirm(harness.store, second)).resolves.toEqual({
        ok: true,
        value: { kind: "confirmed" },
      });
      expect(firstSettled).toBe(false);

      await blocker.query("SELECT pg_advisory_unlock($1)", [advisoryLockKey]);
      lockHeld = false;
      await expect(firstConfirmation).resolves.toEqual({
        ok: true,
        value: { kind: "confirmed" },
      });
    } finally {
      if (lockHeld) {
        await blocker.query("SELECT pg_advisory_unlock($1)", [advisoryLockKey]);
      }
      if (connected) await blocker.end();
      await setup.close();
    }
    await expect(harness.seatCount(first)).resolves.toBe(1);
    await expect(harness.seatCount(second)).resolves.toBe(1);
  });

  it("leaves a pending order, seat count, and audit unchanged on amount mismatch", async () => {
    const harness = await freshHarness();
    const order = await harness.createOrder();
    const audit = await harness.audit(order);

    await expect(
      harness.store.confirm({
        orderId: order.id,
        amount: pesos(1),
        paidAt: paymentAt,
        actor,
        now,
      }),
    ).resolves.toEqual({ ok: false, error: { kind: "amount-mismatch" } });
    await expect(harness.store.detail(order.id)).resolves.toMatchObject({
      ok: true,
      value: { status: "pending_confirmation" },
    });
    await expect(harness.seatCount(order)).resolves.toBe(0);
    await expect(harness.audit(order)).resolves.toEqual(audit);
  });

  it("leaves a pending order, seat count, and audit unchanged in a closed period", async () => {
    const harness = await freshHarness();
    const order = await harness.createOrder();
    const audit = await harness.audit(order);
    harness.setPeriodStatus("closed");

    await expect(confirm(harness.store, order)).resolves.toEqual({
      ok: false,
      error: { kind: "period-closed" },
    });
    await expect(harness.store.detail(order.id)).resolves.toMatchObject({
      ok: true,
      value: { status: "pending_confirmation" },
    });
    await expect(harness.seatCount(order)).resolves.toBe(0);
    await expect(harness.audit(order)).resolves.toEqual(audit);
  });

  it("enforces the counter CHECK against manual oversell", async () => {
    const harness = await freshHarness(false, 1);
    const session = await harness.openSession();
    try {
      await session.db.insert(turnoSeatCounter).values({
        periodId: ids.period,
        turnoId: ids.turno,
        confirmedSeats: 1,
        capacity: 1,
      });
      const failure = await session.db
        .update(turnoSeatCounter)
        .set({ confirmedSeats: 2 })
        .where(eq(turnoSeatCounter.periodId, ids.period))
        .catch((error: unknown) => error);

      expect(failure).toMatchObject({ cause: { code: "23514" } });
    } finally {
      await session.close();
    }
  });

  it("refuses a new claim when supplied capacity falls below confirmed seats", async () => {
    const harness = await freshHarness(false, 6);
    const orders = await Promise.all(
      Array.from({ length: 7 }, () => harness.createOrder()),
    );
    for (const order of orders.slice(0, 6)) {
      await expect(confirm(harness.store, order)).resolves.toEqual({
        ok: true,
        value: { kind: "confirmed" },
      });
    }
    harness.setCapacity(5);

    const refused = orders[6];
    const first = orders[0];
    if (!refused || !first) throw new Error("missing fixture orders");
    await expect(confirm(harness.store, refused)).resolves.toEqual({
      ok: false,
      error: { kind: "turno-full" },
    });
    await expect(harness.seatCount(first)).resolves.toBe(6);
  });

  it("lets two opposite turno moves commit together without waiting on each other", async () => {
    const harness = await freshHarness(false, 2);
    const first = await harness.createOrder();
    const second = await harness.createOrder({ turnoId: "t-2" });
    await confirm(harness.store, first);
    await confirm(harness.store, second);
    const target = (order: StoredOrder) => ({
      workshopId: order.workshopId,
      workshopName: order.workshopName,
      periodId: order.periodId,
      period: order.period,
      turnoId: order.turnoId,
      turnoLabel: order.turnoLabel,
      weekday: order.weekday,
      startsAt: order.startsAt,
      endsAt: order.endsAt,
    });

    await expect(
      Promise.all([
        harness.store.correct({
          orderId: first.id,
          target: target(second),
          fee: first.fee,
          actor,
          now,
        }),
        harness.store.correct({
          orderId: second.id,
          target: target(first),
          fee: second.fee,
          actor,
          now,
        }),
      ]),
    ).resolves.toEqual([
      { ok: true, value: { kind: "corrected", outcome: "kept-paid" } },
      { ok: true, value: { kind: "corrected", outcome: "kept-paid" } },
    ]);
    await expect(harness.seatCount(first)).resolves.toBe(1);
    await expect(harness.seatCount(second)).resolves.toBe(1);
  });

  it("refuses a move into a month that is no longer open and changes nothing", async () => {
    const harness = await freshHarness(false, 2);
    const order = await harness.createOrder();
    const other = await harness.createOrder({ turnoId: "t-2" });
    await confirm(harness.store, order);
    const before = await harness.store.detail(order.id);
    harness.setPeriodStatus("closed");

    await expect(
      harness.store.correct({
        orderId: order.id,
        target: {
          workshopId: other.workshopId,
          workshopName: other.workshopName,
          periodId: other.periodId,
          period: other.period,
          turnoId: other.turnoId,
          turnoLabel: other.turnoLabel,
          weekday: other.weekday,
          startsAt: other.startsAt,
          endsAt: other.endsAt,
        },
        fee: order.fee,
        actor,
        now,
      }),
    ).resolves.toEqual({ ok: false, error: { kind: "period-closed" } });
    await expect(harness.store.detail(order.id)).resolves.toEqual(before);
    await expect(harness.seatCount(order)).resolves.toBe(1);
    await expect(harness.seatCount(other)).resolves.toBe(0);
  });
});

describe("DrizzleAdminEnrollmentStore stock movements", () => {
  const clay = "00000000-0000-4000-8000-0000000000a1";
  const glaze = "00000000-0000-4000-8000-0000000000a2";

  const line = (
    variantId: string,
    quantity: number,
    source: OrderLineDraft["source"] = "stock",
  ): OrderLineDraft => ({
    materialId: ids.material,
    variantId,
    materialName: "Clay",
    variantLabel: variantId === clay ? "1 kg" : "500 g",
    unitPrice: pesos(4_000),
    quantity,
    supplierId: ids.supplier,
    supplierName: "Supplier",
    source,
    unitCost: pesos(2_500),
  });

  type Harness = Awaited<ReturnType<typeof freshHarness>>;

  const sourcesOf = async (harness: Harness, order: StoredOrder) => {
    const session = await harness.openSession();
    try {
      const rows = await session.db
        .select({ variantId: orderLine.variantId, source: orderLine.source })
        .from(orderLine)
        .where(eq(orderLine.orderId, order.id))
        .orderBy(orderLine.position);
      return rows.map((row) => [row.variantId, row.source]);
    } finally {
      await session.close();
    }
  };

  const cancelPaid = (harness: Harness, order: StoredOrder) =>
    harness.store.cancel({
      orderId: order.id,
      reason: "changed plans",
      refund: { amount: order.total, refundedOn: "2026-10-31" },
      actor,
      now,
    });

  const markMaterials = (
    harness: Harness,
    order: StoredOrder,
    to: "materials_requested" | "materials_received",
  ) => harness.store.markMaterials({ orderId: order.id, to, actor, now });

  it("takes the units of the stock lines once, and a retry takes nothing", async () => {
    const harness = await freshHarness(false, 4);
    await harness.stock.seed(clay, 5);
    const order = await harness.createOrderWithLines([line(clay, 2)]);
    await expect(harness.stock.onHand(clay)).resolves.toBe(5);

    await expect(confirm(harness.store, order)).resolves.toEqual({
      ok: true,
      value: { kind: "confirmed" },
    });
    await expect(harness.stock.onHand(clay)).resolves.toBe(3);
    await expect(confirm(harness.store, order)).resolves.toEqual({
      ok: true,
      value: { kind: "already-confirmed" },
    });
    await expect(harness.stock.onHand(clay)).resolves.toBe(3);
    await expect(sourcesOf(harness, order)).resolves.toEqual([[clay, "stock"]]);
  });

  it("switches a line to the supplier when the stock ran out, and still pays", async () => {
    const harness = await freshHarness(false, 4);
    await harness.stock.seed(clay, 1);
    await harness.stock.seed(glaze, 4);
    const order = await harness.createOrderWithLines([
      line(clay, 2),
      line(glaze, 3),
    ]);

    await expect(confirm(harness.store, order)).resolves.toEqual({
      ok: true,
      value: { kind: "confirmed" },
    });
    await expect(harness.store.detail(order.id)).resolves.toMatchObject({
      ok: true,
      value: { status: "paid" },
    });
    await expect(harness.seatCount(order)).resolves.toBe(1);
    await expect(harness.stock.onHand(clay)).resolves.toBe(1);
    await expect(harness.stock.onHand(glaze)).resolves.toBe(1);
    await expect(sourcesOf(harness, order)).resolves.toEqual([
      [clay, "supplier"],
      [glaze, "stock"],
    ]);
  });

  it("never touches the stock of supplier lines or of an order without lines", async () => {
    const harness = await freshHarness(false, 4);
    await harness.stock.seed(clay, 5);
    const supplierOnly = await harness.createOrderWithLines([
      line(clay, 2, "supplier"),
    ]);
    const plain = await harness.createOrder();

    await confirm(harness.store, supplierOnly);
    await confirm(harness.store, plain);
    await cancelPaid(harness, supplierOnly);

    await expect(harness.stock.onHand(clay)).resolves.toBe(5);
  });

  it("leaves the stock untouched when the payment is refused", async () => {
    const harness = await freshHarness(false, 4);
    await harness.stock.seed(clay, 5);
    const order = await harness.createOrderWithLines([line(clay, 2)]);

    await expect(
      harness.store.confirm({
        orderId: order.id,
        amount: pesos(1),
        paidAt: paymentAt,
        actor,
        now,
      }),
    ).resolves.toEqual({ ok: false, error: { kind: "amount-mismatch" } });
    await expect(harness.stock.onHand(clay)).resolves.toBe(5);
  });

  it("returns the units when the payment fails after they were taken", async () => {
    const harness = await freshHarness(true, 4);
    await harness.stock.seed(clay, 5);
    const order = await harness.createOrderWithLines([line(clay, 2)]);

    await expect(confirm(harness.store, order)).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    await expect(harness.stock.onHand(clay)).resolves.toBe(5);
    await expect(harness.seatCount(order)).resolves.toBe(0);
    await expect(sourcesOf(harness, order)).resolves.toEqual([[clay, "stock"]]);
  });

  it("gives exactly the available units to concurrent confirmations", async () => {
    const harness = await freshHarness(false, 12);
    await harness.stock.seed(clay, 3);
    const orders = await Promise.all(
      Array.from({ length: 8 }, () =>
        harness.createOrderWithLines([line(clay, 1)]),
      ),
    );

    const results = await Promise.all(
      orders.map((order) => confirm(harness.store, order)),
    );

    expect(results.every((result) => result.ok)).toBe(true);
    const sources = (
      await Promise.all(orders.map((order) => sourcesOf(harness, order)))
    ).map((rows) => rows[0]?.[1]);
    expect(sources.filter((source) => source === "stock")).toHaveLength(3);
    expect(sources.filter((source) => source === "supplier")).toHaveLength(5);
    await expect(harness.stock.onHand(clay)).resolves.toBe(0);
  });

  it("puts the units back once when a paid order is cancelled", async () => {
    const harness = await freshHarness(false, 4);
    await harness.stock.seed(clay, 5);
    const order = await harness.createOrderWithLines([line(clay, 2)]);
    await confirm(harness.store, order);

    await expect(cancelPaid(harness, order)).resolves.toEqual({
      ok: true,
      value: { kind: "cancelled" },
    });
    await expect(harness.stock.onHand(clay)).resolves.toBe(5);
    await expect(cancelPaid(harness, order)).resolves.toEqual({
      ok: true,
      value: { kind: "already-cancelled" },
    });
    await expect(harness.stock.onHand(clay)).resolves.toBe(5);
  });

  it("puts nothing back when a pending order is cancelled", async () => {
    const harness = await freshHarness(false, 4);
    await harness.stock.seed(clay, 5);
    const order = await harness.createOrderWithLines([line(clay, 2)]);

    await expect(
      harness.store.cancel({
        orderId: order.id,
        reason: "changed plans",
        actor,
        now,
      }),
    ).resolves.toEqual({ ok: true, value: { kind: "cancelled" } });
    await expect(harness.stock.onHand(clay)).resolves.toBe(5);
  });

  it("puts the units back when the order was cancelled after its materials were requested, but not after they were received", async () => {
    const harness = await freshHarness(false, 4);
    await harness.stock.seed(clay, 6);
    const requested = await harness.createOrderWithLines([
      line(clay, 2),
      line(glaze, 1, "supplier"),
    ]);
    const received = await harness.createOrderWithLines([line(clay, 3)]);
    await confirm(harness.store, requested);
    await confirm(harness.store, received);
    await expect(harness.stock.onHand(clay)).resolves.toBe(1);
    await markMaterials(harness, requested, "materials_requested");
    await markMaterials(harness, received, "materials_received");

    await cancelPaid(harness, requested);
    await expect(harness.stock.onHand(clay)).resolves.toBe(3);
    await cancelPaid(harness, received);
    await expect(harness.stock.onHand(clay)).resolves.toBe(3);
  });

  it("puts the units back when a correction sends the order to pending, and takes them again on the next payment", async () => {
    const harness = await freshHarness(false, 4);
    await harness.stock.seed(clay, 5);
    const order = await harness.createOrderWithLines([line(clay, 2)]);
    await confirm(harness.store, order);
    await expect(harness.stock.onHand(clay)).resolves.toBe(3);

    await expect(
      harness.store.correct({
        orderId: order.id,
        fee: pesos(70_000),
        actor,
        now,
      }),
    ).resolves.toEqual({
      ok: true,
      value: { kind: "corrected", outcome: "returned-to-pending" },
    });
    await expect(harness.stock.onHand(clay)).resolves.toBe(5);

    const raised = await harness.store.detail(order.id);
    if (!raised.ok) throw new Error("expected detail");
    await expect(
      harness.store.confirm({
        orderId: order.id,
        amount: raised.value.total,
        paidAt: paymentAt,
        actor,
        now,
      }),
    ).resolves.toEqual({ ok: true, value: { kind: "confirmed" } });
    await expect(harness.stock.onHand(clay)).resolves.toBe(3);
  });

  it("keeps the units out of stock when a received order is corrected back to pending", async () => {
    const harness = await freshHarness(false, 4);
    await harness.stock.seed(clay, 5);
    const order = await harness.createOrderWithLines([line(clay, 2)]);
    await confirm(harness.store, order);
    await markMaterials(harness, order, "materials_received");

    await expect(
      harness.store.correct({
        orderId: order.id,
        fee: pesos(70_000),
        actor,
        now,
      }),
    ).resolves.toEqual({
      ok: true,
      value: { kind: "corrected", outcome: "returned-to-pending" },
    });
    await expect(harness.stock.onHand(clay)).resolves.toBe(3);
  });

  it("leaves the stock alone when a correction keeps the order paid", async () => {
    const harness = await freshHarness(false, 4);
    await harness.stock.seed(clay, 5);
    const order = await harness.createOrderWithLines([line(clay, 2)]);
    await confirm(harness.store, order);

    await expect(
      harness.store.correct({
        orderId: order.id,
        fee: order.fee,
        actor,
        now,
      }),
    ).resolves.toEqual({
      ok: true,
      value: { kind: "corrected", outcome: "kept-paid" },
    });
    await expect(harness.stock.onHand(clay)).resolves.toBe(3);
  });

  it("consolidates only the supplier lines, and delivers every line", async () => {
    const harness = await freshHarness(false, 4);
    await harness.stock.seed(clay, 5);
    const order = await harness.createOrderWithLines([
      line(clay, 2),
      line(glaze, 1, "supplier"),
    ]);
    await confirm(harness.store, order);

    const consolidated = await harness.store.consolidationLines("2026-10");
    expect(
      consolidated.lines.map((item) => [item.variantLabel, item.quantity]),
    ).toEqual([["500 g", 1]]);
    const delivery = await harness.store.deliveryOrders("2026-10");
    expect(delivery).toHaveLength(1);
    expect(
      delivery[0]?.lines.map((item) => [item.variantLabel, item.source]),
    ).toEqual([
      ["1 kg", "stock"],
      ["500 g", "supplier"],
    ]);
  });

  it("lets an order with only stock lines go from paid straight to received", async () => {
    const harness = await freshHarness(false, 4);
    await harness.stock.seed(clay, 5);
    const order = await harness.createOrderWithLines([line(clay, 2)]);
    await confirm(harness.store, order);

    await expect(
      markMaterials(harness, order, "materials_received"),
    ).resolves.toEqual({ ok: true, value: undefined });
    await expect(harness.store.detail(order.id)).resolves.toMatchObject({
      ok: true,
      value: { status: "materials_received" },
    });
  });

  it("keeps the supplier path for an order with a supplier line, or one whose stock ran out", async () => {
    const harness = await freshHarness(false, 4);
    await harness.stock.seed(clay, 5);
    const mixed = await harness.createOrderWithLines([
      line(clay, 1),
      line(glaze, 1, "supplier"),
    ]);
    const ranOut = await harness.createOrderWithLines([line(glaze, 1)]);
    await confirm(harness.store, mixed);
    await confirm(harness.store, ranOut);

    for (const order of [mixed, ranOut])
      await expect(
        markMaterials(harness, order, "materials_received"),
      ).resolves.toMatchObject({
        ok: false,
        error: {
          kind: "illegal-transition",
          from: "paid",
          to: "materials_received",
        },
      });
    await expect(
      markMaterials(harness, ranOut, "materials_requested"),
    ).resolves.toEqual({ ok: true, value: undefined });
  });
});
