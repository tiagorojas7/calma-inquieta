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
};
type Props = Base &
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
  style,
  ...props
}: Props) {
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
      style={{ ...style, aspectRatio: `${String(width)} / ${String(height)}` }}
    />
  );
}
