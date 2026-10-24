import { describe, expect, it } from "vitest";
import { createOfferedMaterialsAdapter } from "./offered-materials-adapter";
import { Money } from "~/modules/_shared";

const unitPrice = (() => {
  const result = Money.fromCentavos(125000);
  if (!result.ok) throw new Error("fixture money");
  return result.value;
})();

describe("offered materials adapter", () => {
  it("joins current material snapshots in authoritative B9 offer order", async () => {
    const subject = createOfferedMaterialsAdapter(
      {
        listOfferedMaterialIds: async () => ["material-2", "material-1"],
      },
      {
        findOfferedMaterialSnapshots: async () =>
          new Map([
            [
              "material-1",
              {
                materialId: "material-1",
                name: "Clay",
                active: true,
                available: true,
                supplierId: "supplier-1",
                supplierName: "Casa",
                variants: [
                  {
                    variantId: "variant-1",
                    label: "Small",
                    unitPrice,
                    available: true,
                  },
                ],
              },
            ],
            [
              "material-2",
              {
                materialId: "material-2",
                name: "Paint",
                active: true,
                available: false,
                supplierId: "supplier-2",
                supplierName: "Color",
                variants: [],
              },
            ],
          ]),
      },
    );

    await expect(subject.listForPeriod("period-1")).resolves.toEqual([
      {
        materialId: "material-2",
        name: "Paint",
        active: false,
        supplierId: "supplier-2",
        supplierName: "Color",
        variants: [],
      },
      {
        materialId: "material-1",
        name: "Clay",
        active: true,
        supplierId: "supplier-1",
        supplierName: "Casa",
        variants: [
          {
            variantId: "variant-1",
            label: "Small",
            unitPrice,
            available: true,
          },
        ],
      },
    ]);
  });

  it("preserves a disappeared B9 offer as an inactive sentinel", async () => {
    const subject = createOfferedMaterialsAdapter(
      { listOfferedMaterialIds: async () => ["missing"] },
      { findOfferedMaterialSnapshots: async () => new Map() },
    );

    await expect(subject.listForPeriod("period-1")).resolves.toEqual([
      {
        materialId: "missing",
        name: "",
        active: false,
        supplierId: "",
        supplierName: "",
        variants: [],
      },
    ]);
  });
});
