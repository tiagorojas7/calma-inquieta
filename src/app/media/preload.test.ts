import { describe, expect, it } from "vitest";
import { artDirectedPreloads } from "./preload";

const options = {
  sizes: "(min-width: 64rem) 28rem, 100vw",
  mobileMedia: "(max-width: 63.999rem)",
  desktopMedia: "(min-width: 64rem)",
};
const image = {
  mobile: { src: "/m.webp", srcSet: "/m-1.webp 800w, /m-2.webp 1200w" },
  desktop: { src: "/d.webp", srcSet: "/d-1.webp 900w" },
};

describe("artDirectedPreloads", () => {
  it("returns two descriptors with the picture srcsets and the shared sizes", () => {
    expect(artDirectedPreloads(image, options)).toEqual([
      {
        tagName: "link",
        rel: "preload",
        as: "image",
        imageSrcSet: image.mobile.srcSet,
        imageSizes: options.sizes,
        media: options.mobileMedia,
        fetchPriority: "high",
      },
      {
        tagName: "link",
        rel: "preload",
        as: "image",
        imageSrcSet: image.desktop.srcSet,
        imageSizes: options.sizes,
        media: options.desktopMedia,
        fetchPriority: "high",
      },
    ]);
  });

  it("media conditions are exact complements", () => {
    const [mobile, desktop] = artDirectedPreloads(image, options);
    expect(mobile?.media).toBe("(max-width: 63.999rem)");
    expect(desktop?.media).toBe("(min-width: 64rem)");
    expect(mobile?.media).not.toBe(desktop?.media);
  });

  it("uses src as a single-candidate imageSrcSet when srcSet is absent", () => {
    const [mobile, desktop] = artDirectedPreloads(
      { mobile: { src: "/m.webp" }, desktop: { src: "/d.webp" } },
      options,
    );
    expect(mobile?.imageSrcSet).toBe("/m.webp");
    expect(desktop?.imageSrcSet).toBe("/d.webp");
  });

  it("both descriptors carry fetchPriority high", () => {
    const all = artDirectedPreloads(image, options);
    expect(all.map((d) => d.fetchPriority)).toEqual(["high", "high"]);
  });
});
