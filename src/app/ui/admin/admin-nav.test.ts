import { describe, expect, it } from "vitest";
import {
  ADMIN_NAV,
  ADMIN_NAV_MAIN,
  activeAdminEntry,
  isActiveAdminEntry,
} from "./admin-nav";

describe("five-section admin navigation", () => {
  it("has exactly Hoy, Alumnas, Clases, Materiales and Ajustes, in that order", () => {
    expect(ADMIN_NAV.map((entry) => [entry.label, entry.href])).toEqual([
      ["Hoy", "/admin"],
      ["Alumnas", "/admin/alumnas"],
      ["Clases", "/admin/clases"],
      ["Materiales", "/admin/materiales"],
      ["Ajustes", "/admin/ajustes"],
    ]);
  });

  it("keeps ADMIN_NAV_MAIN as the same five entries", () => {
    expect(ADMIN_NAV_MAIN).toEqual(ADMIN_NAV);
  });

  it("gives every section its own area key and icon", () => {
    expect(new Set(ADMIN_NAV.map((entry) => entry.area)).size).toBe(5);
    expect(new Set(ADMIN_NAV.map((entry) => entry.icon)).size).toBe(5);
    expect(ADMIN_NAV.map((entry) => entry.area)).toEqual([
      "home",
      "students",
      "workshops",
      "materials",
      "settings",
    ]);
  });
});

describe("the active section, also on deep pages", () => {
  const active = (pathname: string) => activeAdminEntry(pathname)?.label;

  it.each([
    ["/admin", "Hoy"],
    ["/admin/novedades", "Hoy"],
    ["/admin/alumnas", "Alumnas"],
    ["/admin/alumnas/ana%40example.com", "Alumnas"],
    ["/admin/inscripciones", "Alumnas"],
    ["/admin/inscripciones/nueva", "Alumnas"],
    ["/admin/inscripciones/e1", "Alumnas"],
    ["/admin/inscripciones/e1/venta-nueva", "Alumnas"],
    ["/admin/clases", "Clases"],
    ["/admin/talleres", "Clases"],
    ["/admin/talleres/nuevo", "Clases"],
    ["/admin/talleres/w1", "Clases"],
    ["/admin/talleres/w1/periodos/2026-11", "Clases"],
    ["/admin/intensivos", "Clases"],
    ["/admin/intensivos/i1/reservas", "Clases"],
    ["/admin/asistencia", "Clases"],
    ["/admin/asistencia/0b6f7a3e/7c9d1a52", "Clases"],
    ["/admin/materiales", "Materiales"],
    ["/admin/materiales/nuevo", "Materiales"],
    ["/admin/materiales/m1", "Materiales"],
    ["/admin/materiales/importar", "Materiales"],
    ["/admin/inscripciones/materiales", "Materiales"],
    ["/admin/ajustes", "Ajustes"],
    ["/admin/profesores", "Ajustes"],
    ["/admin/profesores/p1", "Ajustes"],
    ["/admin/materiales/proveedores", "Ajustes"],
    ["/admin/materiales/proveedores/nuevo", "Ajustes"],
    ["/admin/materiales/proveedores/s1", "Ajustes"],
    ["/admin/politicas", "Ajustes"],
    ["/admin/estadisticas", "Ajustes"],
    ["/admin/eventos", "Ajustes"],
    ["/admin/eventos/ev1", "Ajustes"],
    ["/admin/recordatorios", "Ajustes"],
  ])("%s belongs to %s", (pathname, label) => {
    expect(active(pathname)).toBe(label);
  });

  it("marks Hoy only on the exact panel path or its own pages", () => {
    expect(active("/admin/desconocido")).toBeUndefined();
  });

  it("matches on a segment boundary, so a look-alike path is no section", () => {
    expect(active("/admin/alumnas-x")).toBeUndefined();
    expect(active("/admin/talleres-x")).toBeUndefined();
    expect(active("/admin/ajustes-x")).toBeUndefined();
    expect(active("/admin/materiales-x")).toBeUndefined();
  });

  it("tells isActiveAdminEntry the same thing for one entry", () => {
    const [hoy, alumnas, clases, materiales, ajustes] = ADMIN_NAV;
    if (!hoy || !alumnas || !clases || !materiales || !ajustes)
      throw new Error("five entries expected");
    expect(isActiveAdminEntry(clases, "/admin/talleres/w1")).toBe(true);
    expect(isActiveAdminEntry(ajustes, "/admin/talleres/w1")).toBe(false);
    expect(
      isActiveAdminEntry(materiales, "/admin/materiales/proveedores"),
    ).toBe(false);
    expect(isActiveAdminEntry(ajustes, "/admin/materiales/proveedores")).toBe(
      true,
    );
    expect(isActiveAdminEntry(hoy, "/admin")).toBe(true);
    expect(isActiveAdminEntry(alumnas, "/admin/alumnas-x")).toBe(false);
  });
});
