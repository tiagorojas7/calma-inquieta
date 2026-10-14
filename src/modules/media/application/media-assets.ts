import type { MediaAsset } from "./read-models";

export interface MediaAssetRepository {
  insert(asset: MediaAsset): Promise<void>;
  /** Known ids only; unknown ids are absent from the map. */
  findByIds(ids: readonly string[]): Promise<ReadonlyMap<string, MediaAsset>>;
}
