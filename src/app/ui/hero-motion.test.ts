import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const motionCss = readFileSync("src/app/ui/styles/motion.css", "utf8");

describe("hero entrance", () => {
  it("raises each block of the hero copy in turn, only when motion is allowed", () => {
    expect(motionCss).toMatch(
      /@media \(prefers-reduced-motion: no-preference\)\s*\{[\s\S]*\.hero-copy\s*>\s*\*\s*\{[^}]*animation:\s*hero-rise/,
    );
    expect(motionCss).toMatch(/\.hero-copy\s*>\s*:nth-child\(2\)/);
  });

  it("animates the entrance with transform and opacity only", () => {
    const frames = motionCss.match(
      /@keyframes hero-rise\s*\{([\s\S]*?\}\s*)\}/,
    );

    expect(frames).not.toBeNull();
    const properties = [...(frames?.[1] ?? "").matchAll(/([a-z-]+)\s*:/g)].map(
      (match) => match[1],
    );
    expect(new Set(properties)).toEqual(new Set(["opacity", "transform"]));
  });
});
