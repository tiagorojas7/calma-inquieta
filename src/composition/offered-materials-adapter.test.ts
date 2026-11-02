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
        listOfferedMaterialIds: () =>
          Promise.resolve(["material-2", "material-1"]),
      },
      {
        findOfferedMaterialSnapshots: () =>
          Promise.resolve(
            new Map([
              [
                "material-1",
                {
                  materialId: "material-1",
                  name: "Clay",
                  category: "Arcilla",
                  active: true,
                  available: true,
                  supplierId: "supplier-1",
                  supplierName: "Casa",
                  image: {
                    src: "/media/a.webp",
                    alt: "Arcilla",
                    width: 800,
                    height: 600,
                  },
                  variants: [
                    {
                      variantId: "variant-1",
                      label: "Small",
                      unitPrice,
                      available: true,
                      swatch: "#aabbcc",
                    },
                  ],
                },
              ],
              [
                "material-2",
                {
                  materialId: "material-2",
                  name: "Paint",
                  category: "Esmalte",
                  active: true,
                  available: false,
                  supplierId: "supplier-2",
                  supplierName: "Color",
                  image: null,
                  variants: [],
                },
              ],
            ]),
          ),
      },
    );

    await expect(subject.listForPeriod("period-1")).resolves.toEqual([
      {
        materialId: "material-2",
        name: "Paint",
        category: "Esmalte",
        active: false,
        supplierId: "supplier-2",
        supplierName: "Color",
        image: null,
        variants: [],
      },
      {
        materialId: "material-1",
        name: "Clay",
        category: "Arcilla",
        active: true,
        supplierId: "supplier-1",
        supplierName: "Casa",
        image: {
          src: "/media/a.webp",
          alt: "Arcilla",
          width: 800,
          height: 600,
        },
        variants: [
          {
            variantId: "variant-1",
            label: "Small",
            unitPrice,
            available: true,
            swatch: "#aabbcc",
          },
        ],
      },
    ]);
  });

  it("preserves a disappeared B9 offer as an inactive sentinel", async () => {
    const subject = createOfferedMaterialsAdapter(
      { listOfferedMaterialIds: () => Promise.resolve(["missing"]) },
      { findOfferedMaterialSnapshots: () => Promise.resolve(new Map()) },
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
