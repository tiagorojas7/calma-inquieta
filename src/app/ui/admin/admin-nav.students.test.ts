import { describe, expect, it } from "vitest";
import { ADMIN_NAV, isActiveAdminEntry } from "./admin-nav";

describe("admin navigation for students", () => {
  it("offers Alumnas and keeps it active under a student page only", () => {
    const active = (pathname: string) =>
      ADMIN_NAV.filter((entry) => isActiveAdminEntry(entry, pathname)).map(
        (entry) => entry.label,
      );
    expect(ADMIN_NAV).toContainEqual(
      expect.objectContaining({
        label: "Alumnas",
        href: "/admin/alumnas",
      }),
    );
    expect(active("/admin/alumnas")).toEqual(["Alumnas"]);
    expect(active("/admin/alumnas/ana%40example.com")).toEqual(["Alumnas"]);
    expect(active("/admin/alumnas-x")).toEqual([]);
  });
});
