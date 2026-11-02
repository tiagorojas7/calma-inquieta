import { describe, expect, it } from "vitest";
import { ADMIN_NAV, isActiveAdminEntry } from "./admin-nav";

describe("admin navigation for private events", () => {
  it("lists Eventos privados and keeps it active under its detail pages", () => {
    expect(ADMIN_NAV).toContainEqual(
      expect.objectContaining({
        label: "Eventos privados",
        href: "/admin/eventos",
      }),
    );
    const active = (pathname: string) =>
      ADMIN_NAV.filter((entry) => isActiveAdminEntry(entry, pathname)).map(
        (entry) => entry.label,
      );
    expect(active("/admin/eventos")).toEqual(["Eventos privados"]);
    expect(active("/admin/eventos/0b6f7a3e")).toEqual(["Eventos privados"]);
    expect(active("/admin/eventos-x")).toEqual([]);
  });
});
