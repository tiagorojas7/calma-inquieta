import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio, parseColorTokens, relativeLuminance } from "./contrast";
import {
  COLOR_TOKEN_PAIRS,
  type ColorTokenPair,
  RESTRICTED_TOKENS,
} from "./contrast-pairs";

const TOKENS_CSS_PATH = new URL("../styles/tokens.css", import.meta.url);

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

describe("declared color token pairs (design §3.2)", () => {
  const tokens = parseColorTokens(readFileSync(TOKENS_CSS_PATH, "utf8"));

  it("declares exactly the design §3.2 pairs, no more, no less", () => {
    const declared = COLOR_TOKEN_PAIRS.map(pairKey).sort();
    const expected = REFERENCE_RATIOS.map(pairKey).sort();
    expect(declared).toEqual(expected);
  });

  for (const pair of COLOR_TOKEN_PAIRS) {
    const minimum = minimumRatioFor(pair);

    it(`${pair.usage}: ${pair.fg} on ${pair.bg} (${pair.kind}) is at least ${String(minimum)}`, () => {
      const ratio = evaluatePair(pair, tokens);
      expect(
        ratio,
        `${pair.usage}: ${pair.fg} on ${pair.bg} is ${round2(ratio).toFixed(2)}, below ${String(minimum)}`,
      ).toBeGreaterThanOrEqual(minimum);
    });
  }

  it("fails when a pair names an unknown token", () => {
    const unknown: ColorTokenPair = {
      fg: "not-a-token",
      bg: "canvas",
      kind: "text",
      usage: "only used by this test",
    };

    expect(() => evaluatePair(unknown, tokens)).toThrow(
      /unknown color token: not-a-token/,
    );
  });

  it("fails when a restricted token appears in a text pair", () => {
    const restricted: ColorTokenPair = {
      fg: "tan-400",
      bg: "canvas",
      kind: "text",
      usage: "only used by this test",
    };

    expect(() => evaluatePair(restricted, tokens)).toThrow(/restricted/);
  });

  it.each(["text", "large-text", "ui"] as const)(
    "fails when a restricted token appears in a %s pair",
    (kind) => {
      const restricted: ColorTokenPair = {
        fg: "tan-400",
        bg: "canvas",
        kind,
        usage: "only used by this test",
      };

      expect(() => evaluatePair(restricted, tokens)).toThrow(/restricted/);
    },
  );

  it("accepts a restricted token in a decorative pair", () => {
    const decorative: ColorTokenPair = {
      fg: "tan-400",
      bg: "canvas",
      kind: "decorative",
      usage: "only used by this test",
    };

    expect(evaluatePair(decorative, tokens)).toBeGreaterThan(3);
  });

  it("computes the design §3.2 reference ratios to two decimals", () => {
    for (const reference of REFERENCE_RATIOS) {
      const ratio = round2(
        contrastRatio(
          requiredToken(tokens, reference.fg),
          requiredToken(tokens, reference.bg),
        ),
      );

      expect(ratio, `${reference.fg} on ${reference.bg}`).toBe(reference.ratio);
    }
  });

  it("keeps ink-600 on sand-200 (4.12) out of the declared pairs", () => {
    const computed = round2(
      contrastRatio(
        requiredToken(tokens, "ink-600"),
        requiredToken(tokens, "sand-200"),
      ),
    );

    expect(computed).toBe(4.12);
    expect(
      COLOR_TOKEN_PAIRS.some(
        (pair) => pair.fg === "ink-600" && pair.bg === "sand-200",
      ),
    ).toBe(false);
  });

  it("declares tan-400 on canvas as decorative only, not gated", () => {
    const pair = COLOR_TOKEN_PAIRS.find(
      (candidate) => candidate.fg === "tan-400",
    );

    expect(pair?.kind).toBe("decorative");
  });
});

/**
 * The design §3.2 table is the expected outcome: every declared pair with
 * its computed two-decimal ratio, so a formula change or a palette edit that
 * drifts a single value fails this list and names the pair.
 */
const REFERENCE_RATIOS = [
  { fg: "ink-900", bg: "canvas", kind: "text", ratio: 15.86 },
  { fg: "ink-900", bg: "surface", kind: "text", ratio: 17.1 },
  { fg: "ink-900", bg: "sand-200", kind: "text", ratio: 12.12 },
  { fg: "ink-700", bg: "canvas", kind: "text", ratio: 6.26 },
  { fg: "ink-700", bg: "surface", kind: "text", ratio: 6.75 },
  { fg: "ink-700", bg: "sand-100", kind: "text", ratio: 5.52 },
  { fg: "ink-700", bg: "sand-200", kind: "text", ratio: 4.79 },
  { fg: "ink-600", bg: "canvas", kind: "text", ratio: 5.4 },
  { fg: "ink-600", bg: "surface", kind: "text", ratio: 5.82 },
  { fg: "ink-600", bg: "sand-100", kind: "text", ratio: 4.76 },
  { fg: "white", bg: "clay-600", kind: "text", ratio: 5.19 },
  { fg: "white", bg: "clay-700", kind: "text", ratio: 6.23 },
  { fg: "clay-800", bg: "canvas", kind: "text", ratio: 6.85 },
  { fg: "clay-800", bg: "surface", kind: "text", ratio: 7.38 },
  { fg: "clay-800", bg: "sand-100", kind: "text", ratio: 6.04 },
  { fg: "clay-800", bg: "sand-200", kind: "text", ratio: 5.23 },
  { fg: "terracotta-700", bg: "canvas", kind: "text", ratio: 6.23 },
  { fg: "terracotta-700", bg: "surface", kind: "text", ratio: 6.71 },
  { fg: "terracotta-700", bg: "sand-200", kind: "text", ratio: 4.76 },
  { fg: "olive-800", bg: "sage-200", kind: "text", ratio: 6.12 },
  { fg: "clay-600", bg: "canvas", kind: "ui", ratio: 4.81 },
  { fg: "clay-600", bg: "surface", kind: "ui", ratio: 5.19 },
  { fg: "clay-600", bg: "sand-200", kind: "ui", ratio: 3.68 },
  { fg: "clay-800", bg: "canvas", kind: "ui", ratio: 6.85 },
  { fg: "clay-800", bg: "surface", kind: "ui", ratio: 7.38 },
  { fg: "clay-800", bg: "sand-200", kind: "ui", ratio: 5.23 },
  { fg: "canvas", bg: "cocoa-900", kind: "text", ratio: 13.72 },
  { fg: "sand-200", bg: "cocoa-900", kind: "text", ratio: 10.48 },
  { fg: "apricot-300", bg: "cocoa-900", kind: "text", ratio: 8.17 },
  { fg: "cocoa-900", bg: "canvas", kind: "text", ratio: 13.72 },
  { fg: "cocoa-900", bg: "sand-200", kind: "text", ratio: 10.48 },
  { fg: "ink-900", bg: "blush-100", kind: "text", ratio: 14.07 },
  { fg: "ink-700", bg: "blush-100", kind: "text", ratio: 5.56 },
  { fg: "terracotta-700", bg: "blush-100", kind: "text", ratio: 5.53 },
  { fg: "clay-800", bg: "blush-100", kind: "text", ratio: 6.08 },
  { fg: "white", bg: "moss-600", kind: "text", ratio: 6.76 },
  { fg: "white", bg: "moss-700", kind: "text", ratio: 8.4 },
  { fg: "white", bg: "berry-600", kind: "text", ratio: 7.54 },
  { fg: "white", bg: "berry-700", kind: "text", ratio: 10.26 },
  { fg: "moss-600", bg: "canvas", kind: "ui", ratio: 6.27 },
  { fg: "moss-600", bg: "surface", kind: "ui", ratio: 6.76 },
  { fg: "berry-600", bg: "canvas", kind: "ui", ratio: 7 },
  { fg: "berry-600", bg: "surface", kind: "ui", ratio: 7.54 },
  { fg: "tan-400", bg: "canvas", kind: "decorative", ratio: 3.14 },
] as const;

/**
 * Ratio gate per pair kind (design DS2): 4.5 for body text, 3 for large
 * text and UI components, no minimum for decorative pairs.
 */
function minimumRatioFor(pair: ColorTokenPair): number {
  switch (pair.kind) {
    case "text":
      return 4.5;
    case "large-text":
    case "ui":
      return 3;
    case "decorative":
      return 0;
  }
}

/**
 * Gate for one declared pair: throws when a non-decorative pair uses a
 * restricted token (design §3.1) or when either side names a token missing from
 * tokens.css, and returns the pair's contrast ratio otherwise.
 */
function evaluatePair(
  pair: ColorTokenPair,
  tokens: Map<string, string>,
): number {
  if (pair.kind !== "decorative") {
    for (const name of [pair.fg, pair.bg]) {
      if (RESTRICTED_TOKENS.includes(name)) {
        throw new Error(
          `restricted token ${name} in a ${pair.kind} pair: ${pair.fg} on ${pair.bg}`,
        );
      }
    }
  }
  return contrastRatio(
    requiredToken(tokens, pair.fg),
    requiredToken(tokens, pair.bg),
  );
}

function requiredToken(tokens: Map<string, string>, name: string): string {
  const value = tokens.get(name);
  if (value === undefined) {
    throw new Error(`unknown color token: ${name}`);
  }
  return value;
}

function pairKey(pair: {
  fg: string;
  bg: string;
  kind: ColorTokenPair["kind"];
}): string {
  return `${pair.fg} on ${pair.bg} (${pair.kind})`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
