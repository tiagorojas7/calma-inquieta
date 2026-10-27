import { describe, expect, it } from "vitest";
import { toUsedVariantIds } from "./drizzle-order-line-usage-lookup";

describe("order-line variant usage mapping", () => {
  it("returns a stable, de-duplicated ID set", () => {
    expect([
      ...toUsedVariantIds([
        { variantId: "variant-b" },
        { variantId: "variant-a" },
        { variantId: "variant-b" },
      ]),
    ]).toEqual(["variant-b", "variant-a"]);
  });

  it("maps an empty result to an empty set", () => {
    expect([...toUsedVariantIds([])]).toEqual([]);
  });
});
