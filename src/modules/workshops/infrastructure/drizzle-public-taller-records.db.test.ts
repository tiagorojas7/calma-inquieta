import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { createDbSessionFactory } from "~/platform/db/session";
import { runPublicTalleresContract } from "~/testing/contracts/public-catalog.contract";
import { seedCatalog } from "~/testing/db/seed-catalog";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import {
  buildSeed,
  fullyPopulatedSeed,
  seedPeriod,
  seedTaller,
  seedTurno,
  type CatalogSeed,
} from "~/testing/fakes/catalog-seed";
import { createDrizzlePublicTallerRecords } from "./drizzle-public-taller-records";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

type OpenSession = ReturnType<typeof createDbSessionFactory>;

async function seededWithUrl(seed: CatalogSeed) {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  await seedCatalog(openSession, seed);
  return { openSession, url: database.url };
}

async function seededDatabase(seed: CatalogSeed) {
  return (await seededWithUrl(seed)).openSession;
}

/** A session factory that counts the statements its sessions send. */
function counting(connectionString: string) {
  let statements = 0;
  const open: OpenSession = async () => {
    const client = new pg.Client({ connectionString });
    await client.connect();
    return {
      db: drizzle(client, {
        logger: {
          logQuery: () => {
            statements += 1;
          },
        },
      }),
      close: () => client.end(),
    };
  };
  return { open, statements: () => statements };
}

// Taller images are stored; period project images are still deferred (B6b).
runPublicTalleresContract(
  async (seed) => createDrizzlePublicTallerRecords(await seededDatabase(seed)),
  { storesImages: false },
);

describe("the Drizzle public taller records", () => {
  const FROM = { fromPeriod: "2026-10" };

  it("returns records with exactly the allowlisted keys and normalized values", async () => {
    const records = createDrizzlePublicTallerRecords(
      await seededDatabase(fullyPopulatedSeed()),
    );

    const [record] = await records.listVisible(FROM);

    expect(record?.slug).toBe("taller-demo");
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
    expect(Object.keys(record?.activeTurnos[0] ?? {}).sort()).toEqual([
      "endsAt",
      "id",
      "label",
      "startsAt",
      "weekday",
    ]);
    expect(Object.keys(record?.openPeriods[0] ?? {}).sort()).toEqual([
      "capacities",
      "fee",
      "period",
      "project",
    ]);
    expect(record?.activeTurnos[0]).toMatchObject({
      startsAt: "15:00",
      endsAt: "23:00",
    });
    expect(record?.openPeriods).toHaveLength(1);
    expect(record?.openPeriods[0]?.fee.toCentavos()).toBe(4_500_000);
    expect(record?.openPeriods[0]?.capacities).toEqual([
      { turnoId: record?.activeTurnos[0]?.id, capacity: 8 },
    ]);
    expect(JSON.stringify(record)).not.toContain("SNAPSHOT-SENTINEL");
    expect(JSON.stringify(record)).not.toContain("DRAFT-PROJECT-TEXT");
  });

  it("returns the taller gallery in position order and no project images", async () => {
    const seed = fullyPopulatedSeed();
    const [taller] = seed.talleres;
    const asset = seed.assets[0];
    if (!taller || !asset) throw new Error("fixture");
    const second = {
      ...asset,
      id: "00000000-0000-4000-8000-0000000000b2",
      fileName: "second.jpg",
    };
    const records = createDrizzlePublicTallerRecords(
      await seededDatabase({
        ...seed,
        assets: [...seed.assets, second],
        talleres: [
          {
            ...taller,
            images: [
              { assetId: asset.id, alt: "Mesa de trabajo" },
              { assetId: second.id, alt: "Detalle" },
            ],
          },
          ...seed.talleres.slice(1),
        ],
      }),
    );

    const [record] = await records.listVisible(FROM);

    expect(record?.images).toEqual([
      { assetId: asset.id, alt: "Mesa de trabajo" },
      { assetId: second.id, alt: "Detalle" },
    ]);
    expect(record?.openPeriods[0]?.project.images).toEqual([]);
  });

  it("returns only open periods from the requested month", async () => {
    const records = createDrizzlePublicTallerRecords(
      await seededDatabase(
        buildSeed({
          talleres: [
            seedTaller({
              slug: "t",
              periods: [
                seedPeriod({ period: "2026-09" }),
                seedPeriod({ period: "2026-10" }),
                seedPeriod({ period: "2026-11", status: "draft" }),
                seedPeriod({ period: "2026-12", status: "closed" }),
                seedPeriod({ period: "2027-01" }),
              ],
            }),
          ],
        }),
      ),
    );

    const found = await records.findVisibleBySlug("t", FROM);

    expect(found?.openPeriods.map((period) => period.period)).toEqual([
      "2026-10",
      "2027-01",
    ]);
  });

  it("returns only active turnos, in weekday then start order", async () => {
    const records = createDrizzlePublicTallerRecords(
      await seededDatabase(
        buildSeed({
          talleres: [
            seedTaller({
              slug: "t",
              turnos: [
                seedTurno({ label: "Mié", weekday: 3 }),
                seedTurno({ label: "Retirado", active: false }),
                seedTurno({ label: "Lun tarde", startsAt: "18:00" }),
                seedTurno({ label: "Lun mañana", startsAt: "09:00" }),
              ],
            }),
          ],
        }),
      ),
    );

    const found = await records.findVisibleBySlug("t", FROM);

    expect(found?.activeTurnos.map((turno) => turno.label)).toEqual([
      "Lun mañana",
      "Lun tarde",
      "Mié",
    ]);
  });

  it.each([1, 5])(
    "sends the same number of statements for %i talleres",
    async (count) => {
      const { url } = await seededWithUrl(
        buildSeed({
          talleres: Array.from({ length: count }, (_, index) => {
            const turno = seedTurno();
            return seedTaller({
              slug: `taller-${String(index)}`,
              turnos: [turno],
              periods: [
                seedPeriod({
                  capacities: [{ turnoId: turno.id, capacity: 8 }],
                }),
              ],
            });
          }),
        }),
      );
      const list = counting(url);
      const bySlug = counting(url);
      const slugs = counting(url);

      await createDrizzlePublicTallerRecords(list.open).listVisible(FROM);
      await createDrizzlePublicTallerRecords(bySlug.open).findVisibleBySlug(
        "taller-0",
        FROM,
      );
      await createDrizzlePublicTallerRecords(slugs.open).listVisibleSlugs();

      // workshops, turnos, periods, images, capacities: independent of the catalog size.
      expect(list.statements()).toBe(5);
      expect(bySlug.statements()).toBe(5);
      expect(slugs.statements()).toBe(1);
    },
  );

  it("stops after the first statement when no workshop is visible", async () => {
    const { url } = await seededWithUrl(
      buildSeed({ talleres: [seedTaller({ status: "draft" })] }),
    );
    const list = counting(url);

    expect(
      await createDrizzlePublicTallerRecords(list.open).listVisible(FROM),
    ).toEqual([]);
    expect(list.statements()).toBe(1);
  });
});
