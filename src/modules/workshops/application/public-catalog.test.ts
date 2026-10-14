import { describe, expect, it } from "vitest";
import type {
  PublicCatalogService,
  PublicIntensivo,
  PublicSeats,
  PublicTaller,
} from "./public-catalog";

describe("PublicSeats", () => {
  it("accepts an unknown availability", () => {
    const seats: PublicSeats = { capacity: 8, available: null };

    expect(seats).toEqual({ capacity: 8, available: null });
  });

  it("does not accept a number as availability", () => {
    // @ts-expect-error availability is the literal null until change 5
    const seats: PublicSeats = { capacity: 8, available: 3 };

    expect(seats.capacity).toBe(8);
  });
});

describe("PublicCatalogService", () => {
  it("reads every method without an actor", async () => {
    const calls: string[] = [];
    const service: PublicCatalogService = {
      talleres: {
        list: () => {
          calls.push("talleres.list");
          return Promise.resolve([] as readonly PublicTaller[]);
        },
        findBySlug: () => {
          calls.push("talleres.findBySlug");
          return Promise.resolve(null);
        },
        listSlugs: () => {
          calls.push("talleres.listSlugs");
          return Promise.resolve(["ceramica"]);
        },
      },
      intensivos: {
        list: () => {
          calls.push("intensivos.list");
          return Promise.resolve([] as readonly PublicIntensivo[]);
        },
        findBySlug: () => {
          calls.push("intensivos.findBySlug");
          return Promise.resolve(null);
        },
        listSlugs: () => {
          calls.push("intensivos.listSlugs");
          return Promise.resolve(["intensivo-demo"]);
        },
      },
    };

    await service.talleres.list();
    await service.intensivos.list();
    const tallerSlugs = await service.talleres.listSlugs();
    const intensivoSlugs = await service.intensivos.listSlugs();
    const taller = await service.talleres.findBySlug("ceramica");
    const intensivo = await service.intensivos.findBySlug("intensivo-demo");

    expect(calls).toEqual([
      "talleres.list",
      "intensivos.list",
      "talleres.listSlugs",
      "intensivos.listSlugs",
      "talleres.findBySlug",
      "intensivos.findBySlug",
    ]);
    expect(tallerSlugs).toEqual(["ceramica"]);
    expect(intensivoSlugs).toEqual(["intensivo-demo"]);
    expect(taller).toBeNull();
    expect(intensivo).toBeNull();
  });
});
