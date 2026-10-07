import { describe, expect, it } from "vitest";
import { contrastRatio, parseColorTokens, relativeLuminance } from "./contrast";

describe("relativeLuminance", () => {
  it("is 0 for pure black", () => {
    expect(relativeLuminance("#000000")).toBe(0);
  });

  it("is 1 for pure white", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 10);
  });

  it("accepts 3-digit and 6-digit hex in any case", () => {
    expect(relativeLuminance("#fff")).toBeCloseTo(1, 10);
    expect(relativeLuminance("#FfF")).toBeCloseTo(1, 10);
    expect(relativeLuminance("#000")).toBe(0);
    expect(relativeLuminance("#8a654c")).toBe(relativeLuminance("#8A654C"));
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 10);
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 10);
  });

  it("is 1 for identical colors", () => {
    expect(contrastRatio("#8A654C", "#8a654c")).toBe(1);
  });

  it("is order-independent", () => {
    expect(contrastRatio("#1F1B18", "#F9F6F1")).toBeCloseTo(
      contrastRatio("#F9F6F1", "#1F1B18"),
      10,
    );
  });
});

describe("parseColorTokens", () => {
  it("reads --color-<name>: #rrggbb pairs into a Map by token name", () => {
    const css = `
      @theme {
        --color-canvas: #F9F6F1;
        --color-clay-600: #8A654C;
      }
    `;
    const tokens = parseColorTokens(css);

    expect(tokens).toBeInstanceOf(Map);
    expect(tokens.get("canvas")).toBe("#F9F6F1");
    expect(tokens.get("clay-600")).toBe("#8A654C");
  });

  it("ignores the initial reset, comments and non-color variables", () => {
    const css = `
      /* --color-commented: #123456; must not count */
      @theme {
        --color-*: initial;
        --color-sand-200: #E6D7C4;
        --spacing-section: 3rem;
        --font-display: Georgia, serif;
      }
    `;
    const tokens = parseColorTokens(css);

    expect(tokens.has("commented")).toBe(false);
    expect(tokens.has("*")).toBe(false);
    expect(tokens.has("spacing-section")).toBe(false);
    expect(tokens.has("font-display")).toBe(false);
    expect(tokens.get("sand-200")).toBe("#E6D7C4");
  });
});
