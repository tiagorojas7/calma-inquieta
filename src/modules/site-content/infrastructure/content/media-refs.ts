import { toImageRef } from "../../domain/media";
import type { ArtDirectedImage, ImageRef } from "../../domain/page-content";
import { MEDIA_ASSETS } from "./media-assets";

/** The ids of the registered image assets (video ids arrive with the loop). */
export type ImageAssetId = Extract<
  (typeof MEDIA_ASSETS)[number],
  { readonly kind: "image" }
>["id"];

/**
 * One registered image as a content reference, with its `srcSet`. An id that
 * is not a registered image is a programming error and throws.
 */
export function imageRef(id: ImageAssetId, preferredWidth?: number): ImageRef {
  const asset = MEDIA_ASSETS.find((candidate) => candidate.id === id);
  if (asset?.kind !== "image") {
    throw new Error(`"${id}" is not a registered image asset`);
  }
  return toImageRef(asset, preferredWidth);
}

/** A phone crop and a desktop crop of one slot, each its own registered image. */
export function artDirected(
  mobile: ImageAssetId,
  desktop: ImageAssetId,
): ArtDirectedImage {
  return { mobile: imageRef(mobile), desktop: imageRef(desktop) };
}
