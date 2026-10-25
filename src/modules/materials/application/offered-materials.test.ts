import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { buildMaterial, buildSupplier } from "~/testing/fakes/admin-builders";
import { createOfferedMaterialSnapshotsLookup } from "./offered-materials";

const unitPrice = (() => {
  const result = Money.fromCentavos(125000);
  if (!result.ok) throw new Error("fixture money");
  return result.value;
})();
const material = buildMaterial({
  id: "material-1",
  name: "Clay",
  active: true,
  available: false,
  supplier: buildSupplier({ id: "supplier-1", name: "Casa" }),
  variants: [
    {
      id: "variant-1",
      label: "Small",
      price: unitPrice,
      available: true,
      used: false,
      position: 0,
      swatch: null,
    },
    {
      id: "variant-2",
      label: "Large",
      price: unitPrice,
      available: false,
      used: false,
      position: 1,
      swatch: null,
    },
  ],
});

describe("offered material snapshots lookup", () => {
  it("exposes current material, supplier, and variant sale facts without an actor", async () => {
    const lookup = createOfferedMaterialSnapshotsLookup({
      materials: {
        findByIds: () => Promise.resolve(new Map([[material.id, material]])),
      },
    });

    await expect(
      lookup.findOfferedMaterialSnapshots([material.id]),
    ).resolves.toEqual(
      new Map([
        [
          material.id,
          {
            materialId: "material-1",
            name: "Clay",
            active: true,
            available: false,
            supplierId: "supplier-1",
            supplierName: "Casa",
            variants: [
              {
                variantId: "variant-1",
                label: "Small",
                unitPrice: material.variants[0]?.price,
                available: true,
              },
              {
                variantId: "variant-2",
                label: "Large",
                unitPrice: material.variants[1]?.price,
                available: false,
              },
            ],
          },
        ],
      ]),
    );
  });
});
