import { Image, type ImageProps } from "./image";

export interface PictureSource {
  media: string;
  srcSet: string;
  width: number;
  height: number;
}

type PictureProps = ImageProps & {
  sources: readonly PictureSource[];
  /** Applies to every source and to the fallback img. */
  sizes: string;
  pictureClassName?: string;
};

export function Picture({
  sources,
  sizes,
  pictureClassName,
  ...image
}: PictureProps) {
  return (
    <picture className={pictureClassName}>
      {sources.map((source) => (
        <source
          key={source.media}
          media={source.media}
          srcSet={source.srcSet}
          sizes={sizes}
          width={source.width}
          height={source.height}
          type="image/webp"
        />
      ))}
      <Image {...image} sizes={sizes} intrinsicRatio={false} />
    </picture>
  );
}
