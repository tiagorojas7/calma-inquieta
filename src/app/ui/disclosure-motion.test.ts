import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const motionCss = readFileSync("src/app/ui/styles/motion.css", "utf8");

describe("disclosure entrance", () => {
  it("raises the answer when it opens, only when motion is allowed", () => {
    expect(motionCss).toMatch(
      /@media \(prefers-reduced-motion: no-preference\)\s*\{[^@]*\.disclosure\[open\]\s*>\s*:not\(summary\)\s*\{[^}]*animation:\s*disclosure-rise/,
    );
  });

  it("animates with transform and opacity only", () => {
    const frames = motionCss.match(
      /@keyframes disclosure-rise\s*\{([\s\S]*?\}\s*)\}/,
    );

    expect(frames).not.toBeNull();
    const properties = [...(frames?.[1] ?? "").matchAll(/([a-z-]+)\s*:/g)].map(
      (match) => match[1],
    );
    expect(new Set(properties)).toEqual(new Set(["opacity", "transform"]));
  });
});
