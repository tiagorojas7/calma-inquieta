import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adminCss = readFileSync(new URL("./admin.css", import.meta.url), "utf-8");

function block(selector: string): string {
  const start = adminCss.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  return adminCss.slice(start, adminCss.indexOf("}", start));
}

describe("friendly admin base", () => {
  it("raises the base text to 18px with a comfortable line height", () => {
    const root = block(".admin-root");
    expect(root).toMatch(/--text-base:\s*1\.125rem/);
    expect(root).toMatch(/--text-base--line-height:\s*1\.6/);
    expect(root).toMatch(/font-size:\s*1\.125rem/);
    expect(root).toMatch(/line-height:\s*1\.6/);
  });

  it("keeps small text readable: the small step is 16px", () => {
    expect(block(".admin-root")).toMatch(/--text-sm:\s*1rem/);
  });

  it("makes text fields and selects at least 48px tall with large text", () => {
    const rule = adminCss.match(/\.admin-root\s*:is\(([^{}]*)\)\s*\{([^}]*)\}/);
    expect(rule, "controls rule").not.toBeNull();
    const [, selector = "", body = ""] = rule ?? [];
    for (const kind of ["input", "select", "textarea"])
      expect(selector).toContain(kind);
    expect(selector).toMatch(/checkbox/);
    expect(selector).toMatch(/radio/);
    expect(body).toMatch(/min-height:\s*3rem/);
    expect(body).toMatch(/font-size:\s*1\.125rem/);
  });

  it("keeps the warm page and adds no gradient", () => {
    expect(adminCss).toMatch(/--color-admin-page:\s*#f4eee6/);
    expect(adminCss).not.toMatch(/gradient/);
  });
});
