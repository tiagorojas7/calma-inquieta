import { describe, expect, it } from "vitest";
import { ADMIN_NAV, ADMIN_NAV_MORE, isActiveAdminEntry } from "./admin-nav";

describe("admin navigation for the site policies", () => {
  it("lists Políticas in the More group, a plain link to its page", () => {
    expect(ADMIN_NAV_MORE).toContainEqual(
      expect.objectContaining({ label: "Políticas", href: "/admin/politicas" }),
    );
    const active = (pathname: string) =>
      ADMIN_NAV.filter((entry) => isActiveAdminEntry(entry, pathname)).map(
        (entry) => entry.label,
      );
    expect(active("/admin/politicas")).toEqual(["Políticas"]);
    expect(active("/admin/politicas-x")).toEqual([]);
  });
});
