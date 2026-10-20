import { servicesContext } from "~/app/context";
import { MAX_UPLOAD_REQUEST_BYTES, type UploadError } from "~/modules/media";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/image-upload";

const STATUS_BY_ERROR: Record<UploadError["kind"], number> = {
  denied: 403,
  unavailable: 503,
  "storage-unavailable": 503,
  "too-large": 413,
  empty: 422,
  "unsupported-type": 422,
  "unreadable-dimensions": 422,
};

function failure(status: number, kind: string): Response {
  return Response.json({ error: { kind } }, { status });
}

/**
 * `POST /admin/imagenes` (design AC8). The request size is checked from the
 * header before the body is parsed, so an oversized or chunked upload is never
 * buffered. The use case then re-checks size, type and dimensions from bytes.
 */
export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const length = request.headers.get("Content-Length");
  if (length === null) return failure(411, "length-required");
  const declared = Number(length);
  if (!Number.isFinite(declared) || declared < 0)
    return failure(400, "invalid-request");
  if (declared > MAX_UPLOAD_REQUEST_BYTES) return failure(413, "too-large");
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return failure(400, "missing-file");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await context
    .get(servicesContext)
    .media.upload(actor, { bytes });
  if (!result.ok)
    return failure(STATUS_BY_ERROR[result.error.kind], result.error.kind);
  const { id, src, width, height } = result.value;
  return Response.json({ id, src, width, height });
}
