import type { MediaAsset } from "./read-models";

export interface MediaAssetRepository {
  insert(asset: MediaAsset): Promise<void>;
  findById(id: string): Promise<MediaAsset | null>;
}
