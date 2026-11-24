import { describe, expect, it } from "vitest";
import {
  STOCK_DELTA_MAX,
  STOCK_REASON_MAX,
  validateStockAdjustment,
} from "./stock-core";

describe("validateStockAdjustment", () => {
  it.each([
    ["5", 5],
    ["+5", 5],
    [" -1 ", -1],
    ["007", 7],
  ])("reads %j as the signed whole number %i", (delta, expected) => {
    expect(validateStockAdjustment({ delta, reason: " Compra " })).toEqual({
      ok: true,
      value: { delta: expected, reason: "Compra" },
    });
  });

  it.each([
    ["", "required"],
    ["   ", "required"],
    ["0", "out-of-range"],
    ["-0", "out-of-range"],
    [String(STOCK_DELTA_MAX + 1), "out-of-range"],
    ["1.5", "invalid-format"],
    ["1,5", "invalid-format"],
    ["cinco", "invalid-format"],
    ["--1", "invalid-format"],
  ])("rejects the delta %j as %s", (delta, code) => {
    expect(validateStockAdjustment({ delta, reason: "Compra" })).toEqual({
      ok: false,
      error: [{ field: "delta", code }],
    });
  });

  it("requires a reason of bounded length", () => {
    expect(validateStockAdjustment({ delta: "1", reason: "  " })).toEqual({
      ok: false,
      error: [{ field: "reason", code: "required" }],
    });
    expect(
      validateStockAdjustment({
        delta: "1",
        reason: "x".repeat(STOCK_REASON_MAX + 1),
      }),
    ).toEqual({ ok: false, error: [{ field: "reason", code: "too-long" }] });
  });
});
