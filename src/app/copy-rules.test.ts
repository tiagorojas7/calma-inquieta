import { describe, expect, it } from "vitest";
import { findCopyViolations } from "~/modules/site-content";
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
});
