import {
  err,
  ok,
  type NotFound,
  type Result,
  type Unavailable,
} from "~/modules/_shared";
import type { ImageStorage } from "./image-storage";
import type { MediaAssetRepository } from "./media-assets";
import type { ServedImage } from "./read-models";

const SERVED_FILE_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
const ID_LENGTH = 36;

const notFound: NotFound = { kind: "not-found" };
const unavailable: Unavailable = { kind: "unavailable" };

/**
 * Public read of one stored image by its `<id>.<ext>` name. The name is
 * validated before any lookup, the metadata row must carry that exact file
 * name, and only then is the object read. Objects are immutable, so the id is
 * a sufficient etag.
 */
export async function serveImage(
  fileName: string,
  storage: ImageStorage,
  repository: MediaAssetRepository,
): Promise<Result<ServedImage, NotFound | Unavailable>> {
  if (!SERVED_FILE_NAME.test(fileName)) return err(notFound);
  const id = fileName.slice(0, ID_LENGTH);
  let asset;
  try {
    asset = (await repository.findByIds([id])).get(id);
  } catch {
    return err(unavailable);
  }
  if (asset?.fileName !== fileName) return err(notFound);
  let object;
  try {
    object = await storage.get(`img/${asset.fileName}`);
  } catch {
    return err(unavailable);
  }
  if (!object) return err(notFound);
  const { bytes } = object;
  return ok({
    body: new Blob([bytes as BlobPart]).stream(),
    contentType: asset.contentType,
    byteSize: bytes.byteLength,
    etag: `"${asset.id}"`,
  });
}
