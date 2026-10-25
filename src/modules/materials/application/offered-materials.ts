import type {
  OfferedMaterialSnapshot,
  OfferedMaterialSnapshotsLookup,
} from "./contracts";
import type { MaterialRepository } from "./material-repository";

export interface OfferedMaterialSnapshotsLookupDeps {
  readonly materials: Pick<MaterialRepository, "findByIds">;
}

/** Actorless current-sale snapshot read for enrollment composition. */
export function createOfferedMaterialSnapshotsLookup({
  materials,
}: OfferedMaterialSnapshotsLookupDeps): OfferedMaterialSnapshotsLookup {
  return {
    async findOfferedMaterialSnapshots(materialIds) {
      const found = await materials.findByIds(materialIds);
      const snapshots = new Map<string, OfferedMaterialSnapshot>();
      for (const materialId of materialIds) {
        const material = found.get(materialId);
        if (!material) continue;
        snapshots.set(materialId, {
          materialId: material.id,
          name: material.name,
          active: material.active,
          available: material.available,
          supplierId: material.supplier.id,
          supplierName: material.supplier.name,
          variants: material.variants.map((variant) => ({
            variantId: variant.id,
            label: variant.label,
            unitPrice: variant.price,
            available: variant.available,
          })),
        });
      }
      return snapshots;
    },
  };
}
