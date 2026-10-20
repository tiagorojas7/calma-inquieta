import { describe, expect, it } from "vitest";
import {
  buildSeed,
  createSeededPublicCatalog,
  fullyPopulatedSeed,
  PRIVACY_SENTINELS,
  seedIntensivo,
  seedPeriod,
  seedTaller,
  seedTurno,
  seedMediaLookup,
  seedTeacherLookup,
} from "./catalog-seed";
import { fixedClock } from "./fixed-clock";
import {
  createInMemoryPublicIntensivoRecords,
  createInMemoryPublicTallerRecords,
} from "./in-memory-public-catalog-records";

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

describe("createSeededPublicCatalog", () => {
  it("serves the seed through the real intensivos and talleres readers", async () => {
    const catalog = createSeededPublicCatalog(
      fullyPopulatedSeed(),
      fixedClock(new Date("2026-10-15T15:00:00Z")),
    );

    expect((await catalog.intensivos.list()).map((item) => item.slug)).toEqual([
      "intensivo-demo",
    ]);
    expect((await catalog.talleres.list()).map((item) => item.slug)).toEqual([
      "taller-demo",
    ]);
  });
});

describe("the in-memory taller records", () => {
  const FROM = { fromPeriod: "2026-10" };

  it("lists only published and paused talleres", async () => {
    const records = createInMemoryPublicTallerRecords(
      buildSeed({
        talleres: [
          seedTaller({ slug: "publicado", status: "published" }),
          seedTaller({ slug: "pausado", status: "paused" }),
          seedTaller({ slug: "borrador", status: "draft" }),
          seedTaller({ slug: "archivado", status: "archived" }),
        ],
      }),
    );

    expect((await records.listVisible(FROM)).map((r) => r.slug).sort()).toEqual(
      ["pausado", "publicado"],
    );
    expect((await records.listVisibleSlugs()).slice().sort()).toEqual([
      "pausado",
      "publicado",
    ]);
    expect((await records.findVisibleBySlug("pausado", FROM))?.slug).toBe(
      "pausado",
    );
    expect(await records.findVisibleBySlug("borrador", FROM)).toBeNull();
    expect(await records.findVisibleBySlug("PUBLICADO", FROM)).toBeNull();
  });

  it("returns the active turnos only", async () => {
    const activo = seedTurno({ label: "Activo" });
    const retirado = seedTurno({ label: "Retirado", active: false });
    const records = createInMemoryPublicTallerRecords(
      buildSeed({ talleres: [seedTaller({ turnos: [activo, retirado] })] }),
    );

    const [record] = await records.listVisible(FROM);

    expect(record?.activeTurnos.map((t) => t.label)).toEqual(["Activo"]);
  });

  it("returns the open periods from the requested month only, with their capacities and project", async () => {
    const turno = seedTurno();
    const records = createInMemoryPublicTallerRecords(
      buildSeed({
        talleres: [
          seedTaller({
            turnos: [turno],
            periods: [
              seedPeriod({ period: "2026-09" }),
              seedPeriod({
                period: "2026-10",
                projectTitle: "Taza",
                capacities: [{ turnoId: turno.id, capacity: 8 }],
              }),
              seedPeriod({ period: "2026-11", status: "draft" }),
              seedPeriod({ period: "2026-12", status: "closed" }),
              seedPeriod({ period: "2027-01" }),
            ],
          }),
        ],
      }),
    );

    const [record] = await records.listVisible(FROM);

    expect(record?.openPeriods.map((p) => p.period)).toEqual([
      "2026-10",
      "2027-01",
    ]);
    expect(record?.openPeriods[0]?.capacities).toEqual([
      { turnoId: turno.id, capacity: 8 },
    ]);
    expect(record?.openPeriods[0]?.project.title).toBe("Taza");
  });

  it("has the exact record keys and carries no snapshot, percentage or audit data", async () => {
    const records = createInMemoryPublicTallerRecords(fullyPopulatedSeed());

    const [record] = await records.listVisible(FROM);

    expect(Object.keys(record ?? {}).sort()).toEqual([
      "activeTurnos",
      "description",
      "images",
      "name",
      "openPeriods",
      "slug",
      "status",
      "summary",
      "teacherId",
      "technique",
    ]);
    expect(Object.keys(record?.openPeriods[0] ?? {}).sort()).toEqual([
      "capacities",
      "fee",
      "period",
      "project",
    ]);
    const json = JSON.stringify(record);
    expect(json).not.toContain("SNAPSHOT-SENTINEL");
    expect(json).not.toContain("DRAFT-PROJECT-TEXT");
  });

  it("carries the taller sentinels in the fully populated seed", () => {
    const taller = fullyPopulatedSeed().talleres.find(
      (t) => t.slug === "taller-demo",
    );

    expect(taller?.agreedPercentageBp).toBe(3550);
    expect(taller?.periods[0]?.snapshotTeacherName).toBe("SNAPSHOT-SENTINEL");
    expect(taller?.periods[0]?.snapshotTeacherModality).toBe("third_party");
  });
});
