import { describe, expect, it } from "vitest";
import {
  immutableImageHeaders,
  MAX_GALLERY_IMAGES,
  validateGallery,
  type ImageUseDraft,
} from "./read-models";
import { buildMediaAsset } from "~/testing/fakes/admin-builders";

const ids = (count: number) =>
  Array.from({ length: count }, (_, index) => `asset-${String(index + 1)}`);
const knownOf = (assetIds: readonly string[]) =>
  new Map(assetIds.map((id) => [id, buildMediaAsset({ id })]));
const draftsOf = (assetIds: readonly string[]): ImageUseDraft[] =>
  assetIds.map((assetId) => ({ assetId, alt: `Foto ${assetId}` }));
const issue = (code: string) => ({ field: "images", code });

describe("validateGallery", () => {
  it("allows at most six images", () => {
    expect(MAX_GALLERY_IMAGES).toBe(6);
  });

  it("accepts an empty gallery", () => {
    expect(validateGallery([], new Map())).toEqual({ ok: true, value: [] });
  });

  it("accepts six known images and keeps their order, the first being the cover", () => {
    const all = ids(6);
    const gallery = draftsOf([...all].reverse());
    const result = validateGallery(gallery, knownOf(all));
    expect(result).toEqual({ ok: true, value: gallery });
    expect(result.ok && result.value[0]?.assetId).toBe("asset-6");
  });

  it("refuses a seventh image and leaves the six untouched", () => {
    const all = ids(7);
    const current = draftsOf(all.slice(0, 6));
    const snapshot = structuredClone(current);
    const result = validateGallery(
      [...current, ...draftsOf(all.slice(6))],
      knownOf(all),
    );
    expect(result).toEqual({ ok: false, error: [issue("too-many")] });
    expect(current).toEqual(snapshot);
  });

  it("refuses a duplicated image", () => {
    const gallery = [
      ...draftsOf(["asset-1", "asset-2"]),
      ...draftsOf(["asset-1"]),
    ];
    expect(validateGallery(gallery, knownOf(ids(2)))).toEqual({
      ok: false,
      error: [issue("duplicate")],
    });
  });

  it.each([[""], ["   "], ["\t\n"]])(
    "requires non-blank alt text (%j)",
    (alt) => {
      expect(
        validateGallery([{ assetId: "asset-1", alt }], knownOf(ids(1))),
      ).toEqual({ ok: false, error: [issue("required")] });
    },
  );

  it("reports an unknown reference with the closed issue code", () => {
    expect(
      validateGallery([{ assetId: "missing", alt: "Foto" }], new Map()),
    ).toEqual({ ok: false, error: [issue("unknown-reference")] });
  });

  it("reports every distinct problem in gallery order", () => {
    const result = validateGallery(
      [
        { assetId: "asset-1", alt: "" },
        { assetId: "missing", alt: "Foto" },
        { assetId: "asset-2", alt: "Foto" },
        { assetId: "asset-2", alt: "Foto" },
      ],
      knownOf(ids(2)),
    );
    expect(result).toEqual({
      ok: false,
      error: [
        issue("required"),
        issue("unknown-reference"),
        issue("duplicate"),
      ],
    });
  });

  it("reports too-many together with the other problems", () => {
    const all = ids(7);
    const gallery = [...draftsOf(all), ...draftsOf(["asset-1"])];
    const result = validateGallery(gallery, knownOf(all));
    expect(result).toEqual({
      ok: false,
      error: [issue("too-many"), issue("duplicate")],
    });
  });
});

describe("immutableImageHeaders", () => {
  it.each(["image/jpeg", "image/png", "image/webp"] as const)(
    "serves %s with the stored type, a year-long immutable cache and no sniffing",
    (contentType) => {
      expect(immutableImageHeaders(contentType)).toEqual({
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      });
    },
  );
});
