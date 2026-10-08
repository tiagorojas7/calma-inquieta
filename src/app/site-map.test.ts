import { describe, expect, it } from "vitest";
import routes from "./routes";
import { PUBLIC_PAGES } from "./site-map";

const NOT_YET_ROUTED = new Set(["/", "/talleres", "/intensivos", "/eventos-privados", "/quienes-somos", "/contacto"]);

function flatten(routeTree: unknown, parent = ""): string[] {
  if (!Array.isArray(routeTree)) return [];
  return routeTree.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as { path?: string; index?: boolean; children?: unknown[] };
    const path = item.index ? "/" : item.path ? `${parent}/${item.path}`.replaceAll("//", "/") : parent;
    return [path, ...flatten(item.children, path)];
  });
}

describe("public site map", () => {
  it("declares the six menu entries in order and keeps F2 non-indexable", () => {
    expect(PUBLIC_PAGES).toEqual([
      { id: "home", path: "/", label: "Inicio", indexable: false },
      { id: "talleres", path: "/talleres", label: "Talleres", indexable: false },
      { id: "intensivos", path: "/intensivos", label: "Intensivos", indexable: false },
      { id: "eventos-privados", path: "/eventos-privados", label: "Eventos privados", indexable: false },
      { id: "quienes-somos", path: "/quienes-somos", label: "Quiénes somos", indexable: false },
      { id: "contacto", path: "/contacto", label: "Contacto", indexable: false },
    ]);
  });

  it("tracks route fitness without requiring later F2 routes", () => {
    const routed = new Set(flatten(routes));
    const missing = PUBLIC_PAGES.map((page) => page.path).filter((path) => !routed.has(path));
    expect(missing).toEqual([...NOT_YET_ROUTED].filter((path) => !routed.has(path)));
  });
});
