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
    const taken = [...this.assets.values()].some(
      (stored) => stored.id === asset.id || stored.fileName === asset.fileName,
    );
    if (taken) return Promise.reject(new Error("asset already exists"));
    this.assets.set(asset.id, asset);
    return Promise.resolve();
  }

  findByIds(ids: readonly string[]): Promise<ReadonlyMap<string, MediaAsset>> {
    const found = new Map<string, MediaAsset>();
    for (const id of ids) {
      const asset = this.assets.get(id);
      if (asset) found.set(id, asset);
    }
    return Promise.resolve(found);
  }
}
