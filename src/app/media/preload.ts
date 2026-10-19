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
  media: string;
  fetchPriority: "high";
}

interface PreloadOptions {
  sizes: string;
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

/** Two preloads with mutually exclusive media, one per art-directed source. */
export function artDirectedPreloads(
  image: { mobile: PreloadImage; desktop: PreloadImage },
  { sizes, mobileMedia, desktopMedia }: PreloadOptions,
): readonly PreloadDescriptor[] {
  return [
    descriptor(image.mobile, sizes, mobileMedia),
    descriptor(image.desktop, sizes, desktopMedia),
  ];
}
