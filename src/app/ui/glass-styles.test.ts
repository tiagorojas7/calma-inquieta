import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const glassCss = readFileSync("src/app/ui/styles/glass.css", "utf8");
const appCss = readFileSync("src/app/ui/styles/app.css", "utf8");

describe("liquid glass stylesheet", () => {
  it("is imported by the global entry", () => {
    expect(appCss).toMatch(/@import\s+"\.\/glass\.css";/);
  });

  it("blurs and saturates what is behind the sheet", () => {
    expect(glassCss).toMatch(/\.glass\s*\{[^}]*backdrop-filter:\s*blur\(/);
    expect(glassCss).toMatch(/-webkit-backdrop-filter:\s*blur\(/);
  });

  it("keeps the tint at 70 % or more so dark text stays AA over any photo", () => {
    const tint = glassCss.match(
      /\.glass\s*\{[^}]*background-color:\s*color-mix\(in srgb,\s*var\(--color-canvas\)\s*(\d+)%/,
    );

    expect(tint).not.toBeNull();
    expect(Number(tint?.[1])).toBeGreaterThanOrEqual(70);
  });

  it("falls back to a near-opaque sheet without backdrop blur and a solid one on request", () => {
    expect(glassCss).toMatch(/@supports not \(\s*\(backdrop-filter:/);
    expect(glassCss).toMatch(
      /@media \(prefers-reduced-transparency: reduce\)\s*\{[^}]*\.glass\s*\{[^}]*background-color:\s*var\(--color-canvas\)/,
    );
  });

  it("holds no colour literal and no gradient: it reads the brand tokens only", () => {
    expect(glassCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(glassCss).not.toMatch(/\brgba?\(/);
    expect(glassCss).not.toMatch(/gradient\(/);
  });
});
