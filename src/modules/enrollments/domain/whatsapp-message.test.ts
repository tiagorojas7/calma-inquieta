import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import {
  WHATSAPP_MESSAGE_CAP,
  buildOrderWhatsAppText,
  formatPesos,
  type OrderMessageInput,
} from "./whatsapp-message";

const pesos = (n: number): Money => {
  const result = Money.fromCentavos(n * 100);
  if (!result.ok) throw new Error("fixture");
  return result.value;
};

const base: OrderMessageInput = {
  orderNumber: "CI-2026-0007",
  studentName: "Ana Pérez",
  workshopName: "Cerámica inicial",
  periodKey: "2026-10",
  turnoLabel: "Martes 18:00 a 20:00",
  lines: [
    { materialName: "Arcilla", variantLabel: "Grande", quantity: 2 },
    { materialName: "Esmalte", variantLabel: "Chico", quantity: 1 },
  ],
  total: pesos(58000),
};

describe("formatPesos", () => {
  it.each([
    [0, "$ 0"],
    [4000, "$ 4.000"],
    [58000, "$ 58.000"],
    [1234567, "$ 1.234.567"],
  ])("formats %i", (amount, expected) => {
    expect(formatPesos(pesos(amount))).toBe(expected);
  });
});

describe("buildOrderWhatsAppText", () => {
  it("matches the golden message", () => {
    expect(buildOrderWhatsAppText(base)).toBe(
      [
        "Hola! Quiero confirmar mi inscripción",
        "Pedido: CI-2026-0007",
        "Nombre: Ana Pérez",
        "Taller: Cerámica inicial",
        "Mes: octubre 2026",
        "Turno: Martes 18:00 a 20:00",
        "Materiales:",
        "- Arcilla Grande x2",
        "- Esmalte Chico x1",
        "Total: $ 58.000",
      ].join("\n"),
    );
  });

  it("omits the materials block for an order without lines", () => {
    const text = buildOrderWhatsAppText({ ...base, lines: [] });
    expect(text).not.toContain("Materiales");
    expect(text.endsWith("Total: $ 58.000")).toBe(true);
  });

  it("names every month in Spanish", () => {
    const months = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    months.forEach((name, index) => {
      const key = `2027-${String(index + 1).padStart(2, "0")}`;
      expect(buildOrderWhatsAppText({ ...base, periodKey: key })).toContain(
        `Mes: ${name} 2027`,
      );
    });
  });

  it("falls back to the raw key for a malformed period key", () => {
    expect(buildOrderWhatsAppText({ ...base, periodKey: "2027-13" })).toContain(
      "Mes: 2027-13",
    );
  });

  it("keeps thirty lines under the cap when they fit", () => {
    const lines = Array.from({ length: 30 }, (_, i) => ({
      materialName: "Pincel",
      variantLabel: `N${String(i)}`,
      quantity: 1,
    }));
    const text = buildOrderWhatsAppText({ ...base, lines });
    expect(text.length).toBeLessThanOrEqual(WHATSAPP_MESSAGE_CAP);
    expect(text).toContain("- Pincel N29 x1");
    expect(text).not.toContain("más (ver pedido)");
  });

  it("drops lines from the end above 1.200 characters and keeps number and total", () => {
    const lines = Array.from({ length: 30 }, (_, i) => ({
      materialName: "Pincel de pelo de marta número uno",
      variantLabel: `Medida ${String(i)} extra larga`,
      quantity: 3,
    }));
    const text = buildOrderWhatsAppText({ ...base, lines });
    expect(WHATSAPP_MESSAGE_CAP).toBe(1200);
    expect(text.length).toBeLessThanOrEqual(1200);
    expect(text).toContain("Pedido: CI-2026-0007");
    expect(text.endsWith("Total: $ 58.000")).toBe(true);
    expect(text).toContain(
      "- Pincel de pelo de marta número uno Medida 0 extra larga x3",
    );
    expect(text).not.toContain("Medida 29 extra larga");
    const dropped = /y (\d+) más \(ver pedido\)/.exec(text);
    const kept = text.split("\n").filter((l) => l.startsWith("- ")).length;
    expect(dropped).not.toBeNull();
    expect(kept + Number(dropped?.[1])).toBe(30);
    expect(kept).toBeGreaterThan(0);
  });

  it("falls back to a minimal message when even the header exceeds the cap", () => {
    const text = buildOrderWhatsAppText({
      ...base,
      studentName: "N".repeat(600),
      workshopName: "T".repeat(600),
    });
    expect(text.length).toBeLessThanOrEqual(WHATSAPP_MESSAGE_CAP);
    expect(text).toContain("CI-2026-0007");
    expect(text.endsWith("Total: $ 58.000")).toBe(true);
  });
});
