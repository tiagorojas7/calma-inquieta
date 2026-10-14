import type { MediaAsset } from "~/modules/media";
import type { MediaAssetRepository } from "~/modules/media/application/media-assets";

/** Metadata rows in memory. Counts insert attempts and can be told to fail. */
export class InMemoryMediaAssetRepository implements MediaAssetRepository {
  readonly assets = new Map<string, MediaAsset>();
  insertCalls = 0;
  failInsert = false;

  insert(asset: MediaAsset): Promise<void> {
    this.insertCalls++;
    if (this.failInsert)
      return Promise.reject(new Error("metadata insert failed"));
    if (this.assets.has(asset.id))
      return Promise.reject(new Error("asset already exists"));
    this.assets.set(asset.id, asset);
    return Promise.resolve();
  }

  findById(id: string): Promise<MediaAsset | null> {
    return Promise.resolve(this.assets.get(id) ?? null);
  }
}
