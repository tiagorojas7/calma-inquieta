import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type {
  PanelView,
  SettlementsView,
  StatisticsView,
} from "~/modules/insights";
import {
  toPanelSummary,
  toStatisticsScreen,
  toTeacherSettlement,
  toTeacherSettlementRows,
} from "./insights-view";

const pesos = (amount: number) => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("bad amount");
  return money.value;
};

describe("toPanelSummary", () => {
  it("labels the months and formats the income as pesos", () => {
    const view: PanelView = {
      period: "2026-10",
      nextPeriod: "2026-11",
      occupancy: { capacity: 10, confirmed: 4, free: 6, percent: 40 },
      pending: { total: 5, older: 2 },
      confirmedThisMonth: 3,
      income: {
        orders: 3,
        fee: pesos(25_000),
        materials: pesos(3_000),
        total: pesos(28_000),
      },
      materialsToOrder: { orders: 3, units: 6 },
      alerts: {
        pendingOverdue: 2,
        withoutOpenPeriod: [{ workshopId: "w2", name: "Acuarela" }],
        materialsNotRequested: { orders: 3, units: 6 },
      },
    };

    expect(toPanelSummary(view)).toEqual({
      period: "2026-10",
      monthLabel: "octubre 2026",
      nextMonthLabel: "noviembre 2026",
      occupancy: { capacity: 10, confirmed: 4, free: 6, percent: 40 },
      pending: { total: 5, older: 2 },
      confirmedThisMonth: 3,
      income: {
        total: `$ 28.000`,
        fee: `$ 25.000`,
        materials: `$ 3.000`,
      },
      materialsToOrder: { orders: 3, units: 6 },
      alerts: {
        withoutOpenPeriod: [{ workshopId: "w2", name: "Acuarela" }],
      },
    });
  });
});

describe("toStatisticsScreen", () => {
  const view: StatisticsView = {
    period: "2026-10",
    occupancy: {
      rows: [
        {
          workshopId: "w1",
          workshopName: "Ceramica",
          turnoId: "t1",
          turnoLabel: "Martes",
          capacity: 6,
          confirmed: 3,
          free: 3,
          percent: 50,
        },
      ],
      totals: { capacity: 6, confirmed: 3, free: 3, percent: 50 },
    },
    conversion: {
      rows: [
        {
          workshopId: "w1",
          workshopName: "Ceramica",
          received: 8,
          pending: 2,
          confirmed: 2,
          cancelled: 4,
          percent: 25,
        },
      ],
      totals: {
        received: 8,
        pending: 2,
        confirmed: 2,
        cancelled: 4,
        percent: 25,
      },
    },
    income: {
      rows: [
        {
          workshopId: "w1",
          workshopName: "Ceramica",
          orders: 2,
          fee: pesos(20_000),
          materials: pesos(3_000),
          total: pesos(23_000),
        },
      ],
      totals: {
        orders: 2,
        fee: pesos(20_000),
        materials: pesos(3_000),
        total: pesos(23_000),
      },
    },
    students: { students: 8, recurring: 2, percent: 25 },
    materials: [
      {
        status: "paid",
        workshopId: "w1",
        workshopName: "Ceramica",
        materialName: "Taza",
        supplierName: "Arcilla SA",
        orders: 1,
        units: 2,
        amount: pesos(4_000),
      },
    ],
  };

  it("formats every table as text and closes the ones with totals", () => {
    const screen = toStatisticsScreen(view);

    expect(screen.periodLabel).toBe("octubre 2026");
    expect(screen.occupancy.map((row) => row.cells)).toEqual([
      ["Ceramica", "Martes", "6", "3", "3", "50 %"],
      ["Total", "", "6", "3", "3", "50 %"],
    ]);
    expect(screen.occupancy[1]?.total).toBe(true);
    expect(screen.conversion[1]?.cells).toEqual([
      "Total",
      "8",
      "2",
      "2",
      "4",
      "25 %",
    ]);
    expect(screen.income[0]?.cells).toEqual([
      "Ceramica",
      "2",
      `$ 20.000`,
      `$ 3.000`,
      `$ 23.000`,
    ]);
    expect(screen.students).toEqual(["8", "2", "25 %"]);
    expect(screen.materials[0]?.cells).toEqual([
      "Cobrado",
      "Ceramica",
      "Taza",
      "Arcilla SA",
      "1",
      "2",
      `$ 4.000`,
    ]);
  });

  it("shows no totals row for an empty table", () => {
    const empty = toStatisticsScreen({
      ...view,
      occupancy: { rows: [], totals: view.occupancy.totals },
      conversion: { rows: [], totals: view.conversion.totals },
      income: { rows: [], totals: view.income.totals },
      materials: [],
    });

    expect(empty.occupancy).toEqual([]);
    expect(empty.conversion).toEqual([]);
    expect(empty.income).toEqual([]);
  });
});

const settlements: SettlementsView = {
  period: "2026-10",
  rows: [
    {
      teacherId: "t1",
      teacherName: "Ana Gómez",
      modality: "third_party",
      percentagesBp: [3_050],
      activities: ["Cerámica", "Torno"],
      orders: 3,
      students: 2,
      fee: pesos(30_000),
      estimate: pesos(9_150),
    },
    {
      teacherId: "t2",
      teacherName: "Lola Paz",
      modality: "own",
      percentagesBp: [],
      activities: ["Acuarela"],
      orders: 1,
      students: 1,
      fee: pesos(10_000),
      estimate: null,
    },
  ],
  totals: { fee: pesos(40_000), estimate: pesos(9_150) },
};

describe("toTeacherSettlementRows", () => {
  it("formats modality, percentage, income and estimate, with a totals row", () => {
    expect(toTeacherSettlementRows(settlements)).toEqual([
      {
        key: "t1",
        cells: [
          "Ana Gómez",
          "De terceros",
          "30,5 %",
          "2",
          "$ 30.000",
          "$ 9.150",
        ],
      },
      {
        key: "t2",
        cells: [
          "Lola Paz",
          "Propia",
          "Sin porcentaje",
          "1",
          "$ 10.000",
          "Sin porcentaje",
        ],
      },
      {
        key: "total",
        cells: ["Total", "", "", "", "$ 40.000", "$ 9.150"],
        total: true,
      },
    ]);
  });

  it("stays empty when no teacher has a period in the month", () => {
    expect(
      toTeacherSettlementRows({
        ...settlements,
        rows: [],
      }),
    ).toEqual([]);
  });

  it("lists every percentage when the agreement changed inside the month", () => {
    const [first] = toTeacherSettlementRows({
      ...settlements,
      rows: settlements.rows
        .slice(0, 1)
        .map((row) => ({ ...row, percentagesBp: [2_000, 4_000] })),
    });
    expect(first?.cells[2]).toBe("20 %, 40 %");
  });
});

describe("toTeacherSettlement", () => {
  it("picks the teacher's figures for the month", () => {
    expect(toTeacherSettlement(settlements, "t1")).toEqual({
      period: "2026-10",
      periodLabel: "octubre 2026",
      responsible: true,
      modality: "De terceros",
      percentage: "30,5 %",
      activities: "Cerámica, Torno",
      students: "2",
      income: "$ 30.000",
      estimate: "$ 9.150",
    });
  });

  it("marks an own teacher without an estimate", () => {
    expect(toTeacherSettlement(settlements, "t2")).toMatchObject({
      modality: "Propia",
      percentage: "Sin porcentaje",
      estimate: null,
    });
  });

  it("says she is not responsible for anything that month", () => {
    expect(toTeacherSettlement(settlements, "nobody")).toEqual({
      period: "2026-10",
      periodLabel: "octubre 2026",
      responsible: false,
    });
  });
});
