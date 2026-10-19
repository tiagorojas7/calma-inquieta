import { readFileSync } from "node:fs";

export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

/** Width and height of a PNG, read from its IHDR chunk. */
export function pngSize(path: string): ImageSize {
  const bytes = readFileSync(path);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** Width and height of a baseline or progressive JPEG, read from its SOF marker. */
export function jpegSize(path: string): ImageSize {
  const bytes = readFileSync(path);
  let offset = 2;
  while (offset < bytes.length) {
    const marker = bytes.readUInt8(offset + 1);
    const length = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  throw new Error(`no SOF marker in the JPEG ${path}`);
}

/** Width and height of a WebP, read from its VP8 (lossy), VP8L (lossless) or VP8X (extended) chunk. */
export function webpSize(path: string): ImageSize {
  const bytes = readFileSync(path);
  if (
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error(`not a WebP file: ${path}`);
  }
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return {
      width: bytes.readUIntLE(24, 3) + 1,
      height: bytes.readUIntLE(27, 3) + 1,
    };
  }
  throw new Error(`unknown WebP chunk "${chunk}" in ${path}`);
}

/** Dimensions of a PNG, JPEG or WebP file, chosen by its extension. */
export function imageSize(path: string): ImageSize {
  if (path.endsWith(".png")) {
    return pngSize(path);
  }
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
    return jpegSize(path);
  }
  if (path.endsWith(".webp")) {
    return webpSize(path);
  }
  throw new Error(`no size reader for ${path}`);
}
