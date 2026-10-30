import { describe, expect, it } from "vitest";
import type {
  IncomeRow,
  MaterialRow,
  OrderCountRow,
} from "~/modules/enrollments";
import type { PeriodCapacityRow } from "~/modules/workshops";
import { insightsFixture } from "~/testing/admin/insights-kit";
import { testAdminActor } from "~/testing/fakes/admin-actor";

const actor = testAdminActor();

const capacity = (
  overrides: Partial<PeriodCapacityRow>,
): PeriodCapacityRow => ({
  workshopId: "w1",
  workshopName: "Ceramica",
  periodId: "p1",
  period: "2026-10",
  periodStatus: "open",
  turnoId: "t1",
  turnoLabel: "Martes",
  capacity: 6,
  ...overrides,
});

const income = (overrides: Partial<IncomeRow>): IncomeRow => ({
  workshopId: "w1",
  workshopName: "Ceramica",
  period: "2026-10",
  orders: 1,
  feeCentavos: 10_000_00,
  materialsCentavos: 0,
  ...overrides,
});

const material = (overrides: Partial<MaterialRow>): MaterialRow => ({
  status: "paid",
  workshopId: "w1",
  workshopName: "Ceramica",
  period: "2026-10",
  supplierId: "s1",
  supplierName: "Arcilla SA",
  materialName: "Taza",
  orders: 1,
  units: 2,
  amountCentavos: 4_000_00,
  ...overrides,
});

const count = (overrides: Partial<OrderCountRow>): OrderCountRow => ({
  workshopId: "w1",
  workshopName: "Ceramica",
  turnoId: "t1",
  turnoLabel: "Martes",
  periodId: "p1",
  period: "2026-10",
  status: "paid",
  orders: 1,
  ...overrides,
});

/**
 * October 2026: Ceramica (third party, 30 %) and Acuarela (own teacher) run
 * monthly, and the intensivo Torno (third party, 50 %) is held on the 17th.
 */
function earningsFixture() {
  const kit = insightsFixture();
  const { orders, workshops, intensives, intensiveRequests, teachers } = kit;
  teachers.add("t1", "Ana", "third_party");
  teachers.add("t2", "Bea", "own");
  teachers.add("t3", "Cleo", "third_party");
  workshops.capacityRows = [
    capacity({}),
    capacity({ turnoId: "t2", turnoLabel: "Jueves", capacity: 4 }),
    capacity({
      workshopId: "w2",
      workshopName: "Acuarela",
      periodId: "p2",
      turnoId: "t3",
      capacity: 5,
    }),
    capacity({ period: "2026-11", periodId: "p9", capacity: 50 }),
  ];
  orders.seats = [
    { periodId: "p1", turnoId: "t1", confirmedSeats: 3 },
    { periodId: "p1", turnoId: "t2", confirmedSeats: 1 },
    { periodId: "p2", turnoId: "t3", confirmedSeats: 2 },
  ];
  orders.incomeRows = [
    income({ orders: 4, feeCentavos: 40_000_00, materialsCentavos: 6_000_00 }),
    income({
      workshopId: "w2",
      workshopName: "Acuarela",
      orders: 2,
      feeCentavos: 20_000_00,
    }),
  ];
  orders.registrationRows = [
    {
      period: "2026-10",
      periodId: "p1",
      orders: 4,
      feeCentavos: 40_000_00,
      studentEmails: [],
    },
    {
      period: "2026-10",
      periodId: "p2",
      orders: 2,
      feeCentavos: 20_000_00,
      studentEmails: [],
    },
  ];
  workshops.teacherRows = [
    {
      period: "2026-10",
      periodId: "p1",
      workshopId: "w1",
      workshopName: "Ceramica",
      teacherId: "t1",
      teacherName: "Ana",
      modality: "third_party",
      percentageBp: 3000,
    },
    {
      period: "2026-10",
      periodId: "p2",
      workshopId: "w2",
      workshopName: "Acuarela",
      teacherId: "t2",
      teacherName: "Bea",
      modality: "own",
      percentageBp: null,
    },
  ];
  intensives.rows = [
    {
      intensiveId: "i1",
      name: "Torno",
      eventDate: "2026-10-17",
      capacity: 8,
      teacherId: "t3",
      percentageBp: 5000,
    },
  ];
  intensiveRequests.registrationRows = [
    { intensiveId: "i1", confirmedSeats: 3, paidCentavos: 30_000_00 },
  ];
  orders.materialRows = [
    material({ status: "paid", orders: 2, units: 3, amountCentavos: 4_000_00 }),
    material({
      status: "materials_received",
      materialName: "Esmalte",
      orders: 1,
      units: 1,
      amountCentavos: 2_000_00,
    }),
    // A pending request is not income yet, so it is not a cost either.
    material({
      status: "pending_confirmation",
      materialName: "Pincel",
      amountCentavos: 9_000_00,
    }),
  ];
  orders.participationRow = { students: 10, recurring: 4 };
  return kit;
}

describe("insights earnings", () => {
  it("denies a missing actor and refuses a malformed month", async () => {
    const { service } = earningsFixture();

    await expect(service.earnings(null, {})).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    await expect(
      service.earnings(actor, { period: "octubre" }),
    ).resolves.toMatchObject({ ok: false, error: { kind: "invalid" } });
  });

  it("builds one row per taller and intensivo with its earnings", async () => {
    const { service } = earningsFixture();

    const result = await service.earnings(actor, { period: "2026-10" });

    if (!result.ok) throw new Error("expected earnings");
    const rows = result.value.activities.map((row) => ({
      kind: row.kind,
      name: row.name,
      enrolled: row.enrolled,
      capacity: row.capacity,
      collected: row.collected.toCentavos(),
      teacher: row.teacherName,
      modality: row.teacherModality,
      pay: row.teacherPay.toCentavos(),
      materials: row.materialsCost.toCentavos(),
      profit: row.profit.toCentavos(),
    }));
    expect(rows).toEqual([
      {
        kind: "taller",
        name: "Acuarela",
        enrolled: 2,
        capacity: 5,
        collected: 20_000_00,
        teacher: "Bea",
        modality: "own",
        pay: 0,
        materials: 0,
        profit: 20_000_00,
      },
      {
        kind: "taller",
        name: "Ceramica",
        enrolled: 4,
        capacity: 10,
        collected: 46_000_00,
        teacher: "Ana",
        modality: "third_party",
        pay: 12_000_00,
        materials: 6_000_00,
        profit: 28_000_00,
      },
      {
        kind: "intensivo",
        name: "Torno",
        enrolled: 3,
        capacity: 8,
        collected: 30_000_00,
        teacher: "Cleo",
        modality: "third_party",
        pay: 15_000_00,
        materials: 0,
        profit: 15_000_00,
      },
    ]);
  });

  it("reconciles: totals are the sum of the rows and profit is collected minus teachers minus materials", async () => {
    const { service } = earningsFixture();

    const result = await service.earnings(actor, { period: "2026-10" });

    if (!result.ok) throw new Error("expected earnings");
    const { activities, totals } = result.value;
    const sum = (pick: (row: (typeof activities)[number]) => number) =>
      activities.reduce((total, row) => total + pick(row), 0);
    expect(totals.collected.toCentavos()).toBe(96_000_00);
    expect(totals.teacherPay.toCentavos()).toBe(27_000_00);
    expect(totals.materialsCost.toCentavos()).toBe(6_000_00);
    expect(totals.profit.toCentavos()).toBe(63_000_00);
    expect(totals.collected.toCentavos()).toBe(
      sum((row) => row.collected.toCentavos()),
    );
    expect(totals.teacherPay.toCentavos()).toBe(
      sum((row) => row.teacherPay.toCentavos()),
    );
    expect(totals.materialsCost.toCentavos()).toBe(
      sum((row) => row.materialsCost.toCentavos()),
    );
    expect(totals.profit.toCentavos()).toBe(
      sum((row) => row.profit.toCentavos()),
    );
    expect(totals.profit.toCentavos()).toBe(
      totals.collected.toCentavos() -
        totals.teacherPay.toCentavos() -
        totals.materialsCost.toCentavos(),
    );
    for (const row of activities)
      expect(row.profit.toCentavos()).toBe(
        row.collected.toCentavos() -
          row.teacherPay.toCentavos() -
          row.materialsCost.toCentavos(),
      );
    expect(totals).toMatchObject({
      enrolled: 9,
      capacity: 23,
      occupancyPercent: 39,
    });
  });

  it("settles only third-party teachers, one row per teacher", async () => {
    const { service } = earningsFixture();

    const result = await service.earnings(actor, { period: "2026-10" });

    if (!result.ok) throw new Error("expected earnings");
    expect(
      result.value.teachers.map((row) => ({
        name: row.teacherName,
        activities: row.activities,
        toSettle: row.toSettle?.toCentavos() ?? null,
      })),
    ).toEqual([
      { name: "Ana", activities: ["Ceramica"], toSettle: 12_000_00 },
      { name: "Bea", activities: ["Acuarela"], toSettle: null },
      { name: "Cleo", activities: ["Torno"], toSettle: 15_000_00 },
    ]);
  });

  it("groups the materials charged by supplier at cost and splits new from returning students", async () => {
    const { service } = earningsFixture();

    const result = await service.earnings(actor, { period: "2026-10" });

    if (!result.ok) throw new Error("expected earnings");
    expect(result.value.materialsAtCost).toBe(true);
    expect(
      result.value.suppliers.map((row) => ({
        name: row.supplierName,
        orders: row.orders,
        units: row.units,
        charged: row.charged.toCentavos(),
        cost: row.cost.toCentavos(),
      })),
    ).toEqual([
      {
        name: "Arcilla SA",
        orders: 3,
        units: 4,
        charged: 6_000_00,
        cost: 6_000_00,
      },
    ]);
    expect(result.value.students).toEqual({
      students: 10,
      recurring: 4,
      percent: 40,
    });
  });

  it("is empty for a month without activity", async () => {
    const { service } = insightsFixture();

    const result = await service.earnings(actor, { period: "2026-09" });

    if (!result.ok) throw new Error("expected earnings");
    expect(result.value.activities).toEqual([]);
    expect(result.value.totals.profit.toCentavos()).toBe(0);
    expect(result.value.totals.occupancyPercent).toBe(0);
  });

  it("gives the panel the current month's figures and what is due today", async () => {
    const { orders, intensiveRequests, service } = earningsFixture();
    orders.orderCounts = [
      count({ status: "materials_requested", orders: 2 }),
      count({ status: "materials_requested", workshopId: "w2", orders: 1 }),
      count({ status: "paid", orders: 5 }),
      count({ status: "materials_requested", period: "2026-09", orders: 4 }),
    ];
    intensiveRequests.pending = 2;

    const panel = await service.panel(actor);
    const earnings = await service.earnings(actor, {});

    if (!panel.ok || !earnings.ok) throw new Error("expected figures");
    expect(panel.value.month).toEqual(earnings.value.totals);
    expect(panel.value.today).toEqual({
      suppliersToOrder: ["Arcilla SA"],
      ordersToDeliver: 7,
      pendingIntensiveRequests: 2,
    });
  });
});
