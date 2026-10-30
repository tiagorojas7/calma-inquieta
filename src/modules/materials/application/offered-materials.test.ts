import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import {
  buildMaterial,
  buildMaterialVariant,
  buildSupplier,
} from "~/testing/fakes/admin-builders";
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
      media: { findAssets: () => Promise.resolve(new Map()) },
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
                swatch: null,
              },
              {
                variantId: "variant-2",
                label: "Large",
                unitPrice: material.variants[1]?.price,
                available: false,
                swatch: null,
              },
            ],
            image: null,
          },
        ],
      ]),
    );
  });

  it("resolves the stored image to its public asset and exposes the variant swatch", async () => {
    const withImage = buildMaterial({
      id: "material-2",
      image: { assetId: "asset-1", alt: "Arcilla blanca", asset: null },
      variants: [buildMaterialVariant({ id: "variant-9", swatch: "#aabbcc" })],
    });
    const lookup = createOfferedMaterialSnapshotsLookup({
      materials: {
        findByIds: () => Promise.resolve(new Map([[withImage.id, withImage]])),
      },
      media: {
        findAssets: (ids) => {
          expect(ids).toEqual(["asset-1"]);
          return Promise.resolve(
            new Map([
              [
                "asset-1",
                {
                  id: "asset-1",
                  fileName: "a.webp",
                  src: "/media/a.webp",
                  contentType: "image/webp" as const,
                  byteSize: 10,
                  width: 800,
                  height: 600,
                  createdBy: "owner@example.com",
                  createdAt: new Date("2026-01-01"),
                },
              ],
            ]),
          );
        },
      },
    });
    const snapshot = (
      await lookup.findOfferedMaterialSnapshots([withImage.id])
    ).get(withImage.id);
    expect(snapshot?.image).toEqual({
      src: "/media/a.webp",
      alt: "Arcilla blanca",
      width: 800,
      height: 600,
    });
    expect(snapshot?.variants[0]?.swatch).toBe("#aabbcc");
  });

  it("drops the image when its asset no longer exists", async () => {
    const withImage = buildMaterial({
      image: { assetId: "gone", alt: "Alt", asset: null },
    });
    const lookup = createOfferedMaterialSnapshotsLookup({
      materials: {
        findByIds: () => Promise.resolve(new Map([[withImage.id, withImage]])),
      },
      media: { findAssets: () => Promise.resolve(new Map()) },
    });
    const snapshot = (
      await lookup.findOfferedMaterialSnapshots([withImage.id])
    ).get(withImage.id);
    expect(snapshot?.image).toBeNull();
  });
});
