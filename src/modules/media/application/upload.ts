import { err, ok, type Clock, type Result } from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import type { ImageStorage } from "./image-storage";
import {
  createImageIdentity,
  imageDimensions,
  MAX_IMAGE_BYTES,
  validateImageBytes,
} from "../domain/media-core";
import type { MediaAsset, UploadError } from "./read-models";
import type { MediaAssetRepository } from "./media-assets";

export interface ImageByteSource {
  read(): Promise<Uint8Array>;
}

/**
 * Stores one validated image and records its metadata. Only the bytes decide
 * the type: a file name or declared content type the caller carries is never read.
 * A failed put leaves nothing behind. A failed metadata insert removes the stored
 * object on a best-effort basis and rethrows the insert error (admin error state).
 */
export async function uploadImage(
  actor: AdminActor | null | undefined,
  source: ImageByteSource,
  storage: ImageStorage,
  repository: MediaAssetRepository,
  clock: Clock,
): Promise<Result<MediaAsset, UploadError>> {
  const authorized = requireAdminActor(actor);
  if (!authorized.ok) return authorized;
  const bytes = await source.read();
  const valid = validateImageBytes(bytes);
  if (!valid.ok)
    return err(
      valid.error === "too-large"
        ? { kind: valid.error, limitBytes: MAX_IMAGE_BYTES }
        : { kind: valid.error },
    );
  const size = imageDimensions(bytes, valid.type);
  if (!size) return err({ kind: "unreadable-dimensions" });
  const { id, fileName, key } = createImageIdentity(valid.type);
  try {
    await storage.put(key, bytes, valid.type);
  } catch {
    return err({ kind: "storage-unavailable" });
  }
  const asset: MediaAsset = {
    id,
    fileName,
    src: `/imagenes/${fileName}`,
    contentType: valid.type,
    byteSize: bytes.byteLength,
    width: size.width,
    height: size.height,
    createdBy: authorized.value.email,
    createdAt: clock.now(),
  };
  try {
    await repository.insert(asset);
  } catch (cause) {
    try {
      await storage.delete(key);
    } catch {
      /* best effort: an unreferenced object may remain */
    }
    throw cause;
  }
  return ok(asset);
}
