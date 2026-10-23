import pg from "pg";
import { afterEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { Money } from "~/modules/_shared";
import { createDbSessionFactory } from "~/platform/db/session";
import { turnoSeatCounter } from "~/platform/db/schema/enrollments";
import { runAdminEnrollmentStoreContract } from "~/testing/contracts/admin-enrollment-store.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import type {
  OrderDraft,
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
  const repository = createDrizzleOrderRepository(openSession);
  let configuredCapacity = capacity;
  let configuredPeriodStatus: PeriodStatus = "open";
  const store = createDrizzleAdminEnrollmentStore(openSession, {
    find: () =>
      Promise.resolve({
        status: configuredPeriodStatus,
        capacity: configuredCapacity,
      }),
  });
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
    failingAfterSeatMutation: () => freshHarness(true),
  };
}

afterEach(async () => {
  for (const database of created.splice(0)) {
    await database.drop();
  }
});

runAdminEnrollmentStoreContract(freshHarness);

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
});
