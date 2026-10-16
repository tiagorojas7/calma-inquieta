import { describe, expect, it } from "vitest";
import routes from "./routes";
import { createTestServices } from "~/testing/fakes/app-services";
import { buildSitemapXml } from "./seo/sitemap";
import { PUBLIC_PAGES } from "./site-map";

const NOT_YET_ROUTED: string[] = [];

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
  it("declares the six menu entries and the F7 contract", () => {
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
        indexable: true,
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
        indexable: true,
      },
    ]);
    const pages = PUBLIC_PAGES as readonly { indexable: boolean }[];
    expect(pages.filter((page) => page.indexable)).toHaveLength(4);
  });

  it("leaves no public page unrouted", () => {
    const routed = flatten(routes).map((entry) => entry.path);
    expect(NOT_YET_ROUTED).toEqual([]);
    expect(PUBLIC_PAGES.filter((page) => !routed.includes(page.path))).toEqual(
      [],
    );
  });

  it("maps /intensivos to the intensivos listing module", () => {
    expect(
      flatten(routes).find((entry) => entry.path === "/intensivos")?.file,
    ).toBe("routes/intensivos.tsx");
  });

  it("maps /contacto to the contact page module", () => {
    expect(
      flatten(routes).find((entry) => entry.path === "/contacto")?.file,
    ).toBe("routes/contact.tsx");
  });

  it("maps /quienes-somos to the about page module", () => {
    expect(
      flatten(routes).find((entry) => entry.path === "/quienes-somos")?.file,
    ).toBe("routes/about.tsx");
  });

  it("keeps titles and descriptions unique across the six pages", async () => {
    const { siteContent } = createTestServices();
    const [home, about, contact, talleres, eventos, catalog] =
      await Promise.all([
        siteContent.getHomePage(),
        siteContent.getAboutPage(),
        siteContent.getContactPage(),
        siteContent.getComingSoonPage("talleres"),
        siteContent.getComingSoonPage("eventos-privados"),
        siteContent.getCatalogContent(),
      ]);
    const seo = [
      home,
      about,
      contact,
      talleres,
      eventos,
      catalog.intensivos,
    ].map((page) => page.seo);
    expect(new Set(seo.map((entry) => entry.title)).size).toBe(6);
    expect(new Set(seo.map((entry) => entry.description)).size).toBe(6);
  });

  it("lists exactly the four indexable pages in the sitemap", () => {
    const xml = buildSitemapXml(
      "https://example.test",
      PUBLIC_PAGES.filter((page) => page.indexable).map((page) => page.path),
    );
    expect(xml.match(/<loc>[^<]+<\/loc>/g)).toEqual([
      "<loc>https://example.test/</loc>",
      "<loc>https://example.test/intensivos</loc>",
      "<loc>https://example.test/quienes-somos</loc>",
      "<loc>https://example.test/contacto</loc>",
    ]);
  });
});
