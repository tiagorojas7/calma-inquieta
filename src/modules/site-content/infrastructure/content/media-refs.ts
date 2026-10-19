import { toImageRef } from "../../domain/media";
import type {
  AmbientLoop,
  ArtDirectedImage,
  ImageRef,
} from "../../domain/page-content";
import { MEDIA_ASSETS } from "./media-assets";

/** The ids of the registered image assets. */
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

/** The ids of the registered video assets. */
export type VideoAssetId = Extract<
  (typeof MEDIA_ASSETS)[number],
  { readonly kind: "video" }
>["id"];

/**
 * One registered loop as a content reference: its sources in registry order and
 * the poster of its `posterId`, decorative (empty alt). An id that is not a
 * registered video, or a poster that is not a registered image, throws.
 */
export function loopRef(id: VideoAssetId): AmbientLoop {
  const video = MEDIA_ASSETS.find((candidate) => candidate.id === id);
  if (video?.kind !== "video") {
    throw new Error(`"${id}" is not a registered video asset`);
  }
  const poster = MEDIA_ASSETS.find(
    (candidate) => candidate.id === video.posterId,
  );
  if (poster?.kind !== "image") {
    throw new Error(`"${video.posterId}" is not a registered image asset`);
  }
  return {
    poster: { ...toImageRef(poster), alt: "" },
    sources: video.sources.map(({ path, type }) => ({ src: path, type })),
    width: video.width,
    height: video.height,
  };
}
