import { describe, expect, it } from "vitest";
import routes from "./routes";
import { createTestServices } from "~/testing/fakes/app-services";
import { createFakePublicCatalog } from "~/testing/fakes/fake-public-catalog";
import {
  buildPublicIntensivo,
  buildPublicTaller,
} from "~/testing/fakes/public-catalog-builders";
import { createLoaderArgs } from "~/testing/react-router";
import { loader as intensivoLoader } from "./routes/intensivo";
import { loader as tallerLoader } from "./routes/taller";
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
        indexable: true,
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
    expect(pages.filter((page) => page.indexable)).toHaveLength(5);
  });

  it("leaves no public page unrouted", () => {
    const routed = flatten(routes).map((entry) => entry.path);
    expect(NOT_YET_ROUTED).toEqual([]);
    expect(PUBLIC_PAGES.filter((page) => !routed.includes(page.path))).toEqual(
      [],
    );
  });

  it("maps /talleres and /talleres/:slug to the catalog modules", () => {
    const entries = flatten(routes);
    expect(entries.find((entry) => entry.path === "/talleres")?.file).toBe(
      "routes/talleres.tsx",
    );
    expect(
      entries.find((entry) => entry.path === "/talleres/:slug")?.file,
    ).toBe("routes/taller.tsx");
  });

  it("maps /intensivos and /intensivos/:slug to the catalog modules", () => {
    const entries = flatten(routes);
    expect(entries.find((entry) => entry.path === "/intensivos")?.file).toBe(
      "routes/intensivos.tsx",
    );
    expect(
      entries.find((entry) => entry.path === "/intensivos/:slug")?.file,
    ).toBe("routes/intensivo.tsx");
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

  it("keeps titles and descriptions unique across the pages and two details of each catalog", async () => {
    const services = createTestServices({
      publicCatalog: createFakePublicCatalog({
        talleres: [
          buildPublicTaller({
            slug: "uno",
            name: "Taller Uno",
            summary: "Primer resumen de taller.",
          }),
          buildPublicTaller({
            slug: "dos",
            name: "Taller Dos",
            summary: "Segundo resumen de taller.",
          }),
        ],
        intensivos: [
          buildPublicIntensivo({
            slug: "uno",
            name: "Intensivo Uno",
            summary: "Primer resumen.",
          }),
          buildPublicIntensivo({
            slug: "dos",
            name: "Intensivo Dos",
            summary: "Segundo resumen.",
          }),
        ],
      }),
    });
    const { siteContent } = services;
    const [home, about, contact, eventos, catalog] = await Promise.all([
      siteContent.getHomePage(),
      siteContent.getAboutPage(),
      siteContent.getContactPage(),
      siteContent.getComingSoonPage("eventos-privados"),
      siteContent.getCatalogContent(),
    ]);
    const seo = [
      home,
      about,
      contact,
      eventos,
      catalog.talleres,
      catalog.intensivos,
    ].map((page) => page.seo);
    const loaders = [
      { base: "intensivos", load: intensivoLoader },
      { base: "talleres", load: tallerLoader },
    ];
    const details = await Promise.all(
      loaders.flatMap(({ base, load }) =>
        ["uno", "dos"].map(async (slug) => {
          const result = await load({
            ...createLoaderArgs(services, `/${base}/${slug}`),
            params: { slug },
          } as never);
          return {
            title: result.metaInput.title,
            description: result.metaInput.description,
          };
        }),
      ),
    );
    const all = [...seo, ...details];
    expect(new Set(all.map((entry) => entry.title)).size).toBe(10);
    expect(new Set(all.map((entry) => entry.description)).size).toBe(10);
  });

  it("lists exactly the five indexable pages in the sitemap", () => {
    const xml = buildSitemapXml(
      "https://example.test",
      PUBLIC_PAGES.filter((page) => page.indexable).map((page) => page.path),
    );
    expect(xml.match(/<loc>[^<]+<\/loc>/g)).toEqual([
      "<loc>https://example.test/</loc>",
      "<loc>https://example.test/talleres</loc>",
      "<loc>https://example.test/intensivos</loc>",
      "<loc>https://example.test/quienes-somos</loc>",
      "<loc>https://example.test/contacto</loc>",
    ]);
  });
});
