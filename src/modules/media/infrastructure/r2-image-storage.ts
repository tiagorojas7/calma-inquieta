import type { R2BucketLike } from "~/platform/r2";
import type { ImageContentType } from "../domain/media-core";
import type { ImageStorage } from "../application/image-storage";

function imageType(value: string | undefined): ImageContentType | null {
  if (value === "image/jpeg" || value === "image/png" || value === "image/webp")
    return value;
  return null;
}

/**
 * `ImageStorage` over an R2 bucket. Keys are never reused, so a put that finds
 * an existing object fails instead of replacing it (`etagDoesNotMatch: "*"`).
 */
export function createR2ImageStorage(bucket: R2BucketLike): ImageStorage {
  return {
    async put(key, bytes, contentType) {
      const stored = await bucket.put(key, bytes, {
        httpMetadata: { contentType },
        onlyIf: { etagDoesNotMatch: "*" },
      });
      // R2 answers null when the precondition fails.
      if (stored === null) throw new Error(`object already exists: ${key}`);
    },
    async get(key) {
      const object = await bucket.get(key);
      if (!object) return null;
      const contentType = imageType(object.httpMetadata?.contentType);
      if (!contentType) throw new Error(`object has no image type: ${key}`);
      return { bytes: new Uint8Array(await object.arrayBuffer()), contentType };
    },
    async delete(key) {
      await bucket.delete(key);
    },
  };
}
