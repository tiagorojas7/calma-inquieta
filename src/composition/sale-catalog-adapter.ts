import type { OfferedMaterialsLookup } from "~/modules/enrollments";
import type { SaleCatalogFactsReader } from "~/modules/materials";

/**
 * Adapts the materials-owned sale catalog to the enrollment port an owner's
 * hand-made enrollment resolves its lines against. The catalog is not tied to
 * a period, so the period is ignored. A material that is not available for
 * sale is reported inactive, so its lines are refused as unavailable. Each
 * variant carries the units on hand and the supplier cost the sale snapshots.
 */
export function createSaleCatalogAdapter(
  catalog: SaleCatalogFactsReader,
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
          onHand: variant.onHand,
          unitCost: variant.cost,
        })),
      }));
    },
  };
}
