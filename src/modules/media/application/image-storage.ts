import type { ImageContentType } from "../domain/media-core";

export interface ImageStorage {
  put(
    key: string,
    bytes: Uint8Array,
    contentType: ImageContentType,
  ): Promise<void>;
  get(
    key: string,
  ): Promise<{ bytes: Uint8Array; contentType: ImageContentType } | null>;
  delete(key: string): Promise<void>;
}
