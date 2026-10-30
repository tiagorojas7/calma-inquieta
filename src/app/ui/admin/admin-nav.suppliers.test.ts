import { describe, expect, it } from "vitest";
import { activeAdminEntry } from "./admin-nav";

describe("admin navigation for suppliers and the materials catalog", () => {
  const active = (pathname: string) => activeAdminEntry(pathname)?.label;

  it("keeps Proveedores active under the suppliers pages", () => {
    expect(active("/admin/materiales/proveedores")).toBe("Proveedores");
    expect(active("/admin/materiales/proveedores/nuevo")).toBe("Proveedores");
    expect(active("/admin/materiales/proveedores/s1")).toBe("Proveedores");
  });

  it("keeps the catalog reachable and active on its own pages", () => {
    expect(active("/admin/materiales")).toBe("Catálogo de materiales");
    expect(active("/admin/materiales/nuevo")).toBe("Catálogo de materiales");
    expect(active("/admin/materiales/m1")).toBe("Catálogo de materiales");
  });
});
