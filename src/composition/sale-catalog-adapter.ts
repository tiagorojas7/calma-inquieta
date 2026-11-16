import type { OfferedMaterialsLookup } from "~/modules/enrollments";
import type { SaleCatalogReader } from "~/modules/materials";

/**
 * Adapts the materials-owned sale catalog to the enrollment port an owner's
 * hand-made enrollment resolves its lines against. The catalog is not tied to
 * a period, so the period is ignored. A material that is not available for
 * sale is reported inactive, so its lines are refused as unavailable.
 */
export function createSaleCatalogAdapter(
  catalog: SaleCatalogReader,
): OfferedMaterialsLookup {
  return {
    async listForPeriod() {
      return (await catalog.listSaleCatalog()).map((material) => ({
        materialId: material.materialId,
        name: material.name,
        active: material.active && material.available,
        supplierId: material.supplierId,
        supplierName: material.supplierName,
        variants: material.variants.map((variant) => ({
          variantId: variant.variantId,
          label: variant.label,
          unitPrice: variant.unitPrice,
          available: variant.available,
        })),
      }));
    },
  };
}
