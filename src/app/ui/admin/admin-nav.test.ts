import { describe, expect, it } from "vitest";
import {
  ADMIN_NAV,
  ADMIN_NAV_MAIN,
  ADMIN_NAV_MORE,
  activeAdminEntry,
} from "./admin-nav";

const labels = (entries: readonly { label: string }[]) =>
  entries.map((entry) => entry.label);

describe("short admin navigation", () => {
  it("has six main entries in the approved order", () => {
    expect(labels(ADMIN_NAV_MAIN)).toEqual([
      "Inicio",
      "Inscripciones",
      "Talleres",
      "Intensivos",
      "Materiales",
      "Asistencia",
    ]);
    expect(ADMIN_NAV_MAIN.map((entry) => entry.href)).toEqual([
      "/admin",
      "/admin/inscripciones",
      "/admin/talleres",
      "/admin/intensivos",
      "/admin/inscripciones/materiales",
      "/admin/asistencia",
    ]);
  });

  it("groups the rest under Más and keeps the catalog reachable", () => {
    expect(labels(ADMIN_NAV_MORE)).toEqual([
      "Profesoras",
      "Proveedores",
      "Alumnas",
      "Eventos privados",
      "Recordatorios",
      "Estadísticas",
      "Catálogo de materiales",
    ]);
  });

  it("lists every area except Inicio in ADMIN_NAV", () => {
    expect(labels(ADMIN_NAV)).not.toContain("Inicio");
    expect(ADMIN_NAV).toHaveLength(
      ADMIN_NAV_MAIN.length - 1 + ADMIN_NAV_MORE.length,
    );
  });

  it("marks Inicio only on the exact panel path", () => {
    expect(activeAdminEntry("/admin")?.label).toBe("Inicio");
    expect(activeAdminEntry("/admin/desconocido")).toBeUndefined();
  });

  it("prefers the most specific entry", () => {
    const active = (path: string) => activeAdminEntry(path)?.label;
    expect(active("/admin/inscripciones")).toBe("Inscripciones");
    expect(active("/admin/inscripciones/abc")).toBe("Inscripciones");
    expect(active("/admin/inscripciones/materiales")).toBe("Materiales");
    expect(active("/admin/profesores/p1")).toBe("Profesoras");
    expect(active("/admin/talleres-x")).toBeUndefined();
  });
});

describe("area identity", () => {
  it("gives every entry an area key and an icon, one of each per area", () => {
    const all = [...ADMIN_NAV_MAIN, ...ADMIN_NAV_MORE];
    expect(all).toHaveLength(13);
    expect(new Set(all.map((entry) => entry.area)).size).toBe(13);
    expect(new Set(all.map((entry) => entry.icon)).size).toBe(13);
  });
});
