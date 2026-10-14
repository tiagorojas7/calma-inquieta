import { describe, expect, it } from "vitest";
import { findCopyViolations } from "~/modules/site-content";
import { CATALOG_FORMAT_TEXT } from "./catalog/format";
import { PUBLIC_PAGES } from "./site-map";
import { microcopy } from "./ui/microcopy";

describe("public copy rules", () => {
  it("keeps UI microcopy and menu labels in voseo Spanish", () => {
    const values = Object.values(microcopy).flatMap((value) =>
      typeof value === "string" ? [value] : [],
    );
    expect(
      findCopyViolations([
        ...values,
        ...PUBLIC_PAGES.map((page) => page.label),
      ]),
    ).toEqual([]);
  });

  it("keeps the catalog formatter names and unit words in voseo Spanish", () => {
    const strings = Object.values(CATALOG_FORMAT_TEXT).flat();
    // Guard against an empty scan: every table must contribute real strings.
    expect(strings).toContain("Miércoles");
    expect(strings).toContain("noviembre");
    expect(strings).toContain("horas");
    expect(findCopyViolations(strings)).toEqual([]);
  });
});
