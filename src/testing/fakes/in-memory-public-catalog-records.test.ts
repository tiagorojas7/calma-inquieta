import { describe, expect, it } from "vitest";
import {
  buildSeed,
  fullyPopulatedSeed,
  PRIVACY_SENTINELS,
  seedIntensivo,
  seedMediaLookup,
  seedTeacherLookup,
} from "./catalog-seed";
import { createInMemoryPublicIntensivoRecords } from "./in-memory-public-catalog-records";

const FROM = { fromDate: "2026-11-01" };

describe("the in-memory intensivo records", () => {
  it("lists only published and paused intensivos from the requested date", async () => {
    const records = createInMemoryPublicIntensivoRecords(
      buildSeed({
        intensivos: [
          seedIntensivo({ slug: "publicado", status: "published" }),
          seedIntensivo({ slug: "pausado", status: "paused" }),
          seedIntensivo({ slug: "borrador", status: "draft" }),
          seedIntensivo({ slug: "archivado", status: "archived" }),
          seedIntensivo({ slug: "cancelado", status: "cancelled" }),
          seedIntensivo({ slug: "pasado", eventDate: "2026-10-31" }),
          seedIntensivo({ slug: "hoy", eventDate: "2026-11-01" }),
        ],
      }),
    );

    const listed = await records.listVisible(FROM);

    expect(listed.map((record) => record.slug).sort()).toEqual([
      "hoy",
      "pausado",
      "publicado",
    ]);
    expect((await records.listVisibleSlugs(FROM)).slice().sort()).toEqual([
      "hoy",
      "pausado",
      "publicado",
    ]);
  });

  it("finds a visible upcoming intensivo by its exact slug, and nothing else", async () => {
    const records = createInMemoryPublicIntensivoRecords(
      buildSeed({
        intensivos: [
          seedIntensivo({ slug: "torno" }),
          seedIntensivo({ slug: "borrador", status: "draft" }),
          seedIntensivo({ slug: "pasado", eventDate: "2026-10-31" }),
        ],
      }),
    );

    expect((await records.findVisibleBySlug("torno", FROM))?.slug).toBe(
      "torno",
    );
    expect(await records.findVisibleBySlug("TORNO", FROM)).toBeNull();
    expect(await records.findVisibleBySlug("borrador", FROM)).toBeNull();
    expect(await records.findVisibleBySlug("pasado", FROM)).toBeNull();
    expect(await records.findVisibleBySlug("nada", FROM)).toBeNull();
  });

  it("returns the date as YYYY-MM-DD and the times as HH:MM, with the exact record keys", async () => {
    const records = createInMemoryPublicIntensivoRecords(fullyPopulatedSeed());

    const [record] = await records.listVisible(FROM);

    expect(record).toMatchObject({
      eventDate: "2026-11-14",
      startsAt: "10:00",
      endsAt: "18:00",
    });
    expect(Object.keys(record ?? {}).sort()).toEqual([
      "capacity",
      "deposit",
      "description",
      "endsAt",
      "eventDate",
      "images",
      "materialsIncluded",
      "minSeats",
      "name",
      "policyText",
      "price",
      "slug",
      "startsAt",
      "status",
      "summary",
      "teacherId",
    ]);
  });
});

describe("fullyPopulatedSeed", () => {
  it("carries the privacy sentinels that the reader must never leak (PC14)", () => {
    const seed = fullyPopulatedSeed();
    const teacher = seed.teachers[0];
    const intensivo = seed.intensivos[0];
    const asset = seed.assets[0];

    expect(intensivo?.agreedPercentageBp).toBe(3550);
    expect(intensivo?.updatedBy).toBe("auditor@example.test");
    expect(teacher?.phone).toBe("+54 9 351 000 0000");
    expect(teacher?.email).toBe("docente@example.test");
    expect(teacher?.modality).toBe("third_party");
    expect(asset?.fileName).toBe("PRIVATE-FILE.jpg");
    expect(asset?.createdBy).toBe("uploader@example.test");
    expect(PRIVACY_SENTINELS).toEqual(
      expect.arrayContaining([
        "+54 9 351 000 0000",
        "docente@example.test",
        "third_party",
        "auditor@example.test",
        "SNAPSHOT-SENTINEL",
        "PRIVATE-FILE.jpg",
        "uploader@example.test",
      ]),
    );
  });

  it("includes a draft whose data must stay out", () => {
    const draft = fullyPopulatedSeed().intensivos.find(
      (intensivo) => intensivo.status === "draft",
    );

    expect(draft?.description).toBe("DRAFT-ONLY-TEXT");
  });
});

describe("the seed lookups", () => {
  it("resolve the seeded teachers and assets by id and omit unknown ids", async () => {
    const seed = fullyPopulatedSeed();
    const teacherId = seed.teachers[0]?.id ?? "";
    const assetId = seed.assets[0]?.id ?? "";

    const teachers = await seedTeacherLookup(seed).findByIds([
      teacherId,
      "missing",
    ]);
    const assets = await seedMediaLookup(seed).findAssets([assetId, "missing"]);

    expect([...teachers.keys()]).toEqual([teacherId]);
    expect([...assets.keys()]).toEqual([assetId]);
  });
});
