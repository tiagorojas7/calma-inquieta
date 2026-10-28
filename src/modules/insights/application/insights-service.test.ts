import { describe, expect, it } from "vitest";
import type {
  IncomeRow,
  MaterialRow,
  OrderCountRow,
} from "~/modules/enrollments";
import type { PeriodCapacityRow } from "~/modules/workshops";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import {
  InMemoryEnrollmentInsightsReader,
  InMemoryWorkshopInsightsReader,
} from "~/testing/fakes/in-memory-insights-readers";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import {
  createInsightsService,
  createUnavailableInsightsService,
} from "./insights-service";

// 2026-10-31 12:30 in Cordoba: the current period is 2026-10.
const NOW = new Date("2026-10-31T15:30:00.000Z");
const actor = testAdminActor();

function fixture() {
  const orders = new InMemoryEnrollmentInsightsReader();
  const workshops = new InMemoryWorkshopInsightsReader();
  const service = createInsightsService({
    orders,
    workshops,
    clock: fixedClock(NOW),
  });
  return { orders, workshops, service };
}

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

describe("insights panel", () => {
  it("denies a missing actor before reading anything", async () => {
    const { orders, service } = fixture();

    await expect(service.panel(null)).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    expect(orders.pendingCalls).toEqual([]);
  });

  it("totals the seats of the current month and derives free seats and occupancy", async () => {
    const { orders, workshops, service } = fixture();
    workshops.capacityRows = [
      capacity({}),
      capacity({ turnoId: "t2", turnoLabel: "Jueves", capacity: 4 }),
      capacity({ period: "2026-11", periodId: "p2", capacity: 99 }),
    ];
    orders.seats = [
      { periodId: "p1", turnoId: "t1", confirmedSeats: 3 },
      { periodId: "p1", turnoId: "t2", confirmedSeats: 1 },
    ];

    const result = await service.panel(actor);

    expect(result).toMatchObject({
      ok: true,
      value: {
        period: "2026-10",
        occupancy: { capacity: 10, confirmed: 4, free: 6, percent: 40 },
      },
    });
  });

  it("counts pending requests and those older than 48 hours", async () => {
    const { orders, service } = fixture();
    orders.pending = { total: 5, older: 2 };

    const result = await service.panel(actor);

    expect(orders.pendingCalls).toEqual([new Date("2026-10-29T15:30:00.000Z")]);
    expect(result).toMatchObject({
      value: { pending: { total: 5, older: 2 } },
    });
  });

  it("reads the income registered this month by payment date", async () => {
    const { orders, service } = fixture();
    orders.incomeRows = [
      income({
        orders: 2,
        feeCentavos: 20_000_00,
        materialsCentavos: 3_000_00,
      }),
      income({ workshopId: "w2", orders: 1, feeCentavos: 5_000_00 }),
    ];

    const result = await service.panel(actor);

    expect(orders.incomeCalls).toContainEqual({
      paidFrom: new Date("2026-10-01T03:00:00.000Z"),
      paidTo: new Date("2026-11-01T03:00:00.000Z"),
    });
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value.confirmedThisMonth).toBe(3);
    expect(result.value.income.fee.toCentavos()).toBe(25_000_00);
    expect(result.value.income.materials.toCentavos()).toBe(3_000_00);
    expect(result.value.income.total.toCentavos()).toBe(28_000_00);
  });

  it("flags the materials of paid orders as still to order, across every period", async () => {
    const { orders, service } = fixture();
    orders.materialRows = [
      material({ orders: 2, units: 5 }),
      material({ period: "2026-09", orders: 1, units: 1 }),
      material({ status: "materials_requested", orders: 7, units: 70 }),
    ];

    const result = await service.panel(actor);

    expect(result).toMatchObject({
      value: {
        materialsToOrder: { orders: 3, units: 6 },
        alerts: { materialsNotRequested: { orders: 3, units: 6 } },
      },
    });
  });

  it("alerts the published workshops without an open period next month", async () => {
    const { workshops, service } = fixture();
    workshops.published = [
      { workshopId: "w1", name: "Ceramica", periodStatus: "open" },
      { workshopId: "w2", name: "Acuarela", periodStatus: null },
      { workshopId: "w3", name: "Telar", periodStatus: "draft" },
      { workshopId: "w4", name: "Grabado", periodStatus: "closed" },
    ];

    const result = await service.panel(actor);

    expect(workshops.publishedCalls).toEqual(["2026-11"]);
    expect(result).toMatchObject({
      value: {
        nextPeriod: "2026-11",
        alerts: {
          withoutOpenPeriod: [
            { workshopId: "w2", name: "Acuarela" },
            { workshopId: "w3", name: "Telar" },
            { workshopId: "w4", name: "Grabado" },
          ],
        },
      },
    });
  });
});

describe("insights statistics", () => {
  it("denies a missing actor", async () => {
    const { service } = fixture();

    await expect(service.statistics(null, {})).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
  });

  it("rejects a period that is not a month", async () => {
    const { service } = fixture();

    await expect(
      service.statistics(actor, { period: "2026-13" }),
    ).resolves.toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "period", code: "invalid-format" }],
      },
    });
  });

  it("defaults to the current Cordoba month", async () => {
    const { service } = fixture();

    const result = await service.statistics(actor, {});

    expect(result).toMatchObject({ ok: true, value: { period: "2026-10" } });
  });

  it("lists occupancy per workshop and turno with a total", async () => {
    const { orders, workshops, service } = fixture();
    workshops.capacityRows = [
      capacity({}),
      capacity({ turnoId: "t2", turnoLabel: "Jueves", capacity: 4 }),
      capacity({
        workshopId: "w2",
        workshopName: "Acuarela",
        turnoId: "t3",
        periodId: "p3",
        capacity: 5,
      }),
    ];
    orders.seats = [
      { periodId: "p1", turnoId: "t1", confirmedSeats: 6 },
      { periodId: "p1", turnoId: "t2", confirmedSeats: 1 },
    ];

    const result = await service.statistics(actor, { period: "2026-10" });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value.occupancy.rows).toEqual([
      {
        workshopId: "w1",
        workshopName: "Ceramica",
        turnoId: "t1",
        turnoLabel: "Martes",
        capacity: 6,
        confirmed: 6,
        free: 0,
        percent: 100,
      },
      {
        workshopId: "w1",
        workshopName: "Ceramica",
        turnoId: "t2",
        turnoLabel: "Jueves",
        capacity: 4,
        confirmed: 1,
        free: 3,
        percent: 25,
      },
      {
        workshopId: "w2",
        workshopName: "Acuarela",
        turnoId: "t3",
        turnoLabel: "Martes",
        capacity: 5,
        confirmed: 0,
        free: 5,
        percent: 0,
      },
    ]);
    expect(result.value.occupancy.totals).toEqual({
      capacity: 15,
      confirmed: 7,
      free: 8,
      percent: 47,
    });
  });

  it("measures conversion per workshop from the requests received", async () => {
    const { orders, service } = fixture();
    orders.orderCounts = [
      count({ status: "pending_confirmation", orders: 2 }),
      count({ status: "paid", orders: 1 }),
      count({ status: "materials_received", orders: 1 }),
      count({ status: "cancelled", orders: 4 }),
      count({
        workshopId: "w2",
        workshopName: "Acuarela",
        status: "paid",
        orders: 3,
      }),
      count({ period: "2026-09", status: "paid", orders: 50 }),
    ];

    const result = await service.statistics(actor, { period: "2026-10" });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value.conversion.rows).toEqual([
      {
        workshopId: "w2",
        workshopName: "Acuarela",
        received: 3,
        pending: 0,
        confirmed: 3,
        cancelled: 0,
        percent: 100,
      },
      {
        workshopId: "w1",
        workshopName: "Ceramica",
        received: 8,
        pending: 2,
        confirmed: 2,
        cancelled: 4,
        percent: 25,
      },
    ]);
    expect(result.value.conversion.totals).toEqual({
      received: 11,
      pending: 2,
      confirmed: 5,
      cancelled: 4,
      percent: 45,
    });
  });

  it("separates registered income per workshop into fee and materials", async () => {
    const { orders, service } = fixture();
    orders.incomeRows = [
      income({
        orders: 2,
        feeCentavos: 20_000_00,
        materialsCentavos: 3_000_00,
      }),
      income({
        workshopId: "w2",
        workshopName: "Acuarela",
        feeCentavos: 5_000_00,
      }),
    ];

    const result = await service.statistics(actor, { period: "2026-10" });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(
      result.value.income.rows.map((row) => [
        row.workshopName,
        row.orders,
        row.fee.toCentavos(),
        row.materials.toCentavos(),
        row.total.toCentavos(),
      ]),
    ).toEqual([
      ["Acuarela", 1, 5_000_00, 0, 5_000_00],
      ["Ceramica", 2, 20_000_00, 3_000_00, 23_000_00],
    ]);
    expect(result.value.income.totals.total.toCentavos()).toBe(28_000_00);
    expect(result.value.income.totals.orders).toBe(3);
  });

  it("reports participants and the share who come back", async () => {
    const { orders, service } = fixture();
    orders.participationRow = { students: 8, recurring: 2 };

    const result = await service.statistics(actor, { period: "2026-10" });

    expect(orders.participationCalls).toEqual(["2026-10"]);
    expect(result).toMatchObject({
      value: { students: { students: 8, recurring: 2, percent: 25 } },
    });
  });

  it("lists material orders by status, workshop, project and supplier", async () => {
    const { orders, service } = fixture();
    orders.materialRows = [
      material({ status: "materials_requested", materialName: "Taza" }),
      material({ materialName: "Plato", supplierName: "Barro SRL" }),
      material({ period: "2026-09", materialName: "Otro mes" }),
    ];

    const result = await service.statistics(actor, { period: "2026-10" });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(
      result.value.materials.map((row) => [row.status, row.materialName]),
    ).toEqual([
      ["paid", "Plato"],
      ["materials_requested", "Taza"],
    ]);
    expect(result.value.materials[0]?.amount.toCentavos()).toBe(4_000_00);
  });
});

describe("unavailable insights service", () => {
  it("denies without an actor and fails closed for an admin", async () => {
    const service = createUnavailableInsightsService();

    await expect(service.panel(null)).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    await expect(service.statistics(actor, {})).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });
});
