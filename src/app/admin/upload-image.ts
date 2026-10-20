export interface UploadedImage {
  readonly id: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

export type UploadFailure =
  "too-large" | "unsupported-format" | "unavailable" | "failed";

export type UploadOutcome =
  | { readonly ok: true; readonly image: UploadedImage }
  | { readonly ok: false; readonly error: UploadFailure };

const FAILURE_BY_KIND: Readonly<Record<string, UploadFailure>> = {
  "too-large": "too-large",
  "unsupported-type": "unsupported-format",
  "unreadable-dimensions": "unsupported-format",
  empty: "unsupported-format",
  "storage-unavailable": "unavailable",
};

function isUploadedImage(value: unknown): value is UploadedImage {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "src" in value &&
    typeof value.src === "string" &&
    "width" in value &&
    typeof value.width === "number" &&
    "height" in value &&
    typeof value.height === "number"
  );
}

function failureKind(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("error" in body))
    return null;
  const { error } = body;
  return typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    typeof error.kind === "string"
    ? error.kind
    : null;
}

/** Posts one already-resized image to `POST /admin/imagenes`. */
export async function uploadAdminImage(
  blob: Blob,
  fetcher: typeof fetch = fetch,
): Promise<UploadOutcome> {
  const form = new FormData();
  form.set("file", new File([blob], "imagen", { type: blob.type }));
  try {
    const response = await fetcher("/admin/imagenes", {
      method: "POST",
      body: form,
    });
    const body: unknown = await response.json().catch(() => null);
    if (response.ok && isUploadedImage(body)) return { ok: true, image: body };
    const kind = failureKind(body);
    return { ok: false, error: (kind && FAILURE_BY_KIND[kind]) || "failed" };
  } catch {
    return { ok: false, error: "failed" };
  }
}
