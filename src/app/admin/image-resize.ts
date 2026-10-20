/** Longest side, in pixels, of an image sent to the server (design AC8). */
export const MAX_LONG_EDGE = 2400;
const QUALITY = 0.85;

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface DecodedImage extends Size {
  /** Drawable pixels; absent only in tests that never reach a canvas. */
  readonly source?: CanvasImageSource;
  release(): void;
}

/** Browser seams, so the resize rules are testable without a canvas. */
export interface ResizeEnv {
  decode(file: Blob): Promise<DecodedImage>;
  encode(
    image: DecodedImage,
    size: Size,
    type: "image/webp" | "image/jpeg",
    quality: number,
  ): Promise<Blob | null>;
}

export type ResizeResult =
  | { readonly ok: true; readonly blob: Blob }
  | { readonly ok: false; readonly error: "unsupported-format" };

export function fitWithin(width: number, height: number): Size {
  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Applies orientation, caps the long edge and re-encodes, which also drops
 * EXIF (GPS included). WebP is tried first and accepted only when the browser
 * really produced WebP; otherwise the image is re-encoded as JPEG.
 */
export async function resizeForUpload(
  file: Blob,
  env: ResizeEnv = browserResizeEnv,
): Promise<ResizeResult> {
  let image: DecodedImage;
  try {
    image = await env.decode(file);
  } catch {
    return { ok: false, error: "unsupported-format" };
  }
  try {
    const size = fitWithin(image.width, image.height);
    const webp = await env.encode(image, size, "image/webp", QUALITY);
    if (webp?.type === "image/webp") return { ok: true, blob: webp };
    const jpeg = await env.encode(image, size, "image/jpeg", QUALITY);
    return jpeg?.type === "image/jpeg"
      ? { ok: true, blob: jpeg }
      : { ok: false, error: "unsupported-format" };
  } catch {
    return { ok: false, error: "unsupported-format" };
  } finally {
    image.release();
  }
}

/** Real browser implementation: `createImageBitmap` plus a canvas. */
export const browserResizeEnv: ResizeEnv = {
  async decode(file) {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    return {
      width: bitmap.width,
      height: bitmap.height,
      source: bitmap,
      release: () => {
        bitmap.close();
      },
    };
  },
  async encode(image, size, type, quality) {
    if (!image.source) return null;
    if (typeof OffscreenCanvas === "function") {
      const canvas = new OffscreenCanvas(size.width, size.height);
      canvas
        .getContext("2d")
        ?.drawImage(image.source, 0, 0, size.width, size.height);
      return canvas.convertToBlob({ type, quality });
    }
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    canvas
      .getContext("2d")
      ?.drawImage(image.source, 0, 0, size.width, size.height);
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, type, quality);
    });
  },
};
