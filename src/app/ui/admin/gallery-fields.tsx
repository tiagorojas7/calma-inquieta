import { ImageField, type ImageFieldFailure } from "./image-field";

export interface GalleryFieldImage {
  readonly assetId: string;
  readonly src?: string;
  readonly alt: string;
}

/** Slots shown before the owner asks for more. */
const VISIBLE_SLOTS = 2;

/** Browser upload to `POST /admin/imagenes`, the same path the intensivos use. */
async function upload(file: File) {
  try {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/admin/imagenes", { method: "POST", body });
    if (!response.ok)
      return {
        ok: false as const,
        error:
          response.status === 413
            ? "too-large"
            : response.status === 503
              ? "unavailable"
              : ("failed" as ImageFieldFailure),
      };
    return {
      ok: true as const,
      image: (await response.json()) as { id: string; src: string },
    };
  } catch {
    return { ok: false as const, error: "failed" as ImageFieldFailure };
  }
}

/**
 * Photo slots for a form: the first two in view, the rest under a
 * `<details>`. Each chosen image submits `galleryAssetId`, `gallerySrc` and
 * `galleryAlt`; a slot nobody filled submits nothing.
 */
export function GalleryFields({
  images,
  slots,
  title,
  hint,
  label,
  moreLabel,
  error,
}: {
  images: readonly GalleryFieldImage[];
  slots: number;
  title: string;
  hint: string;
  label: string;
  moreLabel: string;
  error?: string | undefined;
}) {
  const slot = (index: number) => {
    const image = images[index];
    return (
      <div key={index}>
        <ImageField
          name="gallery"
          label={label}
          upload={upload}
          current={
            image?.src
              ? { assetId: image.assetId, src: image.src, alt: image.alt }
              : undefined
          }
        />
      </div>
    );
  };
  const rest = Array.from(
    { length: Math.max(slots - VISIBLE_SLOTS, 0) },
    (_, offset) => VISIBLE_SLOTS + offset,
  );
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="font-display text-xl text-ink-900">{title}</legend>
      <p className="text-ink-700">{hint}</p>
      {Array.from({ length: Math.min(slots, VISIBLE_SLOTS) }, (_, i) =>
        slot(i),
      )}
      {rest.length > 0 ? (
        <details open={images.length > VISIBLE_SLOTS || undefined}>
          <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-clay-800 underline underline-offset-4">
            {moreLabel}
          </summary>
          <div className="mt-3 flex flex-col gap-4">{rest.map(slot)}</div>
        </details>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-terracotta-700">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
