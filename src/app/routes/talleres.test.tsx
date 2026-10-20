import { describe, expect, it, vi } from "vitest";
import { createTestServices } from "~/testing/fakes/app-services";
import {
  createSeededPublicCatalog,
  fullyPopulatedSeed,
  PRIVACY_SENTINELS,
} from "~/testing/fakes/catalog-seed";
import { createFakePublicCatalog } from "~/testing/fakes/fake-public-catalog";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { buildPublicTaller } from "~/testing/fakes/public-catalog-builders";
import { createLoaderArgs } from "~/testing/react-router";
import { loader, meta } from "./talleres";

const clock = fixedClock(new Date("2026-10-15T15:00:00Z"));

type Descriptor = {
  title?: string;
  name?: string;
  content?: string;
  property?: string;
};

describe("talleres loader", () => {
  it("returns plain cards in the reader's order", async () => {
    const talleres = [
      buildPublicTaller({ slug: "a" }),
      buildPublicTaller({ slug: "b", status: "paused" }),
      buildPublicTaller({ slug: "c", offering: null }),
    ];
    const services = createTestServices({
      publicCatalog: createFakePublicCatalog({ talleres }),
    });
    const result = await loader(
      createLoaderArgs(services, "/talleres") as never,
    );
    expect(result.cards.map((card) => card.id)).toEqual(["a", "b", "c"]);
    expect(result.cards[1]?.paused).toBe("Inscripciones pausadas");
    expect(result.cards[2]?.notice).toBe("Próximamente abrimos inscripciones");
    expect(result.cards[0]?.href).toBe("/talleres/a");
    expect(result.heading).toBe("Talleres");
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("answers an empty catalog with the heading, intro and an action", async () => {
    const result = await loader(
      createLoaderArgs(createTestServices(), "/talleres") as never,
    );
    expect(result.cards).toEqual([]);
    expect(result.heading).toBe("Talleres");
    expect(result.intro.length).toBeGreaterThan(0);
    expect(result.emptyMessage.length).toBeGreaterThan(0);
    expect(result.emptyAction.href).toMatch(/^https:\/\//u);
  });

  it("rethrows a failing reader instead of showing an empty state", async () => {
    const catalog = createFakePublicCatalog();
    vi.spyOn(catalog.talleres, "list").mockRejectedValue(new Error("db down"));
    const services = createTestServices({ publicCatalog: catalog });
    await expect(
      loader(createLoaderArgs(services, "/talleres") as never),
    ).rejects.toThrow("db down");
  });

  it("ignores filter and sort query parameters", async () => {
    const services = createTestServices({
      publicCatalog: createFakePublicCatalog({
        talleres: [
          buildPublicTaller({ slug: "a" }),
          buildPublicTaller({ slug: "b" }),
        ],
      }),
    });
    const plain = await loader(
      createLoaderArgs(services, "/talleres") as never,
    );
    const filtered = await loader(
      createLoaderArgs(
        services,
        "/talleres?franja=manana&tecnica=ceramica",
      ) as never,
    );
    expect(filtered).toEqual(plain);
  });

  it("serializes no privacy sentinel from fully populated data", async () => {
    const services = createTestServices({
      publicCatalog: createSeededPublicCatalog(fullyPopulatedSeed(), clock),
    });
    const result = await loader(
      createLoaderArgs(services, "/talleres") as never,
    );
    expect(result.cards).toHaveLength(1);
    const serialized = JSON.stringify(result);
    for (const sentinel of PRIVACY_SENTINELS) {
      expect(serialized).not.toContain(sentinel);
    }
    expect(serialized).not.toContain("DRAFT-ONLY-TEXT");
    expect(serialized).not.toMatch(/3550|percentage|modality/iu);
  });
});

describe("talleres meta", () => {
  async function descriptors(indexingEnabled: boolean) {
    const services = createTestServices({
      site: { baseUrl: "https://example.test", indexingEnabled },
    });
    const result = await loader(
      createLoaderArgs(services, "/talleres") as never,
    );
    return meta({ loaderData: result } as never) as Descriptor[];
  }

  it("is noindex while the gate is off", async () => {
    expect(await descriptors(false)).toContainEqual({
      name: "robots",
      content: "noindex, nofollow",
    });
  });

  it("has no robots directive once the gate is on", async () => {
    const result = await descriptors(true);
    expect(result.some((entry) => entry.name === "robots")).toBe(false);
  });

  it("builds a unique title and a canonical", async () => {
    const result = await descriptors(true);
    expect(result[0]?.title).toBe("Catálogo de talleres | Calma Inquieta");
    expect(result).toContainEqual({
      tagName: "link",
      rel: "canonical",
      href: "https://example.test/talleres",
    });
  });

  it("returns a safe noindex title on error", () => {
    expect(
      meta({ loaderData: undefined, error: new Error("x") } as never),
    ).toEqual([
      { title: "Página no encontrada" },
      { name: "robots", content: "noindex, nofollow" },
    ]);
  });
});
