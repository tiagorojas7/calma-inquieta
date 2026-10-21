import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestServices } from "~/testing/fakes/app-services";
import { createFakePublicCatalog } from "~/testing/fakes/fake-public-catalog";
import {
  buildPublicIntensivo,
  buildPublicTaller,
} from "~/testing/fakes/public-catalog-builders";
import { createLoaderArgs } from "~/testing/react-router";
import { loader } from "./sitemap";

const STATIC_LOCS = [
  "<loc>https://example.test/</loc>",
  "<loc>https://example.test/talleres</loc>",
  "<loc>https://example.test/intensivos</loc>",
  "<loc>https://example.test/quienes-somos</loc>",
  "<loc>https://example.test/contacto</loc>",
];

const locs = (body: string) => body.match(/<loc>[^<]+<\/loc>/g);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sitemap resource route", () => {
  it("returns the five indexable pages and excludes coming-soon paths with an empty catalog", async () => {
    const response = await loader(
      createLoaderArgs(createTestServices(), "/sitemap.xml") as never,
    );
    expect(response.headers.get("Content-Type")).toBe(
      "application/xml; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
    const body = await response.text();
    expect(body).toContain("<urlset");
    expect(locs(body)).toEqual(STATIC_LOCS);
    expect(body).not.toContain("/eventos-privados");
    expect(body).not.toContain("/admin");
    expect(body).not.toContain("/status");
  });

  it("lists the visible talleres and intensivos after the static pages, paused ones included", async () => {
    const services = createTestServices({
      publicCatalog: createFakePublicCatalog({
        talleres: [
          buildPublicTaller({ slug: "ceramica", status: "open" }),
          buildPublicTaller({ slug: "telar", status: "paused" }),
        ],
        intensivos: [buildPublicIntensivo({ slug: "tejido-en-un-dia" })],
      }),
    });
    const response = await loader(
      createLoaderArgs(services, "/sitemap.xml") as never,
    );
    expect(locs(await response.text())).toEqual([
      ...STATIC_LOCS,
      "<loc>https://example.test/talleres/ceramica</loc>",
      "<loc>https://example.test/talleres/telar</loc>",
      "<loc>https://example.test/intensivos/tejido-en-un-dia</loc>",
    ]);
  });

  it("escapes slugs in the XML", async () => {
    const services = createTestServices({
      publicCatalog: createFakePublicCatalog({
        talleres: [buildPublicTaller({ slug: "a&b<c" })],
      }),
    });
    const body = await (
      await loader(createLoaderArgs(services, "/sitemap.xml") as never)
    ).text();
    expect(body).toContain("/talleres/a&amp;b%3Cc</loc>");
    expect(body).not.toContain("a&b<c");
  });

  it("degrades to the static entries with a short cache and a constant log line when a reader throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const base = createFakePublicCatalog({
      talleres: [buildPublicTaller({ slug: "ceramica" })],
    });
    const services = createTestServices({
      publicCatalog: {
        talleres: base.talleres,
        intensivos: {
          ...base.intensivos,
          listSlugs: () =>
            Promise.reject(new Error("connect ECONNREFUSED 10.0.0.1:5432")),
        },
      },
    });
    const response = await loader(
      createLoaderArgs(services, "/sitemap.xml") as never,
    );
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(locs(await response.text())).toEqual(STATIC_LOCS);
    expect(log).toHaveBeenCalledExactlyOnceWith("sitemap: catalog read failed");
  });
});
