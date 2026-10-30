/** One image slot as the admin forms submit it. */
export interface GalleryFormImage {
  readonly assetId: string;
  readonly src?: string;
  readonly alt: string;
}

/**
 * The `ImageField` slots of a form, in the order they were submitted. An empty
 * slot submits nothing, so only chosen images appear. Validation (known asset,
 * required alt, limit) is the service's job.
 */
export function parseGallery(form: FormData): GalleryFormImage[] {
  const assetIds = form.getAll("galleryAssetId");
  const sources = form.getAll("gallerySrc");
  const alts = form.getAll("galleryAlt");
  return assetIds.map((assetId, index) => {
    const src = sources[index];
    const alt = alts[index];
    return {
      assetId: typeof assetId === "string" ? assetId : "",
      ...(typeof src === "string" ? { src } : {}),
      alt: typeof alt === "string" ? alt : "",
    };
  });
}
