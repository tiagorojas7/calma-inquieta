import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const identityCss = readFileSync("src/app/ui/styles/identity.css", "utf8");

describe("identity stylesheet: no template signatures", () => {
  it("does not draw a short rule under every section title", () => {
    expect(identityCss).not.toMatch(/h2\[data-size="h2"\]::after/);
    expect(identityCss).not.toContain("--flourish-from");
  });

  it("does not paint a gradient band along the top edge of cards", () => {
    expect(identityCss).not.toMatch(/\.card-accent::before/);
  });

  it("has no eyebrow kicker styling", () => {
    expect(identityCss).not.toContain(".eyebrow-mark");
  });
});
