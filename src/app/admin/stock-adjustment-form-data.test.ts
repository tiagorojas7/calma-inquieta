import { describe, expect, it } from "vitest";
import {
  parseStockAdjustmentDraft,
  stockAdjustmentErrors,
} from "./stock-adjustment-form-data";

function formOf(entries: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) form.set(key, value);
  return form;
}

describe("parseStockAdjustmentDraft", () => {
  it("reads the variant, the signed delta and the reason without altering them", () => {
    expect(
      parseStockAdjustmentDraft(
        formOf({ variantId: "v1", delta: " +5 ", reason: " Compra " }),
      ),
    ).toEqual({ variantId: "v1", delta: " +5 ", reason: " Compra " });
  });

  it("turns absent fields into empty text", () => {
    expect(parseStockAdjustmentDraft(new FormData())).toEqual({
      variantId: "",
      delta: "",
      reason: "",
    });
  });
});

describe("stockAdjustmentErrors", () => {
  it("words each issue on its own field", () => {
    expect(
      stockAdjustmentErrors({
        kind: "invalid",
        issues: [
          { field: "delta", code: "invalid-format" },
          { field: "reason", code: "required" },
        ],
      }),
    ).toEqual({
      delta: "Ingresá un número entero, por ejemplo 5 o -1.",
      reason: "Completá este campo.",
    });
    expect(
      stockAdjustmentErrors({
        kind: "invalid",
        issues: [{ field: "delta", code: "out-of-range" }],
      }),
    ).toEqual({ delta: "Ingresá una cantidad distinta de cero." });
  });

  it("explains how many units are on hand when a subtraction is too large", () => {
    expect(
      stockAdjustmentErrors({ kind: "insufficient-stock", onHand: 2 }),
    ).toEqual({ delta: "No podés restar más de lo que hay: en stock hay 2." });
    expect(
      stockAdjustmentErrors({ kind: "insufficient-stock", onHand: 0 }),
    ).toEqual({ delta: "No hay unidades en stock para restar." });
  });
});
