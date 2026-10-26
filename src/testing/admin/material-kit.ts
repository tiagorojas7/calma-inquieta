import { createMaterialsService } from "~/modules/materials";
import type { MediaAsset, MediaLookup } from "~/modules/media";
import { buildMediaAsset, buildSupplier } from "~/testing/fakes/admin-builders";
import { advancingClock } from "~/testing/fakes/fixed-clock";
import { InMemoryMaterialRepository } from "~/testing/fakes/in-memory-material-repository";
import { InMemorySupplierRepository } from "~/testing/fakes/in-memory-supplier-repository";

export const MATERIAL_SUPPLIER = buildSupplier({
  id: "supplier-1",
  name: "Casa Pincel",
});
export const MATERIAL_ASSET = buildMediaAsset({ id: "asset-1" });

/**
 * Real materials service over in-memory repositories: one supplier
 * (`supplier-1`), one media asset (`asset-1`), ids `material-1`... and
 * `variant-1`... in creation order.
 */
export async function materialsFixture() {
  const repository = new InMemoryMaterialRepository();
  const suppliers = new InMemorySupplierRepository();
  await suppliers.insert(MATERIAL_SUPPLIER);
  const assets = new Map<string, MediaAsset>([
    [MATERIAL_ASSET.id, MATERIAL_ASSET],
  ]);
  const media: MediaLookup = {
    findAssets(ids) {
      const found = new Map<string, MediaAsset>();
      for (const id of ids) {
        const stored = assets.get(id);
        if (stored) found.set(id, stored);
      }
      return Promise.resolve(found);
    },
  };
  let materialId = 0;
  let variantId = 0;
  const service = createMaterialsService({
    repository,
    suppliers,
    media,
    clock: advancingClock(new Date("2026-10-20T12:00:00.000Z")),
    newId: () => `material-${String(++materialId)}`,
    newVariantId: () => `variant-${String(++variantId)}`,
  });
  return { repository, suppliers, service };
}
