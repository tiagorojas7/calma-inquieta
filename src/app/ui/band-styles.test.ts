import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const motifsCss = readFileSync("src/app/ui/styles/motifs.css", "utf8");

describe("closing band photo motion", () => {
  it("settles the photo on a scroll timeline, only when motion is allowed and the browser supports it", () => {
    expect(motifsCss).toMatch(
      /@media \(prefers-reduced-motion: no-preference\)\s*\{[\s\S]*@supports \(animation-timeline: view\(\)\)\s*\{[^@]*\.band-photo img\s*\{[^}]*animation-timeline:\s*view\(\)/,
    );
  });

  it("animates the settle with transform only", () => {
    const frames = motifsCss.match(
      /@keyframes band-photo-settle\s*\{([\s\S]*?\}\s*)\}/,
    );

    expect(frames).not.toBeNull();
    const properties = [...(frames?.[1] ?? "").matchAll(/([a-z-]+)\s*:/g)].map(
      (match) => match[1],
    );
    expect(properties.length).toBeGreaterThan(0);
    expect(new Set(properties)).toEqual(new Set(["transform"]));
  });
});
