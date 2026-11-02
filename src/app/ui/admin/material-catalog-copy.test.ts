import { describe, expect, it } from "vitest";
import { findCopyViolations } from "~/modules/site-content";
import { materialCatalogCopy } from "./material-catalog-copy";

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function")
    return strings((value as (...args: string[]) => unknown)("1", "2", "3"));
  if (value && typeof value === "object")
    return Object.values(value).flatMap(strings);
  return [];
}

describe("material catalog copy", () => {
  it("keeps the catalog tool copy in voseo Spanish", () => {
    const scanned = strings(materialCatalogCopy);
    expect(scanned.length).toBeGreaterThan(0);
    expect(findCopyViolations(scanned)).toEqual([]);
  });
});
