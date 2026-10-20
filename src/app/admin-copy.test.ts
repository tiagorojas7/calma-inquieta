import { describe, expect, it } from "vitest";
import { findCopyViolations } from "~/modules/site-content";
import { PUBLIC_PAGES } from "./site-map";
import { ADMIN_NAV } from "./ui/admin/admin-nav";
import { adminMicrocopy } from "./ui/admin/microcopy";

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function")
    return strings((value as (arg: string) => unknown)("agus@example.com"));
  if (value && typeof value === "object")
    return Object.values(value).flatMap(strings);
  return [];
}

describe("admin copy and discovery rules", () => {
  it("keeps admin microcopy and menu labels in voseo Spanish", () => {
    const scanned = [
      ...strings(adminMicrocopy),
      ...ADMIN_NAV.map((entry) => entry.label),
    ];
    expect(scanned).toContain("No tenés acceso al panel");
    expect(findCopyViolations(scanned)).toEqual([]);
  });

  it("keeps admin paths out of the public site map", () => {
    expect(
      PUBLIC_PAGES.filter((page) => page.path.startsWith("/admin")),
    ).toEqual([]);
  });
});
