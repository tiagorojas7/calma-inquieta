import type { ImgHTMLAttributes } from "react";
type Base = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "width" | "height" | "loading" | "decoding"
> & {
  src: string;
  alt: string;
  width: number;
  height: number;
  srcSet?: string;
  sizes?: string;
  /** Inline aspect-ratio from width/height; set false when CSS owns the ratio. */
  intrinsicRatio?: boolean;
};
export type ImageProps = Base &
  (
    | { aboveTheFold?: false; fetchPriority?: "auto" | "low" }
    | { aboveTheFold: true; fetchPriority?: "high" | "auto" }
  );
export function Image({
  src,
  alt,
  width,
  height,
  aboveTheFold,
  fetchPriority,
  intrinsicRatio = true,
  style,
  ...props
}: ImageProps) {
  return (
    <img
      {...props}
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={aboveTheFold ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={fetchPriority}
      style={
        intrinsicRatio
          ? { ...style, aspectRatio: `${String(width)} / ${String(height)}` }
          : style
      }
    />
  );
}
