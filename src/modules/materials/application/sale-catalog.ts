import type { Money } from "~/modules/_shared";
import type {
  Material,
  SaleCatalogMaterial,
  SaleCatalogReader,
  SaleVariantOption,
} from "./contracts";
import type { MaterialRepository } from "./material-repository";
import type { StockStore } from "./stock-store";

export interface SaleCatalogReaderDeps {
  readonly materials: Pick<MaterialRepository, "list">;
  /** Where the units on hand of each variant come from. */
  readonly stock: Pick<StockStore, "onHand">;
}

/** A sale variant with the two facts an enrollment snapshots when it sells it. */
export type SaleCatalogVariantFacts =
  SaleCatalogMaterial["variants"][number] & {
    /** The variant's current supplier cost; null when the owner has not loaded it. */
    readonly cost: Money | null;
    /** Units the studio holds; 0 when there is no stock row. */
    readonly onHand: number;
  };

/** A catalog material whose variants carry their cost and stock. */
export type SaleCatalogMaterialFacts = Omit<SaleCatalogMaterial, "variants"> & {
  readonly variants: readonly SaleCatalogVariantFacts[];
};

/** `SaleCatalogReader` whose variants also carry their cost and units on hand. */
export interface SaleCatalogFactsReader extends SaleCatalogReader {
  listSaleCatalog(): Promise<readonly SaleCatalogMaterialFacts[]>;
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

/**
 * Actorless read of the current sale facts, for the enrollment composition:
 * price, availability, the supplier cost and the units on hand of each variant.
 */
export function createSaleCatalogReader({
  materials,
  stock,
}: SaleCatalogReaderDeps): SaleCatalogFactsReader {
  return {
    async listSaleCatalog(): Promise<readonly SaleCatalogMaterialFacts[]> {
      const listed = await materials.list({ state: "all" });
      const onHand = await stock.onHand(
        listed.flatMap((material) => material.variants.map((v) => v.id)),
      );
      return listed.map((material) => ({
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
          cost: variant.cost,
          onHand: onHand.get(variant.id) ?? 0,
        })),
      }));
    },
  };
}
