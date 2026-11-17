import { afterAll, describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { cordobaDateOf } from "../domain/order-core";
import { createDrizzleAdminEnrollmentStore } from "./drizzle-admin-enrollment-store";
import {
  enrollmentOrder,
  orderLine,
  student,
  turnoSeatCounter,
} from "~/platform/db/schema/enrollments";
import { createDbSessionFactory } from "~/platform/db/session";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createTestOrderStock } from "~/testing/db/order-stock";
import { createDrizzleEnrollmentInsightsReader } from "./drizzle-insights-reader";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

const WORKSHOP_A = "00000000-0000-4000-8000-0000000000a1";
const WORKSHOP_B = "00000000-0000-4000-8000-0000000000b1";
const PERIOD_A = "00000000-0000-4000-8000-0000000000a2";
const TURNO_A = "00000000-0000-4000-8000-0000000000a3";
const SUPPLIER = "00000000-0000-4000-8000-0000000000c1";

type Order = typeof enrollmentOrder.$inferInsert;

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

async function fixture() {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  let next = 100;
  const students = new Map<
    string,
    { readonly id: string; readonly phoneDigits: string }
  >();
  async function add(
    overrides: Partial<Order> & {
      materials?: number;
      /** Supplier cost per unit of the one material line; none when absent. */
      unitCost?: number;
    } = {},
  ): Promise<string> {
    next += 1;
    const { materials = 0, unitCost, ...rest } = overrides;
    const status = rest.status ?? "paid";
    const paid = status !== "pending_confirmation" ? new Date() : null;
    const total = 10_000_00 + materials;
    const studentEmail = rest.studentEmail ?? `s${String(next)}@example.com`;
    const normalizedEmail = studentEmail.trim().toLowerCase();
    const existingStudent = students.get(normalizedEmail);
    const studentId = existingStudent?.id ?? uuid(next + 5_000);
    const studentPhoneDigits =
      existingStudent?.phoneDigits ?? `351${String(next).padStart(7, "0")}`;
    const row: Order = {
      id: uuid(next),
      studentId,
      publicId: `order-${String(next).padStart(17, "0")}`,
      number: `CI-2026-${String(next).padStart(5, "0")}`,
      status,
      source: "public",
      workshopId: WORKSHOP_A,
      periodId: PERIOD_A,
      period: "2026-11",
      turnoId: TURNO_A,
      workshopName: "Ceramica",
      turnoLabel: "Martes",
      weekday: 2,
      startsAt: "18:00",
      endsAt: "20:00",
      studentName: "Ana",
      studentEmail,
      studentPhoneDigits,
      feeCentavos: 10_000_00,
      materialsCentavos: materials,
      totalCentavos: total,
      policyVersion: "2026-10",
      requestedAt: new Date("2026-10-01T12:00:00Z"),
      paidAt: paid,
      paidAmountCentavos: paid === null ? null : total,
      ...rest,
    };
    const session = await openSession();
    try {
      if (existingStudent === undefined) {
        await session.db.insert(student).values({
          id: row.studentId,
          fullName: row.studentName,
          email: normalizedEmail,
          phoneDigits: row.studentPhoneDigits,
          createdAt: row.requestedAt,
          updatedAt: row.requestedAt,
        });
        students.set(normalizedEmail, {
          id: row.studentId,
          phoneDigits: row.studentPhoneDigits,
        });
      }
      await session.db.insert(enrollmentOrder).values(row);
      if (materials > 0) {
        await session.db.insert(orderLine).values({
          orderId: row.id,
          position: 0,
          materialId: uuid(900),
          variantId: uuid(901),
          materialName: "Taza",
          variantLabel: "Blanca",
          unitPriceCentavos: materials / 2,
          quantity: 2,
          supplierId: SUPPLIER,
          supplierName: "Arcilla SA",
          ...(unitCost === undefined ? {} : { unitCostCentavos: unitCost }),
        });
      }
    } finally {
      await session.close();
    }
    return row.id;
  }
  return {
    add,
    openSession,
    reader: createDrizzleEnrollmentInsightsReader(openSession),
  };
}

const CANCELLED = {
  status: "cancelled",
  paidAt: null,
  paidAmountCentavos: null,
} as const;

describe("createDrizzleEnrollmentInsightsReader", () => {
  it("counts orders by workshop, turno, period and status, optionally for one period", async () => {
    const { add, reader } = await fixture();
    await add({ status: "paid" });
    await add({ status: "paid" });
    await add({ status: "pending_confirmation" });
    await add({ period: "2026-12", status: "paid" });
    await add({ workshopId: WORKSHOP_B, workshopName: "Acuarela" });

    const november = await reader.ordersByStatus({ period: "2026-11" });
    const countOf = (workshopId: string, status: string) =>
      november.find((r) => r.workshopId === workshopId && r.status === status)
        ?.orders;
    expect(countOf(WORKSHOP_A, "paid")).toBe(2);
    expect(countOf(WORKSHOP_A, "pending_confirmation")).toBe(1);
    expect(countOf(WORKSHOP_B, "paid")).toBe(1);
    expect(november.every((row) => row.period === "2026-11")).toBe(true);
    expect(
      (await reader.ordersByStatus({})).reduce((sum, r) => sum + r.orders, 0),
    ).toBe(5);
  });

  it("reads the confirmed seats of the given periods only", async () => {
    const { openSession, reader } = await fixture();
    const session = await openSession();
    try {
      await session.db.insert(turnoSeatCounter).values([
        {
          periodId: PERIOD_A,
          turnoId: TURNO_A,
          confirmedSeats: 3,
          capacity: 6,
        },
        { periodId: uuid(7), turnoId: uuid(8), confirmedSeats: 1, capacity: 6 },
      ]);
    } finally {
      await session.close();
    }

    expect(await reader.confirmedSeats([PERIOD_A])).toEqual([
      { periodId: PERIOD_A, turnoId: TURNO_A, confirmedSeats: 3 },
    ]);
    expect(await reader.confirmedSeats([])).toEqual([]);
  });

  it("sums registered income of paid orders by fee and materials, never counting cancelled or pending ones", async () => {
    const { add, reader } = await fixture();
    await add({ materials: 4_000_00 });
    await add({});
    await add({ status: "pending_confirmation" });
    await add(CANCELLED);
    await add({
      paidAt: new Date("2026-09-15T12:00:00Z"),
      period: "2026-10",
    });

    const november = await reader.income({ period: "2026-11" });
    expect(november).toEqual([
      expect.objectContaining({
        workshopId: WORKSHOP_A,
        period: "2026-11",
        orders: 2,
        feeCentavos: 20_000_00,
        materialsCentavos: 4_000_00,
      }),
    ]);
    const september = await reader.income({
      paidFrom: new Date("2026-09-01T03:00:00Z"),
      paidTo: new Date("2026-10-01T03:00:00Z"),
    });
    expect(september).toHaveLength(1);
    expect(september[0]).toMatchObject({ period: "2026-10", orders: 1 });
  });

  it("leaves a cancelled order out of income, materials and participation even when it was paid and refunded", async () => {
    const { add, reader } = await fixture();
    await add({ studentEmail: "kept@example.com" });
    await add({
      studentEmail: "refunded@example.com",
      materials: 4_000_00,
      status: "cancelled",
      paidAt: new Date("2026-10-20T12:00:00Z"),
      paidAmountCentavos: 14_000_00,
      refundedAmountCentavos: 14_000_00,
      refundedAt: new Date("2026-10-25T03:00:00Z"),
      refundNote: "returned in full",
      refundedBy: "admin@example.com",
    });

    expect(await reader.income({ period: "2026-11" })).toEqual([
      expect.objectContaining({
        orders: 1,
        feeCentavos: 10_000_00,
        materialsCentavos: 0,
      }),
    ]);
    expect(await reader.materials({ period: "2026-11" })).toEqual([]);
    expect(await reader.participation("2026-11")).toEqual({
      students: 1,
      recurring: 0,
    });
  });

  it("counts pending orders and those waiting longer than the cutoff", async () => {
    const { add, reader } = await fixture();
    await add({
      status: "pending_confirmation",
      requestedAt: new Date("2026-10-01T12:00:00Z"),
    });
    await add({
      status: "pending_confirmation",
      requestedAt: new Date("2026-10-10T12:00:00Z"),
    });
    await add({ status: "paid" });

    expect(
      await reader.pendingSummary(new Date("2026-10-05T00:00:00Z")),
    ).toEqual({ total: 2, older: 1 });
  });

  it("groups material lines by order status, workshop, supplier and material and skips cancelled orders", async () => {
    const { add, reader } = await fixture();
    await add({ materials: 4_000_00 });
    await add({ materials: 4_000_00, status: "materials_requested" });
    await add({ materials: 4_000_00, ...CANCELLED });
    await add({});

    const rows = await reader.materials({ period: "2026-11" });
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.status === "paid")).toEqual({
      status: "paid",
      workshopId: WORKSHOP_A,
      workshopName: "Ceramica",
      period: "2026-11",
      supplierId: SUPPLIER,
      supplierName: "Arcilla SA",
      materialName: "Taza",
      orders: 1,
      units: 2,
      amountCentavos: 4_000_00,
      costCentavos: 4_000_00,
      uncostedLines: 1,
    });
  });

  it("values the materials at each line's own cost, and at its price where none was loaded", async () => {
    const { add, reader } = await fixture();
    await add({ materials: 4_000_00, unitCost: 1_500_00 });
    await add({ materials: 4_000_00 });

    const [income] = await reader.income({ period: "2026-11" });
    expect(income).toMatchObject({
      materialsCentavos: 8_000_00,
      materialsCostCentavos: 3_000_00 + 4_000_00,
    });
    const [row] = await reader.materials({ period: "2026-11" });
    expect(row).toMatchObject({
      amountCentavos: 8_000_00,
      costCentavos: 3_000_00 + 4_000_00,
      uncostedLines: 1,
    });
  });

  it("counts no uncosted line when every line has a cost", async () => {
    const { add, reader } = await fixture();
    await add({ materials: 4_000_00, unitCost: 1_500_00 });

    const [row] = await reader.materials({ period: "2026-11" });
    expect(row).toMatchObject({ costCentavos: 3_000_00, uncostedLines: 0 });
  });

  it("counts the confirmed students of a period and those who also joined another one", async () => {
    const { add, reader } = await fixture();
    await add({ studentEmail: "ana@example.com" });
    await add({
      studentEmail: " ANA@example.com ",
      period: "2026-12",
      workshopId: WORKSHOP_B,
    });
    await add({ studentEmail: "bea@example.com" });
    await add({
      studentEmail: "cami@example.com",
      status: "pending_confirmation",
    });
    await add({
      studentEmail: "bea@example.com",
      period: "2026-12",
      ...CANCELLED,
    });

    expect(await reader.participation("2026-11")).toEqual({
      students: 2,
      recurring: 1,
    });
    expect(await reader.participation("2027-01")).toEqual({
      students: 0,
      recurring: 0,
    });
  });

  it("totals the fee income and distinct normalized students of each period's paid orders", async () => {
    const { add, reader } = await fixture();
    await add({ studentEmail: "Ana@Example.com ", materials: 4_000_00 });
    await add({ studentEmail: "bea@example.com" });
    await add({
      status: "pending_confirmation",
      studentEmail: "p@example.com",
    });
    await add(CANCELLED);
    await add({ period: "2026-12", studentEmail: "later@example.com" });

    const rows = await reader.periodRegistrations("2026-11");

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      periodId: PERIOD_A,
      orders: 2,
      feeCentavos: 20_000_00,
    });
    expect([...(rows[0]?.studentEmails ?? [])].sort()).toEqual([
      "ana@example.com",
      "bea@example.com",
    ]);
  });

  it("counts a paid material sale as materials income and cost of its workshop and month, never as an enrollment, a fee or a student", async () => {
    const { add, reader } = await fixture();
    const parent = await add({ studentEmail: "ana@example.com" });
    const sale = (overrides: Partial<Order> = {}) =>
      add({
        studentEmail: "ana@example.com",
        kind: "material_sale",
        parentOrderId: parent,
        feeCentavos: 0,
        materials: 4_000_00,
        totalCentavos: 4_000_00,
        paidAmountCentavos: 4_000_00,
        unitCost: 1_500_00,
        ...overrides,
      });
    await sale();
    await sale({
      status: "pending_confirmation",
      paidAt: null,
      paidAmountCentavos: null,
    });
    await sale({ ...CANCELLED });

    expect(await reader.income({ period: "2026-11" })).toEqual([
      expect.objectContaining({
        orders: 1,
        feeCentavos: 10_000_00,
        materialsCentavos: 4_000_00,
        materialsCostCentavos: 3_000_00,
      }),
    ]);
    const registrations = await reader.periodRegistrations("2026-11");
    expect(registrations).toHaveLength(1);
    expect(registrations[0]).toMatchObject({
      orders: 1,
      feeCentavos: 10_000_00,
      studentEmails: ["ana@example.com"],
    });
    const counted = (await reader.ordersByStatus({ period: "2026-11" })).reduce(
      (sum, row) => sum + row.orders,
      0,
    );
    expect(counted).toBe(1);
    expect(await reader.participation("2026-11")).toEqual({
      students: 1,
      recurring: 0,
    });
    // The sale's materials are the materials of its workshop and month.
    const materials = await reader.materials({ period: "2026-11" });
    expect(materials).toHaveLength(2);
    expect(materials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "paid",
          workshopId: WORKSHOP_A,
          amountCentavos: 4_000_00,
          costCentavos: 3_000_00,
        }),
        expect.objectContaining({
          status: "pending_confirmation",
          workshopId: WORKSHOP_A,
          amountCentavos: 4_000_00,
        }),
      ]),
    );
    // A pending sale is a payment still to collect, like a pending enrollment.
    expect(
      await reader.pendingSummary(new Date("2026-11-30T00:00:00Z")),
    ).toEqual({ total: 1, older: 1 });
  });

  it("counts a corrected order once with its current fee, and not while it awaits the new total", async () => {
    const { add, openSession, reader } = await fixture();
    const kept = await add({ studentEmail: "kept@example.com" });
    const corrected = await add({ studentEmail: "corrected@example.com" });
    const session = await openSession();
    try {
      await session.db.insert(turnoSeatCounter).values({
        periodId: PERIOD_A,
        turnoId: TURNO_A,
        confirmedSeats: 2,
        capacity: 8,
      });
    } finally {
      await session.close();
    }
    const store = createDrizzleAdminEnrollmentStore(
      openSession,
      { find: () => Promise.resolve({ status: "open", capacity: 8 }) },
      createTestOrderStock(openSession).port,
    );
    const pesos = (amount: number) => {
      const money = Money.fromCentavos(amount * 100);
      if (!money.ok) throw new Error("fixture money");
      return money.value;
    };
    const now = new Date();
    const actor = { email: "admin@example.com" };

    await expect(
      store.correct({
        orderId: corrected,
        fee: pesos(8_000),
        refund: { amount: pesos(2_000), refundedOn: cordobaDateOf(now) },
        actor,
        now,
      }),
    ).resolves.toMatchObject({ ok: true });
    expect(await reader.income({ period: "2026-11" })).toEqual([
      expect.objectContaining({ orders: 2, feeCentavos: 10_000_00 + 8_000_00 }),
    ]);

    await expect(
      store.correct({ orderId: corrected, fee: pesos(12_000), actor, now }),
    ).resolves.toMatchObject({
      ok: true,
      value: { outcome: "returned-to-pending" },
    });
    expect(await reader.income({ period: "2026-11" })).toEqual([
      expect.objectContaining({ orders: 1, feeCentavos: 10_000_00 }),
    ]);
    expect((await reader.pendingSummary(new Date())).total).toBe(1);
    expect(await reader.confirmedSeats([PERIOD_A])).toEqual([
      { periodId: PERIOD_A, turnoId: TURNO_A, confirmedSeats: 1 },
    ]);
    expect(kept).not.toBe(corrected);
  });
});

describe("the bell readers", () => {
  const SEEN = { seenAt: new Date("2026-10-02T12:00:00Z"), seenBy: "a@b.c" };

  it("lists the unopened public monthly records newest first, never a read, cancelled or sale one", async () => {
    const { add, reader } = await fixture();
    const older = await add({
      status: "pending_confirmation",
      studentName: "Older",
      requestedAt: new Date("2026-10-01T12:00:00Z"),
    });
    const newer = await add({
      status: "paid",
      studentName: "Newer",
      requestedAt: new Date("2026-10-03T12:00:00Z"),
    });
    await add({ status: "pending_confirmation", ...SEEN });
    await add({ ...CANCELLED });
    const parentEmail = "parent@example.com";
    const parent = await add({ studentEmail: parentEmail, ...SEEN });
    // A sale never counts as a novelty, even if its mark were missing.
    await add({
      studentEmail: parentEmail,
      kind: "material_sale",
      parentOrderId: parent,
      feeCentavos: 0,
      materials: 4_000_00,
      totalCentavos: 4_000_00,
      status: "pending_confirmation",
    });

    expect(await reader.unseenOrders()).toEqual([
      {
        id: newer,
        studentName: "Newer",
        workshopName: "Ceramica",
        period: "2026-11",
        requestedAt: new Date("2026-10-03T12:00:00Z"),
      },
      {
        id: older,
        studentName: "Older",
        workshopName: "Ceramica",
        period: "2026-11",
        requestedAt: new Date("2026-10-01T12:00:00Z"),
      },
    ]);
  });

  it("lists every pending fee and pending sale oldest first, read or not, until they are paid or cancelled", async () => {
    const { add, reader } = await fixture();
    const fee = await add({
      status: "pending_confirmation",
      studentName: "Fee Student",
      materials: 2_000_00,
      requestedAt: new Date("2026-10-05T12:00:00Z"),
      ...SEEN,
    });
    const parentEmail = "parent@example.com";
    const parent = await add({ studentEmail: parentEmail });
    const sale = await add({
      studentEmail: parentEmail,
      studentName: "Sale Student",
      kind: "material_sale",
      parentOrderId: parent,
      feeCentavos: 0,
      materials: 4_000_00,
      totalCentavos: 4_000_00,
      status: "pending_confirmation",
      requestedAt: new Date("2026-10-04T12:00:00Z"),
    });
    await add({ status: "paid" });
    await add({ ...CANCELLED });

    expect(await reader.pendingPayments()).toEqual([
      {
        id: sale,
        kind: "material_sale",
        studentName: "Sale Student",
        workshopName: "Ceramica",
        period: "2026-11",
        totalCentavos: 4_000_00,
        requestedAt: new Date("2026-10-04T12:00:00Z"),
      },
      {
        id: fee,
        kind: "enrollment",
        studentName: "Fee Student",
        workshopName: "Ceramica",
        period: "2026-11",
        totalCentavos: 12_000_00,
        requestedAt: new Date("2026-10-05T12:00:00Z"),
      },
    ]);
  });

  it("rejects a half-set read mark and a sale-less order check at the database", async () => {
    const { add } = await fixture();

    await expect(add({ seenBy: "someone@example.com" })).rejects.toThrow();
    await expect(add({ seenAt: new Date() })).rejects.toThrow();
  });
});
