import type {
  OfferedMaterialSnapshot,
  OfferedMaterialSnapshotsLookup,
} from "./contracts";
import type { MediaAsset, MediaLookup } from "~/modules/media";
import type { MaterialRepository } from "./material-repository";

export interface OfferedMaterialSnapshotsLookupDeps {
  readonly materials: Pick<MaterialRepository, "findByIds">;
  readonly media: MediaLookup;
}

/** Actorless current-sale snapshot read for enrollment composition. */
export function createOfferedMaterialSnapshotsLookup({
  materials,
  media,
}: OfferedMaterialSnapshotsLookupDeps): OfferedMaterialSnapshotsLookup {
  return {
    async findOfferedMaterialSnapshots(materialIds) {
      const found = await materials.findByIds(materialIds);
      const assetIds = [...found.values()].flatMap((material) =>
        material.image ? [material.image.assetId] : [],
      );
      const assets: ReadonlyMap<string, MediaAsset> =
        assetIds.length === 0
          ? new Map<string, MediaAsset>()
          : await media.findAssets([...new Set(assetIds)]);
      const snapshots = new Map<string, OfferedMaterialSnapshot>();
      for (const materialId of materialIds) {
        const material = found.get(materialId);
        if (!material) continue;
        const asset = material.image
          ? assets.get(material.image.assetId)
          : undefined;
        snapshots.set(materialId, {
          materialId: material.id,
          name: material.name,
          active: material.active,
          available: material.available,
          supplierId: material.supplier.id,
          supplierName: material.supplier.name,
          image:
            material.image && asset
              ? {
                  src: asset.src,
                  alt: material.image.alt,
                  width: asset.width,
                  height: asset.height,
                }
              : null,
          variants: material.variants.map((variant) => ({
            variantId: variant.id,
            label: variant.label,
            unitPrice: variant.price,
            available: variant.available,
            swatch: variant.swatch,
          })),
        });
      }
      return snapshots;
    },
  };
}
