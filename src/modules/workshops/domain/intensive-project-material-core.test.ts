import { describe, expect, it } from "vitest";
import {
  PROJECT_MATERIAL_QUANTITY,
  validateProjectMaterial,
  validateProjectMaterialQuantity,
} from "./intensive-project-material-core";

const VARIANT = "d0000000-0000-4000-8000-000000000001";

describe("validateProjectMaterialQuantity", () => {
  it.each([
    ["1", 1],
    [" 7 ", 7],
    ["20", 20],
    ["007", 7],
  ])("accepts %j as %i units per participant", (text, expected) => {
    expect(validateProjectMaterialQuantity(text)).toEqual({
      ok: true,
      value: expected,
    });
  });

  it.each([
    ["", "required"],
    ["   ", "required"],
    ["0", "out-of-range"],
    ["21", "out-of-range"],
    ["-1", "invalid-format"],
    ["1,5", "invalid-format"],
    ["2.5", "invalid-format"],
    ["dos", "invalid-format"],
    ["1e1", "invalid-format"],
  ])("refuses %j with %s", (text, code) => {
    expect(validateProjectMaterialQuantity(text)).toEqual({
      ok: false,
      error: { kind: "invalid", issues: [{ field: "quantity", code }] },
    });
  });

  it("states the whole-unit range the database also enforces", () => {
    expect(PROJECT_MATERIAL_QUANTITY).toEqual({ min: 1, max: 20 });
  });
});

describe("validateProjectMaterial", () => {
  it("accepts a catalog variant id with a quantity", () => {
    expect(
      validateProjectMaterial({ variantId: ` ${VARIANT} `, quantity: "3" }),
    ).toEqual({ ok: true, value: { variantId: VARIANT, quantity: 3 } });
  });

  it("reports every failing field, the variant first", () => {
    expect(
      validateProjectMaterial({ variantId: "nope", quantity: "0" }),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [
          { field: "variantId", code: "unknown-reference" },
          { field: "quantity", code: "out-of-range" },
        ],
      },
    });
    expect(validateProjectMaterial({ variantId: "", quantity: "1" })).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "variantId", code: "required" }],
      },
    });
  });
});
