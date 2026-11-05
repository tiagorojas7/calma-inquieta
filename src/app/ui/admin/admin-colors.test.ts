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

  it("keeps body and title text readable on the page and on cards", () => {
    for (const fg of ["ink-900", "ink-700"]) {
      const color = fg === "ink-900" ? "#1f1b18" : "#5e5b57";
      expect(contrastRatio(color, get("admin-page"))).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it("sits on a warm page, like the public site", () => {
    const page = get("admin-page");
    const red = Number.parseInt(page.slice(1, 3), 16);
    const blue = Number.parseInt(page.slice(5, 7), 16);

    expect(red).toBeGreaterThan(blue);
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

describe("admin button colors", () => {
  it.each([
    "admin-danger",
    "admin-danger-hover",
    "admin-success",
    "admin-success-hover",
  ])(
    "keeps white text on %s at AA, and the fill visible on page and cards",
    (token) => {
      expect(contrastRatio("#ffffff", get(token))).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(get(token), get("admin-page")),
      ).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(get(token), "#ffffff")).toBeGreaterThanOrEqual(3);
    },
  );

  it("pins the exact ratios of the green and red fills against white", () => {
    const ratio = (token: string) =>
      Math.round(contrastRatio("#ffffff", get(token)) * 100) / 100;
    expect(ratio("admin-success")).toBe(6.52);
    expect(ratio("admin-success-hover")).toBe(9.11);
    expect(ratio("admin-danger")).toBe(7.54);
    expect(ratio("admin-danger-hover")).toBe(10.26);
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
