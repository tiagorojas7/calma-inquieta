import {
  browserResizeEnv,
  resizeForUpload,
  type ResizeEnv,
} from "./image-resize";
import { uploadAdminImage, type UploadOutcome } from "./upload-image";

/** Resize in the browser, then post: what an `ImageField` runs for a chosen file. */
export async function uploadChosenImage(
  file: File,
  deps: { env?: ResizeEnv; fetcher?: typeof fetch } = {},
): Promise<UploadOutcome> {
  const resized = await resizeForUpload(file, deps.env ?? browserResizeEnv);
  if (!resized.ok) return resized;
  return uploadAdminImage(resized.blob, deps.fetcher);
}
