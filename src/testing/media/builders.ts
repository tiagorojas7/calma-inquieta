/**
 * Header-only image builders for boundary and corruption cases that real encoders
 * cannot produce (zero or oversized dimensions, trap segments, truncation).
 * Genuine, decodable files live next to this module and load through `fixtures.ts`.
 */
const text = (value: string) => new TextEncoder().encode(value);
const u16be = (value: number) => [(value >> 8) & 0xff, value & 0xff];
const u16le = (value: number) => [value & 0xff, (value >> 8) & 0xff];
const u24le = (value: number) => [
  value & 0xff,
  (value >> 8) & 0xff,
  (value >> 16) & 0xff,
];
const u32be = (value: number) => [
  (value >>> 24) & 0xff,
  (value >> 16) & 0xff,
  (value >> 8) & 0xff,
  value & 0xff,
];

/** Signature plus IHDR chunk. */
export function buildPng(width: number, height: number): Uint8Array {
  return Uint8Array.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...u32be(13),
    ...text("IHDR"),
    ...u32be(width),
    ...u32be(height),
    8,
    2,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ]);
}

const jpegFrame = (marker: number, width: number, height: number) => [
  0xff,
  marker,
  ...u16be(17),
  8,
  ...u16be(height),
  ...u16be(width),
  3,
  1,
  0x22,
  0,
  2,
  0x11,
  1,
  3,
  0x11,
  1,
];

interface JpegOptions {
  readonly progressive?: boolean;
  /** An EXIF-style APP1 segment that embeds a 2x2 thumbnail frame before the real frame. */
  readonly embeddedThumbnail?: boolean;
}

/** SOI, optional trap segment, one frame header, a scan header and EOI. */
export function buildJpeg(
  width: number,
  height: number,
  options: JpegOptions = {},
): Uint8Array {
  const exif = options.embeddedThumbnail
    ? [
        0xff,
        0xe1,
        ...u16be(2 + 6 + 19),
        ...text("Exif\0\0"),
        ...jpegFrame(0xc0, 2, 2),
      ]
    : [];
  return Uint8Array.from([
    0xff,
    0xd8,
    ...exif,
    ...jpegFrame(options.progressive ? 0xc2 : 0xc0, width, height),
    0xff,
    0xda,
    ...u16be(12),
    3,
    1,
    0,
    2,
    0x11,
    3,
    0x11,
    0,
    63,
    0,
    0xff,
    0xd9,
  ]);
}

export type WebpKind = "lossy" | "lossless" | "extended";

/** RIFF container with one image chunk header; the RIFF size is consistent. */
export function buildWebp(
  kind: WebpKind,
  width: number,
  height: number,
): Uint8Array {
  const chunk =
    kind === "lossy"
      ? [
          ...text("VP8 "),
          ...u32le(10),
          0x10,
          0x02,
          0x00,
          0x9d,
          0x01,
          0x2a,
          ...u16le(width),
          ...u16le(height),
        ]
      : kind === "lossless"
        ? [
            ...text("VP8L"),
            ...u32le(5),
            0x2f,
            ...u32le(((width - 1) | ((height - 1) << 14)) >>> 0),
            0,
          ]
        : [
            ...text("VP8X"),
            ...u32le(10),
            0,
            0,
            0,
            0,
            ...u24le(width - 1),
            ...u24le(height - 1),
          ];
  const body = [...text("WEBP"), ...chunk];
  return Uint8Array.from([...text("RIFF"), ...u32le(body.length), ...body]);
}

function u32le(value: number): number[] {
  return [
    value & 0xff,
    (value >> 8) & 0xff,
    (value >> 16) & 0xff,
    (value >>> 24) & 0xff,
  ];
}
