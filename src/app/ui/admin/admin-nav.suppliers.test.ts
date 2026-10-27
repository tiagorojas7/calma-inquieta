import { describe, expect, it } from "vitest";
import { ADMIN_NAV, isActiveAdminEntry } from "./admin-nav";

describe("admin navigation for suppliers", () => {
  it("keeps Materiales as the active entry under the suppliers pages", () => {
    const active = (pathname: string) =>
      ADMIN_NAV.filter((entry) => isActiveAdminEntry(entry, pathname)).map(
        (entry) => entry.label,
      );
    expect(active("/admin/materiales/proveedores")).toEqual(["Materiales"]);
    expect(active("/admin/materiales/proveedores/nuevo")).toEqual([
      "Materiales",
    ]);
    expect(active("/admin/materiales/proveedores/s1")).toEqual(["Materiales"]);
  });
});
