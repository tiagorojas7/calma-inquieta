import { describe, expect, it } from "vitest";
import {
  fullyPopulatedSeed,
  PRIVACY_SENTINELS,
  PRIVATE_KEYS,
  seedMediaLookup,
  seedTeacherLookup,
} from "~/testing/fakes/catalog-seed";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { createInMemoryPublicTallerRecords } from "~/testing/fakes/in-memory-public-catalog-records";
import type { PublicTallerRecords } from "./public-catalog";
import { createPublicTalleresReader } from "./public-talleres-reader";

const NOW = new Date("2026-10-15T15:00:00Z");

function readerOver(records?: PublicTallerRecords) {
  const seed = fullyPopulatedSeed();
  return createPublicTalleresReader({
    records: records ?? createInMemoryPublicTallerRecords(seed),
    teachers: seedTeacherLookup(seed),
    media: seedMediaLookup(seed),
    clock: fixedClock(NOW),
  });
}

describe("what a public taller may carry (PC14)", () => {
  it("leaks no sentinel value and no private key in any reader result", async () => {
    const reader = readerOver();

    const results = [
      await reader.list(),
      await reader.list({ limit: 1 }),
      await reader.findBySlug("taller-demo"),
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
    const found = await readerOver().findBySlug("taller-demo");

    expect(Object.keys(found ?? {}).sort()).toEqual([
      "description",
      "images",
      "name",
      "offering",
      "project",
      "slug",
      "status",
      "summary",
      "teacher",
      "technique",
      "turnos",
    ]);
    expect(Object.keys(found?.turnos[0] ?? {}).sort()).toEqual([
      "endsAt",
      "label",
      "seats",
      "startsAt",
      "weekday",
    ]);
    expect(Object.keys(found?.turnos[0]?.seats ?? {}).sort()).toEqual([
      "available",
      "capacity",
    ]);
    expect(Object.keys(found?.offering ?? {}).sort()).toEqual([
      "fee",
      "period",
    ]);
    expect(Object.keys(found?.project ?? {}).sort()).toEqual([
      "description",
      "images",
      "title",
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
  });

  it("never lets a draft taller or a draft period appear", async () => {
    const reader = readerOver();

    const json = JSON.stringify([
      await reader.list(),
      await reader.findBySlug("taller-demo"),
      await reader.findBySlug("taller-borrador"),
    ]);

    expect(json).not.toContain("DRAFT-ONLY-TEXT");
    expect(json).not.toContain("DRAFT-PROJECT-TEXT");
    expect(json).not.toContain("taller-borrador");
  });
});

describe("a failing records port", () => {
  const failure = new Error("connection lost");
  const failing: PublicTallerRecords = {
    listVisible: () => Promise.reject(failure),
    findVisibleBySlug: () => Promise.reject(failure),
    listVisibleSlugs: () => Promise.reject(failure),
  };

  it("makes list, findBySlug and listSlugs reject instead of looking empty", async () => {
    const reader = readerOver(failing);

    await expect(reader.list()).rejects.toBe(failure);
    await expect(reader.findBySlug("taller-demo")).rejects.toBe(failure);
    await expect(reader.listSlugs()).rejects.toBe(failure);
  });
});
