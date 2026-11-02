import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio, parseColorTokens } from "../tokens/contrast";

const adminCss = readFileSync(
  new URL("../styles/admin.css", import.meta.url),
  "utf-8",
);
const tokens = parseColorTokens(adminCss);
const get = (name: string) => {
  const value = tokens.get(name);
  if (!value) throw new Error(`missing token ${name}`);
  return value;
};

describe("admin status palette", () => {
  it.each(["orange", "green", "blue", "teal", "grey", "neutral"])(
    "keeps the %s chip text at WCAG AA on its fill",
    (tone) => {
      expect(
        contrastRatio(get(`status-${tone}-fg`), get(`status-${tone}-bg`)),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("keeps body and title text readable on the grey page and on cards", () => {
    for (const fg of ["ink-900", "ink-700"]) {
      const color = fg === "ink-900" ? "#1f1b18" : "#5e5b57";
      expect(contrastRatio(color, get("admin-page"))).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it("separates cards from the page with a visible border", () => {
    expect(contrastRatio(get("admin-line"), get("admin-page"))).toBeGreaterThan(
      1.2,
    );
    expect(contrastRatio("#ffffff", get("admin-page"))).toBeGreaterThan(1.1);
  });

  it("keeps the danger button text at AA", () => {
    expect(
      contrastRatio(get("admin-danger"), "#ffffff"),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

/** CIE Lab distance (ΔE76): how far apart two colors look. */
function lab(hex: string) {
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [channel(1), channel(3), channel(5)] as const;
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))] as const;
}
function distance(a: string, b: string) {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

const AREAS = [
  "home",
  "enrollments",
  "workshops",
  "intensives",
  "materials",
  "attendance",
  "teachers",
  "suppliers",
  "students",
  "events",
  "reminders",
  "statistics",
  "catalog",
];
const STATUS = ["orange", "green", "blue", "teal", "grey"];

describe("admin area palette", () => {
  it("defines a tint and a strong color for every area", () => {
    for (const area of AREAS) {
      expect(tokens.has(`area-${area}-bg`)).toBe(true);
      expect(tokens.has(`area-${area}-fg`)).toBe(true);
    }
  });

  it.each(AREAS)(
    "keeps the %s icon and text at WCAG AA on its tint, on cards and on the page",
    (area) => {
      const fg = get(`area-${area}-fg`);
      expect(contrastRatio(fg, get(`area-${area}-bg`))).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrastRatio(fg, "#ffffff")).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(fg, get("admin-page"))).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio("#1f1b18", get(`area-${area}-bg`)),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(AREAS)("keeps %s visibly apart from the status colors", (area) => {
    for (const tone of STATUS) {
      expect(
        distance(get(`area-${area}-bg`), get(`status-${tone}-bg`)),
      ).toBeGreaterThanOrEqual(8);
      expect(
        distance(get(`area-${area}-fg`), get(`status-${tone}-fg`)),
      ).toBeGreaterThanOrEqual(10);
    }
  });

  it("gives every area its own color", () => {
    for (const [i, first] of AREAS.entries()) {
      for (const second of AREAS.slice(i + 1)) {
        expect(
          distance(get(`area-${first}-fg`), get(`area-${second}-fg`)),
        ).toBeGreaterThanOrEqual(9);
      }
    }
  });
});
