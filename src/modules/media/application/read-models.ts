import type { AdminActor } from "~/modules/admin-access";
import type {
  AdminFailure,
  FieldIssue,
  NotFound,
  Unavailable,
  Result,
} from "~/modules/_shared";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_REQUEST_BYTES = MAX_IMAGE_BYTES + 64 * 1024;
export const MAX_GALLERY_IMAGES = 6;
export type ImageContentType = "image/jpeg" | "image/png" | "image/webp";
export interface MediaAsset {
  readonly id: string;
  readonly fileName: string;
  readonly src: string;
  readonly contentType: ImageContentType;
  readonly byteSize: number;
  readonly width: number;
  readonly height: number;
  readonly createdBy: string;
  readonly createdAt: Date;
}
export interface ImageUse {
  readonly assetId: string;
  readonly alt: string;
  readonly asset: MediaAsset | null;
}
export interface ImageUseDraft {
  readonly assetId: string;
  readonly alt: string;
}
export type UploadError =
  | AdminFailure
  | { kind: "empty" }
  | { kind: "too-large"; limitBytes: number }
  | { kind: "unsupported-type" }
  | { kind: "unreadable-dimensions" }
  | { kind: "storage-unavailable" };
export interface ServedImage {
  readonly body: ReadableStream<Uint8Array>;
  readonly contentType: ImageContentType;
  readonly byteSize: number;
  readonly etag: string;
}
export interface MediaService {
  upload(
    actor: AdminActor,
    file: { bytes: Uint8Array },
  ): Promise<Result<MediaAsset, UploadError>>;
  serve(fileName: string): Promise<Result<ServedImage, NotFound | Unavailable>>;
}
export interface MediaLookup {
  findAssets(ids: readonly string[]): Promise<ReadonlyMap<string, MediaAsset>>;
}
export function validateGallery(
  drafts: readonly ImageUseDraft[],
  known: ReadonlyMap<string, MediaAsset>,
): Result<readonly ImageUseDraft[], readonly FieldIssue<"images">[]> {
  const issues: FieldIssue<"images">[] = [];
  if (drafts.length > MAX_GALLERY_IMAGES)
    issues.push({ field: "images", code: "too-many" });
  const ids = new Set<string>();
  for (const draft of drafts) {
    if (
      !draft.alt.trim() ||
      ids.has(draft.assetId) ||
      !known.has(draft.assetId)
    ) {
      const code = known.has(draft.assetId)
        ? draft.alt.trim()
          ? "duplicate"
          : "required"
        : "unknown-reference";
      issues.push({ field: "images", code });
    }
    ids.add(draft.assetId);
  }
  return issues.length
    ? { ok: false, error: issues }
    : { ok: true, value: drafts };
}
