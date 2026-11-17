import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { Money } from "~/modules/_shared";
import { createDbSessionFactory } from "~/platform/db/session";
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
import { createDrizzleAdminEnrollmentStore } from "./drizzle-admin-enrollment-store";
import { createDrizzleOrderRepository } from "./drizzle-order-repository";
import type { PeriodStatus } from "../domain/period-window";

const created: TestDatabase[] = [];
const ids = {
  workshop: "00000000-0000-4000-8000-000000000001",
  period: "00000000-0000-4000-8000-000000000002",
  turno: "00000000-0000-4000-8000-000000000003",
  material: "00000000-0000-4000-8000-000000000005",
  supplier: "00000000-0000-4000-8000-000000000007",
  clay: "00000000-0000-4000-8000-0000000000a1",
  glaze: "00000000-0000-4000-8000-0000000000a2",
};
const actor = { email: "admin@example.com" };
const paymentAt = new Date("2026-11-03T03:00:00Z");
const now = new Date("2026-11-04T15:00:00Z");

const pesos = (value: number) => {
  const result = Money.fromCentavos(value * 100);
  if (!result.ok) throw new Error("fixture money");
  return result.value;
};

const monthlyDraft = (
  index: number,
  overrides: Partial<OrderDraft> = {},
): OrderDraft => ({
  publicId: `order-${String(index).padStart(17, "0")}`,
  year: 2026,
  requestedAt: new Date("2026-10-30T15:00:00Z"),
  workshopId: ids.workshop,
  workshopName: "Ceramics",
  periodId: ids.period,
  period: "2026-11",
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
  policyVersion: "2026-11",
  lines: [],
  ...overrides,
});

const line = (
  variantId: string,
  quantity: number,
  source: OrderLineDraft["source"] = "stock",
): OrderLineDraft => ({
  materialId: ids.material,
  variantId,
  materialName: "Clay",
  variantLabel: variantId === ids.clay ? "1 kg" : "500 g",
  unitPrice: pesos(4_000),
  quantity,
  supplierId: ids.supplier,
  supplierName: "Supplier",
  source,
  unitCost: pesos(2_500),
});

async function freshHarness(capacity = 2) {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  const stock = createTestOrderStock(openSession);
  const repository = createDrizzleOrderRepository(openSession, stock.port);
  let periodStatus: PeriodStatus = "open";
  const store = createDrizzleAdminEnrollmentStore(
    openSession,
    { find: () => Promise.resolve({ status: periodStatus, capacity }) },
    stock.port,
  );
  let next = 0;

  const query = async <T extends Record<string, unknown>>(
    statement: ReturnType<typeof sql>,
  ): Promise<T[]> => {
    const session = await openSession();
    try {
      return (await session.db.execute(statement)).rows as T[];
    } finally {
      await session.close();
    }
  };

  return {
    store,
    stock,
    repository,
    openSession,
    setPeriodStatus: (value: PeriodStatus) => {
      periodStatus = value;
    },
    async monthly(
      overrides: Partial<OrderDraft> = {},
      status: "pending" | "paid" = "pending",
    ): Promise<StoredOrder> {
      next += 1;
      const result = await repository.create(monthlyDraft(next, overrides));
      if (!result.ok) throw new Error("fixture order creation failed");
      if (status === "paid") {
        const confirmed = await store.confirm({
          orderId: result.value.id,
          amount: result.value.total,
          paidAt: paymentAt,
          actor,
          now,
        });
        if (!confirmed.ok) throw new Error("fixture confirmation failed");
      }
      return result.value;
    },
    /** Creates a sale under `parent` and returns its id. */
    async sale(
      parent: StoredOrder,
      lines: readonly OrderLineDraft[],
      publicId = `sale-${String((next += 1)).padStart(18, "0")}`,
    ) {
      const materials = lines.reduce(
        (sum, item) => sum + item.unitPrice.toCentavos() * item.quantity,
        0,
      );
      return store.createSale({
        parentOrderId: parent.id,
        publicId,
        year: 2026,
        materialsTotal: pesos(materials / 100),
        lines,
        actor,
        now,
      });
    },
    async saleId(parent: StoredOrder, lines: readonly OrderLineDraft[]) {
      const result = await this.sale(parent, lines);
      if (!result.ok) throw new Error("fixture sale creation failed");
      return result.value.id;
    },
    row: async (id: string) =>
      (await query(sql`select * from enrollment_order where id = ${id}`))[0],
    count: async () =>
      Number(
        (
          await query<{ n: number }>(
            sql`select count(*)::int as n from enrollment_order`,
          )
        )[0]?.n,
      ),
    sequence: async () =>
      Number(
        (
          await query<{ last: number }>(
            sql`select coalesce(max(last), 0) as last from order_number_sequence`,
          )
        )[0]?.last,
      ),
    seats: async () =>
      Number(
        (
          await query<{ n: number }>(
            sql`select coalesce(sum(confirmed_seats), 0)::int as n from turno_seat_counter`,
          )
        )[0]?.n,
      ),
    lineSources: async (id: string) =>
      (
        await query<{ variant_id: string; source: string }>(
          sql`select variant_id, source from order_line where order_id = ${id} order by position`,
        )
      ).map((row) => [row.variant_id, row.source]),
    audit: (id: string) => repository.auditTrail(id),
  };
}

type Harness = Awaited<ReturnType<typeof freshHarness>>;

afterEach(async () => {
  for (const database of created.splice(0)) await database.drop();
});

const pay = (harness: Harness, id: string, total: Money) =>
  harness.store.confirm({
    orderId: id,
    amount: total,
    paidAt: paymentAt,
    actor,
    now,
  });

const void_ = (harness: Harness, id: string, amount: Money) =>
  harness.store.cancel({
    orderId: id,
    reason: "devuelto",
    refund: { amount, refundedOn: "2026-11-04", note: "vuelta" },
    actor,
    now,
  });

describe("DrizzleAdminEnrollmentStore material sales", () => {
  it("creates a pending sale under the monthly record: no fee, no seat, no stock", async () => {
    const harness = await freshHarness();
    await harness.stock.seed(ids.clay, 5);
    const parent = await harness.monthly({}, "paid");
    const seatsBefore = await harness.seats();

    const result = await harness.sale(parent, [
      line(ids.clay, 2),
      line(ids.glaze, 1, "supplier"),
    ]);

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    const row = await harness.row(result.value.id);
    expect(row).toMatchObject({
      kind: "material_sale",
      parent_order_id: parent.id,
      status: "pending_confirmation",
      fee_centavos: "0",
      materials_centavos: "1200000",
      total_centavos: "1200000",
      student_id: (await harness.row(parent.id))?.student_id,
      workshop_id: parent.workshopId,
      period_id: parent.periodId,
      period: "2026-11",
      turno_id: parent.turnoId,
      student_email: parent.student.email,
      paid_at: null,
    });
    expect(result.value.number).toMatch(/^CI-2026-\d{4}$/);
    await expect(harness.lineSources(result.value.id)).resolves.toEqual([
      [ids.clay, "stock"],
      [ids.glaze, "supplier"],
    ]);
    await expect(harness.audit(result.value.id)).resolves.toMatchObject([
      { from: null, to: "pending_confirmation", actor: actor.email },
    ]);
    await expect(harness.seats()).resolves.toBe(seatsBefore);
    await expect(harness.stock.onHand(ids.clay)).resolves.toBe(5);
  });

  it("refuses a sale under a cancelled record, under another sale or under nothing, and stores nothing", async () => {
    const harness = await freshHarness();
    const cancelled = await harness.monthly();
    await harness.store.cancel({
      orderId: cancelled.id,
      reason: "cambio de planes",
      actor,
      now,
    });
    const live = await harness.monthly();
    const existing = await harness.saleId(live, [line(ids.clay, 1)]);
    const countBefore = await harness.count();
    const sequenceBefore = await harness.sequence();

    const underCancelled = await harness.sale(cancelled, [line(ids.clay, 1)]);
    const underSale = await harness.store.createSale({
      parentOrderId: existing,
      publicId: "sale-under-sale-000000",
      year: 2026,
      materialsTotal: pesos(4_000),
      lines: [line(ids.clay, 1)],
      actor,
      now,
    });
    const underNothing = await harness.store.createSale({
      parentOrderId: "00000000-0000-4000-8000-0000000000ff",
      publicId: "sale-nothing-0000000000",
      year: 2026,
      materialsTotal: pesos(4_000),
      lines: [line(ids.clay, 1)],
      actor,
      now,
    });

    expect(underCancelled).toEqual({
      ok: false,
      error: { kind: "not-sellable" },
    });
    expect(underSale).toEqual({ ok: false, error: { kind: "not-sellable" } });
    expect(underNothing).toEqual({ ok: false, error: { kind: "not-found" } });
    await expect(harness.count()).resolves.toBe(countBefore);
    await expect(harness.sequence()).resolves.toBe(sequenceBefore);
  });

  it("never changes the monthly record, whatever happens to its sale", async () => {
    const harness = await freshHarness();
    await harness.stock.seed(ids.clay, 5);
    const parent = await harness.monthly({}, "paid");
    const before = await harness.row(parent.id);
    const seats = await harness.seats();

    const saleId = await harness.saleId(parent, [line(ids.clay, 2)]);
    await pay(harness, saleId, pesos(8_000));
    await void_(harness, saleId, pesos(8_000));

    await expect(harness.row(parent.id)).resolves.toEqual(before);
    await expect(harness.seats()).resolves.toBe(seats);
    await expect(harness.audit(parent.id)).resolves.toHaveLength(2);
  });

  it("confirms a sale without a seat, in a full turno and in a closed month, taking its stock once", async () => {
    const harness = await freshHarness(1);
    await harness.stock.seed(ids.clay, 5);
    const parent = await harness.monthly({}, "paid");
    await expect(harness.seats()).resolves.toBe(1);
    const saleId = await harness.saleId(parent, [line(ids.clay, 2)]);
    harness.setPeriodStatus("closed");

    await expect(pay(harness, saleId, pesos(8_000))).resolves.toEqual({
      ok: true,
      value: { kind: "confirmed" },
    });
    await expect(pay(harness, saleId, pesos(8_000))).resolves.toEqual({
      ok: true,
      value: { kind: "already-confirmed" },
    });

    await expect(harness.seats()).resolves.toBe(1);
    await expect(harness.stock.onHand(ids.clay)).resolves.toBe(3);
    await expect(harness.row(saleId)).resolves.toMatchObject({
      status: "paid",
      paid_amount_centavos: "800000",
      confirmed_by: actor.email,
    });
  });

  it("refuses a payment that is not the sale total and changes nothing", async () => {
    const harness = await freshHarness();
    await harness.stock.seed(ids.clay, 5);
    const parent = await harness.monthly({}, "paid");
    const saleId = await harness.saleId(parent, [line(ids.clay, 2)]);

    await expect(pay(harness, saleId, pesos(1))).resolves.toEqual({
      ok: false,
      error: { kind: "amount-mismatch" },
    });
    await expect(harness.row(saleId)).resolves.toMatchObject({
      status: "pending_confirmation",
    });
    await expect(harness.stock.onHand(ids.clay)).resolves.toBe(5);
  });

  it("takes the stock exactly once when the same sale is confirmed concurrently", async () => {
    const harness = await freshHarness();
    await harness.stock.seed(ids.clay, 10);
    const parent = await harness.monthly({}, "paid");
    const saleId = await harness.saleId(parent, [line(ids.clay, 3)]);

    const results = await Promise.all(
      Array.from({ length: 6 }, () => pay(harness, saleId, pesos(12_000))),
    );

    expect(
      results.filter((r) => r.ok && r.value.kind === "confirmed"),
    ).toHaveLength(1);
    expect(
      results.filter((r) => r.ok && r.value.kind === "already-confirmed"),
    ).toHaveLength(5);
    await expect(harness.stock.onHand(ids.clay)).resolves.toBe(7);
    await expect(harness.audit(saleId)).resolves.toHaveLength(2);
  });

  it("switches a sale line to the supplier when the stock ran out, and still pays", async () => {
    const harness = await freshHarness();
    await harness.stock.seed(ids.clay, 1);
    const parent = await harness.monthly({}, "paid");
    const saleId = await harness.saleId(parent, [line(ids.clay, 2)]);

    await expect(pay(harness, saleId, pesos(8_000))).resolves.toMatchObject({
      ok: true,
    });

    await expect(harness.lineSources(saleId)).resolves.toEqual([
      [ids.clay, "supplier"],
    ]);
    await expect(harness.stock.onHand(ids.clay)).resolves.toBe(1);
  });

  it("cancels a pending sale without a refund and without touching seats or stock", async () => {
    const harness = await freshHarness();
    await harness.stock.seed(ids.clay, 5);
    const parent = await harness.monthly({}, "paid");
    const seats = await harness.seats();
    const saleId = await harness.saleId(parent, [line(ids.clay, 2)]);

    await expect(
      harness.store.cancel({
        orderId: saleId,
        reason: "ya no la quiere",
        actor,
        now,
      }),
    ).resolves.toEqual({ ok: true, value: { kind: "cancelled" } });

    await expect(harness.row(saleId)).resolves.toMatchObject({
      status: "cancelled",
      cancel_reason: "ya no la quiere",
      refunded_amount_centavos: null,
    });
    await expect(harness.seats()).resolves.toBe(seats);
    await expect(harness.stock.onHand(ids.clay)).resolves.toBe(5);
  });

  it("voids a paid sale with its refund evidence, returning the stock once and keeping the seat", async () => {
    const harness = await freshHarness();
    await harness.stock.seed(ids.clay, 5);
    const parent = await harness.monthly({}, "paid");
    const seats = await harness.seats();
    const saleId = await harness.saleId(parent, [line(ids.clay, 2)]);
    await pay(harness, saleId, pesos(8_000));
    await expect(harness.stock.onHand(ids.clay)).resolves.toBe(3);

    await expect(void_(harness, saleId, pesos(3_000))).resolves.toEqual({
      ok: true,
      value: { kind: "cancelled" },
    });
    await expect(void_(harness, saleId, pesos(3_000))).resolves.toEqual({
      ok: true,
      value: { kind: "already-cancelled" },
    });

    await expect(harness.stock.onHand(ids.clay)).resolves.toBe(5);
    await expect(harness.seats()).resolves.toBe(seats);
    await expect(harness.row(saleId)).resolves.toMatchObject({
      status: "cancelled",
      paid_amount_centavos: "800000",
      refunded_amount_centavos: "300000",
      refund_note: "vuelta",
      refunded_by: actor.email,
    });
    // The three rows share one instant here, so their order is not asserted.
    const trail = await harness.audit(saleId);
    expect(trail).toHaveLength(3);
    expect(trail).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: null, to: "pending_confirmation" }),
        expect.objectContaining({ from: "pending_confirmation", to: "paid" }),
        expect.objectContaining({
          from: "paid",
          to: "cancelled",
          note: "devuelto",
        }),
      ]),
    );
  });

  it("refuses to void a paid sale without a refund, and a refund above what was paid", async () => {
    const harness = await freshHarness();
    const parent = await harness.monthly({}, "paid");
    const saleId = await harness.saleId(parent, [
      line(ids.clay, 1, "supplier"),
    ]);
    await pay(harness, saleId, pesos(4_000));

    await expect(
      harness.store.cancel({ orderId: saleId, reason: "devuelto", actor, now }),
    ).resolves.toMatchObject({ ok: false, error: { kind: "invalid-refund" } });
    await expect(void_(harness, saleId, pesos(4_001))).resolves.toMatchObject({
      ok: false,
      error: { kind: "invalid-refund" },
    });
    await expect(harness.row(saleId)).resolves.toMatchObject({
      status: "paid",
    });
  });

  it("returns the stock only once when a paid sale is cancelled concurrently, and not after it was received", async () => {
    const harness = await freshHarness();
    await harness.stock.seed(ids.clay, 5);
    const parent = await harness.monthly({}, "paid");
    const concurrent = await harness.saleId(parent, [line(ids.clay, 2)]);
    await pay(harness, concurrent, pesos(8_000));

    const results = await Promise.all(
      Array.from({ length: 5 }, () => void_(harness, concurrent, pesos(8_000))),
    );

    expect(
      results.filter((r) => r.ok && r.value.kind === "cancelled"),
    ).toHaveLength(1);
    await expect(harness.stock.onHand(ids.clay)).resolves.toBe(5);

    const received = await harness.saleId(parent, [line(ids.clay, 2)]);
    await pay(harness, received, pesos(8_000));
    await harness.store.markMaterials({
      orderId: received,
      to: "materials_received",
      actor,
      now,
    });
    await void_(harness, received, pesos(0));
    await expect(harness.stock.onHand(ids.clay)).resolves.toBe(3);
  });

  it("does not correct a sale: workshop, turno and fee belong to the monthly record", async () => {
    const harness = await freshHarness();
    const parent = await harness.monthly({}, "paid");
    const saleId = await harness.saleId(parent, [
      line(ids.clay, 1, "supplier"),
    ]);
    const before = await harness.row(saleId);

    await expect(
      harness.store.correct({ orderId: saleId, fee: pesos(1_000), actor, now }),
    ).resolves.toEqual({ ok: false, error: { kind: "not-correctable" } });

    await expect(harness.row(saleId)).resolves.toEqual(before);
  });

  it("leaves the monthly flows as they were with a sale present", async () => {
    const harness = await freshHarness(2);
    const parent = await harness.monthly({}, "paid");
    await harness.saleId(parent, [line(ids.clay, 1, "supplier")]);

    // The same student and month still hold exactly one active monthly record.
    const second = await harness.repository.create(
      monthlyDraft(99, {
        student: parent.student,
        publicId: "dup-0000000000000001",
      }),
    );
    expect(second).toEqual({ ok: false, error: { kind: "duplicate-order" } });

    // Cancelling the monthly record frees its seat once and leaves the sale paid.
    const saleId = await harness.saleId(parent, [
      line(ids.clay, 1, "supplier"),
    ]);
    await pay(harness, saleId, pesos(4_000));
    await expect(
      harness.store.cancel({
        orderId: parent.id,
        reason: "cambio de planes",
        refund: { amount: pesos(0), refundedOn: "2026-11-04" },
        actor,
        now,
      }),
    ).resolves.toEqual({ ok: true, value: { kind: "cancelled" } });
    await expect(harness.seats()).resolves.toBe(0);
    await expect(harness.row(saleId)).resolves.toMatchObject({
      status: "paid",
    });

    // A cancelled record frees the month for a new enrollment.
    const again = await harness.repository.create(
      monthlyDraft(98, {
        student: parent.student,
        publicId: "again-000000000000001",
      }),
    );
    expect(again).toMatchObject({ ok: true });
  });

  it("lists the supplier lines of a paid sale and lets it move through requested and received", async () => {
    const harness = await freshHarness();
    await harness.stock.seed(ids.clay, 5);
    const parent = await harness.monthly({}, "paid");
    const supplierSale = await harness.saleId(parent, [
      line(ids.glaze, 2, "supplier"),
    ]);
    const stockSale = await harness.saleId(parent, [line(ids.clay, 1)]);
    await pay(harness, supplierSale, pesos(8_000));
    await pay(harness, stockSale, pesos(4_000));

    const consolidation = await harness.store.consolidationLines("2026-11");
    expect(consolidation.lines).toMatchObject([
      { orderId: supplierSale, quantity: 2, status: "paid" },
    ]);

    await expect(
      harness.store.markMaterials({
        orderId: supplierSale,
        to: "materials_requested",
        actor,
        now,
      }),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      harness.store.markMaterials({
        orderId: supplierSale,
        to: "materials_received",
        actor,
        now,
      }),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      harness.store.markMaterials({
        orderId: stockSale,
        to: "materials_received",
        actor,
        now,
      }),
    ).resolves.toMatchObject({ ok: true });

    const delivery = await harness.store.deliveryOrders("2026-11");
    expect(delivery.map((order) => order.id).sort()).toEqual(
      [supplierSale, stockSale].sort(),
    );
  });

  it("shows a sale in the list and in the detail of both records", async () => {
    const harness = await freshHarness();
    const parent = await harness.monthly({}, "paid");
    const saleId = await harness.saleId(parent, [
      line(ids.clay, 1, "supplier"),
    ]);

    const list = await harness.store.list({ status: "pending_confirmation" });
    expect(list.items).toMatchObject([{ id: saleId, kind: "material_sale" }]);

    const saleDetail = await harness.store.detail(saleId);
    expect(saleDetail).toMatchObject({
      ok: true,
      value: {
        kind: "material_sale",
        parent: { id: parent.id, number: parent.number },
      },
    });
    if (saleDetail.ok) expect(saleDetail.value.fee.toCentavos()).toBe(0);
    const parentDetail = await harness.store.detail(parent.id);
    expect(parentDetail).toMatchObject({
      ok: true,
      value: {
        kind: "enrollment",
        sales: [{ id: saleId, status: "pending_confirmation" }],
      },
    });
  });
});

describe("DrizzleAdminEnrollmentStore panel read state", () => {
  it("stores a sale already seen by the owner who sold it, and leaves its monthly record unread", async () => {
    const harness = await freshHarness();
    await harness.stock.seed(ids.clay, 5);
    const parent = await harness.monthly({}, "paid");
    const before = await harness.row(parent.id);
    expect(before).toMatchObject({ seen_at: null, seen_by: null });

    const saleId = await harness.saleId(parent, [line(ids.clay, 1)]);

    const sold = await harness.row(saleId);
    expect(sold?.seen_by).toBe(actor.email);
    expect(new Date(String(sold?.seen_at)).getTime()).toBe(now.getTime());
    expect(await harness.row(parent.id)).toEqual(before);
    await expect(
      harness.store.markSeen({ orderId: saleId, actor, now }),
    ).resolves.toEqual({ ok: true, value: { kind: "already-seen" } });
  });

  it("keeps the first opener's mark, and lets exactly one of several concurrent openers set it", async () => {
    const harness = await freshHarness();
    const order = await harness.monthly();
    const first = { email: "agus@example.com" };

    const outcomes = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        harness.store.markSeen({
          orderId: order.id,
          actor:
            index === 0
              ? first
              : { email: `owner-${String(index)}@example.com` },
          now: new Date(`2026-11-0${String(index + 1)}T15:00:00Z`),
        }),
      ),
    );

    const kinds = outcomes.map((outcome) =>
      outcome.ok ? outcome.value.kind : "failed",
    );
    expect(kinds.filter((kind) => kind === "seen")).toHaveLength(1);
    expect(kinds.filter((kind) => kind === "already-seen")).toHaveLength(5);
    const row = await harness.row(order.id);
    expect(row?.seen_by).toMatch(/@example\.com$/);
    await harness.store.markSeen({
      orderId: order.id,
      actor: { email: "late@example.com" },
      now,
    });
    expect((await harness.row(order.id))?.seen_by).toBe(row?.seen_by);
  });

  it("refuses a half-set read mark at the database", async () => {
    const harness = await freshHarness();
    const order = await harness.monthly();
    const session = await harness.openSession();
    try {
      await expect(
        session.db.execute(
          sql`UPDATE enrollment_order SET seen_at = now() WHERE id = ${order.id}`,
        ),
      ).rejects.toThrow();
    } finally {
      await session.close();
    }
  });
});
