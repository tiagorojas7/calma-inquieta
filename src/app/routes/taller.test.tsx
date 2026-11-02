import { describe, expect, it, vi } from "vitest";
import { createTestServices } from "~/testing/fakes/app-services";
import {
  buildSeed,
  createSeededPublicCatalog,
  fullyPopulatedSeed,
  PRIVACY_SENTINELS,
  seedPeriod,
  seedTaller,
  seedTurno,
} from "~/testing/fakes/catalog-seed";
import { createFakePublicCatalog } from "~/testing/fakes/fake-public-catalog";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import {
  buildPublicImage,
  buildPublicTaller,
  buildPublicTurno,
} from "~/testing/fakes/public-catalog-builders";
import { createLoaderArgs } from "~/testing/react-router";
import { loader, meta } from "./taller";

const clock = fixedClock(new Date("2026-10-15T15:00:00Z"));

type Descriptor = {
  title?: string;
  name?: string;
  content?: string;
  property?: string;
};

function args(services: ReturnType<typeof createTestServices>, slug: string) {
  return {
    ...createLoaderArgs(services, `/talleres/${slug}`),
    params: { slug },
  } as never;
}

function servicesWith(talleres: Parameters<typeof buildPublicTaller>[0][]) {
  return createTestServices({
    publicCatalog: createFakePublicCatalog({
      talleres: talleres.map((taller) => buildPublicTaller(taller)),
    }),
  });
}

describe("taller loader", () => {
  it("reads the slug and returns plain detail data", async () => {
    const result = await loader(
      args(servicesWith([{ slug: "demo", name: "Demo" }]), "demo"),
    );
    expect(result.detail.name).toBe("Demo");
    expect(result.detail.action).toMatchObject({
      kind: "enrollment",
      href: "/talleres/demo/inscripcion?period=2026-11",
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("builds the page link from the profile with the taller name", async () => {
    const result = await loader(
      args(
        servicesWith([{ name: "Taller Demo", offering: null }]),
        "taller-demo",
      ),
    );
    const action = result.detail.action;
    if (action.kind !== "inquiry")
      throw new Error("expected an inquiry action");
    const url = new URL(action.href);
    expect(url.host).toBe("wa.me");
    expect(url.searchParams.get("text") ?? "").toContain("Taller Demo");
  });

  it("builds one link per turno naming the taller, the weekday and the time when enrollment is not possible", async () => {
    const result = await loader(
      args(
        servicesWith([
          {
            name: "Taller Demo",
            offering: null,
            turnos: [
              buildPublicTurno({
                weekday: 1,
                startsAt: "10:00",
                endsAt: "12:00",
              }),
              buildPublicTurno({
                weekday: 3,
                startsAt: "18:00",
                endsAt: "20:00",
              }),
            ],
          },
        ]),
        "taller-demo",
      ),
    );
    const texts = result.detail.turnos.map(
      (turno) =>
        new URL(turno.inquiry?.href ?? "https://none.test").searchParams.get(
          "text",
        ) ?? "",
    );
    expect(texts[0]).toContain("Taller Demo");
    expect(texts[0]).toContain("lunes");
    expect(texts[0]).toContain("10:00 a 12:00 h");
    expect(texts[1]).toContain("miércoles");
    expect(texts[1]).toContain("18:00 a 20:00 h");
  });

  it("uses the paused link, naming the taller, and no turno links when paused", async () => {
    const result = await loader(
      args(
        servicesWith([{ name: "Taller Demo", status: "paused" }]),
        "taller-demo",
      ),
    );
    const action = result.detail.action;
    if (action.kind !== "paused") throw new Error("expected a paused action");
    expect(action.link.label).toBe("Escribinos por WhatsApp");
    expect(new URL(action.link.href).searchParams.get("text") ?? "").toContain(
      "Taller Demo",
    );
    expect(result.detail.turnos.every((turno) => !("inquiry" in turno))).toBe(
      true,
    );
  });

  it("throws the same 404 for unknown, draft, archived, cross-type and malformed slugs", async () => {
    const seed = buildSeed({
      talleres: [
        seedTaller({ slug: "draft", status: "draft" }),
        seedTaller({ slug: "archived", status: "archived" }),
      ],
    });
    const services = createTestServices({
      publicCatalog: createSeededPublicCatalog(seed, clock),
    });
    const slugs = [
      "no-existe",
      "draft",
      "archived",
      "intensivo-demo",
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

  it("answers 404, not 5xx, for the empty placeholder reader", async () => {
    const caught = await loader(args(createTestServices(), "cualquiera")).catch(
      (error: unknown) => error,
    );
    expect(caught).toMatchObject({ init: { status: 404 } });
  });

  it("rethrows a failing reader without wrapping it in a 404", async () => {
    const catalog = createFakePublicCatalog();
    vi.spyOn(catalog.talleres, "findBySlug").mockRejectedValue(
      new Error("db down"),
    );
    const services = createTestServices({ publicCatalog: catalog });
    await expect(loader(args(services, "demo"))).rejects.toThrow("db down");
  });

  it("serializes no privacy sentinel for a fully populated taller", async () => {
    const services = createTestServices({
      publicCatalog: createSeededPublicCatalog(fullyPopulatedSeed(), clock),
    });
    const result = await loader(args(services, "taller-demo"));
    const serialized = JSON.stringify(result);
    expect(serialized).toContain("Lucía Demo");
    expect(serialized).toContain("Taza con asa");
    for (const sentinel of PRIVACY_SENTINELS) {
      expect(serialized).not.toContain(sentinel);
    }
    expect(serialized).not.toContain("DRAFT-PROJECT-TEXT");
    expect(serialized).not.toMatch(/3550|percentage|modality/iu);
  });

  it("shows no fee and the notice when no period is open", async () => {
    const turno = seedTurno();
    const seed = buildSeed({
      talleres: [
        seedTaller({
          slug: "sin-periodo",
          turnos: [turno],
          periods: [seedPeriod({ period: "2026-09", status: "closed" })],
        }),
      ],
    });
    const services = createTestServices({
      publicCatalog: createSeededPublicCatalog(seed, clock),
    });
    const result = await loader(args(services, "sin-periodo"));
    expect(result.detail.fee).toBeUndefined();
    expect(result.detail.notice).toBe("Próximamente abrimos inscripciones");
  });
});

describe("taller meta", () => {
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
        talleres: [
          buildPublicTaller({
            name: "Taller Demo",
            summary: options.summary ?? "Un resumen breve.",
            images: options.images
              ? [buildPublicImage({ src: "/imagenes/cover.jpg" })]
              : [],
          }),
        ],
      }),
    });
    const result = await loader(args(services, "taller-demo"));
    return meta({ loaderData: result } as never) as Descriptor[];
  }

  it("builds the title, description and canonical from the activity", async () => {
    const result = await descriptors();
    expect(result[0]?.title).toBe("Taller Demo | Calma Inquieta");
    expect(result).toContainEqual({
      name: "description",
      content: "Un resumen breve.",
    });
    expect(result).toContainEqual({
      tagName: "link",
      rel: "canonical",
      href: "https://example.test/talleres/taller-demo",
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
