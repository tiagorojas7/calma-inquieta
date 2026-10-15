import { describe, expect, it } from "vitest";
import {
  classifyInputs,
  isSupportedImage,
  outputBaseName,
  planOutputNames,
  variantWidths,
} from "./plan";

describe("variantWidths", () => {
  it("returns every width for a large source", () => {
    expect(variantWidths(4000)).toEqual([480, 960, 1600]);
  });

  it("keeps widths that are not larger than the source", () => {
    expect(variantWidths(1600)).toEqual([480, 960, 1600]);
    expect(variantWidths(1000)).toEqual([480, 960]);
    expect(variantWidths(480)).toEqual([480]);
  });

  it("falls back to the source width when it is narrower than 480", () => {
    expect(variantWidths(300)).toEqual([300]);
  });
});

describe("outputBaseName", () => {
  it("lowercases and replaces runs of other characters with a dash", () => {
    expect(outputBaseName("IMG-20250820-WA0057.jpg")).toBe(
      "img-20250820-wa0057",
    );
    expect(outputBaseName("Mi  foto__final (1).PNG")).toBe("mi-foto-final-1");
  });

  it("strips accents", () => {
    expect(outputBaseName("Meditación Ñandú.jpeg")).toBe("meditacion-nandu");
  });

  it("trims leading and trailing dashes", () => {
    expect(outputBaseName("--hola--.webp")).toBe("hola");
  });
});

describe("isSupportedImage", () => {
  it.each(["a.jpg", "a.JPEG", "a.png", "a.WebP"])("accepts %s", (name) => {
    expect(isSupportedImage(name)).toBe(true);
  });

  it.each(["a.mp4", "a.gif", "a", "jpg"])("rejects %s", (name) => {
    expect(isSupportedImage(name)).toBe(false);
  });
});

describe("planOutputNames", () => {
  it("suffixes colliding names in sorted input order", () => {
    expect(planOutputNames(["b.png", "A.jpg", "a.png", "c.jpg"])).toEqual([
      { source: "A.jpg", base: "a" },
      { source: "a.png", base: "a-2" },
      { source: "b.png", base: "b" },
      { source: "c.jpg", base: "c" },
    ]);
  });

  it("supports a third collision", () => {
    expect(
      planOutputNames(["a b.jpg", "a-b.jpg", "a_b.jpg"]).map((p) => p.base),
    ).toEqual(["a-b", "a-b-2", "a-b-3"]);
  });
});

describe("classifyInputs", () => {
  it("separates supported images from skipped files", () => {
    expect(classifyInputs(["x.mp4", "b.jpg", "a.png"])).toEqual({
      images: [
        { source: "a.png", base: "a" },
        { source: "b.jpg", base: "b" },
      ],
      skipped: ["x.mp4"],
    });
  });
});
