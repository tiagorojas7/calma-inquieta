import { describe, expect, it } from "vitest";
import routes from "./routes";
import { createTestServices } from "~/testing/fakes/app-services";
import { PUBLIC_PAGES } from "./site-map";

const NOT_YET_ROUTED = new Set(["/contacto"]);

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
  it("declares the six menu entries and the F5 contract", () => {
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
        indexable: true,
      },
      {
        id: "contacto",
        path: "/contacto",
        label: "Contacto",
        indexable: false,
      },
    ]);
    const pages = PUBLIC_PAGES as readonly { indexable: boolean }[];
    expect(pages.filter((page) => page.indexable)).toHaveLength(2);
  });

  it("keeps only future static pages unrouted", () => {
    const routed = flatten(routes);
    expect([...NOT_YET_ROUTED]).toEqual(["/contacto"]);
    expect(
      routed
        .filter((entry) => NOT_YET_ROUTED.has(entry.path))
        .every((entry) => entry.file !== "routes/contact.tsx"),
    ).toBe(true);
  });

  it("maps /quienes-somos to the about page module", () => {
    expect(
      flatten(routes).find((entry) => entry.path === "/quienes-somos")?.file,
    ).toBe("routes/about.tsx");
  });

  it("keeps titles and descriptions unique across the existing pages", async () => {
    const { siteContent } = createTestServices();
    const [home, about] = await Promise.all([
      siteContent.getHomePage(),
      siteContent.getAboutPage(),
    ]);
    expect(home.seo.title).not.toBe(about.seo.title);
    expect(home.seo.description).not.toBe(about.seo.description);
  });
});
