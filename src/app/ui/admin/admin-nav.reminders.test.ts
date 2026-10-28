import { describe, expect, it } from "vitest";
import { ADMIN_NAV, isActiveAdminEntry } from "./admin-nav";

describe("admin navigation for reminders", () => {
  it("offers Recordatorios and keeps it active on its own path only", () => {
    const active = (pathname: string) =>
      ADMIN_NAV.filter((entry) => isActiveAdminEntry(entry, pathname)).map(
        (entry) => entry.label,
      );
    expect(ADMIN_NAV).toContainEqual({
      label: "Recordatorios",
      href: "/admin/recordatorios",
    });
    expect(active("/admin/recordatorios")).toEqual(["Recordatorios"]);
    expect(active("/admin/recordatorios-x")).toEqual([]);
  });
});
