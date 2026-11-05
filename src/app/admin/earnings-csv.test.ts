import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type { ActivityEarnings, EarningsView } from "~/modules/insights";
import { earningsCsv } from "./earnings-csv";

const pesos = (amount: number) => {
  const money = Money.fromCentavos(Math.round(amount * 100));
  if (!money.ok) throw new Error("bad amount");
  return money.value;
};

const activity = (overrides: Partial<ActivityEarnings>): ActivityEarnings => ({
  kind: "taller",
  id: "w1",
  name: "Cerámica",
  enrolled: 4,
  capacity: 10,
  collected: pesos(1_234_567),
  teacherName: "Ana",
  teacherModality: "third_party",
  teacherPay: pesos(370_000),
  materialsCost: pesos(0),
  profit: pesos(864_567),
  ...overrides,
});

function view(activities: readonly ActivityEarnings[]): EarningsView {
  const sum = (pick: (row: ActivityEarnings) => Money) =>
    pesos(
      activities.reduce((total, row) => total + pick(row).toCentavos(), 0) /
        100,
    );
  return {
    period: "2026-10",
    activities,
    totals: {
      enrolled: activities.reduce((total, row) => total + row.enrolled, 0),
      capacity: activities.reduce((total, row) => total + row.capacity, 0),
      occupancyPercent: 40,
      collected: sum((row) => row.collected),
      teacherPay: sum((row) => row.teacherPay),
      materialsCost: sum((row) => row.materialsCost),
      profit: sum((row) => row.profit),
    },
    students: { students: 0, recurring: 0, percent: 0 },
    teachers: [],
    suppliers: [],
    materialsAtCost: true,
  };
}

describe("earningsCsv", () => {
  it("starts with a byte order mark so Excel reads the accents as UTF-8", () => {
    expect(earningsCsv(view([activity({})])).startsWith("﻿")).toBe(true);
  });

  it("separates with semicolons, ends lines with CRLF and writes numbers without thousands separators", () => {
    const lines = earningsCsv(view([activity({})]))
      .replace("﻿", "")
      .split("\r\n");

    expect(lines).toEqual([
      "Taller o workshop;Inscriptas;Lugares;Cobrado;Profesora;A pagar a la profesora;Materiales;Ganancia",
      "Cerámica;4;10;1234567;Ana (de terceros);370000;0;864567",
      "Total;4;10;1234567;;370000;0;864567",
      "",
    ]);
  });

  it("writes cents with a decimal comma", () => {
    const csv = earningsCsv(view([activity({ collected: pesos(10.5) })]));

    expect(csv).toContain(";10,50;");
  });

  it("quotes names with a semicolon and a quote, and marks the intensivo", () => {
    const csv = earningsCsv(
      view([activity({ name: 'Torno; "nivel 2"', kind: "intensivo" })]),
    );

    expect(csv).toContain('"Torno; ""nivel 2"" (Workshop)"');
  });

  it("defuses a name that Excel would run as a formula", () => {
    expect(earningsCsv(view([activity({ name: "=SUMA(A1)" })]))).toContain(
      "'=SUMA(A1);",
    );
  });

  it("has only the header and a zeroed totals row for an empty month", () => {
    expect(earningsCsv(view([])).replace("﻿", "").split("\r\n")[1]).toBe(
      "Total;0;0;0;;0;0;0",
    );
  });
});
