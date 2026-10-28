import { describe, expect, it } from "vitest";
import { ADMIN_NAV, isActiveAdminEntry } from "./admin-nav";

describe("admin navigation for attendance", () => {
  it("offers Asistencia and keeps it active under its class pages only", () => {
    const active = (pathname: string) =>
      ADMIN_NAV.filter((entry) => isActiveAdminEntry(entry, pathname)).map(
        (entry) => entry.label,
      );
    expect(ADMIN_NAV).toContainEqual({
      label: "Asistencia",
      href: "/admin/asistencia",
    });
    expect(active("/admin/asistencia")).toEqual(["Asistencia"]);
    expect(active("/admin/asistencia/0b6f7a3e/7c9d1a52")).toEqual([
      "Asistencia",
    ]);
    expect(active("/admin/asistencia-x")).toEqual([]);
  });
});
