import { afterAll, describe, expect, it } from "vitest";
import {
  enrollmentOrder,
  orderLine,
  turnoSeatCounter,
} from "~/platform/db/schema/enrollments";
import { createDbSessionFactory } from "~/platform/db/session";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
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
  async function add(
    overrides: Partial<Order> & { materials?: number } = {},
  ): Promise<string> {
    next += 1;
    const { materials = 0, ...rest } = overrides;
    const status = rest.status ?? "paid";
    const paid = status !== "pending_confirmation" ? new Date() : null;
    const total = 10_000_00 + materials;
    const row: Order = {
      id: uuid(next),
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
      studentEmail: `s${String(next)}@example.com`,
      studentPhoneDigits: "3510000000",
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
    });
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
});
