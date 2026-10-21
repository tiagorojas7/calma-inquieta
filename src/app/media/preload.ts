interface PreloadImage {
  src: string;
  srcSet?: string;
}

export interface PreloadDescriptor {
  tagName: "link";
  rel: "preload";
  as: "image";
  imageSrcSet: string;
  imageSizes: string;
  media?: string;
  fetchPriority: "high";
}

interface PreloadOptions {
  /** Layout width of the mobile image (a full-bleed backdrop is 100vw). */
  mobileSizes: string;
  /** Layout width of the desktop image (a collage tile is a share of the viewport). */
  desktopSizes: string;
  mobileMedia: string;
  desktopMedia: string;
}

const descriptor = (
  image: PreloadImage,
  sizes: string,
  media: string,
): PreloadDescriptor => ({
  tagName: "link",
  rel: "preload",
  as: "image",
  imageSrcSet: image.srcSet ?? image.src,
  imageSizes: sizes,
  media,
  fetchPriority: "high",
});

/**
 * Two preloads with mutually exclusive media, one per art-directed source, so
 * a phone never fetches the desktop image and the other way round. The sizes
 * differ per side because the two images fill different layout boxes.
 */
export function artDirectedPreloads(
  image: { mobile: PreloadImage; desktop: PreloadImage },
  { mobileSizes, desktopSizes, mobileMedia, desktopMedia }: PreloadOptions,
): readonly PreloadDescriptor[] {
  return [
    descriptor(image.mobile, mobileSizes, mobileMedia),
    descriptor(image.desktop, desktopSizes, desktopMedia),
  ];
}

/** One preload with no media, for a hero image that shows on every width. */
export function imagePreload(
  image: PreloadImage,
  sizes: string,
): PreloadDescriptor {
  return {
    tagName: "link",
    rel: "preload",
    as: "image",
    imageSrcSet: image.srcSet ?? image.src,
    imageSizes: sizes,
    fetchPriority: "high",
  };
}
