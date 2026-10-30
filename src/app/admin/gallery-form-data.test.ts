import { describe, expect, it } from "vitest";
import { parseGallery } from "./gallery-form-data";

describe("parseGallery", () => {
  it("pairs each chosen asset with its preview source and alt, in order", () => {
    const data = new FormData();
    data.append("galleryAssetId", "a1");
    data.append("gallerySrc", "/media/a1.jpg");
    data.append("galleryAlt", "Mesa");
    data.append("galleryAssetId", "a2");
    data.append("gallerySrc", "/media/a2.jpg");
    data.append("galleryAlt", "");

    expect(parseGallery(data)).toEqual([
      { assetId: "a1", src: "/media/a1.jpg", alt: "Mesa" },
      { assetId: "a2", src: "/media/a2.jpg", alt: "" },
    ]);
  });

  it("is empty when no image was chosen and ignores file entries", () => {
    const data = new FormData();
    data.append("galleryAssetId", new File(["x"], "x.jpg"));

    expect(parseGallery(new FormData())).toEqual([]);
    expect(parseGallery(data)).toEqual([{ assetId: "", alt: "" }]);
  });
});
