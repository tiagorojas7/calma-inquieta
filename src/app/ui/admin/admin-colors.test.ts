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
