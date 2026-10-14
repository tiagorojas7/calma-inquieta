export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export type ImageContentType = "image/jpeg" | "image/png" | "image/webp";
export type ImageValidationError =
  "empty" | "too-large" | "unsupported-type" | "unreadable-dimensions";

const startsWith = (bytes: Uint8Array, signature: number[]) =>
  signature.every((byte, index) => bytes[index] === byte);

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

/** Decides the type from the first bytes only; names and declared types never reach this module. */
export function identifyImage(bytes: Uint8Array): ImageContentType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return "image/png";
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 12) === "WEBP"
  ) {
    const riffSize = new DataView(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    ).getUint32(4, true);
    return riffSize >= 4 && riffSize + 8 <= bytes.length ? "image/webp" : null;
  }
  return null;
}

export function validateImageBytes(
  bytes: Uint8Array,
):
  | { ok: true; type: ImageContentType }
  | { ok: false; error: ImageValidationError } {
  if (bytes.length === 0) return { ok: false, error: "empty" };
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: "too-large" };
  const type = identifyImage(bytes);
  return type ? { ok: true, type } : { ok: false, error: "unsupported-type" };
}

const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

/** Random identity of a stored image. The uploaded file name never takes part in it. */
export function createImageIdentity(type: ImageContentType) {
  const id = crypto.randomUUID();
  const fileName = `${id}.${EXTENSIONS[type]}`;
  return { id, fileName, key: `img/${fileName}` };
}

const isIndexOf = (items: readonly unknown[], index: number) =>
  Number.isInteger(index) && index >= 0 && index < items.length;

/** The first image is the cover. */
export function galleryCover<T>(items: readonly T[]): T | null {
  return items[0] ?? null;
}

/** Moves one image (to the cover by default). Any index that is not a position in the gallery leaves it as it is. */
export function reorderGallery<T>(
  items: readonly T[],
  fromIndex: number,
  toIndex = 0,
): readonly T[] {
  if (!isIndexOf(items, fromIndex) || !isIndexOf(items, toIndex)) return items;
  const copy = [...items];
  copy.splice(toIndex, 0, ...copy.splice(fromIndex, 1));
  return copy;
}

const MAX_SIDE = 10000;
const bounded = (width: number, height: number) =>
  width >= 1 && width <= MAX_SIDE && height >= 1 && height <= MAX_SIDE
    ? { width, height }
    : null;
const viewOf = (bytes: Uint8Array) =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const u24le = (view: DataView, offset: number) =>
  view.getUint16(offset, true) | (view.getUint8(offset + 2) << 16);

function pngDimensions(bytes: Uint8Array) {
  if (bytes.length < 24) return null;
  const view = viewOf(bytes);
  if (view.getUint32(8) !== 13 || ascii(bytes, 12, 16) !== "IHDR") return null;
  return bounded(view.getUint32(16), view.getUint32(20));
}

function webpDimensions(bytes: Uint8Array) {
  if (bytes.length < 25) return null;
  const view = viewOf(bytes);
  const chunk = ascii(bytes, 12, 16);
  if (chunk === "VP8X" && bytes.length >= 30)
    return bounded(1 + u24le(view, 24), 1 + u24le(view, 27));
  if (
    chunk === "VP8 " &&
    bytes.length >= 30 &&
    startsWith(bytes.subarray(23), [0x9d, 0x01, 0x2a])
  )
    return bounded(
      view.getUint16(26, true) & 0x3fff,
      view.getUint16(28, true) & 0x3fff,
    );
  if (chunk === "VP8L" && view.getUint8(20) === 0x2f) {
    const packed = view.getUint32(21, true);
    return bounded((packed & 0x3fff) + 1, ((packed >>> 14) & 0x3fff) + 1);
  }
  return null;
}

const JPEG_FRAMES = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

/** Walks the segments, so frames embedded in EXIF thumbnails are skipped with their segment. */
function jpegDimensions(bytes: Uint8Array) {
  const view = viewOf(bytes);
  let at = 2;
  while (at + 4 <= bytes.length) {
    if (view.getUint8(at) !== 0xff) return null;
    const marker = view.getUint8(at + 1);
    if (marker === 0xff) {
      at++;
      continue;
    }
    if (marker === 0x00 || marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      at += 2;
      continue;
    }
    const length = view.getUint16(at + 2);
    if (length < 2 || at + 2 + length > bytes.length) return null;
    if (JPEG_FRAMES.has(marker))
      return length >= 11
        ? bounded(view.getUint16(at + 7), view.getUint16(at + 5))
        : null;
    at += 2 + length;
  }
  return null;
}

/** Reads width and height from the header bytes; null when absent, corrupt or outside 1 to 10000. */
export function imageDimensions(
  bytes: Uint8Array,
  type: ImageContentType,
): { width: number; height: number } | null {
  if (type === "image/png") return pngDimensions(bytes);
  if (type === "image/webp") return webpDimensions(bytes);
  return jpegDimensions(bytes);
}
