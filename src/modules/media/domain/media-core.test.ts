import { describe, expect, it } from "vitest";
import { loadFixture, nonImageSamples, padTo } from "~/testing/media/fixtures";
import { buildJpeg, buildPng, buildWebp } from "~/testing/media/builders";
import {
  MAX_IMAGE_BYTES,
  type ImageContentType,
  identifyImage,
  createImageIdentity,
  validateImageBytes,
  imageDimensions,
  galleryCover,
  reorderGallery,
} from "./media-core";

describe("media core", () => {
  describe("sniffing by magic bytes", () => {
    it.each([
      ["fixture.jpg", "image/jpeg"],
      ["fixture-progressive.jpg", "image/jpeg"],
      ["fixture.png", "image/png"],
      ["fixture.webp", "image/webp"],
      ["fixture-lossless.webp", "image/webp"],
      ["fixture-extended.webp", "image/webp"],
    ])("detects the real file %s as %s", (name, type) => {
      const bytes = loadFixture(name);
      expect(identifyImage(bytes)).toBe(type);
      expect(validateImageBytes(bytes)).toEqual({ ok: true, type });
    });

    it.each(nonImageSamples)("rejects %s as unsupported", (_name, bytes) => {
      expect(identifyImage(bytes)).toBeNull();
      expect(validateImageBytes(bytes)).toEqual({
        ok: false,
        error: "unsupported-type",
      });
    });

    it("rejects a WebP whose RIFF size claims more bytes than the file holds", () => {
      const whole = loadFixture("fixture.webp");
      expect(identifyImage(whole.slice(0, whole.length - 1))).toBeNull();
      expect(validateImageBytes(whole.slice(0, 40))).toEqual({
        ok: false,
        error: "unsupported-type",
      });
    });

    it("rejects a WebP whose RIFF size is too small to hold the WEBP fourcc", () => {
      const tampered = loadFixture("fixture.webp").slice();
      new DataView(tampered.buffer).setUint32(4, 0, true);
      expect(identifyImage(tampered)).toBeNull();
    });
  });

  describe("size limit", () => {
    const jpeg = loadFixture("fixture.jpg");

    it("rejects empty bytes", () => {
      expect(validateImageBytes(new Uint8Array())).toEqual({
        ok: false,
        error: "empty",
      });
    });

    it("accepts exactly 5 MiB and rejects one byte more", () => {
      expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
      expect(validateImageBytes(padTo(jpeg, MAX_IMAGE_BYTES))).toEqual({
        ok: true,
        type: "image/jpeg",
      });
      expect(validateImageBytes(padTo(jpeg, MAX_IMAGE_BYTES + 1))).toEqual({
        ok: false,
        error: "too-large",
      });
    });

    it("rejects oversized non-images by size, before sniffing", () => {
      expect(validateImageBytes(new Uint8Array(MAX_IMAGE_BYTES + 1))).toEqual({
        ok: false,
        error: "too-large",
      });
    });
  });

  describe("gallery ordering", () => {
    const gallery = ["a", "b", "c"];

    it("moves an item to index 0 by default, making it the cover", () => {
      const moved = reorderGallery(gallery, 2);
      expect(moved).toEqual(["c", "a", "b"]);
      expect(galleryCover(moved)).toBe("c");
    });

    it.each([
      [0, 2, ["b", "c", "a"]],
      [2, 1, ["a", "c", "b"]],
      [1, 0, ["b", "a", "c"]],
      [1, 1, ["a", "b", "c"]],
    ])("moves index %i to index %i", (from, to, expected) => {
      expect(reorderGallery(gallery, from, to)).toEqual(expected);
    });

    it("changes the cover only when the first position changes", () => {
      expect(galleryCover(reorderGallery(gallery, 2, 1))).toBe("a");
      expect(galleryCover(reorderGallery(gallery, 1))).toBe("b");
    });

    it("never mutates its input", () => {
      const original = ["a", "b", "c"];
      reorderGallery(original, 2);
      expect(original).toEqual(["a", "b", "c"]);
    });

    it("orders a full gallery of six", () => {
      const six = ["a", "b", "c", "d", "e", "f"];
      expect(reorderGallery(six, 5)).toEqual(["f", "a", "b", "c", "d", "e"]);
      expect(reorderGallery(six, 0, 5)).toEqual(["b", "c", "d", "e", "f", "a"]);
    });

    it.each([
      ["a negative source", -1, 0],
      ["a source past the end", 3, 0],
      ["a negative target", 1, -1],
      ["a target past the end", 1, 3],
      ["a fractional source", 1.5, 0],
      ["a fractional target", 2, 0.5],
      ["a NaN source", Number.NaN, 0],
      ["a NaN target", 2, Number.NaN],
      ["an infinite source", Number.POSITIVE_INFINITY, 0],
    ])("leaves the gallery as it is for %s", (_label, from, to) => {
      expect(reorderGallery(gallery, from, to)).toEqual(["a", "b", "c"]);
    });

    it("has no cover when the gallery is empty", () => {
      expect(galleryCover([])).toBeNull();
      expect(reorderGallery([], 0)).toEqual([]);
    });
  });

  describe("dimension parsing", () => {
    it.each([
      ["fixture.jpg", "image/jpeg", 7, 5],
      ["fixture-progressive.jpg", "image/jpeg", 9, 4],
      ["fixture.png", "image/png", 7, 5],
      ["fixture.webp", "image/webp", 7, 5],
      ["fixture-lossless.webp", "image/webp", 6, 3],
      ["fixture-extended.webp", "image/webp", 8, 2],
    ] as const)(
      "reads the exact size of the real file %s",
      (name, type, width, height) => {
        expect(imageDimensions(loadFixture(name), type)).toEqual({
          width,
          height,
        });
      },
    );

    const formats = [
      ["PNG", "image/png", (w: number, h: number) => buildPng(w, h)],
      [
        "JPEG baseline",
        "image/jpeg",
        (w: number, h: number) => buildJpeg(w, h),
      ],
      [
        "JPEG progressive",
        "image/jpeg",
        (w: number, h: number) => buildJpeg(w, h, { progressive: true }),
      ],
      [
        "WebP lossy",
        "image/webp",
        (w: number, h: number) => buildWebp("lossy", w, h),
      ],
      [
        "WebP lossless",
        "image/webp",
        (w: number, h: number) => buildWebp("lossless", w, h),
      ],
      [
        "WebP extended",
        "image/webp",
        (w: number, h: number) => buildWebp("extended", w, h),
      ],
    ] as const;

    describe.each(formats)("%s", (_label, type, build) => {
      it.each([
        [1, 1],
        [300, 200],
        [10000, 10000],
        [1, 10000],
      ])("accepts %i x %i", (width, height) => {
        expect(imageDimensions(build(width, height), type)).toEqual({
          width,
          height,
        });
      });

      it.each([
        [10001, 5],
        [5, 10001],
        [12000, 12000],
      ])("rejects %i x %i as out of range", (width, height) => {
        expect(imageDimensions(build(width, height), type)).toBeNull();
      });
    });

    it.each([
      ["PNG", "image/png", buildPng],
      ["JPEG", "image/jpeg", buildJpeg],
      [
        "WebP lossy",
        "image/webp",
        (w: number, h: number) => buildWebp("lossy", w, h),
      ],
    ] as const)(
      "rejects a zero width or height in %s",
      (_label, type, build) => {
        expect(imageDimensions(build(0, 5), type)).toBeNull();
        expect(imageDimensions(build(5, 0), type)).toBeNull();
      },
    );

    it("does not mistake an EXIF thumbnail frame for the image frame", () => {
      expect(
        imageDimensions(
          buildJpeg(300, 200, { embeddedThumbnail: true }),
          "image/jpeg",
        ),
      ).toEqual({ width: 300, height: 200 });
    });

    it.each([
      ["fill bytes", [0xff]],
      ["a standalone TEM marker", [0xff, 0x01]],
      ["a restart marker", [0xff, 0xd0]],
    ])("skips %s between JPEG segments", (_label, filler) => {
      const jpeg = buildJpeg(300, 200);
      const bytes = Uint8Array.from([
        ...jpeg.slice(0, 2),
        ...filler,
        ...jpeg.slice(2),
      ]);
      expect(imageDimensions(bytes, "image/jpeg")).toEqual({
        width: 300,
        height: 200,
      });
    });

    it("ignores the two scale bits of a lossy WebP width and height", () => {
      const bytes = buildWebp("lossy", 7, 5);
      new DataView(bytes.buffer).setUint16(26, 7 | (1 << 14), true);
      new DataView(bytes.buffer).setUint16(28, 5 | (2 << 14), true);
      expect(imageDimensions(bytes, "image/webp")).toEqual({
        width: 7,
        height: 5,
      });
    });

    it("reads the 14-bit packed size of a lossless WebP", () => {
      expect(
        imageDimensions(buildWebp("lossless", 300, 4000), "image/webp"),
      ).toEqual({ width: 300, height: 4000 });
    });

    const corrupt = (
      label: string,
      type: ImageContentType,
      bytes: Uint8Array,
    ) => [label, type, bytes] as const;
    const lossy = buildWebp("lossy", 7, 5);
    const lossless = buildWebp("lossless", 7, 5);
    const jpeg = buildJpeg(7, 5);
    const png = buildPng(7, 5);
    const patched = (source: Uint8Array, index: number, value: number) =>
      Uint8Array.from(source, (byte, at) => (at === index ? value : byte));
    it.each([
      corrupt("PNG signature only", "image/png", png.slice(0, 8)),
      corrupt("PNG cut inside IHDR", "image/png", png.slice(0, 20)),
      corrupt(
        "PNG first chunk is not IHDR",
        "image/png",
        patched(png, 12, 0x41),
      ),
      corrupt("PNG IHDR length is not 13", "image/png", patched(png, 11, 12)),
      corrupt(
        "JPEG signature only",
        "image/jpeg",
        Uint8Array.from([0xff, 0xd8, 0xff]),
      ),
      corrupt("JPEG frame header cut short", "image/jpeg", jpeg.slice(0, 12)),
      corrupt(
        "JPEG scan starts before any frame",
        "image/jpeg",
        Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0, 4, 0, 0]),
      ),
      corrupt(
        "JPEG ends before any frame",
        "image/jpeg",
        Uint8Array.from([0xff, 0xd8, 0xff, 0xd9, 0, 0, 0, 0, 0, 0]),
      ),
      corrupt(
        "JPEG segment with an impossible length",
        "image/jpeg",
        Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 1, 0, 0, 0, 0]),
      ),
      corrupt(
        "JPEG with a non-marker byte between segments",
        "image/jpeg",
        Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0x12, 0x34, 0, 0]),
      ),
      corrupt(
        "WebP cut before the image chunk payload",
        "image/webp",
        lossy.slice(0, 29),
      ),
      corrupt(
        "WebP with an unknown first chunk",
        "image/webp",
        patched(lossy, 12, 0x41),
      ),
      corrupt(
        "WebP lossy without the start code",
        "image/webp",
        patched(lossy, 24, 0),
      ),
      corrupt(
        "WebP lossless without the signature byte",
        "image/webp",
        patched(lossless, 20, 0),
      ),
    ])("rejects corrupt input: %s", (_label, type, bytes) => {
      expect(imageDimensions(bytes, type)).toBeNull();
    });
  });

  describe("storage identity", () => {
    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    it.each([
      ["image/jpeg", "jpg"],
      ["image/png", "png"],
      ["image/webp", "webp"],
    ] as const)(
      "derives a random id, file name and key for %s",
      (type, extension) => {
        const identity = createImageIdentity(type);
        expect(identity.id).toMatch(uuid);
        expect(identity.fileName).toBe(`${identity.id}.${extension}`);
        expect(identity.key).toBe(`img/${identity.fileName}`);
      },
    );

    it("never repeats an identity", () => {
      const keys = new Set(
        Array.from({ length: 200 }, () => createImageIdentity("image/png").key),
      );
      expect(keys.size).toBe(200);
    });
  });
});
