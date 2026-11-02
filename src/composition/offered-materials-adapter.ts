import type { OfferedMaterialsLookup } from "~/modules/enrollments";
import type { OfferedMaterialSnapshotsLookup } from "~/modules/materials";
import type { WorkshopOfferedMaterialIdsLookup as WorkshopOffers } from "~/modules/workshops";

/**
 * Joins B9's ordered period offers with current material sale facts. The
 * consumer port uses `active` as the material-level sellability bit.
 */
export function createOfferedMaterialsAdapter(
  workshopOffers: WorkshopOffers,
  materials: OfferedMaterialSnapshotsLookup,
): OfferedMaterialsLookup {
  return {
    async listForPeriod(periodId) {
      const offeredIds = await workshopOffers.listOfferedMaterialIds(periodId);
      const snapshots =
        await materials.findOfferedMaterialSnapshots(offeredIds);
      return offeredIds.map((materialId) => {
        const material = snapshots.get(materialId);
        if (!material)
          return {
            materialId,
            name: "",
            active: false,
            supplierId: "",
            supplierName: "",
            variants: [],
          };
        return {
          materialId: material.materialId,
          name: material.name,
          category: material.category,
          active: material.active && material.available,
          supplierId: material.supplierId,
          supplierName: material.supplierName,
          image: material.image,
          variants: material.variants,
        };
      });
    },
  };
}
