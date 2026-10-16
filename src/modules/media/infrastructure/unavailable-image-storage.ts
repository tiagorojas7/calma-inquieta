import type { ImageStorage } from "../application/image-storage";

/**
 * Stands in for the bucket when the `MEDIA` binding is absent: every call
 * fails, which the use cases already map to `storage-unavailable` (upload) and
 * a not-served image (serve), so unrelated pages never notice.
 */
export function createUnavailableImageStorage(): ImageStorage {
  const fail = () => Promise.reject(new Error("media storage unavailable"));
  return { put: fail, get: fail, delete: fail };
}
