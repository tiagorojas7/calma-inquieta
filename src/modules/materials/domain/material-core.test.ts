import { describe, expect, it } from "vitest";
import {
  DEFAULT_VARIANT_LABEL,
  type MaterialDraft,
} from "../application/contracts";
import {
  materialNameKey,
  validateMaterialDraft,
  variantLabelKey,
} from "./material-core";

const draft = (overrides: Partial<MaterialDraft> = {}): MaterialDraft => ({
  name: " Bastidor ",
  description: " Madera natural ",
  category: " Bastidores ",
  supplierId: "supplier-1",
  available: true,
  image: null,
  variants: [
    {
      label: DEFAULT_VARIANT_LABEL,
      price: "12500",
      available: true,
      swatch: "",
    },
  ],
  ...overrides,
});

function valueOf(result: ReturnType<typeof validateMaterialDraft>) {
  if (!result.ok) throw new Error("expected valid material draft");
  return result.value;
}

describe("material core", () => {
  it("normalizes material and variant text, whole-peso prices, swatches, and positions", () => {
    const value = valueOf(
      validateMaterialDraft(
        draft({
          name: "  Arcilla A\u0301mbar  ",
          description: "  Descripción  ",
          category: "  Arcillas  ",
          variants: [
            {
              id: "variant-a",
              label: "  Rojo  ",
              price: "3000",
              available: true,
              swatch: " #FF00AA ",
            },
            {
              label: " Natural ",
              price: "5000",
              available: false,
              swatch: "   ",
            },
          ],
        }),
      ),
    );

    expect(value).toMatchObject({
      name: "Arcilla Ámbar",
      description: "Descripción",
      category: "Arcillas",
      supplierId: "supplier-1",
      available: true,
      image: null,
      variants: [
        {
          id: "variant-a",
          label: "Rojo",
          available: true,
          position: 0,
          swatch: "#ff00aa",
        },
        {
          label: "Natural",
          available: false,
          position: 1,
          swatch: null,
        },
      ],
    });
    expect(value.variants.map((variant) => variant.price.toCentavos())).toEqual(
      [300_000, 500_000],
    );
  });

  it("aggregates required material fields and the at-least-one-variant rule", () => {
    expect(
      validateMaterialDraft(
        draft({
          name: " ",
          description: "",
          category: "\t",
          supplierId: "",
          variants: [],
        }),
      ),
    ).toEqual({
      ok: false,
      error: [
        { field: "name", code: "required" },
        { field: "description", code: "required" },
        { field: "category", code: "required" },
        { field: "supplierId", code: "required" },
        { field: "variants", code: "required" },
      ],
    });
  });

  it.each([
    ["", "required"],
    ["0", "out-of-range"],
    ["-1", "invalid-format"],
    ["10.5", "invalid-format"],
    ["9007199254740992", "out-of-range"],
  ])("rejects variant price %j as %s", (price, code) => {
    const variant = draft().variants[0];
    if (!variant) throw new Error("expected draft variant");
    expect(
      validateMaterialDraft(draft({ variants: [{ ...variant, price }] })),
    ).toEqual({
      ok: false,
      error: [{ field: "variants", code }],
    });
  });

  it("aggregates blank labels, duplicate normalized labels, and invalid swatches", () => {
    expect(
      validateMaterialDraft(
        draft({
          variants: [
            { label: " ", price: "100", available: true, swatch: "#xyz" },
            {
              label: "A\u0301mbar",
              price: "200",
              available: true,
              swatch: "#AABBCC",
            },
            {
              label: "ámbar",
              price: "300",
              available: true,
              swatch: "blue",
            },
          ],
        }),
      ),
    ).toEqual({
      ok: false,
      error: [
        { field: "variants", code: "required" },
        { field: "variants", code: "invalid-format" },
        { field: "variants", code: "duplicate" },
        { field: "variants", code: "invalid-format" },
      ],
    });
  });

  it("accepts one explicit default variant for a material without options", () => {
    const value = valueOf(validateMaterialDraft(draft()));
    expect(value.variants).toHaveLength(1);
    expect(value.variants[0]).toMatchObject({
      label: DEFAULT_VARIANT_LABEL,
      position: 0,
      swatch: null,
    });
  });

  it("builds deterministic NFC Spanish case keys", () => {
    expect(materialNameKey("  ÑANDÚ ")).toBe("ñandú");
    expect(variantLabelKey(" A\u0301MBAR ")).toBe("ámbar");
  });
});
