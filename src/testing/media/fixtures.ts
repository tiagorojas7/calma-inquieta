import { readFileSync } from "node:fs";

/** Real, decodable image files kept next to this module. */
export function loadFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(new URL(`./${name}`, import.meta.url)));
}

/** The same image followed by zero bytes, so the file has exactly `size` bytes and still decodes. */
export function padTo(bytes: Uint8Array, size: number): Uint8Array {
  const padded = new Uint8Array(size);
  padded.set(bytes);
  return padded;
}

const text = (value: string) => new TextEncoder().encode(value);
const riff = (form: string, size: number, tail = "") => {
  const bytes = new Uint8Array(12 + tail.length);
  bytes.set(text("RIFF"));
  new DataView(bytes.buffer).setUint32(4, size, true);
  bytes.set(text(form), 8);
  bytes.set(text(tail), 12);
  return bytes;
};

/** Bytes that must never be accepted as an image, whatever file name they arrive under. */
export const nonImageSamples: ReadonlyArray<readonly [string, Uint8Array]> = [
  ["plain text renamed .jpg", text("this is not a photo")],
  [
    "HTML renamed .jpg",
    text("<!doctype html><html><script>alert(1)</script></html>"),
  ],
  [
    "SVG",
    text('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'),
  ],
  [
    "SVG with XML prolog",
    text('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>'),
  ],
  ["GIF87a", text("GIF87a\u0001\u0000\u0001\u0000")],
  ["GIF89a", text("GIF89a\u0001\u0000\u0001\u0000")],
  [
    "GIF header polyglot with a script",
    text("GIF89a<script>alert(1)</script>"),
  ],
  [
    "HTML wrapping JPEG magic",
    Uint8Array.from([...text("<html>"), 0xff, 0xd8, 0xff, 0xe0]),
  ],
  [
    "HEIC",
    Uint8Array.from([
      0,
      0,
      0,
      0x18,
      ...text("ftypheic"),
      0,
      0,
      0,
      0,
      ...text("mif1heic"),
    ]),
  ],
  ["BMP", text("BM\u0000\u0000\u0000\u0000\u0000\u0000")],
  ["PDF", text("%PDF-1.7\n")],
  ["RIFF WAVE", riff("WAVE", 4, "fmt ")],
  ["RIFF AVI", riff("AVI ", 4, "LIST")],
  ["JPEG cut after two bytes", Uint8Array.from([0xff, 0xd8])],
  [
    "PNG signature cut at seven bytes",
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a]),
  ],
  ["RIFF cut before the form type", text("RIFF\u0000\u0000\u0000\u0000WEB")],
];
