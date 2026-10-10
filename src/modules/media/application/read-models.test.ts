import { describe, expect, it } from "vitest";
import { validateGallery } from "./read-models";

describe("validateGallery", () => {
  it("reports unknown references with the closed issue code", () => {
    const result = validateGallery(
      [{ assetId: "missing", alt: "Foto" }],
      new Map(),
    );
    expect(result).toEqual({
      ok: false,
      error: [{ field: "images", code: "unknown-reference" }],
    });
  });
});
