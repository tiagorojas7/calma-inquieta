import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ADMIN_CARD_TITLE,
  ADMIN_SHEET,
  adminFilterClasses,
} from "./admin-sections";

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

  it("titles each list card in the display face, not as a small link", () => {
    expect(ADMIN_CARD_TITLE).toContain("font-display");

    const lists = [
      "workshops-list.tsx",
      "intensives-list.tsx",
      "suppliers-list.tsx",
      "teachers-list.tsx",
      "materials-list.tsx",
      "private-events-list.tsx",
    ];
    const plain = screens.filter(
      ({ name, source }) =>
        lists.includes(name) &&
        !source.includes("className={ADMIN_CARD_TITLE}"),
    );

    expect(plain.map(({ name }) => name)).toEqual([]);
  });

  it("pairs the short fields of every long form", () => {
    const forms = [
      "workshop-form.tsx",
      "workshop-quick-form.tsx",
      "intensive-form.tsx",
      "material-form.tsx",
      "teacher-form.tsx",
      "supplier-form.tsx",
    ];
    const unpaired = screens.filter(
      ({ name, source }) =>
        forms.includes(name) && !source.includes("<AdminFieldPair>"),
    );

    expect(unpaired.map(({ name }) => name)).toEqual([]);
  });

  it("sets the facts of a detail screen on panels", () => {
    const material = screens.find(({ name }) => name === "material-detail.tsx");
    const period = readFileSync(
      new URL("../../routes/admin/workshop-period-detail.tsx", import.meta.url),
      "utf-8",
    );

    expect(material?.source.match(/ADMIN_PANEL/g)?.length).toBeGreaterThan(3);
    expect(period.match(/ADMIN_PANEL/g)?.length).toBeGreaterThan(3);
    expect(period).not.toContain("flex max-w-prose flex-col gap-6");
  });

  it("uses that one filter on every list", () => {
    const plain = screens.filter(({ source }) =>
      /\$\{linkClasses\} \$\{key === filter/.test(source),
    );

    expect(plain.map(({ name }) => name)).toEqual([]);
  });
});
