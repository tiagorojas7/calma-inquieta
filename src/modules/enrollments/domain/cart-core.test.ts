import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import {
  MAX_CART_LINES,
  MAX_LINE_QUANTITY,
  addToCart,
  buildCart,
  priceCart,
  type CartLine,
  type PricingLineInput,
} from "./cart-core";

const money = (centavos: number): Money => {
  const result = Money.fromCentavos(centavos);
  if (!result.ok) throw new Error("fixture");
  return result.value;
};
const pesos = (n: number): Money => money(n * 100);

const line = (variantId: string, quantity: number): CartLine => ({
  materialId: "m-1",
  variantId,
  quantity,
});

describe("addToCart", () => {
  it("adds a new line", () => {
    const result = addToCart([], line("grande", 1));
    expect(result).toEqual({ ok: true, value: [line("grande", 1)] });
  });

  it.each([1, 20])("accepts the quantity limit %i", (quantity) => {
    expect(addToCart([], line("grande", quantity)).ok).toBe(true);
  });

  it.each([0, -1, 2.5, 21, Number.NaN, Number.POSITIVE_INFINITY])(
    "refuses the quantity %s naming the line",
    (quantity) => {
      expect(addToCart([], line("grande", quantity))).toEqual({
        ok: false,
        error: { kind: "invalid-quantity", variantId: "grande" },
      });
    },
  );

  it("merges the same variant into one line", () => {
    const result = addToCart([line("grande", 2)], line("grande", 3));
    expect(result).toEqual({ ok: true, value: [line("grande", 5)] });
  });

  it("refuses a merge above 20 and leaves the cart as it was", () => {
    const cart = [line("grande", 18)];
    expect(addToCart(cart, line("grande", 3))).toEqual({
      ok: false,
      error: { kind: "invalid-quantity", variantId: "grande" },
    });
    expect(cart).toEqual([line("grande", 18)]);
  });

  it("keeps variants of one material as separate lines", () => {
    const result = addToCart([line("grande", 1)], line("chico", 1));
    expect(result).toEqual({
      ok: true,
      value: [line("grande", 1), line("chico", 1)],
    });
  });

  it("allows 30 lines and refuses the 31st", () => {
    const full: CartLine[] = Array.from({ length: MAX_CART_LINES }, (_, i) =>
      line(`v-${String(i)}`, 1),
    );
    expect(MAX_LINE_QUANTITY).toBe(20);
    expect(addToCart(full, line("extra", 1))).toEqual({
      ok: false,
      error: { kind: "too-many-lines" },
    });
    // merging into an existing line is not a new line
    expect(addToCart(full, line("v-0", 1)).ok).toBe(true);
  });
});

describe("buildCart", () => {
  it("merges a submitted payload and returns it in first-seen order", () => {
    const result = buildCart([
      line("grande", 2),
      line("chico", 1),
      line("grande", 3),
    ]);
    expect(result).toEqual({
      ok: true,
      value: [line("grande", 5), line("chico", 1)],
    });
  });

  it("is the empty cart for an empty payload", () => {
    expect(buildCart([])).toEqual({ ok: true, value: [] });
  });

  it("refuses the first invalid line", () => {
    expect(buildCart([line("grande", 1), line("chico", 0)])).toEqual({
      ok: false,
      error: { kind: "invalid-quantity", variantId: "chico" },
    });
  });

  it("refuses more than 30 distinct lines", () => {
    const payload = Array.from({ length: MAX_CART_LINES + 1 }, (_, i) =>
      line(`v-${String(i)}`, 1),
    );
    expect(buildCart(payload)).toEqual({
      ok: false,
      error: { kind: "too-many-lines" },
    });
  });
});

const priced = (
  variantId: string,
  quantity: number,
  unitPrice: Money,
): PricingLineInput => ({ materialId: "m-1", variantId, quantity, unitPrice });

describe("priceCart", () => {
  it("totals fee plus materials: 58.000 + 25.000 + 4.000 = 87.000", () => {
    const result = priceCart({
      fee: pesos(58000),
      materialsRequired: true,
      lines: [
        priced("grande", 2, pesos(12500)),
        priced("chico", 1, pesos(4000)),
      ],
    });
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.materialsTotal.toCentavos()).toBe(2_900_000);
    expect(result.value.total.toCentavos()).toBe(8_700_000);
    expect(
      result.value.lines.map((l) => [l.variantId, l.lineTotal.toCentavos()]),
    ).toEqual([
      ["grande", 2_500_000],
      ["chico", 400_000],
    ]);
  });

  it("an empty cart is the fee alone when materials are optional", () => {
    const result = priceCart({
      fee: pesos(58000),
      materialsRequired: false,
      lines: [],
    });
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.total.toCentavos()).toBe(5_800_000);
    expect(result.value.materialsTotal.isZero()).toBe(true);
    expect(result.value.lines).toEqual([]);
  });

  it("refuses an empty cart when materials are required", () => {
    expect(
      priceCart({ fee: pesos(58000), materialsRequired: true, lines: [] }),
    ).toEqual({ ok: false, error: { kind: "materials-required" } });
  });

  it("accepts a non-empty cart when materials are required", () => {
    const result = priceCart({
      fee: pesos(58000),
      materialsRequired: true,
      lines: [priced("chico", 1, pesos(4000))],
    });
    expect(result.ok).toBe(true);
  });

  it("refuses a price that is not a multiple of 100 centavos, naming the line", () => {
    expect(
      priceCart({
        fee: pesos(58000),
        materialsRequired: false,
        lines: [
          priced("grande", 1, pesos(100)),
          priced("chico", 1, money(450_050)),
        ],
      }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-price", variantId: "chico" },
    });
  });

  it("refuses a negative price, naming the line", () => {
    expect(
      priceCart({
        fee: pesos(58000),
        materialsRequired: false,
        lines: [priced("chico", 1, pesos(-4000))],
      }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-price", variantId: "chico" },
    });
  });

  it("refuses an unusable fee", () => {
    expect(
      priceCart({ fee: money(5_800_050), materialsRequired: false, lines: [] }),
    ).toEqual({ ok: false, error: { kind: "invalid-fee" } });
    expect(
      priceCart({ fee: pesos(0), materialsRequired: false, lines: [] }),
    ).toEqual({ ok: false, error: { kind: "invalid-fee" } });
  });

  it("refuses a line total outside the safe-integer range, never rounds", () => {
    const huge = money(9_007_199_254_740_900);
    expect(
      priceCart({
        fee: pesos(58000),
        materialsRequired: false,
        lines: [priced("grande", 2, huge)],
      }),
    ).toEqual({ ok: false, error: { kind: "invalid-total" } });
  });

  it("refuses a materials sum or order total outside the safe-integer range", () => {
    const huge = money(9_007_199_254_740_900);
    expect(
      priceCart({
        fee: pesos(58000),
        materialsRequired: false,
        lines: [priced("a", 1, huge), priced("b", 1, huge)],
      }),
    ).toEqual({ ok: false, error: { kind: "invalid-total" } });
    expect(
      priceCart({
        fee: pesos(58000),
        materialsRequired: false,
        lines: [priced("a", 1, huge)],
      }),
    ).toEqual({ ok: false, error: { kind: "invalid-total" } });
  });
});
