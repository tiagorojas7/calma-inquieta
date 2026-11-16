import type {
  Material,
  SaleCatalogMaterial,
  SaleCatalogReader,
  SaleVariantOption,
} from "./contracts";
import type { MaterialRepository } from "./material-repository";

export interface SaleCatalogReaderDeps {
  readonly materials: Pick<MaterialRepository, "list">;
}

/**
 * The variants an owner may add to a hand-made enrollment: those of active,
 * available materials that are available and have a price. Keeps the
 * repository order (material name, then id) and the variant position.
 */
export function saleVariantsOf(
  materials: readonly Material[],
): readonly SaleVariantOption[] {
  return materials
    .filter((material) => material.active && material.available)
    .flatMap((material) =>
      material.variants.flatMap((variant) =>
        variant.available && variant.price !== null
          ? [
              {
                materialId: material.id,
                variantId: variant.id,
                materialName: material.name,
                variantLabel: variant.label,
                unitPrice: variant.price,
              },
            ]
          : [],
      ),
    );
}

/** Actorless read of the current sale facts, for the enrollment composition. */
export function createSaleCatalogReader({
  materials,
}: SaleCatalogReaderDeps): SaleCatalogReader {
  return {
    async listSaleCatalog(): Promise<readonly SaleCatalogMaterial[]> {
      return (await materials.list({ state: "all" })).map((material) => ({
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
      }));
    },
  };
}
