import { describe, expect, it } from "vitest";
import {
  fullyPopulatedSeed,
  PRIVACY_SENTINELS,
  PRIVATE_KEYS,
  seedMediaLookup,
  seedTeacherLookup,
} from "~/testing/fakes/catalog-seed";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { createInMemoryPublicIntensivoRecords } from "~/testing/fakes/in-memory-public-catalog-records";
import type { PublicIntensivoRecords } from "./public-catalog";
import { createPublicIntensivosReader } from "./public-intensivos-reader";

const NOW = new Date("2026-10-15T15:00:00Z");

function readerOver(records?: PublicIntensivoRecords) {
  const seed = fullyPopulatedSeed();
  return createPublicIntensivosReader({
    records: records ?? createInMemoryPublicIntensivoRecords(seed),
    teachers: seedTeacherLookup(seed),
    media: seedMediaLookup(seed),
    clock: fixedClock(NOW),
  });
}

describe("what a public intensivo may carry (PC14)", () => {
  it("leaks no sentinel value and no private key in any reader result", async () => {
    const reader = readerOver();

    const results = [
      await reader.list(),
      await reader.list({ limit: 1 }),
      await reader.findBySlug("intensivo-demo"),
      await reader.listSlugs(),
    ];

    for (const result of results) {
      const json = JSON.stringify(result);
      for (const sentinel of PRIVACY_SENTINELS)
        expect(json).not.toContain(sentinel);
      for (const key of PRIVATE_KEYS) expect(json).not.toContain(`"${key}"`);
      expect(json).not.toContain("3550");
    }
  });

  it("returns exactly the allowlisted keys", async () => {
    const found = await readerOver().findBySlug("intensivo-demo");

    expect(Object.keys(found ?? {}).sort()).toEqual([
      "date",
      "deposit",
      "description",
      "endsAt",
      "images",
      "materialsIncluded",
      "minSeats",
      "name",
      "policyText",
      "price",
      "seats",
      "slug",
      "startsAt",
      "status",
      "summary",
      "teacher",
    ]);
    expect(Object.keys(found?.images[0] ?? {}).sort()).toEqual([
      "alt",
      "height",
      "src",
      "width",
    ]);
    expect(Object.keys(found?.teacher ?? {}).sort()).toEqual([
      "bioLine",
      "name",
    ]);
    expect(Object.keys(found?.seats ?? {}).sort()).toEqual([
      "available",
      "capacity",
    ]);
  });

  it("never lets a draft's data appear", async () => {
    const reader = readerOver();

    const json = JSON.stringify([
      await reader.list(),
      await reader.findBySlug("borrador-secreto"),
    ]);

    expect(json).not.toContain("DRAFT-ONLY-TEXT");
    expect(json).not.toContain("borrador-secreto");
  });
});

describe("a failing records port", () => {
  const failure = new Error("connection lost");
  const failing: PublicIntensivoRecords = {
    listVisible: () => Promise.reject(failure),
    findVisibleBySlug: () => Promise.reject(failure),
    listVisibleSlugs: () => Promise.reject(failure),
  };

  it("makes list, findBySlug and listSlugs reject instead of looking empty", async () => {
    const reader = readerOver(failing);

    await expect(reader.list()).rejects.toBe(failure);
    await expect(reader.findBySlug("intensivo-demo")).rejects.toBe(failure);
    await expect(reader.listSlugs()).rejects.toBe(failure);
  });
});
