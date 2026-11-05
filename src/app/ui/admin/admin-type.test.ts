import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adminCss = readFileSync(
  new URL("../styles/admin.css", import.meta.url),
  "utf-8",
);

function rule(selector: string): string {
  const start = adminCss.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  return adminCss.slice(start, adminCss.indexOf("}", start));
}

describe("panel type scale", () => {
  it("uses a working title size, not the public hero size", () => {
    expect(rule(".admin-root h1")).toMatch(/font-size:\s*2\.25rem/);
    expect(rule(".admin-root h2")).toMatch(/font-size:\s*1\.5rem/);
  });

  it("sets subsection titles in the sans face, so they read apart from section titles", () => {
    const h3 = rule(".admin-root h3");

    expect(h3).toMatch(/font-family:\s*var\(--font-body\)/);
    expect(h3).toMatch(/font-weight:\s*700/);
  });

  it("lifts a whole-card link on hover, without moving it when motion is reduced", () => {
    expect(adminCss).toMatch(
      /prefers-reduced-motion: no-preference\)\s*\{\s*\.admin-tap:hover\s*\{[^}]*transform:/,
    );
  });
});
