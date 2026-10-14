import { describe, expect, it } from "vitest";
import { createFakePublicCatalog } from "./fake-public-catalog";
import {
  buildPublicImage,
  buildPublicIntensivo,
  buildPublicTaller,
  buildPublicTeacher,
  buildPublicTurno,
} from "./public-catalog-builders";
import { createTestServices } from "./app-services";

describe("public catalog builders", () => {
  it("build neutral invented data with unknown availability", () => {
    const taller = buildPublicTaller();
    const intensivo = buildPublicIntensivo();

    expect(taller.name).toBe("Taller Demo");
    expect(taller.offering?.fee.toCentavos()).toBe(5_800_000);
    expect(taller.turnos).toHaveLength(1);
    expect(taller.turnos[0]?.seats.available).toBeNull();
    expect(intensivo.name).toBe("Intensivo Demo");
    expect(intensivo.price.toCentavos()).toBe(5_800_000);
    expect(intensivo.seats.available).toBeNull();
    expect(buildPublicTurno().seats.available).toBeNull();
  });

  it("apply overrides over the defaults", () => {
    expect(buildPublicTaller({ slug: "otro", status: "paused" })).toMatchObject(
      { slug: "otro", status: "paused", name: "Taller Demo" },
    );
    expect(buildPublicIntensivo({ date: "2026-12-05" }).date).toBe(
      "2026-12-05",
    );
    expect(buildPublicTurno({ weekday: 3 }).weekday).toBe(3);
    expect(buildPublicTeacher({ bioLine: null })).toEqual({
      name: "Docente Demo",
      bioLine: null,
    });
    expect(buildPublicImage({ alt: "Otra" })).toMatchObject({
      alt: "Otra",
      width: 1200,
    });
  });
});

describe("createFakePublicCatalog", () => {
  const talleres = [
    buildPublicTaller({ slug: "b-taller", name: "B" }),
    buildPublicTaller({ slug: "a-taller", name: "A" }),
    buildPublicTaller({ slug: "c-taller", name: "C" }),
  ];
  const intensivos = [
    buildPublicIntensivo({ slug: "z-intensivo" }),
    buildPublicIntensivo({ slug: "y-intensivo" }),
  ];
  const catalog = createFakePublicCatalog({ talleres, intensivos });

  it("keeps the given order and honors the limit", async () => {
    expect((await catalog.talleres.list()).map((t) => t.slug)).toEqual([
      "b-taller",
      "a-taller",
      "c-taller",
    ]);
    expect(
      (await catalog.talleres.list({ limit: 2 })).map((t) => t.slug),
    ).toEqual(["b-taller", "a-taller"]);
    expect(
      (await catalog.intensivos.list({ limit: 1 })).map((i) => i.slug),
    ).toEqual(["z-intensivo"]);
  });

  it("finds an exact slug and returns null otherwise, with no cross-type match", async () => {
    expect((await catalog.talleres.findBySlug("a-taller"))?.name).toBe("A");
    expect(await catalog.talleres.findBySlug("a-tall")).toBeNull();
    expect(await catalog.talleres.findBySlug("z-intensivo")).toBeNull();
    expect(await catalog.intensivos.findBySlug("y-intensivo")).toBe(
      intensivos[1],
    );
    expect(await catalog.intensivos.findBySlug("a-taller")).toBeNull();
  });

  it("lists the given slugs", async () => {
    expect(await catalog.talleres.listSlugs()).toEqual([
      "b-taller",
      "a-taller",
      "c-taller",
    ]);
    expect(await catalog.intensivos.listSlugs()).toEqual([
      "z-intensivo",
      "y-intensivo",
    ]);
  });

  it("is empty by default", async () => {
    const empty = createFakePublicCatalog();

    expect(await empty.talleres.list()).toEqual([]);
    expect(await empty.intensivos.listSlugs()).toEqual([]);
  });
});

describe("createTestServices public catalog", () => {
  it("defaults to an empty catalog and accepts a seeded one", async () => {
    const empty = createTestServices();
    const seeded = createTestServices({
      publicCatalog: createFakePublicCatalog({
        talleres: [buildPublicTaller()],
      }),
    });

    expect(await empty.publicCatalog.talleres.list()).toEqual([]);
    expect(await empty.publicCatalog.intensivos.list()).toEqual([]);
    expect(await seeded.publicCatalog.talleres.listSlugs()).toEqual([
      "taller-demo",
    ]);
  });
});
