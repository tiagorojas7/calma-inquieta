import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type {
  EarningsView,
  PanelView,
  SettlementsView,
} from "~/modules/insights";
import {
  toPanelSummary,
  toStatisticsScreen,
  toTeacherSettlement,
} from "./insights-view";

const pesos = (amount: number) => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("bad amount");
  return money.value;
};

const month = {
  enrolled: 9,
  capacity: 23,
  occupancyPercent: 39,
  collected: pesos(96_000),
  teacherPay: pesos(27_000),
  materialsCost: pesos(6_000),
  profit: pesos(63_000),
};

const panel: PanelView = {
  period: "2026-10",
  nextPeriod: "2026-11",
  occupancy: { capacity: 10, confirmed: 4, free: 6, percent: 40 },
  pending: { total: 3, older: 1 },
  confirmedThisMonth: 3,
  income: {
    orders: 3,
    fee: pesos(25_000),
    materials: pesos(3_000),
    total: pesos(28_000),
  },
  materialsToOrder: { orders: 3, units: 6 },
  month,
  today: {
    suppliersToOrder: ["Arcilla SA", "Pinceles SRL"],
    ordersToDeliver: 2,
    pendingIntensiveRequests: 1,
  },
  alerts: {
    pendingOverdue: 1,
    withoutOpenPeriod: [{ workshopId: "w2", name: "Acuarela" }],
    materialsNotRequested: { orders: 3, units: 6 },
  },
};

describe("toPanelSummary", () => {
  it("lists what is due today in order, each with its one button", () => {
    const summary = toPanelSummary(panel, { privateEventsUnanswered: 2 });

    expect(
      summary.tasks.map(({ text, action, href }) => ({ text, action, href })),
    ).toEqual([
      {
        text: "3 inscripciones por cobrar",
        action: "Cobrar",
        href: "/admin/inscripciones?estado=pending_confirmation",
      },
      {
        text: "Pedir materiales a Arcilla SA y Pinceles SRL",
        action: "Ver pedido",
        href: "/admin/inscripciones/materiales",
      },
      {
        text: "Hay 2 pedidos para entregar",
        action: "Entregar",
        href: "/admin/inscripciones/materiales?seccion=entregar",
      },
      {
        text: "Abrir inscripciones de noviembre 2026 en Acuarela",
        action: "Abrir noviembre 2026",
        href: "/admin/talleres",
      },
      {
        text: "1 reserva de workshop esperando seña",
        action: "Ver reservas",
        href: "/admin/intensivos",
      },
      {
        text: "2 consultas de evento privado sin responder",
        action: "Responder",
        href: "/admin/eventos",
      },
    ]);
  });

  it("lists an open month without an active turno with a link to its taller", () => {
    const summary = toPanelSummary(panel, {
      privateEventsUnanswered: 0,
      emptyMonths: [
        {
          periodId: "p1",
          workshopId: "w9",
          workshopName: "Cerámica",
          month: "Noviembre",
        },
      ],
    });

    expect(
      summary.tasks
        .filter((task) => task.key === "empty-p1")
        .map(({ text, action, href }) => ({ text, action, href })),
    ).toEqual([
      {
        text: "Noviembre no tiene turnos activos en Cerámica: agregá uno",
        action: "Arreglar",
        href: "/admin/talleres/w9",
      },
    ]);
  });

  it("has no task when nothing is due", () => {
    const summary = toPanelSummary({
      ...panel,
      pending: { total: 0, older: 0 },
      today: {
        suppliersToOrder: [],
        ordersToDeliver: 0,
        pendingIntensiveRequests: 0,
      },
      alerts: { ...panel.alerts, withoutOpenPeriod: [] },
    });

    expect(summary.tasks).toEqual([]);
  });

  it("singularizes a single item", () => {
    const summary = toPanelSummary({
      ...panel,
      pending: { total: 1, older: 0 },
      today: { ...panel.today, ordersToDeliver: 1 },
    });

    expect(summary.tasks[0]?.text).toBe("1 inscripción por cobrar");
    expect(summary.tasks[2]?.text).toBe("Hay 1 pedido para entregar");
  });

  it("formats the four figures of the month as pesos and a percentage", () => {
    expect(toPanelSummary(panel).figures).toEqual({
      collected: "$ 96.000",
      profit: "$ 63.000",
      teachers: "$ 27.000",
      occupancy: "39 %",
      occupancyDetail: "9 de 23 lugares",
    });
  });
});

const earnings: EarningsView = {
  period: "2026-01",
  activities: [
    {
      kind: "taller",
      id: "w1",
      name: "Cerámica",
      enrolled: 4,
      capacity: 10,
      collected: pesos(46_000),
      teacherName: "Ana Gómez",
      teacherModality: "third_party",
      teacherPay: pesos(12_000),
      materialsCost: pesos(6_000),
      profit: pesos(28_000),
    },
    {
      kind: "taller",
      id: "w2",
      name: "Acuarela",
      enrolled: 2,
      capacity: 5,
      collected: pesos(20_000),
      teacherName: "Lola Paz",
      teacherModality: "own",
      teacherPay: pesos(0),
      materialsCost: pesos(0),
      profit: pesos(20_000),
    },
    {
      kind: "intensivo",
      id: "i1",
      name: "Torno",
      enrolled: 3,
      capacity: 8,
      collected: pesos(30_000),
      teacherName: null,
      teacherModality: null,
      teacherPay: pesos(0),
      materialsCost: pesos(0),
      profit: pesos(30_000),
    },
  ],
  totals: {
    enrolled: 9,
    capacity: 23,
    occupancyPercent: 39,
    collected: pesos(96_000),
    teacherPay: pesos(12_000),
    materialsCost: pesos(6_000),
    profit: pesos(78_000),
  },
  students: { students: 10, recurring: 4, percent: 40 },
  teachers: [
    {
      teacherId: "t1",
      teacherName: "Ana Gómez",
      modality: "third_party",
      activities: ["Cerámica"],
      toSettle: pesos(12_000),
    },
    {
      teacherId: "t2",
      teacherName: "Lola Paz",
      modality: "own",
      activities: ["Acuarela"],
      toSettle: null,
    },
  ],
  suppliers: [
    {
      supplierId: "s1",
      supplierName: "Arcilla SA",
      orders: 3,
      units: 4,
      charged: pesos(6_000),
      cost: pesos(6_000),
    },
  ],
  materialsAtCost: true,
};

describe("toStatisticsScreen", () => {
  it("names the month and links the previous and next ones, rolling over the year", () => {
    const screen = toStatisticsScreen(earnings);

    expect(screen.periodLabel).toBe("enero 2026");
    expect(screen.previousHref).toBe("/admin/estadisticas?mes=2025-12");
    expect(screen.nextHref).toBe("/admin/estadisticas?mes=2026-02");
    expect(screen.downloadHref).toBe(
      "/admin/estadisticas/planilla?mes=2026-01",
    );
  });

  it("shows the six figures with plain labels", () => {
    const { figures } = toStatisticsScreen(earnings);

    expect(figures.map(({ label, value }) => [label, value])).toEqual([
      ["Cobrado", "$ 96.000"],
      ["A pagar a profesoras", "$ 12.000"],
      ["Costo de materiales", "$ 6.000"],
      ["Ganancia del estudio", "$ 78.000"],
      ["Alumnas activas", "10"],
      ["Ocupación", "39 %"],
    ]);
    expect(figures.find((figure) => figure.highlight)?.label).toBe(
      "Ganancia del estudio",
    );
  });

  it("builds the main table with the teacher, her settlement and a bold totals row", () => {
    const { activities } = toStatisticsScreen(earnings);

    expect(activities.map((row) => row.cells)).toEqual([
      [
        "Cerámica",
        "4",
        "10",
        "$ 46.000",
        "Ana Gómez · de terceros",
        "$ 12.000",
        "$ 6.000",
        "$ 28.000",
      ],
      [
        "Acuarela",
        "2",
        "5",
        "$ 20.000",
        "Lola Paz · propia",
        "—",
        "$ 0",
        "$ 20.000",
      ],
      ["Torno (Workshop)", "3", "8", "$ 30.000", "", "—", "$ 0", "$ 30.000"],
      ["Total", "9", "23", "$ 96.000", "", "$ 12.000", "$ 6.000", "$ 78.000"],
    ]);
    expect(activities.at(-1)?.total).toBe(true);
  });

  it("shows own teachers as not settled and third-party ones with their amount", () => {
    const { teachers } = toStatisticsScreen(earnings);

    expect(teachers.map((row) => row.cells)).toEqual([
      ["Ana Gómez", "de terceros", "Cerámica", "$ 12.000"],
      ["Lola Paz", "propia", "Acuarela", "—"],
    ]);
  });

  it("says materials are charged at cost and totals the supplier table", () => {
    const screen = toStatisticsScreen(earnings);

    expect(screen.materialsNote).toBe(
      "Materiales: se cobran al costo, no suman ganancia.",
    );
    expect(screen.materials.map((row) => row.cells)).toEqual([
      ["Arcilla SA", "3", "4", "$ 6.000", "$ 6.000"],
      ["Total", "3", "4", "$ 6.000", "$ 6.000"],
    ]);
  });

  it("splits new from returning students", () => {
    expect(
      toStatisticsScreen(earnings).students.map((row) => row.cells),
    ).toEqual([
      ["Nuevas", "6"],
      ["Que ya venían de otro mes", "4"],
    ]);
  });

  it("keeps an empty month empty, with no totals row", () => {
    const screen = toStatisticsScreen({
      ...earnings,
      activities: [],
      teachers: [],
      suppliers: [],
    });

    expect(screen.activities).toEqual([]);
    expect(screen.teachers).toEqual([]);
    expect(screen.materials).toEqual([]);
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
