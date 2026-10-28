import { describe, expect, it, vi } from "vitest";
import { createTestServices } from "~/testing/fakes/app-services";
import {
  buildSeed,
  createSeededPublicCatalog,
  fullyPopulatedSeed,
  PRIVACY_SENTINELS,
  seedIntensivo,
} from "~/testing/fakes/catalog-seed";
import { createFakePublicCatalog } from "~/testing/fakes/fake-public-catalog";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import {
  buildPublicImage,
  buildPublicIntensivo,
} from "~/testing/fakes/public-catalog-builders";
import {
  buildIntensiveOffer,
  createInMemoryIntensiveRequests,
} from "~/testing/fakes/intensive-request-builders";
import { createLoaderArgs } from "~/testing/react-router";
import { loader, meta } from "./intensivo";

const clock = fixedClock(new Date("2026-10-15T15:00:00Z"));

type Descriptor = {
  title?: string;
  name?: string;
  content?: string;
  property?: string;
};

function args(services: ReturnType<typeof createTestServices>, slug: string) {
  return {
    ...createLoaderArgs(services, `/intensivos/${slug}`),
    params: { slug },
  } as never;
}

describe("intensivo loader", () => {
  it("reads the slug and returns plain detail data", async () => {
    const services = createTestServices({
      publicCatalog: createFakePublicCatalog({
        intensivos: [buildPublicIntensivo({ slug: "demo", name: "Demo" })],
      }),
    });
    const result = await loader(args(services, "demo"));
    expect(result.detail.name).toBe("Demo");
    expect(result.detail.action.kind).toBe("inquiry");
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("offers Reservar mi lugar while the intensivo is open and has seats", async () => {
    const services = createTestServices({
      publicCatalog: createFakePublicCatalog({
        intensivos: [buildPublicIntensivo({ slug: "demo" })],
      }),
      intensiveRequests: createInMemoryIntensiveRequests({
        offer: buildIntensiveOffer({ slug: "demo" }),
      }).service,
    });
    const result = await loader(args(services, "demo"));
    expect(result.detail.action).toEqual({
      kind: "reserve",
      href: "/intensivos/demo/reserva",
      label: "Reservar mi lugar",
    });
  });

  it("keeps the WhatsApp inquiry when no seats are left", async () => {
    const services = createTestServices({
      publicCatalog: createFakePublicCatalog({
        intensivos: [buildPublicIntensivo({ slug: "demo" })],
      }),
      intensiveRequests: createInMemoryIntensiveRequests({
        offer: buildIntensiveOffer({ slug: "demo", capacity: 0 }),
      }).service,
    });
    const result = await loader(args(services, "demo"));
    expect(result.detail.action.kind).toBe("inquiry");
  });

  it("builds the inquiry link from the profile with the name and the date", async () => {
    const services = createTestServices({
      publicCatalog: createFakePublicCatalog({
        intensivos: [buildPublicIntensivo({ name: "Intensivo Demo" })],
      }),
    });
    const result = await loader(args(services, "intensivo-demo"));
    const action = result.detail.action;
    if (action.kind !== "inquiry")
      throw new Error("expected an inquiry action");
    const url = new URL(action.href);
    expect(url.host).toBe("wa.me");
    const text = url.searchParams.get("text") ?? "";
    expect(text).toContain("Intensivo Demo");
    expect(text).toContain("14 de noviembre");
  });

  it("uses the paused link, naming the activity, for a paused intensivo", async () => {
    const services = createTestServices({
      publicCatalog: createFakePublicCatalog({
        intensivos: [
          buildPublicIntensivo({ name: "Intensivo Demo", status: "paused" }),
        ],
      }),
    });
    const result = await loader(args(services, "intensivo-demo"));
    const action = result.detail.action;
    if (action.kind !== "paused") throw new Error("expected a paused action");
    expect(action.link.label).toBe("Escribinos por WhatsApp");
    expect(new URL(action.link.href).searchParams.get("text") ?? "").toContain(
      "Intensivo Demo",
    );
  });

  it("throws the same 404 for unknown, draft, cancelled, archived, past and malformed slugs", async () => {
    const seed = buildSeed({
      intensivos: [
        seedIntensivo({ slug: "draft", status: "draft" }),
        seedIntensivo({ slug: "cancelled", status: "cancelled" }),
        seedIntensivo({ slug: "archived", status: "archived" }),
        seedIntensivo({ slug: "past", eventDate: "2026-10-14" }),
      ],
    });
    const services = createTestServices({
      publicCatalog: createSeededPublicCatalog(seed, clock),
    });
    const slugs = [
      "no-existe",
      "draft",
      "cancelled",
      "archived",
      "past",
      "../etc/passwd",
      "%00",
      "",
    ];
    const thrown: unknown[] = [];
    for (const slug of slugs) {
      const caught = await loader(args(services, slug)).catch(
        (error: unknown) => error,
      );
      thrown.push(caught);
      expect(caught).toMatchObject({ data: null, init: { status: 404 } });
    }
    expect(new Set(thrown.map((item) => JSON.stringify(item))).size).toBe(1);
  });

  it("rethrows a failing reader without wrapping it in a 404", async () => {
    const catalog = createFakePublicCatalog();
    vi.spyOn(catalog.intensivos, "findBySlug").mockRejectedValue(
      new Error("db down"),
    );
    const services = createTestServices({ publicCatalog: catalog });
    await expect(loader(args(services, "demo"))).rejects.toThrow("db down");
  });

  it("serializes no privacy sentinel for a fully populated intensivo", async () => {
    const services = createTestServices({
      publicCatalog: createSeededPublicCatalog(fullyPopulatedSeed(), clock),
    });
    const result = await loader(args(services, "intensivo-demo"));
    const serialized = JSON.stringify(result);
    expect(serialized).toContain("Lucía Demo");
    for (const sentinel of PRIVACY_SENTINELS) {
      expect(serialized).not.toContain(sentinel);
    }
    expect(serialized).not.toMatch(/3550|percentage|modality/iu);
  });
});

describe("intensivo meta", () => {
  async function descriptors(
    options: {
      indexingEnabled?: boolean;
      summary?: string;
      images?: boolean;
    } = {},
  ) {
    const services = createTestServices({
      site: {
        baseUrl: "https://example.test",
        indexingEnabled: options.indexingEnabled ?? true,
      },
      publicCatalog: createFakePublicCatalog({
        intensivos: [
          buildPublicIntensivo({
            name: "Intensivo Demo",
            summary: options.summary ?? "Un resumen breve.",
            images: options.images
              ? [buildPublicImage({ src: "/imagenes/cover.jpg" })]
              : [],
          }),
        ],
      }),
    });
    const result = await loader(args(services, "intensivo-demo"));
    return meta({ loaderData: result } as never) as Descriptor[];
  }

  it("builds the title, description and canonical from the activity", async () => {
    const result = await descriptors();
    expect(result[0]?.title).toBe("Intensivo Demo | Calma Inquieta");
    expect(result).toContainEqual({
      name: "description",
      content: "Un resumen breve.",
    });
    expect(result).toContainEqual({
      tagName: "link",
      rel: "canonical",
      href: "https://example.test/intensivos/intensivo-demo",
    });
  });

  it("truncates a long summary to at most 160 characters", async () => {
    const result = await descriptors({ summary: "palabra ".repeat(60) });
    const description = result.find((entry) => entry.name === "description");
    expect(description?.content?.length).toBeLessThanOrEqual(160);
    expect(description?.content?.endsWith("…")).toBe(true);
  });

  it("uses the cover as og:image, or the default share image without one", async () => {
    expect(await descriptors({ images: true })).toContainEqual({
      property: "og:image",
      content: "https://example.test/imagenes/cover.jpg",
    });
    expect(await descriptors({ images: false })).toContainEqual({
      property: "og:image",
      content:
        "https://example.test/media/share/share-default-1200.0bcfa824.jpg",
    });
  });

  it("follows the indexing gate", async () => {
    expect(await descriptors({ indexingEnabled: false })).toContainEqual({
      name: "robots",
      content: "noindex, nofollow",
    });
    const on = await descriptors({ indexingEnabled: true });
    expect(on.some((entry) => entry.name === "robots")).toBe(false);
  });

  it("returns a safe noindex title on error", () => {
    expect(
      meta({ loaderData: undefined, error: new Error("secret") } as never),
    ).toEqual([
      { title: "Página no encontrada" },
      { name: "robots", content: "noindex, nofollow" },
    ]);
  });
});
