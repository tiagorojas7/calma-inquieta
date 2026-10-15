import { afterAll, describe, expect, it, vi } from "vitest";
import { createDbSessionFactory } from "~/platform/db/session";
import { runPublicIntensivosContract } from "~/testing/contracts/public-catalog.contract";
import { seedCatalog } from "~/testing/db/seed-catalog";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import {
  buildSeed,
  fullyPopulatedSeed,
  seedIntensivo,
  type CatalogSeed,
} from "~/testing/fakes/catalog-seed";
import { createDrizzlePublicIntensivoRecords } from "./drizzle-public-intensivo-records";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

type OpenSession = ReturnType<typeof createDbSessionFactory>;

async function seededDatabase(seed: CatalogSeed) {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  await seedCatalog(openSession, seed);
  return openSession;
}

/** A session factory that counts the statements its sessions send. */
function counting(openSession: OpenSession) {
  let statements = 0;
  const open: OpenSession = async () => {
    const session = await openSession();
    const original = session.db.$client.query.bind(session.db.$client);
    vi.spyOn(session.db.$client, "query").mockImplementation(((
      ...args: unknown[]
    ) => {
      statements += 1;
      return (original as (...a: unknown[]) => unknown)(...args);
    }) as never);
    return session;
  };
  return { open, statements: () => statements };
}

runPublicIntensivosContract(async (seed) =>
  createDrizzlePublicIntensivoRecords(await seededDatabase(seed)),
);

describe("the Drizzle public intensivo records", () => {
  const FROM = { fromDate: "2026-11-01" };

  it("returns records with exactly the allowlisted keys and normalized values", async () => {
    const records = createDrizzlePublicIntensivoRecords(
      await seededDatabase(fullyPopulatedSeed()),
    );

    const [record] = await records.listVisible(FROM);

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
    expect(record?.startsAt).toBe("10:00");
    expect(record?.endsAt).toBe("18:00");
    expect(record?.price.toCentavos()).toBe(5_800_000);
    expect(record?.deposit.toCentavos()).toBe(1_500_000);
    expect(record?.images).toEqual([
      {
        assetId: fullyPopulatedSeed().assets[0]?.id,
        alt: "Manos en el torno",
      },
    ]);
    expect(Object.keys(record?.images[0] ?? {}).sort()).toEqual([
      "alt",
      "assetId",
    ]);
  });

  it("keeps the images in position order", async () => {
    const seed = fullyPopulatedSeed();
    const asset = seed.assets[0];
    if (asset === undefined) throw new Error("seed has no asset");
    const second = {
      ...asset,
      id: "44444444-4444-4444-8444-444444444444",
      fileName: "second.jpg",
    };
    const records = createDrizzlePublicIntensivoRecords(
      await seededDatabase({
        ...seed,
        assets: [...seed.assets, second],
        intensivos: [
          seedIntensivo({
            slug: "dos-fotos",
            images: [
              { assetId: second.id, alt: "Segunda" },
              { assetId: asset.id, alt: "Primera" },
            ],
          }),
        ],
      }),
    );

    const found = await records.findVisibleBySlug("dos-fotos", FROM);

    expect(found?.images.map((image) => image.alt)).toEqual([
      "Segunda",
      "Primera",
    ]);
  });

  it.each(["UTC", "America/Argentina/Cordoba"])(
    "returns the date as the string 2026-11-14 under TZ=%s",
    async (zone) => {
      const records = createDrizzlePublicIntensivoRecords(
        await seededDatabase(
          buildSeed({
            intensivos: [
              seedIntensivo({ slug: "uno", eventDate: "2026-11-14" }),
            ],
          }),
        ),
      );
      const previous = process.env["TZ"];
      process.env["TZ"] = zone;
      try {
        const [record] = await records.listVisible(FROM);

        expect(typeof record?.eventDate).toBe("string");
        expect(record?.eventDate).toBe("2026-11-14");
      } finally {
        if (previous === undefined) delete process.env["TZ"];
        else process.env["TZ"] = previous;
      }
    },
  );

  it.each([1, 5])(
    "sends two statements per call for %i intensivos",
    async (count) => {
      const openSession = await seededDatabase(
        buildSeed({
          assets: fullyPopulatedSeed().assets,
          teachers: fullyPopulatedSeed().teachers,
          intensivos: Array.from({ length: count }, (_, index) =>
            seedIntensivo({
              slug: `uno-${String(index)}`,
              images: [
                {
                  assetId: fullyPopulatedSeed().assets[0]?.id ?? "",
                  alt: "Foto",
                },
              ],
            }),
          ),
        }),
      );
      const list = counting(openSession);
      const bySlug = counting(openSession);
      const slugs = counting(openSession);

      await createDrizzlePublicIntensivoRecords(list.open).listVisible(FROM);
      await createDrizzlePublicIntensivoRecords(bySlug.open).findVisibleBySlug(
        "uno-0",
        FROM,
      );
      await createDrizzlePublicIntensivoRecords(slugs.open).listVisibleSlugs(
        FROM,
      );

      expect(list.statements()).toBe(2);
      expect(bySlug.statements()).toBe(2);
      expect(slugs.statements()).toBe(1);
    },
  );
});
