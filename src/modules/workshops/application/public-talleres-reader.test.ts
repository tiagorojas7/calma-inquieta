import { describe, expect, it } from "vitest";
import { runPublicTalleresContract } from "~/testing/contracts/public-catalog.contract";
import {
  buildSeed,
  fullyPopulatedSeed,
  seedMediaLookup,
  seedPeriod,
  seedTaller,
  seedTeacherLookup,
  seedTurno,
} from "~/testing/fakes/catalog-seed";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import {
  createInMemoryPublicTallerRecords,
  toPublicTallerRecord,
} from "~/testing/fakes/in-memory-public-catalog-records";
import type { PublicTallerRecords } from "./public-catalog";
import { createPublicTalleresReader } from "./public-talleres-reader";

runPublicTalleresContract((seed) =>
  Promise.resolve(createInMemoryPublicTallerRecords(seed)),
);

const NOW = new Date("2026-10-15T15:00:00Z");

describe("the reader defends itself against a records port that over-returns", () => {
  const lunes = seedTurno({ label: "Lunes" });
  const seed = buildSeed({
    talleres: [
      seedTaller({ slug: "publicado" }),
      seedTaller({ slug: "borrador", status: "draft" }),
      seedTaller({ slug: "archivado", status: "archived" }),
      seedTaller({
        slug: "con-turnos",
        turnos: [lunes],
        periods: [
          seedPeriod({
            period: "2026-09",
            capacities: [{ turnoId: lunes.id, capacity: 3 }],
          }),
        ],
      }),
    ],
  });
  const everything = seed.talleres.map((row) =>
    toPublicTallerRecord(row, "2000-01"),
  );
  const leaky: PublicTallerRecords = {
    listVisible: () => Promise.resolve(everything),
    findVisibleBySlug: (slug) =>
      Promise.resolve(everything.find((r) => r.slug === slug) ?? null),
    listVisibleSlugs: () => Promise.resolve(everything.map((r) => r.slug)),
  };
  const reader = createPublicTalleresReader({
    records: leaky,
    teachers: seedTeacherLookup(seed),
    media: seedMediaLookup(seed),
    clock: fixedClock(NOW),
  });

  it("lists no invisible taller (P2)", async () => {
    expect((await reader.list()).map((item) => item.slug)).toEqual([
      "con-turnos",
      "publicado",
    ]);
  });

  it("finds no invisible taller by slug (P2)", async () => {
    for (const slug of ["borrador", "archivado"])
      expect(await reader.findBySlug(slug)).toBeNull();
    expect((await reader.findBySlug("publicado"))?.slug).toBe("publicado");
  });

  it("never selects a past month even when the port returns it", async () => {
    expect((await reader.findBySlug("con-turnos"))?.offering).toBeNull();
  });
});

describe("the use of the clock and the lookups", () => {
  it("reads the clock once per call", async () => {
    let reads = 0;
    const seed = fullyPopulatedSeed();
    const reader = createPublicTalleresReader({
      records: createInMemoryPublicTallerRecords(seed),
      teachers: seedTeacherLookup(seed),
      media: seedMediaLookup(seed),
      clock: {
        now: () => {
          reads += 1;
          return NOW;
        },
      },
    });

    await reader.list();
    expect(reads).toBe(1);
    await reader.findBySlug("taller-demo");
    expect(reads).toBe(2);
  });

  it("asks each lookup once, with the ids of the returned talleres only", async () => {
    const seed = fullyPopulatedSeed();
    const teacherCalls: (readonly string[])[] = [];
    const assetCalls: (readonly string[])[] = [];
    const reader = createPublicTalleresReader({
      records: createInMemoryPublicTallerRecords(seed),
      teachers: {
        findByIds: (ids) => {
          teacherCalls.push(ids);
          return seedTeacherLookup(seed).findByIds(ids);
        },
      },
      media: {
        findAssets: (ids) => {
          assetCalls.push(ids);
          return seedMediaLookup(seed).findAssets(ids);
        },
      },
      clock: fixedClock(NOW),
    });

    await reader.list();

    expect(teacherCalls).toHaveLength(1);
    expect(assetCalls).toHaveLength(1);
    expect(teacherCalls[0]).toHaveLength(1);
    expect(assetCalls[0]).toHaveLength(1);
  });

  it("drops an image whose asset the lookup omits and a project left with nothing (DA4, DA2)", async () => {
    const seed = buildSeed({
      talleres: [
        seedTaller({
          slug: "t",
          images: [{ assetId: "missing", alt: "Perdida" }],
          periods: [
            seedPeriod({
              projectImages: [{ assetId: "missing", alt: "Perdida" }],
            }),
          ],
        }),
      ],
    });
    const reader = createPublicTalleresReader({
      records: createInMemoryPublicTallerRecords(seed),
      teachers: seedTeacherLookup(seed),
      media: seedMediaLookup(seed),
      clock: fixedClock(NOW),
    });

    const found = await reader.findBySlug("t");

    expect(found?.images).toEqual([]);
    expect(found?.project).toBeNull();
  });

  it("does not touch a lookup when there is nothing to resolve", async () => {
    const seed = buildSeed({ talleres: [seedTaller({ slug: "solo" })] });
    let lookups = 0;
    const reader = createPublicTalleresReader({
      records: createInMemoryPublicTallerRecords(seed),
      teachers: {
        findByIds: () => {
          lookups += 1;
          return Promise.resolve(new Map());
        },
      },
      media: {
        findAssets: () => {
          lookups += 1;
          return Promise.resolve(new Map());
        },
      },
      clock: fixedClock(NOW),
    });

    const listed = await reader.list();

    expect(listed).toHaveLength(1);
    expect(listed[0]?.teacher).toBeNull();
    expect(lookups).toBe(0);
  });
});

describe("a month whose only turno was deactivated (owner evidence, taller-prueba-1)", () => {
  it("offers the next open month with its active turno", async () => {
    const martes = seedTurno({ label: "Martes 12:15", active: false });
    const tarde = seedTurno({ label: "Turno tarde" });
    const seed = buildSeed({
      talleres: [
        seedTaller({
          slug: "taller-prueba-1",
          turnos: [martes, tarde],
          periods: [
            seedPeriod({
              period: "2026-11",
              capacities: [{ turnoId: martes.id, capacity: 8 }],
            }),
            seedPeriod({
              period: "2026-12",
              capacities: [{ turnoId: tarde.id, capacity: 6 }],
            }),
          ],
        }),
      ],
    });
    const reader = createPublicTalleresReader({
      records: createInMemoryPublicTallerRecords(seed),
      teachers: seedTeacherLookup(seed),
      media: seedMediaLookup(seed),
      clock: fixedClock(new Date("2026-11-02T15:00:00Z")),
    });

    const taller = await reader.findBySlug("taller-prueba-1");

    expect(taller?.offering?.period).toBe("2026-12");
    expect(taller?.turnos.map((turno) => turno.label)).toEqual(["Turno tarde"]);
    expect(taller?.turnos[0]?.seats.capacity).toBe(6);
  });
});
