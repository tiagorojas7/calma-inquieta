import { describe, expect, it, vi } from "vitest";
import { createTestServices } from "~/testing/fakes/app-services";
import { createFakePublicCatalog } from "~/testing/fakes/fake-public-catalog";
import {
  buildPublicIntensivo,
  buildPublicTaller,
  buildPublicTurno,
} from "~/testing/fakes/public-catalog-builders";
import { createLoaderArgs } from "~/testing/react-router";
import { loader, meta } from "./home";

describe("home loader", () => {
  it("maps approved content, empty catalog lists, contact data and site meta", async () => {
    const services = createTestServices();
    const result = await loader(createLoaderArgs(services, "/") as never);
    expect(result.monthly).toEqual([]);
    expect(result.intensivos).toEqual([]);
    expect(result.trustClaims.every((claim) => claim.approved)).toBe(true);
    expect(result.testimonials).toEqual([]);
    expect(result.hero).toBeDefined();
    expect(result.teaser).toBeDefined();
    expect(result.contactBand).toBeDefined();
    expect(result.site).toEqual(services.site);
    expect(result.metaInput.title).toEqual(expect.any(String));
    expect(result.metaInput.description).toEqual(expect.any(String));
    expect(result.metaInput.path).toBe("/");
    expect(result.metaInput.siteName).toBe("Calma Inquieta");
    expect(result.metaInput.baseUrl).toBe(services.site.baseUrl);
    expect(result.metaInput.indexingEnabled).toBe(
      services.site.indexingEnabled,
    );
    const descriptors = meta({ loaderData: result } as never) as readonly {
      title?: string;
    }[];
    expect(descriptors[0]?.title).toContain("Inicio");
  });

  it("builds the LocalBusiness JSON-LD without the provisional number", async () => {
    const services = createTestServices();
    const result = await loader(createLoaderArgs(services, "/") as never);
    const ld = JSON.parse(result.jsonLd) as Record<string, unknown>;
    expect(ld["@type"]).toBe("LocalBusiness");
    expect(ld.url).toBe("https://example.test/");
    expect(result.jsonLd.replace(/\D/g, "")).not.toContain("3510000000");
    expect(ld).not.toHaveProperty("telephone");
  });

  it("reads three talleres and three intensivos from the catalog, in the given order", async () => {
    const talleres = ["a", "b", "c", "d", "e"].map((slug) =>
      buildPublicTaller({ slug, name: `Taller ${slug}` }),
    );
    const intensivos = ["u", "v", "w", "x"].map((slug) =>
      buildPublicIntensivo({ slug }),
    );
    const catalog = createFakePublicCatalog({ talleres, intensivos });
    const talleresList = vi.spyOn(catalog.talleres, "list");
    const intensivosList = vi.spyOn(catalog.intensivos, "list");
    const services = createTestServices({ publicCatalog: catalog });
    const result = await loader(createLoaderArgs(services, "/") as never);
    expect(talleresList).toHaveBeenCalledWith({ limit: 3 });
    expect(intensivosList).toHaveBeenCalledWith({ limit: 3 });
    expect(result.catalogFailed).toBe(false);
    expect(result.monthly.map((card) => card.id)).toEqual(["a", "b", "c"]);
    expect(result.intensivos.map((item) => item.id)).toEqual(["u", "v", "w"]);
    expect(result.monthly[0]?.href).toBe("/talleres/a");
    expect(result.intensivos[0]?.href).toBe("/intensivos/u");
    expect(JSON.stringify(result.monthly)).not.toMatch(/\$|58\.000/u);
  });

  it("maps the turnos and the paused badge of a taller", async () => {
    const catalog = createFakePublicCatalog({
      talleres: [
        buildPublicTaller({
          status: "paused",
          turnos: [
            buildPublicTurno({ weekday: 1 }),
            buildPublicTurno({ weekday: 2 }),
            buildPublicTurno({ weekday: 3 }),
          ],
        }),
      ],
    });
    const services = createTestServices({ publicCatalog: catalog });
    const result = await loader(createLoaderArgs(services, "/") as never);
    expect(result.monthly[0]?.badge).toBe("Inscripciones pausadas");
    expect(result.monthly[0]?.schedule).toContain("y 1 turno más");
  });

  it.each(["talleres", "intensivos"] as const)(
    "survives a failing %s reader: no sections, constant log, no error text",
    async (which) => {
      const catalog = createFakePublicCatalog();
      vi.spyOn(catalog[which], "list").mockRejectedValue(
        new Error("connection refused: secret-host"),
      );
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      const services = createTestServices({ publicCatalog: catalog });
      const result = await loader(createLoaderArgs(services, "/") as never);
      expect(result.catalogFailed).toBe(true);
      expect(result.monthly).toEqual([]);
      expect(result.intensivos).toEqual([]);
      expect(result.hero).toBeDefined();
      expect(result.contactBand).toBeDefined();
      expect(log).toHaveBeenCalledWith("home: catalog read failed");
      expect(JSON.stringify(log.mock.calls)).not.toContain("secret-host");
      log.mockRestore();
    },
  );

  it("still throws when site content fails", async () => {
    const services = createTestServices();
    vi.spyOn(services.siteContent, "getHomePage").mockRejectedValue(
      new Error("content down"),
    );
    await expect(
      loader(createLoaderArgs(services, "/") as never),
    ).rejects.toThrow("content down");
  });
});
