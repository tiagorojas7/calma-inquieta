import { describe, expect, it } from "vitest";
import { runPublicIntensivosContract } from "~/testing/contracts/public-catalog.contract";
import {
  buildSeed,
  fullyPopulatedSeed,
  seedIntensivo,
  seedMediaLookup,
  seedTeacherLookup,
} from "~/testing/fakes/catalog-seed";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import {
  createInMemoryPublicIntensivoRecords,
  toPublicIntensivoRecord,
} from "~/testing/fakes/in-memory-public-catalog-records";
import type { PublicIntensivoRecords } from "./public-catalog";
import { createPublicIntensivosReader } from "./public-intensivos-reader";

runPublicIntensivosContract((seed) =>
  Promise.resolve(createInMemoryPublicIntensivoRecords(seed)),
);

const NOW = new Date("2026-10-15T15:00:00Z");

describe("the reader defends itself against a records port that over-returns", () => {
  const seed = buildSeed({
    intensivos: [
      seedIntensivo({ slug: "publicado" }),
      seedIntensivo({ slug: "borrador", status: "draft" }),
      seedIntensivo({ slug: "archivado", status: "archived" }),
      seedIntensivo({ slug: "cancelado", status: "cancelled" }),
      seedIntensivo({ slug: "ayer", eventDate: "2026-10-14" }),
    ],
  });
  const everything = seed.intensivos.map(toPublicIntensivoRecord);
  const leaky: PublicIntensivoRecords = {
    listVisible: () => Promise.resolve(everything),
    findVisibleBySlug: (slug) =>
      Promise.resolve(everything.find((r) => r.slug === slug) ?? null),
    listVisibleSlugs: () => Promise.resolve(everything.map((r) => r.slug)),
  };
  const reader = createPublicIntensivosReader({
    records: leaky,
    teachers: seedTeacherLookup(seed),
    media: seedMediaLookup(seed),
    clock: fixedClock(NOW),
  });

  it("lists neither an invisible nor an expired intensivo (P2)", async () => {
    expect((await reader.list()).map((item) => item.slug)).toEqual([
      "publicado",
    ]);
  });

  it("finds neither an invisible nor an expired intensivo by slug (P2)", async () => {
    for (const slug of ["borrador", "archivado", "cancelado", "ayer"])
      expect(await reader.findBySlug(slug)).toBeNull();
    expect((await reader.findBySlug("publicado"))?.slug).toBe("publicado");
  });
});

describe("the reader's use of the clock and the lookups", () => {
  it("reads the clock once per call", async () => {
    let reads = 0;
    const seed = fullyPopulatedSeed();
    const reader = createPublicIntensivosReader({
      records: createInMemoryPublicIntensivoRecords(seed),
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
    await reader.findBySlug("intensivo-demo");
    expect(reads).toBe(2);
    await reader.listSlugs();
    expect(reads).toBe(3);
  });

  it("asks each lookup once, with the ids of the returned intensivos only", async () => {
    const seed = fullyPopulatedSeed();
    const teacherCalls: (readonly string[])[] = [];
    const assetCalls: (readonly string[])[] = [];
    const reader = createPublicIntensivosReader({
      records: createInMemoryPublicIntensivoRecords(seed),
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

  it("does not touch a lookup when there is nothing to resolve", async () => {
    const seed = buildSeed({ intensivos: [seedIntensivo({ slug: "solo" })] });
    let lookups = 0;
    const reader = createPublicIntensivosReader({
      records: createInMemoryPublicIntensivoRecords(seed),
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
    expect(listed[0]?.images).toEqual([]);
    expect(lookups).toBe(0);
  });
});
