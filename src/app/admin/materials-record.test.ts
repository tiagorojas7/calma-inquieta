import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type { DeliveryOrder } from "~/modules/enrollments";
import { materialsRecordCsv, toMaterialsRecord } from "./materials-record";

function pesos(value: number): Money {
  const money = Money.fromCentavos(value * 100);
  if (!money.ok) throw new Error("invalid test money");
  return money.value;
}

const order = (overrides: Partial<DeliveryOrder>): DeliveryOrder => ({
  id: "o1",
  number: "CI-2026-0001",
  status: "paid",
  studentName: "Ana Pérez",
  phoneDigits: "5493515550001",
  workshopName: "Cerámica",
  turnoLabel: "Lunes 18:00",
  lines: [],
  ...overrides,
});

const line = (
  materialName: string,
  quantity: number,
  price: number,
  supplierName = "Papelería Sur",
) => ({
  materialName,
  variantLabel: "Grande",
  quantity,
  supplierName,
  unitPrice: pesos(price),
});

const orders: readonly DeliveryOrder[] = [
  order({
    id: "o1",
    studentName: "Bea Gómez",
    status: "materials_requested",
    lines: [
      line("Esmalte", 1, 4_000),
      line("Lámina", 2, 1_500, "Casa de Arte"),
    ],
  }),
  order({
    id: "o2",
    studentName: "Ana Pérez",
    status: "paid",
    lines: [line("Arcilla", 2, 12_500)],
  }),
  order({
    id: "o3",
    studentName: "Cata Ruiz",
    status: "materials_received",
    workshopName: "Telar",
    turnoLabel: "Martes 10:00",
    lines: [line("Arcilla", 1, 12_500)],
  }),
];

describe("toMaterialsRecord", () => {
  it("lists every material line with its student, supplier, amount and state, grouped by supplier", () => {
    expect(toMaterialsRecord(orders).map((row) => row.cells)).toEqual([
      [
        "Bea Gómez",
        "Cerámica · Lunes 18:00",
        "Lámina Grande",
        "2",
        "Casa de Arte",
        "$ 3.000",
        "Pedido",
      ],
      [
        "Ana Pérez",
        "Cerámica · Lunes 18:00",
        "Arcilla Grande",
        "2",
        "Papelería Sur",
        "$ 25.000",
        "Por pedir",
      ],
      [
        "Bea Gómez",
        "Cerámica · Lunes 18:00",
        "Esmalte Grande",
        "1",
        "Papelería Sur",
        "$ 4.000",
        "Pedido",
      ],
      [
        "Cata Ruiz",
        "Telar · Martes 10:00",
        "Arcilla Grande",
        "1",
        "Papelería Sur",
        "$ 12.500",
        "Recibido",
      ],
      ["Total", "", "", "6", "", "$ 44.500", ""],
    ]);
    expect(toMaterialsRecord(orders).at(-1)?.total).toBe(true);
  });

  it("stays empty when nothing was ordered", () => {
    expect(toMaterialsRecord([])).toEqual([]);
  });
});

describe("materialsRecordCsv", () => {
  it("writes the same rows as a CSV Excel opens", () => {
    const csv = materialsRecordCsv(orders);
    expect(csv.startsWith("﻿")).toBe(true);
    const rows = csv.slice(1).trimEnd().split("\r\n");
    expect(rows[0]).toBe(
      "Alumna;Taller y turno;Material;Cantidad;Proveedor;Monto;Estado",
    );
    expect(rows[1]).toBe(
      "Bea Gómez;Cerámica · Lunes 18:00;Lámina Grande;2;Casa de Arte;3000;Pedido",
    );
    expect(rows.at(-1)).toBe("Total;;;6;;44500;");
    expect(rows).toHaveLength(6);
  });
});
