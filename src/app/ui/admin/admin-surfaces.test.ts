import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ADMIN_SHEET, adminFilterClasses } from "./admin-sections";

const folder = new URL("./", import.meta.url);
const screens = readdirSync(folder)
  .filter((name) => name.endsWith(".tsx") && !name.includes(".test."))
  .map((name) => ({
    name,
    source: readFileSync(new URL(name, folder), "utf-8"),
  }));

describe("panel surfaces", () => {
  it("lays forms and panels on a raised sheet wider than a text column", () => {
    expect(ADMIN_SHEET).toContain("bg-surface");
    expect(ADMIN_SHEET).toContain("shadow-card");
    expect(ADMIN_SHEET).toContain("max-w-3xl");
  });

  it("leaves no main form as a bare narrow column", () => {
    const bare = screens.filter(({ source }) =>
      /<form method="post" noValidate className="flex max-w-prose/.test(source),
    );

    expect(bare.map(({ name }) => name)).toEqual([]);
  });

  it("tells the active filter apart by its fill, not only its weight", () => {
    expect(adminFilterClasses(true)).toContain("bg-clay-800");
    expect(adminFilterClasses(true)).toContain("text-white");
    expect(adminFilterClasses(false)).toContain("bg-surface");
    expect(adminFilterClasses(false)).toContain("min-h-11");
  });

  it("uses that one filter on every list", () => {
    const plain = screens.filter(({ source }) =>
      /\$\{linkClasses\} \$\{key === filter/.test(source),
    );

    expect(plain.map(({ name }) => name)).toEqual([]);
  });
});
