import { describe, expect, it } from "vitest";
import { buildMaterialVariant } from "~/testing/fakes/admin-builders";
import { markUsedVariants } from "./drizzle-material-repository";

describe("material repository hydration", () => {
  it("marks only variants referenced by historical order lines as used", () => {
    const used = buildMaterialVariant({ id: "variant-used", used: false });
    const unused = buildMaterialVariant({
      id: "variant-unused",
      used: true,
      label: "Unused",
    });

    expect(markUsedVariants([used, unused], new Set([used.id]))).toEqual([
      { ...used, used: true },
      { ...unused, used: false },
    ]);
  });
});
