import { describe, expect, it } from "vitest";
import routes from "./routes";
import { PUBLIC_PAGES } from "./site-map";

const NOT_YET_ROUTED = new Set(["/quienes-somos", "/contacto"]);

function flatten(
  routeTree: unknown,
  parent = "",
): { path: string; file: string }[] {
  if (!Array.isArray(routeTree)) return [];
  return routeTree.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as {
      path?: string;
      index?: boolean;
      children?: unknown[];
      file: unknown;
    };
    const path = item.index
      ? "/"
      : item.path
        ? `${parent}/${item.path}`.replaceAll("//", "/")
        : parent;
    const file = typeof item.file === "string" ? item.file : "";
    return [{ path, file }, ...flatten(item.children, path)];
  });
}

describe("public site map", () => {
  it("declares the six menu entries and the F2 contract", () => {
    expect(PUBLIC_PAGES).toEqual([
      { id: "home", path: "/", label: "Inicio", indexable: true },
      {
        id: "talleres",
        path: "/talleres",
        label: "Talleres",
        indexable: false,
      },
      {
        id: "intensivos",
        path: "/intensivos",
        label: "Intensivos",
        indexable: false,
      },
      {
        id: "eventos-privados",
        path: "/eventos-privados",
        label: "Eventos privados",
        indexable: false,
      },
      {
        id: "quienes-somos",
        path: "/quienes-somos",
        label: "Quiénes somos",
        indexable: false,
      },
      {
        id: "contacto",
        path: "/contacto",
        label: "Contacto",
        indexable: false,
      },
    ]);
    const pages = PUBLIC_PAGES as readonly { indexable: boolean }[];
    expect(pages.filter((page) => page.indexable)).toHaveLength(1);
  });

  it("keeps only future static pages unrouted", () => {
    const routed = flatten(routes);
    expect([...NOT_YET_ROUTED]).toEqual(["/quienes-somos", "/contacto"]);
    expect(
      routed
        .filter((entry) => NOT_YET_ROUTED.has(entry.path))
        .every(
          (entry) =>
            entry.file !== "routes/about.tsx" &&
            entry.file !== "routes/contact.tsx",
        ),
    ).toBe(true);
  });
});
