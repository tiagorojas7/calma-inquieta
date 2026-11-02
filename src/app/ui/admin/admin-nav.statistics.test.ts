import { describe, expect, it } from "vitest";
import { ADMIN_NAV, isActiveAdminEntry } from "./admin-nav";

describe("admin navigation for statistics", () => {
  it("lists Estadísticas and keeps it active under its path only", () => {
    expect(ADMIN_NAV).toContainEqual(
      expect.objectContaining({
        label: "Estadísticas",
        href: "/admin/estadisticas",
      }),
    );
    const active = (pathname: string) =>
      ADMIN_NAV.filter((entry) => isActiveAdminEntry(entry, pathname)).map(
        (entry) => entry.label,
      );
    expect(active("/admin/estadisticas")).toEqual(["Estadísticas"]);
    expect(active("/admin/estadisticas-x")).toEqual([]);
  });
});
